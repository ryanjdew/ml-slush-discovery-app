(function() {
  'use strict';

  var module = angular.module('app.setup');

  /**
   * @ngdoc controller
   * @kind constructor
   * @name EditFieldCtrl
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
  module.controller('FieldCtrl', ['$uibModalInstance', '$scope', 'field', function ($uibModalInstance, $scope, field) {
      $scope.field = field;
      $scope.save = function () {
        $uibModalInstance.close($scope.field);
      };
    }]);

  /**
   * @ngdoc dialog
   * @name editFieldDialog
   * @kind function
   * @description A UI Bootstrap component that provides a modal dialog for
   * adding a range index to the application.
   */
  module.factory('fieldDialog', [
    '$uibModal',
    function ($uibModal) {
      return function (field) {
        field = field || {
            'field-name': '',
            'include-root': false,
            'word-lexicon': ['http://marklogic.com/collation/'],
            'included-element': [],
            'excluded-element': []
          };
        return $uibModal.open({
            templateUrl: 'app/setup/dialogs/field.html',
            controller: 'FieldCtrl',
            size: 'lg',
            resolve: {
              field: function() {
                field['included-element'] = field['included-element'] || [];
                field['excluded-element'] = field['excluded-element'] || [];
                return field;
              }
            }
          }).result;
      };
    }
  ]);

}());
