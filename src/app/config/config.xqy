(:
Copyright 2012-2016 MarkLogic Corporation

Licensed under the Apache License, Version 2.0 (the "License");
you may not use this file except in compliance with the License.
You may obtain a copy of the License at

   http://www.apache.org/licenses/LICENSE-2.0

Unless required by applicable law or agreed to in writing, software
distributed under the License is distributed on an "AS IS" BASIS,
WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
See the License for the specific language governing permissions and
limitations under the License.
:)
xquery version "1.0-ml";

module namespace c = "http://marklogic.com/roxy/config";

declare variable $c:content-database-name := "@ml.content-db";
declare variable $c:content-database-id := xdmp:database($c:content-database-name);

declare variable $c:admin-role-name := "@ml.app-admin-role";
declare variable $c:admin-role-id := xdmp:role($c:admin-role-name);
