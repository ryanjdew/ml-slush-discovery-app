(function () {
  'use strict';

  angular.module('app.common')
    .factory('CommonUtil', CommonUtil);

  CommonUtil.$inject = [];

  function CommonUtil() {
    var service = {};

    service.moveArrayItem = function(array, oldIndex, newIndex) {
      while (oldIndex < 0) {
        oldIndex += array.length;
      }
      while (newIndex < 0) {
        newIndex += array.length;
      }
      if (newIndex >= array.length) {
        var k = newIndex - array.length;
        while ((k--) + 1) {
          array.push(undefined);
        }
      }
      array.splice(newIndex, 0, array.splice(oldIndex, 1)[0]);
      return array; // for testing purposes
    };

    return service;
  }
}());
