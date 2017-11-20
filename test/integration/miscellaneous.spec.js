var requireHelper = require('../helper');
var seventyEight = requireHelper('seventy.eight');

describe('#miscellaneous', function() {

  it('should have ping method', function() {
    expect(typeof seventyEight.db.ping).toEqual('function');
  });

  it('should have getClient method', function() {
    expect(typeof seventyEight.db.getClient).toEqual('function');
  });

  it('should ping db connection and then release', function(done) {
    var release = seventyEight.db.ping(10, function(err) {
      expect(err).toEqual(null);
      release();
      done();
    });
  });

  it('should provide access to a pool connection', function(done) {
    seventyEight.db.getClient(function(connection) {
      expect(connection.constructor.name).toEqual('PoolConnection');
      connection.release();
      done();
    });
  });

});
