xquery version "1.0-ml";

(:~
 : functions for discovering range indexes and grouping them by document-root QNames.
 :
 : &lt;em&gt;
 :   &lt;strong&gt;Warning: this is experimental software!&lt;/strong&gt;
 :   This module uses un-supported features of MarkLogic Server, which are subject to modification or removal without notice.
 : &lt;/em&gt;
 :
 : @author Joe Bryan
 : @version 1.1.0
 :)
module namespace idx = "http://marklogic.com/index-discovery";

import module namespace admin = "http://marklogic.com/xdmp/admin" at "/MarkLogic/admin.xqy";
import module namespace ctx = "http://marklogic.com/cts-extensions"
  at "/ext/mlpm_modules/cts-extensions/cts-extensions.xqy";

declare namespace db = "http://marklogic.com/xdmp/database";

declare option xdmp:mapping "false";

(: creates a new map from a sequence of maps, merging values by key :)
declare %private function idx:intersect-maps($maps as map:map*) as map:map
{
  fn:fold-left(
    function($a, $b) { $a + $b },
    map:map(),
    $maps)
};

(: returns a map of `{ root-QName: reference }` for each root QName containing `$ref` :)
declare %private function idx:reference-roots($ref as cts:reference) as map:map*
{
  for $root in ctx:root-QNames( ctx:reference-query($ref) )
  return map:entry(xdmp:key-from-QName($root), $ref)
};

(: returns a map of `{ collection: reference }` for each collection with documents containing `$ref` :)
declare %private function idx:reference-collections($ref as cts:reference) as map:map*
{
  for $collection in
    cts:collections((), ("score-zero", "concurrent"), ctx:reference-query($ref) )
  return map:entry($collection, $ref)
};

(: returns a map of `cts:reference` objects, grouped by either document-root QNames or collections :)
declare %private function idx:evaluate-indexes($strategy as xs:string, $indexes as element()*) as map:map
{
  idx:intersect-maps(
    for $index in $indexes
    for $ref in ctx:resolve-reference-from-index($index)
    return
      switch($strategy)
      case "root" return idx:reference-roots($ref)
      case "collection" return idx:reference-collections($ref)
      default return fn:error((), "UNKNOWN-GROUPING-STRATEGY", "unknown grouping strategy: " || $strategy)
  )
};

(:~
 : returns a map of `cts:element-reference` objects (one for each configured element-range index),
 : grouped by document-root QNames
 :)
declare function idx:element-indexes() as map:map
{
  idx:element-indexes( "root" )
};

(:~
 : returns a map of `cts:element-reference` objects (one for each configured element-range index),
 : grouped by `$strategy` ("root" or "collection")
 :)
declare function idx:element-indexes($strategy as xs:string) as map:map
{
  idx:evaluate-indexes($strategy,
    admin:database-get-range-element-indexes(admin:get-configuration(), xdmp:database()))
};

(:~
 : returns a map of `cts:element-attribute-reference` objects (one for each configured element-attribute-range index),
 : grouped by document-root QNames
 :)
declare function idx:element-attribute-indexes() as map:map
{
  idx:element-attribute-indexes( "root" )
};

(:~
 : returns a map of `cts:element-attribute-reference` objects (one for each configured element-attribute-range index),
 : grouped by `$strategy` ("root" or "collection")
 :)
declare function idx:element-attribute-indexes($strategy as xs:string) as map:map
{
  idx:evaluate-indexes($strategy,
    admin:database-get-range-element-attribute-indexes(admin:get-configuration(), xdmp:database()))
};

(:~
 : returns a map of `cts:path-reference` objects (one for each configured path-range index),
 : grouped by document-root QNames
 :)
declare function idx:path-indexes() as map:map
{
  idx:path-indexes( "root" )
};

(:~
 : returns a map of `cts:path-reference` objects (one for each configured path-range index),
 : grouped by `$strategy` ("root" or "collection")
 :)
declare function idx:path-indexes($strategy as xs:string) as map:map
{
  idx:evaluate-indexes($strategy,
    admin:database-get-range-path-indexes(admin:get-configuration(), xdmp:database()))
};

(:~
 : returns a map of `cts:field-reference` objects (one for each configured field-range index),
 : grouped by document-root QNames
 :)
declare function idx:field-indexes() as map:map
{
  idx:field-indexes( "root" )
};

(:~
 : returns a map of `cts:field-reference` objects (one for each configured field-range index),
 : grouped by `$strategy` ("root" or "collection")
 :)
declare function idx:field-indexes($strategy as xs:string) as map:map
{
  idx:evaluate-indexes($strategy,
    (: field range-indexes can apparently exist without fields ... :)
    let $config := admin:get-configuration()
    let $database := xdmp:database()
    for $field in admin:database-get-range-field-indexes($config, $database)
    where
      try { fn:exists(admin:database-get-field($config, $database, $field/db:field-name)) }
      catch ($ex) { fn:false() }
    return $field)
};

(:~
 : returns a map of `cts:geospatial-attribute-pair-reference` objects (one for each configured geospatial element-attribute-pair index),
 : grouped by document-root QNames
 :)
declare function idx:geospatial-attribute-pair-indexes() as map:map
{
  idx:geospatial-attribute-pair-indexes( "root" )
};

(:~
 : returns a map of `cts:geospatial-attribute-pair-reference` objects (one for each configured geospatial element-attribute-pair index),
 : grouped by `$strategy` ("root" or "collection")
 :)
declare function idx:geospatial-attribute-pair-indexes($strategy as xs:string) as map:map
{
  idx:evaluate-indexes($strategy,
    admin:database-get-geospatial-element-attribute-pair-indexes(admin:get-configuration(), xdmp:database()))
};

(: cts:geospatial-json-property-child-reference :)
(:~
 : returns a map of `cts:geospatial-element-child-reference` objects (one for each configured geospatial element-child index),
 : grouped by document-root QNames
 :)
declare function idx:geospatial-element-child-indexes() as map:map
{
  idx:geospatial-element-child-indexes( "root" )
};

(:~
 : returns a map of `cts:geospatial-element-child-reference` objects (one for each configured geospatial element-child index),
 : grouped by `$strategy` ("root" or "collection")
 :)
declare function idx:geospatial-element-child-indexes($strategy as xs:string) as map:map
{
  idx:evaluate-indexes($strategy,
    admin:database-get-geospatial-element-child-indexes(admin:get-configuration(), xdmp:database()))
};

(: cts:geospatial-json-property-pair-reference :)
(:~
 : returns a map of `cts:geospatial-element-pair-reference` objects (one for each configured geospatial element-pair index),
 : grouped by document-root QNames
 :)
declare function idx:geospatial-element-pair-indexes() as map:map
{
  idx:geospatial-element-pair-indexes( "root" )
};

(:~
 : returns a map of `cts:geospatial-element-pair-reference` objects (one for each configured geospatial element-pair index),
 : grouped by `$strategy` ("root" or "collection")
 :)
declare function idx:geospatial-element-pair-indexes($strategy as xs:string) as map:map
{
  idx:evaluate-indexes($strategy,
    admin:database-get-geospatial-element-pair-indexes(admin:get-configuration(), xdmp:database()))
};

(: cts:geospatial-json-property-reference :)
(:~
 : returns a map of `cts:geospatial-element-reference` objects (one for each configured geospatial element index),
 : grouped by document-root QNames
 :)
declare function idx:geospatial-element-indexes() as map:map
{
  idx:geospatial-element-indexes( "root" )
};

(:~
 : returns a map of `cts:geospatial-element-reference` objects (one for each configured geospatial element index),
 : grouped by `$strategy` ("root" or "collection")
 :)
declare function idx:geospatial-element-indexes($strategy as xs:string) as map:map
{
  idx:evaluate-indexes($strategy,
    admin:database-get-geospatial-element-indexes(admin:get-configuration(), xdmp:database()))
};

(:~
 : returns a map of `cts:geospatial-path-reference` objects (one for each configured geospatial path index),
 : grouped by document-root QNames
 :)
declare function idx:geospatial-path-indexes() as map:map
{
  idx:geospatial-path-indexes( "root" )
};

(:~
 : returns a map of `cts:geospatial-path-reference` objects (one for each configured geospatial path index),
 : grouped by `$strategy` ("root" or "collection")
 :)
declare function idx:geospatial-path-indexes($strategy as xs:string) as map:map
{
  idx:evaluate-indexes($strategy,
    admin:database-get-geospatial-path-indexes(admin:get-configuration(), xdmp:database()))
};

(:~
 : returns a map of `cts:reference` objects (one for each configured range index),
 : grouped by document-root QNames
 :)
declare function idx:range-indexes() as map:map
{
  idx:range-indexes( "root" )
};

(:~
 : returns a map of `cts:reference` objects (one for each configured range index),
 : grouped by `$strategy` ("root" or "collection")
 :)
declare function idx:range-indexes($strategy as xs:string) as map:map
{
  idx:intersect-maps((
    idx:element-indexes($strategy),
    idx:element-attribute-indexes($strategy),
    idx:path-indexes($strategy),
    idx:field-indexes($strategy),
    idx:geospatial-attribute-pair-indexes($strategy),
    idx:geospatial-element-child-indexes($strategy),
    idx:geospatial-element-pair-indexes($strategy),
    idx:geospatial-element-indexes($strategy),
    idx:geospatial-path-indexes($strategy)
  ))
};

(:~
 : returns a map of map-serialized `cts:reference` objects (one for each configured range index),
 : grouped by document-root QNames
 :)
declare function idx:all() as map:map
{
  idx:all( "root" )
};

(:~
 : returns a map of map-serialized `cts:reference` objects (one for each configured range index),
 : grouped by `$strategy` ("root" or "collection")
 :)
declare function idx:all($strategy as xs:string) as map:map
{
  idx:expand-references( idx:range-indexes($strategy) )
};

(:~
 : replaces `cts:reference` objects with their map:map serialization, returns a new map
 :)
declare function idx:expand-references($indexes as map:map) as map:map
{
  map:new(
    for $key in map:keys($indexes)
    return
      map:entry($key,
        for $val in map:get($indexes, $key)
        return ctx:reference-to-map($val)))
};
