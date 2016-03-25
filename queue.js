
var Queue = function(name) {
  this.name = name;
  this.queue = [];

  this.enqueue = function(body) {
    this.queue.push(body);
  };

  this.dequeue = function() {
    var first = this.queue.shift();
    return first;
  };
}

module.exports.Queue = Queue;
