/* eslint-disable no-sync */
const path = require('path');
const fs = require('fs-extra');
const _ = require('lodash');
const style = require('ansi-styles');
const error = require('./error');

const PREFIX_78 = `78`;

const createDirIfNotExists = dir => {
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir);
  }
};

const fileColors = _.curry((clr, str) => `${style[clr].open}${str}${style[clr].close}`);
const chromeColors = _.curry((clr, str) => `%${clr}#${str}%`);

const utils = {
  color: process.env.NODE_ENV === 'test' || process.env.NODE_ENV === 'cli' ? fileColors : chromeColors,
  coloredConsoleLog(str, ...args) {
    if (process.env.NODE_ENV === 'test') {
      return console.log(str, ...args);
    }
    const colors = [];
    const message = str.replace(/%([a-z-]+)#(.*?)%/g, (s, color, msg) => {
      colors.push(`color:${color};`);
      colors.push(`color:default;`);
      return `%c${msg}%c`;
    });
    console.log(message, ...colors, ...args);
  },
  indent: '\n  ',
  modelDir: `${process.cwd()}/models`,
  migrationDir: `${process.cwd()}/migrations`,
  dataDir: `${process.cwd()}/data`,
  makeModelDir() {
    createDirIfNotExists(utils.modelDir);
  },
  makeMigrationDir() {
    createDirIfNotExists(utils.migrationDir);
  },
  requireModel: name => require(`${utils.modelDir}/${name}`),
  async getAllModels() {
    const items = await fs.readdir(utils.modelDir);
    return items.filter(item => item.match(/\.js$/)).map(utils.requireModel);
  },
  getTemplate(name) {
    const modelTemplate = fs.readFileSync(path.resolve(__dirname, `../templates/${name}.tpl`)).toString();
    return options => modelTemplate.replace(/\{\{([^}]+)\}\}/g, (str, match) => options[match]);
  },
  log(clr) {
    return (...args) => console.log(`  ${utils.prefix(clr)}`, ...args);
  },
  prefix(clr) {
    return utils.color(clr)(PREFIX_78);
  },
  buildIndex(list, key) {
    return list.reduce((memo, item) => {
      memo[item[key]] = item;
      return memo;
    }, {});
  },
  inheritedProps(cls) {
    let obj = cls;
    let props = [];
    while (obj = Object.getPrototypeOf(obj)) { // eslint-disable-line no-cond-assign
      props = props.concat(Object.getOwnPropertyNames(obj));
    }
    return props;
  },
  async inSerial(items, promiser/*, asTransaction */) {
    const evaluate = async () => {
      const results = [];
      for (const item of items) {
        try {
          results.push(await promiser(item)); // eslint-disable-line no-await-in-loop
        } catch (err) {
          throw err;
        }
      }
      return results;
    };
    await evaluate();
  },
  orderByRelation(Models) {
    const modelIndex = Models.reduce((memo, Model) => {
      memo[Model.name] = Model;
      return memo;
    }, {});
    const order = Models.filter(Model => {
      if (!Model.getSchema().find(field => field.relation)) {
        delete modelIndex[Model.name];
        return true;
      }
      return false;
    });

    const addToOrderedList = Model => {
      const relations = Model.getRelationTableNames().map(Model.getModel);
      if (relations.length) {
        relations.forEach(addToOrderedList);
      }
      if (modelIndex[Model.name]) {
        delete modelIndex[Model.name];
        order.push(Model);
      }
    };
    Models.forEach(addToOrderedList);

    return order;
  },
  error,
};

module.exports = utils;
