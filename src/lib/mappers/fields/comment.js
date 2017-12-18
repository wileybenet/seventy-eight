const { size } = require('lodash');

module.exports = {
  comment: {
    default(schemaField) {
      const comment = {};
      if (schemaField.type === 'json') {
        comment.type = 'json';
      }
      if (schemaField.oneToOne) {
        comment.oneToOne = schemaField.oneToOne;
      }
      if (schemaField.inverse) {
        comment.inverse = schemaField.inverse;
      }
      return comment;
    },
    fromSQL(field) {
      const comment = field.COLUMN_COMMENT;
      if (comment) {
        return comment.split('|').reduce((memo, pair) => {
          const [k, v] = pair.split(':');
          if (v) {
            memo[k] = v;
          } else {
            memo[k] = true;
          }
          return memo;
        }, {});
      }
      return {};
    },
    toSQL(schemaField) {
      if (size(schemaField.comment)) {
        const comment = Object.keys(schemaField.comment).map(k => {
          if (schemaField.comment[k] === true) {
            return k;
          }
          return `${k}:${schemaField.comment[k]}`;
        }).join('|');
        return `COMMENT '${comment}'`;
      }
      return '';
    },
  },
};
