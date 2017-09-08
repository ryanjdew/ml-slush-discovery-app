/*jshint node:true*/
'use strict';

var express = require('express');
var expressSession = require('express-session');
var app = express();
var logger = require('morgan');
var port = process.env.PORT || 8001;
var four0four = require('./utils/404')();

var http = require('http');
var https = require('https');

var options = require('./options');

var environment = process.env.NODE_ENV;

app.use(expressSession({
  name: 'discovery-app',
  secret: '56cb6c2a-5221-41cc-963d-9995129bef55',
  saveUninitialized: true,
  resave: true
}));

app.use(logger('dev'));

app.use('/api', require('./routes'));

app.use('/v1', require('./proxy'));

app.use('/create', express.static('./build/index.html'));
app.use('/profile', express.static('./build/index.html'));
app.use('/setup', express.static('./build/index.html'));

console.log('About to crank up node');
console.log('PORT=' + port);
console.log('NODE_ENV=' + environment);

switch (environment) {
  case 'prod':
    console.log('** DIST **');
    app.use(express.static('./dist/'));
    // Any invalid calls for templateUrls are under app/* and should return 404
    app.use('/app/*', function(req, res, next) {
      four0four.send404(req, res);
    });
    // Any deep link calls should return index.html
    app.use('/*', express.static('./dist/index.html'));
    break;
  default:
    console.log('** UI **');
    app.use(express.static('./ui/'));
    app.use(express.static('./')); // for bower_components
    app.use(express.static('./tmp'));
    // Any invalid calls for templateUrls are under app/* and should return 404
    app.use('/app/*', function(req, res, next) {
      four0four.send404(req, res);
    });
    // Any deep link calls should return index.html
    app.use('/*', express.static('./ui/index.html'));
    break;
}

var server = null;
if (options.nodeJsCertificate) {
  // Docs on how to create self signed certificates
  // https://devcenter.heroku.com/articles/ssl-certificate-self#prerequisites
  console.log('Starting the server in HTTPS');
  console.log('Node Certificate ' + options.nodeJsCertificate);
  console.log('Node JS key ' + options.nodeJsPrivateKey);
  var privateKey = fs.readFileSync(options.nodeJsPrivateKey, 'utf8');
  var certificate = fs.readFileSync(options.nodeJsCertificate, 'utf8');
  var credentials = {
    key: privateKey,
    cert: certificate
  };
  server = https.createServer(credentials, app);
} else {
  console.log('Starting the server in HTTP');
  server = http.createServer(app);
}

var io = require('socket.io')(server);
io.on('connection', function(socket) {
  // console.log('a user connected');

  // io.emit() sends a message to client on the 'server' channel
  // io.emit('server', 'hi client');
  socket.on('disconnect', function() {
    // console.log('user disconnected');
  });
  socket.on('client', function(val) {
    // listening for message from client
    // console.log('client', val);
  });
});

server.listen(port, function() {
  console.log('Express server listening on port ' + port);
  console.log('env = ' + app.get('env') +
    '\n__dirname = ' + __dirname +
    '\nprocess.cwd = ' + process.cwd());
});

server.timeout = 0;
