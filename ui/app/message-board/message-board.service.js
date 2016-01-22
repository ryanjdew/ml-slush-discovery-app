(function () {
  'use strict';

  angular.module('app.messageBoard')
    .factory('messageBoardService', MessageBoardService);

  MessageBoardService.$inject = ['$rootScope'];
  function MessageBoardService($rootScope) {
    var _message = null;
    var _type = null;
    var _source = null;

    var service = {
      message: message,
      source: source,
      type: type
    };

    function message(msg) {
      if (msg === undefined) {
        return _message;
      }
      _message = msg;
      if (message) {
        $rootScope.$broadcast('message-board:set', _message);
      } else {
        $rootScope.$broadcast('message-board:cleared');
      }
      return service;
    }

    function type(typeOfMsg) {
      if (typeOfMsg === undefined) {
        return _type;
      }
      _type = typeOfMsg;
      return service;
    }

    function source(src) {
      if (src === undefined) {
        return _source;
      }
      _source = src;
      return service;
    }

    $rootScope.$on('$stateChangeSuccess', function() {
      message(null);
    });

    return service;
  }
}());
