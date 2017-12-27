const { prefix, getAllModels, orderByRelation } = require('./utils');

const createCache = () => ({
  byClass: {},
  byTable: {},
});

const createCachingFn = cacheContext => (Model, modelName = null) => {
  cacheContext.byTable[Model.tableName] = Model;
  cacheContext.byClass[modelName || Model.name] = Model;
};

const createCachePullingFn = cacheContext => name => {
  if (cacheContext.byTable[name] || cacheContext.byClass[name]) {
    return cacheContext.byTable[name] || cacheContext.byClass[name];
  }
  const cacheJSON = {
    tables: Object.keys(cacheContext.byTable),
    classes: Object.keys(cacheContext.byClass),
  };
  throw new Error(`${prefix('red')} getModel('${name}') could not find a matching loaded model\nmodel cache:\n${JSON.stringify(cacheJSON, null, 2)}`);
};

const modelCache = createCache();
const cache = createCachingFn(modelCache);
const getModel = createCachePullingFn(modelCache);

const getBoundModelCache = async ({ context, query = null }) => {
  const boundModelCache = createCache();
  const boundCache = createCachingFn(boundModelCache);
  const getBoundModel = createCachePullingFn(boundModelCache);
  const models = await getAllModels();
  return orderByRelation(models).reduce((memo, Model) => {
    const BoundModel = Model.bindToContext({ getModel: getBoundModel, $transactionQuery: query }, context);
    boundCache(BoundModel);
    boundCache(BoundModel, Model.name);
    memo[Model.name] = BoundModel;
    return memo;
  }, {});
};

module.exports = {
  cache,
  getModel,
  getBoundModelCache,
};
