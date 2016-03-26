var Queue = function(name) {
  this.name = name;
  this.messages = [];

  this.enqueue = function(body) {
    this.messages.push(body);
  };

  this.dequeue = function() {
    var first = this.messages.shift();
    return first;
  };
}

module.exports.Queue = Queue;
