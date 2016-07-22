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
    'rangeIndexes', 'constraint', 'constraintType',
    function ($uibModalInstance, $scope, ServerConfig, rangeIndexes, constraint, constraintType) {
      $scope.constraintTypes = _.filter(Object.keys(constraint), function(val) {
            return val !== 'name' && val !== 'annotation' && constraint.hasOwnProperty(val);
          });
      $scope.rangeConstraintType = 'raw';
      $scope.rangeIndexes = [];
      angular.forEach(rangeIndexes, function(val) {
        var rootKey = Object.keys(val)[0];
        var copy = angular.copy(val[rootKey]);
        copy.$label =
          (copy['parent-localname'] ? copy['parent-localname'] + ' ' : '') +
          (copy.localname || copy['field-name'] || copy['path-index']);
        $scope.rangeIndexes.push(copy);
      });
      $scope.dataTypes = ServerConfig.dataTypes();
      $scope.constraintType = constraintType || 'collection';
      $scope.constraint = constraint;

      $scope.defaultRangeSettings = {
            'facet': true,
            'facet-option': [
                  'limit=10',
                  'frequency-order',
                  'descending'
                ]
          };

      function resetRangeConstraint() {
        $scope.constraint.range = {
          'facet':  $scope.constraint.range.facet || $scope.defaultRangeSettings.facet,
          'facet-option':
            $scope.constraint.range['facet-option'] || $scope.defaultRangeSettings['facet-option']
        };
      }

      if ($scope.constraintType === 'range' && $scope.constraint.range) {
        var rangeConstraint = $scope.constraint.range;
        $scope.selectedRangeIndex = _.filter($scope.rangeIndexes, function(val) {
          var matchedSelector = false;
          if (val['parent-localname'] && rangeConstraint.element) {
            matchedSelector = val['parent-localname'] === rangeConstraint.element.name;
          }
          if (val.localname && rangeConstraint.element && !rangeConstraint.attribute) {
            matchedSelector = val.localname === rangeConstraint.element.name;
          }
          if (val.localname && rangeConstraint.attribute) {
            matchedSelector = val.localname === rangeConstraint.attribute.name;
          }
          if (val['field-name'] && rangeConstraint.field) {
            matchedSelector = val['field-name'] === rangeConstraint.field.name;
          }
          if (val['path-index'] && rangeConstraint['path-index']) {
            matchedSelector = val['path-index'] === rangeConstraint['path-index'];
          }
          return
          'xs:' + val['scalar-type'] === $scope.constraint.range.type &&
           (val.collation === $scope.constraint.range.collation ||
            !(val.collation || $scope.constraint.range.collation)) &&
           matchedSelector;
        })[0];
        var computedBucket = rangeConstraint['computed-bucket'];
        var bucket = rangeConstraint.bucket;
        resetRangeConstraint();
        $scope['computed-bucket'] = computedBucket;
        $scope.constraint.range.bucket = bucket;
        if (bucket) {
          $scope.rangeConstraintType = 'bucket';
        } else if (computedBucket) {
          $scope.rangeConstraintType = 'computed-bucket';
        }
      }

      $scope.$watch(function() { return $scope.rangeConstraintType;}, function() {
        resetRangeConstraint();
        if ($scope.rangeConstraintType && $scope.rangeConstraintType !== 'raw') {
          $scope.constraint.range[$scope.rangeConstraintType] = [];
        }
      });

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
        if ($scope.constraintType === 'range') {
          var rangeIndex = $scope.selectedRangeIndex;
          var rangeConstraint = newConstraint[$scope.constraintType];
          rangeConstraint.type = 'xs:' + rangeIndex['scalar-type'];
          rangeConstraint.collation = rangeIndex.collation;
          if (rangeIndex.localname) {
            rangeConstraint.element = {
              'name': (rangeIndex['parent-localname'] || rangeIndex.localname),
              'ns': (rangeIndex['parent-namespace-uri'] || rangeIndex['namespace-uri'])
            };
          }
          if (rangeIndex['parent-localname']) {
            rangeConstraint.attribute = {
              'name': rangeIndex.localname,
              'ns': rangeIndex['namespace-uri']
            };
          }
          if (rangeIndex['field-name']) {
            rangeConstraint.field = {
              'name': rangeIndex['field-name'],
              'collation': rangeIndex.collation
            };
          }
        }
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
      return function (rangeIndexes, constraint) {
        var modalConstraint = angular.extend({}, {
                  'name': '',
                  'annotation': '',
                  'range': {},
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
              rangeIndexes: function() {
                return rangeIndexes;
              },
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
