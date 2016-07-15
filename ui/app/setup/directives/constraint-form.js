(function() {

  'use strict';

  angular.module('app.setup')
    .directive('constraintForm', [function() {
    function link(scope, element, attrs) {
      scope.type = function(val) {
        if (scope.constraintPropertyName === 'bucket' ||
            scope.constraintPropertyName === 'computed-bucket') {
          return scope.constraintPropertyName;
        } else if (val === true || val === false) {
          return 'boolean';
        } else if (angular.isArray(val)) {
          return 'array';
        } else if (angular.isObject(val)) {
          return 'object';
        } else {
          return 'string';
        }
      };
    }
    // directive factory creates a link function
    return {
      restrict: 'E',
      templateUrl: 'app/setup/directives/constraint-form.html',
      scope: {
        'constraintObject': '=',
        'constraintPropertyName': '=',
        'constraintProperty': '='
      },
      link: link
    };
  }]);
}());
