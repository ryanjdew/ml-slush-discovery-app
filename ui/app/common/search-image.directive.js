(function () {
  'use strict';

  angular.module('app.common')
    .directive('searchImage', function() {
      return {
        restrict: 'E',
        scope: {
          docType: '=docType',
          imageType: '=imageType'
        },
        template: '<i class="fa {{ className }}">&nbsp;</i>',
        link: function (scope, element) {
          if (scope.imageType && 'search' === scope.imageType) {
            scope.className = 'image-search ';
          } else {
            scope.className = 'image-details ';
          }

          if (/ms\-?word|officedocument\.wordprocessingml|\.docx?\./.test(scope.docType)) {
            scope.className += 'fa-file-word-o';
          } else if (/ms\-?excel|officedocument\.spreadsheetml|\.xlsx?\./.test(scope.docType)) {
            scope.className += 'fa-file-excel-o';
          } else if (/ms\-?powerpoint|officedocument\.presentationml|\.ppt\./.test(scope.docType)) {
            scope.className += 'fa-file-powerpoint-o';
          } else if (/application\/pdf|\.pdf\./.test(scope.docType)) {
            scope.className += 'fa-file-pdf-o';
          } else if (/audio\/|\.mp3\.|\.ogg\.|\.aac\.|\.wav\./.test(scope.docType)) {
            scope.className += 'fa-music';
          } else if (/video\/|\.mp4\.|\.m4v\.|\.mov\.|\.mpe?g\.|\.wmv\./.test(scope.docType)) {
            scope.className += 'fa-video-camera';
          } else if (/image\/|\.bmp\.|\.gif\.|\.jpe?g\.|\.png\.|\.tiff\./.test(scope.docType)) {
            scope.className += 'fa-picture-o';
          } else {
            scope.className += 'fa-file';
          }
        }
      };
    });
}());

