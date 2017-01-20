var requireHelper = require('../helper');
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
    tableName: 'user_tbl'
  });

  it('should store explicit tableName', function() {
    expect(User.tableName).toEqual('user_tbl');
  });

});
