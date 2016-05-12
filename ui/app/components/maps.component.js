(function() {
  'use strict';

  var componentInfo = {
    name: 'Search Map',
    html: '<search-map facets="ctrl.response.facets"></search-map>',
    extendPage: 'root.search',
    active: true
  };
  angular.module('app.components')
    .run(['RegisteredComponents', function(RegisteredComponents){
      RegisteredComponents.registerComponent(componentInfo);
    }])
    .component('searchMap', {
      template: '<ml-google-search-map map="$ctrl.myMap.map" ' +
                'options="$ctrl.myMap.options" facets="$ctrl.facets" ' +
                ' markers="$ctrl.myMap.markers" bounds-changed="$ctrl.boundsChanged(bounds)" ' +
            'show-context-menu="$ctrl.resetMap()" ' +
            'selections="$ctrl.myMap.selections"> ' +
            '</ml-google-search-map> ' +
            '<ml-google-search-map-legend facets="$ctrl.facets"></ml-google-search-map-legend>',
      controller: ['$scope', '$window', function($scope, $window) {
        var ctrl = $scope.$ctrl;
        var initMapOptions = {
          center: new $window.google.maps.LatLng(37.09024, -95.712891),
          zoom: 1,
          mapTypeId: $window.google.maps.MapTypeId.ROADMAP
        };

        ctrl.myMap = {
          map: null,
          options: angular.extend({}, initMapOptions),
          markers: [],
          selections: []
        };

        function hasMarkers() {
          var mapItems = _.filter(ctrl.facets, function (facet) {
            return facet.boxes;
          });
          return mapItems.length > 0;
        }

        $scope.$watch(function() { return hasMarkers(); }, function(newVal) {
          componentInfo.active = hasMarkers();
        });


        ctrl.boundsChanged = function() {
          // place your geospatial search code here, and make that update $scope.myFacets
        };

        ctrl.resetMap = function() {
          ctrl.myMap.options = angular.extend({}, initMapOptions);
          angular.forEach(ctrl.myMap.selections, function(overlay, index) {
            overlay.setMap(null);
          });
          ctrl.myMap.selections.length = 0;
        };
      }],
      bindings: {
        facets: '='
      }
    });

}());
