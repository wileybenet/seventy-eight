const seventyEight = require('seventy-eight');
const { field: { primary } } = seventyEight;

module.exports = seventyEight.createModel({
  constructor: function {{modelName}}() {},
  schema: {
    id: primary(),
  },
  query: {},
  static: {},
  instance: {},
});
