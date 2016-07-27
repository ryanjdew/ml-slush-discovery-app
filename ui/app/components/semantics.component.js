(function() {
  'use strict';
  var searchComponentInfo = {
          name: 'Semantic Description',
          html: '<semantic-describe query="ctrl.qtext"></semantic-describe>',
          extendPage: 'root.search',
          active: true
        };
  var detailsComponentInfo = {
          name: 'Semantic Description',
          html: '<semantic-describe document="ctrl.uri"></semantic-describe>',
          extendPage: 'root.detail',
          active: true
        };

  angular.module('app.components')
    .run([
      'RegisteredComponents',
      function(RegisteredComponents) {
        RegisteredComponents.registerComponent(searchComponentInfo);
        RegisteredComponents.registerComponent(detailsComponentInfo);
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
        var componentInfo = (ctrl.document) ? detailsComponentInfo : searchComponentInfo;

        $http.get(
          '/v1/resources/sparql-describe',
          { params: { query: ctrl.query, document: ctrl.document}}
        ).then(function(response) {
          ctrl.semanticItems = response.data.results;
          componentInfo.active = ctrl.semanticItems && ctrl.semanticItems.length > 0;
        }, function () {
          componentInfo.active = false;
        });

      }],
      bindings: {
        query: '=?',
        document: '=?'
      }
    });
}());
