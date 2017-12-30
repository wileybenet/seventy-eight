const { lasso } = require('../helpers');
const seventyEight = require('../../src/index');
const { field: { primary, string, json } } = seventyEight;

describe('#static-properties', function() {

  const User = seventyEight.createModel({
    constructor: function User() {},
    schema: {
      id: primary(),
      data: json(),
      json: json(),
    },
    static: {
      activeStates: [0, 1],
    },
    instance: {
      color: 'red',
    },
  });

  it('should merge static properties', function() {
    expect(User.activeStates).toEqual([0, 1]);
  });

  it('should merge instance properties', lasso(async () => {
    const { color } = await User.find(1).exec();
    expect(color).toEqual('red');
  }));

});

describe('#static-methods', function() {

  const User = seventyEight.createModel({
    constructor: function User() {},
    schema: {
      id: primary(),
      username: string(),
    },
    query: {
      findByUsername(username) {
        this.where({ username }).one();
      },
    },
  });

  it('should merge static members', lasso(async () => {
    const { username } = await User.findByUsername('root').exec();
    expect(username).toEqual('root');
  }));

});

describe('#instance', () => {
  const User = seventyEight.createModel({
    constructor: function User() {},
    schema: {
      id: primary(),
      username: string(),
    },
    instance: {
      level: '37 and a half',
      initials() {
        return this.username.substr(0, 2).toUpperCase();
      },
    },
  });

  it('should make instance props available to instances', lasso(async () => {
    const { level } = await User.find(1).exec();
    expect(level).toEqual('37 and a half');
  }));

  it('should make instance methods available to instances', lasso(async () => {
    const user = await User.find(1).exec();
    expect(user.initials()).toEqual('RO');
  }));
});
