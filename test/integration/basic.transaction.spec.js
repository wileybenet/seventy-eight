var requireHelper = require('../helper');
var seventyEight = requireHelper('seventy.eight');

describe('#static-query', function(){

  var User = seventyEight.createModel({
    constructor: function User() {}
  });

  it('should retreive instances with all()', function(done) {
    var query = User.all();
    query.then(function(users) {
      expect(users.constructor.name).toEqual('Collection');
      done();
    });
  });

  it('should retreive a single instance with one()', function(done) {
    var query = User.one();
    query.then(function(users) {
      expect(users.constructor.name).toEqual('User');
      done();
    });
  });

});