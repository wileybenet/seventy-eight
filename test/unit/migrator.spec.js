const { requireHelper } = require('../helper');
var seventyEight = requireHelper('seventy.eight');
var utils = requireHelper('lib/migrator.utils');

const statements = sql => sql.trim().split(/\s+\n?\s*|\s*\n?\s+/g);

describe('schemas', () => {
  var User = seventyEight.createModel({
    constructor: function User() {},
    schema: {
      id: { type: 'int', primary: true, autoIncrement: true },
      name: { type: 'string' },
      data: { type: 'json' },
    },
  });

  let getCurrentFieldsFn = null;
  beforeEach(() => {
    getCurrentFieldsFn = User.getCurrentFields;
    User.getCurrentFields = () => Promise.resolve([
      utils.applySchemaDefaults({ name: 'id', type: 'int', primary: true, autoIncrement: true }),
      utils.applySchemaDefaults({ name: 'name', type: 'string', default: 'hello world' }),
      utils.applySchemaDefaults({ name: 'created', type: 'time', default: 'now' }),
    ]);
  });

  afterEach(() => {
    User.getCurrentFields = getCurrentFieldsFn;
  });

  it('should generate field create syntax', function(done) {
    User.createTableSyntax().then(sql => {
      expect(statements(sql)).toEqual(statements(`
        CREATE TABLE \`users\` (
          \`id\` INT(11) NOT NULL PRIMARY KEY AUTO_INCREMENT,
          \`name\` VARCHAR(255),
          \`data__json\` LONGTEXT
        )
      `));
      done();
    });
  });

  it('should generate field update syntax', function(done) {
    User.updateTableSyntax().then(sql => {
      expect(statements(sql)).toEqual(statements(`
        ALTER TABLE \`users\`
          MODIFY \`name\` VARCHAR(255),
          ADD COLUMN \`data__json\` LONGTEXT,
          DROP COLUMN \`created\`
      `));
      done();
    });
  });
});
