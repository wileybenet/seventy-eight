var q = require('q');
var client = require('./lib/db.client');
var _ = require('lodash');
var migrator = require('./lib/migrator');
var schemas = require('./lib/schemas');
var utils = require('./lib/utils');
var recordDeferred = q.defer();
var seventyEight = {
  promise: recordDeferred.promise,
};

var recordStaticMethods = require('./query.builder');

seventyEight.const = {};
seventyEight.db = client;
seventyEight.schema = schemas;

seventyEight.resolvedPromise = function(data) {
  var deferred = q.defer();
  deferred.resolve(data);
  return deferred.promise;
};
seventyEight.rejectedPromise = function(err) {
  var deferred = q.defer();
  deferred.reject(err);
  return deferred.promise;
};

seventyEight.db.ping().then(() => recordDeferred.resolve(seventyEight)).catch(console.error);

// base static methods
seventyEight.staticMethods = _.extend(recordStaticMethods, {
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
    id[this.$constructor.$getPrimaryKey()] = record_id;
    var pseudoModel = new this.$constructor(id);
    var properties = pseudoModel.beforeSave(_.extend({}, props));
    var whiteListedProperties = pseudoModel.$prepareProps(properties);
    whiteListedProperties = pseudoModel.$beforeSave(whiteListedProperties);

    function error(err) {
      deferred.reject(err);
      if (callback) {
        callback(err);
      }
    }

    if (_.size(whiteListedProperties)) {
      seventyEight.db.query(seventyEight.db.formatQuery("UPDATE ?? SET ? WHERE ?? = ?", [pseudoModel.$tableName, whiteListedProperties, this.$constructor.$getPrimaryKey(), record_id]))
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
seventyEight.instanceMethods = {
  $whiteList(properties) {
    return _.pick(properties, Object.keys(this.Class.schema));
  },
  $prepareProps(properties) {
    return this.$whiteList(properties);
  },
  $getAt(fields, properties) {
    return fields.map(function(field) {
      return typeof properties[field] === 'undefined' ? 'NULL' : properties[field];
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
  $afterFind() {
    this.Class.getSchema().forEach(field => {
      if (field.type === 'json') {
        try {
          this[field.name] = JSON.parse(this[`${field.name}__json`]);
        } catch (err) {
          this[field.name] = {};
        }
        delete this[`${field.name}__json`];
      }
    });
  },
  afterFind() {},
  $beforeSave(props) {
    this.Class.getSchema().forEach(field => {
      if (field.type === 'json' && props.hasOwnProperty(field.name)) {
        props[`${field.name}__json`] = JSON.stringify(props[field.name]);
        delete props[field.name];
      }
    });
    return props;
  },
  beforeSave(props) {
    return props;
  },
  update(props, callback) {
    var this_ = this;
    var deferred = q.defer();
    var properties = this.beforeSave(_.extend({}, props));
    var whiteListedProperties = this.$prepareProps(properties);
    whiteListedProperties = this.$beforeSave(whiteListedProperties);

    if (_.size(whiteListedProperties)) {
      seventyEight.db
        .query(seventyEight.db.formatQuery("UPDATE ?? SET ? WHERE ?? = ?", [this.$tableName, whiteListedProperties, this.$primaryKey, this[this.$primaryKey]]))
        .then(function(data) {
          _.extend(this_, whiteListedProperties);
          this_.$afterFind();
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
    whiteListedProperties = this.$beforeSave(whiteListedProperties);
    var columns = _.keys(whiteListedProperties);

    if (_.size(this._public())) {
      seventyEight.db
        .query(seventyEight.db.formatQuery("INSERT INTO ?? (??) VALUES (?) ON DUPLICATE KEY UPDATE ?", [this.$tableName, columns, this.$getAt(columns, whiteListedProperties), whiteListedProperties]))
        .then(function(data) {
          this_.Class.find(data.insertId).then(model => {
            _.extend(this_, model);
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
    seventyEight.db
      .query(seventyEight.db.formatQuery("DELETE FROM ?? WHERE ?? = ?", [this.$tableName, this.$primaryKey, this[this.$primaryKey]]))
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

// public seventyEight API
seventyEight.createModel = function(options) { // eslint-disable-line max-statements
  let staticMethod = null;
  let instanceMethod = null;
  let staticProp = null;
  let instanceProp = null;
  var Model = options.constructor;
  var staticProps = options.staticProps || {};
  var schema = options.schema || {};
  var instanceProps = options.instanceProps || {};
  var staticMethods = _.extend({}, seventyEight.staticMethods, options.staticMethods || {});
  var instanceMethods = _.extend({}, seventyEight.instanceMethods, options.instanceMethods || {});
  var tableName = options.tableName || `${utils.toSnake(Model.name).replace(/y$/g, 'ie')}s`;
  var QueryConstructor = eval( // eslint-disable-line no-eval
    `(function ${Model.name}(row, found) {
      for (var key in row) {
        this[key] = row[key];
      }
      this.$tableName = tableName;
      this.$primaryKey = this.Class.$getPrimaryKey();
      if (found) {
        this.$afterFind();
        this.afterFind();
      } else {
        Model.call(this);
      }
    })`);

  Object.assign(QueryConstructor, migrator.methods, {
    tableName,
    schema,
    db: client,
    $getPrimaryKey() {
      try {
        return Object.keys(this.schema).map(name => ({ name, primary: this.schema[name].primary })).find(field => field.primary).name;
      } catch (err) {
        throw new Error(`schema missing primary field: \n${JSON.stringify(this.schema, null, 2)}`);
      }
    },
  });

  QueryConstructor.prototype.Class = QueryConstructor;

  const initChain = () => {
    var deferred = q.defer();
    return _.extend(deferred, QueryConstructor, staticProps, {
      $constructor: QueryConstructor,
      $getPrimaryKey: QueryConstructor.$getPrimaryKey(),
      $record: seventyEight,
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
  };

  const startChain = fn => function(...args) {
    const context = this.$init ? this : initChain(); // eslint-disable-line no-invalid-this
    var nextSelf = _.extend({}, context);
    var ret = fn.apply(nextSelf, args);
    return _.isUndefined(ret) ? nextSelf : ret;
  };

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

  if (!schema) {
    throw new Error('model requires schema: {}');
  }

  return QueryConstructor;
};

module.exports = seventyEight;
