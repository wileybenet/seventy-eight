const client = require('./lib/db.client');
const _ = require('lodash');
const migrator = require('./lib/migrator');
const schemaFilters = require('./lib/schema.filters');
const fieldTypes = require('./lib/field');
const { prefix } = require('./utils');

const seventyEight = {};
const chainQueryMethods = require('./query.builder');
const modelCache = {
  byClass: {},
  byTable: {},
};

seventyEight.db = client;
seventyEight.field = fieldTypes;

// base static methods
const globalStaticMethods = _.extend({
  int(value, dflt = null) {
    var intVal = parseInt(value, 10);
    return intVal > 0 || intVal < 0 || intVal === 0 ? intVal : dflt;
  },
  string(value, dflt = null) {
    return typeof value !== 'undefined' && value !== null ? `${value}` : dflt;
  },
  async import(objects) {
    const schema = this.getSchema();
    const columns = schema.map(field => field.column);
    const params = objects.map(obj => {
      let record = obj;
      if (!(obj instanceof this)) {
         record = new this(obj);
      }
      return record.$saveParams(columns);
    });
    const nonPrimaryColumns = schema.filter(f => !f.primary).map(field => field.column);
    const updateSyntax = nonPrimaryColumns.map(() => `?? = VALUES(??)`).join(', ');
    const query = `INSERT INTO ?? (??) VALUES ? ${nonPrimaryColumns.length ? `ON DUPLICATE KEY UPDATE ${updateSyntax}` : ''}`;
    const injection = [
      this.tableName,
      columns,
      params.map(({ values }) => values),
      ...nonPrimaryColumns.reduce((memo, column) => memo.concat([column, column]), []),
    ];
    await client.query(query, injection);
  },
  async update(recordId, props) {
    const initialProps = {
      [this.$getPrimaryKey()]: recordId,
    };
    const pseudoModel = new this(initialProps);
    const properties = pseudoModel.beforeSave(_.extend({}, props));
    let whiteListedProperties = pseudoModel.$prepareProps(properties);
    whiteListedProperties = pseudoModel.$beforeSave(whiteListedProperties);

    if (_.size(whiteListedProperties)) {
      await client.query("UPDATE ?? SET ? WHERE ?? = ?", [
        pseudoModel.$tableName,
        whiteListedProperties,
        this.$getPrimaryKey(),
        recordId,
      ]);
    }
    return true;
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
    if (this.Class.tracked) {
      props.updated = new Date();
    }
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
  async update(props) {
    const properties = this.beforeSave(_.extend({}, props));
    let whiteListedProperties = this.$prepareProps(properties);
    whiteListedProperties = this.$beforeSave(whiteListedProperties);

    if (_.size(whiteListedProperties)) {
      await client.query("UPDATE ?? SET ? WHERE ?? = ?", [
        this.$tableName,
        whiteListedProperties,
        this.$primaryKey,
        this[this.$primaryKey],
      ]);
      _.extend(this, whiteListedProperties);
      this.$afterFind();
      this.afterFind();
    }
    return this;
  },
  $saveParams(setColumns = null) {
    const properties = this.beforeSave(this);
    let whiteListedProperties = this.$prepareProps(properties);
    whiteListedProperties = this.$beforeSave(whiteListedProperties);
    const columns = setColumns || _.keys(whiteListedProperties);
    const values = this.$getAt(columns, whiteListedProperties);
    return { columns, values, whiteListedProperties };
  },
  async save() {
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
    const data = await client.query(sql, [
      this.$tableName,
      columns,
      values,
      whiteListedProperties,
    ]);
    const model = await this.Class.find(data.insertId).exec();
    Object.assign(this, model);
    return this;
  },
  async delete() {
    await client.query("DELETE FROM ?? WHERE ?? = ?", [
      this.$tableName,
      this.$primaryKey,
      this[this.$primaryKey],
    ]);
    return true;
  },
};

seventyEight.createModel = function(options) { // eslint-disable-line max-statements
  const Model = options.constructor;
  const { schema = {} } = options;
  const tracked = options.tracked || false;
  const staticMembers = Object.assign({}, globalStaticMethods, options.static || {});
  const instanceMembers = _.extend({}, globalInstanceMethods, options.instance || {});
  const queryMethods = _.extend({}, chainQueryMethods.queryMethods, options.query || {});
  const tableName = options.tableName || `${_.snakeCase(Model.name).replace(/y$/g, 'ie')}s`;
  const QueryConstructor = eval( // eslint-disable-line no-eval
    `(function ${Model.name}(row, found) {
      for (const key in row) {
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
    tracked,
    db: client,
    $getPrimaryKey() {
      try {
        return Object.keys(this.schema).map(name => ({ name, primary: this.schema[name].primary })).find(field => field.primary).name;
      } catch (err) {
        throw new Error(`schema missing primary field: \n${JSON.stringify(this.schema, null, 2)}`);
      }
    },
  }, chainQueryMethods.evaluation, staticMembers);

  Object.assign(QueryConstructor.prototype, instanceMembers);

  QueryConstructor.prototype.Class = QueryConstructor;

  const initChain = () => _.extend({}, QueryConstructor, {
    $constructor: QueryConstructor,
    $getPrimaryKey: QueryConstructor.$getPrimaryKey(),
    $record: seventyEight,
    $chainInitialized: true,
    $queryParams: chainQueryMethods.getBase(),
  });

  const chainable = fn => function(...args) {
    const context = this.$chainInitialized ? this : initChain(); // eslint-disable-line no-invalid-this
    const nextSelf = _.extend({}, context);
    const ret = fn.apply(nextSelf, args);
    if (_.isUndefined(ret)) {
      return nextSelf;
    }
    throw new Error(`queryMethod ${Model.name}.${fn.name}() CANNOT return a value, call this.<otherQueryMethod>() (returns are permitted from static)`);
  };

  for (const queryMethod in queryMethods) {
    if (queryMethods[queryMethod]) {
      QueryConstructor[queryMethod] = chainable(queryMethods[queryMethod]);
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
