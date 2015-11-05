## Active Record Lite
[![wercker status](https://app.wercker.com/status/00e73ae1d42d6fdab896730134abd8f8/s/master "wercker status")](https://app.wercker.com/project/bykey/00e73ae1d42d6fdab896730134abd8f8)

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

> DB_HOST, DB_PORT, DB_USER, DB_PASSWORD, DB_SCHEMA

## Documentation

### Static Methods

#### all()

#### select()

#### one()

#### joins()

#### where()

#### order()

#### group()

#### limit()

#### then()

### Instance Methods

#### save()

#### update()

#### delete()

#### _beforeSave()