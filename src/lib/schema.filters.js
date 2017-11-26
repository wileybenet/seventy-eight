const noop = val => val;

const pad = val => (val > 9 ? val : `0${val}`); // eslint-disable-line no-extra-parens

const toUTC = date => {
  const y = date.getUTCFullYear();
  const m = pad(date.getUTCMonth() + 1);
  const d = pad(date.getUTCDate());
  const h = pad(date.getUTCHours());
  const mm = pad(date.getUTCMinutes());
  const s = pad(date.getUTCSeconds());
  return `${y}-${m}-${d} ${h}:${mm}:${s}`;
};

module.exports = {
  filterOut(model) {
    return schemaField => {
      const fn = {
        int: () => Number(model[schemaField.column]),
        string: () => model[schemaField.column],
        time: () => new Date(model[schemaField.column]),
        boolean: () => Boolean(model[schemaField.column]),
        text: () => model[schemaField.column],
        json: () => {
          let value = {};
          try {
            value = JSON.parse(model[schemaField.column]);
          } catch (err) {} // eslint-disable-line no-empty
          delete model[schemaField.column];
          return value;
        },
      }[schemaField.type];
      model[schemaField.name] = fn();
    };
  },

  filterIn(model) {
    return schemaField => [schemaField.column, {
      int: noop,
      string: noop,
      time: toUTC,
      boolean: val => (val ? 1 : 0), // eslint-disable-line no-extra-parens
      text: noop,
      json: val => {
        delete model[schemaField.name];
        return JSON.stringify(val);
      },
    }[schemaField.type](model[schemaField.name])];
  },
};
