/**
 * ml-index-builder
 *
 * Angular Module for building MarkLogic indexes
 */

(function(angular) {
  'use strict';

  angular.module('ml-index-builder', []);

})(window.angular);

(function(angular) {
  'use strict';

  var app = angular.module('ml-index-builder');

  app.directive('indexBuilder', ['indexBuilderService',
    function DB(indexBuilderService) {
      return {
        scope: {
          data: '=indexBuilder',
        },

        templateUrl: 'ml-index-builder/BuilderDirective.html',

        link: function(scope) {
          var data = scope.data;

          scope.facets = [];

          /**
           * Removes an index
           */
          scope.removeIndex = function(idx) {
            scope.facets.splice(idx, 1);
          };

          /**
           * Adds an index
           */
          scope.addIndex = function() {
            scope.facets.push({});
          };

          scope.$watch('data.needsRefresh', function(curr) {
            if (! curr) return;

            scope.facets = indexBuilderService.toFacets(data.indexes, scope.data.fields);
            scope.data.needsRefresh = false;
          });

          scope.$watch('facets', function(curr) {
            if (! curr) return;

            data.indexes = indexBuilderService.toIndexes(scope.facets, scope.data.fields);
          }, true);
        }
      };
    }
  ]);

  app.directive('indexBuilderChooser', [
    function indexBuilderChooser() {
      return {
        scope: {
          indexFields: '=',
          item: '=indexBuilderChooser',
          onRemove: '&',
        },

        templateUrl: 'ml-index-builder/ChooserDirective.html'
      };
    }
  ]);

  app.directive('indexBuilderRule', [
    function indexBuilderRule() {
      return {
        scope: {
          indexFields: '=',
          rule: '=indexBuilderRule',
          onRemove: '&',
        },

        templateUrl: 'ml-index-builder/RuleDirective.html',

        link: function(scope) {
          scope.getType = function() {
            var fields = scope.indexFields
              , field = scope.rule.field;

            if (! fields || ! field) return;

            return fields[field].type;
          };
        }
      };
    }
  ]);

  // Determines which Rule type should be displayed
  app.directive('indexType', [
    function indexType() {
      return {
        scope: {
          type: '=indexType',
          rule: '=',
          guide: '=',
        },

        template: '<ng-include src="getTemplateUrl()" />',

        link: function(scope) {
          scope.getTemplateUrl = function() {
            var type = scope.type;
            if (! type) return;

            type = type.charAt(0).toUpperCase() + type.slice(1);

            return 'ml-index-builder/types/' + type + '.html';
          };

          scope.inputNeeded = function() {
            // None of these requires an input.
            var needs = [
              'int',
              'unsignedInt',
              'long',
              'unsignedLong',
              'float',
              'double',
              'decimal' ,
              'dateTime',
              'time',
              'date',
              'gYearMonth',
              'gYear',
              'gMonth',
              'gDay',
              'yearMonthDuration',
              'dayTimeDuration',
              'string',
              'anyURI'
            ];

            return ~needs.indexOf(scope.rule.operation);
          };
        },
      };
    }
  ]);

})(window.angular);

/**
 * Convert facets into indexes, and vice versa
 */

(function(angular) {
  'use strict';

  angular.module('ml-index-builder')
    .factory('indexBuilderService', [
      function() {
        return {
          toFacets: toFacets,
          toIndexes: toIndexes,
        };
      }
    ]);

  function toFacets(indexes, fieldMap) {
    var facets = indexes.map(parseIndexGroup.bind(indexes, fieldMap));
    return facets;
  }

  function toIndexes(facets, fieldMap) {
    var indexes = facets.map(parseFacetGroup.bind(facets, fieldMap)).filter(function(item) {
      return !! item;
    });
    return indexes;
  }

  function parseIndexGroup(fieldMap, group, truthy) {
    if (truthy !== false) truthy = true;

    var operation = Object.keys(group)[0];
    var obj = getIndexTemplate('item');

    // scalar type
    switch (operation) {
      case 'int':
      case 'unsignedInt':
      case 'long':
      case 'unsignedLong':
      case 'float':
      case 'double':
      case 'decimal':
      case 'dateTime':
      case 'time':
      case 'date':
      case 'gYearMonth':
      case 'gYear':
      case 'gMonth':
      case 'gDay':
      case 'yearMonthDuration':
      case 'dayTimeDuration':
      case 'string':
      case 'anyURI':
        obj.field = group[operation].field;
        obj.operation = operation;
        obj.value = group[operation].value;
        break;
      default:
        obj.field = Object.keys(group[operation])[0];
        break;
    }

    return obj;
  }

  function parseFacetGroup(fieldMap, group) {
    var obj = {};

    if (group.type === 'group') {
      obj[group.operation] = group.rules.map(parseFacetGroup.bind(group, fieldMap)).filter(function(item) {
        return !! item;
      });
      return obj;
    }

    var fieldName = group.field;
    var fieldData = fieldMap[fieldName];

    if (! fieldName) return;

    switch (fieldData.type) {
      case 'element':
        if (! group.operation) return;

        obj[group.operation] = {};
        obj[group.operation].field = fieldName;
        obj[group.operation].value = group.value;
        break;

      default:
        throw new Error('unexpected type');
    }

    return obj;
  }

  function getIndexTemplate(type) {
    var templates = {
      item: {
        field: '',
        operation: '',
        value: ''
      }
    };

    return angular.copy(templates[type]);
  }

})(window.angular);

(function(angular) {
  "use strict"; 

  angular.module("ml-index-builder").run(["$templateCache", function($templateCache) {
    $templateCache.put("ml-index-builder/BuilderDirective.html", 
      "<div class=\"index-builder\">" +
      "  <div class=\"filter-panels\">" +
      "    <div class=\"list-group form-inline\">" +
      "      <div data-ng-repeat=\"facet in facets\" data-index-builder-chooser=\"facet\" data-index-fields=\"data.fields\" data-on-remove=\"removeIndex($index)\" data-depth=\"0\"></div>" +
      "      <div class=\"list-group-item actions\">" +
      "        <a class=\"btn btn-xs btn-primary\" title=\"Add Index\" data-ng-click=\"addIndex()\">" +
      "          <i class=\"fa fa-plus\"> Add Index</i>" +
      "        </a>" +
      "     </div>" +
      "    </div>" +
      "  </div>" +
      "</div>");

    $templateCache.put("ml-index-builder/ChooserDirective.html", 
      "<div class=\"list-group-item index-builder-chooser\">" +
      "  <div data-index-builder-rule=\"item\" data-index-fields=\"indexFields\" data-on-remove=\"onRemove()\"></div>" +
      "</div>");

    $templateCache.put("ml-index-builder/RuleDirective.html", 
      "<div class=\"index-builder-rule\">" +
      "  <select class=\"form-control\" data-ng-model=\"rule.field\" data-ng-options=\"key as key for (key, value) in indexFields\"></select>" +
      "  <span data-index-type=\"getType()\" data-rule=\"rule\" data-guide=\"indexFields[rule.field]\"></span>" +
      "  <a class=\"btn btn-xs btn-danger remover\" data-ng-click=\"onRemove()\">" +
      "    <i class=\"fa fa-minus\"></i>" +
      "  </a>" +
      "</div>");

    // Element Range Index type
    $templateCache.put("ml-index-builder/types/Element.html", 
      "<span class=\"element-rule\">" +
      "  <select data-ng-model=\"rule.operation\" class=\"form-control\">" +
      "    <optgroup label=\"Scalar Type\">" +
      "      <option value=\"int\">int</option>" + 
      "      <option value=\"unsignedInt\">unsignedInt</option>" + 
      "      <option value=\"long\">long</option>" + 
      "      <option value=\"unsignedLong\">unsignedLong</option>" + 
      "      <option value=\"float\">float</option>" + 
      "      <option value=\"double\">double</option>" + 
      "      <option value=\"decimal\">decimal</option>" + 
      "      <option value=\"dateTime\">dateTime</option>" + 
      "      <option value=\"time\">time</option>" + 
      "      <option value=\"date\">date</option>" + 
      "      <option value=\"gYearMonth\">gYearMonth</option>" + 
      "      <option value=\"gYear\">gYear</option>" + 
      "      <option value=\"gMonth\">gMonth</option>" + 
      "      <option value=\"gDay\">gDay</option>" + 
      "      <option value=\"yearMonthDuration\">yearMonthDuration</option>" +
      "      <option value=\"dayTimeDuration\">dayTimeDuration</option>" + 
      "      <option value=\"string\">string</option>" + 
      "      <option value=\"anyURI\">anyURI</option>" +  
      "    </optgroup>" + 
      "  </select>" + 
      "  <input data-ng-if=\"inputNeeded()\" class=\"form-control\" data-ng-model=\"rule.value\" type=\"text\" placeholder=\"namespace uri\" />" + 
      "</span>");
  }]);
})(window.angular);
