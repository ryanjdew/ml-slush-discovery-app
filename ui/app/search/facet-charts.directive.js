(function() {

  'use strict';

  angular.module('app.search')
    .directive('facetCharts', FacetChartsDirective);

  FacetChartsDirective.$inject = ['$q', 'HighchartsHelper', 'MLRest', 'MLSearchFactory'];

  function FacetChartsDirective($q, HighchartsHelper, MLRest, searchFactory) {

    function link(scope, element, attrs) {
      scope.options = scope.options || 'all';
      scope.mlSearch = scope.mlSearch || searchFactory.newContext();
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
