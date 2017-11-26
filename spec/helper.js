const rewire = require('rewire');
const base = process.env.APP_DIR_FOR_CODE_COVERAGE || '../src/';

module.exports = {
  requireHelper(path) {
    return require(base + path);
  },
  rewireHelper(path) {
    return rewire(base + path);
  },
};
