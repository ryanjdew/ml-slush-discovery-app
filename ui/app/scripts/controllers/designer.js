'use strict';

angular.module('app').controller('ReportDesignerCtrl', ['$scope', '$stateParams', '$interval', 'ReportData', 'ReportService', 'WidgetDefinitions',
  function($scope, $stateParams, $interval, ReportData, ReportService, WidgetDefinitions) {

  var store = {};
  var storage = {
    getItem : function(key) {
      return store[key];
    },
    setItem : function(key, value) {
      store[key] = value;

      $scope.report.widgets = value.widgets;
      $scope.saveWidgets();
    },
    removeItem : function(key) {
      delete store[key];
    }
  };

  $scope.report = {};
  $scope.report.uri = decodeURIComponent($stateParams.uri);
  angular.extend($scope.report, ReportData.data);

  var defaultWidgets = null;
  if ($scope.report.widgets) {
    defaultWidgets = _.map($scope.report.widgets, function(widget) {
      return {
        name: widget.name,
        title: widget.title,
        attrs: widget.attrs,
        style: widget.size,
        dataModelOptions: widget.dataModelOptions
      };
    });
  } else {
    defaultWidgets = [];
  }

  $scope.reportDashboardOptions = {
    widgetButtons: true,
    widgetDefinitions: WidgetDefinitions,
    defaultWidgets: defaultWidgets,
    hideToolbar: false,
    hideWidgetName: true,
    explicitSave: false,
    stringifyStorage: false,
    storage: storage,
    storageId: $scope.report.uri
  };

  ReportService.setDashboardOptions($scope.reportDashboardOptions);

  $scope.percentage = 5;
  $interval(function () {
    $scope.percentage = ($scope.percentage + 10) % 100;
  }, 1000);

  // external controls
  $scope.addWidget = function(directive) {
    $scope.dashboardOptions.addWidget({
      name: directive
    });
  };

  $scope.$on('widgetAdded', function(event, widget) {
    event.stopPropagation();
  });

  $scope.saveWidgets = function() {
    MarkLogic.Util.showLoader();
    ReportService.updateReport($scope.report).then(function(response) {
      MarkLogic.Util.hideLoader();
    });
  };

}]);
