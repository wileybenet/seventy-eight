var requireHelper = require('../helper');
var seventyEight = requireHelper('seventy.eight');
var _ = require('lodash');

describe('#static-query', function(){

  var User = seventyEight.createModel({
    constructor: function User() {},
    schema: {
      id: true,
      json: true,
      active: true,
    },
    instanceMethods: {
      afterFind: function() {
        this.data = JSON.parse(this.json);
      },
      beforeSave: function(props) {
        if (props.data) {
          props.json = JSON.stringify(props.data);
        }
        return props;
      }
    }
  });

  var Role = seventyEight.createModel({
    constructor: function Role() {},
    schema: {
      id: true,
      name: true,
    },
  });

  it('should retreive an array of instances with all()', function(done) {
    var query = User.all();
    query.then(function(users) {
      expect(users.length > 0).toEqual(true);
      done();
    });
  });

  it('should retreive a single instance with one()', function(done) {
    var query = User.where({ id: 1 }).one();
    query.then(function(user) {
      expect(user.username).toEqual('root');
      done();
    });
  });

  it('should format response with afterFind', function(done) {
    var query = User.find(1);
    query.then(function(user) {
      expect(user.data).toEqual({ test: true });
      done();
    });
  });

  it('should return Error object for misformatted queries', function(done) {
    var query = User.joins("INNER JOINER doesn't_exist ON nothing");
    query.then(function(users) {
      expect(users.constructor.name).toEqual('User');
      done();
    }, function(err) {
      expect(err.constructor.name).toEqual('Error');
      done();
    });
  });

  it('should save a new row', function(done) {
    var role = new Role({ name: 'guest' });
    role.save().then(function(role) {
      expect(role.id).toEqual(4);
      done();
    });
  });

  it('should format data with beforeSave when saving', function(done) {
    var data = { mapping: [{ name: 'test' }, { name: 'two' }] };
    var user = new User({ username: 'wiley', password: 'password', data: data });
    user.save().then(function(user) {
      User.find(user.id).then(function(u) {
        expect(u.data).toEqual(data);
        done();
      });
    }, function(err) {
      console.log(err);
    });
  });

  it('should update an existing row', function(done) {
    User.find(1).then(function(user) {
      expect(user.id).toEqual(1);
      user.update({ active: 0}).then(function(user) {
        expect(user.active).toEqual(0);
        done();
      }, function(err) {
        console.log(err);
      });
    });
  });

  it('should update an existing row', function(done) {
    User.find(1).then(function(user) {
      user.data = { update: 'viaSave' };
      user.save().then(function(user) {
        expect(user.data.update).toEqual('viaSave');
        done();
      }, function(err) {
        console.log(err);
      });
    });
  });

  it('should update an existing row with the static method', function(done) {
    Role.update(3, { name: 'removed' }).then(function(success) {
      Role.find(3).then(function(role) {
        expect(success).toEqual(true);
        expect(role.name).toEqual('removed');
        done();
      }, function(err) { console.log(err); });
    }, function(err) { console.log(err); });
  });

  it('should delete an existing row', function(done) {
    User.find(2).then(function(user) {
      expect(user.id).toEqual(2);
      user.delete().then(function(status) {
        expect(status).toEqual(true);
        User.find(2).then(function(user) {
          expect(user).toEqual(null);
          done();
        });
      });
    });
  });

  it('should load const object with const table', function(done) {
    seventyEight.promise.then(function(seventyEight) {
      expect(seventyEight.const.salt).toEqual('$2a$10$xb6OlUSgar.Lx1toO3UnB.');
      done();
    });
  });

});

describe('schemas', () => {
  var User = seventyEight.createModel({
    constructor: function User() {},
    schema: {
      id: { type: 'int', length: 11, primary: true, autoIncrement: true },
      name: { type: 'string', length: 255 },
      data: { type: 'json' },
    }
  });

  it('should generate field create syntax', function() {
    expect(User.createTableSyntax()).toContain(`CREATE TABLE users`);
  });
});
