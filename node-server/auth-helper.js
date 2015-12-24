/*jshint node: true */

'use strict';

var config = require('../gulp.config')();
var http = require('http');
var www_authenticate = require('www-authenticate');
var q = require('q');
var _ = require('underscore');

var defaultOptions = {
  authHost: process.env.ML_HOST || config.marklogic.host,
  authPort: process.env.ML_PORT || config.marklogic.httpPort,
  authUser: process.env.ML_APP_USER || config.marklogic.user,
  authPassword: process.env.ML_APP_PASS || config.marklogic.password,
  challengeMethod: 'HEAD',
  challengePath: '/v1/ping'
};

var authorizationFunctions = {};

function createAuthenticator(session, host, port, user, password, challenge) {
  var authenticator = www_authenticate.call(null, user, password)(challenge);
  if (!session.authenticator) {
    session.authenticator = {};
  }
  session.authenticator[user + ':' + host + ':' + port] = authenticator;
  if (!authorizationFunctions[host + ':' + port]) {
    authorizationFunctions[host + ':' + port] = authenticator.authorize;
  }
  return authenticator;
}

function getAuthenticator(session, user, host, port) {
  if (!session.authenticator) {
    return null;
  }
  return session.authenticator[user + ':' + host + ':' + port];
}

function getAuthorizationFunction(host, port) {
  return authorizationFunctions[host + ':' + port];
}

function getAuthorization(session, reqMethod, reqPath, authOptions) {
  reqMethod = reqMethod || 'GET';
  var authorization = null;
  var d = q.defer();
  var mergedOptions = _.extend({}, defaultOptions, authOptions || {});
  var authenticator = getAuthenticator(session, mergedOptions.authUser, mergedOptions.authHost, mergedOptions.authPort);
  if (authenticator) {
    authorization = getAuthorizationFunction(mergedOptions.authHost, mergedOptions.authPort)
        .call(authenticator, reqMethod, reqPath);
    d.resolve(authorization);
  } else {
    var challengeReq = http.request({
      hostname: mergedOptions.authHost,
      port: mergedOptions.authPort,
      method: mergedOptions.challengeMethod,
      path: mergedOptions.challengePath
    }, function(response) {
      var statusCode = response.statusCode;
      var challenge = response.headers['www-authenticate'];
      var hasChallenge = (challenge != null);
      if (statusCode === 401 && hasChallenge) {
        authenticator = createAuthenticator(
          session, mergedOptions.authHost, mergedOptions.authPort, mergedOptions.authUser, mergedOptions.authPassword, challenge
        );

        authorization = getAuthorizationFunction(mergedOptions.authHost, mergedOptions.authPort)
            .call(authenticator, reqMethod, reqPath);
        d.resolve(authorization);
      } else {
        session.authenticator = {};
        d.reject();
      }
    });
    challengeReq.end();
  }
  return d.promise;
}

var authHelper = {
  getAuthorization: getAuthorization
};

module.exports = authHelper;
