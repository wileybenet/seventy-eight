const { uniqueId, size } = require('lodash');
const { color, sqlHighlight } = require('../utils');
const init = require('./init');

const CACHE_SIZE = 3;

class LinkedList {
  constructor() {
    this.head = null;
    this.tail = null;
  }
  toString() {
    const str = [];
    let node = this.head;
    while (node) {
      str.push(`${node.id} [${node.before ? node.before.id : '-'} ${node.after ? node.after.id : '-'}] -- ${node.json}`);
      node = node.after;
    }
    return str.join('\n');
  }
}

class CacheNode {
  constructor(data, list) {
    this.id = uniqueId();
    this.list = list;
    this.json = JSON.stringify(data);
    this.timestamp = new Date();
    this.before = null;
    this.after = null;
    this.hits = 1;
  }
  promote() {
    if (!this.before) {
      return null;
    }
    const front = this.list.head;
    const a = this.before;
    const c = this.after;
    front.before = this;
    this.before = null;
    this.after = front;
    a.after = c;
    if (c) {
      c.before = a;
    }
    if (!this.before) {
      this.list.head = this;
    }
    if (!c) {
      this.list.tail = a;
    }
  }
  hit() {
    this.timestamp = new Date();
    this.hits += 1;
    this.promote();
  }
  data() {
    return JSON.parse(this.json);
  }
}

class CacheNodeStore {
  constructor(cacheSize) {
    this.size = cacheSize;
    this.reset();
  }
  reset() {
    this.lookup = {};
    this.linkedList = new LinkedList();
  }
  get(key) {
    const hit = this.lookup[key];
    if (hit) {
      hit.hit();
      return hit.data();
    }
    return null;
  }
  add(key, data) {
    if (this.lookup[key]) {
      this.lookup[key].hit();
    }
    const node = new CacheNode(data, this.linkedList);
    this.lookup[key] = node;
    if (this.linkedList.head) {
      const { linkedList: { head } } = this;
      head.before = node;
      node.after = head;
      this.linkedList.head = node;
    } else {
      this.linkedList.head = node;
      this.linkedList.tail = node;
    }

    if (size(this.lookup) > this.size) {
      const { linkedList: { tail } } = this;
      this.linkedList.tail = tail.before;
      tail.before = null;
      this.linkedList.tail.after = null;
    }
  }
  clear() {
    this.reset();
  }
}

class SqlCache {
  constructor(cacheSize = CACHE_SIZE) {
    this.sqlStore = new CacheNodeStore(cacheSize);
  }
  store(sql, data) {
    this.sqlStore.add(sql, data);
  }
  hit(sql) {
    const data = this.sqlStore.get(sql);
    if (data) {
      init.log.info({ sql: `${color('yellow', 'CACHE HIT')} ${sqlHighlight(sql)}` });
      return data;
    }
    return null;
  }
  invalidate() {
    this.sqlStore.clear();
  }
}

module.exports = SqlCache;
