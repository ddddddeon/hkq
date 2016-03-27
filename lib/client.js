var net = require('net');

module.exports.Client = function(config) {
  this.config = config;

  var sendOverSock = function(data, cb) {
    this.sock = new net.Socket();
    this.sock.connect(this.config.port, this.config.host, function() {
      console.log('connected to %s:%d\n', this.config.host, this.config.port);
      this.sock.write(data.toString());
    }.bind(this));

    this.sock.on('data', function(data) {
      this.sock.destroy();
      cb(null, data.toString());
    }.bind(this));

    this.sock.on('error', function(err) {
      this.sock.destroy();
      cb(err, null);
    }.bind(this));
  }.bind(this);
  
  this.declareQueue = function(name, cb) {
    sendOverSock('DCQ ' + name + '\n', function(err, data) {
      if (err) {
        cb(err, null);
      } else {
        cb(null, data);
      }
    });
  };

  this.enqueue = function(queue, msg, cb) {
    sendOverSock('ENQ ' + queue + ' ' + msg + '\n', function(err, data) {
      if (err) {
        cb(err, null);
      } else {
        cb(null, data);
      }
    });
  };

  this.dequeue = function(queue, cb) {
    sendOverSock('DEQ ' + queue + '\n', function(err, data) {
      if (err) {
        cb(err, null);
      } else {
        cb(null, data);
      }
    });
  };
};
