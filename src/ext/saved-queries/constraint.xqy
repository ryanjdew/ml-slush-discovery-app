xquery version "1.0-ml";

module namespace my = "http://demo.marklogic.com/custom-constraints/saved-queries";
import module namespace search = "http://marklogic.com/appservices/search"
  at "/MarkLogic/appservices/search/search.xqy";
import module namespace sut = "http://marklogic.com/rest-api/lib/search-util"
  at "/MarkLogic/rest-api/lib/search-util.xqy";
import module namespace eput = "http://marklogic.com/rest-api/lib/endpoint-util"
  at "/MarkLogic/rest-api/lib/endpoint-util.xqy";
import module namespace dbut = "http://marklogic.com/rest-api/lib/db-util"
  at "/MarkLogic/rest-api/lib/db-util.xqy";


declare variable $storage-prefix := "/rest-api/options/";
declare variable $_cached-search-options := map:map();


declare variable $serialized-query-map := map:map();

declare function get-query-only-search-options($constraint as element(search:constraint))
{
  if (map:contains($_cached-search-options, fn:generate-id($constraint))) then
    map:get($_cached-search-options, fn:generate-id($constraint))
  else
    let $search-options := element search:options {
        search-options-from-constraint($constraint)
          /*[fn:empty(self::search:return-results|self::search:return-facets|self::search:return-query)],
        element search:return-results {fn:false()},
        element search:return-facets {fn:false()},
        element search:return-query {fn:true()}
      }
    return (
      map:put($_cached-search-options, fn:generate-id($constraint), $search-options),
      $search-options
    )
};

declare function search-options-from-constraint($constraint as element(search:constraint))
{
  fn:root($constraint)/(self::search:options|search:options)
};


declare function serialized-query-to-cts-query($name, $serialized-query)
{
  if (map:contains($serialized-query-map, $name)) then
    map:get($serialized-query-map, $name)
  else
    cts:query($serialized-query)
};


declare function start-facet(
  $constraint as element(search:constraint),
  $query as cts:query?,
  $facet-options as xs:string*,
  $quality-weight as xs:double?,
  $forests as xs:unsignedLong*)
as item()* {
  cts:search(fn:collection("saved-query"), cts:and-query(()), "unfiltered")
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
    attribute type {"custom"},
    for $val in $start
    let $cohort-query := serialized-query-to-cts-query($val/name, $val/serialized-query)
    let $val-count := xdmp:estimate(
      cts:search(
        fn:collection(),
        cts:and-query((
          $cohort-query,
          $query
        ))
      )
    )
    let $unread-count := xdmp:estimate(
      cts:search(
        fn:collection(),
        cts:and-query((
          cts:collection-query("unread"),
          $cohort-query,
          $query
        ))
      ),
      $val-count
    )
    where $val-count > 0
    return
      element search:facet-value{
        attribute name { $val/name },
        attribute count {$val-count},
        attribute unread {$unread-count},
        attribute uri {xdmp:node-uri($val)},
        attribute qtext { $val/query/q },
        attribute createdBy { $val/createdBy },
        attribute createdDateTime { $val/createdDateTime },
        fn:string($val/name)
      }
  }
};

declare function parse(
  $query-elem as element(),
  $options as element(search:options)
) as schema-element(cts:query)
{
let $s := $query-elem/(search:text|search:value)/text()
let $query :=
  <root>{
  let $cohort :=
    cts:search(
      fn:collection("saved-query"),
      cts:json-property-value-query("name", $s),
      "unfiltered"
    )[1]
  let $cohort-query := serialized-query-to-cts-query($cohort/name, $cohort/serialized-query)
  return
      fn:head(($cohort-query, cts:and-query(())))
    }
</root>/*
let $qtextconst := fn:concat(
        $query-elem/search:constraint-name, ":",
        $s)
return
(: add qtextconst attribute so that search:unparse will work -
   required for some search library functions :)
element { fn:node-name($query) }
  { attribute qtextconst { $qtextconst },
    $query/@*,
    $query/node()}
};
