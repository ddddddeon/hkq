var Client = require('../index').Client;

var conf = {
  "host": "127.0.0.1",
  "port": 9090
};

var client = new Client(conf);

client.declareQueue("test", function(err, data) {
  if (err) {
    console.log(err);
  } else {
    console.log(data);
  }

  client.enqueue("test", "hi there", function(err, data) {
    if (err) {
      console.log(err);
    } else {
      console.log(data);
    }

    client.dequeue("test", function(err, data) {
      if (err) {
        console.log(err);
      } else {
        console.log(data);
      }
    });
  });
});
