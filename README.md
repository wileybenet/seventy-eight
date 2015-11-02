## Active Record Lite

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