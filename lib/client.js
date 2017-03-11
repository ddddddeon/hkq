var net = require('net');

var Client = function(config) {
  this.config = config;

  var callback;
  
  var sendOverSock = function(message, cb) {
    var sock = new net.Socket();
    sock.connect(this.config.port, this.config.host, function() {
      sock.write(message.toString().trim());
    }.bind(this));

    sock.on('data', function(data) {
      cb(null, data.toString().trim());
    });

    sock.on('error', function(err) {
      sock.destroy();
      cb(err, null);
    });
  }.bind(this);

  var handleResponse = function(err, data) {
    if (err) {
      callback(err, null);
    } else {
      var responseObject = {};
      var splitData = data.split(' ');

      if (splitData[0] === 'ERR') {
	responseObject = {
          responseCode: splitData.shift(),
          message: splitData.join(' ')
        };
	  
        callback(responseObject, null);
      } else {
        responseObject = {
          responseCode: splitData.shift(),
          queueSize: splitData.shift(),
          message: splitData.join(' ')
        };

        callback(null, responseObject);
      }
    }
  }.bind(this);
  
  var declareQueue = function(name, cb) {
    callback = cb;
    sendOverSock('DCQ ' + name + '\n', handleResponse);
  }.bind(this);

  var enqueue = function(queue, msg, cb) {
    callback = cb;
    sendOverSock('ENQ ' + queue + ' ' + msg + '\n', handleResponse);
  }.bind(this);

  var dequeue = function(queue, cb) {
    callback = cb;
    sendOverSock('DEQ ' + queue + '\n', handleResponse);
  }.bind(this);

  this.declareQueue = declareQueue;
  this.enqueue = enqueue;
  this.dequeue = dequeue;
};

module.exports.Client = Client;
