var requireHelper = require('../helper');
var seventyEight = requireHelper('seventy.eight');
var _ = require('lodash');

describe('#static-query', function(){

  var User = seventyEight.createModel({
    constructor: function User() {}
  });

  it('should retreive an array of instances with all()', function(done) {
    var query = User.all();
    query.then(function(users) {
      expect(users.length > 0).toEqual(true);
      done();
    });
  });

  it('should retreive a single instance with one()', function(done) {
    var query = User.one();
    query.then(function(users) {
      expect(users.constructor.name).toEqual('User');
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
    var user = new User({ username: 'user', password: 'good' });
    user.save().then(function(user) {
      expect(user.id).toEqual(3);
      done();
    });
  });

  it('should update an existing row', function(done) {
    User.find(1).then(function(user) {
      expect(user.id).toEqual(1);
      user.update({ active: 0}).then(function(user) {
        expect(user.active).toEqual(0);
        done();
      });
    });
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
