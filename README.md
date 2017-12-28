## Active Record Lite
[![wercker status](https://app.wercker.com/status/00e73ae1d42d6fdab896730134abd8f8/s/master "wercker status")](https://app.wercker.com/project/byKey/00e73ae1d42d6fdab896730134abd8f8)
[![Coverage Status](https://coveralls.io/repos/github/wileybenet/seventy-eight/badge.svg?branch=master)](https://coveralls.io/github/wileybenet/seventy-eight?branch=master)
[![dependencies Status](https://david-dm.org/wileybenet/seventy-eight/status.svg)](https://david-dm.org/wileybenet/seventy-eight)

```javascript
var seventyEight = require('seventy-eight');

module.exports = seventyEight.createModel({
  constructor: function User(props) {

  },
  query: {
    findByUsername: function(username) {
      return this.where({ username: username }).one();
    }
  },
  instance: {
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

```

### Static Methods

#### all()

```javascript
// return all records according to any conditionals applied
User.all().then(function(records) {
  records // Array
}, function(err) {
  err // SQL error
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
  err // SQL error
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
    this.data_field = props.data;
  },
  instance: {
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
  instance: {
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

## Development

### Run tests

Create a `.env` file with your local MySQL connection credentials
```
DB_HOST=localhost
DB_USER=root
DB_PASSWORD=root
DB_PORT=3306
DB_SCHEMA=seventy_eight
```
