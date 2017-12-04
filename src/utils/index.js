/* eslint-disable no-sync */
const path = require('path');
const fs = require('fs-extra');
const _ = require('lodash');
const style = require('ansi-styles');

const createDirIfNotExists = dir => {
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir);
  }
};

const utils = {
  color: _.curry((colorName, str) => {
    if (str) {
      return style[colorName].open + str + style[colorName].close;
    }
    return '';
  }),
  indent: '\n  ',
  modelDir: `${process.cwd()}/models`,
  migrationDir: `${process.cwd()}/migrations`,
  makeModelDir() {
    createDirIfNotExists(utils.modelDir);
  },
  makeMigrationDir() {
    createDirIfNotExists(utils.migrationDir);
  },
  getTemplate(name) {
    const modelTemplate = fs.readFileSync(path.resolve(__dirname, `../templates/${name}.tpl`)).toString();
    return options => modelTemplate.replace(/\{\{([^}]+)\}\}/g, (str, match) => options[match]);
  },
  log(clr) {
    return (...args) => console.log(utils.color(clr)(`  78`), ...args);
  },
};

module.exports = utils;
