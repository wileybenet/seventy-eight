const { noopPick } = require('../helpers');

module.exports = {
  length: {
    default: noopPick('length'),
    fromSQL(field) {
      try {
        return Number(field.COLUMN_TYPE.match(/\(([^)]+)\)/)[1]);
      } catch (err) {
        return null;
      }
    },
    toSQL(schemaField) {
      return `${schemaField.length ? `(${schemaField.length})` : ''}`;
    },
  },
};
