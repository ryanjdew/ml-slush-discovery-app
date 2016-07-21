xquery version "1.0-ml";

module namespace ext = "http://marklogic.com/rest-api/resource/server-config";

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
function ext:get(
  $context as map:map,
  $params  as map:map
) as document-node()*
{
  map:put($context, "output-types", "application/json"),
  map:put($context, "output-status", (200, "OK")),
  let $default-config as object-node() :=
    object-node {
      "database": xdmp:database-name(xdmp:database())
    }
  let $stored-config as object-node() :=
    (fn:doc("/discovery-app/config/server-config.json")/object-node()/object-node("server-config"), object-node{})[1]
  let $combined-config :=
    if (fn:empty($stored-config/database[.])) then
      $stored-config + $default-config
    else
      $stored-config
  return
  document {
    xdmp:to-json-string(
      $combined-config
    )
  }
};
