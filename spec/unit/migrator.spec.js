const { lasso } = require('../helpers');
const seventyEight = require('../../src/seventy.eight');
const utils = require('../../src/lib/migrator.utils').getUtils({ namespace: 'User' });
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
      data: json({ indexed: true, keyLength: 5 }),
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
    User.getSQLKeys = () => utils.applyKeyDefaults(schema);
    User.getSQLSchema = async () => {
      const keys = await User.getSQLKeys();
      return { sqlSchema: schema, sqlKeys: keys };
    };
  });

  afterEach(() => {
    User.getSQLSchema = getSQLSchemaFn;
    User.getSQLKeys = getSQLKeysFn;
  });

  it('should generate field create syntax', lasso(async () => {
    const sql = await User.createTableSyntax();
    expect(statements(sql)).toEqual(statements(`
      CREATE TABLE \`users\` (
        \`id\` INT(11) UNSIGNED NOT NULL AUTO_INCREMENT,
        \`name\` VARCHAR(255) NULL DEFAULT NULL,
        \`data__json\` LONGTEXT NULL,
        \`account\` INT(11) UNSIGNED NULL DEFAULT NULL,
        \`account2\` INT(11) UNSIGNED NULL DEFAULT NULL,

        PRIMARY KEY (\`id\`),
        KEY \`INDEXED_USER_DATA\` (\`data__json\`(5)),
        CONSTRAINT \`FOREIGN_USER_ACCOUNT\` FOREIGN KEY (\`account\`) REFERENCES \`accounts\` (\`id\`),
        CONSTRAINT \`FOREIGN_USER_ACCOUNT2\` FOREIGN KEY (\`account2\`) REFERENCES \`accounts\` (\`id\`) ON DELETE CASCADE ON UPDATE CASCADE
      )
    `));
  }));

  it('should generate field update syntax', lasso(async () => {
    User.schema.name.default = 'hello world';
    User.schema.name.indexed = true;
    const sql = await User.updateTableSyntax();
    expect(statements(sql)).toEqual(statements(`
      ALTER TABLE \`users\`
        ADD COLUMN \`data__json\` LONGTEXT NULL,
        ADD COLUMN \`account2\` INT(11) UNSIGNED NULL DEFAULT NULL,
        MODIFY \`name\` VARCHAR(255) NULL DEFAULT 'hello world',
        DROP COLUMN \`created\`,
        DROP INDEX \`INDEXED_USER_CREATED\`;

      ALTER TABLE \`users\`
        ADD INDEX \`INDEXED_USER_NAME\` (\`name\`),
        ADD INDEX \`INDEXED_USER_DATA\` (\`data__json\`),
        ADD CONSTRAINT \`FOREIGN_USER_ACCOUNT2\`
          FOREIGN KEY (\`account2\`)
          REFERENCES \`accounts\` (\`id\`)
          ON DELETE CASCADE ON UPDATE CASCADE;
    `));
  }));
});
