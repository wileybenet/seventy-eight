const _ = require('lodash');
const db = require('./db.client');
const noopNull = () => null;
const noop = (prop, def = null) => schema => schema[prop] || def;

const typeMapping = {
  int: 'INT',
  boolean: 'TINYINT',
  string: 'VARCHAR',
  time: 'TIMESTAMP',
  json: 'LONGTEXT',
  text: 'LONGTEXT',
};

const mappers = {
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
    required: {
      default(schemaField) {
        if (schemaField.primary) {
          return true;
        }
        return schemaField.required || false;
      },
      fromSQL(field) {
        return field.Null === 'NO';
      },
      toSQL(schemaField) {
        return schemaField.required ? 'NOT NULL' : '';
      },
    },
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
        return hasDefault ? `DEFAULT ${defaultValue}` : '';
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
      default: noop('primary', false),
      fromSQL({ keys: [key = {}] }) {
        return key.type === 'primary';
      },
      toSQL: noopNull,
    },
    unique: {
      default: noop('unique', false),
      fromSQL({ keys: [key = {}] }) {
        return key.type === 'unique';
      },
      toSQL: noopNull,
    },
    indexed: {
      default: noop('indexed', false),
      fromSQL({ keys: [key = {}] }) {
        return key.type === 'indexed';
      },
      toSQL: noopNull,
    },
    relation: {
      default: noop('relation'),
      fromSQL({ keys: [key = {}] }) {
        if (key.type === 'foreign') {
          return key.relation;
        }
        return null;
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
      fromSQL({ keys: [key = {}] }) {
        if (key.type === 'foreign') {
          return key.relationColumn;
        }
        return null;
      },
      toSQL: noopNull,
    },
    sync: {
      default: noop('sync', false),
      fromSQL({ keys: [key = {}] }) {
        if (key.type === 'foreign') {
          return key.sync;
        }
        return false;
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
      default(schemaField) {
        const type = mappers.keys.type.default(schemaField);
        if (type === 'primary') {
          return 'PRIMARY';
        }
        return `${type.toUpperCase()}_${schemaField.name.toUpperCase()}`;
      },
      fromSQL([key]) {
        return key.KEY_NAME;
      },
    },
    column: {
      default(schemaField) {
        return `\`${schemaField.column}\``;
      },
      fromSQL(keys) {
        return keys.map(k => `\`${k.COLUMN_NAME}\``).join(',');
      },
    },
    type: {
      default(schemaField) {
        if (schemaField.relation) {
          return 'foreign';
        }
        if (schemaField.unique) {
          return 'unique';
        }
        if (schemaField.primary) {
          return 'primary';
        }
        if (schemaField.indexed) {
          return 'indexed';
        }
      },
      fromSQL([key]) {
        if (key.REFERENCED_TABLE_NAME) {
          return 'foreign';
        }
        if (key.KEY_NAME === 'PRIMARY') {
          return 'primary';
        }
        if (key.UNIQUE) {
          return 'unique';
        }
        return 'indexed';
      },
      // PRIMARY KEY (`id`),
      // UNIQUE KEY `user` (`user`,`library`),
      // KEY `library` (`library`),
      // CONSTRAINT `user_libraries_ibfk_1` FOREIGN KEY (`user`) REFERENCES `users` (`id`) ON DELETE CASCADE ON UPDATE CASCADE,
      // CONSTRAINT `user_libraries_ibfk_2` FOREIGN KEY (`library`) REFERENCES `libraries` (`id`) ON DELETE CASCADE ON UPDATE CASCADE

      // ALTER TABLE `roles
      //   ADD FOREIGN KEY (`library`) REFERENCES `libraries` (`id`) ON DELETE CASCADE ON UPDATE CASCADE;
      // ALTER TABLE `roles`
      //   ADD PRIMARY KEY (`name`);
      // ALTER TABLE `user_libraries`
      //   ADD UNIQUE INDEX (`user`, `library`);
      // ALTER TABLE `user_libraries`
      //   ADD INDEX (`user`);


      // ALTER TABLE `roles
      //   DROP INDEX `name`;
      // ALTER TABLE `user_libraries`
      //   DROP FOREIGN KEY `user_libraries_ibfk_2`;
      toSQL(key, method) {
        const index = `KEY \`${key.name}\` (${key.column})`;
        // ON DELETE CASCADE ON UPDATE CASCADE
        const foreignKey = `
          CONSTRAINT \`${key.name}\`
          FOREIGN KEY (${key.column})
          REFERENCES \`${key.relation}\` (\`${key.relationColumn}\`)
          ${mappers.keys.sync.toSQL(key)}
        `.trim();
        const dropIndex = `DROP INDEX \`${key.name}\``;
        return {
          init: {
            primary: `PRIMARY KEY (${key.column})`,
            unique: `UNIQUE ${index}`,
            indexed: `${index}`,
            foreign: foreignKey,
          }[key.type],
          add: {
            primary: `ADD PRIMARY KEY (${key.column})`,
            unique: `ADD UNIQUE INDEX \`${key.name}\` (${key.column})`,
            indexed: `ADD INDEX \`${key.name}\` (${key.column})`,
            foreign: `ADD ${foreignKey}`,
          }[key.type],
          drop: {
            primary: dropIndex,
            unique: dropIndex,
            indexed: dropIndex,
            foreign: `DROP FOREIGN KEY \`${key.name}\``,
          }[key.type],
        }[method];
      },
    },
    relation: {
      default(schemaField) {
        return schemaField.relation || null;
      },
      fromSQL([key]) {
        return key.REFERENCED_TABLE_NAME || null;
      },
    },
    relationColumn: {
      default(schemaField) {
        if (schemaField.relation) {
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
      default: noop('sync', false),
      fromSQL([key]) {
        return key.UPDATE_RULE === key.DELETE_RULE === 'CASCADE';
      },
      toSQL(key) {
        return key.sync ? 'ON DELETE CASCADE ON UPDATE CASCADE' : '';
      },
    },
  },
  applyFilters: _.curry((type, objects, method, context) => objects.reduce((memo, obj) => {
    memo[obj] = mappers[type][obj][method](context);
    return memo;
  }, {})),
  diff: _.curry((keys, current, next) => {
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
        } else {
          changes.update.push(nextSettings);
        }
        delete currentIndex[nextSettings.name];
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
