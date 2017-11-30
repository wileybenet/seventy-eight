const field = {
  int({ length = 11, default: def = null, autoIncrement = false, signed = false, primary = false, unique = false, indexed = false, relation = null } = {}, name = null) {
    return { type: 'int', length, default: def, autoIncrement, signed, primary, unique, indexed, relation, name };
  },
  string({ length = 255, default: def = null, primary = false, unique = false, indexed = false, relation = null } = {}, name = null) {
    return { type: 'string', length, default: def, primary, unique, indexed, relation, name };
  },
  boolean({ default: def = null, indexed = null } = {}, name = null) {
    return { type: 'boolean', length: 1, default: def, indexed, name };
  },
  time({ default: def = null, unique = false, indexed = false } = {}, name = null) {
    return { type: 'time', default: def, unique, indexed, name };
  },
  text({ default: def = null, indexed = false } = {}, name = null) {
    return { type: 'text', default: def, indexed, name };
  },
  json({ default: def = null, indexed = false } = {}, name = null) {
    return { type: 'json', default: def, indexed, name };
  },

  primary(name = null) {
    return field.int({ autoIncrement: true, primary: true, signed: false }, name);
  },
  relation(Model, { type, length, signed, default: def, relation, relationColumn, indexed = false, sync = false } = {}, name = null) {
    const foreignField = Model.getPrimaryKeyField() || {};
    return {
      type: type || foreignField.type,
      length: length || foreignField.length,
      signed: signed || foreignField.signed,
      default: def || foreignField.default,
      relation: relation || Model.tableName,
      relationColumn: relationColumn || foreignField.column,
      indexed,
      sync,
      name,
    };
  },
};

module.exports = field;
