var requireHelper = require('../helper');
var seventyEight = requireHelper('seventy.eight');

describe('#static-properties', function(){

  var User = seventyEight.createModel({
    constructor: function User() {},
    staticProps: {
      activeStates: [0, 1]
    },
    instanceProps: {
      color: 'red'
    }
  });

  it('should merge static properties', function() {
    expect(User.activeStates).toEqual([0, 1]);
  });

  it('should merge instance properties', function(done) {
    User.find(1).then(function(user) {
      expect(user.color).toEqual('red');
      done();
    });
  });

});

describe('#static-methods', function(){

  var User = seventyEight.createModel({
    constructor: function User() {},
    staticMethods: {
      findByUsername: function(username) {
        return this.where({ username: username }).one();
      },
      customPromise: function() {
        var this_ = this;
        setTimeout(function() {
          this_.resolve({ done: true });
        }, 100);
        return this.promise;
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

  it('should allow for custom resolutions within static methods', function(done) {
    var query = User.customPromise();
    query.then(function(data) {
      expect(data.done).toEqual(true);
      done();
    });
  });

});

describe('#options', function(){
  var WeirdUsers;

  beforeEach(function() {
    WeirdUsers = seventyEight.createModel({
      constructor: function WeirdUser() {},
      primaryKey: 'weird_id'
    });
  });

  it('should lookup records by the primaryKey', function(done) {
    WeirdUsers.find('sdf0Sjqnpfps9-jfa').then(function(user) {
      expect(user.middle_name).toEqual('goldwater');
      done();
    });
  });
});

describe('#instance-properties', function(){



});

describe('#instance-methods', function(){



});
