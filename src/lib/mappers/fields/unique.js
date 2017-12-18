const { UNIQUE, noopNull } = require('../helpers');

module.exports = {
  unique: {
    default(schemaField) {
      if (schemaField.unique) {
        return schemaField.unique === true ? `UNIQUE_${this.namespace.toUpperCase()}_${schemaField.name.toUpperCase()}` : schemaField.unique;
      }
      return false;
    },
    fromSQL({ keys }) {
      const key = keys.find(k => k.type === UNIQUE) || {};
      return key.type === UNIQUE ? key.name : false;
    },
    toSQL: noopNull,
  },
};
