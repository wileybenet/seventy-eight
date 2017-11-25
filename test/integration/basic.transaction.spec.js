const { requireHelper } = require('../helper');
var seventyEight = requireHelper('seventy.eight');

describe('#static-query', function() {
  var User = seventyEight.createModel({
    constructor: function User() {},
    schema: {
      id: { type: 'int', primary: true, autoIncrement: true },
      data: { type: 'json' },
      active: { type: 'boolean' },
    },
    instanceMethods: {},
  });

  var Role = seventyEight.createModel({
    constructor: function Role() {},
    schema: {
      id: { type: 'int', primary: true, autoIncrement: true },
      name: { type: 'string' },
    },
  });

  xit('should retreive an array of instances with all()', function(done) {
    var query = User.all();
    query.then(function(users) {
      expect(users.length > 0).toEqual(true);
      done();
    });
  });

  xit('should retreive a single instance with one()', function(done) {
    var query = User.where({ id: 1 }).one();
    query.then(function(user) {
      expect(user.username).toEqual('root');
      done();
    });
  });

  xit('should format response json into `data` property', function(done) {
    var query = User.find(1);
    query.then(function(user) {
      expect(user.data).toEqual({ test: true });
      done();
    });
  });

  xit('should return Error object for misformatted queries', function(done) {
    var query = User.joins("INNER JOINER doesn't_exist ON nothing");
    query.then(function(users) {
      expect(users.constructor.name).toEqual('User');
      done();
    }, function(err) {
      expect(err.constructor.name).toEqual('Error');
      done();
    });
  });

  xit('should save a new row', function(done) {
    var role = new Role({ name: 'guest' });
    role.save().then(function() {
      expect(role.id).toEqual(4);
      done();
    });
  });

  xit('should format data with beforeSave when saving', function(done) {
    var data = { mapping: [{ name: 'test' }, { name: 'two' }] };
    var user = new User({ username: 'wiley', password: 'password', data });
    user.save().then(function(savedUser) {
      User.find(savedUser.id).then(function(u) {
        expect(u.data).toEqual(data);
        done();
      });
    }, function(err) {
      console.log(err);
    });
  });

  xit('should update an existing row via update()', function(done) {
    User.find(1).then(function(user) {
      expect(user.id).toEqual(1);
      user.update({ active: 0 }).then(function(savedUser) {
        expect(user.active).toEqual(0);
        done();
      }, function(err) {
        console.log(err);
      });
    });
  });

  xit('should update an existing row via save()', function(done) {
    User.find(1).then(function(user) {
      user.data = { update: 'viaSave' };
      user.save().then(function() {
        expect(user.data.update).toEqual('viaSave');
        done();
      }, function(err) {
        console.log(err);
      });
    });
  });

  xit('should update an existing row with the static method', function(done) {
    Role.update(3, { name: 'removed' }).then(function(success) {
      Role.find(3).then(function(role) {
        expect(success).toEqual(true);
        expect(role.name).toEqual('removed');
        done();
      }, err => console.log(err));
    }, err => console.log(err));
  });

  xit('should delete an existing row', function(done) {
    User.find(2).then(function(user) {
      expect(user.id).toEqual(2);
      user.delete().then(function(status) {
        expect(status).toEqual(true);
        User.find(2).then(function(deletedUser) {
          expect(deletedUser).toEqual(null);
          done();
        });
      });
    });
  });

});
