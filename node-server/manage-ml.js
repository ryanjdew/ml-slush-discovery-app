/*jshint node: true */

'use strict';

var config = require('../gulp.config')();
var http = require('http');
var q = require('q');
var _ = require('underscore');

var options = {
  appPort: process.env.APP_PORT || config.defaultPort,
  mlHost: process.env.ML_HOST || config.marklogic.host,
  mlHttpPort: process.env.ML_PORT || config.marklogic.httpPort,
  mlManageHttpPort: process.env.ML_MNG_PORT || config.marklogic.manageHttpPort,
  defaultUser: process.env.ML_APP_USER || config.marklogic.user,
  defaultPass: process.env.ML_APP_PASS || config.marklogic.password
};

var serverConfigObj = {
  database: 'Documents'
};

serverConfig().then(function(sConfig) {
  if (sConfig) {
    serverConfigObj = sConfig;
    serverConfigObj.database = serverConfigObj.database || 'Documents';
  }
});

function serverConfig(data) {
  var d = q.defer();
  if (data) {
    _.extend(serverConfigObj, data);
  }
  genericConfig('server-config', new MockRes(d), {
    'server-config': serverConfigObj
  });
  return d.promise.then(function(data) {
    if (data && data['server-config']) {
      return data;
    }
    return data;
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
        database: 'Documents'
      },
      path: '/v1/documents'
    };
  if (data) {
    opt.method = 'PUT';
    opt.data = data;
  }
  passOnToML(
    {
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

  var mlReq = http.request({
    hostname: options.mlHost,
    port: port || options.mlHttpPort,
    method: transferOptions.method,
    path: [transferOptions.path, params.join('&')].join('?'),
    headers: {
      'Content-Type': 'application/json'
    },
    auth: getAuth(options, req.session)
  }, function(response) {

    for (var header in response.headers) {
      res.header(header, response.headers[header]);
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
    this.deferred.resolve(this.response.data);
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

function getAuth(options, session) {
  var auth = null;
  if (session && session.user !== undefined && session.user.name !== undefined) {
    auth =  session.user.name + ':' + session.user.password;
  }
  else {
    auth = options.defaultUser + ':' + options.defaultPass;
  }

  return auth;
}


var manageML = {
  serverConfig: serverConfig,
  chartConfig: chartConfig,
  uiConfig: uiConfig,
  genericConfig: genericConfig,
  database: function() {
    return serverConfigObj.database;
  },
  passOnToML: passOnToML,
  passOnToMLManage: passOnToMLManage
};

module.exports = manageML;
