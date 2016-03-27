var net = require('net');

module.exports.Client = function(config) {
  this.config = config;

  var sendOverSock = function(data, cb) {
    var dataString = data.toString().trim();
    this.sock = new net.Socket();
    this.sock.connect(this.config.port, this.config.host, function() {
      this.sock.write(dataString);
    }.bind(this));

    this.sock.on('data', function(data) {
      this.sock.destroy();
      cb(null, dataString);
    }.bind(this));

    this.sock.on('error', function(err) {
      this.sock.destroy();
      cb(err, null);
    }.bind(this));

    this.sock.on('close', function() {

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
