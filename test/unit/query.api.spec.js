var requireHelper = require('../helper');
var seventyEight = requireHelper('seventy.eight');

describe('#base-static-methods', function(){

  var Model = seventyEight.createModel({
    constructor: function Model() {}
  });

  it('should pluralize Classname', function() {
    var query = Model.all();
    
    expect(query.$renderSql()).toEqual("SELECT * FROM `models`;");
  });

  it('should limit and restrict FIND calls', function() {
    var query = Model.find(1);

    expect(query.$renderSql()).toEqual("SELECT * FROM `models` WHERE `id` = 1 LIMIT 1;");
  });

  it('should limit one calls', function() {
    var query = Model.one();

    expect(query.$renderSql()).toEqual("SELECT * FROM `models` LIMIT 1;");
  });

  it('should format select strings', function() {
    var query = Model.select("id, name, title");

    expect(query.$renderSql()).toEqual("SELECT id, name, title FROM `models`;");
  });

  it('should format select arrays', function() {
    var query = Model.select(["id", "name", "title"]);

    expect(query.$renderSql()).toEqual("SELECT id, name, title FROM `models`;");
  });

  it('should format WHERE objects', function() {
    var query = Model.where({ id: 1 });

    expect(query.$renderSql()).toEqual("SELECT * FROM `models` WHERE `id` = 1;");
  });

  it('should format WHERE objects with $OR clauses', function() {
    var query = Model.where({ $OR: { id: 1, name: 'root' } });

    expect(query.$renderSql()).toEqual("SELECT * FROM `models` WHERE (`id` = 1 OR `name` = 'root');");
  });

  it('should format WHERE objects with $AND clauses', function() {
    var query = Model.where({ $AND: { id: 1, name: 'root' } });

    expect(query.$renderSql()).toEqual("SELECT * FROM `models` WHERE (`id` = 1 AND `name` = 'root');");
  });

  it('should format WHERE array values', function() {
    var query = Model.where({ id: [1, 2, 3, 4] });

    expect(query.$renderSql()).toEqual("SELECT * FROM `models` WHERE `id` IN (1, 2, 3, 4);");
  });

  it('should format JOIN strings', function() {
    var query = Model.joins("INNER JOIN user_roles ON user_roles.user_id = models.id");

    expect(query.$renderSql()).toEqual("SELECT * FROM `models` INNER JOIN user_roles ON user_roles.user_id = models.id;");
  });

  it('should format JOIN arrays', function() {
    var query = Model.joins([
      "INNER JOIN user_roles", 
        "ON user_roles.user_id = models.id"]);

    expect(query.$renderSql()).toEqual("SELECT * FROM `models` INNER JOIN user_roles ON user_roles.user_id = models.id;");
  });

  it('should format ORDER strings', function() {
    var query = Model.order("id DESC");

    expect(query.$renderSql()).toEqual("SELECT * FROM `models` ORDER BY id DESC;");
  });

  it('should format ORDER arrays', function() {
    var query = Model.order(["id", "name"]);

    expect(query.$renderSql()).toEqual("SELECT * FROM `models` ORDER BY id, name;");
  });

  it('should format GROUP strings', function() {
    var query = Model.group("name");

    expect(query.$renderSql()).toEqual("SELECT * FROM `models` GROUP BY `name`;");
  });

  it('should format GROUP arrays', function() {
    var query = Model.group(["name", "id"]);

    expect(query.$renderSql()).toEqual("SELECT * FROM `models` GROUP BY `name`, `id`;");
  });

});