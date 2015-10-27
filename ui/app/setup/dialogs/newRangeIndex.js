(function() {
  'use strict';

  var module = angular.module('app.setup');

  /**
   * @ngdoc controller
   * @kind constructor
   * @name AddIndexCtrl
   * @description
   * Controller for {@link loginDialog}. The controller is injected by the
   * $modal service. Provides a user interface for authenticating a user.
   * Upon instantiation the `loginDialogCtlr` creates an empty instance of
   * {@link ssSession} for handling authentication. See
   * <a href="http://angular-ui.github.io/bootstrap/"
   * target="_blank">ui.bootstrap.modal</a> for more information.
   *
   * @param {angular.Scope} $scope (injected)
   * @param {ui.bootstrap.modal.$modalInstance} $modalInstance (injected)
   * @param {object} ssSession Session object
   * @param {object} mlAuth Authentication object
   *
   * @property {string} $scope.error If present, indicates what error
   * occurred while attempting to authenticate a user.
   * @property {string} $scope.session.username The username input.
   * @property {string} $scope.session.password The password input.
   */
  module.controller('AddIndexCtrl', ['$modalInstance', '$scope', 'fields', 'ServerConfig',
    function($modalInstance, $scope, fields, ServerConfig) {
      $scope.indexType = 'element';
      $scope.fields = fields;
      $scope.dataTypes = ServerConfig.dataTypes();
      $scope.index = {
        scalarType: 'string',
        collation: 'http://marklogic.com/collation/'
      };
      $scope.add = function() {
        var selectedNode = $scope.index.selectedNode;
        if (selectedNode || ($scope.indexType === 'field' && $scope.field)) {
          var index = {},
            indexTypeToObjProperty = {
              element: 'range-element-index',
              attribute: 'range-element-attribute-index',
              field: 'range-field-index'
            },
            objProperty = indexTypeToObjProperty[$scope.indexType];
          index[objProperty] = {
            'range-value-positions': false,
            'invalid-values': 'ignore'
          };
          var subPart = index[objProperty];
          if ($scope.indexType === 'element' || $scope.indexType === 'attribute') {
            subPart.localname = selectedNode.attribute || selectedNode.element;
            subPart['namespace-uri'] = selectedNode.attributeNamespace ||
              selectedNode.elementNamespace;
          }
          if ($scope.indexType === 'attribute') {
            subPart['parent-localname'] = selectedNode.element;
            subPart['parent-namespace-uri'] = selectedNode.elementNamespace;
          }
          if ($scope.indexType === 'field') {
            subPart['field-name'] = $scope.field['field-name'];
          }
          subPart['scalar-type'] = $scope.index.scalarType;
          if (subPart['scalar-type'] === 'string') {
            subPart.collation = $scope.index.collation;
          }
          $modalInstance.close(index);
        }
      };
    }
  ]);

  /**
   * @ngdoc dialog
   * @name newRangeIndexDialog
   * @kind function
   * @description A UI Bootstrap component that provides a modal dialog for
   * adding a range index to the application.
   */
  module.factory('newRangeIndexDialog', [
    '$modal',
    function($modal) {
      return function(fields) {
        return $modal.open({
          templateUrl: '/ui/app/setup/dialogs/newRangeIndex.html',
          controller: 'AddIndexCtrl',
          size: 'lg',
          resolve: {
            fields: function() {
              return fields;
            }
          }
        }).result;
      };
    }
  ]);

}());
