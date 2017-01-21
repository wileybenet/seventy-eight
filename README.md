## Active Record Lite
[![wercker status](https://app.wercker.com/status/00e73ae1d42d6fdab896730134abd8f8/s/master "wercker status")](https://app.wercker.com/project/bykey/00e73ae1d42d6fdab896730134abd8f8)
[![Coverage Status](https://coveralls.io/repos/wileybenet/seventy-eight/badge.svg?branch=master&service=github)](https://coveralls.io/github/wileybenet/seventy-eight?branch=master)

```javascript
var seventyEight = require('seventy-eight');

module.exports = seventyEight.createModel({
  constructor: function User(props) {

  },
  staticMethods: {
    findByUsername: function(username) {
      return this.where({ username: username }).one();
    }
  },
  instanceMethods: {
    hasRole: function(role) {
      return !!_.intersection([].concat(role), this.roles.split(',')).length;
    }
  }
});
```

## Initialize

Configure DB connection at runtime:

> DB_HOST, DB_PORT, DB_USER, DB_PASSWORD, DB_SCHEMA, DEBUG

## Documentation

### API

```javascript

// model creation
seventyEight.createModel({ config });

// shorthand return for an automatically resolved promise
seventyEight.resolvedPromise({ data });

// shorthand return for an automatically rejected promise
seventyEight.rejectedPromise({ err });

```

### Static Methods

#### all()

```javascript
// return all records according to any conditionals applied
User.all().then(function(records) {
  records // Array
}, function(err) {
  err // MySQL error
});
```

#### select()

```javascript
// Array or csv syntax
User.select('id, name, date_created'])
User.select(['id', 'name', 'date_created'])
```

#### one()

```javascript
User.where({ admin: 1 }).one().then(function(record) {
  record // User instance
}, function(err) {
  err // MySQL error
});
```

#### joins()

```javascript
User.select("id, name, zip_code, GROUP_CONCAT(roles.name SEPARATOR ',')")
  .joins([
    'INNER JOIN locations ON users.zip_code = locations.zip_code',
    'INNER JOIN user_roles ON users.id = user_roles.user_id',
    'INNER JOIN roles ON user_roles.role_id = roles.id'
  ])
```

#### where()

```javascript
// simple JS object AND concatenation
User.where({ admin: 1 } })
  // WHERE admin = 1

// OR using a distributive syntax
User.where({ '$OR': { admin: 1, access: 1 } } })
  // WHERE admin = 1 OR access = 1

// multiple where statements with custom comparators
User.where({ id: 1 }).where({ id: ['!=', 1] }).where({ id: ['>=', 1] });
  // WHERE `id` = 1 AND `id` != 1 AND `id` >= 1

// multi-level AND OR compositions
User.where({ $OR: { name: 'root', $AND: { title: 'manager', $OR: { updated: 0, deleted: 1 } } } })
  // WHERE (`name` = 'root' OR (`title` = 'manager' AND (`updated` = 0 OR `deleted` = 1)))
```

#### order()

#### group()

#### limit()

#### then()

### Instance Methods

#### save()

```javascript
var user = new User({ name: 'Wiley Bennett', admin: 1 });
user.save().then(function(user) {
  // user instance with populated `id` field
});
```

#### update()

#### delete()

#### afterFind()

```javascript
var seventyEight = require('seventy-eight');

module.exports = seventyEight.createModel({
  constructor: function User(props) {

  },
  instanceMethods: {
    afterFind: function() {
      this.data = JSON.parse(this.json);
    }
  }
});
```

#### beforeSave(properties)

```javascript
var seventyEight = require('seventy-eight');

module.exports = seventyEight.createModel({
  constructor: function User(props) {

  },
  instanceMethods: {
    beforeSave: function(props) {
      props.json = JSON.stringify(props.data);
      return props;
    }
  }
});
```

### Literal SQL

Write literal SQL by using the connector:
```javascript
seventyEight.db.query("SELECT * FROM USERS;")
  .then(function(response) {}, function(err) {});
```
