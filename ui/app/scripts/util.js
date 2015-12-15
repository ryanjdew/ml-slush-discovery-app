/*
 * @(#)util.js
 */

/*
 * Author: Jianmin Liu
 * Created: 2015/07/20
 */

var MarkLogic;

(function(MarkLogic) {
  (function(Util) {
    function parseMultiPart(body, contentType) {
      // Examples for content types:
      // multipart/mixed; boundary=ML_BOUNDARY_7372759131301359002
      var contentTypeLen = contentType.length;
      var boundary = null;
  
      if (15 <= contentTypeLen && contentType.substr(0, 15) === 'multipart/mixed') {
        boundary = contentType.replace(/^multipart.mixed\s*;\s*boundary\s*=\s*([^\s;]+)([\s;].*)?$/, '$1');
        if (boundary.length === contentTypeLen) {
          // error: multipart/mixed response without boundary
          return null;
        }
      }

      // Parse Content-Disposition header string.
      function parseContentDisposition(str) {
        var qescRegExp = /\\([\u0000-\u007f])/g;
        var params = {};
        var parts = str.split(';');

        for (var i = 0; i < parts.length; i++) {
          var part = parts[i].trim();
          var segments = part.split('=');
          if (segments.length === 2) {
            var key = segments[0];
            var value = segments[1];
            if (value[0] === '"') {
              // remove quotes and escapes
              value = value.substr(1, value.length - 2).replace(qescRegExp, '$1');
            }
            params[key] = value;
          }
        }

        return params;
      }

      // \r\n is part of the boundary.
      var boundary = '\r\n--' + boundary;
      var s = body;

      // Prepend what has been stripped by the body parsing mechanism.
      s = '\r\n' + s;

      var parts = s.split(new RegExp(boundary));
      var docs = [];
      var metadata = null;

      // First part is a preamble, last part is closing '--'
      for (var i = 1; i < parts.length-1; i++) {
        var subparts = parts[i].split('\r\n\r\n');
        var headers = subparts[0].split('\r\n');

        for (var j = 1; j < headers.length; j++) {
          var header = headers[j];
          var segments = header.split(':');
          if (segments.length === 2) {
            if ('content-disposition' === segments[0].toLowerCase()) {
              var params = parseContentDisposition(segments[1]);
              var uri = params['filename'];
              if (uri) {
                var doc = JSON.parse(subparts[1]);
                doc.uri = uri;
                docs.push(doc);
                break;
              } else {
                metadata = JSON.parse(subparts[1]);
              }
            }
          }
        }
      }
      return {results: docs, metadata: metadata};
    }
    Util.parseMultiPart = parseMultiPart;

    function showLoader() {
      $('#loader').css('display', 'block');
    }
    Util.showLoader = showLoader;

    function hideLoader() {
      $('#loader').css('display', 'none');
    }
    Util.hideLoader = hideLoader;

    function assignToScope($scope, obj) {
      for(var key in obj) {
        $scope[key] = obj[key];
      }
    }
    Util.assignToScope = assignToScope;

    function showModal(dialogId) {
      jQuery(dialogId).modal({'backdrop' : 'static'});
    }
    Util.showModal = showModal;

    function hideModal(dialogId) {
      jQuery(dialogId).modal('hide');
    }
    Util.hideModal = hideModal;

    function getSessionProperty(name) {
      return window.sessionStorage.getItem(name);
    }
    Util.getSessionProperty = getSessionProperty;

    function setSessionProperty(name, value) {
      window.sessionStorage.setItem(name, value);
    }
    Util.setSessionProperty = setSessionProperty;

    // Get the extension from a filename.
    function getFileExtension(filename) {
      var pos = filename.lastIndexOf('.');
      if (pos != -1)
        return filename.substring(pos+1);
      else // if '.'' never occurs
        return '';
    }
    Util.getFileExtension = getFileExtension;

    // Get the filename from a file selection.
    function getInputFilename(pathname) {
      var pos = pathname.lastIndexOf('/');
      if (pos == -1)
        pos = pathname.lastIndexOf('\\');
      if (pos != -1)
        return pathname.substring(pos+1);
      else
        return pathname;
    }
    Util.getInputFilename = getInputFilename;

  })(MarkLogic.Util || (MarkLogic.Util = {}));
  var Util = MarkLogic.Util;
})(MarkLogic || (MarkLogic = {}));

var CONTAINER_BORDER = 8;
var LC_INITIAL_WIDTH = 250;
var SPLITTER_WIDTH   = 5;

jQuery(window).resize(function() {
    resizeViewPort();
});

function resizeViewPort() {
    var win = jQuery(window);
    var height = win.height();
    var width = $('#analytics-dashboard').width(); // win.width()

    var mainContainerHeight = height - 220;
    var workspaceContainerHeight = mainContainerHeight - 10;
    var sidebarHeight = workspaceContainerHeight - 2;

    jQuery("#analytics-dashboard").css("height", mainContainerHeight);

    jQuery("#main-container").css("height", mainContainerHeight);

    jQuery(".left-column").css({
        width: LC_INITIAL_WIDTH
    });

    jQuery(".splitter").css({
        left: LC_INITIAL_WIDTH,
        width: SPLITTER_WIDTH
    });

    jQuery(".right-column").css({
        left: LC_INITIAL_WIDTH+SPLITTER_WIDTH,
        width: width-LC_INITIAL_WIDTH-SPLITTER_WIDTH-CONTAINER_BORDER+1
    });

    // Resize the right-side container
    jQuery("#workspace-container").css("height", workspaceContainerHeight);

    // Resize the left-side container
    jQuery("#sidebar-container").css("height", workspaceContainerHeight);
    jQuery("#sidebar").css("height", sidebarHeight);
}

function setupWizard() {
    resizeViewPort();

    jQuery(".splitter").drag("start", function() {
        // Hide any iframe
    }).drag("end", function() {
        // Show the iframe
    }).drag(function(ev, dd) {
        var win = $('#analytics-dashboard'); // jQuery(window);
        // 13=8+5 where 8 is the wizard container 
        // border width, 5 is the splitter's width.
        var rightWidth = win.width() - dd.offsetX - 13;
        if (dd.offsetX < 2)
            return;

        // Move the splitter horizontally
        jQuery(this).css({
            left: dd.offsetX
        });

        // Resize the left column horizontally
        jQuery(".left-column").css({
            width: dd.offsetX
        });

        // Resize the right column horizontally
        jQuery(".right-column").css({
            left: dd.offsetX+5,
            width: rightWidth
        });
    }, {relative: true});
}

/* end of util.js */
