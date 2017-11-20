var methods = {
  createTableSyntax() {
    var fields = Object.keys(this.schema).map(fieldName => {
      return fieldName;
    });

    return `
      CREATE TABLE ${this.tableName}
        ${fields.join(',\n')}

    `.trim();
  },
  createTable() {

  },
  migrateTable() {

  }
};

module.exports = {
  methods,
};
