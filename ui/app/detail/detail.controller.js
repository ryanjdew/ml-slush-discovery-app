(function() {
  'use strict';
  angular.module('app.detail')
    .controller('DetailCtrl', DetailCtrl);

  DetailCtrl.$inject = ['$scope', 'doc', 'RegisteredComponents', '$stateParams'];

  function DetailCtrl($scope, doc, RegisteredComponents, $stateParams) {
    var ctrl = this;

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

    ctrl.defaultTab = 0;

    ctrl.html = doc.data.html;

    var x2js = new X2JS();
    if (doc.data.json) {
      /*jshint camelcase: false */
      ctrl.xml = vkbeautify.xml(x2js.json2xml_str(doc.data.json));
      ctrl.json = doc.data.json;
      ctrl.type = 'json';
    } else if (doc.data.xml) {
      ctrl.xml = vkbeautify.xml(doc.data.xml);
      /*jshint camelcase: false */
      ctrl.json = x2js.xml_str2json(doc.data.xml);
      if (doc.data.xml.indexOf('binary-details') > -1) {
        var parsedXML = jQuery.parseXML(doc.data.xml);
        ctrl.binaryFilePath = parsedXML.getElementsByTagName('binary-file-location')[0].childNodes[0].nodeValue;
        ctrl.binaryContentType = parsedXML.getElementsByTagName('binary-content-type')[0].childNodes[0].nodeValue;
        ctrl.type = 'binary';
        if (/image\//.test(ctrl.binaryContentType)) {
          ctrl.binaryType = 'image';
        } else if (/application\/pdf/.test(ctrl.binaryContentType)) {
          ctrl.binaryType = 'pdf';
        } else {
          ctrl.binaryType = 'other';
        }
        var html = parsedXML.getElementsByTagName('html')[0];
        var metaElements = html.getElementsByTagName('meta');
        var halfWayPoint = Math.floor(metaElements.length / 2);
        if (metaElements.length > 0) {
          var i18n = {
            'content-type': 'Content Type',
            'size': 'Size',
            'NormalizedDate': 'Date Time'
          };
          var metaHighlights = ['content-type', 'NormalizedDate', 'size', 'Word_Count', 'Typist'];
          ctrl.meta = [{}, {}];
          var metaCount = 0,
            metaHighlightsCount = 0;

          ctrl.metaHighlights = [{}, {}];
          angular.forEach(metaElements, function(metaEl, index) {
            var metaObj;
            if (metaHighlights.indexOf(metaEl.getAttribute('name')) > -1) {
              metaObj = ctrl.metaHighlights[metaHighlightsCount % 2];
              metaHighlightsCount++;
            } else {
              metaObj = ctrl.meta[metaCount % 2];
              metaCount++;
              ctrl.hasMeta = true;
            }
            var metaName = i18n[metaEl.getAttribute('name')] || metaEl.getAttribute('name') || metaEl.getAttribute('http-equiv')
              .replace(/([a-z])([A-Z])/g, '$1 $2')
              .replace(/(\-|\_)/g, ' ');
            metaObj[metaName] = metaEl.getAttribute('content') || ' ';
          });
        }
        var body = html.getElementsByTagName('body')[0];
        if (body) {
          ctrl.html = body.innerHTML;
        }
      } else {
        ctrl.type = 'xml';
      }
    } else {
      ctrl.type = 'text';
    }

    angular.extend(ctrl, {
      doc: doc.data,
      uri: uri
    });
  }
}());
