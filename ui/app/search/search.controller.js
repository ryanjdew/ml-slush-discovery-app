/* global MLSearchController */
(function() {
  'use strict';

  angular.module('app.search')
    .controller('SearchCtrl', SearchCtrl);

  SearchCtrl.$inject = [
    '$scope', '$location', '$filter', '$q', '$timeout', '$window',
    'userService', 'MLSearchFactory', 'MLRest', 'RegisteredComponents',
    'ServerConfig', 'MLQueryBuilder'
  ];

  // inherit from MLSearchController
  var superCtrl = MLSearchController.prototype;
  SearchCtrl.prototype = Object.create(superCtrl);

  function SearchCtrl(
    $scope, $location, $filter, $q, $timeout, $window,
    userService, searchFactory, mlRest,
    RegisteredComponents, ServerConfig, qb
  ) {
    var topLevelIRI = null;
    var additionalConstraints = [{
            'name': 'Saved%20Queries',
            'custom': {
              'facet': true,
              'parse': {
                'apply': 'parse',
                'ns': 'http://demo.marklogic.com/custom-constraints/saved-queries',
                'at': '/ext/saved-queries/constraint.xqy'
              },
              'start-facet': {
                'apply': 'start-facet',
                'ns': 'http://demo.marklogic.com/custom-constraints/saved-queries',
                'at': '/ext/saved-queries/constraint.xqy'
              },
              'finish-facet': {
                'apply': 'finish-facet',
                'ns': 'http://demo.marklogic.com/custom-constraints/saved-queries',
                'at': '/ext/saved-queries/constraint.xqy'
              }
            }
          },
          {
            'name': 'SKOS',
            'custom': {
              'facet': true,
              'parse': {
                'apply': 'parse',
                'ns': 'http://demo.marklogic.com/custom-constraints/semantics',
                'at': '/ext/semantics/constraint.xqy'
              },
              'start-facet': {
                'apply': 'start-facet',
                'ns': 'http://demo.marklogic.com/custom-constraints/saved-queries',
                'at': '/ext/saved-queries/constraint.xqy'
              },
              'finish-facet': {
                'apply': 'finish-facet',
                'ns': 'http://demo.marklogic.com/custom-constraints/saved-queries',
                'at': '/ext/saved-queries/constraint.xqy'
              }
            }
          },
          {
            'name': 'RDF',
            'custom': {
              'facet': true,
              'parse': {
                'apply': 'parse',
                'ns': 'http://demo.marklogic.com/custom-constraints/semantics',
                'at': '/ext/semantics/constraint.xqy'
              },
              'start-facet': {
                'apply': 'start-facet',
                'ns': 'http://demo.marklogic.com/custom-constraints/saved-queries',
                'at': '/ext/saved-queries/constraint.xqy'
              },
              'finish-facet': {
                'apply': 'finish-facet',
                'ns': 'http://demo.marklogic.com/custom-constraints/saved-queries',
                'at': '/ext/saved-queries/constraint.xqy'
              }
            }
          }];
    var ctrl = this;
    ctrl.qtext = '';
    var mlSearch = searchFactory.newContext();

    ctrl.pageExtensions = RegisteredComponents.pageExtensions();

    ctrl.hasPageExtensions = false;

    $scope.$watch(function() {
      return _.filter(ctrl.pageExtensions, function(val) {
        return val.active;
      }).length;
    },function(newVal) {
      ctrl.hasPageExtensions = newVal > 0;
    });

    $scope.decodeURIComponent = $window.decodeURIComponent;

    ServerConfig.getCharts().then(function(chartData) {
      ctrl.charts = chartData.charts;
    });

    ctrl.setSnippet = function(type) {
      mlSearch.setSnippet(type);
      ctrl.search();
    };

    ctrl.setSort = function(type) {
      mlSearch.setSort(type);
      ctrl.search();
    };

    function listFromOperator(operatorArray, operatorType) {
      return (_.filter(
        operatorArray,
        function(val) {
          return val && val.state && val.state[0] && val.state[0][operatorType];
        }
      )[0] || { state: []}).state.map(function(state) {
        return state.name;
      });
    }

    ctrl.showMoreFacets = function(facet, facetName) {
      mlSearch.showMoreFacets(facet, facetName);
    };

    $scope.$watch(userService.currentUser, function(newValue) {
      ctrl.currentUser = newValue;
    });

    $scope.$watch(function() {return ctrl.qtext; }, function(newValue) {
      if (newValue == null || newValue == undefined) {
        ctrl.qtext = '';
      }
    });

    /* BEGIN Date/DateTime constraint logic */
    ctrl.dateFilters = {};
    ctrl.dateStartOpened = {};
    ctrl.dateEndOpened = {};
    ctrl.pickerDateStart = {};
    ctrl.pickerDateEnd = {};
    ctrl.dateTimeConstraints = {};
    ctrl.datePickerOptions = {
      minDate: new Date(1900, 1, 1),
      maxDate: new Date(2050, 12, 31)
    };

    mlSearch.getStoredOptions().then(function(data) {
      ctrl.sortList = listFromOperator(data.options.operator, 'sort-order');
      ctrl.snippetList = listFromOperator(data.options.operator, 'transform-results');
      ctrl.sortOptions = (_.filter(
        data.options.operator,
        function(val) {
          return val.name === 'sort';
        }
      )[0] || { state: []}).state;

      angular.forEach(data.options.constraint, function(constraint) {
        if (constraint.range && (constraint.range.type === 'xs:date' ||
             constraint.range.type === 'xs:dateTime')) {
          ctrl.dateTimeConstraints[constraint.name] = {
            name: constraint.name,
            type: constraint.range.type
          };
        }
      });

      MLSearchController.call(ctrl, $scope, $location, mlSearch);

      ctrl.init();
    });

    // implement superCtrl extension method
    ctrl.parseExtraURLParams = function () {
      var params = _.pick($location.search(), 'expandQuery');
      /*jshint -W018 */
      var hasChanged = ctrl.shouldExpandQuery !== !!params.expandQuery;

      if (hasChanged) {
        ctrl.shouldExpandQuery = !!params.expandQuery;
      }
      var foundExtra = hasChanged;
      ctrl.pickerDateStart = {};
      ctrl.pickerDateEnd = {};
      angular.forEach($location.search(), function(val, key) {
        var constraintName;
        if (key.indexOf('startDate:') === 0) {
          constraintName = key.substr(10);
          ctrl.pickerDateStart[constraintName] = new Date(val);
          ctrl._applyDateFilter(constraintName);
          foundExtra = true;
        } else if (key.indexOf('endDate:') === 0) {
          constraintName = key.substr(8);
          ctrl.pickerDateEnd[constraintName] = new Date(val);
          ctrl._applyDateFilter(constraintName);
          foundExtra = true;
        }
      });
      if ($location.search().s) {
        foundExtra = true;
        mlSearch.setSort($location.search().s);
      }
      return foundExtra;
    };

    // implement superCtrl extension method
    ctrl.updateExtraURLParams = function () {
      angular.forEach(ctrl.pickerDateStart, function(val, key) {
        $location.search('startDate:' + key, _constraintToDateTime(key, val));
      });
      angular.forEach(ctrl.pickerDateEnd, function(val, key) {
        $location.search('endDate:' + key, _constraintToDateTime(key, val));
      });
      angular.forEach($location.search(), function(val, key) {
        if ((key.indexOf('startDate:') === 0 && !ctrl.pickerDateStart[key.substr(10)]) ||
            (key.indexOf('endDate:') === 0 && !ctrl.pickerDateEnd[key.substr(8)])) {
          $location.search(key, null);
        }
      });
      $location.search('expandQuery', ctrl.shouldExpandQuery ? true : null);
    };

    ctrl._search = function () {
      ctrl.relatedTerms = [];
      ctrl.mlSearch.clearAdditionalQueries();
      for (var key in ctrl.dateFilters) {
        if (ctrl.dateFilters[key] && ctrl.dateFilters[key].length) {
          mlSearch.addAdditionalQuery(
            qb.and(
              ctrl.dateFilters[key]
            )
          );
        }
      }
      ctrl.searchPending = true;
      var timestamp = Date.now();
      ctrl.expandedQtext = null;
      ctrl.currentSearchTimestamp = timestamp;
      ctrl.semanticExpandQuery().then(function() {
        ctrl.searchPending = true;
        ctrl.simpleQtext = mlSearch.qtext || ctrl.qtext;
        mlSearch.qtext = ctrl.expandedQtext;

        var promise = ctrl.mlSearch.search({
          'return-results': true,
          'return-facets': false,
          'constraint': additionalConstraints
        })
          .then(ctrl.updateSearchResults.bind(ctrl))
          .then(function() {
            ctrl.addSKOSTree(ctrl, topLevelIRI, 'skosTopLevelCodes');
            $scope.$broadcast('refreshTaxonomyBrowser', { query: ctrl.serializedQuery() });
            ctrl.searchPending = false;
            mlSearch.qtext = ctrl.simpleQtext;
            ctrl.qtext = ctrl.simpleQtext;
            ctrl.updateURLParams();
          });
        ctrl.facetsAreLoading = true;
        $timeout(function() {
          ctrl.mlSearch.search({
            'return-results': false,
            'return-facets': true,
            'constraint': additionalConstraints
          })
          .then(ctrl.updateSearchResults.bind(ctrl))
          .then(function() {
            ctrl.facetsAreLoading = false;
          });
        });
        return promise;
      });
      ctrl.updateURLParams();
    };

    ctrl.openStartDatePicker = function(constraintName, $event) {
      $event.preventDefault();
      $event.stopPropagation();
      ctrl.dateStartOpened[constraintName] = true;
    };

    ctrl.openEndDatePicker = function(constraintName, $event) {
      $event.preventDefault();
      $event.stopPropagation();
      ctrl.dateEndOpened[constraintName] = true;
    };

    ctrl._applyDateFilter = function(constraintName) {
      ctrl.dateFilters[constraintName] = [];
      if (ctrl.pickerDateStart[constraintName] && ctrl.pickerDateStart[constraintName] !== '') {
        var startValue =
          _constraintToDateTime(constraintName, ctrl.pickerDateStart[constraintName]);
        ctrl.dateFilters[constraintName]
          .push(qb.ext.rangeConstraint(constraintName, 'GE', startValue));
      }
      if (ctrl.pickerDateEnd[constraintName] && ctrl.pickerDateEnd[constraintName] !== '') {
        var endValue = _constraintToDateTime(constraintName, ctrl.pickerDateEnd[constraintName]);
        ctrl.dateFilters[constraintName]
          .push(qb.ext.rangeConstraint(constraintName, 'LE', endValue));
      }
    };

    ctrl.applyDateFilter = function(constraintName) {
      ctrl._applyDateFilter(constraintName);
      ctrl.search();
    };

    ctrl.clearDateFilter = function(constraintName) {
      ctrl.dateFilters[constraintName].length = 0;
      ctrl.pickerDateStart[constraintName] = null;
      ctrl.pickerDateEnd[constraintName] = null;
      ctrl.search();
    };

    ctrl.dateOptions = {
      formatYear: 'yy',
      startingDay: 1
    };

    function _constraintToDateTime(constraintName, dateObj) {
      var constraintType = ctrl.dateTimeConstraints[constraintName].type;
      if (dateObj) {
        var dateISO = dateObj.toISOString();
        var dateValue = dateISO;
        if (constraintType === 'xs:date') {
          dateValue = dateISO.substr(0, dateISO.indexOf('T')) + '-06:00';
        }
        return dateValue;
      } else {
        return null;
      }
    }
    /* END Date/DateTime constraint logic */

    function isFacetConstraint(constraintName) {
      return constraintName && constraintName !== '$frequency';
    }

    ctrl.chartItemSelected = function(chart, name, xCategory, x, y, z, seriesName) {
      if (isFacetConstraint(chart.xAxisCategoriesMLConstraint)) {
        ctrl.mlSearch.toggleFacet(chart.xAxisCategoriesMLConstraint, xCategory);
      } else if (isFacetConstraint(chart.xAxisMLConstraint)) {
        ctrl.mlSearch.toggleFacet(chart.xAxisMLConstraint, x);
      } else if (isFacetConstraint(chart.yAxisMLConstraint)) {
        ctrl.mlSearch.toggleFacet(chart.yAxisMLConstraint, y);
      } else if (isFacetConstraint(chart.zAxisMLConstraint)) {
        ctrl.mlSearch.toggleFacet(chart.zAxisMLConstraint, z);
      } else if (isFacetConstraint(chart.seriesNameMLConstraint)) {
        ctrl.mlSearch.toggleFacet(chart.seriesNameMLConstraint, seriesName);
      } else if (isFacetConstraint(chart.dataPointNameMLConstraint)) {
        ctrl.mlSearch.toggleFacet(chart.dataPointNameMLConstraint, name);
      }
      ctrl.search();
    };

    // BEGIN Saved Query
    ctrl.serializedQuery = function() {
      var serializedQuery = angular.copy(mlSearch.getQuery());
      serializedQuery.query.queries.push({ qtext: ctrl.expandedQtext || ctrl.qtext });
      return serializedQuery;
    };

    ctrl.saveSearch = function() {
      var modalInstance = $uibModal.open({
        templateUrl: '/app/search/save-cohort.html',
        controller: 'SavedSearchCtrl as ctrl',
        size: 'sm',
        resolve: {
          items: function() {
            return $scope.items;
          }
        }
      });

      modalInstance.result.then(function(searchName) {
        var chort = {
          'name': searchName,
          'query': mlSearch.getParams(),
          'serialized-query': ctrl.serializedQuery()
        };
        mlRest
          .createDocument(
            chort, {
              collection: 'saved-query',
              directory: '/saved-query/',
              extension: '.json',
              transform: 'saved-query'
            })
          .then(function() {
            ctrl.search();
          });
      });
    };
    // END Saved Query

    // BEGIN SKOS/RDF facet
    ctrl.semanticExpandQuery = function() {
      if (ctrl.shouldExpandQuery && mlSearch.qtext) {
        var params = {
          'rs:qtext': mlSearch.qtext,
          'rs:expand': ctrl.shouldExpandQuery
        };
        return mlRest.extension('semanticExpand', { params: params })
          .then(function(resp) {
            if (resp.data.synonyms && resp.data.synonyms.length) {
              var synonyms = resp.data.synonyms.map(function(val) {
                return '"' + val + '"';
              });
              synonyms.push(ctrl.qtext);
              ctrl.expandedQtext = synonyms.join(' OR ');
            } else {
              ctrl.expandedQtext = ctrl.qtext;
            }
            ctrl.relatedTerms = resp.data.relatedTerms;
          });
      } else {
        ctrl.expandedQtext = ctrl.qtext;
        return $q.when(null);
      }
    };

    ctrl.openTaxonomyBrowser = function() {
      ctrl.taxonomyBrowserIsOpen = true;
      document.getElementById('taxonomy-sidenav').style.width = '100%';
    };

    ctrl.closeTaxonomyBrowser = function() {
      ctrl.taxonomyBrowserIsOpen = false;
      document.getElementById('taxonomy-sidenav').style.width = '0';
    };

    ctrl.addSKOSTree = function(parent, parentIRI, childPropertyName) {
      mlRest.extension('semanticsHierarchy', {
          method: 'POST',
          params: {
            'rs:parentIRI': parentIRI
          },
          data: ctrl.serializedQuery()
        }).then(function(response) {
          if (parent[childPropertyName]) {
            angular.forEach(response.data.childTriples, function(childTriple) {
              var existingChild = $filter('filter')(parent[childPropertyName], {'iri': childTriple.iri})[0];
              if (existingChild) {
                angular.extend(existingChild, childTriple);
              } else {
                parent[childPropertyName].push(childTriple);
              }
            });
          } else if (response && response.data) {
            parent[childPropertyName] = response.data.childTriples;
          }
        });
    };

    ctrl.updateSearchResults = function updateSearchResults(data) {
      var oldFacets = angular.copy(ctrl.response.facets);
      var oldResults = angular.copy(ctrl.response.results);

      superCtrl.updateSearchResults.apply(ctrl, arguments);
      if (ctrl.response.total) {
        ctrl.response.facets = ctrl.response.facets || oldFacets;
        if (!(ctrl.response.results && ctrl.response.results.length)) {
          ctrl.response.results = oldResults;
        }
      }
      ctrl.mlSearch.results.facets = ctrl.response.facets;
      try {
        ctrl.setChartSeries(ctrl.taPieHighchartConfig, ctrl.response.facets.TA.facetValues);
        ctrl.setChartSeries(ctrl.genePieHighchartConfig, ctrl.response.facets.GENE.facetValues);
      } catch (e) {

      }

      angular.forEach(ctrl.response.results,function(result) {
        result.metaValues = {};
        if (result.extracted) {
          angular.forEach(result.extracted.content,function(extracted) {
            if (angular.isString(extracted)) {
              var type = extracted.replace(/^<(.+)>.*<\/.+>$/, '$1');
              var value = extracted.replace(/^<.+>(.*)<\/.+>$/, '$1');
              result.metaValues[type] = result.metaValues[type] || [];
              if (!result.metaValues[type].includes(value)) {
                result.metaValues[type].push(value);
              }
            } else if (angular.isObject(extracted)) {
              var firstKey = Object.keys(extracted)[0];
              var value = extracted[firstKey];
              if (value) {
                var textValue = value.mark ? value.mark.highlighted: value;
                if (result.metaValues[firstKey]) {
                  result.metaValues[firstKey] = result.metaValues[firstKey] + textValue;
                } else {
                  result.metaValues[firstKey] = textValue;
                }
              }
            }
          });
        }
      });

      return ctrl;
    };

    ctrl.skosHash = {};

    ctrl.addSKOSTree(ctrl, null, 'skosTopLevelCodes');
    // BEGIN SKOS/RDF facet
  }
}());
