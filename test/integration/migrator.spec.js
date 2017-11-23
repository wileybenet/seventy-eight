const { requireHelper } = require('../helper');
var seventyEight = requireHelper('seventy.eight');

describe('basic schema syncTable', () => {
  var UserMigration = seventyEight.createModel({
    constructor: function UserMigration() {},
    schema: {
      id: { type: 'int', primary: true, autoIncrement: true },
      name: { type: 'string' },
      data: { type: 'json', required: true },
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

        UserMigration.schema.job = { type: 'string', default: 'unemployed' };
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
          });
        });
      });
    });
  });
});

describe('complex schema syncTable', () => {
  var RoleMigration = seventyEight.createModel({
    constructor: function RoleMigration() {},
    schema: {
      id: { type: 'int', primary: true, autoIncrement: true },
      name: { type: 'string' },
      level: { type: 'int', default: 1, required: true },
      active: { type: 'boolean' },
    },
  });

  it('should be idempotent', done => {
    RoleMigration.syncTable()
      .then(() => RoleMigration.syncTable())
      .then(() => RoleMigration.syncTable())
      .then(() => RoleMigration.syncTable())
      .then(() => RoleMigration.syncTable())
      .then(() => RoleMigration.syncTable())
      .then(() => RoleMigration.getCurrentFields())
      .then(fields => {
        expect(fields).toEqual([
          {
            name: 'id',
            type: 'int',
            primary: true,
            required: true,
            default: null,
            autoIncrement: true,
            length: 11,
          },
          {
            name: 'name',
            type: 'string',
            primary: false,
            required: false,
            default: null,
            autoIncrement: false,
            length: 255,
          },
          {
            name: 'level',
            type: 'int',
            primary: false,
            required: true,
            default: 1,
            autoIncrement: false,
            length: 11,
          },
          {
            name: 'active',
            type: 'boolean',
            primary: false,
            required: false,
            default: null,
            autoIncrement: false,
            length: 1,
          },
        ]);
        done();
      })
      .catch(err => {
        throw err;
      });
  });
});
