var net = require('net');

module.exports.Client = function(config) {
  this.config = config;

  var sendOverSock = function(message, cb) {
    this.sock = new net.Socket();
    this.sock.connect(this.config.port, this.config.host, function() {
      this.sock.write(message.toString().trim());
    }.bind(this));

    this.sock.on('data', function(data) {
      this.sock.destroy();
      cb(null, data.toString().trim());
    }.bind(this));

    this.sock.on('error', function(err) {
      this.sock.destroy();
      cb(err, null);
    }.bind(this));
  }.bind(this);

  var handleResponse = function(err, data) {
    if (err) {
      this.callback(err, null);
    } else {
      this.callback(null, data);
    }
  }.bind(this);
  
  this.declareQueue = function(name, cb) {
    this.callback = cb;
    sendOverSock('DCQ ' + name + '\n', handleResponse);
  };

  this.enqueue = function(queue, msg, cb) {
    this.callback = cb;
    sendOverSock('ENQ ' + queue + ' ' + msg + '\n', handleResponse);
  };

  this.dequeue = function(queue, cb) {
    this.callback = cb;
    sendOverSock('DEQ ' + queue + '\n', handleResponse);
  };
};
