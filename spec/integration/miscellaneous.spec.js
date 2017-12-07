const { lasso } = require('../helpers');
const seventyEight = require('../../src/seventy.eight');

describe('#miscellaneous', function() {

  it('should have ping method', function() {
    expect(typeof seventyEight.db.ping).toEqual('function');
  });

  it('should have getConnection method', function() {
    expect(typeof seventyEight.db.getConnection).toEqual('function');
  });

  it('should provide access to a pool connection', lasso(async () => {
    const connection = await seventyEight.db.getConnection();
    expect(connection.release).toEqual(jasmine.any(Function));
    connection.release();
  }));

});
