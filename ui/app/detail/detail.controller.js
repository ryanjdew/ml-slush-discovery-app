(function() {
  'use strict';
  angular.module('app.detail')
    .controller('DetailCtrl', DetailCtrl);

  DetailCtrl.$inject = ['$scope', 'doc', 'RegisteredComponents', '$stateParams', '$sce'];

  function DetailCtrl($scope, doc, RegisteredComponents, $stateParams, $sce) {
    var ctrl = this;
    if (doc.data && doc.data.xml) {
      ctrl.contentType = 'application/xml';
    } else if (doc.data && doc.data.json) {
      ctrl.contentType = 'application/json';
    }
    ctrl.pageExtensions = RegisteredComponents.pageExtensions();
    ctrl.hasPageExtensions = false;

    $scope.$watch(function() {
      return _.filter(ctrl.pageExtensions, function(val) {
        return val.active;
      }).length;
    },function(newVal) {
      ctrl.hasPageExtensions = newVal > 0;
    });

    var uri = $stateParams.uri;
    var encodedUri = encodeURIComponent(uri);
    var format = 'binary';
    var contentType = doc.headers('content-type');

    if (/xml/.test(contentType)) {
      format = 'xml';
    } else if (/json/.test(contentType)) {
      format = 'json';
    }

    angular.extend(ctrl, {
      doc: doc.data,
      uri: uri,
      contentType: contentType,
      viewUri: '/v1/documents?uri=' + encodedUri + '&format=' + format,
      downloadUri: '/v1/documents?uri=' + encodedUri + '&format=binary&transform=download'
    });
  }
}());
