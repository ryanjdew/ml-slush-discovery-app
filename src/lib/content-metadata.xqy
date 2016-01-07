xquery version "1.0-ml";

(: Copyright 2002-2015 MarkLogic Corporation.  All Rights Reserved. :)

module namespace data="http://marklogic.com/appservices/builder/data";

declare default function namespace "http://www.w3.org/2005/xpath-functions";
declare option xdmp:mapping "false";

(: this function is only valid for element-attribute and element indexes (which use the GPEAC) :)
declare function data:get-localname-details(
    $localname as xs:string,
    $type as xs:string
) as element(localname)*
{
    let $collation := "http://marklogic.com/collation//S1"
    let $sampleDocuments := data:get-sample-docs(5)
    let $sampleProperties := data:get-sample-properties(500, $localname)

    let $elements :=
     if($type = ("element", "element-attribute")) then
        ($sampleDocuments/descendant-or-self::*[starts-with(string((local-name()[. ne ''],node-name())[1]), $localname,$collation)],
         $sampleProperties)
          else ()
    let $attributes := if($type = ("element-attribute", "attribute")) then $sampleDocuments/descendant-or-self::*/@*[starts-with(local-name(), $localname,$collation)] else ()
    let $map := map:map()
    let $populate :=
        for $element in $elements
        let $key := concat(namespace-uri($element), " ", local-name($element))
        where empty(map:get($map, $key))
        return map:put($map, $key, <localname array="true">
                <elementNamespace>{ namespace-uri($element) }</elementNamespace>
                <element>{ (local-name($element)[. ne ''], string(node-name($element)))[1] }</element>
                <path>{xdmp:path($element)}</path>
            </localname>)
    let $populate :=
        for $attribute in $attributes
        let $element := $attribute/..
        let $key := concat(namespace-uri($element), " ", local-name($element), " ", namespace-uri($attribute), " ", local-name($attribute))
        where empty(map:get($map, $key))
        return map:put($map, $key, <localname array="true">
                <elementNamespace>{ namespace-uri($element) }</elementNamespace>
                <element>{ local-name($element) }</element>
                <attributeNamespace>{ namespace-uri($attribute) }</attributeNamespace>
                <attribute>{ local-name($attribute) }</attribute>
                <path>{$attribute}</path>
            </localname>)
    for $key in map:keys($map)
    let $value := map:get($map, $key)
    order by if($value/attribute) then string($value/attribute) else string($value/element) ascending
    return map:get($map, $key)
};

declare function data:get-sample-docs(
    $amount as xs:integer
) as node()*
{
  let $sample-positions as xs:integer+ := (1 to $amount)
  let $unique-root-qnames as xs:QName* := (data:find-unique-root-qnames("xml"), data:find-unique-root-qnames("json"))
  for $root-qname as xs:QName in $unique-root-qnames
  return
    (
      cts:search(fn:collection()/element(),
        cts:element-query($root-qname,cts:and-query(()),"self"),
        "format-xml"
      )[fn:position() = $sample-positions],
      cts:search(fn:collection()/*,
        cts:json-property-scope-query(fn:string($root-qname), cts:and-query(())),
        "format-json"
      )[fn:position() = $sample-positions]
    )
};


declare function data:get-sample-properties(
    $amount as xs:integer,
    $localname as xs:string
) as node()*
{
  data:get-sample-docs($amount)/property::*[starts-with(string((local-name()[. ne ''],node-name())[1]), $localname,"http://marklogic.com/collation//S1")]
};

declare variable $sample-positions as xs:integer+ := (1 to 5);

declare function data:find-unique-root-qnames($format as xs:string?, $found-qnames as xs:QName*) {
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
          then data:find-unique-root-qnames($format, ($found-qnames,$next-qname))
          else $found-qnames
};

declare function data:find-unique-root-qnames($format as xs:string?) {
  for $qn in data:find-unique-root-qnames($format, ())
  order by string($qn)
  return $qn
};
