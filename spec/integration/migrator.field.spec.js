const { lasso } = require('../helpers');
const seventyEight = require('../../src/index');
const { field: { primary, int, string, boolean } } = seventyEight;
const { statements, buildFullSchema } = require('../helpers');

describe('syncTable -> updateTable', () => {
  it('should not produce any updates when schema has not changed', lasso(async () => {
    const schema = await buildFullSchema();
    const DocMigration = seventyEight.createModel({
      constructor: function DocMigration() {},
      schema,
    });
    let updated = null;
    updated = await DocMigration.syncTable();
    expect(updated).toEqual(true);
    updated = await DocMigration.syncTable();
    expect(updated).toEqual(false);
  }));

  it('should produce migration syntax for table updates', lasso(async () => {
    const Grif = seventyEight.createModel({
      constructor: function Grif() {},
      schema: {
        id: primary(),
        name: string(),
        age: int(),
      },
    });

    await Grif.syncTable();
    Grif.schema.active = boolean({ default: false });
    Grif.schema.name = string({ length: 36 });
    delete Grif.schema.age;
    const migration = await Grif.migrationSyntax();
    expect(statements(migration)).toEqual(statements(`
      ALTER TABLE \`grifs\`
        DROP COLUMN \`age\`;
      ALTER TABLE \`grifs\`
        ADD COLUMN \`active\` TINYINT(1) NULL DEFAULT 0,
        MODIFY \`name\` VARCHAR(36) NULL DEFAULT NULL;
    `));
  }));
});
