var fs = require('fs');
var net = require('net');
var path = require('path');
var queue = require('./queue');
var queues = {};
var config = {};

var setupConfig = function() {
  var configPath = process.env.SFQ_CONFIG_PATH || '../config/config.json';
  var configFile = path.basename(configPath);
  
  try {
    config = require(configPath);
  } catch (err) {
    console.log('X could not load config from', configPath);
    process.exit(1);
  }
  
  config.dumpPath = path.resolve(process.env.SFQ_DUMP_PATH || config.dumpPath);
  config.dumpInterval = parseInt(process.env.SFQ_DUMP_INTERVAL || config.dumpInterval);
  config.listenPort = parseInt(process.env.SFQ_LISTEN_PORT || config.listenPort);
  
  if (!fs.existsSync(config.dumpPath)) {
    console.log('X could not find dump file specified in %s:', configFile, config.dumpPath);
    process.exit(1);
  }

  if (isNaN(config.dumpInterval)) {
    console.log('X invalid dumpInterval (%s) in file', config.dumpInterval, configFile);
    process.exit(1);
  }
  
  if (isNaN(config.listenPort)) {
    console.log('X invalid listenPort (%s) in file', config.listenPort, configFile);
    process.exit(1);
  }
  
  return config;
}

var loadFromDisk = function() {
  config = setupConfig(config);
  console.log('+ loading queues from %s... ', config.dumpPath);

  try {
    var savedQueues = require(config.dumpPath);
    Object.keys(savedQueues).forEach(function(key) {
      var messages = savedQueues[key].messages;
      var newQueue = new queue.Queue(key);
      newQueue.messages = messages;
      queues[key] = newQueue;
    });
    console.log('+ ...done.');
  } catch (err) {
    console.log('X (%s) could not open dump file', err.code, config.dumpPath); 
    process.exit(1);
  }
};

var dumpToDisk = function() {
  console.log('+ dumping queue data to %s...', config.dumpPath);
  fs.writeFile(config.dumpPath, JSON.stringify(queues), function(err) {
    if (err) {
      return console.log(err);
    }
    return console.log('+ dumped queue data to disk');
  });
};

var respond = function(sock, response) {
  sock.write(response);
  sock.pipe(sock);
  console.log('^ %s', response.trim());
  sock.destroy();
};

var declareQueue = function(data, sock) {
  if (typeof data[1] === 'undefined') {
    respond(sock, 'ERR nothing to declare\n');
  } else if (typeof queues[data[1].trim()] !== 'undefined') {
    respond(sock, 'ERR queue already declared\n');
  } else {
    sock.name = data[1].trim();
    queues[sock.name] = new queue.Queue(sock.name);
    respond(sock, 'QOK ' + sock.name + '\n');
  }
};

var enqueue = function(data, sock) {
  data.shift();
  if (typeof data[0] === 'undefined' ||
      typeof queues[data[0].trim()] === 'undefined') {
    respond(sock, 'ERR nonexistent queue\n');
  } else if (data.length < 2) {
    respond(sock, 'ERR nothing to enqueue\n');
  } else {
    data[0] = data[0].trim();
    var q = queues[data[0]];
    data.shift();
    data = data.join(' ').trim();
    q.enqueue(data);
    respond(sock, 'EOK ' + q.messages.length + ' ' + data + '\n');
  }
};

var dequeue = function(data, sock) {
  data.shift();
  if (typeof data[0] === 'undefined' ||
      typeof queues[data[0].trim()] === 'undefined') {
    respond(sock, 'ERR nonexistent queue\n');
  } else {
    data[0] = data[0].trim();
    var q = queues[data[0]];
    if (q.messages.length < 1) {
      respond(sock, 'NULL empty queue\n');
    } else {
      var item = q.dequeue();
      respond(sock, 'DOK ' + q.messages.length + ' ' + item + '\n');
    }
  }
};

var parseRequest = function(sock) {
  sock.on('data', function(d) {
    sock.setKeepAlive(true);
    d.toString().split('\n').forEach(function(data) { 
      console.log('> %s', data.toString().trim());
      data = data.toString().split(' ');
      data[0] = data[0].trim();
      
      if (data[0] === 'DCQ') {
        declareQueue(data, sock);
      } else if (data[0] === 'ENQ') {
        enqueue(data, sock);
      } else if (data[0] === 'DEQ') {
        dequeue(data, sock);
      } else {
        respond(sock, 'ERR malformed request\n');
      }
    });
  });

  sock.on('error', function(err) {
    console.log('X %s', err);
      sock.destroy();
  });
};

var startServer = function() {
  loadFromDisk();

  var server = net.createServer(parseRequest);
  server.timeout = 0;
  server.listen(config.listenPort);

  server.on('error', function(err) {
    console.log('X (%s) could not start server', err.code);
    if (err.code === 'EACCES') {
      console.log('X could not bind to port', config.listenPort);
    }
    process.exit(1);
  });

  server.on('listening', function() {
    console.log('+ accepting connections on port %d...', config.listenPort);    
  });
  
  setInterval(dumpToDisk, config.dumpInterval * 60000);
};

module.exports.startServer = startServer;
