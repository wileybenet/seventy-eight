const { lasso } = require('../helpers');
const seventyEight = require('../../src/seventy.eight');
const { field: { primary, string, json } } = seventyEight;

describe('bulk methods', function() {

  var BulkUser = seventyEight.createModel({
    constructor: function BulkUser() {},
    schema: {
      id: primary(),
      name: string(),
      data: json(),
    },
  });

  it('import should load records or objects', lasso(async () => {
    const bulkUsers = [
      { name: 'test1', data: { x: 1 }, faulty: true },
      { name: 'test2', data: { x: 2 } },
      { name: 'test3' },
    ];
    await BulkUser.syncTable();
    await BulkUser.import(bulkUsers);
    const users = await BulkUser.all().exec();
    expect(users.map(u => u.json())).toEqual([
      { id: 1, name: 'test1', data: { x: 1 } },
      { id: 2, name: 'test2', data: { x: 2 } },
      { id: 3, name: 'test3', data: null },
    ]);
  }));

});
