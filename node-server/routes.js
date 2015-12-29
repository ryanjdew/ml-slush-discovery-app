/*jshint node: true */

'use strict';

var router = require('express').Router();

var authHelper = require('./auth-helper');
var bodyParser = require('body-parser');
var four0four = require('./utils/404')();
var http = require('http');
var q = require('q');
var manageML = require('./manage-ml');

var options = require('./options');

router.use(bodyParser.urlencoded({extended: true}));
router.use(bodyParser.json());
router.get('/user/status', function(req, res) {
  req.session = req.session || {};
  var user = req.session.user;
  if (user) {
    userProfile(req, res, user.name, user.password, true);
  } else {
    res.status(200).send({authenticated: false});
  }
});

router.post('/user/login', function(req, res) {
  // Attempt to read the user's profile, then check the response code.
  // 404 - valid credentials, but no profile yet
  // 401 - bad credentials
  var username = req.body.username;
  var password = req.body.password;

  userProfile(req, res, username, password);
});

router.get('/user/logout', function(req, res) {
  noCache(res);
  delete req.session.user;
  if (req.session.authenticator) {
    delete req.session.authenticator;
  }
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
  manageML.uiConfig(req, res, req.body);
});

router.get('/server/ui-config', function(req, res) {
  manageML.uiConfig(req, res);
});

router.put('/server/charts', function(req, res) {
  manageML.chartConfig(req, res, req.body);
});

router.get('/server/charts', function(req, res) {
  manageML.chartConfig(req, res);
});

router.put('/server/database', function(req, res) {
  if (req.body && req.body['database-name']) {
    manageML.serverConfig(req,
    {
      'database': req.body['database-name']
    });
  }
  console.log('checking db ' + manageML.database());
  manageML.databaseExists(req, manageML.database()).then(
    function (doesDbExist) {
      if (doesDbExist) {
        console.log('/manage/v2/databases/' + manageML.database() + '/properties');
        manageML.passOnToMLManage(
          req,
          res,
          {
            method: 'PUT',
            data: req.body,
            params: {format: 'json'},
            path: '/manage/v2/databases/' + manageML.database() + '/properties'
          }
        );
      } else {
        console.log('POST /manage/v2/databases creating ' + manageML.database());
        manageML.createDatabase(req, req.body).then(
          function() {
            res.status(200).send(req.body);
          },
          function(err) {
            console.log(err);
            res.status(500).send('Internal Server Error');
          }
        );
      }
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

function userProfile(req, res, username, password, isStatus) {
  var headers = req.headers || {};
  //make sure login isn't cached
  noCache(res);
  var reqOptions = {
      hostname: options.mlHost,
      port: options.mlHttpPort,
      path: '/v1/documents?uri=/api/users/' + username + '.json',
      headers: headers
    };
  var makeRequest = function(authorization) {
    // remove content length so ML doesn't wait for request body
    // that isn't being passed.
    if (authorization) {
      reqOptions.headers.Authorization = authorization;
    }
    delete reqOptions.headers['content-length'];
    var login = http.get(reqOptions, function(response) {
      if (response.statusCode === 401) {
        if (isStatus) {
          res.status(200).send({
            authenticated: false
          });
        } else {
          res.statusCode = 401;
          res.send('Unauthenticated');
        }
      } else if (response.statusCode === 404) {
        // authentication successful, but no profile defined
        req.session.user = {
          name: username,
          password: password
        };
        res.status(200).send({
          authenticated: true,
          username: username,
          profile: {}
        });
      } else {
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
        } else {
          console.log('code: ' + response.statusCode);
          response.on('data', function(chunk) {
            console.log(JSON.parse(chunk));
          });
        }
      }
    });

    login.on('error', function(e) {
      console.log(JSON.stringify(e));
      console.log('login failed: ' + e.statusCode);
    });
  };
  authHelper.getAuthorization(req.session, reqOptions.method, reqOptions.path,
    {
      authHost: reqOptions.host,
      authPort: reqOptions.port,
      authUser: username,
      authPassword: password
    }
  ).then(function(authorization) {
    makeRequest(authorization);
  }, function() {
    makeRequest(null);
  });

}

module.exports = router;
