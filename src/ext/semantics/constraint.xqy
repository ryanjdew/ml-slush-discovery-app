xquery version "1.0-ml";

module namespace my = "http://demo.marklogic.com/custom-constraints/semantics";

import module namespace search = "http://marklogic.com/appservices/search"
  at "/MarkLogic/appservices/search/search.xqy";
import module namespace sem = "http://marklogic.com/semantics"
  at "/MarkLogic/semantics.xqy";

declare variable $all-child-IRIs-queries as map:map := map:new((
  map:entry('SKOS','
        PREFIX skos: <http://www.w3.org/2004/02/skos/core#>

        SELECT DISTINCT ?iri WHERE {
          {
            ?iri skos:broader* $parentIRI.
          } UNION {
            $parentIRI skos:hasTopConcept ?item.
            ?iri skos:broader* ?item.
          }
        }
        '),
  map:entry('RDF', '
        PREFIX rdfs: <http://www.w3.org/2000/01/rdf-schema#>
        SELECT ?iri WHERE {
          ?iri rdfs:subClassOf* $parentIRI.
        }')
));

declare function parse(
  $query-elem as element(),
  $options as element(search:options)
) as schema-element(cts:query)
{
let $_log := xdmp:log(xdmp:describe($query-elem,(),()))
let $constraint-name := $query-elem/search:constraint-name
let $s := $query-elem/(search:text|search:value) ! sem:iri(fn:string(.))
let $query := <root>{
      if (map:contains($all-child-IRIs-queries, $constraint-name)) then
        let $sparql := map:get($all-child-IRIs-queries, $constraint-name)
        let $all-child-IRIs := fn:distinct-values((
            $s,
            sem:sparql($sparql, map:entry('parentIRI', $s)) ! map:get(., 'iri')
          ))
        return
            cts:or-query((
              cts:registered-query(cts:register(cts:triple-range-query($all-child-IRIs, (), (), "="))),
              cts:registered-query(cts:register(cts:triple-range-query((), (), $all-child-IRIs, "=")))
            ))
      else
        cts:and-query(())
    }</root>/*
let $qtextconst := fn:concat($constraint-name, ':"',$s,'"')
return
(: add qtextconst attribute so that search:unparse will work -
   required for some search library functions :)
element { fn:node-name($query) }
  { attribute qtextconst { $qtextconst },
    $query/@*,
    $query/node()}
};

declare function start-facet(
  $constraint as element(search:constraint),
  $query as cts:query?,
  $facet-options as xs:string*,
  $quality-weight as xs:double?,
  $forests as xs:unsignedLong*)
as item()* {
  ()
};

declare function finish-facet(
  $start as item()*,
  $constraint as element(search:constraint),
  $query as cts:query?,
  $facet-options as xs:string*,
  $quality-weight as xs:double?,
  $forests as xs:unsignedLong*)
as element(search:facet) {
  element search:facet {
    attribute name {$constraint/@name},
    attribute type {"custom"}
  }
};
