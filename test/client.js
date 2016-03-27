var Server = require('../index').Server;
var Client = require('../index').Client;

var conf = {
  'port': 9090,
  'host': 'localhost'
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
