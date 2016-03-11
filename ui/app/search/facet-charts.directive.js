(function() {

  'use strict';

  angular.module('app.search')
    .directive('facetCharts', FacetChartsDirective);

  FacetChartsDirective.$inject = ['$q', '$timeout', 'CommonUtil', 'HighchartsHelper', 'MLRest', 'MLSearchFactory', 'ServerConfig'];

  function FacetChartsDirective($q, $timeout, CommonUtil, HighchartsHelper, MLRest, searchFactory, ServerConfig) {

    function link(scope, element, attrs) {
      scope.options = scope.options || 'all';
      scope.mlSearch = scope.mlSearch || searchFactory.newContext();
      scope.reorderCharts = function(oldIndex, newIndex) {
        CommonUtil.moveArrayItem(scope.charts, oldIndex, newIndex);
        ServerConfig.setCharts({ charts: scope.charts});
      };
      scope.setWidth = function(index, widthVal) {
        scope.charts[index].discoveryWidth = widthVal;
        ServerConfig.setCharts({ charts: scope.charts});
        $timeout(function() { scope.$broadcast('highchartsng.reflow'); }, 10);
      };
      $timeout(function() { scope.$broadcast('highchartsng.reflow'); });
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
