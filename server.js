var fs = require('fs');
var net = require('net');
var queue = require('./queue');
var queues = {};

function loadFromDisk() {
  console.log('+ loading queues from disk...');
  var savedQueues = require('./queues.json');

  Object.keys(savedQueues).forEach(function(key) {
    var messages = savedQueues[key].messages;
    var newQueue = new queue.Queue(key);
    newQueue.messages = messages;
    queues[key] = newQueue;
  });
  console.log('+...done.');
}

function dumpToDisk() {
  console.log('+++ dumping queue data to disk...');
  fs.writeFile('./queues.json', JSON.stringify(queues), function(err) {
    if (err) {
      return console.log(err);
    }
    return console.log('+++ dumped queue data to disk');
  });
}

function respond(sock, response) {
  sock.write(response);
  sock.pipe(sock);
  console.log('  ^   ' + response.trim());
};

function declareQueue(data, sock) {
  if (typeof data[1] === 'undefined') {
    respond(sock, 'ERR nothing to declare\n');
  } else if (typeof queues[data[1].trim()] !== 'undefined') {
    respond(sock, 'ERR queue already declared\n');
  } else {
    sock.name = data[1].trim();
    queues[sock.name] = new queue.Queue(sock.name);
    respond(sock, 'QOK ' + sock.name + '\n');
  }
}

function enqueue(data, sock) {
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
}

function dequeue(data, sock) {
  data.shift();
  if (typeof data[0] === 'undefined' ||
      typeof queues[data[0].trim()] === 'undefined') {
    respond(sock, 'ERR nonexistent queue\n');
  } else {
    data[0] = data[0].trim();
    var q = queues[data[0]];
    if (q.messages.length < 1) {
      respond(sock, "NULL empty queue\n");
    } else {
      var item = q.dequeue();
      respond(sock, 'DOK ' + q.messages.length + ' ' + item + '\n');
    }
  }
}

function startServer() {
  loadFromDisk();
  server = net.createServer(function(sock) {
    sock.on('data', function(d) {
      sock.setKeepAlive(true);
      d.toString().split('\n').forEach(function(data) { 
        console.log('> ' + data.toString().trim());
        data = data.toString().split(' ');
        data[0] = data[0].trim();

        if (data[0] === 'DCQ') {
          declareQueue(data, sock);
        } else if (data[0] === 'ENQ') {
          enqueue(data, sock);
        } else if (data[0] === 'DEQ') {
          dequeue(data, sock);
        }
      });
    });
    
    sock.on('error', function(err) {
      console.log('X ' + err);
      sock.destroy();
    });
  });

  server.timeout = 0;
  server.listen(9090);
  
  setInterval(dumpToDisk, 60 * 1000);
}

startServer();
