'use strict';

angular.module('marklogic.widgets', []);

angular.module('marklogic.widgets').run(['$templateCache', function($templateCache) {

  $templateCache.put('template/widgets/time.html',
    '<div>\n' +
    '  Current Time\n' +
    '  <div class="alert alert-success">{{time}}</div>\n' +
    '</div>'
  );

}]);

angular.module('marklogic.widgets').directive('mlTime', function($interval) {
  return {
    restrict: 'A',
    replace: true,
    templateUrl: 'template/widgets/time.html',
    link: function(scope) {
      function update() {
        var d = new Date();
        if (scope.widget.format && scope.widget.format === 'year')
          scope.time = d.toLocaleTimeString() + ' ' + d.toLocaleDateString();
        else
          scope.time = d.toLocaleTimeString();
      }
      var promise = $interval(update, 500);
      scope.$on('$destroy', function() {
        $interval.cancel(promise);
      });
    }
  };
});

angular.module('marklogic.widgets').directive('mlCanvasChart', function() {
  return {
    restrict: 'A',
    replace: true,
    template: '<canvas style="height:300px;min-width:300px;max-width:100%;width:auto;"></canvas>',
    controller: function($scope) {
      $scope.showModeButton = false;
    },
    link: function(scope, element, attrs) {
      var data = {
        labels: ["January", "February", "March", "April", "May", "June"],
        datasets: [{
          label: "2014 claims #",
          fillColor: "rgba(220,220,220,0.5)",
          strokeColor: "rgba(220,220,220,0.8)",
          highlightFill: "rgba(220,220,220,0.75)",
          highlightStroke: "rgba(220,220,220,1)",
          data: [456,479,324,569,702,60]
        },{
          label: "2015 claims #",
          fillColor: "rgba(151,187,205,0.5)",
          strokeColor: "rgba(151,187,205,0.8)",
          highlightFill: "rgba(151,187,205,0.75)",
          highlightStroke: "rgba(151,187,205,1)",
          data: [364,504,605,400,345,320]
        }]
      };

      var ctx = $(element).get(0).getContext('2d');
      var myBarChart = new Chart(ctx).Bar(data);
    }
  };
});
