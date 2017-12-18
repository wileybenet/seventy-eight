const { noopPick } = require('../helpers');

module.exports = {
  autoIncrement: {
    default: noopPick('autoIncrement', false),
    fromSQL(field) {
      return Boolean(field.EXTRA.match(/auto_increment/));
    },
    toSQL(schemaField) {
      return schemaField.autoIncrement ? 'AUTO_INCREMENT' : '';
    },
  },
};
