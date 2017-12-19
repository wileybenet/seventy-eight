const _ = require('lodash');
const db = require('./lib/db.client');
const RelationQuery = require('./lib/relation.query');
const { getModel } = require('./model.cache');
const { inSerial, error: { NotFoundError } } = require('./utils');

const formatWherePair = (key, value) => {
  let multiValue = false;
  let operator = '=';
  let whereValue = value;
  if (_.isArray(value)) {
    if (['!=', '<>', '<', '<=', '>', '>=', '<=>', 'IS', 'IS NOT'].indexOf(value[0]) > -1) {
      [operator] = value;
      [, whereValue] = value;
    } else {
      multiValue = true;
    }
  }
  if (multiValue) {
    return `${db.escapeKey(key)} IN (${db.escapeValue(whereValue)})`;
  }
  return `${db.escapeKey(key)} ${operator} ${db.escapeValue(whereValue)}`;
};

const formatWhereDeep = (key, value) => {
  if (key === '$OR' || key === '$AND') {
    return `(${_.map(value, (v, k) => formatWhereDeep(k, v)).join(` ${key.substr(1)} `)})`;
  }
  return formatWherePair(key, value);
};

const formatWhere = (obj) => {
  if (typeof obj === 'string') {
    return obj;
  } else if (obj.$OR || obj.$AND) {
    return _.map(obj, (value, key) => formatWhereDeep(key, value)).join('');
  }
  return _.map(obj, (value, key) => formatWherePair(key, value)).join(' AND ');
};

const instantiateResponse = function(data) {
  const models = data.map(el => new this.Class(el, true));
  if (this.$queryParams.singleResult) {
    if (models[0]) {
      return models[0];
    }
    throw new NotFoundError();
  }
  return models || [];
};

const allQueries = async function(transactionQuerier) {
  const send = q => q();
  const query = transactionQuerier || this.$record.db.query;
  const result = await query(this.$sql());
  const models = instantiateResponse.call(this, result);
  if (this.$queryParams.relations.length) {
    const relationQueries = this.$queryParams.relations.map(relation => new RelationQuery(models, relation));
    const queries = [
      ...relationQueries.map(rq => () => rq.exec(transactionQuerier)),
    ];
    if (transactionQuerier) {
      await inSerial(queries, send);
    }
    await Promise.all(queries.map(send));
  }
  return models;
};

const queryMethods = {
  all() {},
  select(fields) {
    let selects = null;
    if (_.isArray(fields)) {
      selects = fields;
    } else {
      selects = fields.split(/,/g);
    }

    this.$queryParams.select = this.$queryParams.select.concat(selects.map(function(el) {
      return el.trim();
    }));
  },
  find(id) {
    const where = {};
    this.$queryParams.singleResult = true;
    where[`${this.Class.tableName}.${this.Class.$getPrimaryKey()}`] = id;
    this.where(where).limit(1);
  },
  one() {
    this.$queryParams.singleResult = true;
    this.$queryParams.limit = 1;
  },
  joins(sql) {
    let joins = null;
    if (_.isArray(sql)) {
      joins = sql.join(' ');
    } else {
      joins = sql;
    }
    this.$queryParams.joins.push(joins);
  },
  group(keys) {
    let groups = null;
    if (_.isArray(keys)) {
      groups = keys;
    } else {
      groups = keys.split(/,/g);
    }

    this.$queryParams.group = this.$queryParams.group.concat(groups.map(function(el) {
      return el.trim();
    }));
  },
  order(keys) {
    let orders = null;
    if (_.isArray(keys)) {
      orders = keys;
    } else {
      orders = keys.split(/,/g);
    }

    this.$queryParams.order = this.$queryParams.order.concat(orders.map(function(el) {
      return el.trim();
    }));
  },
  where(condition) {
    if (condition) {
      this.$queryParams.where.push(formatWhere(...[].concat(condition)));
    }
  },
  limit(size) {
    this.$queryParams.limit = Number(size);
  },
  include(model) {
    const relation = [].concat(model).map(m => {
      if (_.isString(m)) {
        return getModel(m);
      }
      return m;
    });
    this.$queryParams.relations = this.$queryParams.relations.concat(relation);
  },
};

module.exports = {
  getBase() {
    return {
      where: [],
      select: [],
      joins: [],
      group: [],
      order: [],
      relations: [],
      limit: null,
      singleResult: false,
    };
  },
  queryMethods,
  evaluation: {
    $sql(partition = false) { // eslint-disable-line max-statements
      let query = '';
      const params = [];
      if (_.size(this.$queryParams.select)) {
        query += `SELECT ${this.$queryParams.select.join(', ')}`;
      } else {
        query += 'SELECT *';
      }
      if (this.tableName) {
        params.push(this.tableName);
        query += ' FROM ??';
      }
      if (_.size(this.$queryParams.joins)) {
        query += ` ${this.$queryParams.joins.join(' ')}`;
      }
      if (_.size(this.$queryParams.where)) {
        query += ` WHERE ${this.$queryParams.where.join(' AND ')}`;
      }
      if (_.size(this.$queryParams.group)) {
        params.push(this.$queryParams.group);
        query += ' GROUP BY ??';
      }
      if (_.size(this.$queryParams.order)) {
        query += ` ORDER BY ${this.$queryParams.order.join(', ')}`;
      }
      if (this.$queryParams.limit) {
        params.push(this.$queryParams.limit);
        query += ' LIMIT ?';
      }

      query += ';';
      return partition ? [query, params] : db.formatQuery(query, params);
    },
    exec(transactionQuerier) {
      if (transactionQuerier && transactionQuerier.length !== 2) {
        throw new Error('method passed to exec() should be a query method for performing all queries on the same connection');
      }
      this.$chainInitialized = false;
      return allQueries.call(this, transactionQuerier);
    },
  },
};
