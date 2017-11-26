const { requireHelper } = require('../helper');
var seventyEight = requireHelper('seventy.eight');
const { field: { primary, string, json } } = seventyEight;

describe('#static-properties', function() {

  var User = seventyEight.createModel({
    constructor: function User() {},
    schema: {
      id: primary(),
      data: json(),
      json: json(),
    },
    staticProps: {
      activeStates: [0, 1],
    },
    instanceProps: {
      color: 'red',
    },
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
      id: primary(),
      username: string(),
    },
    staticMethods: {
      findByUsername(username) {
        return this.where({ username }).one();
      },
      customPromise() {
        setTimeout(() => {
          this.resolve({ done: true });
        }, 100);
        return this.promise;
      },
    },
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
      schema: {
        weird_id: string({ primary: true }),
        middle_name: { type: 'string' },
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
    new WeirdUser({
      weird_id: id,
      middle_name: name
    }).save().then(function() {
      WeirdUser.find(id).then(function(foundUser) {
        expect(foundUser.middle_name).toEqual(name);
        done();
      });
    });
  });
});

describe('#instance-properties', () => {});

describe('#instance-methods', () => {});
