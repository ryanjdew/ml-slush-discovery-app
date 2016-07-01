xquery version "1.0-ml";

module namespace ext = "http://marklogic.com/rest-api/resource/profile";

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
  let $username := xdmp:get-current-user()
  let $user-doc := (fn:doc('/api/users/' || $username || '.json')/object-node(), object-node{})[1]
  return
    document {
      xdmp:to-json-string($user-doc +
      (object-node {
        "name": xdmp:get-current-user(),
        "isAdmin": (xdmp:get-current-roles() = (xdmp:role("discovery-app-admin-role"), xdmp:role("rest-admin"), xdmp:role("admin")))
      }))
    }
};

