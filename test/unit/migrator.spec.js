const { requireHelper } = require('../helper');
const seventyEight = requireHelper('seventy.eight');
const utils = requireHelper('lib/migrator.utils');
const { schema: { primary, string, time, json } } = seventyEight;

const statements = sql => sql.trim().split(/\s+\n?\s*|\s*\n?\s+/g);

describe('schemas', () => {
  const User = seventyEight.createModel({
    constructor: function User() {},
    schema: {
      id: primary(),
      name: string(),
      data: json(),
    },
  });

  let getSQLSchemaFn = null;
  let getSQLKeysFn = null;
  beforeEach(() => {
    const schema = [
      utils.applySchemaDefaults(primary('id')),
      utils.applySchemaDefaults(string({}, 'name')),
      utils.applySchemaDefaults(time({ default: 'now', indexed: true }, 'created')),
    ];
    getSQLSchemaFn = User.getSQLSchema;
    getSQLKeysFn = User.getSQLKeys;
    User.getSQLSchema = () => Promise.resolve(schema);
    User.getSQLKeys = () => Promise.resolve(utils.applyKeyDefaults(schema));
  });

  afterEach(() => {
    User.getSQLSchema = getSQLSchemaFn;
    User.getSQLKeys = getSQLKeysFn;
  });

  it('should generate field create syntax', function(done) {
    User.createTableSyntax().then(sql => {
      expect(statements(sql)).toEqual(statements(`
        CREATE TABLE \`users\` (
          \`id\` INT(11) UNSIGNED NOT NULL AUTO_INCREMENT,
          \`name\` VARCHAR(255),
          \`data__json\` LONGTEXT,

          PRIMARY KEY (\`id\`)
        )
      `));
      done();
    });
  });

  it('should generate field update syntax', function(done) {
    User.schema.name.default = 'hello world';
    User.schema.name.indexed = true;
    User.updateTableSyntax().then(sql => {
      expect(statements(sql)).toEqual(statements(`
        ALTER TABLE \`users\`
          ADD COLUMN \`data__json\` LONGTEXT,
          MODIFY \`name\` VARCHAR(255) DEFAULT 'hello world',
          DROP COLUMN \`created\`,

          ADD INDEX \`INDEXED_NAME\` (\`name\`),
          DROP INDEX \`INDEXED_CREATED\`
      `));
      done();
    });
  });
});
