
function Collection() {}

Collection.prototype = Object.create( Array.prototype );

Collection.prototype.constructor = Collection;

Collection.prototype.public = function() {
  return this.map(function(item) {
    return item._public();
  });
};

module.exports = Collection;