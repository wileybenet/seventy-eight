const _ = require('lodash');
const style = require('ansi-styles');

module.exports = {
  color: _.curry((colorName, str) => {
    if (str) {
      return style[colorName].open + str + style[colorName].close;
    }
    return '';
  }),
  indent: '\n  ',
  modelDir: `${process.cwd()}/models`,
  migrationDir: `${process.cwd()}/migrations`,
};
