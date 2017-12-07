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
      async getSQLSchema() {
        const [schemaResults, keyResults] = await Promise.all([
          this.db.query(schemaQuery(this.tableName), null, true),
          this.db.query(keyQuery(this.tableName), null, true),
        ]);
        const sqlKeys = flatMap(keyResults, utils.parseKeysFromSQL);
        const sqlSchema = schemaResults.map(utils.parseSchemaFieldFromSQL(sqlKeys));
        return { sqlSchema, sqlKeys };
      },
      getKeys() {
        return utils.applyKeyDefaults(this.getSchema());
      },
      async getSchemaDiff() {
        const { sqlSchema, sqlKeys } = await this.getSQLSchema();
        const keyChanges = utils.keyDiff(sqlKeys, this.getKeys(), false);
        const schemaChanges = utils.schemaDiff(sqlSchema, this.getSchema());
        return { schemaChanges, keyChanges };
      },
      async updateTableSyntax() {
        const { schemaChanges, keyChanges } = await this.getSchemaDiff();
        const keyCmds = keyCommands(keyChanges);
        const commands = [...schemaCommands(schemaChanges), ...keyCmds.drops];
        const queries = [];
        if (commands.length) {
          queries.push(alterSyntax(this.tableName, commands));
        }
        if (keyCmds.adds.length) {
          queries.push(alterSyntax(this.tableName, keyCmds.adds));
        }
        return queries.join('\n') || null;
      },
      createTableSyntax() {
        const columns = this.getSchema().map(utils.writeSchemaToSQL);
        const keys = utils.writeKeysToSQL('init')(this.getKeys());
        const fields = [...columns, ...keys];
        return `CREATE TABLE \`${this.tableName}\` (${indent}${fields.join(`,${indent}`)}\n)`;
      },
      async migrationSyntax() {
        try {
          await this.db.query(`SELECT 1 FROM ??`, [this.tableName], true);
          return this.updateTableSyntax();
        } catch (err) {
          return this.createTableSyntax();
        }
      },
      async syncTable() {
        const syntax = await this.migrationSyntax();
        if (!syntax) {
          return false;
        }
        await this.db.query(syntax);
        return true;
      },
    };
  },
};
