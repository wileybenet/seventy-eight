const seventyEight = require('../../src/seventy.eight');
const { field: { primary, int, string, boolean, json, time, relation } } = seventyEight;

describe('basic schema syncTable', () => {
  const AccountMigration = seventyEight.createModel({
    constructor: function AccountMigration() {},
    schema: {
      id: primary(),
    },
  });
  const UserMigration = seventyEight.createModel({
    constructor: function UserMigration() {},
    schema: {
      id: primary(),
      name: string(),
      data: json(),
    },
  });
  const AdminMigration = seventyEight.createModel({
    constructor: function AdminMigration() {},
    schema: {
      id: primary(),
      name: string(),
      data: json(),
      created: time({ default: 'now' }),
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
          }, done.fail);
        }).catch(done.fail);
      }, done.fail);
    });
  });

  it('should add a foreign key', done => {
    const test = () => {
      AdminMigration.schema.account = relation(AccountMigration);
      AdminMigration.syncTable().then(() => {
        const user = new AdminMigration({
          name: 'boog',
          account: 1,
        });
        user.save().then(savedUser => {
          expect(savedUser.id).toEqual(1);
          expect(savedUser.name).toEqual('boog');
          expect(savedUser.account).toEqual(1);
          done();
        }, done.fail);
      }).catch(done.fail);
    };

    AccountMigration.syncTable().then(() => {
      new AccountMigration().save().then(test);
    }).catch(done.fail);
  });
});

describe('complex schema syncTable', () => {
  const UserRoleMigration = seventyEight.createModel({
    constructor: function UserRoleMigration() {},
    schema: {
      id: primary(),
      name: string(),
    },
  });
  const RoleMigration = seventyEight.createModel({
    constructor: function RoleMigration() {},
    schema: {
      id: primary(),
      name: string({ unique: true }),
      level: int({ default: 1 }),
      active: boolean({ indexed: true }),
      stage: string({ unique: 'stage_skill_idx' }),
      skill: string({ unique: 'stage_skill_idx' }),
      user: relation(UserRoleMigration, { indexed: true }),
    },
  });

  it('should be idempotent', done => {
    UserRoleMigration.syncTable().then(() => {
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
            default: null,
            autoIncrement: true,
            signed: false,
            primary: true,
            unique: false,
            indexed: false,
            relation: null,
            relationColumn: null,
            required: true,
            keyLength: null,
            sync: false,
            column: 'id',
          }, {
            name: 'name',
            type: 'string',
            length: 255,
            default: null,
            autoIncrement: false,
            signed: false,
            primary: false,
            unique: 'UNIQUE_NAME',
            indexed: false,
            relation: null,
            relationColumn: null,
            required: false,
            keyLength: null,
            sync: false,
            column: 'name',
          }, {
            name: 'level',
            type: 'int',
            length: 11,
            default: 1,
            autoIncrement: false,
            signed: false,
            primary: false,
            unique: false,
            indexed: false,
            relation: null,
            relationColumn: null,
            required: false,
            keyLength: null,
            sync: false,
            column: 'level',
          }, {
            name: 'active',
            type: 'boolean',
            length: 1,
            default: null,
            autoIncrement: false,
            signed: false,
            primary: false,
            unique: false,
            indexed: 'INDEXED_ACTIVE',
            relation: null,
            relationColumn: null,
            required: false,
            keyLength: null,
            sync: false,
            column: 'active',
          }, {
            name: 'stage',
            type: 'string',
            length: 255,
            default: null,
            autoIncrement: false,
            signed: false,
            primary: false,
            unique: 'stage_skill_idx',
            indexed: false,
            relation: null,
            relationColumn: null,
            required: false,
            keyLength: null,
            sync: false,
            column: 'stage',
          }, {
            name: 'skill',
            type: 'string',
            length: 255,
            default: null,
            autoIncrement: false,
            signed: false,
            primary: false,
            unique: 'stage_skill_idx',
            indexed: false,
            relation: null,
            relationColumn: null,
            required: false,
            keyLength: null,
            sync: false,
            column: 'skill',
          }, {
            name: 'user',
            type: 'int',
            length: 11,
            default: null,
            autoIncrement: false,
            signed: false,
            primary: false,
            unique: false,
            indexed: 'INDEXED_USER',
            relation: 'user_role_migrations',
            relationColumn: 'id',
            required: false,
            keyLength: null,
            sync: false,
            column: 'user',
          }]);
          expect(sqlKeys).toEqual([{
            name: 'PRIMARY',
            column: '`id`',
            type: 'primary',
            relation: null,
            relationColumn: null,
            keyLength: null,
            sync: false,
          }, {
            name: 'UNIQUE_NAME',
            column: '`name`',
            type: 'unique',
            relation: null,
            relationColumn: null,
            keyLength: null,
            sync: false,
          }, {
            name: 'stage_skill_idx',
            column: '`stage`,`skill`',
            type: 'unique',
            relation: null,
            relationColumn: null,
            keyLength: null,
            sync: false,
          }, {
            name: 'INDEXED_ACTIVE',
            column: '`active`',
            type: 'indexed',
            relation: null,
            relationColumn: null,
            keyLength: null,
            sync: false,
          }, {
            name: 'INDEXED_USER',
            column: '`user`',
            type: 'indexed',
            relation: null,
            relationColumn: null,
            keyLength: null,
            sync: false,
          }, {
            name: 'FOREIGN_USER',
            column: '`user`',
            type: 'foreign',
            relation: 'user_role_migrations',
            relationColumn: 'id',
            keyLength: null,
            sync: false,
          }]);
          done();
        })
        .catch(console.error);
    });
  });
});
