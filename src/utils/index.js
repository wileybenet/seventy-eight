const _ = require('lodash');
const path = require('path');
const style = require('ansi-styles');

module.exports = {
  color: _.curry((colorName, str) => {
    if (str) {
      return style[colorName].open + str + style[colorName].close;
    }
    return '';
  }),
  modelDir: path.resolve(__dirname, '../../models'),
};
