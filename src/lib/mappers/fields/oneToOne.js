const { noopNull } = require('../helpers');

module.exports = {
  oneToOne: {
    default(schemaField) {
      if (schemaField.relation) {
        return schemaField.oneToOne || false;
      }
      return false;
    },
    fromSQL(field) {
      const { oneToOne } = this.fields.comment.fromSQL.call(this, field);
      return Boolean(oneToOne);
    },
    toSQL: noopNull,
  },
};
