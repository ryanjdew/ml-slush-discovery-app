'use strict';

angular.module('app.service', []);

angular.module('app.service').config(['$httpProvider', function($httpProvider) {
  //$httpProvider.defaults.headers.post['Content-Type'] = 'application/x-www-form-urlencoded;charset=UTF-8';
  //$httpProvider.defaults.headers.put['Content-Type'] = 'application/x-www-form-urlencoded;charset=UTF-8';
}]);

// Report Service
angular.module('app.service').service('ReportService', ['$http', '$q', 'MLRest', function($http, $q, mlRest) {
  var dashboardOptions = null;
  var store = {};
  var storage = {
    getItem : function(key) {
      return store[key];
    },
    setItem : function(key, value) {
      store[key] = value;
    },
    removeItem : function(key) {
      delete store[key];
    }
  };

  this.getStorage = function() {
    return storage;
  };

  this.setDashboardOptions = function(options) {
    dashboardOptions = options;
  };

  this.getDashboardOptions = function() {
    return dashboardOptions;
  };

  this.getReports = function() {
    //return this.get('/api/reports');

    var search = {
      'search': {
        'options': {
          'search-option': ['unfiltered']
        },
        'query': {
          'queries': [{
            'directory-query': {
              uri: ['/report/']
            }
          }]
        }
      }
    };

    // HTTP header names are case-insensitive.
    //
    // A multi-document read is distinguished from a normal search 
    // operation by setting the Accept header to multipart/mixed.
    //
    // Can use the 'category' parameter only with multipart/mixed accept.
    return mlRest.search({
             'pageLength': 20,
             'category': 'content',
             'format': 'json'
            }, search);
  };

  this.getReport = function(uri) {
    return mlRest.getDocument(uri, {format: 'json'});
  };

  this.createReport = function(report) {
    return mlRest.createDocument(report, {
             directory: '/report/',
             format: 'json',
             extension: '.json'
           });
  };

  this.deleteReport = function(uri) {
    return mlRest.deleteDocument(uri);
  };

  this.updateReport = function(data) {
    //return this.put('/api/report', data);
    return mlRest.updateDocument(data, {uri: data.uri});
  };

  this.get = function(url) {
    return $http.get(url);
  };

  this.post = function(url, data) {
    return $http.post(url, data);
  };

  this.put = function(url, data) {
    return $http.put(url, data);
  };

  this.delete = function(url) {
    return $http.delete(url);
  };
}]);

angular.module('app.service').factory('WidgetDefinitions', ['SmartGridDataModel',  
  function(SmartGridDataModel) {
  return [
    {
      name: 'Query Builder',
      directive: 'ml-smart-grid',
      title: 'Query Builder',
      icon: 'fa fa-th',
      dataAttrName: 'grid',
      dataModelType: SmartGridDataModel,
      dataModelOptions: {
        database: '',
        groupingStrategy: '',
        directory: '',
        query: {},
        dimensions: [],
        chart: 'column',
        pageLength: 10,
        parameters: []
      },
      style: {
        width: '100%'
      },
      settingsModalOptions: {
        templateUrl: 'app/widgets/template/qb-settings.html',
        //controller: 'QueryBuilderWidgetSettingsCtrl',
        backdrop: false
      },
      onSettingsClose: function(result, widget) {
        //jQuery.extend(true, widget, result);
        widget.title = result.title;
        widget.dataModelOptions.pageLength = result.dataModelOptions.pageLength;
        widget.dataModelOptions.chart = result.dataModelOptions.chart;
        angular.copy(result.dataModelOptions.parameters, widget.dataModelOptions.parameters);
      },
      onSettingsDismiss: function(reason, scope) {
        // Do nothing here, since the user pressed cancel
      }
    },
    {
      name: 'Timer',
      directive: 'ml-time',
      title: 'Timer',
      icon: 'fa fa-th',
      style: {
        width: '100%'
      },
      dataModelOptions: {
        format: 'standard'
      },
      settingsModalOptions: {
        templateUrl: 'app/widgets/template/time-settings.html',
        //controller: 'TimerWidgetSettingsCtrl',
        backdrop: false
      },
      onSettingsClose: function(result, widget) {
        console.log('Widget-specific settings resolved!');
        console.log(result);
        jQuery.extend(true, widget, result);
      },
      onSettingsDismiss: function(reason, scope) {
        //console.log('Settings have been dismissed: ', reason);
        //console.log('Dashboard scope: ', scope);
      }
    },
    {
      name: 'Scope Monitor',
      title: 'Scope Monitor',
      icon: 'fa fa-list',
      style: {
        width: '100%'
      },
      templateUrl: 'app/template/percentage.html'
    },
    {
      name: 'Canvas Chart' ,
      directive: 'ml-canvas-chart',
      title: 'Canvas Chart',
      icon: 'fa fa-th',
      style: {
        width: '100%'
      }
    }
  ];
}]);
