xquery version "1.0-ml";

module namespace trans = "http://marklogic.com/rest-api/transform/simple-html";

declare option xdmp:mapping "true";

(: Tab to me to start your module! :)

declare function trans:transform(
  $context as map:map,
  $params as map:map,
  $content as document-node())
as document-node() {
  document {
    if ($content instance of document-node(element())) then (
      object-node {
        "source": xdmp:quote($content),
        "transform": xdmp:quote(trans:xml-html($content))
      }
    ) else if ($content instance of document-node(object-node())) then  (
      object-node {
        "source": $content,
        "transform": xdmp:quote(trans:json-html($content))
      }      
    ) else 
      $content
  }
};

declare function trans:json-html($node as node())
{
  typeswitch($node)
  case document-node() return trans:json-html($node/node())
  case object-node() return
    element div {
      trans:json-html($node/node())
    }
  case array-node() return
    element ul {
      for $child in $node/node()
      return 
        element li {
          trans:json-html($child)
        }
    }
  default return
    element span { $node }
};

declare function trans:xml-html($node as node())
{
  typeswitch($node)
  case document-node() return trans:xml-html($node/node())
  case element() return
    let $children := $node/*
    let $is-array-like := fn:count(fn:distinct-values($children/fn:node-name(.))) eq 1 and fn:count($children) gt 1
    return
      if ($is-array-like) then
        element ul {
          for $child in $children
          return 
            element li {
              trans:xml-html($child/node())
            }
        }
      else if (fn:exists($children)) then
        element div {
          trans:xml-html($node/node())
        }
      else 
        element span {
          trans:xml-html($node/node())
        }
  default return
    $node
};