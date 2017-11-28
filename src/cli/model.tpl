const seventyEight = require('seventy-eight');
const { fields: { primary } } = seventyEight;

module.exports = seventyEight.createModel({
  constructor: function {{modelName}}() {},
  schema: {
    id: primary(),
  },
});
