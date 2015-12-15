xquery version "1.0-ml";

module namespace ext = "http://marklogic.com/rest-api/resource/data-meta-information";

import module namespace data = "http://marklogic.com/appservices/builder/data" at "/lib/content-metadata.xqy";
import module namespace amped-common = "http://marklogic.com/appservices/util-amped" at "/MarkLogic/appservices/utils/common-amped.xqy";
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
function ext:get(
  $context as map:map,
  $params  as map:map
) as document-node()*
{
  xdmp:set-response-code(200, "OK"),
  document {
   map:put($context, "output-types", "application/json"),
   ext:content-details()
 }
};

declare variable $sample-size as xs:integer := 5;
declare variable $sample-positions as xs:integer+ := (1 to $sample-size);


declare function ext:content-details()
{
  object-node {
    "json-data": array-node {
        for $node-name in ext:find-unique-root-qnames("json")
        return
          ext:doc-type-details(
            $node-name,
            "json"
          )
      },
    "xml-data": array-node {
        for $node-name in ext:find-unique-root-qnames("xml")
        return
          ext:doc-type-details(
            $node-name,
            "xml"
          )
      }
  }
};

declare function ext:doc-type-details($node-name as xs:QName, $format as xs:string)
{
  let $sample-set := 
    if ($format = "json") then
      cts:search(fn:collection(), 
        cts:json-property-scope-query(fn:string($node-name), cts:and-query(())),
        "format-json"
      )[fn:position() = $sample-positions]/object-node()/node()[fn:node-name(.) eq $node-name]
    else 
      cts:search(fn:collection()/element(), 
        cts:element-query($node-name,cts:and-query(()),"self"),
        "format-xml"
      )[fn:position() = $sample-positions][fn:node-name(.) eq $node-name]
  return
    object-node {
      "format": $format,
      "name": fn:string($node-name),
      "properties": array-node {
        if ($format eq "json") then
          for $node-name in ext:find-unique-json-child-qnames($sample-set)
          return
            ext:determine-json-details($sample-set, $node-name)
        else 
          for $node-name in ext:find-unique-xml-child-qnames($sample-set)
          return
            ext:determine-xml-details($sample-set, $node-name)        
      }
    }
};

declare function ext:determine-json-details($sample-set as node()*, $property-name as xs:QName)
{
  let $properties := $sample-set//node()[fn:node-name(.) eq $property-name]
  let $all-have-children := every $prop in $properties satisfies $prop instance of array-node() or fn:exists($prop/object-node())
  let $some-have-children := fn:exists($properties[. instance of array-node() or object-node()])
  return
    object-node {
      "propertyName": fn:string($property-name),
      "types": array-node {
          fn:distinct-values(
            for $property in $properties
            return
              typeswitch($property)
              case object-node() return "[Object]"
              case array-node() return "[Array]"
              case number-node() return "number"
              case boolean-node() return "boolean"
              case text() return "string"
              default return "null"
          )
        },
      "allHaveChildren": $all-have-children,
      "someHaveChildren": $some-have-children
    }
};

declare function ext:determine-xml-details($sample-set as node()*, $property-name as xs:QName)
{
  let $properties := $sample-set//node()[fn:node-name(.) eq $property-name]
  let $all-have-children := every $prop in $properties satisfies fn:exists($prop/*)
  let $some-have-children := fn:exists($properties/*)
  return
    object-node {
      "propertyName": fn:string($property-name),
      "types": array-node {
          fn:distinct-values(
            for $property in $properties
            let $children := $property/*
            let $is-array-like := fn:count(fn:distinct-values($children/fn:node-name(.))) eq 1
            return
              if ($is-array-like) then
                "[Array]"
              else if (fn:exists($children)) then
                "[Object]"
              else
                ext:determine-xml-type($property)
          )
        },
      "allHaveChildren": $all-have-children,
      "someHaveChildren": $some-have-children
    }
};

declare function ext:determine-xml-type($property as node())
{
  if (xdmp:type($property) ne xs:QName("xs:untypedAtomic")) then
    fn:string(xdmp:type($property))
  else
    ext:determine-xml-type(
      $property, 
      (: Types to check if castable as. string is last since that will match anything :)
      (
        "time",
        "date",
        "dateTime",
        "integer",
        "decimal",
        "double",
        "float",
        "dayTimeDuration",
        "yearMonthDuration",
        "string"
      )
    )
};


declare function ext:determine-xml-type($property as node(), $types as xs:string*)
{
  if (fn:empty($types)) then
    "untypedAtomic"
  else if (xdmp:castable-as("http://www.w3.org/2001/XMLSchema", fn:head($types), $property)) then
    fn:head($types)
  else
    ext:determine-xml-type($property, fn:tail($types))
};

declare function ext:find-unique-xml-child-qnames($node as node()*) {
  fn:distinct-values(
    $node//element()/fn:node-name(.)
  )
};

declare function ext:find-unique-json-child-qnames($node as node()*) {
  fn:distinct-values(
    $node//node()/fn:node-name(.)
  )
};

declare function ext:find-unique-root-qnames($format as xs:string?, $found-qnames as xs:QName*) {
  let $next-qname := fn:distinct-values(cts:search(fn:collection(),
      if (fn:exists($found-qnames))
      then 
        if ($format = "json") then 
          cts:not-query(cts:json-property-scope-query(($found-qnames ! fn:string(.)), cts:and-query(())))
        else
          cts:not-query(cts:element-query($found-qnames,cts:and-query(()),"self"))
      else cts:and-query(()),
      (
        if (fn:exists($format)) then
          "format-" || $format
        else (),
        "score-random", 
        "unfaceted",
        "filtered"
      )
    )[fn:position() = $sample-positions]/(.|object-node())/node()/fn:node-name(.))
  return if (fn:exists($next-qname))
          then ext:find-unique-root-qnames($format, ($found-qnames,$next-qname))
          else $found-qnames
};

declare function ext:find-unique-root-qnames($format as xs:string?) {
  for $qn in ext:find-unique-root-qnames($format, ())
  order by string($qn)
  return $qn
};
