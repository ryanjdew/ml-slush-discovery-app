(function() {
  'use strict';

  angular.module('app.components')
    .factory('RegisteredComponents', RegisteredComponents);

  RegisteredComponents.$inject = ['$state'];

  function RegisteredComponents($state) {
    var service = {}

    service.pageExtensions = {};
    service._registeredComponents = {};
    service.registerComponent = function(component) {
      service._registeredComponents[component.name] = component;
      if (component.extendPage) {
        service.pageExtensions[component.extendPage] =
          service.pageExtensions[component.extendPage] || [];
        service.pageExtensions[component.extendPage].push(component);
      }
    };

    service.pageExtensions = function(view) {
      view = view || $state.$current.name;
      return service.pageExtensions[view] || [];
    };

    return service;
  }
}());
