
var seventyEight = require('../../src/seventy.eight');

describe('#static-composition', function() {

  var User = seventyEight.createModel({
    constructor: function User() {},
    schema: {
      id: { type: 'int', primary: true },
    },
  });

  it('should combine all methods in correct order', function() {
    var query = User.group('id').where({ id: 1 }).limit(1).joins("INNER JOIN table ON table.id = users.id");

    expect(query.$sql()).toEqual("SELECT * FROM `users` INNER JOIN table ON table.id = users.id WHERE `id` = 1 GROUP BY `id` LIMIT 1;");
  });

  describe('#where-conditions', function() {

    it('should merge multiple where calls', function() {
      var query = User.where({ id: 1 }).where({ $OR: { name: 'root', title: 'manager' } });

      expect(query.$sql()).toEqual("SELECT * FROM `users` WHERE `id` = 1 AND (`name` = 'root' OR `title` = 'manager');");
    });

    it('should deserialize not/lessthan/greaterthan conditions', function() {
      var query = User.where({ id: ['<', 1], name: ['!=', 1], title: ['>=', 1] });

      expect(query.$sql()).toEqual("SELECT * FROM `users` WHERE `id` < 1 AND `name` != 1 AND `title` >= 1;");
    });

    it('should overwriting of keys from separate where statements', function() {
      var query = User.where({ id: 1 }).where({ id: ['!=', 1] }).where({ id: ['>=', 1] });

      expect(query.$sql()).toEqual("SELECT * FROM `users` WHERE `id` = 1 AND `id` != 1 AND `id` >= 1;");
    });

    it('should resolve deep $AND/$OR where conditions', function() {
      var query = User.where({ $OR: { name: 'root', $AND: { title: 'manager', $OR: { updated: 0, deleted: 1 } } } });

      expect(query.$sql()).toEqual("SELECT * FROM `users` WHERE (`name` = 'root' OR (`title` = 'manager' AND (`updated` = 0 OR `deleted` = 1)));");
    });

  });

  describe('#join-statements', function() {

    it('should combine multiple join statements in correct order', function() {
      var query = User
        .joins("INNER JOIN table ON table.id = users.id INNER JOIN table2 ON table2.name = users.name")
        .joins("OUTER JOIN table3 ON table3.limit = users.limit");

      expect(query.$sql()).toEqual("SELECT * FROM `users` INNER JOIN table ON table.id = users.id INNER JOIN table2 ON table2.name = users.name OUTER JOIN table3 ON table3.limit = users.limit;");
    });

  });

});
