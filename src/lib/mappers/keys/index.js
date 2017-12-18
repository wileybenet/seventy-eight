const { indent } = require('../../../utils');
const { PRIMARY, INDEXED, UNIQUE, FOREIGN, CASCADE, wrap } = require('../helpers');

module.exports = {
  name: {
    default(schemaFields, type) {
      const name = schemaFields.map(field => field.name).join('_');
      if (type === PRIMARY) {
        return 'PRIMARY';
      }
      if (type === UNIQUE || type === INDEXED) {
        return schemaFields[0][type];
      }
      return `${type.toUpperCase()}_${this.namespace.toUpperCase()}_${name.toUpperCase()}`;
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
  keyLength: {
    default([schemaField]) {
      return schemaField.keyLength || null;
    },
    fromSQL([key]) {
      return Number(key.LENGTH) || null;
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
      const index = `KEY \`${key.name}\` (${key.column}${key.keyLength ? `(${key.keyLength})` : ''})`;
      const foreignKey =
       `CONSTRAINT \`${key.name}\`
        FOREIGN KEY (${key.column})
        REFERENCES \`${key.relation}\` (\`${key.relationColumn}\`)
        ${this.keys.sync.toSQL.call(this, key)}
       `.replace(/\n\s*/g, `${indent}  `).trim();
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
    default([schemaField], type) {
      return (type === FOREIGN && schemaField.sync) || false;
    },
    fromSQL([key]) {
      return key.UPDATE_RULE === CASCADE && key.DELETE_RULE === CASCADE;
    },
    toSQL(key) {
      return key.sync ? 'ON DELETE CASCADE ON UPDATE CASCADE' : '';
    },
  },
};
