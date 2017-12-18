import Ember from 'ember';
const { assign } = Ember;

export default class Message {
  constructor(action, data) {
    this.action = action;
    this.data = data;
    this._isMulti = this.data && Ember.isArray(this.data);
  }
  getData(id) {
    if (!Ember.isEmpty(id)) {
      if (this._isMulti) {
        return this.data.filter(item => item.id === id);
      } else {
        return this.data.id === id ? this.data : null;
      }
    } else {
      return this.data;
    }
  }
  actionIs(...actions) {
    let pass = false;
    actions.forEach((action) => {
      pass = pass || this.action.indexOf(action) === 0;
    });
    return pass;
  }
  copy() {
    let data = assign({}, this.data);
    if (this._isMulti) {
      data = this.data.map((item) => assign({}, item));
    }
    return new Message(this.action, data);
  }
}
