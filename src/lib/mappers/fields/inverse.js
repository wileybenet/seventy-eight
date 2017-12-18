const { noopNull } = require('../helpers');

module.exports = {
  inverse: {
    default(schemaField) {
      if (schemaField.relation) {
        return schemaField.inverse || null;
      }
      return null;
    },
    fromSQL(field) {
      const { inverse } = this.fields.comment.fromSQL.call(this, field);
      return inverse || null;
    },
    toSQL: noopNull,
  },
};
