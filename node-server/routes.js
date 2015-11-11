/*jshint node: true */

'use strict';

var router = require('express').Router();
var four0four = require('./utils/404')();
var http = require('http');
var config = require('../gulp.config')();
var q = require('q');
var manageML = require('./manage-ml');

var options = {
  appPort: process.env.APP_PORT || config.defaultPort,
  mlHost: process.env.ML_HOST || config.marklogic.host,
  mlHttpPort: process.env.ML_PORT || config.marklogic.httpPort,
  mlManageHttpPort: process.env.ML_MNG_PORT || config.marklogic.manageHttpPort,
  defaultUser: process.env.ML_APP_USER || config.marklogic.user,
  defaultPass: process.env.ML_APP_PASS || config.marklogic.password
};

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
  manageML.passOnToML(
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
  manageML.passOnToML(
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
  manageML.uiConfig(res, req.body);
});

router.get('/server/ui-config', function(req, res) {
  manageML.uiConfig(res);
});

router.put('/server/charts', function(req, res) {
  manageML.chartConfig(res, req.body);
});

router.get('/server/charts', function(req, res) {
  manageML.chartConfig(res);
});

router.put('/server/database', function(req, res) {
  if (req.body && req.body['database-name']) {
    manageML.serverConfig({
      'database': req.body['database-name']
    });
  }
  console.log('/manage/v2/databases/' + manageML.database() + '/properties');
  manageML.passOnToMLManage(
    req,
    res, {
      method: 'PUT',
      data: req.body,
      params: {format: 'json'},
      path: '/manage/v2/databases/' + manageML.database() + '/properties'
    }
  );
});

router.get('/server/database', function(req, res) {
  manageML.passOnToMLManage(
    req,
    res, {
      method: 'GET',
      params: {format: 'json'},
      path: '/manage/v2/databases/' + manageML.database() + '/properties'
    }
  );
});

router.get('/server/databases', function(req, res) {
  manageML.passOnToMLManage(
    req,
    res, {
      method: 'GET',
      params: {format: 'json'},
      path: '/manage/v2/databases'
    }
  );
});

router.get('/server/database/load-data', function(req, res) {
  manageML.passOnToML(
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
  manageML.passOnToML(
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
