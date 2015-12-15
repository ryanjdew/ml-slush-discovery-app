'use strict';

angular.module('app').controller('HomeCtrl', ['$scope', '$http', 
  function($scope, $http) {

  $scope.createChart = function() {
    var barData = { 
      labels : ['January', 'February', 'March', 'April', 'May', 'June'],
      datasets: [
        {
          label: '2014 budget #',
          fillColor: '#382765',
          data: [456,479,324,569,702,60]
        },
        {
          label: '2015 budget #',
          fillColor: '#7BC225',
          strokeColor : "#48A497",
          data: [364,504,605,400,345,320]
        }
      ]
    };

    var context = document.getElementById('budget-canvas').getContext('2d');
    var budgetChart = new Chart(context).Bar(barData);
  };

  $scope.createChart();

}]);
