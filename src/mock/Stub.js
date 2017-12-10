const { NotImplementedError } = require('../utils/error');
const UNSET = '__UNSET__';

const effects = function(context, action) {
  return {
    returns(value) {
      context.actions[action] = () => value;
    },
    throws(error, msg = 'mocked error throw') {
      context.actions[action] = () => {
        throw new error(msg);
      };
    },
  };
};

class Stub {
  constructor(name, methods = []) {
    this.name = name;
    this.actions = {};
    methods.forEach(method => {
      this[method] = effects(this, method);
    });
  }

  _process(method, dflt = UNSET) {
    if (this.actions.hasOwnProperty(method)) {
      return this.actions[method]();
    }
    if (dflt !== UNSET) {
      return dflt;
    }
    throw new NotImplementedError(`${this.name} mocking incomplete, please define an effect for '${method}'`);
  }
}

module.exports = Stub;
