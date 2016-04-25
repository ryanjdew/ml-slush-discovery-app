(function() {
  'use strict';

  var module = angular.module('app.setup');

  /**
   * @ngdoc controller
   * @kind constructor
   * @name AddIndexCtrl
   * @description
   * Controller for {@link loginDialog}. The controller is injected by the
   * $uibModal service. Provides a user interface for authenticating a user.
   * Upon instantiation the `loginDialogCtlr` creates an empty instance of
   * {@link ssSession} for handling authentication. See
   * <a href="http://angular-ui.github.io/bootstrap/"
   * target="_blank">ui.bootstrap.modal</a> for more information.
   *
   * @param {angular.Scope} $scope (injected)
   * @param {ui.bootstrap.modal.$uibModalInstance} $uibModalInstance (injected)
   * @param {object} ssSession Session object
   * @param {object} mlAuth Authentication object
   *
   * @property {string} $scope.error If present, indicates what error
   * occurred while attempting to authenticate a user.
   * @property {string} $scope.session.username The username input.
   * @property {string} $scope.session.password The password input.
   */
  module.controller('AddGeospatialIndexCtrl', ['$uibModalInstance', '$scope', function($uibModalInstance, $scope) {
    $scope.indexType = 'gespatial-element-index';
    $scope.index = {};
    $scope.add = function() {
      var index = {};
      index[$scope.indexType] = {
        'coordinate-system': 'wgs84',
        'range-value-positions': true,
        'invalid-values': 'ignore'
      };
      var subPart = index[$scope.indexType];
      if ($scope.indexType === 'geospatial-element-pair-index') {
        subPart['parent-localname'] = $scope.index['parent-localname'];
        subPart['parent-namespace-uri'] = $scope.index['parent-namespace-uri'] || '';
        subPart['latitude-localname'] = $scope.index['parent-localname'];
        subPart['latitude-namespace-uri'] = $scope.index['parent-namespace-uri'] || '';
        subPart['longitude-localname'] = $scope.index['parent-localname'];
        subPart['longitude-namespace-uri'] = $scope.index['parent-namespace-uri'] || '';
      } else if ($scope.indexType === 'geospatial-element-index') {
        subPart.localname = $scope.index.localname;
        subPart['namespace-uri'] = $scope.index['namespace-uri'] || '';
        subPart['point-format'] = $scope.index['point-format'];
      }
      subPart['coordinate-system'] = $scope.index['coordinate-system'];
      $uibModalInstance.close(index);
    };
  }]);

  /**
   * @ngdoc dialog
   * @name newGeospatialIndexDialog
   * @kind function
   * @description A UI Bootstrap component that provides a modal dialog for
   * adding a geospatial index to the application.
   */
  module.factory('newGeospatialIndexDialog', [
    '$uibModal',
    function($uibModal) {
      return function() {
        return $uibModal.open({
          templateUrl: 'app/setup/dialogs/newGeospatialIndex.html',
          controller: 'AddGeospatialIndexCtrl',
          size: 'lg'
        }).result;
      };
    }
  ]);

}());
