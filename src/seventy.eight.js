var q = require('q');
var client = require('./lib/db.client');
var _ = require('lodash');
var syntax = require('./lib/syntax');
var utils = require('./lib/utils');
var recordDeferred = q.defer();
var record = {
  promise: recordDeferred.promise,
};

var recordStaticMethods = require('./query.builder');

record.const = {};
record.db = client;

record.resolvedPromise = function(data) {
  var deferred = q.defer();
  deferred.resolve(data);
  return deferred.promise;
};
record.rejectedPromise = function(err) {
  var deferred = q.defer();
  deferred.reject(err);
  return deferred.promise;
};

var constDeferred = q.defer();

record.db.query(record.db.formatQuery("SELECT * FROM const")).then(function(data) {
  _.each(data, function(row) {
    record.const[row.name] = row.value;
  });

  constDeferred.resolve(record);
});

q.all([constDeferred])
  .then(function() {
    recordDeferred.resolve(record);
  });

// base static methods
record.staticMethods = _.extend(recordStaticMethods, syntax.methods, {
  int(value, dflt) {
    var intVal = parseInt(value);
    return intVal > 0 || intVal < 0 || intVal === 0 ? intVal : dflt !== undefined ? dflt : null;
  },
  string(value, dflt) {
    return value !== undefined && value !== null ? `${value}` : dflt !== undefined ? dflt : null;
  },
  update(record_id, props, callback) {
    var this_ = this;
    var deferred = q.defer();
    var id = {};
    id[this.$primaryKey] = record_id;
    var pseudoModel = new this.$constructor(id);
    var properties = pseudoModel.beforeSave(_.extend({}, props));
    var whiteListedProperties = pseudoModel.$prepareProps(properties);

    function error(err) {
      deferred.reject(err);
      if (callback) {
        callback(err);
      }
    }

    if (_.size(whiteListedProperties)) {
      record.db.query(record.db.formatQuery("UPDATE ?? SET ? WHERE ?? = ?", [pseudoModel.$tableName, whiteListedProperties, this.$primaryKey, record_id]))
        .then(function(data) {
          deferred.resolve(true);
          if (callback) {
            callback(null, data);
          }
        }, error);
    } else {
      error('');
    }

    return deferred.promise;
  },
});

// base instance methods
record.instanceMethods = {
  $whiteList(properties) {
    return _.pick(properties, Object.keys(this.Class.schema));
  },
  $prepareProps(properties) {
    return this.$whiteList(properties);
  },
  $getAt(fields, properties) {
    return fields.map(function(field) {
      return properties[field] !== undefined ? properties[field] : 'NULL';
    });
  },
  _public(fields) {
    var this_ = this;
    fields = fields || this._publicFields || null;
    var obj = _.pick(this, function(value, key) {
      if (fields) {
        return Boolean(~fields.indexOf(key));
      } 
        return !{ $: true, _: true }[key.substr(0, 1)];
      
    });
    obj.include = function(extraFields) {
      return _.extend({}, obj, _.pick(this_, [].concat(extraFields)));
    };
    return obj;
  },
  afterFind(obj) {},
  beforeSave(props) {
    return props;
  },
  update(props, callback) {
    var this_ = this;
    var deferred = q.defer();
    var properties = this.beforeSave(_.extend({}, props));
    var whiteListedProperties = this.$prepareProps(properties);

    if (_.size(whiteListedProperties)) {
      record.db
        .query(record.db.formatQuery("UPDATE ?? SET ? WHERE ?? = ?", [this.$tableName, whiteListedProperties, this.$primaryKey, this[this.$primaryKey]]))
        .then(function(data) {
          _.extend(this_, whiteListedProperties);
          this_.afterFind();
          deferred.resolve(this_._public());
          if (callback) {
            callback(null, this_._public());
          }
        }, function(err) {
          deferred.reject(err);
          if (callback) {
            callback(err);
          }
        });
    } else {
      deferred.resolve(this_._public());
      if (callback) {
        callback(null, this_._public());
      }
    }
    return deferred.promise;
  },
  save(callback) {
    var this_ = this;
    var deferred = q.defer();
    var properties = this.beforeSave(this);
    var whiteListedProperties = this.$prepareProps(properties);
    var columns = _.keys(whiteListedProperties);

    if (_.size(this._public())) {
      record.db
        .query(record.db.formatQuery("INSERT INTO ?? (??) VALUES (?) ON DUPLICATE KEY UPDATE ?", [this.$tableName, columns, this.$getAt(columns, whiteListedProperties), whiteListedProperties]))
        .then(function(data) {
          this_[this_.$primaryKey] = data.insertId;
          this_.afterFind();
          deferred.resolve(this_._public());
          if (callback) {
            callback(null, this_._public());
          }
        }, function(err) {
          deferred.reject(err);
          if (callback) {
            callback(err);
          }
        });
    } else {
      deferred.resolve(this_._public());
      if (callback) {
        callback(null, this_._public());
      }
    }
    return deferred.promise;
  },
  delete(callback) {
    var deferred = q.defer();
    record.db
      .query(record.db.formatQuery("DELETE FROM ?? WHERE ?? = ?", [this.$tableName, this.$primaryKey, this[this.$primaryKey]]))
      .then(function(data) {
        deferred.resolve(true);
        if (callback) {
          callback(null, true);
        }
      }, function(err) {
        deferred.reject(err);
        if (callback) {
          callback(err);
        }
      });
    return deferred.promise;
  },
};

// public record API
record.createModel = function(options) {
  var staticMethod, instanceMethod, staticProp, instanceProp;
  var Model = options.constructor;
  var staticProps = options.staticProps || {};
  var schema = options.schema || {};
  var instanceProps = options.instanceProps || {};
  var primaryKey = options.primaryKey || 'id';
  var staticMethods = _.extend({}, record.staticMethods, options.staticMethods || {});
  var instanceMethods = _.extend({}, record.instanceMethods, options.instanceMethods || {});
  var tableName = options.tableName || `${utils.toSnake(Model.name).replace(/y$/g, 'ie')}s`;
  var QueryConstructor = eval(
    `(function ${Model.name}(row, found) {` +
      `for (var key in row) {` +
        `this[key] = row[key];` +
      `}` +
      `this.$tableName = tableName;` +
      `this.$primaryKey = primaryKey;` +
      `if (found) {` +
        `this.afterFind();` +
      `} else {` +
        `Model.call(this);` +
      `}` +
    `})`);

  QueryConstructor.tableName = tableName;
  QueryConstructor.schema = schema;
  QueryConstructor.prototype.Class = QueryConstructor;

  function initChain() {
    var deferred = q.defer();
    return _.extend(deferred, QueryConstructor, staticProps, {
      $constructor: QueryConstructor,
      $primaryKey: primaryKey,
      $record: record,
      $init: true,
      $singleResult: false,
      $queryParams: {
        where: [],
        select: [],
        joins: [],
        group: [],
        order: [],
        limit: null,
      },
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
      return _.isUndefined(ret) ? nextSelf : ret;
    };
  }

  for (staticProp in staticProps) {
    QueryConstructor[staticProp] = staticProps[staticProp];
  }

  for (staticMethod in staticMethods) {
    QueryConstructor[staticMethod] = staticMethod[0] === '$' ? staticMethods[staticMethod] : startChain(staticMethods[staticMethod]);
  }

  for (instanceMethod in instanceMethods) {
    QueryConstructor.prototype[instanceMethod] = instanceMethods[instanceMethod];
  }

  for (instanceProp in instanceProps) {
    QueryConstructor.prototype[instanceProp] = instanceProps[instanceProp];
  }

  return QueryConstructor;
};

module.exports = record;
