const fs = require('fs');
const { flatMap } = require('lodash');
const { migrationDir, indent } = require('../utils');
const utils = require('./migrator.utils');
const { schemaQuery, keyQuery } = require('./sql/schemas');

const writeColumnChanges = (changes, method) => {
  if (changes[method].length) {
    return changes[method].map(schemaField => utils.writeSchemaToSQL(schemaField, method));
  }
  return [];
};

const schemaCommands = changes => ['create', 'update', 'remove'].reduce((memo, method) => memo.concat(writeColumnChanges(changes, method)), []);
const keyCommands = changes => [
  ...utils.writeKeysToSQL('drop')(changes.remove),
  ...utils.writeKeysToSQL('add')(changes.create),
];

const writeMigration = sql => new Promise((resolve, reject) => {
  // if (sql) {
  //   fs.writeFile(`${migrationDir}/migration.sql`, err => {
  //     if (err) {
  //       return reject(err);
  //     }
  //     resolve();
  //   });
  // } else {
  //   resolve();
  // }
});

module.exports = {
  methods: {
    getSchema() {
      const schema = Object.keys(this.schema).map(name => {
        const schemaField = this.schema[name];
        schemaField.name = schemaField.name || name;
        return utils.applySchemaDefaults(schemaField);
      });
      const error = utils.schemaValidationError(schema);
      if (error) {
        throw new Error(`invalid '${this.tableName}' table schema: ${error}`);
      }
      return schema;
    },
    getSchemaColumns() {
      return this.getSchema().filter(field => !field.autoIncrement).map(field => field.column);
    },
    getDefaultSchemaFields() {
      return this.getSchema().filter(field => field.default !== null || field.autoIncrement).map(field => field.column);
    },
    getPrimaryKeyField() {
      return this.getSchema().find(field => field.primary);
    },
    getSQLSchema() {
      return new Promise((resolve, reject) => {
        Promise.all([
          this.db.query(schemaQuery(this.tableName), null, true),
          this.db.query(keyQuery(this.tableName), null, true),
        ]).then(([schemaResults, keyResults]) => {
          const sqlKeys = flatMap(keyResults, utils.parseKeysFromSQL);
          const sqlSchema = schemaResults.map(utils.parseSchemaFieldFromSQL(sqlKeys));
          resolve({ sqlSchema, sqlKeys });
        }, reject);
      });
    },
    getKeys() {
      return utils.applyKeyDefaults(this.getSchema());
    },
    getSchemaDiff() {
      return new Promise((resolve, reject) => {
        this.getSQLSchema().then(({ sqlSchema, sqlKeys }) => {
          const keyChanges = utils.keyDiff(sqlKeys, this.getKeys(), true);
          const schemaChanges = utils.schemaDiff(sqlSchema, this.getSchema());
          resolve({ schemaChanges, keyChanges });
        }).catch(reject);
      });
    },
    updateTableSyntax() {
      return new Promise((resolve, reject) => {
        this.getSchemaDiff().then(({ schemaChanges, keyChanges }) => {
          const commands = [...schemaCommands(schemaChanges), ...keyCommands(keyChanges)];
          if (commands.length) {
            return resolve(`ALTER TABLE \`${this.tableName}\` ${indent}${commands.join(`,${indent}`)}`);
          }
          resolve();
        }, reject);
      });
    },
    createTableSyntax() {
      const columns = this.getSchema().map(utils.writeSchemaToSQL);
      const keys = utils.writeKeysToSQL('init')(this.getKeys());
      const fields = [...columns, ...keys];
      return Promise.resolve(`CREATE TABLE \`${this.tableName}\` (${indent}${fields.join(`,${indent}`)}\n)`);
    },
    migrationSyntax() {
      return new Promise((resolve, reject) => {
        this.db.query(`SELECT 1 FROM ??`, [this.tableName], true)
          .then(() => this.updateTableSyntax(), () => this.createTableSyntax())
          .then(resolve, reject);
      });
    },
    syncTable() {
      return new Promise((resolve, reject) => {
        const execute = syntax => {
          if (!syntax) {
            return resolve(false);
          }
          this.db.query(syntax).then(() => {
            resolve(true);
          }, reject);
        };
        this.migrationSyntax().then(execute).catch(reject);
      });
    },
  },
};
