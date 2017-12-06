
var seventyEight = require('../../src/seventy.eight');

describe('#miscellaneous', function() {

  const obj = {};

  const User = seventyEight.createModel({
    constructor: function User() {},
    tableName: 'user_tbl',
    schema: {
      id: { type: 'int', primary: true },
    },
  });

  const UserRole = seventyEight.createModel({
    constructor: function UserRole() {},
  });

  it('should format tableName from constructor name', function() {
    expect(UserRole.tableName).toEqual('user_roles');
  });

  it('should throw if model not loaded', function() {
    expect(() => seventyEight.getModel('balogna')).toThrow();
  });

  it('should store explicit tableName', function() {
    expect(User.tableName).toEqual('user_tbl');
  });

  it('should format types with static `int`', function() {
    expect(User.int('45')).toEqual(45);
    expect(User.int(45)).toEqual(45);
    expect(User.int('')).toEqual(null);
    expect(User.int(null, 0)).toEqual(0);
    expect(User.int(obj.undef)).toEqual(null);
  });

  it('should format types with static `string`', function() {
    expect(User.string('45')).toEqual('45');
    expect(User.string(45)).toEqual('45');
    expect(User.string('')).toEqual('');
    expect(User.string(null)).toEqual(null);
    expect(User.string(null, '')).toEqual('');
    expect(User.string('null')).toEqual('null');
    expect(User.string(obj.undef)).toEqual(null);
  });

});
