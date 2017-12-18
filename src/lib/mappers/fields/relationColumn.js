const { FOREIGN, noopNull } = require('../helpers');

module.exports = {
  relationColumn: {
    default(schemaField) {
      if (schemaField.relation) {
        return schemaField.relationColumn || 'id';
      }
      return null;
    },
    fromSQL({ keys }) {
      const key = keys.find(k => k.type === FOREIGN) || {};
      return key.relationColumn || null;
    },
    toSQL: noopNull,
  },
};
