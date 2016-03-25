var net = require('net');
var queue = require('./queue');

var queues = {};

net.createServer(function(sock) {
  sock.on('data', function(data) {
    if (process.env.DEBUG) {
      console.log(data.toString().split(' '));
      console.log(queues);
    }
    
    data = data.toString().split(' ');
    data[0] = data[0].trim();
    
    /* declare queue */
    if (data[0] === 'DCQ') {
      if (typeof data[1] === 'undefined') {
        sock.write('ERR nothing to declare\n');
      } else if (typeof queues[data[1].trim()] !== 'undefined') {
        sock.write('ERR queue already declared\n');
      } else {
        sock.name = data[1].trim();
        queues[sock.name] = new queue.Queue(sock.name);
        sock.write("DOK " + sock.name + '\n');
      }
    }

    var q;
    
    /* enqueue */
    if (data[0] === 'ENQ') {
      data.shift();
      if (typeof data[0] === 'undefined' ||
          typeof queues[data[0].trim()] === 'undefined') {
        sock.write('ERR nonexistent queue\n');
      } else if (data.length < 2) {
        sock.write('ERR nothing to enqueue\n');
      } else {
        data[0] = data[0].trim();
        q = queues[data[0]];
        data.shift();
        data = data.join(' ').trim();

        q.enqueue(data);
        sock.write('EOK ' + q.queue.length + ' ' + data + '\n');
      }
    }

    /* dequeue */
    if (data[0] === 'DEQ') {
      data.shift();

      if (typeof data[0] === 'undefined' ||
          typeof queues[data[0].trim()] === 'undefined') {
        sock.write('ERR nonexistent queue\n');
      } else {
        data[0] = data[0].trim();
        q = queues[data[0]];

        if (q.queue.length < 1) {
          sock.write("NULL empty queue\n");
        } else {
          var item = q.dequeue();
          sock.write(item + '\n');
        }
      }
    }
  });
}).listen(9090);
