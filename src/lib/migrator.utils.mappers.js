const { curry } = require('lodash');
const fieldMappers = require('./mappers/fields');
const keyMappers = require('./mappers/keys');
const { PRIMARY, INDEXED, UNIQUE, FOREIGN } = require('./mappers/helpers');

const mappers = {
  fields: fieldMappers,
  keys: keyMappers,
};

const identicalFields = (a, b, fields) => fields.reduce((memo, key) => memo && a[key] === b[key], true);

const getMappers = ({ namespace }) => {
  const trunk = { fields: fieldMappers, keys: keyMappers, namespace };
  const runMapper = (type, obj, method, context, options) => mappers[type][obj][method].call(trunk, context, options);
  return Object.assign({
    runMapper,
    applyFilters: curry((type, objects, method, context, options = {}) => objects.reduce((memo, obj) => {
      memo[obj] = runMapper(type, obj, method, context, options);
      return memo;
    }, {})),
    diff: curry((keys, current, next, update = true) => {
      const changes = {
        update: [],
        create: [],
        remove: [],
        noop: [],
      };
      const currentIndex = current.reduce((memo, settings) => {
        memo[settings.name] = settings;
        return memo;
      }, {});
      next.forEach(nextSettings => {
        if (currentIndex[nextSettings.name]) {
          if (identicalFields(nextSettings, currentIndex[nextSettings.name], keys)) {
            changes.noop.push(nextSettings);
            delete currentIndex[nextSettings.name];
          } else if (update) {
            changes.update.push(nextSettings);
            delete currentIndex[nextSettings.name];
          } else {
            changes.create.push(nextSettings);
          }
        } else {
          changes.create.push(nextSettings);
        }
      });
      Object.keys(currentIndex).forEach(name => {
        changes.remove.push(currentIndex[name]);
      });
      return changes;
    }),
  }, mappers);
};

module.exports = {
  PRIMARY,
  UNIQUE,
  INDEXED,
  FOREIGN,
  getMappers,
};
