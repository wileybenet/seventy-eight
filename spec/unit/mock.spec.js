/* eslint-disable no-underscore-dangle */
const seventyEight = require('../../src/seventy.eight');
const { field: { primary } } = seventyEight;
const { mock } = require('../../src/mock');

describe('#mock', () => {
  const User = seventyEight.createModel({
    constructor: function User() {},
    schema: {
      id: primary(),
    },
    query: {
      findByUsername(username) {
        this.where({ username }).one();
      },
    },
  });

  it('should throw not allowed', () => {
    const MockedUser = mock(User);
    expect(() => MockedUser.asdf()).toThrow();
  });

  it('should throw not set', () => {
    const MockedUser = mock(User);
    expect(() => MockedUser.findByUsername().exec()).toThrow();
  });

  it('should throw the set error', () => {
    const MockedUser = mock(User);
    MockedUser._78.exec.throws(new Error());
    expect(() => MockedUser.all().exec()).toThrow();
  });

  it('should return the set value from a query method', () => {
    const MockedUser = mock(User);
    MockedUser._78.exec.returns(1234);
    expect(MockedUser.all().exec()).toEqual(1234);
  });

  it('should return the set value from a long chain', () => {
    const MockedUser = mock(User);
    MockedUser._78.exec.returns(1234);
    expect(MockedUser.select('id').where({ x: 1 }).group('name').exec()).toEqual(1234);
  });

  it('should return the set value from a static method', () => {
    const MockedUser = mock(User);
    const user = { name: 'test' };
    MockedUser._78.import.returns([user, user]);
    expect(MockedUser.import()).toEqual([user, user]);
  });

  it('should return the set value from a constructor', () => {
    const MockedUser = mock(User);
    const user = { name: 'test' };
    MockedUser._78.new.returns(user);
    expect(new MockedUser()).toEqual(jasmine.objectContaining(user));
  });

  it('should return the set value from an instance', () => {
    const MockedUser = mock(User);
    MockedUser._78i.save.returns(true);
    expect(new MockedUser().save()).toEqual(true);
  });

});
