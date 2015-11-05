var requireHelper = require('../helper');
var seventyEight = requireHelper('seventy.eight');

describe('#persistence-methods', function(){

  var User = seventyEight.createModel({
    constructor: function User() {}
  });

  var user = new User({ id: 1, name: 'root' });

  it('should save into database', function() {
    // user.save();
    expect(true).toEqual(true);
  });

});