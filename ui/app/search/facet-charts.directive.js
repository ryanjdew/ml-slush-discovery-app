(function() {

  'use strict';

  angular.module('app.search')
    .directive('facetCharts', FacetChartsDirective);

  FacetChartsDirective.$inject = ['$q', 'HighchartsHelper', 'MLRest', 'MLSearchFactory'];

  function FacetChartsDirective($q, HighchartsHelper, MLRest, searchFactory) {

    function link(scope, element, attrs) {
      scope.options = scope.options || 'all';
      scope.mlSearch = scope.mlSearch || searchFactory.newContext();
      var loadData = function() {
        if (scope.charts && scope.charts.length) {
          scope.populatedConfigs = [];
          var chartsLength = scope.charts.length;
          angular.forEach(scope.charts, function(chart, index) {
            var populatedConfig = HighchartsHelper
              .chartFromConfig(chart, scope.mlSearch, scope.callback);
            scope.populatedConfigs.push(populatedConfig);
          });
        }
      };
      var reload = function() {
        loadData();
      };

      scope.$watch(
        function() {
          return scope.charts ? scope.charts.length : -1;
        },
        reload
      );
    }
    // directive factory creates a link function
    return {
      restrict: 'E',
      templateUrl: 'app/search/facet-charts.html',
      scope: {
        'removeChart': '=',
        'editChart': '=',
        'mlSearch': '=',
        'searchOptions': '=',
        'charts': '=',
        'callback': '&'
      },
      link: link
    };
  }

}());
