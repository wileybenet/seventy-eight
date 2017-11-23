const { requireHelper } = require('../helper');
var seventyEight = requireHelper('seventy.eight');

describe('schemas', () => {
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
