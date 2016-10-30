(function() {
  'use strict';

  angular.module('ml.document-management')
    .factory('dlsService', DLSService)
    .controller('DLSModalController', DLSModalController)
    .filter('verionedFileName', function() {
      return function(input, version) {
        if (input && version) {
          return input.replace(/^(.*)\.([^\.]+)$/, '$1.v' + version + '.$2');
        }
        return input;
      };
    });

  DLSService.$inject = ['$http', '$modal', '$q'];
  function DLSService($http, $modal, $q) {

    var service = {
      openDLSModal: function(config) {
        return $modal.open({
          animation: true,
          templateUrl: '/ml-document-management/templates/dls.modal.html',
          controller: 'DLSModalController',
          size: 'lg',
          resolve: {
            config: function () {
              return config;
            }
          }
        }).result;
      },
      documentVersions: function(uri) {
        return $http.get('/v1/resources/dls-management', {
          params: {
            'rs:command': 'list-versions',
            'rs:uri': uri
          }
        }).then(function(resp) {
          return resp.data.versions;
        });
      },
      openDocumentVersionsModal: function(fileName, uri) {
        return service.documentVersions(uri).then(function(versions) {
          return service.openDLSModal({
            info: {
              title: fileName + ': Versions'
            },
            type: 'versions-list',
            versions: versions,
            fileName: fileName
          });
        });
      },
      editDocumentMetaModal: function(doc) {
        var editingDoc = doc || {};
        doc.role = doc.role || 'cp-analyst';
        if (!doc.metadata) {
          doc.metadata = [];
        }
        if (doc.metadata && !angular.isArray(doc.metadata)) {
          doc.metadata = [doc.metadata];
        }
        var roles = [];
        var currentRoleIndex = roles.map(function(v, i) {
          if (v.value === doc.currentUserRole) {
            return i;
          }
        }).filter(isFinite)[0];
        roles.splice(currentRoleIndex + 1);
        return service.openDLSModal({
          info: {
            title: (doc.fileName || 'New File') + ': Edit'
          },
          type: 'edit-doc',
          item: editingDoc,
          model: {
            roles: roles
          }
        });
      }
    };

    function dlsCommand(command, uri, annotation, body) {
      return $http.post('/v1/resources/dls-management', body, {
        params: {
          'rs:uri': uri,
          'rs:command': command,
          'rs:annotation': annotation
        }
      });
    }

    service.setPermissions = function(uri, role) {
      return dlsCommand('set-permissions', uri, null, { role: role });
    };

    service.archiveDocument = function(uri) {
      return $http.delete('/v1/resources/dls-management', {
        params: {
          'rs:uri': uri
        }
      });
    };

    service.checkoutDocument = function(uri) {
      return dlsCommand('checkout', uri);
    };

    service.checkinDocument = function(uri) {
      return dlsCommand('checkin', uri);
    };

    service.patchMetadata = function(newDocMeta, docUri, index) {
      var patchXml = '<rapi:patch xmlns:rapi="http://marklogic.com/rest-api">' +
        '<rapi:replace-insert select="/document-management:metadata">' +
        '<document-management:metadata>' +
        ( newDocMeta.title ?
          ('<document-management:title>' +
            newDocMeta.title +
          '</document-management:title>') : '') +
        ( newDocMeta.description ?
          ('<document-management:description>' +
            newDocMeta.description +
          '</document-management:description>'): '');
      if (newDocMeta.metadata) {
        patchXml += '<rapi:delete select="/case/associated-documents['+ index +']/metadata"  />';
        if (!angular.isArray(newDocMeta.metadata)) {
          newDocMeta.metadata = [newDocMeta.metadata];
        }
        angular.forEach(newDocMeta.metadata, function(val, i) {
          if (val) {
            patchXml += '<document-management:data>' +
              '<document-management:label>' + val.label + '</document-management:label>' +
              '<document-management:value>' + val.value + '</document-management:value>' +
              '</document-management:data>';
          }
        });
      }
      patchXml += '</document-management:metadata></rapi:replace-insert></rapi:patch>';
      return $http.patch('/v1/documents',
        patchXml,
        {
          headers: {
            'Content-Type': 'application/xml'
          },
          params: {
            uri: docUri,
            category: 'properties'
          }
        });
    };

    service.editDocumentModal = function(caseUri, doc, docs) {
      if (angular.isArray(docs)) {
        var docUri = doc.document;
        var index = doc.metaIndex;
        if (!doc.metaIndex) {
          angular.forEach(docs, function(val, i) {
            if (docUri === val.document) {
              index = i + 1;
            }
          });
        }
        if (index >= 1) {
          var oldDocRole = doc.role;
          service.editDocumentMetaModal(doc).then(function(newDocMeta) {
            if (newDocMeta && (newDocMeta.title || newDocMeta.description)) {
              service.patchMetadata(newDocMeta, caseUri, index).then(function() {
                  doc.title = newDocMeta.title;
                  doc.description = newDocMeta.description;
                  if (newDocMeta.role && newDocMeta.role !== oldDocRole) {
                    service.setPermissions(doc.document, newDocMeta.role);
                  }
                });
              }
            });
        }
      }
    };

    return service;
  }

  DLSModalController.$inject = ['$scope', '$modalInstance', 'config'];
  function DLSModalController($scope, $modalInstance, config) {
    angular.extend($scope, config);

    $scope.save = function () {
      $modalInstance.close($scope.item);
    };

    $scope.cancel = function () {
      $modalInstance.dismiss('cancel');
    };
  }
}());
