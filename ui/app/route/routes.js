(function () {
  'use strict';

  angular.module('app')
    .run(['loginService', function(loginService) {
      loginService.protectedRoutes(['root.create', 'root.profile', 'root.setup']);
    }])
    .config(Config);

  Config.$inject = ['$stateProvider', '$urlMatcherFactoryProvider',
    '$urlRouterProvider', '$locationProvider'
  ];

  function Config(
    $stateProvider,
    $urlMatcherFactoryProvider,
    $urlRouterProvider,
    $locationProvider) {

    $urlRouterProvider.otherwise('/');
    $locationProvider.html5Mode(true);

    function valToFromString(val) {
      return val !== null ? val.toString() : val;
    }

    function regexpMatches(val) { // jshint validthis:true
      return this.pattern.test(val);
    }

    $urlMatcherFactoryProvider.type('path', {
      encode: valToFromString,
      decode: valToFromString,
      is: regexpMatches,
      pattern: /.+/
    });

    $stateProvider
      .state('root', {
        url: '',
        // abstract: true,
        templateUrl: 'app/root/root.html',
        controller: 'RootCtrl',
        controllerAs: 'ctrl',
        resolve: {
          user: function(userService) {
            return userService.getUser();
          }
        }
      })
      .state('root.search', {
        url: '/',
        templateUrl: 'app/search/search.html',
        controller: 'SearchCtrl',
        controllerAs: 'ctrl'
      })
      .state('root.create', {
        url: '/create',
        templateUrl: 'app/create/create.html',
        controller: 'CreateCtrl',
        controllerAs: 'ctrl',
        resolve: {
          stuff: function() {
            return null;
          }
        }
      })
      .state('root.view', {
        url: '/detail{uri:path}',
        params: {
          uri: {
            squash: false,
            value: null
          }
        },
        templateUrl: 'app/detail/detail.html',
        controller: 'DetailCtrl',
        controllerAs: 'ctrl',
        resolve: {
          doc: function(MLRest, $stateParams) {
            var uri = $stateParams.uri;
            return MLRest
              .getDocument(uri, { format: 'json', transform: 'data-to-html-display' })
              .then(function(response) {
                return response;
              });
          }
        }
      })
      .state('root.profile', {
        url: '/profile',
        templateUrl: 'app/user/profile.html',
        controller: 'ProfileCtrl',
        controllerAs: 'ctrl'
      })
      .state('root.login', {
        url: '/login?state&params',
        templateUrl: 'app/login/login-full.html',
        controller: 'LoginFullCtrl',
        controllerAs: 'ctrl'
      })
      .state('root.setup', {
        url: '/setup',
        templateUrl: 'app/setup/index.html',
        controller: 'SetupCtrl',
        controllerAs: 'ctrl'
      })
      .state('root.new-report', {
        url: '/new-report',
        templateUrl: 'app/views/new-report.html',
        controller: 'NewReportCtrl'
      })
      .state('root.analytics-dashboard', {
        url: '/analytics-dashboard',
        templateUrl: 'app/views/dashboard.html',
        controller: 'SidebarCtrl'
      })
      .state('root.analytics-dashboard.home', {
        url: '/home',
        templateUrl: 'app/views/home.html',
        controller: 'HomeCtrl'
      })
      .state('root.analytics-dashboard.designer', {
        url: '/designer{uri:path}',
        templateUrl: 'app/views/designer.html',
        controller: 'ReportDesignerCtrl',
        resolve: {
          ReportData: function($stateParams, ReportService) {
            //MarkLogic.Util.showLoader();
            var uri = $stateParams.uri;
            return ReportService.getReport(uri).then(function(response) {
              //MarkLogic.Util.hideLoader();
              return response;
            });
          }
        }
      })
      .state('root.analytics-dashboard.remover', {
        url: '/remover{uri:path}',
        templateUrl: 'app/views/remover.html',
        controller: 'ReportRemoverCtrl'
      })
      .state('root.analytics-dashboard.editor', {
        url: '/editor{uri:path}',
        templateUrl: 'app/views/editor.html',
        controller: 'ReportEditorCtrl',
        resolve: {
          ReportData: function($stateParams, ReportService) {
            //MarkLogic.Util.showLoader();
            var uri = $stateParams.uri;
            return ReportService.getReport(uri).then(function(response) {
              //MarkLogic.Util.hideLoader();
              return response;
            });
          }
        }
      });
  }
}());
