var requireHelper = require('../helper');
var seventyEight = requireHelper('seventy.eight');

describe('#miscellaneous', function(){

  it('should ping db connection and then release', function(done) {
    expect(typeof seventyEight.db.ping).toEqual('function');
    var release = seventyEight.db.ping(10, function(err) {
      expect(err).toEqual(null);
      release();
      done();
    });
  });

  it('should provide access to a pool connection', function(done) {
    expect(typeof seventyEight.db.getClient).toEqual('function');
    var release = seventyEight.db.getClient(function(connection) {
      expect(connection.constructor.name).toEqual('PoolConnection');
      connection.release();
      done();
    });
  });

});