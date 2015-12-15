/*
 * Copyright (c) 2015 MarkLogic Corporation. ALL Rights Reserved.
 */

(function(angular) {
  'use strict';

  angular.module('ml.report', ['ml-dimension-builder', 'ml-sq-builder']);

})(window.angular);

(function(angular) {
  'use strict';

  angular.module('ml.report')
    .factory('mlReportService', [
      function() {
        return {
          getDirectiveTemplate: getDirectiveTemplate
        };
      }
    ]);

  function getDirectiveTemplate(mode, name) {
    var dmt = 'app/widgets/template/' + name + '/design-mode.html';
    var vmt = 'app/widgets/template/' + name + '/view-mode.html';
    var template = '';

    if (mode) {
      mode = mode.toLowerCase();
      if (mode === 'design') {
        template = dmt;
      } else if (mode === 'view') {
        template = vmt;
      }
    } else {
      template = vmt;
    }

    return template;
  }

})(window.angular);

(function(angular) {
  'use strict';

  angular.module('ml.report')
    .factory('SmartGridDataModel', ['WidgetDataModel', '$http',
      function(WidgetDataModel, $http) {
        function SmartGridDataModel() {
        }

        SmartGridDataModel.prototype = Object.create(WidgetDataModel.prototype);

        SmartGridDataModel.prototype.init = function() {
          WidgetDataModel.prototype.init.call(this);
          this.load();
        };

        SmartGridDataModel.prototype.load = function() {
          //console.log(this);
        };

        return SmartGridDataModel;
      }
    ]);

})(window.angular);

  function setModalMaxHeight(element) {
    var ele = $(element);
    var dialogMargin  = $(window).width() > 767 ? 62 : 22;
    var contentHeight = $(window).height() - dialogMargin;
    var headerHeight  = ele.find('.modal-header').outerHeight() || 2;
    var footerHeight  = ele.find('.modal-footer').outerHeight() || 2;
    var maxHeight     = contentHeight - (headerHeight + footerHeight);

    ele.find('.modal-content').css({
      'overflow': 'hidden'
    });

    ele.find('.modal-body').css({
      'max-height': maxHeight,
      'overflow-y': 'auto'
    });

    ele.find('#query-editor').css({
      'height': maxHeight-220
    });
  }

  var modalCallbackRegistered = false;

  function registerModalCallback() {
    if (modalCallbackRegistered) return;

    $('.modal').on('show.bs.modal', function() {
      $(this).show();
      setModalMaxHeight(this);
    });

    modalCallbackRegistered = true;
  }

  $(window).resize(function() {
    if ($('.modal.in').length != 0) {
      setModalMaxHeight($('.modal.in'));
    }
  });

angular.module('ml.report').directive('mlSmartGrid', ['$compile', 'MLRest', 'mlReportService', 'NgTableParams',
  function($compile, mlRest, mlReportService, NgTableParams) {

  return {
    restrict: 'A',
    replace: false,
    template: '<div ng-include="contentUrl"></div>',
    controller: function($scope, $http, $q, $filter) {
      // Set the initial mode for this widget to View.
      $scope.showModeButton = true;
      $scope.widget.mode = 'View';

/*
      $scope.data.fields = {
        'state': {type: 'string', classification: 'json-property'},
        'city': {type: 'string', classification: 'element', ns: 'claim-ns'},
        'payor': {type: 'string', classification: 'field', collation: 'claim-collation'},
        'payment': {type: 'number', classification: 'element', ns: '', minimum: 10, maximum: 900},
        'paid': {type: 'boolean', classification: 'json-property', ns: '', }
      };
*/
      $scope.model = {
        queryConfig: null,
        queryError: null,
        config: null,
        configError: null,
        results: null,
        includeFrequency: false,
        loadingConfig: false,
        loadingResults: false,
        groupingStrategy: 'root',
        showBuilder: false
      };

      if ($scope.widget.dataModelOptions.groupingStrategy) {
        $scope.model.groupingStrategy = $scope.widget.dataModelOptions.groupingStrategy;
      }

      $scope.deferredAbort = null;

      $scope.data = {};
      $scope.data.docs = [];
      $scope.data.fields = {};
      $scope.data.operation = 'and-query';
      $scope.data.query = [];
      $scope.data.dimensions = [];
      $scope.data.needsUpdate = true;
      $scope.data.needsRefresh = true;
      $scope.data.directory = $scope.widget.dataModelOptions.directory;
      $scope.data.directory_model = null;
      $scope.data.parameters = $scope.widget.dataModelOptions.parameters;

      $scope.executor = {};
      $scope.executor.transform = 'smart-filter';
      $scope.executor.disableRun = true;
      $scope.executor.disableDownload = true;

      $scope.highchart = null;

      $scope.grid = {
        page: 1,
        total: 0
      };

      $scope.showDimensions = function() {
        var dimensions = {
          dimensions: $scope.data.dimensions
        };
        return JSON.stringify(dimensions, null, 2);
      };

      $scope.showQuery = function() {
        var query = $scope.getStructuredQuery();
        return JSON.stringify(query, null, 2);
      };

      $scope.getStructuredQuery = function() {
        var query = {
          'query': {
            "queries": []
          }
        };
        var rootQuery = {};
        rootQuery[$scope.data.operation] = {'queries': $scope.data.query};

        query['query']['queries'].push(rootQuery);

        return query;
      };

      $scope.clearResults = function() {
        $scope.model.results = null;
        $scope.executor.dimensions = [];
        $scope.executor.results = [];
        $scope.executor.disableDownload = true;

        if ($scope.highchart) {
          $scope.highchart.highcharts().destroy();
          $scope.highchart = null;
        }
      };

      $scope.getDbConfig = function() {
        var params = {
          'rs:strategy': $scope.model.groupingStrategy
        };

        $scope.model.showBuilder = false;
        $scope.model.loadingConfig = true;

        if ($scope.model.config) {
          params['rs:database'] = $scope.model.config['current-database'];
        } else if ($scope.widget.dataModelOptions.database) {
          params['rs:database'] = $scope.widget.dataModelOptions.database;
        }

        $scope.clearResults();
        $scope.model.includeFrequency = false;
        // $scope.model.config = null;
        $scope.model.queryConfig = {
          'result-type': 'group-by',
          rows: [],
          columns: [],
          computes: [],
          options: ['headers=true'],
          filters: {}
        };

        $scope.data.docs = [];
        $scope.data.fields = {};

        $http.get('/v1/resources/index-discovery', {
          params: params
        }).then(function(response) {
          $scope.model.loadingConfig = false;

          if (response.data.errorResponse) {
            $scope.model.configError = response.data.errorResponse.message;
            return;
          }

          $scope.model.config = response.data;

          var docsExist = !angular.equals($scope.model.config.docs, {});
          if (docsExist) {
            $scope.model.configError = null;

            var docs = $scope.model.config.docs;
            var keys = Object.keys(docs);

            // For each configured doc
            keys.forEach(function(key) {
              var doc = {
                id: key, 
                name: key,
                fields: {}
              };
              var indexes = docs[key];

              indexes.forEach(function(index) {
                var field = {
                  type: index['scalar-type']
                };
                field['ref-type'] = index['ref-type'];

                var ns = index['namespace-uri'];
                if (ns || ns === '') {
                  field.ns = ns;
                }

                var collation = index['collation'];
                if (collation) {
                  field.collation = collation;
                }

                if (index['localname']) {
                  if (index['parent-localname']) {
                    // attribute range index
                    field.classification = 'attribute';
                    field['parent-localname'] = index['parent-localname'];
                    field['parent-namespace-uri'] = index['parent-namespace-uri'];
                  } else {
                    // element range index
                    field.classification = 'element';
                  }
                  doc.fields[index['localname']] = field;
                } else if (index['path-expression']) {
                  // path range index
                  field.classification = 'path-expression';
                  doc.fields[index['path-expression']] = field;
                }
              });

              $scope.data.docs.push(doc);
            });

            for (var i = 0; i < $scope.data.docs.length; i++) {
              var model = $scope.data.docs[i];
              if (model.id === $scope.data.directory) {
                $scope.data.directory_model = model;
                $scope.setDocument();
                break;
              }
            }

            $scope.executor.disableRun = false;
          } else {
            $scope.model.configError = 'No documents with range indices in the database';
          }
        }, function(response) {
          $scope.model.loadingConfig = false;
          $scope.model.configError = response.data;
        });
      };

      $scope.setDocument = function() {
        if ($scope.data.directory_model) {
          var directory = $scope.data.directory_model.id;
          $scope.data.directory = directory;
          $scope.executor.dimensions = [];
          $scope.executor.results = [];

          for (var i = 0; i < $scope.data.docs.length; i++) {
            var doc = $scope.data.docs[i];
            if (doc.id === directory) {
              $scope.data.fields = doc.fields;
              break;
            }
          }
          $scope.data.operation = 'and-query';
          $scope.data.query = [];
          $scope.data.dimensions = [];

          if (directory === $scope.widget.dataModelOptions.directory) {
            if ($scope.widget.dataModelOptions.query && 
                $scope.widget.dataModelOptions.query.query &&
                $scope.widget.dataModelOptions.query.query.queries) {
              var query = $scope.widget.dataModelOptions.query.query.queries[0];
              var operation = Object.keys(query)[0];
              $scope.data.operation = operation;
              $scope.data.query = query[operation]['queries'];
            } else {
              $scope.data.operation = 'and-query';
              $scope.data.query = [];
            }

            if ($scope.widget.dataModelOptions.dimensions) {
              angular.copy($scope.widget.dataModelOptions.dimensions, $scope.data.dimensions);
            } else {
              $scope.data.dimensions = [];
            }
          } else {
            $scope.data.operation = 'and-query';
            $scope.data.query = [];
            $scope.data.dimensions = [];
          }

          $scope.data.needsUpdate = true;
          $scope.data.needsRefresh = true;

          $scope.model.showBuilder = true;
        } else {
          $scope.model.showBuilder = false;
        }
      };

      $scope.edit = function() {
        registerModalCallback();
        $('#query-editor-dialog').modal({'backdrop': 'static'});

        var value = $scope.showQuery();
        var container = document.getElementById('query-editor');
        container.innerHTML = '';

        var cme = CodeMirror(container, {
          value: value,
          indentUnit: 2,
          lineNumbers: true,
          readOnly: false,
          matchBrackets: true,
          autoCloseBrackets: true,
          mode: 'application/ld+json',
          lineWrapping: false
        });
      };

      $scope.save = function() {
        $scope.widget.dataModelOptions.database = $scope.model.config['current-database'];
        $scope.widget.dataModelOptions.groupingStrategy = $scope.model.groupingStrategy;
        $scope.widget.dataModelOptions.directory = $scope.data.directory_model.id;

        $scope.widget.dataModelOptions.query = {};
        $scope.widget.dataModelOptions.dimensions = [];

        angular.copy($scope.getStructuredQuery(), $scope.widget.dataModelOptions.query);
        angular.copy($scope.data.dimensions, $scope.widget.dataModelOptions.dimensions);

        $scope.options.saveDashboard();
      };

      $scope.download = function() {
        var data = [];

        if ($scope.model.results) {
          // Complex query
          var headerRow = [];
          $scope.model.results.headers.forEach(function(header) {
            headerRow.push(header); 
          });
          data.push(headerRow);

          $scope.model.results.results.forEach(function(result) {
            data.push(result); 
          });
        } else if ($scope.executor.results.length > 0) {
          // Simple query
          var headerRow = [];
          $scope.executor.dimensions.forEach(function(dimension) {
            headerRow.push(dimension.name); 
          });
          data.push(headerRow);

          $scope.executor.results.forEach(function(result) {
            data.push(result); 
          });
        }

        $http({
          method: 'POST',
          url: '/api/report/prepare',
          data: {data : data}
        }).then(function(response) {
          // You can't download file through Ajax.
          window.location = '/api/report/download';
        }, function(response) {
          // error
        });
      };

      $scope.execute = function() {
        var dimensions = $scope.widget.dataModelOptions.dimensions;
        // Number of groupby fields.
        var count = 0;

        dimensions.forEach(function(dimension) {
          if (dimension.groupby) count++;
        });

        // If there is no groupby dimension, we will do simple 
        // search, otherwise we will do aggregate computations.
        $scope.model.loadingResults = true;
        if (count)
          $scope.executeComplexQuery(count);
        else
          $scope.executeSimpleQuery(1);
      };

      $scope.getColumn = function(name) {
        var directory = $scope.widget.dataModelOptions.directory;
        var fields = $scope.model.config.docs[directory];
        for (var i = 0; i < fields.length; i++) {
          var field = fields[i];
          if (name === field.localname || name === field['path-expression'])
            return field;
        }
        return null;
      };

      function getParameterValue(name) {
        var parameters = $scope.widget.dataModelOptions.parameters;

        for (var i = 0; i < parameters.length; i++) {
          var parameter = parameters[i];
          var temp = '#' + parameter.name + '#';
          if (name === temp)
            return parameter.value;
        }

        return null;
      }

      function setQueryParameters(query) {
        var type = typeof query;

        if (type == 'object') {
          for (var key in query) {
            if (key === 'text' || key === 'value') {
              var value = getParameterValue(query[key]);
              if (value !== null)
                query[key] = value;
            } else {
              setQueryParameters(query[key]);
            }
          }
        }
      }

      $scope.executeComplexQuery = function(count) {
        var queries = $scope.widget.dataModelOptions.query.query.queries;
        if (queries.length === 1) {
          // The first element has only one key.
          var firstElement = queries[0];
          var key = Object.keys(firstElement)[0];

          // The group-by will fail if an or-query is empty, so we
          // convert an empty query at the root level.
          if (firstElement[key]['queries'].length === 0)
            queries = [];
        }

        setQueryParameters(queries);

        var search = {
          'search': {
            'options': {
              'search-option': ['unfiltered']
            },
            'query': {
              'queries': queries
            }
          }
        };

        if ($scope.widget.mode === 'View' && $scope.executor.simple) {
          search['search']['qtext'] = $scope.executor.simple;
        } else {
          search['search']['qtext'] = '';
        }

        var params = {};
        var queryConfig = angular.copy($scope.model.queryConfig);

        if ($scope.model.config) {
          params['rs:database'] = $scope.model.config['current-database'];
        }

        if ($scope.model.includeFrequency) {
          queryConfig.computes.push({fn: 'frequency'});
        }

        queryConfig.filters = search;

        var dimensions = $scope.widget.dataModelOptions.dimensions;
        dimensions.forEach(function(dimension) {
          var key = Object.keys(dimension)[0];

          if (key !== 'atomic') {
            var name = dimension[key].field;
            var column = $scope.getColumn(name);

            if (key === 'groupby') {
              queryConfig.columns.push(column);
            } else {
              queryConfig.computes.push({
                fn: key,
                ref: column
              });
            }
          }
        });

        $scope.model.loadingResults = true;
        $scope.clearResults();

        $scope.deferredAbort = $q.defer();
        $http({
          method: 'POST',
          url: '/v1/resources/group-by',
          params: params,
          data: queryConfig,
          timeout: $scope.deferredAbort.promise
        }).then(function(response) {
          $scope.model.results = response.data;
          $scope.model.queryError = null;
          $scope.model.loadingResults = false;

          $scope.createComplexTable($scope.model.results.headers, $scope.model.results.results);
          $scope.createHighcharts(count, $scope.model.results.headers, $scope.model.results.results);

          $scope.executor.disableDownload = false;
        }, function(response) {
          $scope.model.loadingResults = false;

          if (response.status !== 0) {
            $scope.model.queryError = {
              title: response.statusText,
              description: response.data
            };
          }
        });
      };

      $scope.createSimpleTable = function(headers, results) {
        $scope.cols = [
          //{ field: "name", title: "Name", sortable: "name", show: true },
          //{ field: "age", title: "Age", sortable: "age", show: true },
          //{ field: "money", title: "Money", show: true }
        ];

        headers.forEach(function(header) {
          $scope.cols.push({
            field: header, 
            title: header, 
            sortable: header, 
            show: true
          });
        });

        var records = [];
        results.forEach(function(row) {
          var record = {};
          for (var i = 0; i < row.length; i++) {
            record[headers[i]] = row[i];
          }
          records.push(record);
        });

        var initialParams = {
          page: 1, // show first page
          count: $scope.widget.dataModelOptions.pageLength, // count per page
          sorting: {}
        };
        initialParams.sorting[headers[0]] = 'desc';

        var total = $scope.grid.total;

        $scope.tableParams = new NgTableParams(initialParams, {
          total: total,
          getData: function($defer, params) {
            //console.log(params);
            var orderedData = params.sorting() ? 
                $filter('orderBy')(records, $scope.tableParams.orderBy()) : records;

            orderedData = params.filter() ? 
                $filter('filter')(orderedData, params.filter()) : orderedData;

            // Set total for recalc pagination
            //params.total(orderedData.length);

            $defer.resolve(orderedData);
          }
        });
      };

      $scope.createComplexTable = function(headers, results) {
        $scope.cols = [
          //{ field: "name", title: "Name", sortable: "name", show: true },
          //{ field: "age", title: "Age", sortable: "age", show: true },
          //{ field: "money", title: "Money", show: true }
        ];

        headers.forEach(function(header) {
          $scope.cols.push({
            field: header, 
            title: header, 
            sortable: header, 
            show: true
          });
        });

        var records = [];
        results.forEach(function(row) {
          var record = {};
          for (var i = 0; i < row.length; i++) {
            record[headers[i]] = row[i];
          }
          records.push(record);
        });

        var initialParams = {
          page: 1, // show first page
          count: $scope.widget.dataModelOptions.pageLength, // count per page
          sorting: {}
        };
        initialParams.sorting[headers[0]] = 'desc';

        $scope.tableParams = new NgTableParams(initialParams, {
          total: records.length, // Defines the total number of items for the table
          getData: function($defer, params) {
            var orderedData = params.sorting() ? 
                $filter('orderBy')(records, $scope.tableParams.orderBy()) : records;

            orderedData = params.filter() ? 
                $filter('filter')(orderedData, params.filter()) : orderedData;

            // Set total for recalc pagination
            params.total(orderedData.length);

            $defer.resolve(orderedData.slice((params.page() - 1) * params.count(), params.page() * params.count()));
          }
        });
      };

      $scope.fetchPage = function() {
        var start = 1 + ($scope.grid.page - 1) * $scope.widget.dataModelOptions.pageLength;

        $scope.model.loadingResults = true;
        $scope.executeSimpleQuery(start);
      };

      $scope.executeSimpleQuery = function(start) {
        var directory = '/' + $scope.widget.dataModelOptions.directory + '/';
        var queries = $scope.widget.dataModelOptions.query.query.queries;

        setQueryParameters(queries);

        var search = {
          'search': {
            'options': {
              'search-option': ['unfiltered']
            },
            'query': {
              'queries': queries
            }
          }
        };

        if ($scope.widget.mode === 'View' && $scope.executor.simple) {
          search['search']['qtext'] = $scope.executor.simple;
        }

        var params = {
          'directory': directory,
          'pageLength': $scope.widget.dataModelOptions.pageLength,
          'start': start, // current pagination offset
          'category': 'content',
          'view': 'metadata',
          'format': 'json'
        };

        $scope.clearResults();

        var dimensions = $scope.widget.dataModelOptions.dimensions;
        var headers = [];

        dimensions.forEach(function(dimension) {
          var key = Object.keys(dimension)[0];
          var name = dimension[key].field;
          var type = $scope.data.fields[name]['type'];
          var item = {name: name, type: type};
          $scope.executor.dimensions.push(item);
          headers.push(name);
        });

        // We need two transforms: one for JSON, one for XML.
        // These transforms filter the document. The XML
        // transform also converts am XML document to JSON.
        if ($scope.executor.transform) {
          params.transform = $scope.executor.transform;

          $scope.executor.dimensions.forEach(function(dimension) {
            params['trans:' + dimension.name] = dimension.type;
          });
        }

        mlRest.search(params, search).then(function(response) {
          $scope.model.loadingResults = false;

          var contentType = response.headers('content-type');
          var pageResults = MarkLogic.Util.parseMultiPart(response.data, contentType);
          var results = pageResults.results;

          $scope.grid.total = pageResults.metadata.total;

          results.forEach(function(result) {
            var item = [];
            $scope.executor.dimensions.forEach(function(dimension) {
              var name = dimension.name;
              item.push(result[name]);
            });

            $scope.executor.results.push(item);
          });

          $scope.executor.disableDownload = false;

          $scope.createSimpleTable(headers, $scope.executor.results);
        });
      };

      $scope.createHighcharts = function(count, headers, results) {
        var chartType = $scope.widget.dataModelOptions.chart;

        if (chartType === 'column')
          $scope.createColumnHighcharts(count, headers, results);
        else
          $scope.createPieHighcharts(count, headers, results);
      };

      // Create a column chart
      $scope.createColumnHighcharts = function(count, headers, results) {
        var categories = [];
        var series = [];

        // count is number of groupby fields.
        // Skip all groupby fields.
        for (var i = count; i < headers.length; i++) {
          series.push({
            name: headers[i],
            data: []
          });
        }

        results.forEach(function(row) {
          var groups = [];
          for (var i = 0; i < count; i++) {
            groups.push(row[i]);
          }
          categories.push(groups.join(','));

          for (var i = count; i < row.length; i++) {
            series[i-count].data.push(row[i]);
          }
        });

        $scope.highchart = $scope.element.find('div.hcontainer').highcharts({
          chart: {
            type: 'column'
          },
          title: {
            text: ''
          },
          xAxis: {
            categories: categories
          },
          yAxis: {
            title: {
              text: ''
            }
          },
          tooltip: {
            shared: true,
            useHTML: true,
            borderWidth: 1,
            borderRadius: 10,
            headerFormat: '<span style="font-size:16px">{point.key}</span><table>',
            pointFormat: '<tr><td style="color:{series.color};padding:0">{series.name}: </td>' +
                         '<td style="padding:0"><b>{point.y:.1f}</b></td></tr>',
            footerFormat: '</table>'
          },
          plotOptions: {
            column: {
              pointPadding: 0.2,
              borderWidth: 0
            }
          },
          series: series
        });
      };

      // Create a pie chart
      $scope.createPieHighcharts = function(count, headers, results) {
        var colors = Highcharts.getOptions().colors;
        var measures = [];
        var series = [];

        // count is number of groupby fields.
        // Skip all groupby fields.
        for (var i = count; i < headers.length; i++) {
          series.push({
            name: headers[i],
            data: []
          });
          measures.push(headers[i]);
        }

        var rings = series.length;
        if (rings > 1) {
          var percent = Math.floor(100/rings);
          var ring = 0;

          // The innermost ring
          series[ring].size = percent + '%';
          /*series[ring].dataLabels = {
            distance: -30
          };*/

          for (ring = 1; ring < rings; ring++) {
            series[ring].innerSize = percent*ring + '%';
            series[ring].size = percent*(ring+1) + '%';
            /*series[ring].dataLabels = {
              distance: (0-percent*ring)
            };*/
          }
        }

        results.forEach(function(row) {
          var groups = [];
          for (var i = 0; i < count; i++) {
            groups.push(row[i]);
          }
          var category = groups.join(',');

          for (var i = count; i < row.length; i++) {
            series[i-count].data.push({
              name: category,
              color: colors[i-count],
              y: row[i]
            });
          }
        });

        var title = 'Measures: ' + measures;

        $scope.highchart = $scope.element.find('div.hcontainer').highcharts({
          chart: {
            type: 'pie'
          },
          credits: {
            enabled: false
          },
          title: {
            text: title
          },
          yAxis: {
            title: {
              text: ''
            }
          },
          tooltip: {
            shared: true,
            useHTML: true,
            borderWidth: 1,
            borderRadius: 10,
            headerFormat: '<span style="font-size:16px">{point.key}</span><table>',
            pointFormat: '<tr><td style="color:{series.color};padding:0">{series.name}: </td>' +
                         '<td style="padding:0"><b>{point.y:.1f}</b></td></tr>',
            footerFormat: '</table>'
          },
          plotOptions: {
            pie: {
              showInLegend: true,
              shadow: false,
              center: ['50%', '50%'],
              dataLabels: {
                enabled: true,
                useHTML: false,
                format: '<b>{point.name} {series.name}</b>: {point.percentage:.1f}%',
                style: {
                  color: (Highcharts.theme && Highcharts.theme.contrastTextColor) || 'black'
                }
              }
            }
          },
          series: series
        });
      };

      // Kick off
      $scope.getDbConfig();
    },

    link: function($scope, element, attrs) {
      $scope.element = element;
      $scope.contentUrl = mlReportService.getDirectiveTemplate($scope.widget.mode, 'ml-smart-grid');

      $scope.$watch('widget.mode', function(mode) {
        //console.log($scope);

        $scope.clearResults();

        $scope.contentUrl = mlReportService.getDirectiveTemplate(mode, 'ml-smart-grid');

        $scope.data.needsUpdate = true;
        $scope.data.needsRefresh = true;

        if (mode === 'View') {
          //$scope.execute();
        }
      });
    }
  };
}]);
