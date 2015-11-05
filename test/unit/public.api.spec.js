var requireHelper = require('../helper');
var seventyEight = requireHelper('seventy.eight');

describe('#methods', function(){

  it('should have createModel', function() {
    expect(typeof seventyEight.createModel).toEqual('function');
  });

});