(function () {
  'use strict';

  angular.module('app.search')
    .directive('searchImage', function() {
      var validUpdatedContentStyles = [
        'application/msword',
        'application/vnd.ms-excel',
        'application/vnd.ms-powerpoint',
        'application/xml',
        'application/rtf',
        'application/pdf',
        'video/mov',
        'video/avi',
        'video/mpeg',
        'video/wmv',
        'image/bmp',
        'image/png',
        'image/jpeg',
        'image/jpg',
        'image/gif',
        'image/tiff',
        'audio/wma',
        'audio/mp3',
        'audio/wav',
        'audio/midi',
        'audio/mpeg'
      ];

      var cleanMimeType = function(mimeType) {
        if (mimeType) {
          var mimeTypeCleaned = mimeType.split('+', 1)[0];
          if (/ms\-?word|officedocument\.wordprocessingml|\.docx|\.doc/i.test(mimeTypeCleaned)) {
            mimeTypeCleaned = 'application/msword';
          } else if (/ms\-?excel|officedocument\.spreadsheetml|\.xlsx|\.xls/i.test(mimeTypeCleaned)) {
            mimeTypeCleaned = 'application/vnd.ms-excel';
          } else if (/ms\-?powerpoint|officedocument\.presentationml|\.ppt/i.test(mimeTypeCleaned)) {
            mimeTypeCleaned = 'application/vnd.ms-powerpoint';
          } else if (/^.*\.[A-Za-z0-9]{2,4}$/i.test(mimeTypeCleaned)) {
            var extension;
            if (/^.*\.[A-Za-z0-9]{2,4}\.xml$/i.test(mimeTypeCleaned)) {
              extension = mimeTypeCleaned.replace(/^.*\.([a-z0-9]{2,4})\.xml$/i, '$1');
            } else {
              extension = mimeTypeCleaned.replace(/^.*\.([a-z0-9]{2,4})$/i, '$1');
            }
            extension = extension.toLowerCase();
            if (validUpdatedContentStyles.indexOf('application/' + extension) > -1) {
              mimeTypeCleaned = 'application/' + extension;
            } else if (validUpdatedContentStyles.indexOf('audio/' + extension) > -1) {
              mimeTypeCleaned = 'audio/' + extension;
            } else if (validUpdatedContentStyles.indexOf('image/' + extension) > -1) {
              mimeTypeCleaned = 'image/' + extension;
            } else if (validUpdatedContentStyles.indexOf('video/' + extension) > -1) {
              mimeTypeCleaned = 'video/' + extension;
            }
          }
          return mimeTypeCleaned;
        } else {
          return '';
        }
      };

      return {
        restrict: 'E',
        scope: {
          docType: '=docType',
          imageType: '=imageType'
        },
        template:
          '<span>' +
            '<span ng-if="hasUpdatedIcon" class="document-type-icon {{className}}" ' +
            'document-content-type="{{docTypeCleaned}}">' +
            '</span>' +
          '<span ng-if="!hasUpdatedIcon" class="btn btn-primary btn-lg">' +
            '<i class="fa {{ className }}">&nbsp;</i></span>' +
          '</span>',
        link: function (scope, element) {
          var mimeTypeCleaned = cleanMimeType(scope.docType);
          scope.hasUpdatedIcon = /^text\/.*/.test(mimeTypeCleaned) || validUpdatedContentStyles.indexOf(mimeTypeCleaned) > -1;

          if (scope.hasUpdatedIcon) {
            scope.docTypeCleaned = mimeTypeCleaned;
            if (scope.imageType && 'search' === scope.imageType) {
              scope.className = 'document-type-icon-sm ';
            } else {
              scope.className = 'document-type-icon-md ';
            }
          } else {
            if (scope.imageType && 'search' === scope.imageType) {
              scope.className = 'image-search ';
            } else {
              scope.className = 'image-details ';
            }

            if (/application\/json|\.json$/.test(scope.docType)) {
              scope.className += 'extend-fa-json';
            } else if (/audio\//.test(scope.docType)) {
              scope.className += 'fa-music';
            } else if (/video\//.test(scope.docType)) {
              scope.className += 'fa-video-camera';
            } else if (/image\//.test(scope.docType)) {
              scope.className += 'fa-picture-o';
            } else {
              scope.className += 'fa-file';
            }
          }
        }
      };
    });
}());
