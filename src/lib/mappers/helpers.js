exports.noopNull = () => null;

exports.noopPick = (prop, def = null) => schema => schema[prop] || def;

exports.throwError = err => {
  throw new Error(err);
};

exports.enforceType = (type, context, match = null) => value => (typeof value === type ? value : exports.throwError(`${context} must be a ${match || type} (not: \`${value}\`)`));

exports.wrap = (str, quotes) => `${quotes}${str}${quotes}`;

exports.TYPE_MAPPING = {
  int: 'INT',
  boolean: 'TINYINT',
  string: 'VARCHAR',
  time: 'TIMESTAMP',
  json: 'LONGTEXT',
  text: 'LONGTEXT',
};

exports.PRIMARY = 'primary';
exports.UNIQUE = 'unique';
exports.INDEXED = 'indexed';
exports.FOREIGN = 'foreign';
exports.CASCADE = 'CASCADE';
