'use strict';

angular.module('app').controller('ReportRemoverCtrl', ['$rootScope', '$scope', '$stateParams', '$state', 'ReportService',
  function($rootScope, $scope, $stateParams, $state, ReportService) {

  $scope.report.uri = decodeURIComponent($stateParams.uri);

  $scope.deleteReport = function() {
    MarkLogic.Util.showLoader();

    ReportService.deleteReport($scope.report.uri).then(function(response) {
      MarkLogic.Util.hideLoader();
      $rootScope.$broadcast('ReportDeleted', $scope.report.uri);
      $state.go('root.analytics-dashboard.home');
    }, function(response) {
      alert(response);
    });
  };

  $scope.cancel = function() {
    $state.go('root.analytics-dashboard.home');
  };

}]);
