module.exports = {
  schemaQuery(table) {
    return `DESCRIBE \`${table}\``;
  },
  keyQuery(table) {
    return `
      SELECT
        COLUMN_NAME,
        INDEX_NAME AS 'KEY_NAME',
        IF(NON_UNIQUE, 0, 1) AS 'UNIQUE'
      FROM
        INFORMATION_SCHEMA.STATISTICS
      WHERE
        INFORMATION_SCHEMA.STATISTICS.TABLE_SCHEMA = '${process.env.DB_SCHEMA}' AND
        INFORMATION_SCHEMA.STATISTICS.TABLE_NAME = '${table}';

      SELECT
        COLUMN_NAME,
        CONSTRAINT_NAME AS 'KEY_NAME',
        REFERENCED_TABLE_NAME,
        REFERENCED_COLUMN_NAME
      FROM
        INFORMATION_SCHEMA.KEY_COLUMN_USAGE
      WHERE
        INFORMATION_SCHEMA.KEY_COLUMN_USAGE.TABLE_SCHEMA = '${process.env.DB_SCHEMA}' AND
        INFORMATION_SCHEMA.KEY_COLUMN_USAGE.TABLE_NAME = '${table}' AND
        REFERENCED_TABLE_NAME IS NOT NULL;
    `;
  },
};
