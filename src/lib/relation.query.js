const { camelCase } = require('lodash');
const { plural } = require('pluralize');
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
    this.model = this.instances[0].Class;

    const directRelations = this.model.getSchema().filter(field => field.relation === relation.tableName);
    if (directRelations.length) {
      this.alignments = directRelations.map(field => ({
        modelColumn: field.column,
        relationColumn: field.relationColumn,
        many: false,
        inverse: false,
      }));
    } else {
      const inverseRelations = relation.getSchema().filter(field => field.relation === this.model.tableName);
      this.alignments = inverseRelations.map(field => ({
        modelColumn: field.relationColumn,
        relationColumn: field.column,
        many: !field.oneToOne,
        inverse: true,
        inverseProp: field.inverse,
      }));
    }
    this.where = {
      '$OR': this.alignments.reduce((memo, alignment) => {
        memo[alignment.relationColumn] = this.instances.map(inst => inst[alignment.modelColumn]);
        return memo;
      }, {}),
    };
  }
  async exec(query) {
    const result = await this.relation.where(this.where).exec(query);
    this.assign(result);
    return result;
  }
  getPropName(inverseProp, modelColumn, inverse, many) {
    if (inverseProp) {
      return inverseProp;
    }
    if (inverse) {
      if (many) {
        return camelCase(this.relation.tableName);
      }
      return camelCase(this.model.name);
    }
    if (many) {
      return plural(modelColumn);
    }
    return modelColumn;
  }
  assign(result) {
    this.alignments.forEach(({ inverse, many, modelColumn, relationColumn, inverseProp }) => {
      const index = buildIndex(this.instances, modelColumn);
      const assignmentProp = this.getPropName(inverseProp, modelColumn, inverse, many);
      result.forEach(relation => {
        const parent = index[relation[relationColumn]];
        if (!parent) {
          throw new Error(`${relation.Class.name} instance has no ${this.model.name} to assign to: ${relation.Class.name}.${relationColumn} = ${relation[relationColumn]}`);
        }
        if (many) {
          parent[assignmentProp] = parent[assignmentProp] || [];
          parent[assignmentProp].push(relation);
        } else {
          parent[assignmentProp] = relation;
        }
      });
    });
  }
}

module.exports = RelationQuery;
