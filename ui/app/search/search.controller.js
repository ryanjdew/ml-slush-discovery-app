/* global MLSearchController */
(function() {
  'use strict';

  angular.module('app.search')
    .controller('SearchCtrl', SearchCtrl);

  SearchCtrl.$inject = ['$scope', '$location', '$window', 'userService', 'MLSearchFactory', 'ServerConfig', 'MLQueryBuilder'];

  // inherit from MLSearchController
  var superCtrl = MLSearchController.prototype;
  SearchCtrl.prototype = Object.create(superCtrl);

  function SearchCtrl($scope, $location, $window, userService, searchFactory, ServerConfig, qb) {
    var ctrl = this;
    var mlSearch = searchFactory.newContext();

    ctrl.pageExtensions = [];

    $scope.decodeURIComponent = $window.decodeURIComponent;

    ServerConfig.getCharts().then(function(chartData) {
      ctrl.charts = chartData.charts;
    });

    ctrl.setSnippet = function(type) {
      mlSearch.setSnippet(type);
      ctrl.search();
    };

    $scope.$watch(userService.currentUser, function(newValue) {
      ctrl.currentUser = newValue;
    });

    /* BEGIN Date/DateTime constraint logic */
    ctrl.dateFilters = {};
    ctrl.dateStartOpened = {};
    ctrl.dateEndOpened = {};
    ctrl.pickerDateStart = {};
    ctrl.pickerDateEnd = {};
    ctrl.dateTimeConstraints = {};

    mlSearch.getStoredOptions().then(function(data) {
      angular.forEach(data.options.constraint, function(constraint) {
        if (constraint.range && (constraint.range.type === 'xs:date' || constraint.range.type === 'xs:dateTime')) {
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
      var foundExtra = false;
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
    };

    ctrl._search = function () {
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
      superCtrl._search.call(ctrl);
    };

    ctrl.openStartDatePicker = function(contraintName, $event) {
      $event.preventDefault();
      $event.stopPropagation();
      ctrl.dateStartOpened[contraintName] = true;
    };

    ctrl.openEndDatePicker = function(contraintName, $event) {
      $event.preventDefault();
      $event.stopPropagation();
      ctrl.dateEndOpened[contraintName] = true;
    };

    ctrl._applyDateFilter = function(contraintName) {
      ctrl.dateFilters[contraintName] = [];
      if (ctrl.pickerDateStart[contraintName] && ctrl.pickerDateStart[contraintName] !== '') {
        var startValue = _constraintToDateTime(contraintName, ctrl.pickerDateStart[contraintName]);
        ctrl.dateFilters[contraintName].push(qb.ext.rangeConstraint(contraintName, 'GE', startValue));
      }
      if (ctrl.pickerDateEnd[contraintName] && ctrl.pickerDateEnd[contraintName] !== '') {
        var endValue = _constraintToDateTime(contraintName, ctrl.pickerDateEnd[contraintName]);
        ctrl.dateFilters[contraintName].push(qb.ext.rangeConstraint(contraintName, 'LE', endValue));
      }
    };

    ctrl.applyDateFilter = function(contraintName) {
      ctrl._applyDateFilter(contraintName);
      ctrl.search();
    };

    ctrl.clearDateFilter = function(contraintName) {
      ctrl.dateFilters[contraintName].length = 0;
      ctrl.pickerDateStart[contraintName] = null;
      ctrl.pickerDateEnd[contraintName] = null;
      ctrl.search();
    };

    ctrl.dateOptions = {
      formatYear: 'yy',
      startingDay: 1
    };

    function _constraintToDateTime(contraintName, dateObj) {
      var constraintType = ctrl.dateTimeConstraints[contraintName].type;
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

  }
}());
