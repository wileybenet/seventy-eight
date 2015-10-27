var client = require('./lib/db.client');
var _ = require('lodash');
var utils = require('./lib/utils');
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
    if (typeof fields === 'object') {
      selects = fields;
    } else {
      selects = fields.split(/,/g);
    }

    this.queryParams.select = this.queryParams.select.concat(selects.map(function(el) {
      return el.trim();
    }));
  },
  find: function(id) {
    this.$singleResult = true;
    this.where({ id: id }).limit(1);
  },
  one: function() {
    this.$singleResult = true;
    this.queryParams.limit = 1;
  },
  joins: function(sql) {
    var joins;
    if (typeof sql === 'object') {
      joins = sql.join(' ');
    } else {
      joins = sql;
    }
    this.queryParams.joins.push(joins);
  },
  group: function(keys) {
    var groups;
    if (typeof keys === 'object') {
      groups = keys;
    } else {
      groups = keys.split(/,/g);
    }

    this.queryParams.group = this.queryParams.group.concat(groups.map(function(el) {
      return el.trim();
    }));
  },
  order: function(keys) {
    var orders;
    if (typeof keys === 'object') {
      orders = keys;
    } else {
      orders = keys.split(/,/g);
    }

    this.queryParams.order = this.queryParams.order.concat(orders.map(function(el) {
      return el.trim();
    }));
  },
  where: function(condition) {
    for (var key in condition) {
      this.queryParams.where[key] = condition[key];
    }
  },
  limit: function(size) {
    this.queryParams.limit = +size;
  },
  then: function(cbFn) {
    var _this = this;
    var q = '';
    var params = [];
    if (_.size(this.queryParams.select)) {
      q += 'SELECT ' + this.queryParams.select.join(', ');
    } else {
      q += 'SELECT *';
    }
    if (this.tableName) {
      params.push(this.tableName);
      q += ' FROM ??';
    }
    if (_.size(this.queryParams.joins)) {
      q += ' ' + this.queryParams.joins.join(' ');
    }
    if (_.size(this.queryParams.where) === 1) {
      params.push(this.queryParams.where);
      q += ' WHERE ?';
    } else if (_.size(this.queryParams.where) > 1) {
      q += ' WHERE ' + _.map(this.queryParams.where, function(value, key) {
        return _this._formatWhere(key, value);
      }).join(' AND ');
    }
    if (_.size(this.queryParams.group)) {
      params.push(this.queryParams.group);
      q += ' GROUP BY ??';
    }
    if (_.size(this.queryParams.order)) {
      q += ' ORDER BY ' + this.queryParams.order.join(' ');
    }
    if (this.queryParams.limit) {
      params.push(this.queryParams.limit);
      q += ' LIMIT ?';
    }

    q += ';';

    client
      .query(q, params)
      .then(function(data) {
        if (cbFn)
          cbFn(_this._instantiateResponse.call(_this, data));
      }, function(err) {
          console.log('SQL error: ' + err.message);
      });
  },
  _formatWhere: function(key, value) {
    if (value.length > 0) {
      return record.db.escapeId(key) + ' IN (' + record.db.escape(value) + ')';
    } else {
      return record.db.escapeId(key) + ' = ' + record.db.escape(value);
    }
  },
  _instantiateResponse: function(data) {
    var _this = this;
    var models = data.map(function(el) {
      return new _this._constructor(el, true);
    });

    return (this.$singleResult) ? (models[0] || null) : (models || []);
  }
};

// base instance methods
record.instanceMethods = {
  _public: function(fields) {
    return _.pick(this, function(value, key) {
      if (fields) {
        return !!~fields.indexOf(key);
      } else {
        return !{$: true, _: true}[key.substr(0, 1)];
      }
    });
  },
  _get: function(fields) {
    var values = [];
    for (var key in this) {
      if (!!~fields.indexOf(key))
        values.push(this[key]);
    }
    return values;
  },
  update: function(properties, callback) {
    var _this = this;
    var whiteList = this.$fields || record.getSchema(this.$tableName);
    var whiteListedProperties = _.pick(properties, whiteList);

    for (var key in whiteListedProperties) {
      this[key] = whiteListedProperties[key];
    }

    if (_.size(whiteListedProperties)) {
      client
        .query("UPDATE ?? SET ? WHERE id = ?", [this.$tableName, whiteListedProperties, this.id])
        .then(function(data) {
          callback(_this._public());
        });
    } else {
      callback(_this._public());
    }

    return this;
  },
  save: function(callback) {
    var _this = this;
    var columns = _(this._public())
      .pick(function(value) { return {String: true, Number: true, Date: true}[value && value.constructor.name]; })
      .keys()
      .value();

    if (_.size(this._public())) {
      client
        .query("INSERT INTO ?? (??) VALUES (?)", [this.$tableName, columns, this._get(columns)])
        .then(function(data) {
          _this.id = data.insertId;
          callback(_this._public());
        });
    } else {
      callback(_this._public());
    }
    return this;
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
  var staticMethods = _.extend({}, record.staticMethods, options.staticMethods || {});
  var instanceMethods = _.extend({}, record.instanceMethods, options.instanceMethods || {});
  var tableName = options.tableName || (utils.toSnake(Model.name) + 's');
  var QueryConstructor = eval("(" +
    "function " + Model.name + "(row, skip) {" +
      "for (var key in row) {" +
        "this[key] = row[key];" +
      "}" +
      "this.$tableName = tableName;" +
      "this.$schema = options.schema;" +
      "!skip && Model.call(this);" +
    "})");
  QueryConstructor.tableName = tableName;

  function initChain() {
    return _.extend({}, QueryConstructor, {
      _constructor: QueryConstructor,
      $init: true,
      $singleResult: false,
      queryParams: {
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

  for (staticMethod in staticMethods) {
    QueryConstructor[staticMethod] = staticMethod[0] === '_' ? staticMethods[staticMethod] : startChain(staticMethods[staticMethod]);
  }

  for (instanceMethod in instanceMethods) {
    QueryConstructor.prototype[instanceMethod] = instanceMethods[instanceMethod];
  }

  return QueryConstructor;
};

module.exports = record;

