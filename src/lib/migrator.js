const { flatMap } = require('lodash');
const utils = require('./migrator.utils');
const { schemaQuery, keyQuery } = require('./sql/schemas');

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
        schemaField.name = schemaField.name || name;
        return utils.applySchemaDefaults(schemaField);
      });
      const error = utils.schemaValidationError(schema);
      if (error) {
        throw new Error(`invalid '${this.tableName}' table schema: ${error}`);
      }
      return schema;
    },
    getSQLSchema() {
      return new Promise((resolve, reject) => {
        this.db.query(schemaQuery(this.tableName)).then(results => {
          resolve(results.map(utils.parseSchemaFieldFromSQL));
        }, reject);
      });
    },
    getSchemaDiff() {
      return new Promise((resolve, reject) => {
        this.getSQLSchema().then(currentSchema => {
          resolve(utils.schemaDiff(currentSchema, this.getSchema()));
        }).catch(reject);
      });
    },
    schemaCommands(changes) {
      return ['create', 'update', 'remove'].reduce((memo, method) => memo.concat(writeColumnChanges(changes, method)), []);
    },
    getKeys() {
      return utils.applyKeyDefaults(this.getSchema());
    },
    getSQLKeys() {
      return new Promise((resolve, reject) => {
        this.db.query(keyQuery(this.tableName)).then(results => {
          resolve(flatMap(results, utils.parseKeysFromSQL));
        }, reject);
      });
    },
    getKeyDiff() {
      return new Promise((resolve, reject) => {
        this.getSQLKeys().then(currentKeys => {
          resolve(utils.keyDiff(currentKeys, this.getKeys()));
        }).catch(reject);
      });
    },
    keyCommands(changes) {
      return [
        ...utils.writeKeysToSQL('add')(changes.create),
        ...utils.writeKeysToSQL('drop')(changes.remove),
      ];
    },
    updateTableSyntax() {
      return new Promise((resolve, reject) => {
        Promise.all([
          this.getSchemaDiff(),
          this.getKeyDiff(),
        ]).then(([schemaChanges, keyChanges]) => {
          const commands = [...this.schemaCommands(schemaChanges), ...this.keyCommands(keyChanges)];
          if (commands.length) {
            return resolve(`ALTER TABLE \`${this.tableName}\` \n${commands.join(',\n')}`);
          }
          resolve();
        }, reject);
      });
    },
    createTableSyntax() {
      const columns = this.getSchema().map(utils.writeSchemaToSQL);
      const keys = utils.writeKeysToSQL('init')(this.getKeys());
      const fields = [...columns, ...keys];
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
