
const seventyEight = require('../../src/seventy.eight');
const utils = require('../../src/lib/migrator.utils');
const { statements } = require('../helpers');
const { field: { primary, string, time, json, relation } } = seventyEight;

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
      data: json({ indexed: true }),
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
          \`name\` VARCHAR(255) DEFAULT NULL,
          \`data__json\` LONGTEXT DEFAULT NULL,
          \`account\` INT(11) UNSIGNED DEFAULT NULL,
          \`account2\` INT(11) UNSIGNED DEFAULT NULL,

          PRIMARY KEY (\`id\`),
          KEY \`INDEXED_DATA\` (\`data__json\`),
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
          ADD COLUMN \`data__json\` LONGTEXT DEFAULT NULL,
          ADD COLUMN \`account2\` INT(11) UNSIGNED DEFAULT NULL,
          MODIFY \`name\` VARCHAR(255) DEFAULT 'hello world',
          DROP COLUMN \`created\`,

          DROP INDEX \`INDEXED_CREATED\`,
          ADD INDEX \`INDEXED_NAME\` (\`name\`),
          ADD INDEX \`INDEXED_DATA\` (\`data__json\`),
          ADD CONSTRAINT \`FOREIGN_ACCOUNT2\` FOREIGN KEY (\`account2\`) REFERENCES \`accounts\` (\`id\`) ON DELETE CASCADE ON UPDATE CASCADE
      `));
      done();
    });
  });
});
