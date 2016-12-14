xquery version "1.0-ml";

module namespace ext = "http://marklogic.com/rest-api/resource/document-versions";

import module namespace dls = "http://marklogic.com/xdmp/dls"
      at "/MarkLogic/dls.xqy";

declare default function namespace "http://www.w3.org/2005/xpath-functions";

declare namespace rapi = "http://marklogic.com/rest-api";
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
%roxy:params("uri=xs:string", "start=xs:int?", "length=xs:int?")
function ext:get(
  $context as map:map,
  $params  as map:map
) as document-node()*
{
  let $output-types := map:put($context, "output-types", "application/json")
  let $uri := map:get($params, "uri")
  let $start := xs:int((map:get($params, "start"), '1')[1])
  let $length := xs:int((map:get($params, "length"), '5')[1])
  let $is-managed := dls:document-is-managed($uri)
  let $versions :=
    array-node {
      if ($is-managed) then
        for $version in fn:subsequence(fn:reverse(dls:document-history($uri)/dls:version), $start, $length)
        return
          object-node {
            "versionId": fn:string($version/dls:version-id),
            "annotation": fn:string($version/dls:annotation)
          }
      else ()
    }
  return (
    xdmp:set-response-code(200, "OK"),
    document {
      xdmp:to-json-string(object-node {
        "isManaged": $is-managed,
        "checkoutStatus": (
            if ($is-managed) then
              dls:document-checkout-status($uri)
            else
              null-node {}
          ),
        "versions": $versions
      })
    }
  )
};

(:
 :)
declare
%roxy:params("uri=xs:string", "limit=xs:int?")
%rapi:transaction-mode("update")
function ext:post(
  $context as map:map,
  $params  as map:map,
  $input   as document-node()*
) as document-node()*
{
  let $output-types := map:put($context, "output-types", "application/json")
  let $uri := map:get($params, "uri")
  let $versions :=
    array-node {
      if (dls:document-is-managed($uri)) then
        for $version in dls:document-history($uri)/dls:version
        return
          object-node {
            "versionId": fn:string($version/dls:version-id),
            "annotation": fn:string($version/dls:annotation)
          }
      else ()
    }
  return (
    xdmp:set-response-code(200, "OK"),
    document {
      xdmp:to-json-string(object-node {
        "versions": $versions
      })
    }
  )
};
