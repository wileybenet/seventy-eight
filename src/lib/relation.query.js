const { uniq } = require('lodash');
const { buildIndex } = require('../utils');

/**
 * RelationQueries are assigned to the querying model using column relation inference.
 *
 * If a model has an explicit relation on a column, the related model will be loaded
 * to that colum. The models will be assigned as a single instance.
 *
 * If multiple schema fields for a model point relations to the same table, the related models
 * will be assigned to said fields
 *
 * If an inverse include() call finds a oneToOne flag, the model will be loaded onto a property
 * named identically to the inverse field. Otherwise, an array of related models are assigned to
 * a property with a name in the plural form of the inverse field
 */
class RelationQuery {
  constructor(instance/*s*/, relation) {
    this.relation = relation;
    this.instances = [].concat(instance);
    if (this.instances.length === 0) {
      this.empty = true;
      return;
    }
    this.model = this.instances[0].Class;
    this.alignments = this.model.getRelations().filter(({ relation: r }) => r.tableName === relation.tableName);
    this.where = {
      '$OR': this.alignments.reduce((memo, alignment) => {
        memo[alignment.relationColumn] = uniq(this.instances.map(inst => inst[alignment.column]));
        return memo;
      }, {}),
    };
  }
  async exec(query) {
    if (this.empty) {
      return [];
    }
    const result = await this.relation.where(this.where).exec(query);
    this.assign(result);
    return result;
  }
  assign(result) {
    this.alignments.forEach(({ name, column, relationColumn, hasMany }) => {
      const index = buildIndex(this.instances, column);
      result.forEach(relationInstance => {
        const parent = index[relationInstance[relationColumn]];
        if (!parent) {
          return;
        }
        if (hasMany) {
          parent[name] = parent[name] || [];
          parent[name].push(relationInstance);
        } else {
          parent[name] = relationInstance;
        }
      });
    });
  }
}

module.exports = RelationQuery;
