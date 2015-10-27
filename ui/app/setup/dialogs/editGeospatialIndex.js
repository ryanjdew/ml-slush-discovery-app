(function() {
  'use strict';

  var module = angular.module('app.setup');

  /**
   * @ngdoc controller
   * @kind constructor
   * @name EditIndexCtrl
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
  module.controller('EditIndexCtrl', ['$modalInstance', '$scope', 'ServerConfig', 'index', 'indexType', function ($modalInstance, $scope, ServerConfig, index, indexType) {
      $scope.indexType = indexType;
      $scope.index = index;
      $scope.save = function () {
        $modalInstance.close($scope.index);
      };
    }]);

  /**
   * @ngdoc dialog
   * @name newRangeIndexDialog
   * @kind function
   * @description A UI Bootstrap component that provides a modal dialog for
   * adding a range index to the application.
   */
  module.factory('editGeospatialIndexDialog', [
    '$modal',
    function ($modal) {
      return function (index) {
        var indexValue,
            indexType;
        angular.forEach(index, function(val, keyName){
          if (keyName === 'geospatial-element-index' || keyName === 'geospatial-element-pair-index' || keyName === 'geospatial-element-attribute-pair-index') {
            indexType = keyName;
            indexValue = val;
          }
        });
        return $modal.open({
            templateUrl: 'app/setup/dialogs/editGeospatialIndex.html',
            controller: 'EditIndexCtrl',
            size: 'lg',
            resolve: {
              index: function() {
                return indexValue;
              },
              indexType: function() {
                return indexType;
              }
            }
          }).result;
      };
    }
  ]);

}());
