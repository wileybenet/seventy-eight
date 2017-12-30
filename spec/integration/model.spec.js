const { lasso } = require('../helpers');
const seventyEight = require('../../src/index');
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
      child.parent.children = child.parent.children || [];
      child.parent.children.push(child);
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
      start: relation(Hub, { inverse: 'outputs' }),
      end: relation(Hub, { inverse: 'inputs' }),
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

  it('should load the related models automatically with disambiguation assignments', lasso(async () => {
    const hubs = await Hub.includeConduit().exec();

    const hubB = hubs.find(h => h.name === 'B');
    const hubC = hubs.find(h => h.name === 'C');
    expect(hubC.inputs.length).toEqual(2);
    expect(hubB.outputs.length).toEqual(1);
  }));
});

describe('one-to-one relationships', () => {
  const Dep = seventyEight.createModel({
    constructor: function Dep() {},
    schema: {
      id: primary(),
      name: string(),
    },
  });

  const Pep = seventyEight.createModel({
    constructor: function Pep() {},
    schema: {
      id: primary(),
      name: string(),
      dep: relation(Dep, { oneToOne: true }),
    },
  });

  beforeEach(lasso(async () => {
    await Dep.syncTable();
    await Pep.syncTable();
    const d = await new Dep({ name: 'dolt' }).save();
    await new Pep({ name: 'perry', dep: d.id }).save();
  }));

  afterEach(lasso(async () => {
    await query('DROP TABLE peps');
    await query('DROP TABLE deps');
  }));

  it('should load relations as single instances', lasso(async () => {
    const p = await Pep.includeDep().find(1).exec();
    expect(p.dep.name).toEqual('dolt');
  }));

  it('should load inverse relations as single instances', lasso(async () => {
    const d = await Dep.includePep().find(1).exec();
    expect(d.pep.name).toEqual('perry');
  }));
});

describe('stale relationships', () => {
  const Alpha = seventyEight.createModel({
    constructor: function Alpha() {},
    schema: {
      id: primary(),
      name: string(),
    },
  });

  const Beta = seventyEight.createModel({
    constructor: function Beta() {},
    schema: {
      id: primary(),
      alpha: relation(Alpha),
    },
  });

  beforeEach(lasso(async () => {
    await Alpha.syncTable();
    await Beta.syncTable();
    const a = await new Alpha({ name: 'alf' }).save();
    await new Alpha({ name: 'malph' }).save();
    await new Beta({ alpha: a.id }).save();
  }));

  afterEach(lasso(async () => {
    await query('DROP TABLE betas');
    await query('DROP TABLE alphas');
  }));

  it('should NOT load the related models after an update', lasso(async () => {
    const b = await Beta.find(1).exec();
    const updatedB = await b.update({ alpha: 2 });
    expect(updatedB.alpha).toEqual(2);
  }));

  it('should load the related models after an update', lasso(async () => {
    const b = await Beta.find(1).include(Alpha).exec();
    await b.update({ alpha: 2 });
    expect(b.alpha.name).toEqual('malph');
  }));
});

describe('nested relationships', () => {
  const System = seventyEight.createModel({
    constructor: function System() {},
    schema: {
      id: primary(),
      name: string(),
    },
  });

  const Part = seventyEight.createModel({
    constructor: function Parts() {},
    schema: {
      id: primary(),
      system: relation(System),
    },
  });

  const Piece = seventyEight.createModel({
    constructor: function Piece() {},
    schema: {
      id: primary(),
      name: string(),
      part: relation(Part),
    },
  });

  beforeEach(lasso(async () => {
    await System.syncTable();
    await Part.syncTable();
    await Piece.syncTable();
    const sys = await new System({ name: 'main' }).save();
    const part = await new Part({ system: sys.id }).save();
    await new Piece({ part: part.id, name: 'screw' }).save();
    await new System({ name: 'secondary' }).save();
  }));

  afterEach(lasso(async () => {
    await query('DROP TABLE pieces');
    await query('DROP TABLE parts');
    await query('DROP TABLE systems');
  }));

  it('should load multi-level direct relations', lasso(async () => {
    const piece = await Piece.include(Part.includeSystem()).find(1).exec();
    expect(piece.part.system.name).toEqual('main');
  }));

  it('should load multi-level inverse relations', lasso(async () => {
    const system = await System.include(Part.include(Piece)).find(1).exec();
    expect(system.parts[0].pieces[0].name).toEqual('screw');
  }));

  it('should not throw even when no relations are found', lasso(async () => {
    const system = await System.include(Part.include(Piece)).find(2).exec();
    expect(system.parts).not.toBeDefined();
  }));
});
