const _ = require('lodash');
const { plural } = require('pluralize');
const client = require('./lib/db.client');
const migrator = require('./lib/migrator');
const fieldTypes = require('./lib/field');
const { error } = require('./utils');
const { mock } = require('./mock');

const seventyEight = {};
const chainQueryMethods = require('./query.builder');
const { getModel, cache } = require('./model.cache');
const { Model, staticMethods, instanceMethods, isModelSet } = require('./lib/Model');

seventyEight.db = client;
seventyEight.Model = Model;
seventyEight.field = fieldTypes;
seventyEight.error = error;
seventyEight.mock = mock;
seventyEight.getModel = getModel;
seventyEight.isModelSet = isModelSet;

const extend = function(options) { // eslint-disable-line max-statements
  let BaseModel = Model; // eslint-disable-line no-unused-vars
  if (this instanceof Model) {
    BaseModel = this; // eslint-disable-line consistent-this
  }
  const ModelConstructor = options.constructor;
  const { schema = {} } = options;
  const tracked = options.tracked || false;
  const staticMembers = Object.assign({}, options.static || {});
  const instanceMembers = Object.assign({}, options.instance || {});
  const queryMethods = Object.assign({}, chainQueryMethods.queryMethods, options.query || {});
  const tableName = options.tableName || plural(_.snakeCase(ModelConstructor.name));
  const QueryConstructor = eval( // eslint-disable-line no-eval
    `(class ${ModelConstructor.name} extends BaseModel {
        constructor(row, found) {
          super();
          for (const key in row) {
            this[key] = row[key];
          }
          this.$tableName = tableName;
          this.$primaryKey = this.Class.$getPrimaryKey();
          if (found) {
            this.$afterFind();
            this.afterFind();
          } else {
            ModelConstructor.call(this);
          }
        }
    })`);

  Object.assign(QueryConstructor, migrator.getMethods({ namespace: ModelConstructor.name }), {
    tableName,
    schema,
    tracked,
    camel(test) {
      if (_.isArray(test) || (_.isNumber(test) && test > 1)) {
        return _.camelCase(tableName);
      }
      return _.camelCase(ModelConstructor.name);
    },
    db: client,
    $getPrimaryKey() {
      try {
        return Object.keys(this.schema).map(name => ({ name, primary: this.schema[name].primary })).find(field => field.primary).name;
      } catch (err) {
        throw new Error(`schema missing primary field: \n${JSON.stringify(this.schema, null, 2)}`);
      }
    },
  }, chainQueryMethods.evaluation, staticMethods, staticMembers);

  Object.assign(QueryConstructor.prototype, instanceMethods, instanceMembers, {
    constructor: QueryConstructor,
    Class: QueryConstructor,
  });

  // for mocking out all methods
  Object.assign(QueryConstructor, {
    queryMethodKeys: Object.keys(queryMethods),
    staticMethodKeys: Object.getOwnPropertyNames(QueryConstructor).filter(prop => _.isFunction(QueryConstructor[prop])),
    instanceMethodKeys: Object.keys(Object.assign({}, instanceMethods, instanceMembers)).filter(prop => _.isFunction(QueryConstructor.prototype[prop])),
  });

  const initChain = () => _.extend({}, QueryConstructor, {
    Class: QueryConstructor,
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
    throw new Error(`queryMethod ${ModelConstructor.name}.${fn.name}() CANNOT return a value, call this.<otherQueryMethod>() (returns are permitted from static)`);
  };

  QueryConstructor.createQueryMethod = (fn, methodName) => {
    QueryConstructor[methodName] = chainable(fn);
  };

  _.forEach(queryMethods, QueryConstructor.createQueryMethod);

  cache(QueryConstructor);
  QueryConstructor.setRelations();
  return QueryConstructor;
};

Model.extend = extend;
seventyEight.createModel = extend;

module.exports = seventyEight;
