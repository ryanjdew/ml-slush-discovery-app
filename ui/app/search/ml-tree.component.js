(function () {
  'use strict';

  MLTreeController.$inject = ['$filter', '$q', '$scope', '$timeout', 'MLRest'];
  function MLTreeController($filter, $q, $scope, $timeout, mlRest) {
    var ctrl = this;

    ctrl.compareKeys = ['title', 'id'];

    angular.extend(ctrl, {
      showEmpty:false
    });

    ctrl.getCount = function (node) {
      return node.count;
    };

    ctrl.clickFacetTitle = function (id) {
      ctrl.onClickFacetTitle({
        code: ctrl.code,
        id: id
      });
    };

    ctrl.shouldShowEmpty = function (node) {
      var count = ctrl.getCount(node);
      return count && count > 0;
    };

    ctrl.getNodes = function (node) {
      return node.nodes;
    };

    ctrl.requestNodes = function (node, query) {
      if (!node.nodes || query) {
        $timeout(function() {
          mlRest.extension('semanticsHierarchy', {
              method: 'POST',
              params: {
                'rs:parentIRI': node.iri
              },
              data: query
            }).then(function(response) {
              if (node.nodes) {
                angular.forEach(response.data.childTriples, function(childTriple) {
                  var existingChild = $filter('filter')(node.nodes, {'iri': childTriple.iri})[0];
                  if (existingChild) {
                    angular.extend(existingChild, childTriple);
                  } else {
                    node.nodes.push(childTriple);
                  }
                });
              } else {
                node.nodes = response.data.childTriples;
              }
            });
        });
      }
    };

    function binaryIndexOf(facets, name) {

      var minIndex = 0;
      var maxIndex = facets.length - 1;
      var currentIndex;
      var currentElement;

      while (minIndex <= maxIndex) {
        currentIndex = (minIndex + maxIndex) / 2 | 0;
        currentElement = facets[currentIndex];

        if (currentElement.name < name) {
          minIndex = currentIndex + 1;
        } else if (currentElement.name > name) {
          maxIndex = currentIndex - 1;
        } else {
          return currentIndex;
        }
      }

      return -1;
    }

    $scope.$on('refreshTaxonomyBrowser', function(event, args) {
      if (ctrl.topLevelNodes && ctrl.topLevelNodes.length) {
        angular.forEach(ctrl.topLevelNodes, function(node) {
          ctrl.requestNodes(node, args.query);
        });
      }
    });
  }

  angular.module('app.search')
    .component('mlTree', {
      templateUrl: 'app/search/ml-tree.html',
      controller: MLTreeController,
      bindings: {
        code: '=',
        suggestionsList: '=',
        facetValues: '=',
        hash: '=',
        topLevelNodes: '=',
        onClickFacetTitle: '&'
      }
    });


})();
