const { color, modelDir } = require('../../utils');
const _ = require('lodash');
const seventyEight = require('../../seventy.eight');

const green = color('green');

const getAllRelations = Model => {
  const relations = Model.getSchema().filter(field => field.relation).map(({ relation }) => seventyEight.getModel(relation));
  return relations.concat(_.flatMap(relations, getAllRelations));
};

module.exports = {
  syncTable(modelName) {
    return new Promise((resolve, reject) => {
      let Model = null;
      try {
        Model = require(`${modelDir}/${modelName}`);
      } catch (err) {
        return reject(err);
      }
      const relations = getAllRelations(Model);
      const tree = _.uniq(relations.reverse());
      console.log(`Syncing ${modelName} and its relations (${tree.map(n => n.name)})`);
      const tableSyncs = [Model, ...relations].map(relation => relation.syncTable());
      Promise.all(tableSyncs)
        .then(() => {
          resolve(green('Done'));
        })
        .catch(reject)
        .then(seventyEight.db.close);
    });
  },
};
