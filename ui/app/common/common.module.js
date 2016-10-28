(function() {
  'use strict';

  angular.module('app.common', [])
    .filter('object2Array', function() {
      return function(input) {
        var out = [];
        for (var name in input) {
          input[name].__key = name;
          out.push(input[name]);
        }
        return out;
      };
    })
    .filter('decodeString', function() {
      return function(input) {
        if (input) {
          try {
            return decodeURIComponent(input);
          } catch (e) {
          }
        }
        return '';
      };
    })
    .filter('stringToObject', function() {
      return function(input) {
        try {
          return JSON.parse(input);
        } catch (e) {
          return {};
        }
      };
    })
    .factory('$dialog', ['$rootScope', '$uibModal',
    function($rootScope, $modal) {

      function dialog(modalOptions, resultFn) {
        var modal = $modal.open(modalOptions);
        if (resultFn) {
          modal.result.then(resultFn);
        }
        modal.values = modalOptions;
        return dialog;
      }

      function modalOptions(templateUrl, controller, scope) {
        return {
          templateUrl: templateUrl,
          controller: controller,
          scope: scope
        };
      }

      return {
        /**
         * Creates and opens dialog.
         */
        dialog: dialog,

        /**
         * Returns 0-parameter function that opens dialog on evaluation.
         */
        simpleDialog: function(templateUrl, controller, resultFn) {
          return function() {
            return dialog(modalOptions(templateUrl, controller), resultFn);
          };
        },

        /**
         * Opens simple generic dialog presenting title, message (any html) and provided buttons.
         */
        messageBox: function(title, message, buttons, resultFn) {
          var scope = angular.extend($rootScope.$new(false), {
            title: title,
            message: message,
            buttons: buttons
          });
          return dialog(
            modalOptions('template/messageBox/message.html', 'MessageBoxController', scope),
            function(result) {
            var value = resultFn ? resultFn(result) : undefined;
            scope.$destroy();
            return value;
          });
        }
      };
    }
  ])
  .run(['$templateCache',
    function($templateCache) {
      $templateCache.put('template/messageBox/message.html',
        '<div class="modal-header"><h3>{{ title }}</h3></div>\n' +
        '<div class="modal-body"><p ng-bind-html="message"></p></div>\n' +
        '<div class="modal-footer">' +
        '<button ng-repeat="btn in buttons" ng-click="close(btn.result)" ' +
        ' class="btn" ng-class="btn.cssClass">' +
        '{{ btn.label }}</button>' +
        '</div>\n');
    }
  ])
  .controller('MessageBoxController', ['$scope', '$uibModalInstance',
    function($scope, $modalInstance) {
      $scope.close = function(result) {
        $modalInstance.close(result);
      };
    }
  ])
  .directive('confirmationDialog', ['$dialog','$timeout','$parse',
    function($dialog, $timeout, $parse) {
      return {
        restrict: 'A',
        link: function($scope, element, attrs) {
          var fn = $parse(attrs.confirmationDialog);
          var yesFn = function() {
                fn($scope, {});
              };
          var resultFn = function(result) {
            if (result === 'yes') {
              $timeout(yesFn);
            }
          };
          element.bind('click', function() {
            var title = attrs.confirmationDialogTitle;
            var message = attrs.confirmationDialogMessage;
            $dialog.messageBox(title, message, [{
              label: 'Yes, I\'m sure',
              cssClass: 'btn-primary',
              result: 'yes'
            }, {
              label: 'No',
              result: 'no'
            }],
            resultFn
            );
          });
        }
      };
    }
  ])
  .directive('infoDialog', ['$dialog','$timeout','$parse',
    function($dialog, $timeout, $parse) {
      return {
        restrict: 'A',
        link: function($scope, element, attrs) {
          element.bind('click', function() {
            var title = attrs.infoDialogTitle || 'Information';
            var message = attrs.infoDialog;
            $dialog.messageBox(title, message, [{
              label: 'Ok',
              result: 'ok'
            }]);
          });
        }
      };
    }
  ])
  .directive('compile', function($compile) {
      // directive factory creates a link function
      return function(scope, element, attrs) {
        scope.$watch(
          function(scope) {
            // watch the 'compile' expression for changes
            return scope.$eval(attrs.compile);
          },
          function(value) {
            // when the 'compile' expression changes
            // assign it into the current DOM
            element.html(value);

            // compile the new DOM and link it to the current
            // scope.
            // NOTE: we only compile .childNodes so that
            // we don't get into infinite loop compiling ourselves
            $compile(element.contents())(scope);
          }
        );
      };
    })
  .directive('encodedValue', function() {
    return {
      require: 'ngModel',
      link: function(scope, element, attrs, ngModelController) {
        ngModelController.$parsers.push(function(data) {
          //convert data from view format to model format
          return encodeURIComponent(data); //converted
        });

        ngModelController.$formatters.push(function(data) {
          //convert data from model format to view format
          return decodeURIComponent(data); //converted
        });
      }
    }
  });;
}());
