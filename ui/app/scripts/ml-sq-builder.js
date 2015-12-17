/**
 * ml-sq-builder
 *
 * Angular Module for building MarkLogic Structured Query
 */

(function(angular) {
  'use strict';

  angular.module('ml-sq-builder', [
    'RecursionHelper',
  ]);

})(window.angular);

(function(angular) {
  'use strict';

  var app = angular.module('ml-sq-builder');

  app.directive('sqBuilder', [
    'sqBuilderService',

    function EB(sqBuilderService) {
      return {
        scope: {
          data: '=sqBuilder',
        },

        templateUrl: 'ml-sq-builder/BuilderDirective.html',

        link: function(scope) {
          var data = scope.data;

          scope.filters = [];

          /**
           * Removes either group or rule
           */
          scope.removeChild = function(idx) {
            scope.filters.splice(idx, 1);
          };

          /**
           * Adds a single rule
           */
          scope.addRule = function() {
            scope.filters.push({});
          };

          /**
           * Adds a group of rules
           */
          scope.addGroup = function() {
            scope.filters.push({
              type: 'group',
              subType: 'and-query',
              rules: []
            });
          };

          scope.$watch('data.needsUpdate', function(curr) {
            if (! curr) return;

            scope.filters = sqBuilderService.toFilters(data.query, scope.data.fields);
            scope.data.needsUpdate = false;
          });

          scope.$watch('filters', function(curr) {
            if (! curr) return;

            data.query = sqBuilderService.toQuery(scope.filters, scope.data.fields);
          }, true);
        }
      };
    }
  ]);

  // Recursively decide whether to show a group or rule
  app.directive('sqBuilderChooser', [
    'RecursionHelper',
    'groupClassHelper',

    function sqBuilderChooser(RH, groupClassHelper) {
      return {
        scope: {
          sqFields: '=',
          sqParameters: '=',
          item: '=sqBuilderChooser',
          onRemove: '&',
        },

        templateUrl: 'ml-sq-builder/ChooserDirective.html',

        compile: function (element) {
          return RH.compile(element, function(scope, el, attrs) {
            var depth = scope.depth = (+ attrs.depth)
              , item = scope.item;

            scope.getGroupClassName = function() {
              var level = depth;
              if (item.type === 'group') level++;

              return groupClassHelper(level);
            };
          });
        }
      };
    }
  ]);

  app.directive('sqBuilderGroup', [
    'RecursionHelper',
    'groupClassHelper',

    function sqBuilderGroup(RH, groupClassHelper) {
      return {
        scope: {
          sqFields: '=',
          sqParameters: '=',
          group: '=sqBuilderGroup',
          onRemove: '&',
        },

        templateUrl: 'ml-sq-builder/GroupDirective.html',

        compile: function(element) {
          return RH.compile(element, function(scope, el, attrs) {
            var depth = scope.depth = (+ attrs.depth);
            var group = scope.group;

            scope.addRule = function() {
              group.rules.push({});
            };
            scope.addGroup = function() {
              group.rules.push({
                type: 'group',
                subType: 'and-query',
                rules: []
              });
            };

            scope.removeChild = function(idx) {
              group.rules.splice(idx, 1);
            };

            scope.getGroupClassName = function() {
              return groupClassHelper(depth + 1);
            };
          });
        }
      };
    }
  ]);

  app.directive('sqBuilderRule', [
    function sqBuilderRule() {
      return {
        scope: {
          sqFields: '=',
          sqParameters: '=',
          rule: '=sqBuilderRule',
          onRemove: '&',
        },

        templateUrl: 'ml-sq-builder/RuleDirective.html',

        link: function(scope) {
          scope.getType = function() {
            var fields = scope.sqFields
              , field = scope.rule.field;

            if (! fields || ! field) return;

            return fields[field].type;
          };
        }
      };
    }

  ]);

  // Determines which rule type should be displayed
  app.directive('sqType', [
    function() {
      return {
        scope: {
          type: '=sqType',
          rule: '=',
          guide: '=',
          parameters: '=',
        },

        template: '<ng-include src="getTemplateUrl()" />',

        link: function(scope) {
          scope.getTemplateUrl = function() {
            var type = scope.type;
            if (! type) return;

            type = type.charAt(0).toUpperCase() + type.slice(1);

            return 'ml-sq-builder/types/' + type + '.html';
          };

          // This is a weird hack to make sure these are numbers
          scope.booleans = [ 'False', 'True' ];
          scope.booleansOrder = [ 'True', 'False' ];

          scope.inputNeeded = function() {
            var needs = [
              'value-query',
              'word-query',
              'EQ',
              'NE',
              'GT',
              'GE',
              'LT',
              'LE'
            ];

            // A range query must either be backed by a 
            // range index or used in a filtered search 
            // operation.

            return ~needs.indexOf(scope.rule.subType);
          };
        },
      };
    }
  ]);

})(window.angular);

(function(angular) {
  'use strict';

  // keeps all of the groups colored correctly
  angular.module('ml-sq-builder')
    .factory('groupClassHelper', function groupClassHelper() {

      return function(level) {
        var levels = [
          '',
          'list-group-item-info',
          'list-group-item-success',
          'list-group-item-warning',
          'list-group-item-danger',
        ];

        return levels[level % levels.length];
      };
    });

})(window.angular);

(function(angular) {
  'use strict';

  // Convert filters into queries, and vice versa
  angular.module('ml-sq-builder')
    .factory('sqBuilderService', [
      function() {
        return {
          toFilters: toFilters,
          toQuery: toQuery,
        };
      }
    ]);

  function toFilters(query, fieldMap) {
    var filters = query.map(parseQueryGroup.bind(query, fieldMap));
    return filters;
  }

  function toQuery(filters, fieldMap) {
    var query = filters.map(parseFilterGroup.bind(filters, fieldMap)).filter(function(item) {
      return !! item;
    });
    return query;
  }

  function parseQueryGroup(fieldMap, group) {
    var typeMap = {
      'or-query': 'group',
      'and-query': 'group',
      'value-query': 'value',
      'word-query': 'word',
      'range-query': 'range'
    };

    // The group parameter is an element in the query array.
    var key = Object.keys(group)[0];
    var query = group[key];
    var type = typeMap[key];
    var obj = getFilterTemplate(type);

    switch (key) {
      case 'or-query':
      case 'and-query':
        obj.rules = group[key].queries.map(parseQueryGroup.bind(group, fieldMap));
        obj.subType = key;
        break;
      case 'value-query':
        obj.field = getConstraintName(query);
        obj.subType = key;

        var fieldData = fieldMap[obj.field];
        if (fieldData.type === 'boolean') {
          // group.text is true or false
          obj.value = query.text ? 1 : 0;
        } else {
          obj.value = query.text;
        }

        break;
      case 'word-query':
        obj.field = getConstraintName(query);
        obj.subType = key;
        obj.value = query.text;
        break;
      case 'range-query':
        if (query['path-index']) {
          obj.field = getConstraintName(query);
          obj.subType = 'value-query';
          obj.value = query.value;
        } else {
          obj.field = getConstraintName(query);
          obj.subType = query['range-operator'];
          obj.operator = obj.subType;
          obj.value = query.value;
        }
        break;
      default:
        throw new Error('unexpected query');
    }

    return obj;
  }

  function parseFilterGroup(fieldMap, group) {
    var obj = {};

    if (group.type === 'group') {
      obj[group.subType] = group.rules.map(parseFilterGroup.bind(group, fieldMap)).filter(function(item) {
        return !! item;
      });

      // The obj has only one property, its value is an array.
      // The key is equal to group.subType
      var key = Object.keys(obj)[0];
      var queries = {
        'queries': obj[key]
      };
      var queryObj = {};

      queryObj[key] = queries;

      return queryObj;
    }

    var fieldName = group.field;
    var fieldData = fieldMap[fieldName];

    if (! fieldName) return;

    switch (fieldData.type) {
      case 'string':
        // A query for a string field is translated 
        // to value-query or word-query or range-query.

        if (fieldData.classification === 'path-expression') {
          // Convert path rule to range-query
          var dataType = 'xs:' + fieldData.type;
          obj['range-query'] = {
            'path-index': {
              'text': fieldName,
              'namespaces': {}
            },
            'type': dataType,
            'range-operator': 'EQ',
            'value': group.value
          };
        } else {
          // Convert element or attribute rule to value-query/word-query
          // Set the default subType for newly created query
          if (!group.subType) {
            group.subType = 'value-query';
          }

          var value = {
            'text': group.value
          };

          setConstraint(value, fieldName, fieldData);

          obj[group.subType] = value;
        }

        break;
      case 'int':
      case 'long':
      case 'decimal':
        // A query for a numeric field is translated 
        // to range-query.
        // The type is the type of the range index.

        // Set the default subType for newly created query
        if (!group.subType) {
          group.subType = 'EQ';
        }

        var dataType = 'xs:' + fieldData.type;

        var value = {
          'type': dataType,
          'range-operator': group.subType,
          'value': group.value
        };

        setConstraint(value, fieldName, fieldData);

        if (fieldData.classification === 'path-expression') {
          value['path-index'] = {
            text: fieldName,
            namespaces: {}
          };
        }

        obj['range-query'] = value;

        break;
      case 'boolean':
        // A query for a boolean field is translated 
        // to value-query.
        // group.value is 1 or 0

        // Set the default value for newly created query
        if (group.value === undefined)
          group.value = 1;

        var value = {
          'text': group.value ? true : false
        };

        if (fieldData.classification === 'json-property') {
          value['type'] = 'boolean';
        }

        setConstraint(value, fieldName, fieldData);

        obj['value-query'] = value;

        break;
      case 'date':
        // TO DO
        break;

      default:
        throw new Error('unexpected field type');
    }

    return obj;
  }

  function getConstraintName(query) {
    if (query['json-property']) {
      return query['json-property'];
    } else if (query['attribute']) {
      return query['attribute']['name'];
    } else if (query['element']) {
      return query['element']['name'];
    } else if (query['field']) {
      return query['field']['name'];
    } else if (query['path-index']) {
      return query['path-index']['text']; 
    }
  }

  // You must specify at least one element, json-property, 
  // or field to define the range constraint to apply to 
  // the query. These components are mutually exclusive.
  function setConstraint(value, fieldName, fieldData) {
    var claz = fieldData.classification;

    if (claz === 'json-property') {
      value[claz] = fieldName;
    } else if (claz === 'element' || claz === 'attribute') {
      value[claz] = {
        name: fieldName,
        ns: fieldData.ns
      };
      if (claz === 'attribute') {
        value['element'] = {
          name: fieldData['parent-localname'],
          ns: fieldData['parent-namespace-uri']
        };
      }
    } else if (claz === 'field') {
      value[claz] = {
        name: fieldName,
        collation: fieldData.collation
      };
    }
  }

  function getFilterTemplate(type) {
    var templates = {
      group: {
        type: 'group',
        subType: '',
        rules: []
      },
      value: {
        field: '',
        subType: '',
        value: ''
      },
      word: {
        field: '',
        subType: '',
        value: ''
      },
      range: {
        field: '',
        subType: '',
        operator: '',
        value: null
      }
    };

    return angular.copy(templates[type]);
  }

})(window.angular);

(function(angular) {
  "use strict"; 

  angular.module("ml-sq-builder").run(["$templateCache", function($templateCache) {
    $templateCache.put("ml-sq-builder/BuilderDirective.html",
      "<div class=\"sq-builder\">" + 
      "  <div class=\"form-inline\">" +
      "    <p>If <select class=\"form-control\" data-ng-model=\"data.operation\">" + 
      "        <option value=\"and-query\">All</option>" + 
      "        <option value=\"or-query\">Any</option>" + 
      "      </select> of these conditions are met</p>" + 
      "  </div>" +
      "  <div class=\"filter-panels\">" + 
      "    <div class=\"list-group form-inline\">" + 
      "      <div data-ng-repeat=\"filter in filters\" data-sq-builder-chooser=\"filter\" data-sq-fields=\"data.fields\" data-sq-parameters=\"data.parameters\" data-on-remove=\"removeChild($index)\" data-depth=\"0\"></div>" + 
      "      <div class=\"list-group-item actions\">" +
      "        <a class=\"btn btn-xs btn-primary\" title=\"Add Rule\" data-ng-click=\"addRule()\">" + 
      "          <i class=\"fa fa-plus\"> Add Rule</i>" + 
      "        </a>" + 
      "        <a class=\"btn btn-xs btn-primary\" title=\"Add Group\" data-ng-click=\"addGroup()\">" + 
      "          <i class=\"fa fa-list\"> Add Group</i>" + 
      "        </a>" + 
      "      </div>" + 
      "    </div>" + 
      "  </div>" + 
      "</div>");

    $templateCache.put("ml-sq-builder/ChooserDirective.html",
      "<div class=\"list-group-item sq-builder-chooser\" data-ng-class=\"getGroupClassName()\">" + 
      "  <div data-ng-if=\"item.type === \'group\'\" data-sq-builder-group=\"item\" data-depth=\"{{ depth }}\" data-sq-fields=\"sqFields\" data-sq-parameters=\"sqParameters\" data-on-remove=\"onRemove()\"></div>" + 
      "  <div data-ng-if=\"item.type !== \'group\'\" data-sq-builder-rule=\"item\" data-sq-fields=\"sqFields\" data-sq-parameters=\"sqParameters\" data-on-remove=\"onRemove()\"></div>" + 
      "</div>");

    $templateCache.put("ml-sq-builder/GroupDirective.html",
      "<div class=\"sq-builder-group\">" +
      "  <h5>If" + 
      "    <select data-ng-model=\"group.subType\" class=\"form-control\">" + 
      "      <option value=\"and-query\">All</option>" + 
      "      <option value=\"or-query\">Any</option>" + 
      "    </select>" + 
      "    of these conditions are met" + 
      "  </h5>" + 
      "  <div data-ng-repeat=\"rule in group.rules\" data-sq-builder-chooser=\"rule\" data-sq-fields=\"sqFields\" data-sq-parameters=\"sqParameters\" data-depth=\"{{ +depth + 1 }}\" data-on-remove=\"removeChild($index)\"></div>" + 
      "  <div class=\"list-group-item actions\" data-ng-class=\"getGroupClassName()\">" + 
      "    <a class=\"btn btn-xs btn-primary\" title=\"Add Sub-Rule\" data-ng-click=\"addRule()\">" + 
      "      <i class=\"fa fa-plus\"> Add Rule</i>" + 
      "    </a>" + 
      "    <a class=\"btn btn-xs btn-primary\" title=\"Add Sub-Group\" data-ng-click=\"addGroup()\">" + 
      "      <i class=\"fa fa-list\"> Add Sub-Group</i>" + 
      "    </a>" + 
      "  </div>" + 
      "  <a class=\"btn btn-xs btn-danger remover\" data-ng-click=\"onRemove()\">" + 
      "    <i class=\"fa fa-minus\"></i>" + 
      "  </a>" + 
      "</div>");

    $templateCache.put("ml-sq-builder/RuleDirective.html",
      "<div class=\"sq-builder-rule\">" + 
      "  <select class=\"form-control\" data-ng-model=\"rule.field\" data-ng-options=\"key as key for (key, value) in sqFields\"></select>" + 
      "  <span data-sq-type=\"getType()\" data-rule=\"rule\" data-guide=\"sqFields[rule.field]\" data-parameters=\"sqParameters\"></span>" + 
      "  <a class=\"btn btn-xs btn-danger remover\" data-ng-click=\"onRemove()\">" + 
      "    <i class=\"fa fa-minus\"></i>" + 
      "  </a>" + 
      "</div>");

    $templateCache.put("ml-sq-builder/types/String.html",
      "<span class=\"string-rule\">" +
      "  <select data-ng-model=\"rule.subType\" class=\"form-control\">" +
      "    <optgroup label=\"Text\">" + 
      "      <option value=\"word-query\">Contains</option>" + 
      "      <option value=\"value-query\">Equals</option>" +  
      "    </optgroup>" + 
      "  </select>" + 
      "  <input data-ng-if=\"inputNeeded()\" class=\"form-control\" data-ng-model=\"rule.value\" type=\"text\" />" + 
      "  <select class=\"form-control\" ng-model=\"rule.value\">" + 
      "    <option ng-repeat=\"parameter in parameters\" value=\"#{{parameter.name}}#\">{{parameter.name}}</option>" + 
      "  </select>" + 
      "</span>");

    $templateCache.put("ml-sq-builder/types/Int.html",
      "<span class=\"integer-rule\">" + 
      "  <select data-ng-model=\"rule.subType\" class=\"form-control\">" +
      "    <optgroup label=\"Integer\">" + 
      "      <option value=\"EQ\">=</option>" + 
      "      <option value=\"NE\">!=</option>" + 
      "      <option value=\"GT\">&gt;</option>" + 
      "      <option value=\"GE\">&ge;</option>" + 
      "      <option value=\"LT\">&lt;</option>" + 
      "      <option value=\"LE\">&le;</option>" + 
      "    </optgroup>" + 
      "  </select>" + 
      "  <input data-ng-if=\"inputNeeded()\" class=\"form-control\" data-ng-model=\"rule.value\" type=\"text\" />" + 
      "  <select class=\"form-control\" ng-model=\"rule.value\">" + 
      "    <option ng-repeat=\"parameter in parameters\" value=\"#{{parameter.name}}#\">{{parameter.name}}</option>" + 
      "  </select>" + 
      "</span>");

    $templateCache.put("ml-sq-builder/types/Long.html",
      "<span class=\"integer-rule\">" + 
      "  <select data-ng-model=\"rule.subType\" class=\"form-control\">" +
      "    <optgroup label=\"Integer\">" + 
      "      <option value=\"EQ\">=</option>" + 
      "      <option value=\"NE\">!=</option>" + 
      "      <option value=\"GT\">&gt;</option>" + 
      "      <option value=\"GE\">&ge;</option>" + 
      "      <option value=\"LT\">&lt;</option>" + 
      "      <option value=\"LE\">&le;</option>" + 
      "    </optgroup>" + 
      "  </select>" + 
      "  <input data-ng-if=\"inputNeeded()\" class=\"form-control\" data-ng-model=\"rule.value\" type=\"text\" />" + 
      "  <select class=\"form-control\" ng-model=\"rule.value\">" + 
      "    <option ng-repeat=\"parameter in parameters\" value=\"#{{parameter.name}}#\">{{parameter.name}}</option>" + 
      "  </select>" + 
      "</span>");

    $templateCache.put("ml-sq-builder/types/Decimal.html",
      "<span class=\"decimal-rule\">" + 
      "  <select data-ng-model=\"rule.subType\" class=\"form-control\">" +
      "    <optgroup label=\"Decimal\">" + 
      "      <option value=\"EQ\">=</option>" + 
      "      <option value=\"NE\">!=</option>" + 
      "      <option value=\"GT\">&gt;</option>" + 
      "      <option value=\"GE\">&ge;</option>" + 
      "      <option value=\"LT\">&lt;</option>" + 
      "      <option value=\"LE\">&le;</option>" + 
      "    </optgroup>" + 
      "  </select>" + 
      "  <input data-ng-if=\"inputNeeded()\" class=\"form-control\" data-ng-model=\"rule.value\" type=\"text\" />" + 
      "  <select class=\"form-control\" ng-model=\"rule.value\">" + 
      "    <option ng-repeat=\"parameter in parameters\" value=\"#{{parameter.name}}#\">{{parameter.name}}</option>" + 
      "  </select>" + 
      "</span>");

    $templateCache.put("ml-sq-builder/types/Boolean.html",
      "<span class=\"boolean-rule\">Equals" +  
      "  <select data-ng-model=\"rule.value\" class=\"form-control\" data-ng-options=\"booleans.indexOf(choice) as choice for choice in booleansOrder\"></select>" +
      "</span>");

    $templateCache.put("ml-sq-builder/types/Date.html",
      "<span class=\"date-rule\">" + 
      "  <select data-ng-model=\"rule.subType\" class=\"form-control\">" + 
      "    <optgroup label=\"Date\">" + 
      "    </optgroup>" + 
      "  </select>" + 
      "</span>");
  }]);
})(window.angular);
