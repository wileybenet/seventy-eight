const { lasso, wait, statements } = require('../helpers');
const seventyEight = require('../../src/seventy.eight');
const { field: { primary, int, string, boolean, json, time, relation } } = seventyEight;

describe('schema modifiers', () => {
  const TrackedUser = seventyEight.createModel({
    constructor: function TrackedUser() {},
    schema: {
      id: primary(),
      name: string(),
    },
    tracked: true,
  });


  it('should have updated and created schema fields', lasso(async () => {
    await TrackedUser.syncTable();
    const user = await new TrackedUser({ name: 'james' }).save();
    await wait(500);
    user.name = 'ted';
    const now = user.updated;
    await user.save();
    expect(Number(user.updated)).not.toBe(now);
  }));
});

describe('basic schema syncTable', () => {
  const LeadMigration = seventyEight.createModel({
    constructor: function LeadMigration() {},
    schema: {
      id: primary(),
    },
  });
  const CopperMigration = seventyEight.createModel({
    constructor: function CopperMigration() {},
    schema: {
      id: primary(),
      lead: relation(LeadMigration, { indexed: true }),
    },
  });
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

  it('should create the table', lasso(async () => {
    await UserMigration.syncTable();
    const user = await new UserMigration({
      name: 'test',
      data: { x: 1 },
    }).save();
    expect(user.id).toEqual(1);
    expect(user.name).toEqual('test');
    expect(user.data).toEqual({ x: 1 });
    UserMigration.schema.job = string({ default: 'unemployed' });
    delete UserMigration.schema.data;
    await UserMigration.syncTable();
    const user2 = await new UserMigration({
      name: 'boog',
    }).save();
    expect(user2.id).toEqual(2);
    expect(user2.name).toEqual('boog');
    expect(user2.job).toEqual('unemployed');
  }));

  it('should add a foreign key', lasso(async () => {
    await AccountMigration.syncTable();
    await new AccountMigration().save();
    AdminMigration.schema.account = relation(AccountMigration);
    await AdminMigration.syncTable();
    const user = await new AdminMigration({
      name: 'boog',
      account: 1,
    }).save();
    expect(user.id).toEqual(1);
    expect(user.name).toEqual('boog');
    expect(user.account).toEqual(1);
  }));

  it('should replace a changed foreign key', lasso(async () => {
    await LeadMigration.syncTable();
    await CopperMigration.syncTable();
    CopperMigration.schema.lead = relation(LeadMigration, { indexed: true, sync: true });
    const migration = await CopperMigration.migrationSyntax();
    expect(statements(migration)).toEqual(statements(`
      ALTER TABLE \`copper_migrations\`
        DROP FOREIGN KEY \`FOREIGN_COPPERMIGRATION_LEAD\`;
      ALTER TABLE \`copper_migrations\`
        ADD CONSTRAINT \`FOREIGN_COPPERMIGRATION_LEAD\`
          FOREIGN KEY (\`lead\`)
          REFERENCES \`lead_migrations\` (\`id\`)
          ON DELETE CASCADE ON UPDATE CASCADE;
    `));
    await seventyEight.db.query(migration);
    const newMigration = await CopperMigration.migrationSyntax();
    expect(Boolean(newMigration)).toBe(false);
  }));
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
      data: json(),
      stage: string({ unique: 'stage_skill_idx' }),
      skill: string({ unique: 'stage_skill_idx' }),
      user: relation(UserRoleMigration, { indexed: true }),
    },
  });

  it('should be idempotent', lasso(async () => {
    await UserRoleMigration.syncTable();
    await RoleMigration.syncTable();
    await RoleMigration.syncTable();
    await RoleMigration.syncTable();
    await RoleMigration.syncTable();
    await RoleMigration.syncTable();
    await RoleMigration.syncTable();
    const { sqlSchema, sqlKeys } = await RoleMigration.getSQLSchema();
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
      oneToOne: false,
      required: true,
      keyLength: null,
      comment: {},
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
      unique: 'UNIQUE_ROLEMIGRATION_NAME',
      indexed: false,
      relation: null,
      relationColumn: null,
      oneToOne: false,
      required: false,
      keyLength: null,
      comment: {},
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
      oneToOne: false,
      required: false,
      keyLength: null,
      comment: {},
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
      indexed: 'INDEXED_ROLEMIGRATION_ACTIVE',
      relation: null,
      relationColumn: null,
      oneToOne: false,
      required: false,
      keyLength: null,
      comment: {},
      sync: false,
      column: 'active',
    }, {
      name: 'data',
      type: 'json',
      length: null,
      default: null,
      autoIncrement: false,
      signed: false,
      primary: false,
      unique: false,
      indexed: false,
      relation: null,
      relationColumn: null,
      oneToOne: false,
      required: false,
      keyLength: null,
      comment: { type: 'json' },
      sync: false,
      column: 'data',
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
      oneToOne: false,
      required: false,
      keyLength: null,
      comment: {},
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
      oneToOne: false,
      required: false,
      keyLength: null,
      comment: {},
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
      indexed: 'INDEXED_ROLEMIGRATION_USER',
      relation: 'user_role_migrations',
      relationColumn: 'id',
      oneToOne: false,
      required: false,
      keyLength: null,
      comment: {},
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
      name: 'UNIQUE_ROLEMIGRATION_NAME',
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
      name: 'INDEXED_ROLEMIGRATION_ACTIVE',
      column: '`active`',
      type: 'indexed',
      relation: null,
      relationColumn: null,
      keyLength: null,
      sync: false,
    }, {
      name: 'INDEXED_ROLEMIGRATION_USER',
      column: '`user`',
      type: 'indexed',
      relation: null,
      relationColumn: null,
      keyLength: null,
      sync: false,
    }, {
      name: 'FOREIGN_ROLEMIGRATION_USER',
      column: '`user`',
      type: 'foreign',
      relation: 'user_role_migrations',
      relationColumn: 'id',
      keyLength: null,
      sync: false,
    }]);
  }));
});
