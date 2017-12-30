
var seventyEight = require('../../src/index');

describe('#base-static-methods', () => { // eslint-disable-line max-statements

  var QueryModel = seventyEight.createModel({
    constructor: function QueryModel() {},
    schema: {
      id: { type: 'int', primary: true },
    },
  });

  it('should pluralize Classname', function() {
    var query = QueryModel.all();

    expect(query.$sql()).toEqual("SELECT * FROM `query_models`;");
  });

  it('should limit and restrict FIND calls', function() {
    var query = QueryModel.find(1);

    expect(query.$sql()).toEqual("SELECT * FROM `query_models` WHERE `query_models`.`id` = 1 LIMIT 1;");
  });

  it('should limit one calls', function() {
    var query = QueryModel.one();

    expect(query.$sql()).toEqual("SELECT * FROM `query_models` LIMIT 1;");
  });

  it('should format select strings', function() {
    var query = QueryModel.select("id, name, title");

    expect(query.$sql()).toEqual("SELECT id, name, title FROM `query_models`;");
  });

  it('should format select arrays', function() {
    var query = QueryModel.select(["id", "name", "title"]);

    expect(query.$sql()).toEqual("SELECT id, name, title FROM `query_models`;");
  });

  it('should format multiple select calls', function() {
    var query = QueryModel.select(["id", "name"]).select("title");

    expect(query.$sql()).toEqual("SELECT id, name, title FROM `query_models`;");
  });

  it('should format WHERE objects', function() {
    var query = QueryModel.where({ id: 1 });

    expect(query.$sql()).toEqual("SELECT * FROM `query_models` WHERE `id` = 1;");
  });

  it('should omit falsy WHERE objects', function() {
    var query = QueryModel.where(null);

    expect(query.$sql()).toEqual("SELECT * FROM `query_models`;");
  });

  it('should pass WHERE string literally', function() {
    var query = QueryModel.where('id = 10');

    expect(query.$sql()).toEqual("SELECT * FROM `query_models` WHERE id = 10;");
  });

  it('should format WHERE objects with $OR clauses and a single comparator', function() {
    var query = QueryModel.where({ $OR: { id: 1 } });

    expect(query.$sql()).toEqual("SELECT * FROM `query_models` WHERE (`id` = 1);");
  });

  it('should format WHERE objects with $OR clauses and multiple comparators', function() {
    var query = QueryModel.where({ $OR: { id: 1, name: 'root' } });

    expect(query.$sql()).toEqual("SELECT * FROM `query_models` WHERE (`id` = 1 OR `name` = 'root');");
  });

  it('should format WHERE objects with $AND clauses and a single comparator', function() {
    var query = QueryModel.where({ $AND: { name: 'root' } });

    expect(query.$sql()).toEqual("SELECT * FROM `query_models` WHERE (`name` = 'root');");
  });

  it('should format WHERE objects with $AND clauses and multiple comparators', function() {
    var query = QueryModel.where({ $AND: { id: 1, name: 'root' } });

    expect(query.$sql()).toEqual("SELECT * FROM `query_models` WHERE (`id` = 1 AND `name` = 'root');");
  });

  it('should format WHERE array values', function() {
    var query = QueryModel.where({ id: [1, 2, 3, 4] });

    expect(query.$sql()).toEqual("SELECT * FROM `query_models` WHERE `id` IN (1, 2, 3, 4);");
  });

  it('should format JOIN strings', function() {
    var query = QueryModel.joins("INNER JOIN user_roles ON user_roles.user_id = query_models.id");

    expect(query.$sql()).toEqual("SELECT * FROM `query_models` INNER JOIN user_roles ON user_roles.user_id = query_models.id;");
  });

  it('should format JOIN arrays', function() {
    var query = QueryModel.joins([
      "INNER JOIN user_roles",
        "ON user_roles.user_id = query_models.id"]);

    expect(query.$sql()).toEqual("SELECT * FROM `query_models` INNER JOIN user_roles ON user_roles.user_id = query_models.id;");
  });

  it('should format ORDER strings', function() {
    var query = QueryModel.order("id DESC");

    expect(query.$sql()).toEqual("SELECT * FROM `query_models` ORDER BY id DESC;");
  });

  it('should format ORDER arrays', function() {
    var query = QueryModel.order(["id", "name"]);

    expect(query.$sql()).toEqual("SELECT * FROM `query_models` ORDER BY id, name;");
  });

  it('should format GROUP strings', function() {
    var query = QueryModel.group("name");

    expect(query.$sql()).toEqual("SELECT * FROM `query_models` GROUP BY `name`;");
  });

  it('should format GROUP arrays', function() {
    var query = QueryModel.group(["name", "id"]);

    expect(query.$sql()).toEqual("SELECT * FROM `query_models` GROUP BY `name`, `id`;");
  });

});
