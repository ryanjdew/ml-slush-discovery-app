xquery version "1.0-ml";

module namespace ext = "http://marklogic.com/rest-api/resource/content-metadata";

import module namespace data = "http://marklogic.com/appservices/builder/data" at "/lib/content-metadata.xqy";
import module namespace utilities = "http://marklogic.com/utilities" at "/lib/utilities.xqy";

declare namespace roxy = "http://marklogic.com/roxy";

(:
 : To add parameters to the functions, specify them in the params annotations.
 : Example
 :   declare %roxy:params("uri=xs:string", "priority=xs:int") ext:get(...)
 : This means that the get function will take two parameters, a string and an int.
 :)

(:
 :)
declare
%roxy:params("mode=xs:string", "type=xs:string", "localname=xs:string")
function ext:get(
  $context as map:map,
  $params  as map:map
) as document-node()*
{
  xdmp:set-response-code(200, "OK"),
  document {
    let $mode := map:get($params,'mode')
    let $type := map:get($params,'type')
    let $localname := map:get($params,'localname')
    let $data :=
      if($localname != "")
      then <localnames>{ data:get-localname-details($localname, $type) }</localnames>
      else <localnames/>
    return
      if($mode = "xml")
      then (
        map:put($context, "output-types", "application/xml"),
        $data
      ) else (
        map:put($context, "output-types", "application/json"),
        utilities:transform-to-json($data)
      )
 }
};
