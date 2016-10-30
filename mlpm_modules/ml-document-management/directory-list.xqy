xquery version "1.0-ml";

module namespace dir = "http://marklogic.com/ml-document-management/directory-list";

import module namespace dls = "http://marklogic.com/xdmp/dls"
  at "/MarkLogic/dls.xqy";

declare namespace document-meta = "http://marklogic.com/ml-document-management/document-meta";

declare option xdmp:mapping "false";

declare function dir:directories($directory)
{
  for $sub-dir in find-sub-directories($directory)[fn:not(fn:ends-with(., "_versions/"))]
  let $name := (fn:reverse(fn:tokenize($sub-dir, "/"))[. ne ""])[1]
  return
    object-node {
      "uri": $sub-dir,
      "name": $name
    }
};

declare function dir:files($directory)
{
  for $uri in find-sub-files($directory)[fn:not(fn:ends-with(., ".xhtml"))]
  return dir:file-details($uri)
};

declare function dir:file-details($uri)
{
  let $meta := fn:doc($uri)/property::document-meta:meta/*
  let $title := $meta[self::document-meta:title]
  let $description := $meta[self::document-meta:description]
  let $name := (fn:reverse(fn:tokenize($uri, "/"))[. ne ""])[1]
  let $doc-is-managed := dls:document-is-managed($uri)
  let $checkout-status :=
    if ($doc-is-managed) then
      dls:document-checkout-status($uri)
    else ()
  let $doc-permission-roles := xdmp:document-get-permissions($uri)/sec:role-id
  return
    object-node {
      "metadata": array-node {
        for $meta in ($meta except ($title|$description))
        return
          object-node {
            "label": fn:string($meta/document-meta:label),
            "value": fn:string($meta/document-meta:value)
          }
      },
      "document": $uri,
      "fileName": $name,
      "title": fn:string($title),
      "description": fn:string($description),
      "version":
        if ($doc-is-managed) then
          fn:string(
            fn:head(
              fn:reverse(
                dls:document-history($uri)/dls:version/dls:version-id
              )
            )
          )
        else null-node{},
      "isCheckedout": fn:exists($checkout-status),
      "checkedoutByCurrentUser": $checkout-status/sec:user-id = xdmp:get-current-userid(),
      "checkoutMessage": fn:string($checkout-status/dls:annotation)
    }
};

declare function find-sub-files($directory as xs:string) {
  cts:uris($directory, ('properties','concurrent'),
    cts:and-query((
      cts:directory-query($directory,"1"),
      cts:not-query(
        cts:properties-query(
          cts:element-query(xs:QName('prop:directory'),cts:and-query(()))
        )
      )
    ))
  )
};

declare function find-sub-directories($directory as xs:string) {
  cts:uris($directory, ('properties','concurrent'),
    cts:and-query((
      cts:directory-query($directory,"1"),
      cts:properties-query(
        cts:element-query(xs:QName('prop:directory'),cts:and-query(()))
      )
    ))
  )
};

