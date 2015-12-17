(function() {
  'use strict';

  angular.module('app.setup')
    .controller('SetupCtrl', SetupCtrl);

  SetupCtrl.$inject = [
    '$modal', '$scope', '$timeout', 'ServerConfig',
    '$window', 'MLSearchFactory',
    'newGeospatialIndexDialog', 'editGeospatialIndexDialog',
    'newRangeIndexDialog', 'editRangeIndexDialog',
    'fieldDialog',
    'EditChartConfigDialog'
  ];

  function SetupCtrl(
    $modal, $scope, $timeout, ServerConfig,
    win, searchFactory,
    newGeospatialIndexDialog, editGeospatialIndexDialog,
    newRangeIndexDialog, editRangeIndexDialog,
    fieldDialog,
    editChartConfigDialog
  ) {
    var model = {};
    var mlSearch = searchFactory.newContext();

    function updateSearchResults() {
      $scope.error = null;
      return mlSearch.setPageLength(5).search().then(
        function(data) {
          model.isInErrorState = false;
          model.search = data;
        },
        function() {
          model.isInErrorState = true;
        });
    }

    function handleError(response) {
      $scope.error = response.data.message || response.data;
    }

    function constructDefaultSourceOptions(inContraints, inDefaultSource) {
      var options = [];
      angular.forEach(inContraints, function(val) {
        if (val.range && val.range.type === 'xs:string') {
          var option = {
            name: val.name,
            value: val.name
          };
          options.push(option);
        }
      });
      return options;
    }

    function convertToOption(inDefaultSource) {
      var result = [];
      if (inDefaultSource && inDefaultSource.options['default-suggestion-source']) {
        var ref = inDefaultSource.options['default-suggestion-source'].ref;
        result.push(ref);
      }
      return result.join('|');
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
        model.defaultSource = convertToOption(config.searchOptions);
        model.uiConfig = config.uiConfig;
        model.suggestOptions = constructDefaultSourceOptions(
            model.constraints,
            model.defaultSource
          );
        model.databaseOptions = config.databases;
        $scope.$emit('uiConfigChanged', model.uiConfig);
      });
    }
    init();

    angular.extend($scope, {
      model: model,
      state: 'database',
      mlSearch: mlSearch,
      setDatabase: function() {
        ServerConfig.setDatabase({
          'database-name': model.databaseName
        }).then(function() {
          init();
        }, handleError);
      },
      addDatabase: function() {
        $modal.open({
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
            '<button type="button" class="btn btn-primary pull-right" ng-click="add()">Add</button>' +
            '</div>' +
            '</form>' +
            '</div>' +
            '</div>',
          controller: ['$modalInstance', '$scope', function($modalInstance, $scope) {
            $scope.add = function() {
              if ($scope.dbName && $scope.dbName !== '') {
                $modalInstance.close($scope.dbName);
              }
            };
          }],
          size: 'sm'
        }).result.then(function(dbName) {
          model.databaseOptions.push(dbName);
          model.databaseOptions.sort();
          model.databaseName = dbName;
        });
      },
      addConstraint: function() {
        model.constraints.push({
          'name': 'collection',
          'collection': {
            'facet': true,
            'prefix': null
          }
        });
      },
      loadData: function() {
        var uploaderInput = document.getElementById('directoryUploader');
        var allFiles = uploaderInput.files;
        $scope.isUploading = true;
        $scope.currentFilesToUpload = allFiles.length;
        $scope.currentFilesUploaded = 0;
        ServerConfig.bulkUpload(allFiles).then(function(data) {
            updateSearchResults().then(function() {
              $scope.state = 'appearance';
            });
            $scope.isUploading = false;
            try {
              uploaderInput.value = '';
            } catch (e) {}
            $scope.currentFilesToUpload = 0;
            $scope.currentFilesUploaded = 0;
          }, handleError,
          function(updatedCount) {
            $scope.currentFilesUploaded = updatedCount;
          });
      },
      removeCollection: function(index) {
        ServerConfig.removeDataCollection(model.dataCollections[index]).then(function() {
          model.dataCollections.splice(index, 1);
          updateSearchResults().then(function() {
            $scope.state = 'appearance';
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
            ServerConfig.setRangeIndexes(model.rangeIndexes).then(updateSearchResults, handleError);
          }
        });
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
          ServerConfig.setRangeIndexes(model.rangeIndexes).then(updateSearchResults, handleError);
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
      removeConstraint: function(index) {
        model.constraints.splice(index, 1);
      },
      submitConstraints: function() {
        model.searchOptions.options.constraint = model.constraints;
        ServerConfig.setSearchOptions(model.searchOptions).then(function() {
          updateSearchResults().then(function() {
            $scope.state = 'appearance';
          });
        }, handleError);
      },
      saveDefaultSource: function() {
        var chosenOption = model.defaultSource;
        model.searchOptions.options['default-suggestion-source'] = {
              'ref': chosenOption
            };
        model.searchOptions.options['suggestion-source'] = [];
        angular.forEach(model.searchOptions.options.constraint, function(constraint) {
          if (constraint.range && constraint.range.type === 'xs:string') {
            model.searchOptions.options['suggestion-source'].push({ ref: constraint.name});
          }
        });
        ServerConfig.setSearchOptions(model.searchOptions).then(updateSearchResults, handleError);
      },
      getDefaultSourceOpts: function() {
        model.suggestOptions = constructDefaultSourceOptions(
            model.searchOptions.options.constraint,
            model.defaultSource
          );
      },
      resampleConstraints: function() {
        model.constraints = [];
        angular.forEach(model.rangeIndexes['range-index-list'], function(val) {
          var value = val['range-element-index'] || val['range-element-attribute-index'] || val['range-field-index'] || val['range-path-index'];
          var name = value.localname || value['field-name'] || value['path-expression'];
          if (name && name !== '') {
            var constraint = {
              'name': name,
              'range': {
                'type': 'xs:' + value['scalar-type'],
                'facet': true,
                'facet-option': [
                  'limit=10',
                  'frequency-order',
                  'descending'
                ],
                'collation': value.collation
              }
            };
            if (value.localname) {
              constraint.range.element = {
                'name': (value['parent-localname'] || value.localname),
                'ns': (value['parent-namespace-uri'] || value['namespace-uri'])
              };
            }
            if (value['parent-localname']) {
              constraint.range.attribute = {
                'name': value.localname,
                'ns': value['namespace-uri']
              };
            }
            if (value['field-name']) {
              constraint.range.field = {
                'name': value['field-name'],
                'collation': value.collation
              };
            }
            model.constraints.push(constraint);
          }
        });
        angular.forEach(model.fields['field-list'], function(value) {
          if (value['field-name'] && value['field-name'] !== '') {
            var constraint = {
              'name': value['field-name'],
              'word': {
                'field': {
                  'name': value['field-name'],
                  'collation': value.collation
                }
              }
            };
            model.constraints.push(constraint);
          }
        });
      },
      setUiConfig: function() {
        ServerConfig.setUiConfig(model.uiConfig)
          .then(
            function() {
              updateSearchResults();
              $scope.$emit('uiConfigChanged', model.uiConfig);
            }, handleError);
      },
      getUiConfig: function() {
        model.uiConfig = ServerConfig.getUiConfig();
        return model.uiConfig;
      }
    });
  }
}());
