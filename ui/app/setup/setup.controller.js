(function() {
  'use strict';

  angular.module('app.setup')
    .controller('SetupCtrl', SetupCtrl);

  SetupCtrl.$inject = [
    '$uibModal', '$scope', '$timeout', 'ServerConfig',
    '$window', 'MLSearchFactory',
    'newGeospatialIndexDialog', 'editGeospatialIndexDialog',
    'newRangeIndexDialog', 'editRangeIndexDialog',
    'newLabelPartDialog', 'EditConstraintDialog',
    'fieldDialog',
    'EditChartConfigDialog',
    'CommonUtil', 'UIService'
  ];

  function SetupCtrl(
    $uibModal, $scope, $timeout, ServerConfig,
    win, searchFactory,
    newGeospatialIndexDialog, editGeospatialIndexDialog,
    newRangeIndexDialog, editRangeIndexDialog,
    newLabelPartDialog, EditConstraintDialog,
    fieldDialog,
    editChartConfigDialog,
    CommonUtil, UIService
  ) {
    var model = {
      uploadCollections: [],
      uploadType: 'file'
    };
    var mlSearch = searchFactory.newContext();

    $scope.decodeURIComponent = win.decodeURIComponent;

    function updateSearchResults() {
      $scope.error = null;
      return mlSearch.setPageLength(5).search().then(
        function(data) {
          model.isInErrorState = false;
          model.search = data;
        },
        function() {
          model.search = {};
          model.isInErrorState = true;
        });
    }

    function handleError(response) {
      $scope.error = response.data.message || response.data;
    }

    updateSearchResults();

    function init() {
      ServerConfig.get().then(function(config) {
        model.dataCollections = [];
        model.databaseName = config.databaseName;
        model.chartData = config.chartData;
        model.fields = config.fields;
        model.rangeIndexes = config.rangeIndexes;
        model.geospatialIndexes = config.geospatialIndexes;
        model.searchOptions = config.searchOptions;
        model.constraints = config.searchOptions.options.constraint;
        model.sortOptions = _.filter(
            config.searchOptions.options.operator,
            function(val) {
              return val.name === 'sort';
            }
          )[0];
        model.uiConfig = config.uiConfig;
        model.databaseOptions = config.databases;
        $scope.$emit('uiConfigChanged', model.uiConfig);
      });
    }
    init();

    angular.extend($scope, {
      model: model,
      constraintSortableOptions: {
        containment: '#constraint-table',
        containerPositioning: 'relative'
      },
      state: 'database',
      mlSearch: mlSearch,
      isInputDirSupported: function() {
        var tmpInput = document.createElement('input');
        if ('webkitdirectory' in tmpInput ||
            'mozdirectory' in tmpInput ||
             'odirectory' in tmpInput ||
             'msdirectory' in tmpInput ||
             'directory' in tmpInput) {
          return true;
        }

        return false;
      },
      setDatabase: function() {
        ServerConfig.setDatabase({
          'database-name': model.databaseName
        }).then(function() {
          $scope.error = null;
          init();
          updateSearchResults();
        }, handleError);
      },
      addDatabase: function() {
        $uibModal.open({
          template: '<div>' +
            '<div class="modal-header">' +
            '<button type="button" class="close" ng-click="$dismiss()">' +
            '<span aria-hidden="true">&times;</span>' +
            '<span class="sr-only">Close</span>' +
            '</button>' +
            '<h4 class="modal-title">Add Database</h4>' +
            '</div>' +
            '<div class="modal-body">' +
            '<form name="form">' +
            '<div class="form-group">' +
            '<label class="control-label">Database Name </label>&nbsp;' +
            '<input type="text" ng-model="dbName" />' +
            '</div>' +
            '<div class="clearfix">' +
            '<button type="button" class="btn btn-primary pull-right" ng-click="add()">' +
            'Add</button>' +
            '</div>' +
            '</form>' +
            '</div>' +
            '</div>',
          controller: ['$uibModalInstance', '$scope', function($uibModalInstance, $scope) {
            $scope.add = function() {
              if ($scope.dbName && $scope.dbName !== '') {
                $uibModalInstance.close($scope.dbName);
              }
            };
          }],
          size: 'sm'
        }).result.then(function(dbName) {
          model.databaseOptions.push(dbName);
          model.databaseOptions.sort(function(a, b) {
            return a.toLowerCase().localeCompare(b.toLowerCase());
          });
          model.databaseName = dbName;
        });
      },
      loadData: function() {
        var uploaderInput = document.getElementById(model.uploadType + 'Uploader');
        var allFiles = ServerConfig.arrangeFiles(uploaderInput.files);
        $scope.isUploading = true;
        $scope.currentFilesToUpload = allFiles.length;
        $scope.currentFilesUploaded = 0;
        ServerConfig.bulkUpload(allFiles, $scope.model.uploadCollections).then(function(data) {
            updateSearchResults().then(function() {
              $scope.state = 'appearance';
              $scope.redrawCharts();
            });
            $scope.isUploading = false;
            try {
              uploaderInput.value = '';
            } catch (e) {}
            $scope.currentFilesToUpload = 0;
            $scope.currentFilesUploaded = 0;
            $scope.model.uploadCollections.length = 0;
          }, handleError,
          function(updatedCount) {
            $scope.currentFilesUploaded = updatedCount;
          });
      },
      clearData: function() {
        ServerConfig.clearData().then(function(data) {
            updateSearchResults().then(function() {
              $scope.state = 'appearance';
              $scope.redrawCharts();
            });
          }, handleError);
      },
      removeCollection: function(index) {
        ServerConfig.removeDataCollection(model.dataCollections[index]).then(function() {
          model.dataCollections.splice(index, 1);
          updateSearchResults().then(function() {
            $scope.state = 'appearance';
            $scope.redrawCharts();
          });
        }, handleError);
      },
      clearLoadDataInfo: function() {
        $scope.loadDataInfo = null;
      },
      clearError: function() {
        $scope.error = null;
      },
      removeIndex: function(indexPosition) {
        model.rangeIndexes['range-index-list'].splice(indexPosition, 1);
        ServerConfig.setRangeIndexes(model.rangeIndexes).then(updateSearchResults, handleError);
      },
      editIndex: function(index) {
        editRangeIndexDialog(index).then(function(index) {
          if (index) {
            ServerConfig.setRangeIndexes(model.rangeIndexes).then(function() {
              ServerConfig.setFields(model.fields).then(updateSearchResults, handleError);
            }, handleError);
          }
        });
      },
      redrawCharts: function() {
        $timeout(function() { $scope.$broadcast('highchartsng.reflow'); });
      },
      editChart: function(eChart, index) {
        editChartConfigDialog(model.search.facets, eChart).then(function(chart) {
          model.chartData.charts[index] = chart;
          ServerConfig.setCharts(model.chartData).then(updateSearchResults, handleError);
        });
      },
      addChart: function() {
        editChartConfigDialog(model.search.facets).then(function(chart) {
          model.chartData.charts.push(chart);
          ServerConfig.setCharts(model.chartData).then(updateSearchResults, handleError);
        });
      },
      removeChart: function(chartPosition) {
        model.chartData.charts.splice(chartPosition, 1);
        ServerConfig.setCharts(model.chartData).then(updateSearchResults, handleError);
      },
      addIndex: function() {
        newRangeIndexDialog(model.fields['field-list']).then(function(index) {
          model.rangeIndexes['range-index-list'].push(index);
          ServerConfig.setRangeIndexes(model.rangeIndexes).then(function() {
            ServerConfig.setFields(model.fields).then(updateSearchResults, handleError);
          }, handleError);
        });
      },
      addGeospatialIndex: function() {
        newGeospatialIndexDialog().then(function(index) {
          model.geospatialIndexes['geospatial-index-list'].push(index);
          ServerConfig.setGeospatialIndexes(
            model.geospatialIndexes).then(updateSearchResults, handleError);
        });
      },
      editGeospatialIndex: function(gsIndex) {
        editGeospatialIndexDialog(gsIndex).then(function() {
          ServerConfig.setGeospatialIndexes(
            model.geospatialIndexes).then(updateSearchResults, handleError);
        });
      },
      removeGeospatialIndex: function(index) {
        model.geospatialIndexes['geospatial-index-list'].splice(index, 1);
        ServerConfig.setGeospatialIndexes(
          model.geospatialIndexes).then(updateSearchResults, handleError);
      },
      removeField: function(fieldPosition) {
        model.fields['field-list'].splice(fieldPosition, 1);
        ServerConfig.setFields(model.fields).then(updateSearchResults, handleError);
      },
      addField: function() {
        fieldDialog().then(function(field) {
          model.fields['field-list'].push(field);
          ServerConfig.setFields(model.fields).then(updateSearchResults, handleError);
        });
      },
      editField: function(field) {
        fieldDialog(field).then(function(field) {
          if (field) {
            ServerConfig.setFields(model.fields).then(updateSearchResults, handleError);
          }
        });
      },
      previewUiConfig: function() {
        UIService.setLayout(model.uiConfig);
      },
      setUiConfig: function() {
        UIService.setUIConfig(model.uiConfig)
          .then(
            function() {
              UIService.setLayout(model.uiConfig);
              updateSearchResults();
            }, handleError);
      },
      resetUiConfig: function() {
        model.uiConfig.logo = null;
        model.uiConfig.page = {};
        model.uiConfig.color = null;
        model.uiConfig.footer = {};

        UIService.setUIConfig(model.uiConfig)
          .then(
            function() {
              UIService.setLayout(model.uiConfig);
              updateSearchResults();
            }, handleError);
      },
      getUiConfig: function() {
        model.uiConfig = UIService.getUIConfig();
        return model.uiConfig;
      },
      previewImage: function(uiConfig, files) {
        var file = files[0];
        var reader  = new FileReader();

        reader.onloadend = function () {
          uiConfig.logo = uiConfig.logo || {};
          uiConfig.logo.image = reader.result;
          $scope.$apply();
        };

        if (file) {
          reader.readAsDataURL(file);
        } else {
          uiConfig.logo.image = '';
        }
      },
      removeLabelPart: function(index) {
        model.uiConfig['result-label'].splice(index, 1);
        $scope.setUiConfig();
      },
      addLabelPart: function() {
        newLabelPartDialog().then(function(part) {
          if (!model.uiConfig['result-label']) {
            model.uiConfig['result-label'] = [];
          }
          model.uiConfig['result-label'].push(part);
          $scope.setUiConfig();
        });
      },
      removeResultMetadata: function(index) {
        model.uiConfig['result-metadata'].splice(index, 1);
        $scope.setUiConfig();
      },
      addResultMetadata: function() {
        newLabelPartDialog(true).then(function(part) {
          if (!model.uiConfig['result-metadata']) {
            model.uiConfig['result-metadata'] = [];
          }
          model.uiConfig['result-metadata'].push(part);
          $scope.setUiConfig();
        });
      }
    });
  }
}());
