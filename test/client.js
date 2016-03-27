var Server = require('../index').Server;
var Client = require('../index').Client;

var config = {
  "dumpPath": "config/queues.json",
  "dumpInterval": 1,
  "listenPort": "1337"
};

var server = new Server(config);
server.startServer();

var conf = {
  "host": "127.0.0.1",
  "port": 9090
};


setTimeout(function() {
  var client = new Client(conf);
  
  client.declareQueue("test", function(err, data) {
    if (err) {
      console.log(err);
    } else {
      console.log(data.trim());
    }
    
    client.enqueue("test", "hi there", function(err, data) {
      if (err) {
        console.log(err);
      } else {
        console.log(data.trim());
      }
      
      client.dequeue("test", function(err, data) {
        if (err) {
          console.log(err);
        } else {
          console.log(data.trim());
        }
      });
    });
  });
}, 4000);
