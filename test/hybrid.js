var sfq = require('../index');

var Server = sfq.Server;
var Client = sfq.Client;

var clientConfig = {
  'port': 9090,
  'host': 'localhost'
};

var server = new Server();
server.startServer();

server.on('serving', function() {
  var client = new Client(clientConfig);

  var sendMessages = function(err, data) {
    if (err) console.log(err);
    
    var i = 0;
    setInterval(function () {
      i++;
      client.enqueue("test", "message " + i, function(err, data) {
        if (err) console.log(err);
      });
    }, 10);
  };

  client.declareQueue("test", sendMessages);
});

