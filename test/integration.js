var sfq = require('../index');

var Server = sfq.Server;
var Client = sfq.Client;

var server;
var client;

var testType = process.env.SFQ_TEST_TYPE;

var clientConfig = {
  'port': 9090,
  'host': 'localhost'
};

var sendMessages = function(err, data) {
  if (err) console.log(err);
  
  var i = 0;
  setInterval(function () {
    i++;
    client.enqueue("test", "message " + i, function(err, data) {
      if (err) {
        console.log('X client received error: %s %s', err.code, err.address);
      } else {
        if (testType !== 'hybrid') {
          console.log('+ ' + data);
        }
      }
    });
  }, 10);
};

var runClient = function() {
  client = new Client(clientConfig);
  client.declareQueue("test", sendMessages);
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


