const { lasso } = require('../helpers');
const seventyEight = require('../../src/seventy.eight');
const { field: { primary, string, boolean, json } } = seventyEight;

describe('#static-query', function() {
  const User = seventyEight.createModel({
    constructor: function User() {},
    schema: {
      id: primary(),
      data: json(),
      active: boolean(),
    },
    instanceMethods: {},
  });

  const Role = seventyEight.createModel({
    constructor: function Role() {},
    schema: {
      id: primary(),
      name: string(),
    },
  });

  it('should retreive an array of instances with all()', lasso(async () => {
    const users = await User.all().exec();
    expect(users.length > 0).toEqual(true);
  }));

  it('should retreive a single instance with one()', lasso(async () => {
    const { username } = await User.where({ id: 1 }).one().exec();
    expect(username).toEqual('root');
  }));

  it('should format response json into `data` property', lasso(async () => {
    const { data } = await User.find(1).exec();
    expect(data).toEqual({ test: true });
  }));

  it('should throw an error if the query is malformed', lasso(async () => {
    await User.joins("INNER JOINER doesn't_exist ON nothing").exec();
  }, err => {
    expect(err).toEqual(jasmine.any(Error));
  }));

  it('should save a new row', lasso(async () => {
    const role = await new Role({ name: 'guest' }).save();
    expect(role.id).toEqual(4);
  }));

  it('should format data with beforeSave when saving', lasso(async () => {
    const data = { mapping: [{ name: 'test' }, { name: 'two' }] };
    const user = await new User({ username: 'wiley', password: 'password', data }).save();
    const foundUser = await User.find(user.id).exec();
    expect(foundUser.data).toEqual(data);
  }));

  it('should update an existing row via update()', lasso(async () => {
    const user = await User.find(1).exec();
    expect(user.id).toEqual(1);
    const updatedUser = await user.update({ active: false });
    expect(updatedUser.active).toEqual(false);
  }));

  it('should update an existing row via save()', lasso(async () => {
    const user = await User.find(1).exec();
    user.data = { update: 'viaSave' };
    await user.save();
    expect(user.data.update).toEqual('viaSave');
  }));

  it('should update an existing row with the static method', lasso(async () => {
    const success = await Role.update(3, { name: 'removed' });
    const role = await Role.find(3).exec();
    expect(success).toEqual(true);
    expect(role.name).toEqual('removed');
  }));

  it('should delete an existing row', lasso(async () => {
    const user = await User.find(2).exec();
    expect(user.id).toEqual(2);
    const deleted = await user.delete();
    expect(deleted).toEqual(true);
    const deletedUser = await User.find(2).exec();
    expect(deletedUser).toEqual(null);
  }));

});

describe('#options', function() {
  let WeirdUserModel = null;

  beforeEach(function() {
    WeirdUserModel = seventyEight.createModel({
      constructor: function WeirdUser() {},
      schema: {
        weird_id: string({ primary: true }),
        middle_name: string(),
      },
    });
  });

  it('should lookup records by the primaryKey', lasso(async () => {
    const id = 'sdf0Sjqnpfps9-jfa';
    const { weird_id } = await WeirdUserModel.find(id).exec();
    expect(weird_id).toEqual(id);
  }));

  it('should upsert a record', lasso(async () => {
    const id = 'sdf0Sjqnpfps9-jfa';
    const name = 'steve-o';
    await new WeirdUserModel({
      weird_id: id,
      middle_name: name,
    }).save();
    const { middle_name } = await WeirdUserModel.find(id).exec();
    expect(middle_name).toEqual(name);
  }));
});
