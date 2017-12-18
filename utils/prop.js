import Ember from 'ember';

export function maxOrder(prop, delta) {
  return Ember.computed(prop, function() {
    let max = -delta;
    this.get(prop).forEach((task) => {
      max = Math.max(max, task.get('order'));
    });
    return max + delta;
  });
}

export function filterBy(prop, key, value) {
  return Ember.computed(prop, function() {
    let array = this.get(prop);
    if (array) {
      return array.filter((el) => el.get(key) === value);
    }
    return null;
  });
}

export function groupBy(collection, key) {
  const map = Ember.Object.create({});
  collection.forEach(item => {
    const group = item.get(key);
    const set = map.get(group) || map.set(group, []);
    set.addObject(item);
  });
  return map;
}

export default {
  maxOrder,
  filterBy
};
