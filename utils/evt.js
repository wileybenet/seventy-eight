import Ember from 'ember';

export default {
  subscriber: Ember.computed({
    set(_name, callback) {
      const evt = callback.name;
      this._events = this._events || {};
      this._events[evt] = this._events[evt] || [];
      this._events[evt].push(callback);
    }
  }),
  publisher: Ember.computed({
    set(_name, evt) {
      const key = Object.keys(evt)[0];
      const value = evt[key];
      ((this._events || {})[key] || []).forEach(callback => callback(value));
    },
  })
};
