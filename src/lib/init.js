const { coloredConsoleLog } = require('../utils');

const api = {
  init({ log } = {}) {
    api.log = log || api.log;
  },
  log: {
    info(msg) {
      if (process.env.NODE_ENV === 'production' && process.env.DEBUG) {
        return console.log(JSON.stringify({ service: '78', context: msg, timestamp: new Date().toJSON() }));
      }
      if (process.env.NODE_ENV !== 'cli') {
        coloredConsoleLog(msg);
      }
    },
    debug() {},
    warn() {},
    error() {},
  },
};

module.exports = api;
