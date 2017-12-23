 /* eslint-disable no-eval */
const _ = require('lodash');
const { plural } = require('pluralize');
const client = require('./lib/db.client');
const migrator = require('./lib/migrator');
const fieldTypes = require('./lib/field');
const { error, getAllModels } = require('./utils');
const { mock } = require('./mock');

const seventyEight = {};
const chainQueryMethods = require('./query.builder');
const { cache, getModel, getBoundModelCache } = require('./model.cache');
const { Model, staticMethods, instanceMethods, isModelSet } = require('./lib/Model');

seventyEight.db = client;
seventyEight.Model = Model;
seventyEight.field = fieldTypes;
seventyEight.error = error;
seventyEight.mock = mock;
seventyEight.getModel = getModel;
seventyEight.isModelSet = isModelSet;
seventyEight.getAllModels = getAllModels;
seventyEight.getBoundModelCache = getBoundModelCache;

const getConstructor = (className, baseName) => `(
  class ${className} extends ${baseName} {
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
  }
)`;

const extend = function(options) { // eslint-disable-line max-statements
  if (!options.constructor.name.match(/^[A-Z][A-Za-z0-9]+$/)) {
    throw new Error('Model names must be letters and/or numbers in pascal case');
  }
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
  const QueryConstructor = eval(getConstructor(ModelConstructor.name, 'BaseModel'));

  Object.assign(QueryConstructor, migrator.getMethods({ namespace: ModelConstructor.name }), {
    tableName,
    schema,
    tracked,
    getModel,
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

  const initChain = context => Object.assign({}, context, {
    Class: context,
    $chainInitialized: true,
    $queryParams: chainQueryMethods.getBase(),
  });

  const chainable = fn => function(...args) {
    const context = this.$chainInitialized ? this : initChain(this); // eslint-disable-line no-invalid-this
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

  QueryConstructor.bindToContext = (context, bindingOverrides) => {
    const BoundModel = eval(getConstructor(`Bound${ModelConstructor.name}`, 'QueryConstructor'));
    Object.assign(BoundModel, QueryConstructor, bindingOverrides, context);
    BoundModel.prototype.constructor = QueryConstructor;
    Object.assign(BoundModel.prototype, context);
    BoundModel.resetRelations().setRelations();
    return BoundModel;
  };

  cache(QueryConstructor);
  QueryConstructor.setRelations();
  return QueryConstructor;
};

Model.extend = extend;
seventyEight.createModel = extend;

module.exports = seventyEight;
