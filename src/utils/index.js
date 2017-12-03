const _ = require('lodash');
const style = require('ansi-styles');

module.exports = {
  color: _.curry((colorName, str) => {
    if (str) {
      return style[colorName].open + str + style[colorName].close;
    }
    return '';
  }),
  modelDir: `${process.cwd()}/models`,
};
