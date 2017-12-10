/* eslint-disable no-underscore-dangle */
const Stub = require('./Stub');

const setChain = function(spy, chainable, link) {
  chainable.forEach(method => {
    if (method === 'exec') {
      spy[method].and.callFake(() => this._process('exec'));
    } else {
      spy[method].and.callFake(() => link);
    }
  });
};

module.exports = {
  mock(Model) {
    const scope = { [Model.name]: Model };
    const chainable = Model.queryMethodKeys;
    const chainableExec = [...chainable, 'exec'];
    const static = Model.staticMethodKeys;
    const spy = jasmine.createSpyObj(Model.name, [
      ...chainable,
      ...static,
    ]);
    const api = new Stub(Model.name, [...static, 'exec', 'new']);
    const chainLink = jasmine.createSpyObj(`${Model.name}/chainLink`, chainableExec);
    const instanceName = `${Model.name}/instance`;
    const instanceApi = new Stub(instanceName, Model.instanceMethodKeys);
    const construcor = spyOn(scope, Model.name).and.callFake(props => {
      const instanceSpy = jasmine.createSpyObj(instanceName, Model.instanceMethodKeys);
      Model.instanceMethodKeys.forEach(method => {
        instanceSpy[method].and.callFake(() => instanceApi._process(method));
      });
      return Object.assign(instanceSpy, api._process('new', props || {}));
    });
    static.forEach(method => {
      spy[method].and.callFake(() => api._process(method));
    });
    setChain.call(api, spy, chainable, chainLink);
    setChain.call(api, chainLink, chainableExec, chainLink);
    Object.assign(construcor, spy);
    construcor._78 = api;
    construcor._78i = instanceApi;
    return construcor;
  },
};
