xquery version "1.0-ml";

module namespace ext = "http://marklogic.com/rest-api/resource/load-data";

declare namespace dir = "http://marklogic.com/xdmp/directory";
declare namespace rapi = "http://marklogic.com/rest-api";
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
%rapi:transaction-mode("update")
%roxy:params("directory=xs:string")
function ext:post(
    $context as map:map,
    $params  as map:map,
    $input   as document-node()*
) as document-node()*
{
  map:put($context, "output-types", "application/json"),
  xdmp:set-response-code(200, "OK"),
  let $doc-permissions :=
    (
      xdmp:permission('rest-reader', 'read'),
      xdmp:permission('rest-writer', 'update')
    )
  let $directory := map:get($params, 'directory')
  let $directory-info := xdmp:filesystem-directory($directory)
  let $docs-found := $directory-info/dir:entry[dir:type eq "file"]
  let $docs-collection := "load-data:"|| fn:string(xdmp:random())
  let $docs-failed :=
      for $file-info in $docs-found
      where fn:not(fn:starts-with($file-info/dir:filename, "."))
      return
        try {
          xdmp:document-insert(
            "/documents/" || $file-info/dir:filename,
            document {
              let $file := xdmp:filesystem-file($file-info/dir:pathname)
              return 
                if (fn:ends-with($file-info/dir:filename, ".xml") or fn:ends-with($file-info/dir:filename, ".json")) then
                  xdmp:unquote($file)
                else
                  $file
            },
            $doc-permissions,
            $docs-collection
          )
        } catch * {
          fn:string($file-info/dir:filename),
          xdmp:log('Error [' || $err:code || ']: ' || $err:description)
        }
  return
    document { 
      object-node {
        "success": fn:true(),
        "collection": $docs-collection,
        "docCountFound": fn:count($docs-found),
        "docCountSucceeded": fn:count($docs-found) - fn:count($docs-failed),
        "failedDocuments": array-node {
          $docs-failed
        }
      }
    }
};