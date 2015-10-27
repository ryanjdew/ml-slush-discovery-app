(function() {
  'use strict';
  angular.module('app.setup')
    .factory('ServerConfig', ServerConfig);

  ServerConfig.$inject = ['$http', '$q'];

  function ServerConfig($http, $q) {
    var serverConfig = {};
    var databasePropertiesPromise;
    serverConfig.get = function() {
      var config = {},
        defered = [],
        configItems = {
          databaseName: 'getDatabaseName',
          chartData: 'getCharts',
          searchOptions: 'getSearchOptions',
          fields: 'getFields',
          rangeIndexes: 'getRangeIndexes',
          geospatialIndexes: 'getGeospatialIndexes',
          uiConfig: 'getUiConfig',
          databases: 'getDatabases'
        },
        defaults = {
          databaseName: 'Documents',
          chartData: {
            charts: []
          },
          searchOptions: {
            option: {
              constraint: []
            }
          },
          fields: {
            'field-list': []
          },
          rangeIndexes: {
            'range-index-list': []
          },
          geospatialIndexes: {
            'geospatial-index-list': []
          },
          defaultSource: '',
          uiConfig: {},
          databases: []
        };
      angular.forEach(configItems, function() {
        defered.push($q.defer());
      });
      var promises = _.map(defered, function(d) {
        return d.promise;
      });
      if (databasePropertiesPromise) {
        databasePropertiesPromise = null;
      }
      var recursiveRun = function(keys, index) {
        if (index < keys.length) {
          var d = defered[index],
            key = keys[index],
            value = configItems[key];
          serverConfig[value](true).then(function(result) {
            config[key] = result || defaults[key];
            recursiveRun(keys, index + 1);
            d.resolve(result);
          }, function(reason) {
            config[key] = defaults[key];
            d.resolve(config[key]);
            recursiveRun(keys, index + 1);
            return reason;
          });
        }
      };

      recursiveRun(Object.keys(configItems), 0);

      return $q.all(promises).then(function() {
        return config;
      }, function() {
        return config;
      });
    };

    serverConfig.getDatabaseProperties = function(cache) {
      if (!(databasePropertiesPromise && cache)) {
        databasePropertiesPromise = $http.get('/api/server/database')
          .then(function(response) {
            return response.data;
          },
          $q.reject);
      }
      return databasePropertiesPromise;
    };

    serverConfig.getCharts = function() {
      return $http.get('/api/server/charts')
        .then(function(response) {
          return response.data;
        },
        $q.reject);
    };

    serverConfig.setCharts = function(charts) {
      return $http.put('/api/server/charts', charts)
        .then(function(response) {
          return response.data;
        },
        $q.reject);
    };

    serverConfig.getDatabaseName = function(cache) {
      return serverConfig.getDatabaseProperties(cache).then(
        function(dbProperties) {
          return dbProperties['database-name'];
        },
        $q.reject
      );
    };

    serverConfig.getFields = function(cache) {
      return serverConfig.getDatabaseProperties(cache).then(
        function(dbProperties) {
          var fieldList = [];
          angular.forEach(dbProperties.field, function(field) {
            if (field['field-name'] && field['field-name'] != '') {
              fieldList.push(field);
            }
          });
          return {
            'field-list': fieldList
          };
        },
        $q.reject
      );
    };

    serverConfig.setFields = function(fields) {
      return $http.put('/api/server/database', { field: field['field-list'] })
        .then(function(response) {
          return response.data;
        }, $q.reject);
    };

    var geospatialIndexTypes = ['geospatial-element-index', 'geospatial-element-pair-index'];
    serverConfig.getGeospatialIndexes = function(cache) {
      return serverConfig.getDatabaseProperties(cache).then(
        function(dbProperties) {
          var rangeIndexes = [];
          angular.forEach(geospatialIndexTypes, function(indexType) {
            angular.forEach(dbProperties[indexType], function(index) {
              var modIndex = {};
              modIndex[indexType] = index;
              rangeIndexes.push(modIndex);
            });
          });
          return {
            'geospatial-index-list': rangeIndexes
          };
        },
        $q.reject
      );
    };

    serverConfig.setGeospatialIndexes = function(geospatialIndexes) {
      var dbProperties = {};
      for (var key in geospatialIndexTypes) {
        dbProperties[geospatialIndexTypes[key]] = [];
      }
      for (var key in geospatialIndexes['geospatial-index-list']) {
        var type = Object.keys(geospatialIndexes['geospatial-index-list'][key])[0];
        dbProperties[type].push(geospatialIndexes['geospatial-index-list'][key][type]);
      }
      return $http.put('/api/server/database', dbProperties)
        .then(function(response) {
          return response.data;
        },
        $q.reject);
    };

    var rangeIndexTypes = [
        'range-element-index', 'range-element-attribute-index',
        'range-path-index', 'range-field-index'
      ];
    serverConfig.getRangeIndexes = function(cache) {
      return serverConfig.getDatabaseProperties(cache).then(
        function(dbProperties) {
          var rangeIndexes = [];
          angular.forEach(rangeIndexTypes, function(indexType) {
            angular.forEach(dbProperties[indexType], function(index) {
              var modIndex = {};
              modIndex[indexType] = index;
              rangeIndexes.push(modIndex);
            });
          });
          return {
            'range-index-list': rangeIndexes
          };
        },
        $q.reject
      );
    };

    serverConfig.setRangeIndexes = function(rangeIndexes) {
      var dbProperties = {};
      for (var prop in rangeIndexTypes) {
        dbProperties[prop] = [];
      }
      for (var key in rangeIndexes['range-index-list']) {
        var type = Object.keys(rangeIndexes['range-index-list'][key])[0];
        dbProperties[type].push(rangeIndexes['range-index-list'][key][type]);
      }
      return $http.put('/api/server/database', dbProperties)
        .then(function(response) {
          return response.data;
        },
        $q.reject);
    };

    serverConfig.getSearchOptions = function() {
      return $http.get('/api/server/search-options')
        .then(function(response) {
          return response.data;
        },
        $q.reject);
    };

    serverConfig.setSearchOptions = function(searchOptions) {
      return $http.put('/api/server/search-options', searchOptions)
        .then(function(response) {
          return response.data;
        },
        $q.reject);
    };

    serverConfig.find = function(localname, type) {
      return $http.get('/api/server/database/content-metadata', {
          params: {
            localname: localname,
            type: type
          }
        })
        .then(function(response) {
          return response.data;
        },
        $q.reject);
    };

    serverConfig.loadData = function(directory) {
      return $http.get('/api/server/database/load-data', {
          params: {
            directory: directory
          }
        })
        .then(function(response) {
          return response.data;
        },
        $q.reject);
    };

    serverConfig.getUiConfig = function() {
      return $http.get('/api/server/ui-config')
        .then(function(response) {
          return response.data;
        },
        $q.reject);
    };

    serverConfig.setUiConfig = function(uiConfig) {
      return $http.put('/api/server/ui-config', uiConfig)
        .then(function(response) {
          return response.data;
        },
        $q.reject);
    };

    serverConfig.getDatabases = function() {
      return $http.get('/api/server/databases')
        .then(function(response) {
          return _.map(response.data['database-default-list']['list-items']['list-item'],
            function(db) {
              return db.nameref;
            });
        },
        $q.reject);
    }

    serverConfig.setDatabase = function(dbConfig) {
      return $http.put('/api/server/database', dbConfig)
        .then(function(response) {
          return response.data;
        });
    }

    serverConfig.removeDataCollection = function(collection) {
      return $http.delete('/api/server/database/collection/' + collection)
        .then(function(response) {
          return response;
        },
        $q.reject);
    };

    serverConfig.dataTypes = function() {
      return [
        'int',
        'unsignedInt',
        'long',
        'unsignedLong',
        'float',
        'double',
        'decimal',
        'dateTime',
        'time',
        'date',
        'gYearMonth',
        'gYear',
        'gMonth',
        'gDay',
        'yearMonthDuration',
        'dayTimeDuration',
        'string',
        'anyURI'
      ];
    };

    return serverConfig;
  }
}());
