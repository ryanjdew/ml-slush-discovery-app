(function() {

  'use strict';

  angular.module('app.setup')
    .directive('finder', ['ServerConfig',function(serverConfig) {
    function link(scope, element, attrs) {
      scope.otherNode = {};
      scope.foundNodes = [];
      scope.find = function(search, indexType) {
        scope.foundNodes.length = 0;
        serverConfig.find(search, indexType).then(function(data) {
          angular.forEach(data.localnames, function(val) {
            scope.foundNodes.push(val.localname);
          });
        });
      };
    }
    // directive factory creates a link function
    return {
      restrict: 'E',
      templateUrl: 'app/setup/directives/finder.html',
      scope: {
        'index': '=',
        'indexType': '=type'
      },
      link: link
    };
  }]);
}());
