const seventyEight = require('../../src/seventy.eight');
const { field: { primary, int, string, boolean } } = seventyEight;
const { statements, buildFullSchema } = require('../helpers');

describe('syncTable -> updateTable', () => {
  it('should not produce any updates when schema has not changed', done => {
    buildFullSchema().then(schema => {
      const DocMigration = seventyEight.createModel({
        constructor: function DocMigration() {},
        schema,
      });
      DocMigration.syncTable()
        .then(updated => {
          expect(updated).toEqual(true);
          return DocMigration.syncTable();
        })
        .then(updated => {
          expect(updated).toEqual(false);
          done();
        })
        .catch(done.fail);
    });
  });

  it('should produce migration syntax for table updates', done => {
    const Grif = seventyEight.createModel({
      constructor: function Grif() {},
      schema: {
        id: primary(),
        name: string(),
        age: int(),
      },
    });

    Grif.syncTable().then(() => {
      Grif.schema.active = boolean({ default: false });
      Grif.schema.name = string({ length: 36 });
      delete Grif.schema.age;
      Grif.migrationSyntax().then(migration => {
        expect(statements(migration)).toEqual(statements(`
          ALTER TABLE \`grifs\`
            ADD COLUMN \`active\` TINYINT(1) DEFAULT 0,
            MODIFY \`name\` VARCHAR(36) DEFAULT NULL,
            DROP COLUMN \`age\`
        `));
        done();
      });
    });
  });
});
