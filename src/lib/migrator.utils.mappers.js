const _ = require('lodash');
const db = require('./db.client');

const noopNull = () => null;
const noop = (prop, def = null) => schema => schema[prop] || def;
const wrap = (str, quotes) => `${quotes}${str}${quotes}`;

const PRIMARY = 'primary';
const UNIQUE = 'unique';
const INDEXED = 'indexed';
const FOREIGN = 'foreign';

const CASCADE = 'CASCADE';

const typeMapping = {
  int: 'INT',
  boolean: 'TINYINT',
  string: 'VARCHAR',
  time: 'TIMESTAMP',
  json: 'LONGTEXT',
  text: 'LONGTEXT',
};

const mappers = {
  PRIMARY,
  UNIQUE,
  INDEXED,
  FOREIGN,
  fields: {
    name: {
      default: noop('name'),
      fromSQL(field) {
        const re = /__json$/;
        if (field.Field.match(re)) {
          return field.Field.replace(re, '');
        }
        return field.Field;
      },
      toSQL: noopNull,
    },
    type: {
      default: noop('type'),
      fromSQL(field) {
        try {
          return {
            int: 'int',
            tinyint: 'boolean',
            varchar: 'string',
            longtext: field.Field.match(/__json$/) ? 'json' : 'text',
            timestamp: 'time',
          }[field.Type.match(/^([^(]+)\(?/)[1]];
        } catch (err) {
          return null;
        }
      },
      toSQL(schemaField) {
        return typeMapping[schemaField.type];
      },
    },
    length: {
      default: noop('length'),
      fromSQL(field) {
        try {
          return Number(field.Type.match(/\(([^)]+)\)/)[1]);
        } catch (err) {
          return null;
        }
      },
      toSQL(schemaField) {
        return `${schemaField.length ? `(${schemaField.length})` : ''}`;
      },
    },
    // required: {
    //   default(schemaField) {
    //     if (schemaField.primary) {
    //       return true;
    //     }
    //     return schemaField.required || false;
    //   },
    //   fromSQL(field) {
    //     return field.Null === 'NO';
    //   },
    //   toSQL(schemaField) {
    //     return schemaField.required ? 'NOT NULL' : '';
    //   },
    // },
    default: {
      default(schemaField) {
        if (schemaField.autoIncrement) {
          return null;
        }
        return typeof schemaField.default === 'undefined' ? null : schemaField.default;
      },
      fromSQL(field) {
        if (mappers.fields.autoIncrement.fromSQL(field)) {
          return null;
        }
        if (field.Type === 'tinyint(1)') {
          return field.Default === null ? null : field.Default === '1';
        }
        if (field.Type.match(/^int/)) {
          return Number(field.Default);
        }
        if (field.Type === 'timestamp' && field.Default === 'CURRENT_TIMESTAMP') {
          return 'now';
        }
        return field.Default;
      },
      toSQL(schemaField) {
        const hasDefault = schemaField.default !== null;
        let defaultValue = schemaField.default;
        if (defaultValue && (schemaField.type === 'string' || schemaField.type === 'text' || schemaField.type === 'date' || schemaField.type === 'time')) {
          defaultValue = db.escapeValue(defaultValue);
        }
        if (schemaField.type === 'time' && schemaField.default === 'now') {
          defaultValue = 'CURRENT_TIMESTAMP';
        }
        if (schemaField.type === 'boolean' && schemaField.default !== null) {
          defaultValue = schemaField.default === true ? 1 : 0;
        }
        return `DEFAULT ${hasDefault ? defaultValue : 'NULL'}`;
      },
    },
    autoIncrement: {
      default: noop('autoIncrement', false),
      fromSQL(field) {
        return Boolean(field.Extra.match(/auto_increment/));
      },
      toSQL(schemaField) {
        return schemaField.autoIncrement ? 'AUTO_INCREMENT' : '';
      },
    },
    signed: {
      default: noop('signed', false),
      fromSQL(field) {
        return field.Type.match(/^int/) ? !field.Type.match(/unsigned/) : false;
      },
      toSQL(schemaField) {
        return schemaField.type === 'int' && !schemaField.signed ? 'UNSIGNED' : '';
      },
    },
    primary: {
      default: noop(PRIMARY, false),
      fromSQL({ keys: [key = {}] }) {
        return key.type === PRIMARY;
      },
      toSQL: noopNull,
    },
    unique: {
      default(schemaField) {
        if (schemaField.unique) {
          return schemaField.unique === true ? `UNIQUE_${schemaField.name.toUpperCase()}` : schemaField.unique;
        }
        return false;
      },
      fromSQL({ keys }) {
        const key = keys.find(k => k.type === UNIQUE) || {};
        return key.type === UNIQUE ? key.name : false;
      },
      toSQL: noopNull,
    },
    indexed: {
      default(schemaField) {
        if (schemaField.indexed) {
          return schemaField.indexed === true ? `INDEXED_${schemaField.name.toUpperCase()}` : schemaField.indexed;
        }
        return false;
      },
      fromSQL({ keys }) {
        const key = keys.find(k => k.type === INDEXED) || {};
        return key.type === INDEXED ? key.name : false;
      },
      toSQL: noopNull,
    },
    relation: {
      default: noop('relation'),
      fromSQL({ keys }) {
        const key = keys.find(k => k.type === FOREIGN) || {};
        return key.relation || null;
      },
      toSQL: noopNull,
    },
    relationColumn: {
      default(schemaField) {
        if (schemaField.relation) {
          return schemaField.relationColumn || 'id';
        }
        return null;
      },
      fromSQL({ keys }) {
        const key = keys.find(k => k.type === FOREIGN) || {};
        return key.relationColumn || null;
      },
      toSQL: noopNull,
    },
    sync: {
      default: noop('sync', false),
      fromSQL({ keys }) {
        const key = keys.find(k => k.type === FOREIGN) || {};
        return key.sync || false;
      },
      toSQL: noopNull,
    },
    column: {
      default(schemaField) {
        return {
          int: schemaField.name,
          boolean: schemaField.name,
          string: schemaField.name,
          time: schemaField.name,
          json: `${schemaField.name}__json`,
          text: schemaField.name,
        }[schemaField.type];
      },
      fromSQL(field) {
        return field.Field;
      },
      toSQL(schemaField) {
        return schemaField.column;
      },
    },
  },
  keys: {
    name: {
      default(schemaFields, type) {
        const name = schemaFields.map(field => field.name).join('_');
        if (type === PRIMARY) {
          return 'PRIMARY';
        }
        if (type === UNIQUE || type === INDEXED) {
          return schemaFields[0][type];
        }
        return `${type.toUpperCase()}_${name.toUpperCase()}`;
      },
      fromSQL([key]) {
        return key.KEY_NAME;
      },
    },
    column: {
      default(schemaFields) {
        return schemaFields.map(field => wrap(field.column, '`')).join(',');
      },
      fromSQL(keys) {
        return keys.map(k => `\`${k.COLUMN_NAME}\``).join(',');
      },
    },
    type: {
      default(schemaFields, type) {
        return type;
      },
      fromSQL([key]) {
        if (key.REFERENCED_TABLE_NAME) {
          return FOREIGN;
        }
        if (key.KEY_NAME === 'PRIMARY') {
          return PRIMARY;
        }
        if (key.UNIQUE) {
          return UNIQUE;
        }
        return INDEXED;
      },
      toSQL(key, method) {
        const index = `KEY \`${key.name}\` (${key.column})`;
        const foreignKey = `
          CONSTRAINT \`${key.name}\`
          FOREIGN KEY (${key.column})
          REFERENCES \`${key.relation}\` (\`${key.relationColumn}\`)
          ${mappers.keys.sync.toSQL(key)}
        `.trim();
        const dropIndex = `DROP INDEX \`${key.name}\``;
        return {
          init: {
            [PRIMARY]: `PRIMARY KEY (${key.column})`,
            [UNIQUE]: `UNIQUE ${index}`,
            [INDEXED]: `${index}`,
            [FOREIGN]: foreignKey,
          }[key.type],
          add: {
            [PRIMARY]: `ADD PRIMARY KEY (${key.column})`,
            [UNIQUE]: `ADD UNIQUE INDEX \`${key.name}\` (${key.column})`,
            [INDEXED]: `ADD INDEX \`${key.name}\` (${key.column})`,
            [FOREIGN]: `ADD ${foreignKey}`,
          }[key.type],
          drop: {
            [PRIMARY]: dropIndex,
            [UNIQUE]: dropIndex,
            [INDEXED]: dropIndex,
            [FOREIGN]: `DROP FOREIGN KEY \`${key.name}\``,
          }[key.type],
        }[method];
      },
    },
    relation: {
      default([schemaField], type) {
        return type === FOREIGN ? schemaField.relation : null;
      },
      fromSQL([key]) {
        return key.REFERENCED_TABLE_NAME || null;
      },
    },
    relationColumn: {
      default([schemaField], type) {
        if (type === FOREIGN && schemaField.relation) {
          return schemaField.relationColumn || 'id';
        }
        return null;
      },
      fromSQL([key]) {
        if (key.REFERENCED_TABLE_NAME) {
          return key.REFERENCED_COLUMN_NAME;
        }
        return null;
      },
    },
    sync: {
      default([schemaField]) {
        return (schemaField.relation && schemaField.sync) || false;
      },
      fromSQL([key]) {
        return key.UPDATE_RULE === CASCADE && key.DELETE_RULE === CASCADE;
      },
      toSQL(key) {
        return key.sync ? 'ON DELETE CASCADE ON UPDATE CASCADE' : '';
      },
    },
  },
  applyFilters: _.curry((type, objects, method, context, options = {}) => objects.reduce((memo, obj) => {
    memo[obj] = mappers[type][obj][method](context, options);
    return memo;
  }, {})),
  diff: _.curry((keys, current, next, update = true) => {
    const changes = {
      update: [],
      create: [],
      remove: [],
      noop: [],
    };
    const currentIndex = current.reduce((memo, settings) => {
      memo[settings.name] = settings;
      return memo;
    }, {});
    next.forEach(nextSettings => {
      if (currentIndex[nextSettings.name]) {
        if (mappers.identicalFields(nextSettings, currentIndex[nextSettings.name], keys)) {
          changes.noop.push(nextSettings);
          delete currentIndex[nextSettings.name];
        } else if (update) {
          changes.update.push(nextSettings);
          delete currentIndex[nextSettings.name];
        } else {
          changes.create.push(nextSettings);
        }
      } else {
        changes.create.push(nextSettings);
      }
    });
    Object.keys(currentIndex).forEach(name => {
      changes.remove.push(currentIndex[name]);
    });
    return changes;
  }),

  identicalFields(a, b, fields) {
    return fields.reduce((memo, key) => memo && a[key] === b[key], true);
  },
};

module.exports = mappers;
