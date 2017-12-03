const seventyEight = require('../../src/seventy.eight');
const { buildFullSchema } = require('../helpers');

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
});
