var requireHelper = require('../helper');
var seventyEight = requireHelper('seventy.eight');

describe('#methods', function(){

  it('should have createModel', function() {
    expect(typeof seventyEight.createModel).toEqual('function');
  });

});

describe('#properties', function(){

  it('should have const', function() {
    expect(typeof seventyEight.const).toEqual('object');
  });

  it('should have promise', function() {
    expect(typeof seventyEight.promise).toEqual('object');
    expect(typeof seventyEight.promise.then).toEqual('function');
  });

});