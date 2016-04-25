(function() {
  'use strict';

  angular.module('app.components')
    .run([
      'RegisteredComponents',
      function(RegisteredComponents) {
        RegisteredComponents.registerComponent({
          name: 'Semantic Description',
          html: '<semantic-describe document="ctrl.uri"></semantic-describe>',
          extendPage: 'root.detail',
          active: true
        });
        RegisteredComponents.registerComponent({
          name: 'Semantic Description',
          html: '<semantic-describe query="ctrl.uri"></semantic-describe>',
          extendPage: 'root.search',
          active: true
        });
      }
    ])
    .component('semanticDescribe', {
      template: '<div ng-repeat="item in $ctrl.semanticItems" ng-if="item.triples.length">' +
            '<h4>{{item.iri}}</h4>' +
            '<dl>' +
            '<dt class="row" ng-start="triple in item.triples">{{triple.predicate}}</dt>' +
            '<dd class="col-md-12" ng-repeat-end>{{triple.object}}</dd>' +
          '</dl>' +
          '</div>',
      controller: ['$http', '$scope', function($http, $scope) {
        var ctrl = $scope.$ctrl;

        $http.get(
          '/v1/resources/sparql-describe',
          { params: { query: ctrl.query, document: ctrl.document}}
        ).then(function(response) {
          ctrl.semanticItems = response.data.results;
        });

      }],
      bindings: {
        query: '=',
        document: '='
      }
    });
}());
