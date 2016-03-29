var gulp = require('gulp');
var path = require('path');
var argv = require('minimist')(process.argv.slice(2));

var server;
var client;
var clientType = argv.type ||
                 argv.client_type ||
                 process.env.SFQ_CLIENT_TYPE;

var clientCallback = function(err, data) {
  if (err) {
    console.log('X client received error: %s %s', err.code, err.address || '');
    return;
  } else {
    console.log('+ ' + data);
  }
}

var sendMessages = function(err, data) {
  clientCallback(err, data);
  var i = 0;
  setInterval(function () {
    i++;
    if (clientType.match(/deq/)) {
      client.dequeue('test', clientCallback);
    } else {
      client.enqueue('test', 'message number ' + i, clientCallback);
    }
  }, 10);
};

var runClient = function() {
  var conf = {
    'port': argv.port ||
      process.env.SFQ_LISTEN_PORT ||
      9090,
    'host': argv.host ||
            argv.client_host ||
            process.env.SFQ_CLIENT_HOST ||
            'localhost'
  };

  var queue = argv.queue || process.env.SFQ_QUEUE;
  client = new (require('../index')).Client(conf);
  client.declareQueue(queue, sendMessages);
};

var runServer = function() {
  var conf = {
    'listenPort': argv.port ||
                  argv.listenPort ||
                  process.env.SFQ_LISTEN_PORT ||
                  9090,
    'dumpPath': argv.path ||
                argv.dumpPath ||
                process.env.SFQ_LISTEN_PORT ||
                './queues.json',
    'dumpInterval': argv.dumpInterval ||
                    process.env.SFQ_DUMP_INTERVAL ||
                    1
  };
  
  server = new (require('../index')).Server(conf);

  server.startServer();
};

gulp.task('serve', ['server']);
gulp.task('server', runServer);

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
