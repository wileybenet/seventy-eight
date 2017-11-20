var requireHelper = require('../helper');
var seventyEight = requireHelper('seventy.eight');

describe('#static-properties', function() {

  var User = seventyEight.createModel({
    constructor: function User() {},
    schema: {
      id: true,
      data: true,
      json: true,
    },
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

describe('#static-methods', function() {

  var User = seventyEight.createModel({
    constructor: function User() {},
    schema: {
      id: true,
      username: true,
    },
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

describe('#options', function() {
  var WeirdUser;

  beforeEach(function() {
    WeirdUser = seventyEight.createModel({
      constructor: function WeirdUser() {},
      primaryKey: 'weird_id',
      schema: {
        weird_id: true,
        middle_name: true,
      }
    });
  });

  it('should lookup records by the primaryKey', function(done) {
    var id = 'sdf0Sjqnpfps9-jfa';
    WeirdUser.find(id).then(function(user) {
      expect(user.weird_id).toEqual(id);
      done();
    });
  });

  it('should upsert a record', function(done) {
    var id = 'sdf0Sjqnpfps9-jfa';
    var name = 'steve-o';
    var user = new WeirdUser({
      weird_id: id,
      middle_name: name
    }).save().then(function() {
      WeirdUser.find(id).then(function(user) {
        expect(user.middle_name).toEqual(name);
        done();
      });
    });
  });
});

describe('#instance-properties', function(){



});

describe('#instance-methods', function(){



});
