const _ = require('lodash');
const client = require('./db.client');
const schemaFilters = require('./schema.filters');
const RelationQuery = require('./relation.query');
const { getModel } = require('../model.cache');

class Model {
  constructor() { // eslint-disable-line no-useless-constructor
    //
  }
}

const instanceMethods = {
  $whiteList(properties) {
    return _.pick(properties, Object.keys(this.Class.schema));
  },
  $prepareProps(properties) {
    return this.$whiteList(properties);
  },
  $getAt(fields, properties) { // eslint-disable-line class-methods-use-this
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
  afterFind() { // eslint-disable-line class-methods-use-this

  },
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
  beforeSave(props) { // eslint-disable-line class-methods-use-this
    return props;
  },
  loadRelations(propKeys) {
    const relationFields = this.Class.getSchema().filter(field => field.relation);
    const modifiedRelations = _.intersection(relationFields.map(field => field.column), propKeys);
    if (modifiedRelations.length) {
      const relations = modifiedRelations.map(column => _.find(relationFields, { column })).map(({ relation }) => getModel(relation));
      return Promise.all(relations.map(relation => RelationQuery(this, relation)));
    }
  },
  async update(props) {
    const properties = this.beforeSave(_.extend({}, props));
    let whiteListedProperties = this.$prepareProps(properties);
    whiteListedProperties = this.$beforeSave(whiteListedProperties);
    const loadedRelationsProps = Object.keys(whiteListedProperties).filter(key => {
      if (this[key] instanceof Model) {
        return true;
      }
      if (this[key] && _.isArray(this[key]) && this[key][0] instanceof Model) {
        return true;
      }
      return false;
    });

    if (_.size(whiteListedProperties)) {
      await client.query("UPDATE ?? SET ? WHERE ?? = ?", [
        this.$tableName,
        whiteListedProperties,
        this.$primaryKey,
        this[this.$primaryKey],
      ]);
      _.extend(this, whiteListedProperties);
      await this.loadRelations(loadedRelationsProps);
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
      sql += '(?)';
      if (columns.includes(this.$primaryKey)) {
        sql += 'ON DUPLICATE KEY UPDATE ?';
      }
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
    const model = await this.Class.find(data.insertId || this[this.$primaryKey]).exec();
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

Object.assign(Model.prototype, instanceMethods);

const staticMethods = {
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
};

Object.assign(Model, staticMethods);

module.exports = {
  Model,
  staticMethods,
  instanceMethods,
};
