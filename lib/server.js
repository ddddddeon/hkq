var fs = require('fs');
var net = require('net');
var path = require('path');
var events = require('events');
var queue = require('./queue');

var Server = function(config) {
  this.config = config;
  this.queues = [];

  var server;
  var dumpInBackground;
  var writeLock = false;

  var respond = function(sock, response, cb) {
    sock.write(response, function(err) {
      if (typeof cb !== 'undefined') {
        cb(err);
      } else {
        if (err) {
          console.log("X (%s) socket write error", err.code);
        } else {
          console.log('^ %s', response.trim());
        }
        sock.end();
      }
    });
  };

  var parseRequest = function(sock) {
    sock.on('data', function(data) {
      sock.setKeepAlive(true);
      data = data.toString().split('\n')[0];
      console.log('> %s', data);
      data = data.split(' ');
      data[0] = data[0];

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

    sock.on('error', function(err) {
      console.log('X %s', err);
      sock.destroy();
    });

    sock.on('end', function() {
      sock.destroy();
    });
  };

  var declareQueue = function(data, sock) {
    if (typeof data[1] === 'undefined') {
      respond(sock, 'ERR nothing to declare\n');
    } else if (typeof this.queues[data[1].trim()] !== 'undefined') {
      respond(sock, 'ERR queue already declared\n');
    } else {
      sock.name = data[1].trim();
      this.queues[sock.name] = new queue.Queue(sock.name);
      respond(sock, 'QOK ' + sock.name + '\n');
    }
  }.bind(this);
    
  var enqueue = function(data, sock) {
    data.shift();
    if (typeof data[0] === 'undefined' ||
        typeof this.queues[data[0].trim()] === 'undefined') {
      respond(sock, 'ERR nonexistent queue\n');
    } else if (data.length < 2) {
      respond(sock, 'ERR nothing to enqueue\n');
    } else {
      data[0] = data[0].trim();
      var qName = data[0];
      var q = this.queues[data[0]];
      data.shift();
      data = data.join(' ').trim();
      q.enqueue(data);
      respond(sock, 'EOK ' + q.messages.length + ' ' + data + '\n');
    }
  }.bind(this);
  
  var dequeue = function(data, sock) {
    data.shift();
    if (typeof data[0] === 'undefined' ||
        typeof this.queues[data[0].trim()] === 'undefined') {
      respond(sock, 'ERR nonexistent queue\n');
    } else {
      data[0] = data[0].trim();
      var q = this.queues[data[0]];
      if (q.messages.length < 1) {
        respond(sock, 'NULL empty queue\n');
      } else {
        var item = q.dequeue();
        this.queues[data[0]] = q;
        respond(sock, 'DOK ' + q.messages.length + ' ' + item + '\n', function(err) {
          if (err) {
            return console.log('X (%s) socket write error');
          }
          /* TODO 
           *  wait for client ACK/NACK
           *  if NACK, enqueue item 
           *  if ACK, close socket
           *  move this code into a function
           */
          sock.end();
        });
      }
    }
  }.bind(this);
  
  var setupConfig = function() {
    var defaultConfigPath = path.resolve(__dirname, '..', 'config/config.json');
    var configPath = path.resolve(process.env.SFQ_CONFIG_PATH || defaultConfigPath);
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
    
    this.config.dumpPath = path.resolve(
      process.env.SFQ_DUMP_PATH || this.config.dumpPath);
    this.config.dumpInterval = parseInt(
      process.env.SFQ_DUMP_INTERVAL || this.config.dumpInterval);
    this.config.listenPort = parseInt(
      process.env.SFQ_LISTEN_PORT || this.config.listenPort);
    
    if (!fs.existsSync(this.config.dumpPath)) {
      console.log('X could not find dump file at %s',
                  this.config.dumpPath);
      console.log('+ creating empty dump file...');
      try {
        fs.writeFileSync(this.config.dumpPath, '{}',
                       { flags: 'w' });
      } catch(err) {
        console.log('X (%s) could not create dump file! exiting...', err.code);
        process.exit(1);
      }
    }
    
    if (isNaN(this.config.dumpInterval)) {
      console.log('X invalid dumpInterval (%s)',
                  this.config.dumpInterval);
      process.exit(1);
    }
    
    if (isNaN(this.config.listenPort)) {
      console.log('X invalid listenPort (%s)',
                  this.config.listenPort);
      process.exit(1);
    }
  }.bind(this);

  var loadFromDisk = function() {
    setupConfig(this.config);
    console.log('+ loading queues from %s', this.config.dumpPath);

    var savedQueues;
    try {
      savedQueues = require(this.config.dumpPath);
    } catch(err) {
      console.log('X (%s) could not open dump file at %s',
                  err.code, this.config.dumpPath);
      console.log('+ exiting...');
      process.exit(1);
    }
    
    Object.keys(savedQueues).forEach(function(key) {
      var newQueue = new queue.Queue(key);
      newQueue.messages = savedQueues[key].messages;
      this.queues[key] = newQueue;
    }.bind(this));
    console.log('+ ...done.');
  }.bind(this);

  var dumpToDisk = function(cb) {
    var path = this.config.dumpPath;
    var dump = {};

    Object.keys(this.queues).forEach(function(queue) {
      dump[queue] = {
        messages: this.queues[queue].messages
      };
    }.bind(this));
    
    dump = JSON.stringify(dump);

    if (writeLock === true) {
      var error = {
        code: 'ELOCKED',
        errno: 666,
        syscall: 'write'
      };
      cb(error, false);
    } else {
      writeLock = true;
      fs.writeFile(path, dump, function(err) {
        writeLock = false;
        if (err) {          
          cb(err, false);
        } else {
          cb(null, true);
        }
      }.bind(this));
    }
  }.bind(this);

  var dumpAtInterval = function() {
    console.log('+ dumping queue data to %s', this.config.dumpPath);
    dumpToDisk(function(err, dumped) {
      if (err) {
        console.log('X (%s) could not dump to disk!', err.code);
      } else {
        console.log('+ dumped queue data to disk');
      }
    });
  }.bind(this);
  
  var serverError = function(err, cb) {
    if (err.code === 'EACCES' || err.code === 'EADDRINUSE') {
      console.log('X could not bind to port', this.config.listenPort);
      process.exit(1);
    } else {
      console.log('X (%s) server error!', err.code);
      dumpToDisk(function(err, dumped) {
        if (err) {
          console.log('X (%s) could not dump queue data to disk!', err.code);
        }
        if (dumped) {
          console.log('+ dumped queue data to disk, exiting...');
        }
        if (typeof cb !== 'undefined') {
          cb(err, null);
        } else {
          process.exit(1);
        }
      });
    }
  }.bind(this);

  var stopServer = function() {
    clearInterval(dumpInBackground);
    
    if (writeLock !== true) {
      console.log('+ exiting...');
    } else {
      console.log(' + signal received while writing queue data to disk.');
      console.log(' + dumping again and exiting...');
      writeLock = false;
    }
    dumpToDisk(function(err, dumped) {
      writeLock = true;
      if (err) {
        console.log('X (%s) could not dump to disk, exiting anyway...', err.code);
      } else {
        console.log('+ dumped queue data to disk, exiting...');
      }
      process.exit(0);
    });
  };
  
  var startServer = function(cb) {
    loadFromDisk();
    
    server = net.createServer(parseRequest);
    server.timeout = 0;
    server.listen(this.config.listenPort);
    
    server.on('error', function(err) {
      serverError(err, cb);
    }.bind(this));

    server.on('listening', function() {
      console.log('+ accepting connections on port %d...',
                  this.config.listenPort);
    }.bind(this));

    server.on('close', stopServer);

    dumpInBackground = setInterval(dumpAtInterval.bind(this),
                                  this.config.dumpInterval * 60000);
    
    if (typeof cb !== 'undefined') {
      cb(null, true);
    }

  }.bind(this);  

  process.on('SIGINT', function() {
    console.log('X received SIGINT');
    server.close();
  });

  process.on('SIGTERM', function() {
    console.log('X received SIGTERM');
    server.close();
  });

  process.on('SIGHUP', function() {
    console.log('X received SIGHUP');
    server.close();    
  });

  process.on('SIGQUIT', function() {
    console.log('X received SIGQUIT');
    server.close();
  });

  process.on('SIGABRT', function() {
    console.log('X received SIGABRT');
    server.close();
  });
  
  this.startServer = startServer;
};

module.exports.Server = Server;
