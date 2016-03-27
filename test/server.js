var Server = require('../index').Server;

var conf = {
  "dumpPath": "config/queues.json",
  "dumpInterval": 1,
  "listenPort": "9090"
};

var server = new Server(conf);
server.startServer(function() {
  console.log('* callback is working!');
});
