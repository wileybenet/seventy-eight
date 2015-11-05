var requireHelper = require('../helper');
var seventyEight = requireHelper('seventy.eight');

describe('#miscellaneous', function(){

  var UserRole = seventyEight.createModel({
    constructor: function UserRole() {}
  });

  it('should format tableName from constructor name', function() {
    expect(UserRole.tableName).toEqual('user_roles');
  });

});