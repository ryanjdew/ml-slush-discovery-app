(function () {
  'use strict';

  angular.module('app.common')
    .factory('UIService', UIService);

  UIService.$inject = ['$http', '$q', '$rootScope'];

  function UIService($http, $q, $rootScope) {
    var service = {};

    service.getUIConfig = function() {
      return $http.get('/api/server/ui-config')
        .then(function(response) {
            return response.data;
          },
          $q.reject)
        .catch(function (err) { return {}; });
    };

    service.setUIConfig = function(uiConfig) {
      return $http.put('/api/server/ui-config', uiConfig)
        .then(function(response) {
            return response.data;
          },
          $q.reject)
        .catch(function (err) { return {}; });
    };

    service.setLayout = function setLayout(uiConfig) {
      var uiConfigPromise;
      if (uiConfig) {
        uiConfigPromise = $q.when(uiConfig);
      } else {
        uiConfigPromise = service.getUIConfig();
      }
      uiConfigPromise.then(function(uiConfig) {
        var css = (uiConfig.color) ?
            '.user .fa-circle.text-primary {\n' +
            '  color:\n' + uiConfig.color + ';\n' +
            '}\n' +
            '\n' +
            '#logo {\n' +
            '  color:\n' + uiConfig.color + ';\n' +
            '} ' : '';
        if (uiConfig.logo && uiConfig.logo.type === 'image') {
          var logo = new Image();
          logo.onload = function() {
            var styles = css +
              '#logo {' +
              '  background: url(' + uiConfig.logo.image + ') no-repeat;\n' +
              '  background-size: contain;\n' +
              '}\n';
            setStyles(styles);
          };
          logo.src = uiConfig.logo.image;
        } else if (uiConfig.logo && uiConfig.logo.type === 'text') {
          setStyles(css +
              '#logo {' +
              '  text-indent: 0%;\n' +
              '  font-size: 1.6em;\n' +
              '  background: none no-repeat;\n' +
              '}\n');
        }
        if (uiConfig.page && uiConfig.page.title) {
          setTitle(uiConfig.page.title);
        }
        $rootScope.$broadcast('UIService:setLayout', uiConfig);
      });
    };

    function setStyles(css) {
      setElementText(document.getElementById('ui-styles'), css);
    }

    function setTitle(title) {
      setElementText(document.getElementById('page-title'), title);
    }

    function setElementText(elem, text) {
      if (elem.textContent !== undefined) {
        elem.textContent = text;
      } else if (elem.innerText !== undefined) {
        elem.innerText = text;
      }
    }

    return service;
  }
}());
