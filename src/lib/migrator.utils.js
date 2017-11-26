const _ = require('lodash');
const mappers = require('./migrator.utils.mappers');

const schemaProps = [
  'name',
  'type',
  'length',
  'required',
  'default',
  'autoIncrement',
  'signed',
  'column',
];

const keyProps = [
  'name',
  'column',
  'type',
  'relation',
  'relationColumn',
];

const schemaKeyBinding = [
  'primary',
  'unique',
  'indexed',
  'relation',
];

const typeMapping = {
  int: 'INT',
  boolean: 'TINYINT',
  string: 'VARCHAR',
  time: 'DATETIME',
  json: 'LONGTEXT',
  text: 'LONGTEXT',
};

const applyFieldFilters = mappers.applyFilters('fields', Object.keys(mappers.fields));
const applyKeyFilters = mappers.applyFilters('keys', keyProps);

const utils = {
  schemaDiff: mappers.diff(schemaProps),
  keyDiff: mappers.diff(keyProps),

  applyKeyDefaults(schema) {
    return schema.map(schemaField => {
      if (Object.keys(schemaField).filter(key => schemaKeyBinding.includes(key)).reduce((memo, key) => memo || Boolean(schemaField[key]), false)) {
        return applyKeyFilters('default', schemaField);
      }
      return null;
    }).filter(k => k);
  },

  writeKeysToSQL(method) {
    return keys => keys.map(key => mappers.keys.type.toSQL(key, method));
  },

  // { name, column, type, foreignColumn }
  parseKeysFromSQL(indexes) {
    return _(indexes)
      .groupBy('KEY_NAME')
      .toPairs()
      .map(([, keys]) => applyKeyFilters('fromSQL', keys))
      .value();
  },

  applySchemaDefaults(schemaField) {
    return applyFieldFilters('default', schemaField);
  },

  writeSchemaToSQL(schemaField, method) {
    const field = applyFieldFilters('toSQL', schemaField);
    const config = `\`${field.column}\` ${field.type}${field.length} ${field.signed} ${field.required} ${field.autoIncrement} ${field.default}`.replace(/\s+/g, ' ').trim();
    if (method === 'create') {
      return `ADD COLUMN ${config}`;
    }
    if (method === 'remove') {
      return `DROP COLUMN \`${field.column}\``;
    }
    if (method === 'update') {
      return `MODIFY ${config}`;
    }
    return config;
  },

  parseSchemaFieldFromSQL(keys) {
    return sqlField => {
      sqlField.keys = keys.filter(key => key.column.match(`\`${sqlField.Field}\``));
      return applyFieldFilters('fromSQL', sqlField);
    };
  },

  schemaValidationError(schemaFields) {
    const validTypes = schemaFields.reduce((memo, field) => memo && Object.keys(typeMapping).includes(field.type), true);
    if (!validTypes) {
      return `invalid field type '${schemaFields.map(field => field.type).filter(type => !Object.keys(typeMapping).includes(type))[0]}'`;
    }
    // const validPrimary = schemaFields.filter(field => field.primary);
    // if (validPrimary.length !== 1) {
    //   return '1 primary field needed `field: { type: \'<type>\', primary: true }`';
    // }
    const validPrimaryUnique = schemaFields.filter(field => (field.primary && 1) + (field.unique && 1) + (field.indexed && 1) > 1);
    if (validPrimaryUnique.length > 0) {
      return 'field may only be one of [primary, unique, indexed]';
    }
    return false;
  },
};

module.exports = utils;
