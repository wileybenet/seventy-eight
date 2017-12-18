const { noopPick, noopNull } = require('../helpers');

module.exports = {
  name: {
    default: noopPick('name'),
    fromSQL(field) {
      return field.COLUMN_NAME;
    },
    toSQL: noopNull,
  },
};
