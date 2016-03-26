var Server = require('../index').Server;

var conf = {
  "dumpPath": "config/queues.json",
  "dumpInterval": 1,
  "listenPort": "1337"
};

var server = new Server(conf);
server.startServer();
