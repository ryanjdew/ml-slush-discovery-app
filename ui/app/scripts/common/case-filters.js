(function () {

  'use strict';

  angular.module('app')
  .filter('capitalize', Capitalize)
  .filter('wormToCamel', WormToCamel)
  .filter('splitCamel', SplitCamel)
  .filter('timeago', TimeAgo)
  .filter('extractFieldName', ExtractFieldName);

  function Capitalize() {
    return function(input) {
      if (input) {
        input = input[0].toUpperCase() + input.substr(1);
      }
      return input;
    };
  }

  function WormToCamel() {
    return function(input) {
      return input[0].toUpperCase() + input.substr(1).replace(/(\-\w)/g, function(match){return ' ' + match[1].toUpperCase();});
    };
  }

  function SplitCamel() {
    return function(input) {
      var c, uc, str = [], len = input.length;
      for (var i=0;i < len;i++) {
        c = input[i];
        uc = c.toUpperCase();
        // first one is always uppercase
        if (i === 0) {
          str.push(uc);
        // if it's uppercase then insert a space
        } else if (c === uc) {
          str.push(' ');
          str.push(uc);
        // otherwise just us it as-is
        } else {
          str.push(c);
        }
      }
      return str.join('');
    };
  }

  function TimeAgo() {
    return function(input) {
      return $.timeago(new Date(input));
    };
  }

  function ExtractFieldName() {
    return function(path) {
      return path.replace(/.*:([^:]+)$/, '$1');
    };
  }

}());
