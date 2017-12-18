// const { field: { primary, string, time } } = require('../../src/seventy.eight');
const _ = require('lodash');
const { getMappers } = require('../../src/lib/migrator.utils.mappers');

const namespace = 'Mouse';
const mappers = getMappers({ namespace });
const { keys } = mappers;

const testCase = _.curry((method, prop, cases) => {
  cases.forEach(([context, result, key], index) => {
    it(`should return ${method} ${prop} (case: ${index + 1})`, () => {
      expect(keys[prop][method].call({ keys, namespace }, context, key)).toEqual(result);
    });
  });
});

describe('schemas', () => {

});

describe('keys', () => {

  describe('defaults', () => {
    const singleFields = [{ name: 'user', column: 'user_data', relation: 'users', relationColumn: 'id', sync: true, unique: 'custom_unique', indexed: 'custom_index' }];
    const multiFields = [{ name: 'user', column: 'user_data', indexed: 'INDEXED_MOUSE_USER_ACCOUNT', unique: 'unique_user_account' }, { name: 'account', column: 'account_data' }];
    const defaultCase = testCase('default');

    defaultCase('name')([
      [singleFields, 'PRIMARY', 'primary'],
      [singleFields, 'custom_index', 'indexed'],
      [singleFields, 'custom_unique', 'unique'],
      [singleFields, 'FOREIGN_MOUSE_USER', 'foreign'],
      [multiFields, 'PRIMARY', 'primary'],
      [multiFields, 'INDEXED_MOUSE_USER_ACCOUNT', 'indexed'],
      [multiFields, 'unique_user_account', 'unique'],
      [multiFields, 'FOREIGN_MOUSE_USER_ACCOUNT', 'foreign'],
    ]);

    defaultCase('column')([
      [singleFields, '`user_data`', 'primary'],
      [singleFields, '`user_data`', 'indexed'],
      [singleFields, '`user_data`', 'unique'],
      [singleFields, '`user_data`', 'foreign'],
      [multiFields, '`user_data`,`account_data`', 'unique'],
      [multiFields, '`user_data`,`account_data`', 'indexed'],
    ]);

    defaultCase('type')([
      [singleFields, 'primary', 'primary'],
      [singleFields, 'indexed', 'indexed'],
      [singleFields, 'unique', 'unique'],
      [singleFields, 'foreign', 'foreign'],
      [multiFields, 'unique', 'unique'],
      [multiFields, 'indexed', 'indexed'],
    ]);


    defaultCase('relation')([
      [singleFields, null, 'primary'],
      [singleFields, null, 'indexed'],
      [singleFields, null, 'unique'],
      [singleFields, 'users', 'foreign'],
      [multiFields, null, 'unique'],
      [multiFields, null, 'indexed'],
    ]);

    defaultCase('relationColumn')([
      [singleFields, null, 'primary'],
      [singleFields, null, 'indexed'],
      [singleFields, null, 'unique'],
      [singleFields, 'id', 'foreign'],
      [multiFields, null, 'unique'],
      [multiFields, null, 'indexed'],
    ]);

    defaultCase('sync')([
      [singleFields, false, 'primary'],
      [singleFields, false, 'indexed'],
      [singleFields, false, 'unique'],
      [singleFields, true, 'foreign'],
      [multiFields, false, 'unique'],
      [multiFields, false, 'indexed'],
    ]);
  });

  describe('fromSQL', () => {
    const e = config => Object.assign({
      COLUMN_NAME: null,
      KEY_NAME: null,
      UNIQUE: 0,
      REFERENCED_TABLE_NAME: null,
      REFERENCED_COLUMN_NAME: null,
      UPDATE_RULE: null,
      DELETE_RULE: null,
    }, config);
    const primary = [e({ COLUMN_NAME: 'id', KEY_NAME: 'PRIMARY' })];
    const unique = [e({ COLUMN_NAME: 'user', KEY_NAME: 'UNIQUE_MOUSE_USER', UNIQUE: 1 })];
    const unique2 = [
      e({ COLUMN_NAME: 'user', KEY_NAME: 'UNIQUE_MOUSE_USER_ACCOUNT', UNIQUE: 1 }),
      e({ COLUMN_NAME: 'account', KEY_NAME: 'UNIQUE_MOUSE_USER_ACCOUNT', UNIQUE: 1 }),
    ];
    const indexed = [e({ COLUMN_NAME: 'user', KEY_NAME: 'INDEXED_MOUSE_USER' })];
    const indexed2 = [
      e({ COLUMN_NAME: 'user', KEY_NAME: 'INDEXED_MOUSE_USER_ACCOUNT' }),
      e({ COLUMN_NAME: 'account', KEY_NAME: 'INDEXED_MOUSE_USER_ACCOUNT' }),
    ];
    const foreign = [e({
      COLUMN_NAME: 'user',
      KEY_NAME: 'FOREIGN_MOUSE_USER',
      REFERENCED_TABLE_NAME: 'users',
      REFERENCED_COLUMN_NAME: 'id',
      UPDATE_RULE: 'CASCADE',
      DELETE_RULE: 'CASCADE',
    })];
    const fromSQLCase = testCase('fromSQL');

    fromSQLCase('name')([
      [primary, 'PRIMARY'],
      [unique, 'UNIQUE_MOUSE_USER'],
      [unique2, 'UNIQUE_MOUSE_USER_ACCOUNT'],
      [indexed, 'INDEXED_MOUSE_USER'],
      [indexed2, 'INDEXED_MOUSE_USER_ACCOUNT'],
      [foreign, 'FOREIGN_MOUSE_USER'],
    ]);

    fromSQLCase('column')([
      [primary, '`id`'],
      [unique, '`user`'],
      [unique2, '`user`,`account`'],
      [indexed, '`user`'],
      [indexed2, '`user`,`account`'],
      [foreign, '`user`'],
    ]);

    fromSQLCase('type')([
      [primary, 'primary'],
      [unique, 'unique'],
      [unique2, 'unique'],
      [indexed, 'indexed'],
      [indexed2, 'indexed'],
      [foreign, 'foreign'],
    ]);


    fromSQLCase('relation')([
      [primary, null],
      [unique, null],
      [unique2, null],
      [indexed, null],
      [indexed2, null],
      [foreign, 'users'],
    ]);

    fromSQLCase('relationColumn')([
      [primary, null],
      [unique, null],
      [unique2, null],
      [indexed, null],
      [indexed2, null],
      [foreign, 'id'],
    ]);

    fromSQLCase('sync')([
      [primary, false],
      [unique, false],
      [unique2, false],
      [indexed, false],
      [indexed2, false],
      [foreign, true],
    ]);
  });
});
