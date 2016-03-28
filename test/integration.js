var sfq = require('../index');

var Server = sfq.Server;
var Client = sfq.Client;

var server;
var client;

var testType = process.env.SFQ_TEST_TYPE || '';
var clientType = process.env.SFQ_CLIENT_TYPE || '';

var clientConfig = {
  'port': 9090,
  'host': 'localhost'
};

var clientCallback = function(err, data) {
  if (err) {
    console.log('X client received error: %s %s', err.code, err.address);
    return;
  } else {
    if (testType !== 'hybrid') {
      console.log('+ ' + data);
    }
  }
}

var enqueueMessages = function(err, data) {
  clientCallback(err, data);

  var i = 0;
  setInterval(function () {
    i++;
    client.enqueue('test', 'message number ' + i, clientCallback);
  }, 10);
};

var dequeueMessages = function(err, data) {
  clientCallback(err, data);

  var i = 0;
  setInterval(function () {
    i++;
    client.dequeue('test', clientCallback);
  }, 10);
};

var runClient = function() {
  client = new Client(clientConfig);
  
  if (clientType.match(/deq/)) {
    client.declareQueue('test', dequeueMessages);
  } else {
    client.declareQueue('test', enqueueMessages);
  }
};

if (testType === 'hybrid') {
  server = new Server();
  server.startServer(runClient);
} else if (testType === 'server') {
  server = new Server();
  server.startServer();
} else {
  runClient();
}


