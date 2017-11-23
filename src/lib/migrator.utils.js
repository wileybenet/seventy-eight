const noop = (prop, def = null) => schema => schema[prop] || def;

const typeMapping = {
  int: 'INT',
  boolean: 'TINYINT',
  string: 'VARCHAR',
  time: 'DATETIME',
  json: 'LONGTEXT',
  text: 'LONGTEXT',
};

const utils = {
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
      toSQL(schemaField) {
        let fieldName = schemaField.name;
        if (schemaField.type === 'json') {
          fieldName = `${schemaField.name}__json`;
        }
        return `\`${fieldName}\``;
      },
    },
    type: {
      mapping: typeMapping,
      default: noop('type'),
      fromSQL(field) {
        try {
          return {
            int: 'int',
            tinyint: 'boolean',
            varchar: 'string',
            longtext: field.Field.match(/__json$/) ? 'json' : 'text',
            datetime: 'time',
          }[field.Type.match(/^([^(]+)\(?/)[1]];
        } catch (err) {
          return null;
        }
      },
      toSQL(schemaField) {
        return typeMapping[schemaField.type];
      },
    },
    primary: {
      default: noop('primary', false),
      fromSQL(field) {
        return Boolean(field.Key.match(/PRI/));
      },
      toSQL(schemaField) {
        return schemaField.primary ? 'PRIMARY KEY' : '';
      },
    },
    required: {
      default: noop('required', false),
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
        if (utils.fields.autoIncrement.fromSQL(field)) {
          return null;
        }
        if (field.Type === 'tinyint(1)') {
          return field.Default === null ? null : field.Default === '1';
        }
        if (field.Type.match(/^int/)) {
          return Number(field.Default);
        }
        if (field.Type === 'datetime' && field.Default === 'CURRENT_TIMESTAMP') {
          return 'now';
        }
        return field.Default;
      },
      toSQL(schemaField) {
        const hasDefault = schemaField.default !== null;
        let defaultValue = schemaField.default;
        if (defaultValue && (schemaField.type === 'string' || schemaField.type === 'text' || schemaField.type === 'date' || schemaField.type === 'time')) {
          defaultValue = `'${defaultValue.replace(/'/g, "\\'")}'`;
        }
        if (schemaField.type === 'time' && schemaField.default === 'now') {
          defaultValue = 'CURRENT_TIMESTAMP';
        }
        if (schemaField.type === 'date' && schemaField.default === 'today') {
          defaultValue = 'GETDATE()';
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
    length: {
      default(schemaField) {
        if (schemaField.type === 'string' && !schemaField.length) {
          return 255;
        }
        if (schemaField.type === 'int' && !schemaField.length) {
          return 11;
        }
        if (schemaField.type === 'boolean') {
          return 1;
        }
        return schemaField.length || null;
      },
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
  },
  diff(current, next) {
    const currentIndex = current.reduce((memo, settings) => {
      memo[settings.name] = settings;
      return memo;
    }, {});
    const changes = {
      update: [],
      create: [],
      remove: [],
      noop: [],
    };
    next.forEach(nextSettings => {
      if (currentIndex[nextSettings.name]) {
        if (utils.identicalFields(nextSettings, currentIndex[nextSettings.name])) {
          changes.noop.push(nextSettings);
        } else {
          nextSettings.primary = null;
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
  },

  identicalFields(a, b) {
    return Object.keys(a).reduce((memo, key) => memo && a[key] === b[key], true) && Object.keys(a).length === Object.keys(b).length;
  },

  applySchemaDefaults(schemaField) {
    return Object.keys(utils.fields).reduce((memo, fieldName) => {
      memo[fieldName] = utils.fields[fieldName].default(schemaField);
      return memo;
    }, Object.assign({}, schemaField));
  },

  writeSchemaToSQL(schemaField, method = 'init') {
    const field = Object.keys(utils.fields).reduce((memo, fieldName) => {
      memo[fieldName] = utils.fields[fieldName].toSQL(schemaField);
      return memo;
    }, {});
    const config = `${field.name} ${field.type}${field.length} ${field.required} ${field.primary} ${field.autoIncrement} ${field.default}`.replace(/\s+/g, ' ').trim();
    if (method === 'create') {
      return `ADD COLUMN ${config}`;
    }
    if (method === 'remove') {
      return `DROP COLUMN ${field.name}`;
    }
    if (method === 'update') {
      return `MODIFY ${config}`;
    }
    return config;
  },

  parseFieldFromMySQL(sqlField) {
    return Object.keys(utils.fields).reduce((memo, fieldName) => {
      memo[fieldName] = utils.fields[fieldName].fromSQL(sqlField);
      return memo;
    }, {});
  },

  schemaValidationError(schemaFields) {
    const validTypes = schemaFields.reduce((memo, field) => memo && Object.keys(typeMapping).includes(field.type), true);
    if (!validTypes) {
      return `invalid field type '${schemaFields.map(field => field.type).filter(type => !Object.keys(typeMapping).includes(type))[0]}'`;
    }
    const validPrimary = schemaFields.filter(field => field.primary);
    if (validPrimary.length !== 1) {
      return '1 primary field needed `field: { type: \'<type>\', primary: true }`';
    }
    return false;
  },
};

module.exports = utils;
