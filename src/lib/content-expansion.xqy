xquery version "1.0-ml";

module namespace expand="http://marklogic.com/content-helpes/content-expansion";

import module namespace sem = "http://marklogic.com/semantics"
      at "/MarkLogic/semantics.xqy";

declare namespace html = "http://www.w3.org/1999/xhtml";
declare namespace ingest = "http://marklogic.com/dll/ingest-binaries";
declare namespace zip = "xdmp:zip";

declare variable $triple-types as map:map := map:new((
    map:entry("text/turtle", "turtle"),
    map:entry("text/n-triples", "ntriple"),
    map:entry("application/rdf+xml", "rdfxml"),
    map:entry("text/n3", "n3"),
    map:entry("application/trig", "trig")
  ));

declare option xdmp:mapping "false";

declare function expand:document(
  $uri as xs:string,
  $content as document-node(),
  $shouldDecode as xs:boolean,
  $collections as xs:string*
) as document-node()
{
  let $content-type := xdmp:uri-content-type($uri)
  let $_log := xdmp:log("loading "|| $uri ||" of content type " || $content-type)
  let $content :=
    if ($shouldDecode) then
      let $binary :=
        if ($content castable as xs:base64Binary) then
          document { binary { xs:hexBinary(xs:base64Binary($content)) } }
        else if ($content castable as xs:hexBinary) then
          document { binary { xs:hexBinary($content) } }
        else (
          $content,
          xdmp:log(("couldn't decode", $content))
        )
      return
        if (fn:matches($content-type, "^(text/.*|application/(.+\+)?(xml|json))$")) then
          if ($binary/binary()) then
            document {xdmp:binary-decode($binary, "UTF-8")}
          else
            $content
        else
          document { binary { xs:hexBinary(xs:base64Binary(xdmp:binary-decode($binary, "UTF-8"))) } }
    else
      $content
  return
    if ($content-type = map:keys($triple-types)) then (
      expand:triples(
        $uri,
        $content,
        $content-type,
        $collections
      ),
      $content
    ) else if ($content-type eq "text/csv") then (
      expand:csv(
        $uri,
        $content,
        $collections
      ),
      document {
        "ExpandedToJson"
      }
    ) else if ($content-type eq "application/zip") then (
      expand:zip($uri, $content, $collections),
      $content
    ) else if (fn:matches($content-type, "^(text/.*|application/(.+\+)?(xml|json))$")) then (
      $content
    ) else (
      expand:binary($uri, $content, $content-type, $collections),
      $content
    )
};

declare function expand:decode-hex($hexBinary as document-node())
{
  let $hex := fn:string($hexBinary/binary())
  return
    document {
      fn:codepoints-to-string(
        for $i in (1 to fn:string-length($hex))
        where ($i mod 2) eq 1
        return
          xdmp:hex-to-integer(fn:substring($hex, $i, 2))
      )
    }
};


declare function expand:binary(
  $uri as xs:string,
  $content as document-node(),
  $content-type as xs:string,
  $collections as xs:string*
) as empty-sequence()
{
  let $metadata :=
    if (fn:contains($content-type, "application/pdf")) then
      try {
        fn:tail(xdmp:pdf-convert($content, fn:tokenize($uri, "/")[fn:last()]))/element()
      } catch ($e) {
        xdmp:document-filter($content)
      }
    else
      xdmp:document-filter($content)
  return (
    xdmp:document-insert($uri || ".xml",
      element binary-details {
        element binary-file-location {$uri},
        element binary-content-type {$content-type},
        element metadata {
          $metadata
        }
      },
      (
        xdmp:permission("rest-reader", "read"),
        xdmp:permission("rest-writer", "update")
      ),
      $collections
    )
  )
};

declare function expand:csv(
  $uri as xs:string,
  $content as document-node(),
  $collections as xs:string*
) as empty-sequence()
{
  let $uri-base := fn:replace($uri, "\.[^\.]+$", "/")
  let $lines := fn:tokenize($content, "(&#10;|&#13;)+")
  let $headers := fn:tokenize(fn:head($lines), ",")
  for $row at $row-num in fn:tail($lines)
  let $properties :=
    if (fn:matches($row, '"([^"]+)"')) then
      for $part in fn:analyze-string($row ,'"([^"]+)"')/*
      return
        typeswitch($part)
        case element(fn:match) return
          fn:string($part/fn:group)
        default return
          fn:tokenize($part, "\s*,\s*") ! fn:normalize-space()[. ne '']
    else
      fn:tokenize($row, "\s*,\s*")
  return
    xdmp:document-insert($uri-base || $row-num || ".json",
      xdmp:to-json(
        map:new((
          for $prop-label at $prop-pos in $headers
          return
            map:entry($prop-label, $properties[$prop-pos])
        ))
      ),
      (
        xdmp:permission("rest-reader", "read"),
        xdmp:permission("rest-writer", "update")
      ),
      $collections
    )
};

declare function expand:zip(
  $uri as xs:string,
  $content as document-node(),
  $collections as xs:string*
) as empty-sequence()
{
  let $uri-base := fn:replace($uri, "\.[^\.]+$", "/")
  let $manifest := xdmp:zip-manifest($content/binary())
  for $part in $manifest/zip:part
  let $file-relative-uri := fn:string($part)
  let $file-full-uri := $uri-base || $file-relative-uri
  let $file-content :=
    xdmp:zip-get(
      $content,
      $file-relative-uri
    )
  let $file-content :=
    typeswitch($file-content)
    case document-node() return
      $file-content
    default return
      document { $file-content }
  return
    xdmp:document-insert($file-full-uri,
      expand:document(
        $file-full-uri,
        $file-content,
        fn:false(),
        $collections
      ),
      (
        xdmp:permission("rest-reader", "read"),
        xdmp:permission("rest-writer", "update")
      ),
      $collections
    )
};

declare function expand:triples(
  $uri as xs:string,
  $content as document-node(),
  $content-type as xs:string,
  $collections as xs:string*
)
{
  let $new-uri := fn:replace($uri, "\.[^\.]+$", ".xml")
  return
    xdmp:document-insert($new-uri,
      element sem:triples {
        sem:rdf-parse($content, (map:get($triple-types, $content-type), "repair"))
      },
      (
        xdmp:permission("rest-reader", "read"),
        xdmp:permission("rest-writer", "update")
      )
    )
};

