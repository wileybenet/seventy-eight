var seventyEight = require('../../index');

describe('Interface', function(){

  describe('#methods', function(){

    it('should have createModel', function() {
      expect(typeof seventyEight.createModel).toEqual('function');
    });

  });

});