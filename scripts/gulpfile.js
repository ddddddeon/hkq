var fs = require('fs');
var gulp = require('gulp');
var path = require('path');
var argv = require('minimist')(process.argv.slice(2));
var jshint = require('gulp-jshint');

var server;
var client;

var clientType = argv.type ||
                 argv.client_type ||
                 process.env.SFQ_CLIENT_TYPE ||
                 'enqueue';
var queue = argv.queue ||
            process.env.SFQ_QUEUE ||
            'test';

var clientCallback = function(err, data) {
  if (err) {
    console.log('X client received error: %s %s', err.code, err.address || '');
    return;
  } else {
    console.log('+ ' + data);
  }
};

var sendMessages = function(err, data) {
  clientCallback(err, data);
  var i = 0;
  setInterval(function () {
    i++;
    if (clientType.match(/deq/)) {
      client.dequeue(queue, clientCallback);
    } else {
      client.enqueue(queue, 'message number ' + i, clientCallback);
    }
  }, 10);
};

var runClient = function() {
  var conf = {
    'port': argv.p || argv.port ||
            process.env.SFQ_LISTEN_PORT ||
            9090,

    'host': argv.h || argv.host ||
            argv.client_host ||
            process.env.SFQ_CLIENT_HOST ||
            'localhost'
  };

  client = new (require('../index')).Client(conf);
  client.declareQueue(queue, sendMessages);
};

var runServer = function(cb) {
  var conf = {
    'listenPort':   argv.p || argv.port ||
                    argv.listenPort ||
                    process.env.SFQ_LISTEN_PORT ||
                    9090,

    'dumpPath':     argv.path ||
                    argv.dumpPath ||
                    process.env.SFQ_LISTEN_PORT ||
                    './queues.json',

    'dumpInterval': argv.dumpInterval ||
                    process.env.SFQ_DUMP_INTERVAL ||
                    1
  };

  server = new (require('../index')).Server(conf);

  server.startServer(function(err, serving) {
    if (err) {
      if (typeof cb !== 'undefined') {
        cb(err, false);
      } else {
        console.log('could not start server', err);
        process.exit(1);
      }
    } else {
      if (typeof cb !== 'undefined') {
        cb(null, true);
      }
    }
  });
};

var runHybrid = function() {
  runServer(function(err, serving) {
    if (err) {
      console.log('could not start server', err);
      process.exit(1);
    }
    runClient();
  });
};


gulp.task('serve', ['server']);
gulp.task('server', runServer);
gulp.task('hybrid', runHybrid);
gulp.task('client', runClient);

gulp.task('enq', ['enqueue']);
gulp.task('enqueue', function() {
  clientType = 'enqueue';
  runClient();
});

gulp.task('deq', ['dequeue']);
gulp.task('dequeue', function() {
  clientType = 'dequeue';
  runClient();
});

gulp.task('jshint', function() {
  gulp.src(['../{scripts,test,app,lib}/*.js'])
    .pipe(jshint())
    .pipe(jshint.reporter('default'));
});

gulp.task('flush', function() {
  var dumpPath = argv.path ||
                 argv.dumpPath ||
                 process.env.SFQ_LISTEN_PORT ||
                 './queues.json';

  fs.unlinkSync(dumpPath);
});
