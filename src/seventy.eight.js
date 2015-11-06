var q = require('q');
var client = require('./lib/db.client');
var _ = require('lodash');
var utils = require('./lib/utils');
var Collection = require('./lib/Collection');
var deferred = q.defer();
var record = {
  promise: deferred.promise
};

var recordStaticMethods = require('./query.builder');

var tableSchemas;

record.const = {};
record.db = client;

var schemaDeferred = q.defer();
var constDeferred = q.defer();

record.db.query(record.db.formatQuery("SELECT * FROM information_schema.columns WHERE table_schema = ? ORDER BY table_name, ordinal_position", record.db.schema), function(err, data) {
  tableSchemas = _.chain(data)
    .map(function(row) {
      return {
        table: row.TABLE_NAME,
        columnName: row.COLUMN_NAME
      };
    })
    .groupBy('table')
    .value();

  schemaDeferred.resolve(record);
});

record.db.query(record.db.formatQuery("SELECT * FROM const")).then(function(data) {
  _.each(data, function(row) {
    record.const[row.name] = row.value;
  });

  constDeferred.resolve(record);
});

q.all([schemaDeferred, constDeferred])
  .then(function() {
    deferred.resolve(record);
  });

record.getSchema = function(tableName) {
  return _.pluck(tableSchemas[tableName], 'columnName');
};

// base static methods
record.staticMethods = recordStaticMethods;

// base instance methods
record.instanceMethods = {
  $whiteList: function(properties) {
    return _.pick(properties || this, record.getSchema(this.$tableName));
  },
  $prepareProps: function(properties) {
    return typeof this._beforeSave === 'function' ? this._beforeSave(_.extend({}, this.$whiteList(properties))) : this;
  },
  $getAt: function(fields, properties) {
    return fields.map(function(field) {
      return properties[field] || 'NULL';
    });
  },
  _beforeSave: function(obj) {
    return obj;
  },
  _public: function(fields) {
    var this_ = this;
    fields = fields || this._publicFields || null;
    var obj = _.pick(this, function(value, key) {
      if (fields) {
        return !!~fields.indexOf(key);
      } else {
        return !{$: true, _: true}[key.substr(0, 1)];
      }
    });
    obj.include = function(extraFields) {
      return _.extend({}, obj, _.pick(this_, [].concat(extraFields)));
    };
    return obj;
  },
  update: function(properties, callback) {
    var this_ = this;
    var deferred = q.defer();
    var whiteListedProperties = this.$prepareProps(properties);

    for (var key in whiteListedProperties) {
      this[key] = whiteListedProperties[key];
    }

    if (_.size(whiteListedProperties)) {
      record.db
        .query(record.db.formatQuery("UPDATE ?? SET ? WHERE id = ?", [this.$tableName, whiteListedProperties, this.id]))
        .then(function(data) {
          callback ? callback(null, this_._public()) : deferred.resolve(this_._public());
        }, function(err) {
          callback ? callback(err) : deferred.reject(err);
        });
    } else {
      callback ? callback(null, this_._public()) : deferred.resolve(this_._public());
    }

    return callback ? this : deferred.promise;
  },
  save: function(callback) {
    var this_ = this;
    var properties = this.$prepareProps();
    var deferred = q.defer();
    var columns = _.keys(properties);

    if (_.size(this._public())) {
      record.db
        .query(record.db.formatQuery("INSERT INTO ?? (??) VALUES (?)", [this.$tableName, columns, this.$getAt(columns, properties)]))
        .then(function(data) {
          this_.id = data.insertId;
          callback ? callback(null, this_._public()) : deferred.resolve(this_._public());
        }, function(err) {
          callback ? callback(err) : deferred.reject(err);
        });
    } else {
      callback ? callback(null, this_._public()) : deferred.resolve(this_._public());
    }
    return callback ? this : deferred.promise;
  },
  delete: function(callback) {
    var deferred = q.defer();
    record.db
      .query(record.db.formatQuery("DELETE FROM ?? WHERE id = ?", [this.$tableName, this.id]))
      .then(function(data) {
        callback ? callback(null, true) : deferred.resolve(true);
      }, function(err) {
        callback ? callback(err) : deferred.reject(err);
      });
    return callback ? this : deferred.promise;
  }
};

// public record API
record.createModel = function(options) {
  var staticMethod, instanceMethod, staticProp, instanceProp;
  var Model = options.constructor;
  var staticProps = options.staticProps || {};
  var instanceProps = options.instanceProps || {};
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
  QueryConstructor.prototype.Class = {};

  function initChain() {
    return _.extend({}, QueryConstructor, staticProps, {
      $constructor: QueryConstructor,
      $record: record,
      $init: true,
      $singleResult: false,
      $queryParams: {
        where: [],
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

  for (staticProp in staticProps) {
    QueryConstructor[staticProp] = staticProps[staticProp];
    QueryConstructor.prototype.Class[staticProp] = staticProps[staticProp];
  }

  for (staticMethod in staticMethods) {
    QueryConstructor[staticMethod] = staticMethod[0] === '$' ? staticMethods[staticMethod] : startChain(staticMethods[staticMethod]);
  }

  for (instanceMethod in instanceMethods) {
    QueryConstructor.prototype[instanceMethod] = instanceMethods[instanceMethod];
  }

  for (instanceProp in instanceProps) {
    QueryConstructor.prototype[instanceProp] = instanceMethods[instanceProp];
  }

  return QueryConstructor;
};

module.exports = record;

