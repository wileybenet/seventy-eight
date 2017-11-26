
const seventyEight = require('../../src/seventy.eight');
// const utils = require('../../src/lib/migrator.utils');
const { field: { primary, string, int, time, boolean, json, text, relation } } = seventyEight;

// const statements = sql => sql.trim().split(/\s+\n?\s*|\s*\n?\s+/g);

describe('keys', () => {
  const Model = seventyEight.createModel({
    constructor: function Model() {},
  });

  it('should be type string', () => {
    expect(string().type).toEqual('string');
  });
  it('should be type boolean', () => {
    expect(boolean().type).toEqual('boolean');
  });
  it('should be type int', () => {
    expect(int().type).toEqual('int');
    expect(primary().type).toEqual('int');
    expect(relation(Model).type).toEqual('int');
  });
  it('should be type json', () => {
    expect(json().type).toEqual('json');
  });
  it('should be type text', () => {
    expect(text().type).toEqual('text');
  });
  it('should be type time', () => {
    expect(time().type).toEqual('time');
  });

});
