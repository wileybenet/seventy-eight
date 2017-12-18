const noop = val => val;

const pad = val => (val > 9 ? val : `0${val}`);

const toUTC = (date = null) => {
  if (!date) {
    return null;
  }
  let dateObj = date;
  if (!dateObj.getUTCFullYear) {
    dateObj = new Date(date);
  }
  const y = dateObj.getUTCFullYear();
  const m = pad(dateObj.getUTCMonth() + 1);
  const d = pad(dateObj.getUTCDate());
  const h = pad(dateObj.getUTCHours());
  const mm = pad(dateObj.getUTCMinutes());
  const s = pad(dateObj.getUTCSeconds());
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
        return val === null ? null : JSON.stringify(val);
      },
    }[schemaField.type](model[schemaField.name])];
  },


  filterJSON(model) {
    return (json, schemaField) => {
      json[schemaField.name] = {
        int: noop,
        string: noop,
        time: val => (val.toJSON ? val.toJSON() : val),
        boolean: noop,
        text: noop,
        json: noop,
      }[schemaField.type](model[schemaField.name]);
      return json;
    };
  },
};
