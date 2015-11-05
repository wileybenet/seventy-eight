var requireHelper = require('../helper');
var seventyEight = requireHelper('seventy.eight');

describe('#static-composition', function(){

  var User = seventyEight.createModel({
    constructor: function User() {}
  });

  it('should ', function(done) {
    var query = User.all();
    query.then(function(users) {
      expect(users.constructor.name).toEqual('Collection');
      done();
    });
  });

});