var fs = require('fs');
var net = require('net');
var path = require('path');
var queue = require('./queue');

var Server = function(config) {
  this.config = config;
  this.queues = [];

  this.setupConfig = function() {
    process.chdir(path.resolve(__dirname, '..'));
    var configPath = path.resolve(process.env.SFQ_CONFIG_PATH || 'config/config.json');
    var configFile = path.basename(configPath);
    
    if (!this.config ||
        Object.keys(this.config).length === 0 ||
        this.config.constructor.toString().indexOf('Object') < 0) {
      try {
        this.config = require(configPath);
        console.log('+ loaded config from ', configPath);
      } catch (err) {
        console.log('X could not load config from', configPath);
        process.exit(1);
      }
    } else {
      console.log('+ loaded config from config object');
    }
    
    this.config.dumpPath = path.resolve(process.env.SFQ_DUMP_PATH || this.config.dumpPath);
    this.config.dumpInterval = parseInt(process.env.SFQ_DUMP_INTERVAL || this.config.dumpInterval);
    this.config.listenPort = parseInt(process.env.SFQ_LISTEN_PORT || this.config.listenPort);
    
    if (!fs.existsSync(this.config.dumpPath)) {
      console.log('X could not find dump file:', this.config.dumpPath);
      process.exit(1);
    }
    
    if (isNaN(this.config.dumpInterval)) {
      console.log('X invalid dumpInterval (%s)', this.config.dumpInterval);
      process.exit(1);
    }
    
    if (isNaN(this.config.listenPort)) {
      console.log('X invalid listenPort (%s)', this.config.listenPort);
      process.exit(1);
    }
  }

  this.loadFromDisk = function() {
    this.setupConfig(this.config);
    console.log('+ loading queues from %s... ', this.config.dumpPath);
    
    try {
      var savedQueues = require(this.config.dumpPath);
      Object.keys(savedQueues).forEach(function(key) {
        var messages = savedQueues[key].messages;
        var newQueue = new queue.Queue(key);
        newQueue.messages = messages;
        this.squeues[key] = newQueue;
      });
      console.log('+ ...done.');
    } catch (err) {
      console.log('X (%s) could not open dump file', err.code, this.config.dumpPath); 
      process.exit(1);
    }
  };
  
  this.dumpToDisk = function() {
    console.log('+ dumping queue data to %s...', this.config.dumpPath);
    fs.writeFile(this.config.dumpPath, JSON.stringify(this.queues), function(err) {
      if (err) {
        return console.log(err);
      } else {
        return console.log('+ dumped queue data to disk');
      }
    });
  };
  
  this.respond = function(sock, response) {
    sock.write(response);
    sock.pipe(sock);
    console.log('^ %s', response.trim());
    sock.destroy();
  };
  
  this.declareQueue = function(data, sock) {
    if (typeof data[1] === 'undefined') {
      this.respond(sock, 'ERR nothing to declare\n');
    } else if (typeof this.queues[data[1].trim()] !== 'undefined') {
      this.respond(sock, 'ERR queue already declared\n');
    } else {
      sock.name = data[1].trim();
      this.queues[sock.name] = new queue.Queue(sock.name);
      this.respond(sock, 'QOK ' + sock.name + '\n');
    }
  };
  
  this.enqueue = function(data, sock) {
    data.shift();
    if (typeof data[0] === 'undefined' ||
        typeof this.queues[data[0].trim()] === 'undefined') {
      this.respond(sock, 'ERR nonexistent queue\n');
    } else if (data.length < 2) {
      this.respond(sock, 'ERR nothing to enqueue\n');
    } else {
      data[0] = data[0].trim();
      var q = this.queues[data[0]];
      data.shift();
      data = data.join(' ').trim();
      q.enqueue(data);
      this.respond(sock, 'EOK ' + q.messages.length + ' ' + data + '\n');
    }
  };
  
  this.dequeue = function(data, sock) {
    data.shift();
    if (typeof data[0] === 'undefined' ||
        typeof this.queues[data[0].trim()] === 'undefined') {
      this.respond(sock, 'ERR nonexistent queue\n');
    } else {
      data[0] = data[0].trim();
      var q = this.queues[data[0]];
      if (q.messages.length < 1) {
        this.respond(sock, 'NULL empty queue\n');
      } else {
        var item = q.dequeue();
        this.respond(sock, 'DOK ' + q.messages.length + ' ' + item + '\n');
      }
    }
  };
  
  this.parseRequest = function(sock) {
    var ctx = this;
    sock.on('data', function(d) {
      sock.setKeepAlive(true);
      d.toString().split('\n').forEach(function(data) { 
        console.log('> %s', data.toString().trim());
        data = data.toString().split(' ');
        data[0] = data[0].trim();
        
        if (data[0] === 'DCQ') {
          ctx.declareQueue(data, sock);
        } else if (data[0] === 'ENQ') {
          ctx.enqueue(data, sock);
        } else if (data[0] === 'DEQ') {
          ctx.dequeue(data, sock);
        } else {
          ctx.respond(sock, 'ERR malformed request\n');
        }
      });
    });
    
    sock.on('error', function(err) {
      console.log('X %s', err);
      sock.destroy();
    });
  };
  
  
  this.startServer = function() {
    this.loadFromDisk();
    
    var server = net.createServer(this.parseRequest);
    server.timeout = 0;
    server.listen(this.config.listenPort);

    var ctx = this;    
    server.on('error', function(err) {
      console.log('X (%s) could not start server', err.code);
      if (err.code === 'EACCES') {
        console.log('X could not bind to port', ctx.config.listenPort);
      }
      process.exit(1);
    });
    
    server.on('listening', function() {
      console.log('+ accepting connections on port %d...', ctx.config.listenPort);
    });
    
    setInterval(this.dumpToDisk, this.config.dumpInterval * 60000);
  };
};



module.exports.Server = Server;
