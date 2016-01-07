xquery version "1.0-ml";

module namespace expand="http://marklogic.com/content-helpes/content-expansion";

declare namespace html = "http://www.w3.org/1999/xhtml";
declare namespace ingest = "http://marklogic.com/dll/ingest-binaries";
declare namespace zip = "xdmp:zip";

declare option xdmp:mapping "false";


declare function expand:document(
  $uri as xs:string,
  $content as document-node()
) as document-node()
{
  let $content-type := xdmp:uri-content-type($uri)
  let $_log := xdmp:log("Loading uri: " || $uri)
  let $_log := xdmp:log("Loading content type: " || $content-type)
  return
    typeswitch(($content/*, $content/object-node(), $content/binary(), $content/text())[1])
    case element()|object-node() return
      $content
    case binary() return
      if ($content-type eq "application/zip") then (
        expand:zip($uri, $content),
        $content
      ) else (
        expand:binary($uri, $content),
        $content
      )
    default return
      if ($content-type eq "text/csv") then (
        expand:csv(
          $uri,
          $content
        ),
        document {
          "ExpandedToJson"
        }
      ) else
        $content
};

declare function expand:binary(
  $uri as xs:string,
  $content as document-node()
) as empty-sequence()
{
  let $filter := xdmp:document-filter($content)
  let $metadata :=
    for $meta in $filter//html:meta
    return
      element { xs:QName(concat("ingest:", $meta/@name)) } {
        data($meta/@content)
      }
  return (
    xdmp:document-set-property($uri, <ingest:filter>{$filter}</ingest:filter>),
    xdmp:document-set-property($uri, <ingest:metadata>{$metadata}</ingest:metadata>)
  )
};

declare function expand:csv(
  $uri as xs:string,
  $content as document-node()
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
      )
    )
};

declare function expand:zip(
  $uri as xs:string,
  $content as document-node()
) as empty-sequence()
{
  let $uri-base := fn:replace($uri, "\.[^\.]+$", "/")
  let $manifest := xdmp:zip-manifest($content)
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
        $file-content
      ),
      (
        xdmp:permission("rest-reader", "read"),
        xdmp:permission("rest-writer", "update")
      )
    )
};
