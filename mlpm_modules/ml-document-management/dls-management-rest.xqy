xquery version "1.0-ml";

module namespace resource = "http://marklogic.com/rest-api/resource/dls-management";

import module namespace dls = "http://marklogic.com/xdmp/dls"
  at "/MarkLogic/dls.xqy";

declare namespace rapi = "http://marklogic.com/rest-api";

declare function get(
  $context as map:map,
  $params as map:map
) as document-node()?
{
  map:put($context, "output-status", (200, "OK")),
  let $command := map:get($params, "command")
  let $uri := map:get($params, "uri")
  return
    if ($command = "list-versions") then (
      document {
        object-node {
          "versions": array-node {
            let $versions :=
              for $v in dls:document-history($uri)/dls:version
              let $vid := xs:unsignedLong($v/dls:version-id)
              order by $vid descending
              return $v
            for $version at $pos in $versions
            let $version-id := xs:unsignedLong($version/dls:version-id)
            let $next-pos := $pos + 1
            let $previous-version := $versions[$next-pos]
            return
              object-node {
                "versionId": $version-id,
                "versionUri": dls:document-version-uri($uri, $version-id),
                "annotation": fn:string($version/dls:annotation),
                "previousVersion": (
                    if (fn:exists($previous-version)) then
                      dls:document-version-uri($uri, $previous-version/dls:version-id)
                    else
                      null-node {}
                )
              }
          }
        }
      }
    ) else ()
};

declare %rapi:transaction-mode("update") function put(
  $context as map:map,
  $params as map:map,
  $input as document-node()*
) as document-node()?
{
  let $command := map:get($params, "command")
  let $uri := map:get($params, "uri")
  let $annotation := map:get($params, "annotation")
  return
    if ($command = "checkin") then (
      dls:document-checkin($uri, fn:false()),
      dls:document-checkin($uri || ".metadata.xml", fn:false())
    ) else if ($command = "checkout") then (
      dls:document-checkout($uri, fn:false(), $annotation),
      dls:document-checkout($uri || ".metadata.xml", fn:false(), $annotation)
    ) else if ($command = "set-permissions") then (
      let $role := $input/object-node()/role
      let $permissions :=
        (
          xdmp:permission($role, "read"),
          xdmp:permission($role, "update")
        )
      return (
        dls:document-set-permissions($uri, $permissions),
        dls:document-set-permissions($uri || ".metadata.xml", $permissions)
      )
    ) else (),
  map:put($context, "output-status", (200, "OK"))
};

declare %rapi:transaction-mode("update") function delete(
  $context as map:map,
  $params as map:map
) as document-node()?
{
  let $uri := map:get($params, "uri")
  return (
      dls:document-delete($uri, fn:true(), fn:true()),
      dls:document-delete($uri || ".metadata.xml", fn:true(), fn:true())
    ),
  map:put($context, "output-status", (200, "OK"))
};

declare %rapi:transaction-mode("update") function post(
  $context as map:map,
  $params as map:map,
  $input as document-node()*
) as document-node()*
{
  put($context, $params, $input)
};
