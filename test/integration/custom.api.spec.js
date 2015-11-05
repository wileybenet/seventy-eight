var requireHelper = require('../helper');
var seventyEight = requireHelper('seventy.eight');

describe('#static-properties', function(){

  var User = seventyEight.createModel({
    constructor: function User() {},
    staticProps: {
      activeStates: [0, 1]
    }
  });

  it('should merge static properties', function() {
    expect(User.activeStates).toEqual([0, 1]);
  });

});

describe('#static-methods', function(){

  var User = seventyEight.createModel({
    constructor: function User() {},
    staticMethods: {
      findByUsername: function(username) {
        return this.where({ username: username }).one();
      }
    }
  });

  it('should merge static members', function(done) {
    var query = User.findByUsername('root');
    query.then(function(user) {
      expect(user.username).toEqual('root');
      done();
    });
  });

});

describe('#instance-properties', function(){

  
  
});

describe('#instance-methods', function(){



});