const { FOREIGN, noopPick, noopNull } = require('../helpers');

module.exports = {
  sync: {
    default: noopPick('sync', false),
    fromSQL({ keys }) {
      const key = keys.find(k => k.type === FOREIGN) || {};
      return key.sync || false;
    },
    toSQL: noopNull,
  },
};
