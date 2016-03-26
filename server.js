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
    console.log('+++ dumped queue data to disk');
  });
}

function respond(sock, response) {
  sock.write(response);
  sock.pipe(sock);
  console.log('  ^   ' + response.trim());
};

loadFromDisk();

server = net.createServer(function(sock) {
  sock.on('data', function(d) {
    sock.setKeepAlive(true);
    d.toString().split('\n').forEach(function(data) { 
      var q;
      var response;
      
      console.log('> ' + data.toString().trim());
      if (process.env.DEBUG) {
        console.log(data.toString().split(' '));
        console.log(queues);
        sock.destroy();
      }
      
      data = data.toString().split(' ');
      data[0] = data[0].trim();
      
      /* declare queue */
      if (data[0] === 'DCQ') {
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
      
      /* enqueue */
      if (data[0] === 'ENQ') {
        data.shift();
        if (typeof data[0] === 'undefined' ||
            typeof queues[data[0].trim()] === 'undefined') {
          respond(sock, 'ERR nonexistent queue\n');
        } else if (data.length < 2) {
          respond(sock, 'ERR nothing to enqueue\n');
        } else {
          data[0] = data[0].trim();
          q = queues[data[0]];
          data.shift();
          data = data.join(' ').trim();
          
          q.enqueue(data);
          respond(sock, 'EOK ' + q.messages.length + ' ' + data + '\n');
        }
      }
      
      /* dequeue */
      if (data[0] === 'DEQ') {
        data.shift();
        
        if (typeof data[0] === 'undefined' ||
            typeof queues[data[0].trim()] === 'undefined') {
          respond(sock, 'ERR nonexistent queue\n');
        } else {
          data[0] = data[0].trim();
          q = queues[data[0]];
          
          if (q.messages.length < 1) {
            respond(sock, "NULL empty queue\n");
          } else {
            var item = q.dequeue();
            respond(sock, 'DOK ' + q.messages.length + ' ' + item + '\n');
          }
        }
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
