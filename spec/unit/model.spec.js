const { createModel, field: { primary, string, int, json, time } } = require('../../src/seventy.eight');

describe('#json', function() {
  let jsonData = null;

  const Json = createModel({
    constructor: function Json() {},
    schema: {
      id: primary(),
      name: string(),
      age: int(),
      data: json(),
      made: time(),
    },
  });

  beforeEach(() => {
    jsonData = new Json({
      name: 'test',
      age: 30,
      data: { x: 10 },
      made: new Date('2012-04-23T18:25:43.511Z'),
    }).json();
  });

  it('should format strings for json', function() {
    expect(jsonData.name).toEqual('test');
  });

  it('should format ints for json', function() {
    expect(jsonData.age).toEqual(30);
  });

  it('should format objects for json', function() {
    expect(jsonData.data).toEqual({ x: 10 });
  });

  it('should format time for json', function() {
    expect(jsonData.made).toEqual('2012-04-23T18:25:43.511Z');
  });
});
