// const { color } = require('../../utils');
const _ = require('lodash');
const seventyEight = require('../../seventy.eight');

const load = () => {};
const getAllRelations = Model => {
  const relations = Model.getSchema().filter(field => field.relation).map(relation => seventyEight.modelCache[relation]);
  return relations.concat(_.flatMap(relations, getAllRelations));
};

module.exports = {
  syncTable(modelName) {
    return new Promise((resolve, reject) => {
      console.log(`not implemented`);
      // load model
      // introspect Model.getSchema()
      const Model = load(modelName);
      const relations = getAllRelations(Model);
      const tree = _.uniq(relations.reverse());
      console.log(`Syncing ${modelName} and it's relations (${tree.map(n => n.$constructor.name)})`);
      resolve();
      seventyEight.db.close();
    });
  },
};
