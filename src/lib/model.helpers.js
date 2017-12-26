
const getConstructor = (className, baseName) => `(
  class ${className} extends ${baseName} {
    constructor(row, found) {
      super();
      for (const key in row) {
        this[key] = row[key];
      }
      this.$tableName = tableName;
      this.$primaryKey = this.Class.$getPrimaryKey();
      if (found) {
        this.$afterFind();
        this.afterFind();
      } else {
        ModelConstructor.call(this);
      }
    }
  }
)`;

module.exports = {
  getConstructor,
};
