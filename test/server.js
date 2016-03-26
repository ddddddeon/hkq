var sfqServer = require('../index').server;
var conf = {
  "dumpPath": "config/queues.json",
  "dumpInterval": 1,
  "listenPort": "1337"
};
var server = new sfqServer.Server(conf);
server.startServer();
