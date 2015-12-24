/*jshint node: true */

'use strict';

var http = require('http');
var www_authenticate = require('www-authenticate');
var q = require('q');
var _ = require('underscore');
var authHelper = require('./auth-helper');

var options = require('./options');

var serverConfigObj = {
  database: 'discovery-app-content'
};

serverConfig().then(function(sConfig) {
  if (sConfig) {
    serverConfigObj = sConfig;
    serverConfigObj.database = serverConfigObj.database || 'discovery-app-content';
  }
});

function serverConfig(data) {
  var d = q.defer();
  var putData = null;
  if (data) {
    _.extend(serverConfigObj, data);
    putData = {
      'server-config': serverConfigObj
    };
  }
  genericConfig('server-config', new MockRes(d), putData);
  return d.promise.then(function(resData) {
    if (resData) {
      var resObj = JSON.parse(resData);
      return resObj['server-config'] || resObj;
    }
    return resData;
  });
}

function chartConfig(res, data) {
  genericConfig('charts', res, data);
}

function uiConfig(res, data) {
  genericConfig('ui-config', res, data);
}

function genericConfig(name, res, data) {
  var opt = {
    method: 'GET',
    params: {
      uri: '/discovery-app/config/' + name + '.json',
      database: 'discovery-app-content'
    },
    path: '/v1/documents'
  };
  if (data) {
    opt.params['perm:discovery-app-role'] = 'read';
    opt.params['perm:discovery-app-admin-role'] = 'update';
    opt.method = 'PUT';
    opt.data = data;
  }
  passOnToML({
      headers: {}
    },
    res,
    opt
  );
}

function passOnToMLManage(req, res, transferOptions) {
  passOnToML(req, res, transferOptions, options.mlManageHttpPort);
}

var challengeOpts = {
  method: 'HEAD',
  path: '/v1/ping'
};

var authorizationFunctions = {};

function createAuthenticator(session, port, user, password, challenge) {
  var authenticator = www_authenticate.call(null, user, password)(challenge);
  if (!session.authenticator) {
    session.authenticator = {};
  }
  session.authenticator[user + ':' + port] = authenticator;
  if (!authorizationFunctions[port]) {
    authorizationFunctions[port] = authenticator.authorize;
  }
  return authenticator;
}

function getAuthenticator(session, user, port) {
  if (!session.authenticator) {
    return null;
  }
  return session.authenticator[user + ':' + port];
}

function passOnToML(req, res, transferOptions, port) {
  port = port || options.mlHttpPort;
  req.session = req.session || {};
  var user = req.session.user;
  var params = [];
  var chunks = [];
  var responseTransform = transferOptions.responseTransform;
  var databaseInParams = false;
  for (var key in transferOptions.params) {
    if (key === 'database') {
      databaseInParams = true;
    }
    params.push(key + '=' + transferOptions.params[key]);
  }

  if (!(databaseInParams || /\/(v1\/config|manage)\//.test(transferOptions.path))) {
    params.push('database=' + serverConfigObj.database);
  }

  var reqOptions = {
    hostname: options.mlHost,
    port: port || options.mlHttpPort,
    method: transferOptions.method,
    path: [transferOptions.path, params.join('&')].join('?'),
    headers: {
      'Content-Type': 'application/json'
    }
  };

  var makeRequest = function(authorization) {
    if (authorization) {
      reqOptions.headers.Authorization = authorization;
    }
    var mlReq = http.request(reqOptions, function(response) {
      for (var header in response.headers) {
        if (header !== 'www-authenticate') {
          res.header(header, response.headers[header]);
        }
      }

      res.status(response.statusCode);
      response.on('data', function(chunk) {
        chunks.push(chunk);
      });
      response.on('end', function() {
        var str = chunks.join('');
        if (responseTransform) {
          var transformedStr = responseTransform(str);
          if (transformedStr) {
            res.write(transformedStr);
          }
        } else {
          res.write(str);
        }
        res.end();
      });
    });
    mlReq.on('error', function(e) {
      console.log('Problem with request: ' + e.message);
    });
    if (transferOptions.data) {
      mlReq.write(JSON.stringify(transferOptions.data));
    }
    mlReq.end();
  };
  authHelper.getAuthorization(req.session, reqOptions.method, reqOptions.path,
    {
      authHost: reqOptions.host,
      authPort: reqOptions.port,
      authUser: user ? user.name : options.defaultUser,
      authPassword: user ? user.password : options.defaultPass
    }
  ).then(function(authorization) {
    makeRequest(authorization);
  }, function() {
    makeRequest(null);
  });
}

function MockRes(p) {
  this.code = 0;
  this.deferred = p;
}
MockRes.prototype.write = function(d) {
  this.response = d;
};
MockRes.prototype.end = function() {
  // console.log('MockRes end, code:', this.code, this.response);
  if (this.code === 200) {
    this.deferred.resolve(this.response);
  } else {
    this.deferred.reject({
      code: this.code,
      response: this.response
    });
  }
};
MockRes.prototype.header = function() {};
MockRes.prototype.status = function(code) {
  this.code = code;
};

var manageML = {
  serverConfig: serverConfig,
  chartConfig: chartConfig,
  uiConfig: uiConfig,
  genericConfig: genericConfig,
  database: function() {
    console.log('serverConfigObj.database');
    console.log(serverConfigObj.database);
    return serverConfigObj.database;
  },
  passOnToML: passOnToML,
  passOnToMLManage: passOnToMLManage
};

module.exports = manageML;
