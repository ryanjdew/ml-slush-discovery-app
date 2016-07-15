(function() {
  'use strict';

  var module = angular.module('app.setup');

  /**
   * @ngdoc controller
   * @kind constructor
   * @name EditConstraintCtrl
   * @description
   */
  module.controller('EditConstraintCtrl', [
    '$uibModalInstance', '$scope', 'ServerConfig',
    'constraint', 'constraintType',
    function ($uibModalInstance, $scope, ServerConfig, constraint, constraintType) {
      $scope.constraintTypes = _.filter(Object.keys(constraint), function(val) {
            return val !== 'name' && val !== 'annotation' && constraint.hasOwnProperty(val);
          });
      $scope.dataTypes = ServerConfig.dataTypes();
      $scope.constraintType = constraintType || 'collection';
      $scope.constraint = constraint;
      $scope.save = function () {
        var newConstraint = {
          name: $scope.constraint.name,
          annotation: $scope.constraint.annotation
        };
        var constraintDetails = $scope.constraint[$scope.constraintType];
        if (constraintDetails.field && !constraintDetails.field.name) {
          delete constraintDetails.field;
        }
        if (constraintDetails.attribute && !constraintDetails.attribute.name) {
          delete constraintDetails.attribute;
        }
        if (!constraintDetails['json-property'] || constraintDetails['json-property'] === '') {
          delete constraintDetails['json-property'];
        }
        if (!constraintDetails['path-index'] || constraintDetails['path-index'] === '') {
          delete constraintDetails['path-index'];
        }
        if (constraintDetails.bucket && !constraintDetails.bucket.length) {
          delete constraintDetails.bucket;
        }
        if (constraintDetails['computed-bucket'] && !constraintDetails['computed-bucket'].length) {
          delete constraintDetails['computed-bucket'];
        }
        if (constraintDetails.collation || constraintDetails.type !== 'xs:string') {
          delete constraintDetails.collation;
        }
        angular.forEach(constraintDetails, function(val, key) {
          if (/^\$/.test(key)) {
            delete constraintDetails[key];
          }
        });
        newConstraint[$scope.constraintType] = constraintDetails;
        $uibModalInstance.close(newConstraint);
      };
    }]);

  /**
   * @ngdoc dialog
   * @name EditConstraintDialog
   * @kind function
   * @description A UI Bootstrap component that provides a modal dialog for
   * adding a constraint to the application.
   */
  module.factory('EditConstraintDialog', [
    '$uibModal',
    function ($uibModal) {
      return function (constraint) {
        var modalConstraint = angular.extend({}, {
                  'name': '',
                  'annotation': '',
                  'range': {
                    'type': '',
                    'collation' : 'http://marklogic.com/collation/',
                    'facet': false,
                    'element': {
                      'ns': '',
                      'name': ''
                    },
                    'attribute': {
                      'ns': '',
                      'name': ''
                    },
                    'field': {'name': ''},
                    'json-property': '',
                    'path-index': '',
                    'bucket': [],
                    'computed-bucket': [],
                    'facet-option' : [],
                    'range-option': [],
                    'fragment-scope': 'documents'
                  },
                  'value': {
                    'type': null,
                    'element': {
                      'ns': '',
                      'name': ''
                    },
                    'attribute': {
                      'ns': '',
                      'name': ''
                    },
                    'json-property': '',
                    'field': {'name': ''},
                    'fragment-scope': 'documents',
                    'term-option': []
                  },
                  'collection': {
                    'prefix': '',
                    'facet-option': [],
                    'facet': false
                  },
                  'custom': {
                    'facet': false,
                    'parse': {
                      'apply': '',
                      'ns': '',
                      'at': ''
                    },
                    'start-facet': {
                      'apply': '',
                      'ns': '',
                      'at': ''
                    },
                    'finish-facet': {
                      'apply': '',
                      'ns': '',
                      'at': ''
                    },
                    'facet-option': [],
                    'term-option': []
                  }
                }, constraint || {});
        var constraintType =
          angular.isObject(constraint) ? _.filter(Object.keys(constraint), function(val) {
            return val !== 'name' && val !== 'annotation' && constraint.hasOwnProperty(val);
          })[0] : null;
        return $uibModal.open({
            templateUrl: 'app/setup/dialogs/editConstraint.html',
            controller: 'EditConstraintCtrl',
            size: 'lg',
            resolve: {
              constraint: function() {
                return modalConstraint;
              },
              constraintType: function() {
                return constraintType || 'collection';
              }
            }
          }).result;
      };
    }
  ]);

}());
