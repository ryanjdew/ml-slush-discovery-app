xquery version "1.0-ml";

module namespace ext = "http://marklogic.com/rest-api/resource/sparql-describe";

declare namespace roxy = "http://marklogic.com/roxy";
declare namespace rapi = "http://marklogic.com/rest-api";

(:
 : To add parameters to the functions, specify them in the params annotations.
 : Example
 :   declare %roxy:params("uri=xs:string", "priority=xs:int") ext:get(...)
 : This means that the get function will take two parameters, a string and an int.
 :
 : To report errors in your extension, use fn:error(). For details, see
 : http://docs.marklogic.com/guide/rest-dev/extensions#id_33892, but here's
 : an example from the docs:
 : fn:error(
 :   (),
 :   "RESTAPI-SRVEXERR",
 :   ("415","Raven","nevermore"))
 :)

(:
 :)
declare
%roxy:params("document=xs:string?","query=xs:string?")
function ext:get(
  $context as map:map,
  $params  as map:map
) as document-node()*
{
  map:put($context, "output-types", "application/json"),
  map:put($context, "output-status", (200, "OK")),
  document {
    object-node {
      "results": array-node {
        if (map:contains($params, "document") or map:get($params, "query")[. ne '']) then
          let $sem-store :=
            if (map:contains($params, "document")) then
              cts:document-query(map:get($params, "document"))
            else ()
          let $bindings :=
            if (map:get($params, "query")[. ne '']) then
              map:entry("o", map:get($params, "query"))
            else
              ()
          let $map := map:map()
          let $_ :=
            for $triple in sem:sparql('DESCRIBE ?iri WHERE { ?iri ?p ?o }', $bindings, (), $sem-store)
            let $subject := fn:string(sem:triple-subject($triple))
            let $predicate := sem:triple-predicate($triple)
            let $object := sem:triple-object($triple)
            where fn:not($object instance of sem:iri) or $predicate eq sem:iri("http://www.w3.org/1999/02/22-rdf-syntax-ns#type")
            return map:put($map, $subject, (
              map:get($map, $subject),
              object-node {
                "predicate": $predicate,
                "object": $object
              }
            ))
          for $key in map:keys($map)
          return
            object-node {
              "iri": $key,
              "triples": array-node {
                map:get($map, $key)
              }
            }
        else ()
      }
    }
  }
};
