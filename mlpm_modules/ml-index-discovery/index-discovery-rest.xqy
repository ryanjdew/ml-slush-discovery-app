xquery version "1.0-ml";

(:~
 : MarkLogic REST API extension for zero-knowledge, document-specific index discovery in any database
 :
 : @author Joe Bryan
 :)
module namespace ext = "http://marklogic.com/rest-api/resource/index-discovery";

import module namespace idx = "http://marklogic.com/index-discovery"
  at "/ext/mlpm_modules/ml-index-discovery/index-discovery.xqy";

declare namespace roxy = "http://marklogic.com/roxy";

declare option xdmp:mapping "false";

declare %private function ext:databases()
{
  let $exclude := ("App-Services", "Extensions", "Fab", "Last-Login", "Modules", "Schemas", "Security", "Triggers")
  for $db in xdmp:databases()
  let $name := xdmp:database-name($db)
  where fn:not($name = $exclude) and
        fn:not(fn:matches($name, "-(modules|test|triggers|schema|schemas)$"))
  order by $name
  return $name
};

declare %private function ext:map-values-as-arrays($map as map:map) as map:map
{
  map:new(
    for $key in map:keys($map)
    let $val := map:get($map, $key)
    return
      map:entry($key,
        if ($val instance of json:array)
        then $val
        else json:to-array($val)))
};

declare %private function ext:invoke-in($params, $fn)
{
  let $database :=
    if (map:contains($params, "database"))
    then xdmp:database(map:get($params, "database"))
    else xdmp:database()
  return
    xdmp:invoke-function($fn,
      <options xmlns="xdmp:eval">
        <database>{ $database }</database>
      </options>)
};

(:~
 : gets a dynamic list of configured range indices, grouped by document-root QNames,
 : a list of available content databases,
 : and the current content database
 :)
declare
  %roxy:params("database=xs:string?", "strategy=xs:string?")
function ext:get(
  $context as map:map,
  $params as map:map
) as document-node()*
{
  map:put($context, "output-types", "application/json"),

  let $strategy :=
    if (map:contains($params, "strategy"))
    then map:get($params, "strategy")
    else "root"
  return
    document {
      ext:invoke-in($params, function() {
        xdmp:to-json(
          map:new((
            map:entry("current-database", xdmp:database-name(xdmp:database())),
            map:entry("databases", ext:databases()),
            map:entry("docs", ext:map-values-as-arrays( idx:all($strategy) )))))
      })
    }
};
