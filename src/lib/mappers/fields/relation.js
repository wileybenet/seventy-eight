const { FOREIGN, noopNull, noopPick } = require('../helpers');

module.exports = {
  relation: {
    default: noopPick('relation'),
    fromSQL({ keys }) {
      const key = keys.find(k => k.type === FOREIGN) || {};
      return key.relation || null;
    },
    toSQL: noopNull,
  },
};
