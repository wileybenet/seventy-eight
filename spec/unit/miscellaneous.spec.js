
var seventyEight = require('../../src/index');
const { field: { primary } } = seventyEight;

describe('#miscellaneous', function() {

  const User = seventyEight.createModel({
    constructor: function User() {},
    tableName: 'user_tbl',
    schema: {
      id: primary(),
    },
  });

  const UserRole = seventyEight.createModel({
    constructor: function UserRole() {},
    schema: {
      id: primary(),
    },
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

});
