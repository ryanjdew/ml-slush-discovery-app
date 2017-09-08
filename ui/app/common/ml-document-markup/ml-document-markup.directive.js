(function() {
  'use strict';

  angular.module('ml.documentMarkup')
    .directive('mlDocumentMarkup', MLDocumentMarkup);

  MLDocumentMarkup.$inject = ['$compile', '$http', '$timeout', '$window'];

  function MLDocumentMarkup($compile, $http, $timeout, $window) {
    var mouseDownTimeout = null;
    return {
      restrict: 'E',
      transclude: true,
      scope: { documentUri: '@' },
      template: '<div>' +
        '<ng-transclude></ng-transclude>' +
        '</div>',
      link: function(scope, element) {
        element.on(
          'keyup mouseup',
          function() {
            var sel = $window.getSelection();
            expandSelectionToWords(sel);
            var selectionText = sel.toString();
            if (selectionText.length) {
              var ranges = [];
              for (var i = 0; i < sel.rangeCount; i++) {
                var range = sel.getRangeAt(i);
                ranges.push(range);
                range.detach();
              }
              angular.forEach(ranges, function(range) {
                var startNode = $(range.startContainer)[0];
                var startOffset = range.startOffset;
                var endNode = $(range.endContainer)[0];
                var endOffset = range.endOffset;
                var allNodes = $(startNode).nextUntil(endNode).toArray();
                allNodes.unshift(startNode);
                allNodes.push(endNode);
                var alteredNodes = [];
                var startIndex = 0;
                var lastIndex = allNodes.length - 1;
                angular.forEach(allNodes, function(node, nodePosition) {
                  var origText = node.textContent;
                  var sOffset = (nodePosition === startIndex) ? startOffset : 0;
                  var eOffset = (nodePosition === lastIndex) ? endOffset : origText.length;
                  var newNode =
                      $(
                        '<span>' +
                        origText.substring(0, sOffset) +
                        '<mark " ' +
                        ((nodePosition === 0) ? 'uib-tooltip="Hello!" tooltip-is-open="true"' : '') + '>' +
                        origText.substring(sOffset, eOffset) +
                        '</mark>' +
                        origText.substring(eOffset) +
                        '</span>'
                      )[0];
                  alteredNodes.push(newNode);
                });
                var parentNode = startNode.parentNode;
                angular.forEach(allNodes, function(node, nodePosition) {
                  var alteredNode = alteredNodes[nodePosition];
                  var pNode = node.parentNode;
                  pNode.insertBefore(alteredNode, node);
                  pNode.removeChild(node);
                });
                $compile(angular.element(parentNode))(scope);
              });
              sel.removeAllRanges();
            }
          });
      }
    };
  }

  function expandSelectionToWords(sel) {
    if (!sel.isCollapsed) {
      // Detect if selection is backwards
      var range = document.createRange();
      range.setStart(sel.anchorNode, sel.anchorOffset);
      range.setEnd(sel.focusNode, sel.focusOffset);
      var backwards = range.collapsed;
      range.detach();

      // modify() works on the focus of the selection
      var endNode = sel.focusNode,
        endOffset = sel.focusOffset;
      sel.collapse(sel.anchorNode, sel.anchorOffset);

      var direction = [];
      if (backwards) {
        direction = ['backward', 'forward'];
      } else {
        direction = ['forward', 'backward'];
      }

      sel.modify('move', direction[0], 'character');
      sel.modify('move', direction[1], 'word');
      sel.extend(endNode, endOffset);
      sel.modify('extend', direction[1], 'character');
      sel.modify('extend', direction[0], 'word');
    } else if ((sel = document.selection) && sel.type != 'Control') {
      var textRange = sel.createRange();
      if (textRange.text) {
        textRange.expand('word');
        // Move the end back to not include the word's trailing space(s),
        // if necessary
        while (/\s$/.test(textRange.text)) {
          textRange.moveEnd('character', -1);
        }
        textRange.select();
      }
    }
  }
}());
