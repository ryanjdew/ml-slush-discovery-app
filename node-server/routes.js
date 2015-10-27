/*jshint node: true */

'use strict';

var router = require('express').Router();
var four0four = require('./utils/404')();
var http = require('http');
var config = require('../gulp.config')();
var q = require('q');

var options = {
  appPort: process.env.APP_PORT || config.defaultPort,
  mlHost: process.env.ML_HOST || config.marklogic.host,
  mlHttpPort: process.env.ML_PORT || config.marklogic.httpPort,
  mlManageHttpPort: process.env.ML_MNG_PORT || config.marklogic.manageHttpPort,
  defaultUser: process.env.ML_APP_USER || config.marklogic.user,
  defaultPass: process.env.ML_APP_PASS || config.marklogic.password,
  database: 'Documents'
};

var serverConfigObj = {};

serverConfig().then(function(sConfig) {
  if (sConfig) {
    options.database = sConfig.database;
    serverConfigObj = sConfig;
  }
});

router.get('/user/status', function(req, res) {
  var headers = req.headers;
  noCache(res);
  if (req.session.user === undefined) {
    res.send({
      authenticated: false
    });
  } else {
    delete headers['content-length'];
    var status = http.get({
      hostname: options.mlHost,
      port: options.mlHttpPort,
      path: '/v1/documents?uri=/api/users/' + req.session.user.name + '.json',
      headers: headers,
      auth: getAuth(options, req.session)
    }, function(response) {
      if (response.statusCode === 200) {
        response.on('data', function(chunk) {
          var json = JSON.parse(chunk);
          if (json.user !== undefined) {
            res.status(200).send({
              authenticated: true,
              username: req.session.user.name,
              profile: json.user
            });
          } else {
            console.log('did not find chunk.user');
          }
        });
      } else if (response.statusCode === 404) {
        //no profile yet for user
        res.status(200).send({
          authenticated: true,
          username: req.session.user.name,
          profile: {}
        });
      } else {
        res.send({
          authenticated: false
        });
      }
    });

    status.on('error', function(e) {
      console.log(JSON.stringify(e));
      console.log('status check failed: ' + e.statusCode);
    });
  }
});

router.post('/user/login', function(req, res) {
  // Attempt to read the user's profile, then check the response code.
  // 404 - valid credentials, but no profile yet
  // 401 - bad credentials
  var username = req.body.username;
  var password = req.body.password;
  var headers = req.headers;
  //make sure login isn't cached
  noCache(res);

  // remove content length so ML doesn't wait for request body
  // that isn't being passed.
  delete headers['content-length'];
  var login = http.get({
    hostname: options.mlHost,
    port: options.mlHttpPort,
    path: '/v1/documents?uri=/api/users/' + username + '.json',
    headers: headers,
    auth: username + ':' + password
  }, function(response) {
    if (response.statusCode === 401) {
      res.statusCode = 401;
      res.send('Unauthenticated');
    } else if (response.statusCode === 404) {
      // authentication successful, but no profile defined
      req.session.user = {
        name: username,
        password: password
      };
      res.status(200).send({
        authenticated: true,
        username: username
      });
    } else {
      console.log('code: ' + response.statusCode);
      if (response.statusCode === 200) {
        // authentication successful, remember the username
        req.session.user = {
          name: username,
          password: password
        };
        response.on('data', function(chunk) {
          var json = JSON.parse(chunk);
          if (json.user !== undefined) {
            res.status(200).send({
              authenticated: true,
              username: username,
              profile: json.user
            });
          } else {
            console.log('did not find chunk.user');
          }
        });
      }
    }
  });

  login.on('error', function(e) {
    console.log(JSON.stringify(e));
    console.log('login failed: ' + e.statusCode);
  });
});

router.get('/user/logout', function(req, res) {
  noCache(res);
  delete req.session.user;
  res.send();
});

router.get('/server/search-options', function(req, res) {
  passOnToML(
    req,
    res,
    {
      method: 'GET',
      params: {format: 'json'},
      path: '/v1/config/query/all'
    }
  );
});

router.put('/server/search-options', function(req, res) {
  passOnToML(
    req,
    res,
    {
      method: 'PUT',
      data: req.body,
      params: {format: 'json'},
      path: '/v1/config/query/all'
    }
  );
});

router.put('/server/ui-config', function(req, res) {
  uiConfig(res, req.body);
});

router.get('/server/ui-config', function(req, res) {
  uiConfig(res);
});

router.put('/server/charts', function(req, res) {
  chartConfig(res, req.body);
});

router.get('/server/charts', function(req, res) {
  chartConfig(res);
});

router.put('/server/database', function(req, res) {
  if (req.body && req.body['database-name']) {
    serverConfigObj.database = req.body['database-name'];
    options.database = req.body['database-name'];
    serverConfig({
      'server-config': serverConfigObj
    });
  }
  passOnToMLManage(
    req,
    res, {
      method: 'PUT',
      data: req.body,
      params: {format: 'json'},
      path: '/manage/v2/databases/' + options.database + '/properties'
    }
  );
});

router.get('/server/database', function(req, res) {
  passOnToMLManage(
    req,
    res, {
      method: 'GET',
      params: {format: 'json'},
      path: '/manage/v2/databases/' + options.database + '/properties'
    }
  );
});

router.get('/server/databases', function(req, res) {
  passOnToMLManage(
    req,
    res, {
      method: 'GET',
      params: {format: 'json'},
      path: '/manage/v2/databases'
    }
  );
});

router.get('/server/database/load-data', function(req, res) {
  passOnToML(
    req,
    res, {
      method: 'POST',
      params: {
        'rs:directory': req.query.directory
      },
      path: '/v1/resources/load-data'
    }
  );
});

router.get('/server/database/content-metadata', function(req, res) {
  passOnToML(
    req,
    res, {
      method: 'GET',
      params: {
        'rs:localname': req.query.localname,
        'rs:type': req.query.type
      },
      path: '/v1/resources/content-metadata'
    }
  );
});

router.get('/*', four0four.notFoundMiddleware);

function noCache(response) {
  response.append('Cache-Control', 'no-cache, must-revalidate'); //HTTP 1.1 - must-revalidate
  response.append('Pragma', 'no-cache'); //HTTP 1.0
  response.append('Expires', 'Sat, 26 Jul 1997 05:00:00 GMT'); // Date in the past
}

function serverConfig(data) {
  var d = q.defer();
  genericConfig('server-config', new MockRes(d), data);
  return d.promise.then(function(data) {
    if (data && data['server-config']) {
      return data['server-config'];
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

  if (!(databaseInParams || /\/(config|manage)\//.test(transferOptions.path))) {
    params.push('database=' + options.database);
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

module.exports = router;
