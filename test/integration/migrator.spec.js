const { requireHelper } = require('../helper');
var seventyEight = requireHelper('seventy.eight');
const { field: { primary, int, string, boolean, json } } = seventyEight;

describe('basic schema syncTable', () => {
  var UserMigration = seventyEight.createModel({
    constructor: function UserMigration() {},
    schema: {
      id: primary(),
      name: string(),
      data: json({ required: true }),
    },
  });

  it('should create the table', done => {
    UserMigration.syncTable().then(() => {
      const user = new UserMigration({
        name: 'test',
        data: { x: 1 },
      });
      user.save().then(savedUser => {
        expect(savedUser.id).toEqual(1);
        expect(savedUser.name).toEqual('test');
        expect(savedUser.data).toEqual({ x: 1 });
        UserMigration.schema.job = string({ default: 'unemployed' });
        delete UserMigration.schema.data;
        UserMigration.syncTable().then(() => {
          const user2 = new UserMigration({
            name: 'boog',
          });
          user2.save().then(savedUser2 => {
            expect(savedUser2.id).toEqual(2);
            expect(savedUser2.name).toEqual('boog');
            expect(savedUser2.job).toEqual('unemployed');
            done();
          }, console.log);
        }).catch(console.log);
      }, console.log);
    });
  });
});

describe('complex schema syncTable', () => {
  var RoleMigration = seventyEight.createModel({
    constructor: function RoleMigration() {},
    schema: {
      id: primary(),
      name: string({ unique: true }),
      level: int({ default: 1, required: true }),
      active: boolean({ indexed: true }),
    },
  });

  it('should be idempotent', done => {
    RoleMigration.syncTable()
      .then(() => RoleMigration.syncTable())
      .then(() => RoleMigration.syncTable())
      .then(() => RoleMigration.syncTable())
      .then(() => RoleMigration.syncTable())
      .then(() => RoleMigration.syncTable())
      .then(() => RoleMigration.getSQLSchema())
      .then(({ sqlSchema, sqlKeys }) => {
        expect(sqlSchema).toEqual([{
          name: 'id',
          type: 'int',
          length: 11,
          required: true,
          default: null,
          autoIncrement: true,
          signed: false,
          primary: true,
          unique: false,
          indexed: false,
          relation: null,
          relationColumn: null,
          column: 'id',
        }, {
          name: 'name',
          type: 'string',
          length: 255,
          required: false,
          default: null,
          autoIncrement: false,
          signed: false,
          primary: false,
          unique: true,
          indexed: false,
          relation: null,
          relationColumn: null,
          column: 'name',
        }, {
          name: 'level',
          type: 'int',
          length: 11,
          required: true,
          default: 1,
          autoIncrement: false,
          signed: false,
          primary: false,
          unique: false,
          indexed: false,
          relation: null,
          relationColumn: null,
          column: 'level',
        }, {
          name: 'active',
          type: 'boolean',
          length: 1,
          required: false,
          default: null,
          autoIncrement: false,
          signed: false,
          primary: false,
          unique: false,
          indexed: true,
          relation: null,
          relationColumn: null,
          column: 'active',
        }]);
        expect(sqlKeys).toEqual([{
          name: 'PRIMARY',
          column: '`id`',
          type: 'primary',
          relation: null,
          relationColumn: null,
        }, {
          name: 'UNIQUE_NAME',
          column: '`name`',
          type: 'unique',
          relation: null,
          relationColumn: null,
        }, {
          name: 'INDEXED_ACTIVE',
          column: '`active`',
          type: 'indexed',
          relation: null,
          relationColumn: null,
        }]);
        done();
      })
      .catch(console.error);
  });
});
