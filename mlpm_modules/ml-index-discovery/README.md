### index discovery

##### xquery library module: `http://marklogic.com/index-discovery`

functions for discovering range indexes and grouping them by document-root QNames.

 <em>
   <strong>Warning: this is experimental software!</strong>
   This module uses un-supported features of MarkLogic Server, which are subject to modification or removal without notice.
 </em>

Author:  Joe Bryan

Version:  2.0.0

#### Table of Contents

* Functions: [idx:element-indexes\#0](#func_idx_element-indexes_0), [idx:element-indexes\#1](#func_idx_element-indexes_1), [idx:element-attribute-indexes\#0](#func_idx_element-attribute-indexes_0), [idx:element-attribute-indexes\#1](#func_idx_element-attribute-indexes_1), [idx:path-indexes\#0](#func_idx_path-indexes_0), [idx:path-indexes\#1](#func_idx_path-indexes_1), [idx:field-indexes\#0](#func_idx_field-indexes_0), [idx:field-indexes\#1](#func_idx_field-indexes_1), [idx:geospatial-attribute-pair-indexes\#0](#func_idx_geospatial-attribute-pair-indexes_0), [idx:geospatial-attribute-pair-indexes\#1](#func_idx_geospatial-attribute-pair-indexes_1), [idx:geospatial-element-child-indexes\#0](#func_idx_geospatial-element-child-indexes_0), [idx:geospatial-element-child-indexes\#1](#func_idx_geospatial-element-child-indexes_1), [idx:geospatial-element-pair-indexes\#0](#func_idx_geospatial-element-pair-indexes_0), [idx:geospatial-element-pair-indexes\#1](#func_idx_geospatial-element-pair-indexes_1), [idx:geospatial-element-indexes\#0](#func_idx_geospatial-element-indexes_0), [idx:geospatial-element-indexes\#1](#func_idx_geospatial-element-indexes_1), [idx:geospatial-path-indexes\#0](#func_idx_geospatial-path-indexes_0), [idx:geospatial-path-indexes\#1](#func_idx_geospatial-path-indexes_1), [idx:range-indexes\#0](#func_idx_range-indexes_0), [idx:range-indexes\#1](#func_idx_range-indexes_1), [idx:all\#0](#func_idx_all_0), [idx:all\#1](#func_idx_all_1), [idx:expand-references\#1](#func_idx_expand-references_1)

#### Functions

##### <a name="func_idx_element-indexes_0"/> idx:element-indexes\#0
```xquery
idx:element-indexes() as map:map
```

 returns a map of `cts:element-reference` objects (one for each configured element-range index),
 grouped by document-root QNames

###### returns `map:map`

##### <a name="func_idx_element-indexes_1"/> idx:element-indexes\#1
```xquery
idx:element-indexes($strategy as xs:string) as map:map
```

 returns a map of `cts:element-reference` objects (one for each configured element-range index),
 grouped by `$strategy` ("root" or "collection")

###### params

* $strategy as `xs:string`

###### returns `map:map`

##### <a name="func_idx_element-attribute-indexes_0"/> idx:element-attribute-indexes\#0
```xquery
idx:element-attribute-indexes() as map:map
```

 returns a map of `cts:element-attribute-reference` objects (one for each configured element-attribute-range index),
 grouped by document-root QNames

###### returns `map:map`

##### <a name="func_idx_element-attribute-indexes_1"/> idx:element-attribute-indexes\#1
```xquery
idx:element-attribute-indexes($strategy as xs:string) as map:map
```

 returns a map of `cts:element-attribute-reference` objects (one for each configured element-attribute-range index),
 grouped by `$strategy` ("root" or "collection")

###### params

* $strategy as `xs:string`

###### returns `map:map`

##### <a name="func_idx_path-indexes_0"/> idx:path-indexes\#0
```xquery
idx:path-indexes() as map:map
```

 returns a map of `cts:path-reference` objects (one for each configured path-range index),
 grouped by document-root QNames

###### returns `map:map`

##### <a name="func_idx_path-indexes_1"/> idx:path-indexes\#1
```xquery
idx:path-indexes($strategy as xs:string) as map:map
```

 returns a map of `cts:path-reference` objects (one for each configured path-range index),
 grouped by `$strategy` ("root" or "collection")

###### params

* $strategy as `xs:string`

###### returns `map:map`

##### <a name="func_idx_field-indexes_0"/> idx:field-indexes\#0
```xquery
idx:field-indexes() as map:map
```

 returns a map of `cts:field-reference` objects (one for each configured field-range index),
 grouped by document-root QNames

###### returns `map:map`

##### <a name="func_idx_field-indexes_1"/> idx:field-indexes\#1
```xquery
idx:field-indexes($strategy as xs:string) as map:map
```

 returns a map of `cts:field-reference` objects (one for each configured field-range index),
 grouped by `$strategy` ("root" or "collection")

###### params

* $strategy as `xs:string`

###### returns `map:map`

##### <a name="func_idx_geospatial-attribute-pair-indexes_0"/> idx:geospatial-attribute-pair-indexes\#0
```xquery
idx:geospatial-attribute-pair-indexes() as map:map
```

 returns a map of `cts:geospatial-attribute-pair-reference` objects (one for each configured geospatial element-attribute-pair index),
 grouped by document-root QNames

###### returns `map:map`

##### <a name="func_idx_geospatial-attribute-pair-indexes_1"/> idx:geospatial-attribute-pair-indexes\#1
```xquery
idx:geospatial-attribute-pair-indexes($strategy as xs:string) as map:map
```

 returns a map of `cts:geospatial-attribute-pair-reference` objects (one for each configured geospatial element-attribute-pair index),
 grouped by `$strategy` ("root" or "collection")

###### params

* $strategy as `xs:string`

###### returns `map:map`

##### <a name="func_idx_geospatial-element-child-indexes_0"/> idx:geospatial-element-child-indexes\#0
```xquery
idx:geospatial-element-child-indexes() as map:map
```

 returns a map of `cts:geospatial-element-child-reference` objects (one for each configured geospatial element-child index),
 grouped by document-root QNames

###### returns `map:map`

##### <a name="func_idx_geospatial-element-child-indexes_1"/> idx:geospatial-element-child-indexes\#1
```xquery
idx:geospatial-element-child-indexes($strategy as xs:string) as map:map
```

 returns a map of `cts:geospatial-element-child-reference` objects (one for each configured geospatial element-child index),
 grouped by `$strategy` ("root" or "collection")

###### params

* $strategy as `xs:string`

###### returns `map:map`

##### <a name="func_idx_geospatial-element-pair-indexes_0"/> idx:geospatial-element-pair-indexes\#0
```xquery
idx:geospatial-element-pair-indexes() as map:map
```

 returns a map of `cts:geospatial-element-pair-reference` objects (one for each configured geospatial element-pair index),
 grouped by document-root QNames

###### returns `map:map`

##### <a name="func_idx_geospatial-element-pair-indexes_1"/> idx:geospatial-element-pair-indexes\#1
```xquery
idx:geospatial-element-pair-indexes($strategy as xs:string) as map:map
```

 returns a map of `cts:geospatial-element-pair-reference` objects (one for each configured geospatial element-pair index),
 grouped by `$strategy` ("root" or "collection")

###### params

* $strategy as `xs:string`

###### returns `map:map`

##### <a name="func_idx_geospatial-element-indexes_0"/> idx:geospatial-element-indexes\#0
```xquery
idx:geospatial-element-indexes() as map:map
```

 returns a map of `cts:geospatial-element-reference` objects (one for each configured geospatial element index),
 grouped by document-root QNames

###### returns `map:map`

##### <a name="func_idx_geospatial-element-indexes_1"/> idx:geospatial-element-indexes\#1
```xquery
idx:geospatial-element-indexes($strategy as xs:string) as map:map
```

 returns a map of `cts:geospatial-element-reference` objects (one for each configured geospatial element index),
 grouped by `$strategy` ("root" or "collection")

###### params

* $strategy as `xs:string`

###### returns `map:map`

##### <a name="func_idx_geospatial-path-indexes_0"/> idx:geospatial-path-indexes\#0
```xquery
idx:geospatial-path-indexes() as map:map
```

 returns a map of `cts:geospatial-path-reference` objects (one for each configured geospatial path index),
 grouped by document-root QNames

###### returns `map:map`

##### <a name="func_idx_geospatial-path-indexes_1"/> idx:geospatial-path-indexes\#1
```xquery
idx:geospatial-path-indexes($strategy as xs:string) as map:map
```

 returns a map of `cts:geospatial-path-reference` objects (one for each configured geospatial path index),
 grouped by `$strategy` ("root" or "collection")

###### params

* $strategy as `xs:string`

###### returns `map:map`

##### <a name="func_idx_range-indexes_0"/> idx:range-indexes\#0
```xquery
idx:range-indexes() as map:map
```

 returns a map of `cts:reference` objects (one for each configured range index),
 grouped by document-root QNames

###### returns `map:map`

##### <a name="func_idx_range-indexes_1"/> idx:range-indexes\#1
```xquery
idx:range-indexes($strategy as xs:string) as map:map
```

 returns a map of `cts:reference` objects (one for each configured range index),
 grouped by `$strategy` ("root" or "collection")

###### params

* $strategy as `xs:string`

###### returns `map:map`

##### <a name="func_idx_all_0"/> idx:all\#0
```xquery
idx:all() as map:map
```

 returns a map of map-serialized `cts:reference` objects (one for each configured range index),
 grouped by document-root QNames

###### returns `map:map`

##### <a name="func_idx_all_1"/> idx:all\#1
```xquery
idx:all($strategy as xs:string) as map:map
```

 returns a map of map-serialized `cts:reference` objects (one for each configured range index),
 grouped by `$strategy` ("root" or "collection")

###### params

* $strategy as `xs:string`

###### returns `map:map`

##### <a name="func_idx_expand-references_1"/> idx:expand-references\#1
```xquery
idx:expand-references($indexes as map:map) as map:map
```

 replaces `cts:reference` objects with their map:map serialization, returns a new map

###### params

* $indexes as `map:map`

###### returns `map:map`

- - -

##### REST extension: `http://marklogic.com/rest-api/resource/index-discovery`

MarkLogic REST API extension for zero-knowledge, document-specific index discovery in any database

##### GET `/v1/resources/index-discovery`

gets a dynamic list of configured range indices, grouped by document-root QNames, a list of available content databases, and the current content database

###### params

* `rs:database` as `xs:string?`: optionally specify the name of a database to query
* `rs:strategy` as `xs:string?`: specify the index grouping strategy ("root" or "collection", defaults to "root")

*Generated by [xquerydoc](https://github.com/xquery/xquerydoc)*

### License Information

- Copyright (c) 2014 Joseph Bryan. All Rights Reserved.

Licensed under the Apache License, Version 2.0 (the "License");
you may not use this file except in compliance with the License.
You may obtain a copy of the License at

[http://www.apache.org/licenses/LICENSE-2.0]
(http://www.apache.org/licenses/LICENSE-2.0)

Unless required by applicable law or agreed to in writing, software
distributed under the License is distributed on an "AS IS" BASIS,
WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
See the License for the specific language governing permissions and
limitations under the License.

The use of the Apache License does not indicate that this project is
affiliated with the Apache Software Foundation.
