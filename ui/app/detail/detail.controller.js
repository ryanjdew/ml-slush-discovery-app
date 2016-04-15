(function() {
  'use strict';
  angular.module('app.detail')
    .controller('DetailCtrl', DetailCtrl);

  DetailCtrl.$inject = ['doc', '$stateParams'];

  function DetailCtrl(doc, $stateParams) {
    var ctrl = this;

    var uri = $stateParams.uri;

    var contentType = doc.headers('content-type');

    ctrl.defaultTab = true;

    var x2js = new X2JS();
    /* jscs: disable */
    if (contentType.lastIndexOf('application/json', 0) === 0) {
      /*jshint camelcase: false */
      ctrl.xml = vkbeautify.xml(x2js.json2xml_str(doc.data));
      ctrl.json = doc.data;
      ctrl.type = 'json';
    } else if (contentType.lastIndexOf('application/xml', 0) === 0) {
      if (doc.data.indexOf('binary-details') > -1) {
        var parsedXML = jQuery.parseXML(doc.data);
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
            var metaName = i18n[metaEl.getAttribute('name')] || metaEl.getAttribute('name')
              .replace(/([a-z])([A-Z])/g, '$1 $2')
              .replace(/(\-|\_)/g, ' ');
            metaObj[metaName] = metaEl.getAttribute('content') || ' ';
          });
        }
        var body = html.getElementsByTagName('body')[0];
        if (body) {
          ctrl.html += body.innerHTML;
        }
      } else {
        ctrl.type = 'xml';
      }
      ctrl.xml = vkbeautify.xml(doc.data);
      /*jshint camelcase: false */
      ctrl.json = x2js.xml_str2json(doc.data);
      /* jscs: enable */
    } else if (contentType.lastIndexOf('text/plain', 0) === 0) {
      ctrl.xml = doc.data;
      ctrl.json = { 'Document': doc.data };
      ctrl.type = 'text';
    } else if (contentType.lastIndexOf('application', 0) === 0) {
      ctrl.xml = 'Binary object';
      ctrl.json = { 'Document type': 'Binary object' };
      ctrl.type = 'binary';
    } else {
      ctrl.xml = 'Error occured determining document type.';
      ctrl.json = { 'Error': 'Error occured determining document type.' };
    }

    angular.extend(ctrl, {
      doc: doc.data,
      uri: uri
    });
  }
}());
