const { INDEXED, noopNull } = require('../helpers');

module.exports = {
  indexed: {
    default(schemaField) {
      if (schemaField.indexed) {
        return schemaField.indexed === true ? `INDEXED_${this.namespace.toUpperCase()}_${schemaField.name.toUpperCase()}` : schemaField.indexed;
      }
      return false;
    },
    fromSQL({ keys }) {
      const key = keys.find(k => k.type === INDEXED) || {};
      return key.type === INDEXED ? key.name : false;
    },
    toSQL: noopNull,
  },
};
