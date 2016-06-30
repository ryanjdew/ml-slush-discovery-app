(function () {
  'use strict';

  angular.module('app.root')
    .controller('RootCtrl', RootCtrl);

  RootCtrl.$inject = ['$rootScope', 'messageBoardService', 'UIService'];

  function RootCtrl($rootScope, messageBoardService, UIService) {
    var ctrl = this;

    function setLayout(uiConfig) {
      UIService.setLayout();
      ctrl.uiConfig = uiConfig;
    }

    UIService.getUIConfig().then(setLayout);

    $rootScope.$on('UIService:setLayout', function(e, uiConfig) {
      ctrl.uiConfig = uiConfig;
    });

    angular.extend(ctrl, {
      messageBoardService: messageBoardService
    });
  }
}());
