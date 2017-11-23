const { requireHelper } = require('../helper');
var seventyEight = requireHelper('seventy.eight');

describe('#miscellaneous', function(){

  var UserRole = seventyEight.createModel({
    constructor: function UserRole() {}
  });

  it('should format tableName from constructor name', function() {
    expect(UserRole.tableName).toEqual('user_roles');
  });

  var User = seventyEight.createModel({
    constructor: function User() {},
    tableName: 'user_tbl',
    schema: {},
  });

  it('should store explicit tableName', function() {
    expect(User.tableName).toEqual('user_tbl');
  });

  it('should format types with static `int`', function() {
    expect(User.int('45')).toEqual(45);
    expect(User.int(45)).toEqual(45);
    expect(User.int('')).toEqual(null);
    expect(User.int(null, 0)).toEqual(0);
    expect(User.int(undefined)).toEqual(null);
  });

  it('should format types with static `string`', function() {
    expect(User.string('45')).toEqual('45');
    expect(User.string(45)).toEqual('45');
    expect(User.string('')).toEqual('');
    expect(User.string(null)).toEqual(null);
    expect(User.string(null, '')).toEqual('');
    expect(User.string('null')).toEqual('null');
    expect(User.string(undefined)).toEqual(null);
  });

});
