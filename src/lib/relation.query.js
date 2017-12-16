const { camelCase } = require('lodash');
const { buildIndex } = require('../utils');

class RelationQuery {
  constructor(model, instances, relation) {
    this.model = model;
    this.relation = relation;
    this.instances = [].concat(instances);

    const aligned = model.getSchema().find(field => field.relation === relation.tableName);
    if (aligned) {
      this.many = aligned.hasMany;
      this.where = { [aligned.relationColumn]: instances.map(instance => instance[aligned.column]) };
      this.instanceColumn = aligned.column;
      this.relationColumn = aligned.relationColumn;
    } else {
      const inverse = relation.getSchema().find(field => field.relation === model.tableName);
      this.many = inverse.hasSiblings;
      this.where = { [inverse.column]: instances.map(instance => instance[inverse.relationColumn]) };
      this.instanceColumn = inverse.relationColumn;
      this.relationColumn = inverse.column;
    }
  }
  async exec(query) {
    const result = await this.relation.where(this.where).exec(query);
    this.assign(result);
    return result;
  }
  assign(result) {
    const property = camelCase(this.many ? this.relation.tableName : this.relation.name);
    const instanceIndex = buildIndex(this.instances, this.instanceColumn);

    result.forEach(relation => {
      const parent = instanceIndex[relation[this.relationColumn]];
      if (parent) {
        if (this.many) {
          parent[property] = parent[property] || [];
          parent[property].push(relation);
        } else {
          parent[property] = relation;
        }
      } else {
        throw new Error(`${relation.Class.name} instance has no ${this.model.name} to assign to: ${relation.Class.name}.${this.relationColumn} = ${relation[this.relationColumn]}`);
      }
    });
  }
}

module.exports = RelationQuery;
