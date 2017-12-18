import Ember from 'ember';
import math from './math';
import uid from './uid';

export default class Droppable {
  constructor(config, msgBus) {
    this.target = config.target;
    this.overFns = [];
    this.dropFns = [];
    this.leaveFns = [];
    this.receiverID = uid();
    this.active = false;

    this.relativeOrigin = config.origin;

    this.msgBus = msgBus;
  }

  _enter() {
    this._setOrigin();
    if (this.msgBus.activeDrag) {
      this.active = true;
      this.overFns.forEach((fn) => fn(this.msgBus.activeDrag));
      this.msgBus.activeDrag.snapDragToDrop({
        absoluteOrigin: this.origin,
        target: this.target
      });
    }
  }
  _leave() {
    if (this.msgBus.activeDrag) {
      this.active = false;
      this.leaveFns.forEach((fn) => fn());
      this.msgBus.activeDrag.releaseDragFromDrop();
    }
  }
  _up() {
    if (this.msgBus.activeDrag && this.active) {
      this.dropFns.forEach((fn) => fn(this.msgBus.activeDrag));
      this.active = false;
    }
  }
  _setOrigin() {
    const origin = math.difference(this.$reference.offset(), this.$el.offset());
    this.origin = {
      top: origin.y + this.relativeOrigin.top,
      left: origin.x + this.relativeOrigin.left
    };
  }

  // public api
  attachElement(config) {
    this.$el = config.el;
    this.$reference = this.$el.parents(config.reference);
    this.$el.on('mouseenter', Ember.run.bind(this, this._enter));
    this.$el.on('mouseleave', Ember.run.bind(this, this._leave));
    this.$el.on('mouseup', Ember.run.bind(this, this._up));
    this._setOrigin();

    return this;
  }
  onOver(callback) {
    this.overFns.push(callback);
    return this;
  }
  onDrop(callback) {
    this.dropFns.push(callback);
    return this;
  }
  onOut(callback) {
    this.leaveFns.push(callback);
    return this;
  }
  destroy() {
    this.$el.off('mouseenter', Ember.run.bind(this, this._enter));
    this.$el.off('mouseleave', Ember.run.bind(this, this._leave));
    this.$el.off('mouseup', Ember.run.bind(this, this._up));
  }

}
