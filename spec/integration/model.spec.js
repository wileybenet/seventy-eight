const { lasso } = require('../helpers');
const seventyEight = require('../../src/seventy.eight');
const { buildIndex } = require('../../src/utils');
const { db: { query }, field: { primary, int, string, relation } } = seventyEight;

describe('relationships', () => {
  const Parent = seventyEight.createModel({
    constructor: function Parent() {},
    schema: {
      id: primary(),
      name: string(),
      age: int(),
    },
  });

  const Child = seventyEight.createModel({
    constructor: function Child() {},
    schema: {
      id: primary(),
      name: string(),
      age: int(),
      parent: relation(Parent),
    },
  });

  beforeEach(lasso(async () => {
    await Parent.syncTable();
    await Child.syncTable();
    const tom = await new Parent({ name: 'tom', age: 60 }).save();
    await new Child({ name: 'danny', age: 5, parent: tom.id }).save();
    await new Child({ name: 'joe', age: 8, parent: tom.id }).save();
  }));

  afterEach(lasso(async () => {
    await query('DROP TABLE children');
    await query('DROP TABLE parents');
  }));

  it('should load the related models manually', lasso(async () => {
    const parents = await Parent.all().exec();
    const children = await Child.all().exec();
    const parentIndex = buildIndex(parents, 'id');

    children.forEach(child => {
      child.parent = parentIndex[child.parent];
      if (child.parent) {
        child.parent.children = child.parent.children || [];
        child.parent.children.push(child);
      }
    });
    const joe = children.find(c => c.name === 'joe');
    const tom = parents.find(p => p.name === 'tom');
    expect(tom.children.reduce((a, b) => a.age + b.age)).toEqual(13);
    expect(joe.parent.age).toEqual(60);
  }));

  it('should load the directly related models automatically', lasso(async () => {
    const children = await Child.include('parents').exec();
    const joe = children.find(c => c.name === 'joe');
    expect(joe.parent.age).toEqual(60);
  }));

  it('should load the inverse related models automatically', lasso(async () => {
    const parents = await Parent.include('children').exec();
    const [tom] = parents;
    expect(tom.children.reduce((a, b) => a.age + b.age)).toEqual(13);
  }));
});

describe('complex relationships', () => {
  const Hub = seventyEight.createModel({
    constructor: function Hub() {},
    schema: {
      id: primary(),
      name: string(),
    },
  });

  const Conduit = seventyEight.createModel({
    constructor: function Conduit() {},
    schema: {
      id: primary(),
      start: relation(Hub, { hasSiblings: true }),
      end: relation(Hub, { hasSiblings: true }),
    },
  });

  beforeEach(lasso(async () => {
    await Hub.syncTable();
    await Conduit.syncTable();
    const hubA = await new Hub({ name: 'A' }).save();
    const hubB = await new Hub({ name: 'B' }).save();
    const hubC = await new Hub({ name: 'C' }).save();
    await new Conduit({ start: hubA.id, end: hubB.id }).save();
    await new Conduit({ start: hubA.id, end: hubC.id }).save();
    await new Conduit({ start: hubB.id, end: hubC.id }).save();
  }));

  afterEach(lasso(async () => {
    await query('DROP TABLE conduits');
    await query('DROP TABLE hubs');
  }));

  fit('should load the related models automatically with disambiguation assignments', lasso(async () => {
    const hubs = await Hub.include('conduits', { start: 'outputs', end: 'inputs' }).exec();

    const hubB = hubs.find(h => h.name === 'B');
    const hubC = hubs.find(h => h.name === 'C');
    expect(hubC.inputs.length).toEqual(2);
    expect(hubB.outputs.length).toEqual(1);
  }));
});
