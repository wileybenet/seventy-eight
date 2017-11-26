
const seventyEight = require('../../src/seventy.eight');
const utils = require('../../src/lib/migrator.utils');
const { field: { primary, string, time, json, relation } } = seventyEight;

const statements = sql => sql.trim().split(/\s+\n?\s*|\s*\n?\s+/g);

describe('schemas', () => {

const Account = seventyEight.createModel({
  constructor: function Account() {},
  schema: {
    id: primary(),
  },
});
  const User = seventyEight.createModel({
    constructor: function User() {},
    schema: {
      id: primary(),
      name: string(),
      data: json(),
      account: relation(Account),
      account2: relation(Account, { sync: true }),
    },
  });

  let getSQLSchemaFn = null;
  let getSQLKeysFn = null;
  beforeEach(() => {
    const schema = [
      utils.applySchemaDefaults(primary('id')),
      utils.applySchemaDefaults(string({}, 'name')),
      utils.applySchemaDefaults(time({ default: 'now', indexed: true }, 'created')),
      utils.applySchemaDefaults(relation(Account, { required: true }, 'account')),
    ];
    getSQLSchemaFn = User.getSQLSchema;
    getSQLKeysFn = User.getSQLKeys;
    User.getSQLKeys = () => Promise.resolve(utils.applyKeyDefaults(schema));
    User.getSQLSchema = () => new Promise((resolve) => User.getSQLKeys().then(keys => resolve({ sqlSchema: schema, sqlKeys: keys })));
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
          \`account\` INT(11) UNSIGNED,
          \`account2\` INT(11) UNSIGNED,

          PRIMARY KEY (\`id\`),
          CONSTRAINT \`FOREIGN_ACCOUNT\` FOREIGN KEY (\`account\`) REFERENCES \`accounts\` (\`id\`),
          CONSTRAINT \`FOREIGN_ACCOUNT2\` FOREIGN KEY (\`account2\`) REFERENCES \`accounts\` (\`id\`) ON DELETE CASCADE ON UPDATE CASCADE
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
          ADD COLUMN \`account2\` INT(11) UNSIGNED,
          MODIFY \`name\` VARCHAR(255) DEFAULT 'hello world',
          MODIFY \`account\` INT(11) UNSIGNED,
          DROP COLUMN \`created\`,

          ADD INDEX \`INDEXED_NAME\` (\`name\`),
          ADD CONSTRAINT \`FOREIGN_ACCOUNT2\` FOREIGN KEY (\`account2\`) REFERENCES \`accounts\` (\`id\`) ON DELETE CASCADE ON UPDATE CASCADE,
          DROP INDEX \`INDEXED_CREATED\`
      `));
      done();
    });
  });
});
