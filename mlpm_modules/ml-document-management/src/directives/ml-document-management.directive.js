(function () {
    'use strict';
    var angular = window.angular;
    var app = angular.module('ml.document-management');
    /**
    * See http://stackoverflow.com/questions/14430655/recursion-in-angular-directives
    */
    app
      .factory('RecursionHelper', ['$compile', function($compile){
        return {
          /**
           * Manually compiles the element, fixing the recursion loop.
           * @param element
           * @param [link] A post-link function, or an object with function(s) registered via pre and post properties.
           * @returns An object containing the linking functions.
           */
          compile: function(element, link){
            // Normalize the link parameter
            if(angular.isFunction(link)){
              link = { post: link };
            }

            // Break the recursion loop by removing the contents
            var contents = element.contents().remove();
            var compiledContents;
            return {
              pre: (link && link.pre) ? link.pre : null,
              /**
               * Compiles and re-adds the contents
               */
              post: function(scope, element){
                // Compile the contents
                if(!compiledContents){
                  compiledContents = $compile(contents);
                }
                // Re-add the compiled contents to the element
                compiledContents(scope, function(clone){
                  element.append(clone);
                });

                // Call the post-linking function, if any
                if(link && link.post){
                  link.post.apply(null, arguments);
                }
              }
            };
          }
        };
      }]);

    app
      .service('directoryExplorerService', DirectoryExplorerService)
      .directive('mlDirectoryExplorer', DirectoryExplorerDirective);

    DirectoryExplorerService.$inject = [ '$rootScope', '$http'];
    function DirectoryExplorerService($rootScope, $http) {
      var service = {};

      service.getDirectoryContents = function(dirName) {
        return $http.get('/v1/resources/directory-list', {
          'params': {
            'rs:directory':  dirName
          }
        })
        .then(function(resp) {
          return resp.data;
        });
      };

      service.getFileDetails = function(fileUri) {
        return $http.get('/v1/resources/directory-list', {
          'params': {
            'rs:file':  fileUri
          }
        })
        .then(function(resp) {
          return resp.data;
        });
      };

      service.createDirectory = function(dirPath) {
        return $http.post('/v1/resources/directory-list', null, {
          params: {
            'rs:directory-path':  dirPath
          }
        });
      };

      return service;
    }

    DirectoryExplorerDirective.$injector = [
      'directoryExplorerService',
      'dlsService',
      'mlUploadService',
      'RecursionHelper',
      'userService',
      '$location',
      '$q',
      '$state',
      '$stateParams'
    ];
    function DirectoryExplorerDirective(
      directoryExplorerService,
      dlsService,
      mlUploadService,
      RecursionHelper,
      userService,
      $location,
      $q,
      $state,
      $stateParams
    ) {
      function reloadFileDetails(docMeta) {
        directoryExplorerService.getFileDetails(docMeta.document).then(
          function(data) {
            angular.extend(docMeta, data);
          }
        );
      }
      var link = function(scope, ele, attr, transclude) {
          scope.user = userService.currentUser() || {};
          scope.model = {};
          scope.files = [];

          scope.submitDirectory = function() {
            var dirName = scope.model.newDirectoryName;
            var fullDirUri = (scope.subUri || '/') +
              dirName + '/';
            directoryExplorerService.createDirectory(
              fullDirUri
            ).then(function() {
              scope.$createDirectory = false;
              scope.directories.push({
                'uri': fullDirUri,
                'name': dirName
              });
              scope.directories.sort(function(a, b) {
                var nameA = a.name.toUpperCase(); // ignore upper and lowercase
                var nameB = b.name.toUpperCase(); // ignore upper and lowercase
                if (nameA < nameB) {
                  return -1;
                }
                if (nameA > nameB) {
                  return 1;
                }
                // names must be equal
                return 0;
              });
            });
          };

          scope.createDirectory = function() {
            scope.$createDirectory = true;
          };

          scope.closeDirectory = function(directory) {
            directory.$open = false;
          };

          scope.openDirectory = function(directory) {
            directory.$open = true;
          };

          ele = angular.element(ele);

          var fileInp = ele.find('input[type="file"]:first');

          scope.uploadFile = function(evt) {
            fileInp.click();
            evt.stopPropagation();
          };

          scope.$watch(function() {
            return userService.currentUser();
          },
          function(newVal) {
            if (newVal && newVal.name) {
              scope.user = userService.currentUser();
            }
          }, true);

          directoryExplorerService
            .getDirectoryContents(
              scope.subUri
            )
            .then(function (data) {
              scope.directories = data.directories;
              scope.dirFiles = data.files;
            });

          var dropzone = ele;

          if (ele.parent('.parent-directory').length) {
            dropzone = ele.parent('.parent-directory');
          }

          // clicking the dropzone is like clicking the file input
          ele
            .on('drop',
              function(e) {
                return mlUploadService.dropFiles(e, dropzone, scope);
              })
            .on('dragenter dragleave dragover',
              function(e) {
                return mlUploadService.dzHighlight(e, dropzone);
              });
          fileInp
            .on('change',
              function(e) {
                mlUploadService.dropFiles(e, ele, scope);
              });
          scope.$watch(function() {
            return scope.files[0] ? scope.files[0].done : false;
          }, function(newVal) {
            if (newVal) {
              var fileName = scope.files[0].name;
              scope.files.length = 0;
              var matchingFile = null;
              angular.forEach(scope.dirFiles, function(file) {
                if (!matchingFile && file.name === fileName) {
                  matchingFile = file;
                }
              });
              if (!matchingFile) {
                matchingFile = { 
                  document: scope.subUri + fileName,  
                  fileName: fileName
                };
                scope.dirFiles.push(matchingFile);
                scope.dirFiles.sort(function(a, b) {
                  var nameA = a.fileName.toUpperCase(); // ignore upper and lowercase
                  var nameB = b.fileName.toUpperCase(); // ignore upper and lowercase
                  if (nameA < nameB) {
                    return -1;
                  }
                  if (nameA > nameB) {
                    return 1;
                  }
                  // names must be equal
                  return 0;
                });
              }
              reloadFileDetails(matchingFile);
            }
          });
          scope.model.archiveDocument = function(doc) {
            dlsService.archiveDocument(doc.document).then(function() {
              reloadFileDetails(doc);
            });
          };

          scope.model.checkoutDocument = function(doc) {
            dlsService.checkoutDocument(doc.document).then(function() {
              reloadFileDetails(doc);
            });
          };

          scope.model.checkinDocument = function(doc) {
            dlsService.checkinDocument(doc.document).then(function() {
              reloadFileDetails(doc);
            });
          };

          scope.model.documentVersionsModal = dlsService.openDocumentVersionsModal;

          scope.model.editDocumentModal = dlsService.editDocumentModal;
        };
      return {
        restrict: 'E',
        replace: true,
        transclude: true,
        scope: {
          subUri: '=',
          isEven: '?='
        },
        compile: function(element) {
          // Use the compile function from the RecursionHelper,
          // And return the linking function(s) which it returns
          return RecursionHelper.compile(element, link);
        },
        templateUrl: '/ml-document-management/templates/directory-explorer.html'
      };
    }
})();