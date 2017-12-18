const { noopPick, noopNull } = require('../helpers');

module.exports = {
  keyLength: {
    default: noopPick('keyLength'),
    fromSQL({ keys }) {
      const key = keys.find(k => k.keyLength) || {};
      return key.keyLength || null;
    },
    toSQL: noopNull,
  },
};
