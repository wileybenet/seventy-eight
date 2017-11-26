// const utils = require('./migrator.utils');

const field = {
  primary(name = null) {
    return field.int({ autoIncrement: true, required: true, primary: true, signed: false }, name);
  },

  int({ length = 11, default: def = null, required = false, autoIncrement = false, signed = false, primary = false, unique = false, indexed = false } = {}, name = null) {
    return { type: 'int', length, default: def, required, autoIncrement, signed, primary, unique, indexed, name };
  },
  string({ length = 255, default: def = null, required = false, primary = false, unique = false, indexed = false } = {}, name = null) {
    return { type: 'string', length, default: def, required, primary, unique, indexed, name };
  },
  boolean({ default: def = null, indexed = null } = {}, name = null) {
    return { type: 'boolean', length: 1, default: def, indexed, name };
  },
  time({ default: def = null, required = false, unique = false, indexed = false } = {}, name = null) {
    return { type: 'time', default: def, required, unique, indexed, name };
  },
  text({ default: def = null, required = false, indexed = false } = {}, name = null) {
    return { type: 'text', default: def, required, indexed, name };
  },
  json({ default: def = null, required = false, indexed = false } = {}, name = null) {
    return { type: 'json', default: def, required, indexed, name };
  },
  relation(relation, { type = 'int', length = 11, signed = false, default: def = null, required = false } = {}, name = null) {
    return { type, length, signed, default: def, required, relation: relation.tableName, name };
  },
};

module.exports = field;
