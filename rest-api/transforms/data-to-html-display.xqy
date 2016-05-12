xquery version "1.0-ml";
module namespace trns = "http://marklogic.com/rest-api/transform/data-to-html-display";

declare namespace roxy = "http://marklogic.com/roxy";

(: REST API transforms managed by Roxy must follow these conventions:

1. Their filenames must reflect the name of the transform.

For example, an XQuery transform named add-attr must be contained in a file named add-attr.xqy
and have a module namespace of "http://marklogic.com/rest-api/transform/add-attr".

2. Must declare the roxy namespace with the URI "http://marklogic.com/roxy".

declare namespace roxy = "http://marklogic.com/roxy";

3. Must annotate the transform function with the transform parameters:

%roxy:params("uri=xs:string", "priority=xs:int")

These can be retrieved with map:get($params, "uri"), for example.

:)

declare
function trns:transform(
  $context as map:map,
  $params as map:map,
  $content as document-node()
) as document-node()
{
  map:put($context, 'output-type', 'application/json'),
  document {
    object-node {
      "xml": (
        if ($content instance of document-node(element())) then
          xdmp:quote($content)
        else
          null-node{}
      ),
      "html": (xdmp:quote(trns:to-html($content)), $content/text())[1],
      "json": (
        if ($content/object-node()) then
          $content/object-node()
        else
          null-node{}
      )
    }
  }
};

declare function trns:to-html($node as node())
{
  typeswitch($node)
    case document-node()|element()|object-node() return
      if (fn:exists($node/*)) then
        element dl {
          for $child in $node/node()
          let $local-name := fn:local-name-from-QName(fn:node-name($child))
          return
          if (fn:exists($local-name[. ne ""])) then (
            element dt {
              trns:human-readable-name($local-name)
            },
            element dd {
              attribute class {"col-sm-12"},
              let $result := trns:to-html($child)
              return
                if (fn:exists($result[. ne ""])) then
                  $result
                else
                  element em {"blank"}
            }
          ) else (
            trns:to-html($child)
          )
        }
      else
        text{fn:string($node)}
    case array-node() return
      element ul {
        for $child in $node/node()
        return
          element li {trns:to-html($child)}
      }
    case comment() return
      ()
    default return
      text { fn:string($node) }
};

declare function trns:human-readable-name($string as xs:string)
{
  fn:replace(
    fn:replace($string, "([a-z])([A-Z0-9])", "$1 $2"),
    "[^a-zA-Z0-9]+",
    " "
  )
};
