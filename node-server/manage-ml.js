/*jshint node: true */

'use strict';

var http = require('http');
var www_authenticate = require('www-authenticate');
var q = require('q');
var _ = require('underscore');
var authHelper = require('./auth-helper');

var options = require('./options');

var serverConfigObj = {
  database: null
};

var _hostName;

console.log('loading config...');
serverConfig().then(function(sConfig) {
  if (sConfig) {
    console.log('config found!');
    serverConfigObj = sConfig;
    serverConfigObj.database = serverConfigObj.database;
  } else {
    console.log('config not found!');
  }
}, function(rejection) {
  console.log('config not found!');
});

function serverConfig(req, data) {
  var d = q.defer();
  var putData = null;
  if (data) {
    _.extend(serverConfigObj, data);
    putData = {
      'server-config': serverConfigObj
    };
  }
  genericConfig('server-config', req, new MockRes(d), putData);
  return d.promise.then(function(resData) {
    if (resData) {
      var resObj = JSON.parse(resData);
      return resObj['server-config'] || resObj;
    }
    return resData;
  });
}

function chartConfig(req, res, data) {
  genericConfig('charts', req, res, data);
}

function uiConfig(req, res, data) {
  genericConfig('ui-config', req, res, data);
}

function genericConfig(name, req, res, data) {
  var opt = {
    method: 'GET',
    params: {
      uri: '/discovery-app/config/' + name + '.json',
      database: null
    },
    path: '/v1/documents'
  };
  if (data) {
    opt.params['perm:rest-reader'] = 'read';
    opt.params['perm:rest-admin'] = 'update';
    opt.method = 'PUT';
    opt.data = data;
  }
  passOnToML(
    req || {
      headers: {}
    },
    res,
    opt
  );
}

function passOnToMLManage(req, res, transferOptions) {
  passOnToML(req, res, transferOptions, options.mlManageHttpPort);
}

function passOnToML(req, res, transferOptions, port) {
  port = port || options.mlHttpPort;
  var session = req.session || {};
  var user = session.user;
  var params = [];
  var chunks = [];
  var responseTransform = transferOptions.responseTransform;
  var databaseInParams = false;
  for (var key in transferOptions.params) {
    if (key === 'database') {
      databaseInParams = true;
    }
    if (transferOptions.params[key] !== null) {
      params.push(key + '=' + transferOptions.params[key]);
    }
  }

  if (!(databaseInParams || /\/(v1\/config|manage)\//.test(transferOptions.path)) &&
      serverConfigObj.database) {
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
  authHelper.getAuthorization(session, reqOptions.method, reqOptions.path,
    {
      authHost: reqOptions.hostname || options.mlHost,
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
  if (this.code >= 200 && this.code <= 399) {
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

function hostName(req) {
  var d = q.defer();
  if (_hostName) {
    d.resolve(_hostName);
    return d.promise;
  } else {
    passOnToMLManage(
      req,
      new MockRes(d),
      {
        method: 'GET',
        params: { format: 'json' },
        path: '/manage/v2/hosts'
      }
    );
    return d.promise.then(function(resp) {
      _hostName = JSON.parse(resp)['host-default-list']['list-items']['list-item'][0].nameref;
      return _hostName;
    });
  }
}

function createDatabase(req, databaseProperties) {
  var d = q.defer();
  var databaseName = databaseProperties['database-name'];
  databaseProperties['collection-lexicon'] = true;
  databaseProperties['triple-index'] = true;
  passOnToMLManage(
    req,
    new MockRes(d),
    {
      method: 'POST',
      params: {},
      path: '/manage/v2/databases',
      data: databaseProperties
    }
  );
  return d.promise.then(function() {
    return hostName(req).then(function(hName) {
      var promises = [];
      var forestDefered;
      var forestData;
      for (var i = 1; i <= 3; i++) {
        forestDefered = q.defer();
        forestData = {
            'forest-name': databaseName + '-0' + i,
            host: hName,
            database: databaseName
          };
        (function(forestDefered, forestData) {
          passOnToMLManage(
            req,
            new MockRes(forestDefered),
            {
              method: 'POST',
              params: { format: 'json' },
              path: '/manage/v2/forests',
              data: forestData
            }
          );
        })(forestDefered, forestData);
        promises.push(forestDefered.promise);
      }
      return q.all(promises);
    });
  });
}

function databaseExists(req, databaseName) {
  var d = q.defer();
  passOnToMLManage(
    req,
    new MockRes(d),
    {
      method: 'GET',
      params: {},
      path: '/manage/v2/databases/' + databaseName
    }
  );
  return d.promise.then(function() {
    return true;
  },
  function() {
    return false;
  });
}

var manageML = {
  serverConfig: serverConfig,
  chartConfig: chartConfig,
  uiConfig: uiConfig,
  genericConfig: genericConfig,
  hostName: hostName,
  createDatabase: createDatabase,
  databaseExists: databaseExists,
  database: function() {
    return serverConfigObj.database;
  },
  passOnToML: passOnToML,
  passOnToMLManage: passOnToMLManage
};

module.exports = manageML;
