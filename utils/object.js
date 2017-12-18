import Ember from 'ember';

function testObj(obj) {
  return obj && typeof obj.toString === 'function' && (obj.toString() === '[object Object]' || obj instanceof Array);
}

export function activeKeys(obj) {
  return Object.keys(obj).filter(key => key.charAt(0) !== '$');
}

export function copy(obj) {
  let newObj = {};
  if (testObj(obj)) {
    Object.keys(obj).forEach((key) => {
      if (testObj(obj[key])) {
        if (Ember.isArray(obj[key])) {
          newObj[key] = obj[key].slice(0).map(copy);
        } else {
          newObj[key] = copy(obj[key]);
        }
      } else {
        newObj[key] = obj[key];
      }
    });
    return newObj;
  }
  return obj;
}

export function freeze(obj) {
  return Object.freeze(copy(obj));
}

export function arrayToIndex(arr) {
  return arr.reduce((memo, i) => {
    memo[i] = true;
    return memo;
  }, {});
}

export function equals(obj1, obj2) {
  if (obj1 !== null && typeof obj1 === 'object') {
     return JSON.stringify(obj1) === JSON.stringify(obj2);
  }
  return obj1 === obj2;
}

export default {
  copy,
  freeze,
  equals,
  arrayToIndex
};
