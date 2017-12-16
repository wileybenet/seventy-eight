const { prefix } = require('./utils');

const modelCache = {
  byClass: {},
  byTable: {},
};

module.exports = {
  cache(QueryConstructor) {
    modelCache.byTable[QueryConstructor.tableName] = QueryConstructor;
    modelCache.byClass[QueryConstructor.name] = QueryConstructor;
  },
  getModel(name) {
    if (modelCache.byTable[name] || modelCache.byClass[name]) {
      return modelCache.byTable[name] || modelCache.byClass[name];
    }
    const cacheJSON = {
      tables: Object.keys(modelCache.byTable),
      classes: Object.keys(modelCache.byClass),
    };
    throw new Error(`${prefix('red')} getModel('${name}') could not find a matching loaded model\nmodel cache:\n${JSON.stringify(cacheJSON, null, 2)}`);
  },
};
