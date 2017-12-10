const {
  createModel,
  field: { primary },
} = require('seventy-eight');

module.exports = createModel({
  constructor: function {{modelName}}() {},
  schema: {
    id: primary(),
  },
  query: {},
  static: {},
  instance: {},
});
