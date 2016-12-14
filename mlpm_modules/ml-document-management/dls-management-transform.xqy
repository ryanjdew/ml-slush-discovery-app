xquery version "1.0-ml";
module namespace transform = "http://marklogic.com/rest-api/transform/dls-management";

import module namespace dls = "http://marklogic.com/xdmp/dls"
  at "/MarkLogic/dls.xqy";

declare namespace rapi = "http://marklogic.com/rest-api";

declare %rapi:transaction-mode("query") function transform:transform(
  $context as map:map,
  $params as map:map,
  $content as document-node())
as document-node() {
  try {
    if (fn:not(dls:document-is-managed(map:get($context, "uri")))) then
      xdmp:spawn-function(
        function() {
          fn:function-lookup(
            xs:QName("dls:document-manage"),
            3
          )(map:get($context, "uri"), fn:false(), "Added by ML Document Management")
        },
        <options xmlns="xdmp:eval">
          <transaction-mode>update-auto-commit</transaction-mode>
        </options>
      )
    else ()
  } catch * {()},
  $content
};
