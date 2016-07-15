xquery version "1.0-ml";

module namespace utilities = "http://marklogic.com/utilities";

import module namespace c = "http://marklogic.com/roxy/config"
  at "/app/config/config.xqy";
import module namespace json = "http://marklogic.com/xdmp/json"
    at "/MarkLogic/json/json.xqy";

declare default function namespace "http://www.w3.org/2005/xpath-functions";

(:
 : Wrapper function for sending an email
 :)
declare function utilities:send-notification(
  $recipient-name as xs:string,
  $recipient-email as xs:string,
  $subject as  xs:string,
  $message as item()
) as empty-sequence() {
  xdmp:email(
    <em:Message
      xmlns:em="URN:ietf:params:email-xml:"
      xmlns:rf="URN:ietf:params:rfc822:">
      <rf:subject>{$subject}</rf:subject>
      <rf:from>
        <em:Address>
          <em:name>IHS Demo</em:name>
          <em:adrs>no-reply@yihs.marklogic.com</em:adrs>
        </em:Address>
      </rf:from>
      <rf:to>
        <em:Address>
          <em:name>{$recipient-name}</em:name>
          <em:adrs>{$recipient-email}</em:adrs>
        </em:Address>
      </rf:to>
      <em:content>
        <html xmlns="http://www.w3.org/1999/xhtml">
          <head>
            <title>{$subject}</title>
          </head>
          <body>{$message}</body>
        </html>
      </em:content>
    </em:Message>
  )
};

declare function utilities:highlight($doc, $query) {
  cts:highlight($doc, $query, <span class="highlight">{$cts:text}</span>)
};

declare function utilities:transform-json-config() {
  let $c := json:config("custom") ,
    $cx := map:put( $c, "whitespace", "ignore" ),
    $cx := map:put( $c, "array-element-names" ,('included-element','excluded-element','word-lexicon')),
    $cx := map:put( $c, "attribute-names", ()),
    $cx := map:put( $c , "camel-case", fn:true() )
  return $c
};

declare variable $json-config := utilities:transform-json-config();

declare function utilities:transform-from-json(
  $node as node()
) as node()*
{
  let $list-name := utilities:camel-case-to-hyphenated(fn:local-name-from-QName(fn:node-name($node/array-node())))
  let $items := utilities:add-dbnamespace(json:transform-from-json($node, $json-config))
  return
    element {$list-name} {
      $items/node()
    }
};

declare function utilities:add-dbnamespace(
  $node as node()
) as node()
{
  typeswitch($node)
  case element() return
    let $local-name := fn:local-name($node)
    let $namespace :=
      if ($local-name = ("rangeindex-list", "field-list")) then
        ""
      else
        "http://marklogic.com/xdmp/database"
    return
      element {fn:QName($namespace, $local-name)} {
        utilities:add-dbnamespace($node/(@*|node()))
      }
  default return
    $node
};

declare function utilities:transform-to-json(
  $node as element()
) as node()
{
  let $local-name := fn:local-name($node)
  let $camel-case := utilities:hyphenated-to-camel-case($local-name)
  return
    object-node {
      $camel-case: array-node {
        $node/* ! json:transform-to-json-object(., $json-config)
      }
    }
};

declare
function utilities:hyphenated-to-camel-case(
  $string as xs:string
) as xs:string {
  let $words := cts:tokenize($string)[. instance of cts:word]
  return
    fn:string-join(
      (fn:head($words),
      for $word in fn:tail($words)
      return
        fn:upper-case(fn:substring($word,1,1)) || fn:substring($word,2)
      ),
      ''
    )
};

declare
function utilities:camel-case-to-hyphenated(
  $string as xs:string
) as xs:string {
  fn:lower-case(
    fn:replace(
      $string,
      "([a-z])([A-Z])",
      "$1-$2"
    )
  )
};

declare
function utilities:document-from-discovery-app-db(
  $uri as xs:string
) as document-node()? {
  if (xdmp:database() = $c:content-database-id) then
    fn:doc($uri)
  else
    xdmp:invoke-function(
      function() { fn:doc($uri) }
    , map:entry("database", $c:content-database-id))
};
