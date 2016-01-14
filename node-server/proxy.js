/*jshint node: true */

'use strict';

var router = require('express').Router();
var http = require('http');
// Analytics Dashboard
var querystring = require('querystring');
// end of Analytics Dashboard
var manageML = require('./manage-ml');
var authHelper = require('./auth-helper');

var options = require('./options');

// ==================================
// MarkLogic REST API endpoints
// ==================================
// For any other GET request, proxy it on to MarkLogic.
router.get('*', function(req, res) {
  noCache(res);
  proxy(req, res);
});

router.put('*', function(req, res) {
  noCache(res);
  // For PUT requests, require authentication
  if (req.session.user === undefined) {
    res.status(401).send('Unauthorized');
  } else if (req.path === '/v1/documents' &&
    req.query.uri.match('/api/users/') &&
    req.query.uri.match(new RegExp('/api/users/[^(' + req.session.user.name + ')]+.json'))) {
    // The user is try to PUT to a profile document other than his/her own. Not allowed.
    res.status(403).send('Forbidden');
  } else {
    if (req.path === '/v1/documents' && req.query.uri.match('/users/')) {
      // TODO: The user is updating the profile. Update the session info.
    }
    proxy(req, res);
  }
});

// Don't require authentication for POST search requests
router.post('/search*', function(req, res) {
  noCache(res);
  proxy(req, res);
});

// Don't require authentication for POST value requests
router.post('/value*', function(req, res) {
  noCache(res);
  proxy(req, res);
});

// Require authentication for other POST requests
router.post('*', function(req, res) {
  noCache(res);
  if (req.session.user === undefined) {
    res.status(401).send('Unauthorized');
  } else {
    proxy(req, res);
  }
});

// (#176) Require authentication for DELETE requests
router.delete('*', function(req, res) {
  noCache(res);
  if (req.session.user === undefined) {
    res.status(401).send('Unauthorized');
  } else {
    proxy(req, res);
  }
});

// Generic proxy function used by multiple HTTP verbs
function proxy(req, res) {
  req.session = req.session || {};
  var user = req.session.user;
  var origUrl = req.originalUrl;
  var separator = /\?/.test(origUrl) ? '&' : '?';
  var databaseParam;
  if (/^\/(alert|documents|graphs|keyvalue|qbe|resources|search|suggest|values)/.test(req.path)) {
    databaseParam = separator + 'database=' + manageML.database();
  }
  if (databaseParam) {
    origUrl = origUrl + databaseParam;
  }
  var queryString = origUrl.split('?')[1];
  var path = '/v1' + req.path + (queryString ? '?' + queryString : '');
  console.log(
    req.method + ' ' + req.path + ' proxied to ' +
    options.mlHost + ':' + options.mlHttpPort + path);
  // Analytics Dashboard
  if (queryString) {
    var params = querystring.parse(queryString);
    var category = params['category'];
    // Can use the 'category' parameter only with multipart/mixed accept.

    if (category) {
      var multipartHeader = 'multipart/mixed';
      if (req.headers['accept']) {
        req.headers['accept'] = multipartHeader;
      } else if (req.headers['Accept']) {
        req.headers['Accept'] = multipartHeader;
      }
    }
  }
  // end of Analytics Dashboard
  var reqOptions = {
      hostname: options.mlHost,
      port: options.mlHttpPort,
      method: req.method,
      path: path,
      headers: req.headers
    };
  var makeRequest = function(authorization) {
    if (authorization) {
      reqOptions.headers.Authorization = authorization;
    }
    var mlReq = http.request(reqOptions, function(response) {

      res.statusCode = response.statusCode;

      // [GJo] (#67) forward all headers from MarkLogic
      for (var header in response.headers) {
        if (header !== 'www-authenticate') {
          res.header(header, response.headers[header]);
        }
      }

      response.on('data', function(chunk) {
        res.write(chunk);
      });
      response.on('end', function() {
        res.end();
      });
    });

    req.pipe(mlReq);
    req.on("end", function() {
      mlReq.end();
    });

    mlReq.on('error', function(e) {
      console.log('Problem with request: ' + e.message);
      res.statusCode = 500;
      res.end();
    });
  };
  authHelper.getAuthorization(req.session, reqOptions.method, reqOptions.path,
    {
      authHost: reqOptions.hostname || options.mlHost,
      authPort: reqOptions.port || options.mlHttpPort,
      authUser: user ? user.name : options.defaultUser,
      authPassword: user ? user.password : options.defaultPass
    }
  ).then(function(authorization) {
    makeRequest(authorization);
  }, function() {
    makeRequest(null);
  });
}

function noCache(response){
  response.append('Cache-Control', 'no-cache, must-revalidate');//HTTP 1.1 - must-revalidate
  response.append('Pragma', 'no-cache');//HTTP 1.0
  response.append('Expires', 'Sat, 26 Jul 1997 05:00:00 GMT'); // Date in the past
}

module.exports = router;
