const q = require('q');
const client = require('./lib/db.client');
const _ = require('lodash');
const migrator = require('./lib/migrator');
const schemaFilters = require('./lib/schema.filters');
const fieldTypes = require('./lib/field');
const recordDeferred = q.defer();
const seventyEight = {
  promise: recordDeferred.promise,
};

const recordStaticMethods = require('./query.builder');
const modelCache = {};

seventyEight.const = {};
seventyEight.db = client;
seventyEight.field = fieldTypes;

seventyEight.resolvedPromise = function(data) {
  const deferred = q.defer();
  deferred.resolve(data);
  return deferred.promise;
};
seventyEight.rejectedPromise = function(err) {
  const deferred = q.defer();
  deferred.reject(err);
  return deferred.promise;
};

seventyEight.db.ping().then(() => recordDeferred.resolve(seventyEight)).catch(console.error);

// base static methods
const globalStaticMethods = _.extend(recordStaticMethods, {
  int(value, dflt) {
    var intVal = parseInt(value, 10);
    return intVal > 0 || intVal < 0 || intVal === 0 ? intVal : dflt !== undefined ? dflt : null;
  },
  string(value, dflt) {
    return value !== undefined && value !== null ? `${value}` : dflt !== undefined ? dflt : null;
  },
  update(record_id, props) {
    const deferred = q.defer();
    const id = {
      [this.$constructor.$getPrimaryKey()]: record_id,
    };
    const pseudoModel = new this.$constructor(id);
    const properties = pseudoModel.beforeSave(_.extend({}, props));
    let whiteListedProperties = pseudoModel.$prepareProps(properties);
    whiteListedProperties = pseudoModel.$beforeSave(whiteListedProperties);

    if (_.size(whiteListedProperties)) {
      seventyEight.db.query(seventyEight.db.formatQuery("UPDATE ?? SET ? WHERE ?? = ?", [pseudoModel.$tableName, whiteListedProperties, this.$constructor.$getPrimaryKey(), record_id]))
        .then(() => {
          deferred.resolve(true);
        }, deferred.reject);
    } else {
      deferred.resolve();
    }

    return deferred.promise;
  },
});

// base instance methods
const globalInstanceMethods = {
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
  $afterFind() {
    const schema = this.Class.getSchema();
    schema.map(schemaFilters.filterOut(this));
  },
  afterFind() {},
  $beforeSave(props) {
    const schema = this.Class.getSchema();
    const filter = schemaFilters.filterIn(props);
    return _(Object.keys(props))
      .map(prop => schema.find(field => field.name === prop))
      .map(filter)
      .fromPairs()
      .value();
  },
  beforeSave(props) {
    return props;
  },
  update(props, resolved = () => {}) {
    const deferred = q.defer();
    const properties = this.beforeSave(_.extend({}, props));
    let whiteListedProperties = this.$prepareProps(properties);
    whiteListedProperties = this.$beforeSave(whiteListedProperties);

    if (_.size(whiteListedProperties)) {
      seventyEight.db
        .query(seventyEight.db.formatQuery("UPDATE ?? SET ? WHERE ?? = ?", [this.$tableName, whiteListedProperties, this.$primaryKey, this[this.$primaryKey]]))
        .then(() => {
          _.extend(this, whiteListedProperties);
          this.$afterFind();
          this.afterFind();
          deferred.resolve(this);
          resolved(null, this);
        }, err => {
          deferred.reject(err);
          resolved(err);
        });
    } else {
      deferred.resolve(this);
      resolved(null, this);
    }
    return deferred.promise;
  },
  save() {
    const deferred = q.defer();
    const properties = this.beforeSave(this);
    let whiteListedProperties = this.$prepareProps(properties);
    whiteListedProperties = this.$beforeSave(whiteListedProperties);
    let columns = _.keys(whiteListedProperties);
    const values = this.$getAt(columns, whiteListedProperties);
    let sql = 'INSERT INTO ?? (??) VALUES ';
    if (columns.length) {
      sql += '(?) ON DUPLICATE KEY UPDATE ?';
    } else {
      columns = this.Class.getDefaultSchemaFields();
      sql += `(${columns.map(() => 'NULL').join(', ')})`;
    }
    seventyEight.db
      .query(seventyEight.db.formatQuery(sql, [this.$tableName, columns, values, whiteListedProperties]))
      .then(data => {
        this.Class.find(data.insertId).then(model => {
          Object.assign(this, model);
          deferred.resolve(this);
        }, deferred.reject);
      }, deferred.reject);
    return deferred.promise;
  },
  delete() {
    var deferred = q.defer();
    seventyEight.db
      .query(seventyEight.db.formatQuery("DELETE FROM ?? WHERE ?? = ?", [this.$tableName, this.$primaryKey, this[this.$primaryKey]]))
      .then(() => {
        deferred.resolve(true);
      }, deferred.reject);
    return deferred.promise;
  },
};

seventyEight.createModel = function(options) { // eslint-disable-line max-statements
  let staticMethod = null;
  var Model = options.constructor;
  var staticProps = options.staticProps || {};
  var { schema = {} } = options;
  var instanceProps = options.instanceProps || {};
  var staticMethods = _.extend({}, globalStaticMethods, options.staticMethods || {});
  var instanceMethods = _.extend({}, globalInstanceMethods, options.instanceMethods || {});
  var tableName = options.tableName || `${_.snakeCase(Model.name).replace(/y$/g, 'ie')}s`;
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
  }, staticProps);

  Object.assign(QueryConstructor.prototype, instanceProps, instanceMethods);

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

  for (staticMethod in staticMethods) {
    if (staticMethods[staticMethod]) {
      QueryConstructor[staticMethod] = staticMethod[0] === '$' ? staticMethods[staticMethod] : startChain(staticMethods[staticMethod]);
    }
  }

  modelCache[tableName] = QueryConstructor;
  return QueryConstructor;
};

module.exports = seventyEight;
