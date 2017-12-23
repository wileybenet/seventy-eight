const { createModel, isModelSet, field: { primary, string, int, json, time } } = require('../../src/seventy.eight');

describe('initialization', () => {
  it('should throw for an invalid name', () => {
    expect(() => createModel({
      constructor: function Faulty_Schema() {},
      schema: {
        id: primary(),
      },
    })).toThrow();

    expect(() => createModel({
      constructor: function faultySchema() {},
      schema: {
        id: primary(),
      },
    })).toThrow();

    expect(() => createModel({
      constructor: function Faulty$chema() {},
      schema: {
        id: primary(),
      },
    })).toThrow();
  });

  it('should throw for missing primary key', () => {
    expect(() => createModel({
      constructor: function FaultySchema() {},
      schema: {
        name: string(),
      },
    })).toThrow();
  });

  it('should throw for a bad implementation of a query method', () => {
    const FaultyQuery = createModel({
      constructor: function FaultyQuery() {},
      schema: {
        id: primary(),
        name: string(),
      },
      query: {
        byName(name) {
          return this.where({ name });
        },
      },
    });

    expect(() => FaultyQuery.byName()).toThrow();
  });
});

describe('#json', () => {
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

describe('helpers', () => {
  const ModelHelper = createModel({
    constructor: function ModelHelper() {},
    schema: {
      id: primary(),
    },
  });

  it('should return true 1', () => {
    expect(isModelSet(new ModelHelper())).toBe(true);
  });

  it('should return true 2', () => {
    expect(isModelSet([new ModelHelper(), new ModelHelper()])).toBe(true);
  });

  it('should return false 1', () => {
    expect(isModelSet(123)).toBe(false);
  });

  it('should return false 2', () => {
    expect(isModelSet('hello world')).toBe(false);
  });

  it('should return false 3', () => {
    expect(isModelSet(null)).toBe(false);
  });

  it('should return false 4', () => {
    expect(isModelSet({})).toBe(false);
  });

  it('should return false 5', () => {
    expect(isModelSet([])).toBe(false);
  });

  it('should return false 6', () => {
    expect(isModelSet([{}, {}])).toBe(false);
  });

  it('should return false 7', () => {
    expect(isModelSet()).toBe(false);
  });
});

describe('binding', () => {
  let BoundModel = null;
  let model = null;
  const context = {
    req: {
      user: {},
    },
  };
  const ModelBinding = createModel({
    constructor: function ModelBinding() {},
    schema: {
      id: primary(),
    },
    static: {
      binder: true,
    },
    query: {
      getAllBindings() {
        this.req.user; // eslint-disable-line no-unused-expressions
      },
    },
    instance: {
      getUser() {
        return this.req.user;
      },
    },
  });

  beforeEach(() => {
    BoundModel = ModelBinding.bindToContext(context);
    model = new BoundModel();
  });

  it('should not have the context attached to the original class', () => {
    expect(ModelBinding.req).not.toBeDefined();
  });

  it('should have the context attached to the bound class', () => {
    expect(BoundModel.req.user).toEqual({});
  });

  it('should have the context attached to each instance', () => {
    expect(model.req.user).toEqual({});
  });

  it('should have the original static members', () => {
    expect(BoundModel.import).toEqual(jasmine.any(Function));
    expect(BoundModel.binder).toEqual(true);
  });

  it('should have the original query methods', () => {
    expect(BoundModel.find).toEqual(jasmine.any(Function));
    expect(BoundModel.getAllBindings()).toEqual(jasmine.any(Object));
  });

  it('should have the original instance methods', () => {
    expect(model.getUser()).toEqual({});
    expect(model.save).toEqual(jasmine.any(Function));
  });
});
