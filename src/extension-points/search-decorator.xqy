xquery version "1.0-ml";

module namespace search-dec = "http://marklogic.com/discovery-app/extension-points/search-decorator";

import module namespace dls = "http://marklogic.com/xdmp/dls"
      at "/MarkLogic/dls.xqy";
import module namespace utilities = "http://marklogic.com/utilities"
      at "/lib/utilities.xqy";

declare variable $ui-config := utilities:document-from-discovery-app-db("/discovery-app/config/ui-config.json");
declare variable $label-parts as object-node()* := $ui-config/object-node()/result-label;
declare variable $meta-parts as object-node()* := $ui-config/object-node()/result-metadata;

declare function search-dec:decorator($uri as xs:string) as node()*
{
  let $uri :=
    if (fn:matches($uri, "\.[^\.]{2,4}\.xml$")) then
      fn:replace($uri, "\.xml$", "")
    else
      $uri
  let $format   := xdmp:uri-format($uri)
  let $mimetype := xdmp:uri-content-type($uri)
  return (
    if (fn:empty($mimetype)) then ()
    else attribute doc-mimetype {$mimetype},

    if (fn:empty($format)) then ()
    else attribute doc-format { $format },

    if (dls:document-is-managed($uri)) then (
      dls:document-checkout-status($uri)
    ) else (),
    if (fn:exists($label-parts) or fn:exists($meta-parts)) then
      let $doc := fn:doc($uri)
      return (
        attribute display-label {
          (search-dec:build-label($doc), fn:replace($uri,"^.*/([^/]+)$","$1"))[fn:normalize-space(.)][1]
        },
        attribute display-metadata {
          search-dec:build-metadata($doc)
        }
      )
    else ()
  )
};

declare function search-dec:build-label($doc) as xs:string?
{
  fn:normalize-space(fn:string-join(
    for $label-part in $label-parts
    return
      if ($label-part/type = ("element", "attribute")) then
        search-dec:get-value-from-part($doc, $label-part)
      else
        $label-part/value,
    " "
  ))
};

declare function search-dec:build-metadata($doc) as xs:string?
{
  search-dec:_build-metadata($doc, $meta-parts, object-node {})
};

declare function search-dec:_build-metadata($doc, $parts, $base-object) as xs:string?
{
  if (fn:empty($parts)) then
    xdmp:to-json-string($base-object)
  else
    let $part := fn:head($parts)
    let $qname-label := xs:QName(xdmp:encode-for-NCName($part/label))
    let $value := search-dec:get-value-from-part($doc, $part)
    return
      search-dec:_build-metadata(
        $doc,
        fn:tail($parts),
        if (fn:exists($value[fn:normalize-space(.)])) then
          $base-object + object-node {
            $qname-label: $value
          }
        else
          $base-object
      )
};

declare function search-dec:get-value-from-part($doc, $label-part)
{
  let $qname := fn:QName($label-part/value/elementNamespace, $label-part/value/element)
  let $attribute-qname :=
    if (fn:exists($label-part/value/attribute[fn:normalize-space(.)])) then
      fn:QName($label-part/value/attributeNamespace, $label-part/value/attribute)
    else
      ()
  let $elements := $doc//*[fn:node-name() eq $qname]
  return
    fn:string(
      if (fn:exists($attribute-qname)) then
        ($elements/@*[fn:node-name(.) eq $attribute-qname])[1]
      else
        $elements[1]
    )
};

