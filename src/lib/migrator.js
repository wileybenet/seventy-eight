var utils = require('./migrator.utils');

const writeColumnChanges = (changes, method) => {
  if (changes[method].length) {
    return changes[method].map(schemaField => utils.writeSchemaToSQL(schemaField, method));
  }
  return [];
};

module.exports = {
  methods: {
    getSchema() {
      const schema = Object.keys(this.schema).map(name => {
        var schemaField = this.schema[name];
        schemaField.name = name;
        return utils.applySchemaDefaults(schemaField);
      });
      const error = utils.schemaValidationError(schema);
      if (error) {
        throw new Error(`invalid '${this.tableName}' table schema: ${error}`);
      }
      return schema;
    },
    getCurrentFields() {
      return new Promise((resolve, reject) => {
        this.db.query(`DESCRIBE \`${this.tableName}\``).then(results => {
          resolve(results.map(utils.parseFieldFromMySQL));
        }, reject);
      });
    },
    updateTableSyntax() {
      return new Promise((resolve, reject) => {
        var schema = this.getSchema();
        this.getCurrentFields().then(fields => {
          var changes = utils.diff(fields, schema);
          const cmds = ['update', 'create', 'remove'].reduce((memo, method) => memo.concat(writeColumnChanges(changes, method)), []);
          if (cmds.length) {
            return resolve(`ALTER TABLE \`${this.tableName}\` \n${cmds.join(',\n')}`);
          }
          resolve();
        }, reject);
      });
    },
    createTableSyntax() {
      var fields = this.getSchema().map(schemaField => utils.writeSchemaToSQL(schemaField));
      return Promise.resolve(`CREATE TABLE \`${this.tableName}\` (\n${fields.join(',\n')}\n)`);
    },
    syncTable() {
      return new Promise((resolve, reject) => {
        const execute = syntax => {
          if (!syntax) {
            console.log(`No changes for table ${this.tableName}`);
            return resolve();
          }
          this.db.query(syntax).then(() => {
            console.log(`Updated and synchronized table ${this.tableName}`);
            resolve();
          }, reject);
        };
        this.db.query(`SELECT 1 FROM \`${this.tableName}\``)
          .then(() => this.updateTableSyntax(), () => this.createTableSyntax())
          .then(execute, reject);
      });
    },
  },
};
