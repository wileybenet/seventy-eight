const { requireHelper } = require('../helper');
var seventyEight = requireHelper('seventy.eight');

describe('#miscellaneous', function() {

  xit('should have ping method', function() {
    expect(typeof seventyEight.db.ping).toEqual('function');
  });

  xit('should have getClient method', function() {
    expect(typeof seventyEight.db.getClient).toEqual('function');
  });

  xit('should provide access to a pool connection', function(done) {
    seventyEight.db.getClient(function(connection) {
      expect(connection.constructor.name).toEqual('PoolConnection');
      connection.release();
      done();
    });
  });

});
