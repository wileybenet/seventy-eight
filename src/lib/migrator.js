const { flatMap } = require('lodash');
const { indent } = require('../utils');
const { time } = require('./field');
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

    const getExtraFields = model => {
      const extraFields = {};
      if (model.tracked) {
        if (model.schema.updated || model.schema.created) {
          throw new Error(`models with \`tracked: true\` overwrite the \`updated\` and \`created\` columns, please remove them from the ${context} schema'`);
        }
        Object.assign(extraFields, {
          updated: time({ default: 'now' }),
          created: time({ default: 'now' }),
        });
      }
      return extraFields;
    };

    const schemaCommands = changes => ({
      updates: ['create', 'update'].reduce((memo, method) => memo.concat(writeColumnChanges(changes, method)), []),
      removes: writeColumnChanges(changes, 'remove'),
    });
    const keyCommands = changes => ({
      drops: utils.writeKeysToSQL('drop')(changes.remove),
      adds: utils.writeKeysToSQL('add')(changes.create),
    });
    return {
      directAndInverseRelations: [],
      getSchema() {
        const extraFields = getExtraFields(this);
        const fullSchema = Object.assign({}, this.schema, extraFields);
        const schema = Object.keys(fullSchema).map(name => {
          const schemaField = fullSchema[name];
          schemaField.name = schemaField.name || name;
          return utils.applySchemaDefaults(schemaField);
        });
        const error = utils.schemaValidationError(schema);
        if (error) {
          throw new Error(`invalid '${this.tableName}' table schema: ${error}`);
        }
        return schema;
      },
      compileRelation(relation) {
        const queryMethod = `include${relation.relation.name}`;
        this.directAndInverseRelations.push(relation);
        this.createQueryMethod(function() {
          this.include(relation.relation);
        }, queryMethod);
      },
      setRelations() {
        this.getSchema().filter(field => field.relation).forEach(field => {
          const relation = this.getModel(field.relation);
          relation.compileRelation({
            name: field.inverse || this.camel(field.oneToOne ? 1 : 2),
            column: field.relationColumn,
            relation: this,
            relationColumn: field.column,
            hasMany: !field.oneToOne,
          });
          this.compileRelation({
            name: field.name,
            column: field.column,
            relation,
            relationColumn: field.relationColumn,
            hasMany: false,
          });
        });
      },
      resetRelations() {
        this.directAndInverseRelations = [];
        return this;
      },
      getRelations() {
        return this.directAndInverseRelations;
      },
      getDefaultSchemaFields() {
        return this.getSchema().filter(field => field.default !== null || field.autoIncrement).map(field => field.column);
      },
      getRelationTableNames() {
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
        const schemaCmds = schemaCommands(schemaChanges);
        const dropCmds = [...schemaCmds.removes, ...keyCmds.drops];
        const modifyCmds = [...schemaCmds.updates, ...keyCmds.adds];
        const queries = [];
        if (dropCmds.length) {
          queries.push(alterSyntax(this.tableName, dropCmds));
        }
        if (modifyCmds.length) {
          queries.push(alterSyntax(this.tableName, modifyCmds));
        }
        return queries.join('\n') || null;
      },
      createTableSyntax() {
        const columns = this.getSchema().map(utils.writeSchemaToSQL);
        const keys = utils.writeKeysToSQL('init')(this.getKeys());
        const fields = [...columns, ...keys];
        return `CREATE TABLE \`${this.tableName}\` (${indent}${fields.join(`,${indent}`)}\n);`;
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
