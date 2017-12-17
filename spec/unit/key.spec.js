
const seventyEight = require('../../src/seventy.eight');
// const utils = require('../../src/lib/migrator.utils');
const { field: { primary, string, int, time, boolean, json, text, relation } } = seventyEight;

// const statements = sql => sql.trim().split(/\s+\n?\s*|\s*\n?\s+/g);

describe('keys', () => {
  it('should be type string', () => {
    expect(string().type).toEqual('string');
  });
  it('should be type boolean', () => {
    expect(boolean().type).toEqual('boolean');
  });
  it('should be type int', () => {
    expect(int().type).toEqual('int');
    expect(primary().type).toEqual('int');
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

  describe('relation', () => {
    const Model = seventyEight.createModel({
      constructor: function Model() {},
      schema: {
        id: primary(),
      },
    });
    const ModelTwo = seventyEight.createModel({
      constructor: function ModelTwo() {},
      schema: {
        pid: string({ primary: true }),
      },
    });

    it('should set a relation defaults from foreign schema', () => {
      const foreignKey = relation(Model);
      const foreignKey2 = relation(ModelTwo);
      expect(foreignKey.relation).toEqual('models');
      expect(foreignKey.type).toEqual('int');
      expect(foreignKey.relationColumn).toEqual('id');
      expect(foreignKey2.relation).toEqual('model_twos');
      expect(foreignKey2.type).toEqual('string');
      expect(foreignKey2.relationColumn).toEqual('pid');
    });
    it('should set a relationColumn', () => {
      const foreignKey = relation(Model, { relationColumn: 'name' });
      expect(foreignKey.relationColumn).toEqual('name');
    });
  });
});
