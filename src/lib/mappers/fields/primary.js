const { noopPick, noopNull, PRIMARY } = require('../helpers');

module.exports = {
  primary: {
    default: noopPick(PRIMARY, false),
    fromSQL({ keys: [key = {}] }) {
      return key.type === PRIMARY;
    },
    toSQL: noopNull,
  },
};
