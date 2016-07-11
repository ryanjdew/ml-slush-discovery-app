(function() {
  'use strict';

  var module = angular.module('app.setup');


  module.controller('AddLabelPartCtrl', ['$uibModalInstance', '$scope', 'hasLabel', 'ServerConfig',
    function($uibModalInstance, $scope, hasLabel, ServerConfig) {
      $scope.hasLabel = hasLabel;
      $scope.part = {
              type: 'text',
              value: ''
            };
      $scope.path = '';
      $scope.node = {};
      $scope.add = function() {
        if ($scope.part.type === 'element' || $scope.part.type === 'attribute') {
          $scope.part.value = $scope.node.selectedNode;
        }
        if ($scope.part.type === 'path') {
          $scope.part.value = $scope.path;
        }
        $uibModalInstance.close($scope.part);
      };
    }
  ]);

  module.factory('newLabelPartDialog', [
    '$uibModal',
    function($uibModal) {
      return function(hasLabel) {
        return $uibModal.open({
          templateUrl: 'app/setup/dialogs/newLabelPart.html',
          controller: 'AddLabelPartCtrl',
          size: 'lg',
          resolve: {
            hasLabel: function() {
              return hasLabel;
            }
          }
        }).result;
      };
    }
  ]);

}());
