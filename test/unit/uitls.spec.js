const { requireHelper } = require('../helper');
var utils = requireHelper('lib/utils.js');

describe('#utils', function() {

  xit('should convert snake to camel case', function() {
    expect(utils.toCamel('hello_lonely_world')).toEqual('helloLonelyWorld');
  });

  xit('should convert camel to snake case', function() {
    expect(utils.toSnake('helloLonelyWorld')).toEqual('hello_lonely_world');
  });

});
