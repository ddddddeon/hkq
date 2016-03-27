var Client = require('../index').Client;

var conf = {
  'port': 9090,
  'host': 'localhost'
};

var client = new Client(conf);

client.enqueue("test", "first message", function(err, data) {
  if (err) console.log(err);
  console.log(data);
  client.enqueue("test", "second message", function(err, data) {
    if (err) console.log(err);
    console.log(data);
    client.dequeue("test", function(err, data) {
      if (err) console.log(err);
      console.log(data);
      client.dequeue("test", function(err, data) {
        if (err) console.log(err);
        console.log(data);
      });
    });
  });
});
