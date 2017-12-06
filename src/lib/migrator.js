const { flatMap } = require('lodash');
const { indent } = require('../utils');
const { getUtils } = require('./migrator.utils');
const { schemaQuery, keyQuery } = require('./sql/schemas');

module.exports = {
  getMethods(context) {
    const utils = getUtils(context);
    const writeColumnChanges = (changes, method) => {
      if (changes[method].length) {
        return changes[method].map(schemaField => utils.writeSchemaToSQL(schemaField, method));
      }
      return [];
    };

    const alterSyntax = (tableName, commands) => `ALTER TABLE \`${tableName}\` ${indent}${commands.join(`,${indent}`)};`;

    const schemaCommands = changes => ['create', 'update', 'remove'].reduce((memo, method) => memo.concat(writeColumnChanges(changes, method)), []);
    const keyCommands = changes => ({
      drops: utils.writeKeysToSQL('drop')(changes.remove),
      adds: utils.writeKeysToSQL('add')(changes.create),
    });
    return {
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
      getDefaultSchemaFields() {
        return this.getSchema().filter(field => field.default !== null || field.autoIncrement).map(field => field.column);
      },
      getRelations() {
        return this.getSchema().map(field => field.relation).filter(m => m);
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
            const keyChanges = utils.keyDiff(sqlKeys, this.getKeys(), false);
            const schemaChanges = utils.schemaDiff(sqlSchema, this.getSchema());
            resolve({ schemaChanges, keyChanges });
          }).catch(reject);
        });
      },
      updateTableSyntax() {
        return new Promise((resolve, reject) => {
          this.getSchemaDiff().then(({ schemaChanges, keyChanges }) => {
            const keyCmds = keyCommands(keyChanges);
            const commands = [...schemaCommands(schemaChanges), ...keyCmds.drops];
            const queries = [];
            if (commands.length) {
              queries.push(alterSyntax(this.tableName, commands));
            }
            if (keyCmds.adds.length) {
              queries.push(alterSyntax(this.tableName, keyCmds.adds));
            }
            resolve(queries.join('\n') || null);
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
    };
  },
};
