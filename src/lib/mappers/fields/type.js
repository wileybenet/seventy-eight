const { noopPick, TYPE_MAPPING } = require('../helpers');

module.exports = {
  type: {
    default: noopPick('type'),
    fromSQL(field) {
      const { type } = this.fields.comment.fromSQL.call(this, field);
      if (type) {
        return type;
      }
      try {
        return {
          int: 'int',
          tinyint: 'boolean',
          varchar: 'string',
          longtext: 'text',
          timestamp: 'time',
        }[field.COLUMN_TYPE.match(/^([^(]+)\(?/)[1]];
      } catch (err) {
        return null;
      }
    },
    toSQL(schemaField) {
      return TYPE_MAPPING[schemaField.type];
    },
  },
};
