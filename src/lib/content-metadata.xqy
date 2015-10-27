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
        ($sampleDocuments/descendant-or-self::*[starts-with(local-name(), $localname,$collation)],
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
                <element>{ local-name($element) }</element>
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
  (collection()/node())[1 to $amount]
};


declare function data:get-sample-properties(
    $amount as xs:integer,
    $localname as xs:string
) as element()*
{
    (collection()/node())[1 to $amount]/property::*[starts-with(local-name(), $localname,"http://marklogic.com/collation//S1")]
};