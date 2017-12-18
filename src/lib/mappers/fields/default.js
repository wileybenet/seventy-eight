const { escapeValue } = require('../../db.client');
const { enforceType } = require('../helpers');

module.exports = {
  default: {
    default(schemaField) {
      if (schemaField.autoIncrement) {
        return null;
      }
      if (typeof schemaField.default === 'undefined' || schemaField.default === null) {
        return null;
      }
      return {
        int: enforceType('number', '`int` default'),
        string: enforceType('string', '`string` default'),
        boolean: enforceType('boolean', '`boolean` default'),
        time: enforceType('string', '`date` default', 'string'),
      }[schemaField.type](schemaField.default);
    },
    fromSQL(field) {
      if (this.fields.autoIncrement.fromSQL.call(this, field)) {
        return null;
      }
      if (field.COLUMN_TYPE === 'tinyint(1)') {
        return field.COLUMN_DEFAULT === null ? null : field.COLUMN_DEFAULT === '1';
      }
      if (field.COLUMN_TYPE.match(/^int/) && field.COLUMN_DEFAULT !== null) {
        return Number(field.COLUMN_DEFAULT);
      }
      if (field.COLUMN_TYPE === 'timestamp' && field.COLUMN_DEFAULT === 'CURRENT_TIMESTAMP') {
        return 'now';
      }
      return field.COLUMN_DEFAULT;
    },
    toSQL(schemaField) {
      const hasDefault = schemaField.default !== null;
      let defaultValue = schemaField.default;
      let noDefault = schemaField.required;
      let modifier = '';
      if (schemaField.type === 'time' && !hasDefault) {
        modifier = 'NULL';
      }
      if (schemaField.type === 'time' && schemaField.default === 'now') {
        defaultValue = 'CURRENT_TIMESTAMP';
      } else if (schemaField.type === 'boolean' && schemaField.default !== null) {
        defaultValue = schemaField.default === true ? 1 : 0;
      } else if (defaultValue && (schemaField.type === 'string' || schemaField.type === 'text' || schemaField.type === 'time')) {
        defaultValue = escapeValue(defaultValue);
      } else if (!defaultValue && (schemaField.type === 'json' || schemaField.type === 'text')) {
        noDefault = true;
      }
      return noDefault ? '' : `${modifier} DEFAULT ${hasDefault ? defaultValue : 'NULL'}`;
    },
  },
};
