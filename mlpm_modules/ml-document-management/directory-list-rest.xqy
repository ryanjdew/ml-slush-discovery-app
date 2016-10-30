xquery version "1.0-ml";

module namespace resource = "http://marklogic.com/rest-api/resource/directory-list";

import module namespace dir = "http://marklogic.com/ml-document-management/directory-list"
  at "/ext/mlpm_modules/ml-document-management/directory-list.xqy";
import module namespace dls = "http://marklogic.com/xdmp/dls"
  at "/MarkLogic/dls.xqy";


declare namespace rapi = "http://marklogic.com/rest-api";
declare namespace document-meta = "http://marklogic.com/ml-document-management/document-meta";

declare function get(
  $context as map:map,
  $params  as map:map
  ) as document-node()*
{
  if (map:contains($params, "directory")) then
    let $directory := map:get($params, "directory")
    return
      document {
        object-node {
          "directories": array-node {
            dir:directories($directory)
          },
          "files": array-node {
            dir:files($directory)
          }
        }
      }
  else if (map:contains($params, "file")) then
    let $file := map:get($params, "file")
    return
      document {
        dir:file-details($file)
      }
  else
    document { array-node {()} }
};

declare %rapi:transaction-mode("update") function post(
  $context as map:map,
  $params as map:map,
  $input as document-node()*
) as document-node()*
{
  let $directory-path := map:get($params, "directory-path")
  let $_ := xdmp:directory-create($directory-path)
  return
    document {
      object-node {
        "success": fn:true()
      }
    }
};
