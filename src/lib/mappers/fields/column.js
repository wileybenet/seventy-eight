module.exports = {
  column: {
    default(schemaField) {
      return schemaField.name;
    },
    fromSQL(field) {
      return field.COLUMN_NAME;
    },
    toSQL(schemaField) {
      return schemaField.column;
    },
  },
};
