function filterContent(context, params, content) {
  // Note that content is document node, not a JavaScript object.
  if (content.documentFormat == 'JSON') {
    // If content is a JSON document, you must call toObject on it 
    // before you can manipulate the content as a JavaScript object 
    // or modify it.
    var result = content.toObject();
    var keys = Object.keys(result);

    keys.forEach(function(key) {
      if (key !== 'snippet-format' &&
          key !== 'total' &&
          key !== 'start' &&
          key !== 'page-length' &&
          key !== 'metrics') {
        if (!params[key]) {
          delete result[key];
        }
      }
    });

    return result;
  } else if (content.documentFormat == 'XML') {
    var result = {};
    var nodes = content.root.childNodes;

    for (var i = 0; i < nodes.length; i++) {
      var node = nodes[i];
      var key = node.localname;
      if (params[key]) {
        if (node.nodeType === 1) {
          var children = node.childNodes;
          var valueFound = false;
          for (var j = 0; j < children.length; j++) {
            var child = children[j];
            if (child.nodeType === 3) {
              var value = child.nodeValue;
              if (params[key] === 'int' || params[key] === 'decimal') {
                if (isNaN(value)) {
                  result[key] = null;
                } else {
                  result[key] = parseFloat(value);
                }
              } else {
                result[key] = value;
              }

              valueFound = true;
              break;
            }
          }
          if (!valueFound) {
            result[key] = null;
          }
        }
      }
    }

    return result;
  } else {
    return content;
  }
};

exports.transform = filterContent;