var Collection = require('./lib/Collection');
var _ = require('lodash');
var db = require('./lib/db.client');

function formatWhere(obj) {
  if (typeof obj === 'string') {
    return obj;
  } else if (obj.$OR || obj.$AND) {
    return _.map(obj, function(value, key) {
      return formatWhereDeep(key, value);
    }).join('');
  } else {
    return _.map(obj, function(value, key) {
      return formatWherePair(key, value);
    }).join(' AND ');
  }
}

function formatWhereDeep(key, value) {
  if (key === '$OR' || key === '$AND') {
    return '(' + _.map(value, function(v, k) {
      return formatWhereDeep(k, v);
    }).join(' ' + key.substr(1) + ' ') + ')';
  } else {
    return formatWherePair(key, value);
  }
}

function formatWherePair(key, value) {
  var multiValue = false;
  var operator = '=';
  if (_.isArray(value)) {
    if (['!=' ,'<>', '<', '<=', '>', '>=', '<=>', 'IS', 'IS NOT'].indexOf(value[0]) !== -1) {
      operator = value[0];
      value = value[1];
    } else {
      multiValue = true;
    }
  }
  if (multiValue) {
    return db.escapeKey(key) + ' IN (' + db.escapeValue(value) + ')';
  } else {
    return db.escapeKey(key) + ' ' + operator + ' ' + db.escapeValue(value);
  }
}

function instantiateResponse(data) {
  var this_ = this;
  var models = new Collection();
  data.forEach(function(el) {
    models.push(new this_.$constructor(el, true));
  });

  return (this.$singleResult) ? (models[0] || null) : (models || []);
}

var api = {
  all: function() {},
  select: function(fields) {
    var selects;
    if (_.isArray(fields)) {
      selects = fields;
    } else {
      selects = fields.split(/,/g);
    }

    this.$queryParams.select = this.$queryParams.select.concat(selects.map(function(el) {
      return el.trim();
    }));
  },
  find: function(id) {
    this.$singleResult = true;
    this.where({ id: id }).limit(1);
  },
  one: function() {
    this.$singleResult = true;
    this.$queryParams.limit = 1;
  },
  joins: function(sql) {
    var joins;
    if (_.isArray(sql)) {
      joins = sql.join(' ');
    } else {
      joins = sql;
    }
    this.$queryParams.joins.push(joins);
  },
  group: function(keys) {
    var groups;
    if (_.isArray(keys)) {
      groups = keys;
    } else {
      groups = keys.split(/,/g);
    }

    this.$queryParams.group = this.$queryParams.group.concat(groups.map(function(el) {
      return el.trim();
    }));
  },
  order: function(keys) {
    var orders;
    if (_.isArray(keys)) {
      orders = keys;
    } else {
      orders = keys.split(/,/g);
    }

    this.$queryParams.order = this.$queryParams.order.concat(orders.map(function(el) {
      return el.trim();
    }));
  },
  where: function(condition) {
    if (condition)
      this.$queryParams.where.push(formatWhere.apply(null, [].concat(condition)));
  },
  limit: function(size) {
    this.$queryParams.limit = +size;
  },
  then: function(cbFn, errFn) {
    var this_ = this;
    var query = this.$renderSql();

    this.$record.db
      .query(query)
      .then(function(data) {
        if (cbFn)
          cbFn(instantiateResponse.call(this_, data));
      }, errFn);
  },
  $renderSql: function() {
    var query = '';
    var params = [];
    if (_.size(this.$queryParams.select)) {
      query += 'SELECT ' + this.$queryParams.select.join(', ');
    } else {
      query += 'SELECT *';
    }
    if (this.tableName) {
      params.push(this.tableName);
      query += ' FROM ??';
    }
    if (_.size(this.$queryParams.joins)) {
      query += ' ' + this.$queryParams.joins.join(' ');
    }
    if (_.size(this.$queryParams.where)) {
      query += ' WHERE ' + this.$queryParams.where.join(' AND ');
    }
    if (_.size(this.$queryParams.group)) {
      params.push(this.$queryParams.group);
      query += ' GROUP BY ??';
    }
    if (_.size(this.$queryParams.order)) {
      query += ' ORDER BY ' + this.$queryParams.order.join(', ');
    }
    if (this.$queryParams.limit) {
      params.push(this.$queryParams.limit);
      query += ' LIMIT ?';
    }

    query += ';';
    return db.formatQuery(query, params);
  }
};

module.exports = api;