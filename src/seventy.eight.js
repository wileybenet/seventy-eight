const q = require('q');
const client = require('./lib/db.client');
const _ = require('lodash');
const migrator = require('./lib/migrator');
const schemaFilters = require('./lib/schema.filters');
const fieldTypes = require('./lib/field');
const { prefix } = require('./utils');
const recordDeferred = q.defer();
const seventyEight = {
  promise: recordDeferred.promise,
};

const recordStaticMethods = require('./query.builder');
const modelCache = {
  byClass: {},
  byTable: {},
};

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

client.ping().then(() => recordDeferred.resolve(seventyEight)).catch(console.error);

// base static methods
const globalStaticMethods = _.extend(recordStaticMethods, {
  int(value, dflt = null) {
    var intVal = parseInt(value, 10);
    return intVal > 0 || intVal < 0 || intVal === 0 ? intVal : dflt;
  },
  string(value, dflt = null) {
    return typeof value !== 'undefined' && value !== null ? `${value}` : dflt;
  },
  import(objects) {
    const deferred = q.defer();
    const schema = this.$constructor.getSchema();
    const columns = schema.map(field => field.column);
    const params = objects.map(obj => {
      let record = obj;
      if (!(obj instanceof this.$constructor)) {
         record = new this.$constructor(obj);
      }
      return record.$saveParams(columns);
    });
    const nonPrimaryColumns = schema.filter(f => !f.primary).map(field => field.column);
    const updateSyntax = nonPrimaryColumns.map(() => `?? = VALUES(??)`).join(', ');
    const query = `INSERT INTO ?? (??) VALUES ? ${nonPrimaryColumns.length ? `ON DUPLICATE KEY UPDATE ${updateSyntax}` : ''}`;
    const injection = [
      this.$constructor.tableName,
      columns,
      params.map(({ values }) => values),
      ...nonPrimaryColumns.reduce((memo, column) => memo.concat([column, column]), []),
    ];
    client.query(query, injection)
      .then(deferred.resolve)
      .catch(deferred.reject);
    return deferred.promise;
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
      client.query(client.formatQuery("UPDATE ?? SET ? WHERE ?? = ?", [pseudoModel.$tableName, whiteListedProperties, this.$constructor.$getPrimaryKey(), record_id]))
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
      return typeof properties[field] === 'undefined' ? null : properties[field];
    });
  },
  json() {
    return _.pickBy(this, (value, prop) => !prop.match(/\$|_/) && typeof value !== 'function');
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
      client
        .query(client.formatQuery("UPDATE ?? SET ? WHERE ?? = ?", [this.$tableName, whiteListedProperties, this.$primaryKey, this[this.$primaryKey]]))
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
  $saveParams(setColumns = null) {
    const properties = this.beforeSave(this);
    let whiteListedProperties = this.$prepareProps(properties);
    whiteListedProperties = this.$beforeSave(whiteListedProperties);
    const columns = setColumns || _.keys(whiteListedProperties);
    const values = this.$getAt(columns, whiteListedProperties);
    return { columns, values, whiteListedProperties };
  },
  save() {
    const deferred = q.defer();
    const params = this.$saveParams();
    const { values, whiteListedProperties } = params;
    let { columns } = params;
    let sql = 'INSERT INTO ?? (??) VALUES ';
    if (columns.length) {
      sql += '(?) ON DUPLICATE KEY UPDATE ?';
    } else {
      columns = this.Class.getDefaultSchemaFields();
      sql += `(${columns.map(() => 'NULL').join(', ')})`;
    }
    client
      .query(client.formatQuery(sql, [this.$tableName, columns, values, whiteListedProperties]))
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
    client
      .query(client.formatQuery("DELETE FROM ?? WHERE ?? = ?", [this.$tableName, this.$primaryKey, this[this.$primaryKey]]))
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

  Object.assign(QueryConstructor, migrator.getMethods({ namespace: Model.name }), {
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

  modelCache.byTable[tableName] = modelCache.byClass[Model.name] = QueryConstructor; // eslint-disable-line no-multi-assign
  return QueryConstructor;
};

seventyEight.getModel = name => {
  if (modelCache.byTable[name] || modelCache.byClass[name]) {
    return modelCache.byTable[name] || modelCache.byClass[name];
  }
  const cacheJSON = {
    tables: Object.keys(modelCache.byTable),
    classes: Object.keys(modelCache.byClass),
  };
  throw new Error(`${prefix('red')} getModel('${name}') could not find a matching loaded model\nmodel cache:\n${JSON.stringify(cacheJSON, null, 2)}`);
};

module.exports = seventyEight;
