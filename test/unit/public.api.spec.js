var requireHelper = require('../helper');
var seventyEight = requireHelper('seventy.eight');

describe('#methods', function(){

  it('should have createModel', function() {
    expect(typeof seventyEight.createModel).toEqual('function');
  });

  it('should have rejectedPromise', function(done) {
    expect(typeof seventyEight.rejectedPromise).toEqual('function');
    seventyEight.rejectedPromise('this is an error').then(function() {}, function(err) {
      expect(err).toEqual('this is an error');
      done();
    });
  });

  it('should have resolvedPromise', function(done) {
    expect(typeof seventyEight.resolvedPromise).toEqual('function');
    seventyEight.resolvedPromise({ resolved: true }).then(function(data) {
      expect(data).toEqual({ resolved: true });
      done();
    });
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
