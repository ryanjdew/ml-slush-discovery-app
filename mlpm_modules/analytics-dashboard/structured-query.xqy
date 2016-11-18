xquery version "1.0-ml";

(:~
 : Utility module from converting structured queries to/form JSON, XML, and cts:query
 :)
module namespace sq = "http://marklogic.com/mlpm/structured-query";

import module namespace ast = "http://marklogic.com/appservices/search-ast"
  at "/MarkLogic/appservices/search/ast.xqy";
import module namespace sut = "http://marklogic.com/rest-api/lib/search-util"
  at "/MarkLogic/rest-api/lib/search-util.xqy";
import module namespace csu = "http://marklogic.com/rest-api/config-query-util"
  at "/MarkLogic/rest-api/lib/config-query-util.xqy";
import module namespace search = "http://marklogic.com/appservices/search"
  at "/MarkLogic/appservices/search/search.xqy";

declare function sq:from-json($json as json:object) as element(search:query)?
{
  sut:search-from-json( xdmp:to-json($json) )/search:query
};

declare function sq:to-json($sq as element(search:query)) as json:object?
{
  csu:xml-to-json($sq) ! xdmp:from-json(.)
};

declare function sq:to-cts($sq as element(search:query), $options as element(search:options)) as cts:query?
{
  map:get(ast:to-query($sq, $options), "query")
};

declare function sq:named-options($name as xs:string) as element(search:options)?
{
  sut:options(map:entry("options", $name))
};

declare function sq:named-options-qconsole($name as xs:string) as element(search:options)?
{
  sq:named-options-qconsole($name, ())
};

declare function sq:options-from-json($json as json:object) as element(search:options)?
{
  csu:options-from-json(xdmp:unquote(xdmp:to-json-string($json)))
};

declare function sq:qtext-to-cts($qtext as xs:string, $options as element(search:options)) as cts:query?
{
  cts:query(search:parse($qtext, $options))
};

declare function sq:combine-cts($sq as cts:query, $qtext as cts:query) as cts:query
{
  cts:and-query(($sq, $qtext))
};

declare function sq:named-options-qconsole(
  $name as xs:string,
  $group as xs:string?
) as element(search:options)?
{
  xdmp:eval('
    xquery version "1.0-ml";
    import module namespace admin = "http://marklogic.com/xdmp/admin" at "/MarkLogic/admin.xqy";
    import module namespace config-query = "http://marklogic.com/rest-api/models/config-query"  at "/MarkLogic/rest-api/models/config-query-model.xqy";
    import module namespace dbut = "http://marklogic.com/rest-api/lib/db-util" at "/MarkLogic/rest-api/lib/db-util.xqy";
    import module namespace eput = "http://marklogic.com/rest-api/lib/endpoint-util" at "/MarkLogic/rest-api/lib/endpoint-util.xqy";
    declare variable $name as xs:string external;
    declare variable $group as xs:string external := "Default";
    let $server :=
      let $server := xdmp:server-name(xdmp:server())
      return
        if (fn:index-of($server,"App-Services"))
        then
          let $config := admin:get-configuration()
          let $groupid := admin:group-get-id($config, $group)
          let $db := xdmp:database()
          for $id in admin:group-get-appserver-ids($config, $groupid)
          where admin:appserver-get-database($config, $id) eq $db and
                admin:appserver-get-type($config, $id) eq "http"
          return 
            let $server := admin:appserver-get-name($config, $id)
            return if ($server ne "App-Services") then $server else ()
        else $server
    let $uri := eput:make-document-uri($config-query:storage-prefix || $name, (), $server)
    return dbut:access-config(function() { fn:doc($uri)/node() })',
    (
      xs:QName("name"), $name,
      xs:QName("group"), $group
    ))
};