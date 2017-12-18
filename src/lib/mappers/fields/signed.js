const { noopPick } = require('../helpers');

module.exports = {
  signed: {
    default: noopPick('signed', false),
    fromSQL(field) {
      return field.COLUMN_TYPE.match(/^int/) ? !field.COLUMN_TYPE.match(/unsigned/) : false;
    },
    toSQL(schemaField) {
      return schemaField.type === 'int' && !schemaField.signed ? 'UNSIGNED' : '';
    },
  },
};
