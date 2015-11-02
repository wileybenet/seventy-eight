var q = require('q');
var client = require('./lib/db.client');
var _ = require('lodash');
var utils = require('./lib/utils');
var Collection = require('./lib/Collection');
var db;
var record = {};
// var connectionCalled = false;

var tableSchemas;

_.mixin(utils.lodashMixin);



record.db = client;

client.query("SELECT * FROM information_schema.columns WHERE table_schema = '" + client.schema + "' ORDER BY table_name, ordinal_position", function(err, data) {
  tableSchemas = _.chain(data)
    .map(function(row) {
      return {
        table: row.TABLE_NAME,
        columnName: row.COLUMN_NAME
      };
    })
    .groupBy('table')
    .value();
  console.log('mapped record schemas');
});

record.getSchema = function(tableName) {
  return _.pluck(tableSchemas[tableName], 'columnName');
};

// base static methods
record.staticMethods = {
  all: function() {},
  select: function(fields) {
    var selects;
    if (_.isArray(fields)) {
      selects = fields;
    } else {
      selects = fields.split(/,/g);
    }

    this.$queryParams.select = this.$queryParams.select.concat(selects.map(function(el) {
      return el.trim();
    }));
  },
  find: function(id) {
    this.$singleResult = true;
    this.where({ id: id }).limit(1);
  },
  one: function() {
    this.$singleResult = true;
    this.$queryParams.limit = 1;
  },
  joins: function(sql) {
    var joins;
    if (_.isArray(sql)) {
      joins = sql.join(' ');
    } else {
      joins = sql;
    }
    this.$queryParams.joins.push(joins);
  },
  group: function(keys) {
    var groups;
    if (_.isArray(keys)) {
      groups = keys;
    } else {
      groups = keys.split(/,/g);
    }

    this.$queryParams.group = this.$queryParams.group.concat(groups.map(function(el) {
      return el.trim();
    }));
  },
  order: function(keys) {
    var orders;
    if (_.isArray(keys)) {
      orders = keys;
    } else {
      orders = keys.split(/,/g);
    }

    this.$queryParams.order = this.$queryParams.order.concat(orders.map(function(el) {
      return el.trim();
    }));
  },
  where: function(condition) {
    for (var key in condition) {
      this.$queryParams.where[key] = condition[key];
    }
  },
  limit: function(size) {
    this.$queryParams.limit = +size;
  },
  then: function(cbFn) {
    var _this = this;
    var query = '';
    var params = [];
    if (_.size(this.$queryParams.select)) {
      query += 'SELECT ' + this.$queryParams.select.join(', ');
    } else {
      query += 'SELECT *';
    }
    if (this.tableName) {
      params.push(this.tableName);
      query += ' FROM ??';
    }
    if (_.size(this.$queryParams.joins)) {
      query += ' ' + this.$queryParams.joins.join(' ');
    }
    if (_.size(this.$queryParams.where) === 1) {
      params.push(this.$queryParams.where);
      query += ' WHERE ?';
    } else if (_.size(this.$queryParams.where) > 1) {
      query += ' WHERE ' + _.map(this.$queryParams.where, function(value, key) {
        return _this.$formatWhere(key, value);
      }).join(' AND ');
    }
    if (_.size(this.$queryParams.group)) {
      params.push(this.$queryParams.group);
      query += ' GROUP BY ??';
    }
    if (_.size(this.$queryParams.order)) {
      query += ' ORDER BY ' + this.$queryParams.order.join(' ');
    }
    if (this.$queryParams.limit) {
      params.push(this.$queryParams.limit);
      query += ' LIMIT ?';
    }

    query += ';';

    client
      .query(query, params)
      .then(function(data) {
        if (cbFn)
          cbFn(_this.$instantiateResponse.call(_this, data));
      }, function(err) {
          console.log('SQL error: ' + err.message);
      });
  },
  $formatWhere: function(key, value) {
    if (_.isArray(value)) {
      return record.db.escapeKey(key) + ' IN (' + record.db.escapeValue(value) + ')';
    } else {
      return record.db.escapeKey(key) + ' = ' + record.db.escapeValue(value);
    }
  },
  $instantiateResponse: function(data) {
    var _this = this;
    var models = new Collection();
    data.forEach(function(el) {
      models.push(new _this.$constructor(el, true));
    });

    return (this.$singleResult) ? (models[0] || null) : (models || []);
  }
};

// base instance methods
record.instanceMethods = {
  $prepareProps: function() {
    return typeof this._beforeSave === 'function' ? this._beforeSave(_.extend({}, this._public())) : this;
  },
  $get: function(fields, properties) {
    var values = [];
    for (var key in properties) {
      if (!!~fields.indexOf(key))
        values.push(properties[key]);
    }
    return values;
  },
  _beforeSave: function(obj) {
    return obj;
  },
  _public: function(fields) {
    return _.pick(this, function(value, key) {
      if (fields) {
        return !!~fields.indexOf(key);
      } else {
        return !{$: true, _: true}[key.substr(0, 1)];
      }
    });
  },
  update: function(properties, callback) {
    var _this = this;
    properties = this.$prepareProps();
    var deferred = q.defer();
    var whiteList = this.$fields || record.getSchema(this.$tableName);
    var whiteListedProperties = _.pick(properties, whiteList);

    for (var key in whiteListedProperties) {
      this[key] = whiteListedProperties[key];
    }

    if (_.size(whiteListedProperties)) {
      client
        .query("UPDATE ?? SET ? WHERE id = ?", [this.$tableName, whiteListedProperties, this.id])
        .then(function(data) {
          callback ? callback(null, _this._public()) : deferred.resolve(_this._public());
        }, function(err) {
          callback(err);
        });
    } else {
      callback ? callback(null, _this._public()) : deferred.resolve(_this._public());
    }

    return callback ? this : deferred.promise;
  },
  save: function(callback) {
    var _this = this;
    var properties = this.$prepareProps();
    var deferred = q.defer();
    var columns = _(this._public(record.getSchema(this.$tableName)))
      .pick(function(value) { return {String: true, Number: true, Date: true}[value && value.constructor.name]; })
      .keys()
      .value();

    if (_.size(this._public())) {
      client
        .query("INSERT INTO ?? (??) VALUES (?)", [this.$tableName, columns, this.$get(columns, properties)])
        .then(function(data) {
          _this.id = data.insertId;
          callback ? callback(null, _this._public()) : deferred.resolve(_this._public());
        }, function(err) {
          callback(err);
        });
    } else {
      callback ? callback(null, _this._public()) : deferred.resolve(_this._public());
    }
    return callback ? this : deferred.promise;
  },
  delete: function(callback) {
    callback();
    return this;
  }
};

// public record API
record.createModel = function(options) {
  var staticMethod, instanceMethod;
  var Model = options.constructor;
  var staticProps = options.staticProps || {};
  var staticMethods = _.extend({}, record.staticMethods, options.staticMethods || {});
  var instanceMethods = _.extend({}, record.instanceMethods, options.instanceMethods || {});
  var tableName = options.tableName || (utils.toSnake(Model.name).replace(/y$/g, 'ie') + 's');
  var QueryConstructor = eval(
    "(function " + Model.name + "(row, skip) {" +
      "for (var key in row) {" +
        "this[key] = row[key];" +
      "}" +
      "this.$tableName = tableName;" +
      "this.$schema = options.schema;" +
      "!skip && Model.call(this);" +
    "})");
  QueryConstructor.tableName = tableName;

  function initChain() {
    return _.extend({}, QueryConstructor, staticProps, {
      $constructor: QueryConstructor,
      $init: true,
      $singleResult: false,
      $queryParams: {
        where: {},
        select: [],
        joins: [],
        group: [],
        order: [],
        limit: null
      }
    });
  }

  function startChain(fn) {
    return function() {
      var self;
      if (this.$init) {
        self = this;
      } else {
        self = initChain();
      }
      var nextSelf = _.extend({}, self);
      var ret = fn.apply(nextSelf, arguments);
      return ret || nextSelf;
    };
  }

  for (var staticProp in staticProps) {
    QueryConstructor[staticProp] = staticProps[staticProp];
  }

  for (staticMethod in staticMethods) {
    QueryConstructor[staticMethod] = staticMethod[0] === '$' ? staticMethods[staticMethod] : startChain(staticMethods[staticMethod]);
  }

  for (instanceMethod in instanceMethods) {
    QueryConstructor.prototype[instanceMethod] = instanceMethods[instanceMethod];
  }

  return QueryConstructor;
};

module.exports = record;

