module.exports = {
  required: {
    default(schemaField) {
      if (schemaField.primary) {
        return true;
      }
      return schemaField.required || false;
    },
    fromSQL(field) {
      return field.IS_NULLABLE === 'NO';
    },
    toSQL(schemaField) {
      return schemaField.required ? 'NOT NULL' : 'NULL';
    },
  },
};
