import Ember from 'ember';
const { $ } = Ember;
import math from './math';

const DEBUG = false;
const log = (...args) => DEBUG && console.log(...args);

export default class Draggable {
  constructor(config, msgBus) {
    this.target = config.target;
    this.overFns = [];
    this.dropFns = [];
    this.snapFns = [];

    this.msgBus = msgBus;

    this.dragFns = [];
    this.resetFns = [];
    this._grid = config.grid || null;
    this._range = config.range || null;
    if (this._grid) {
      this._gridStepper = {
        x: math.stepper(this._grid[0]),
        y: math.stepper(this._grid[1])
      };
    }
    this._overDrop = false;
    this._isElSnapped = false;
    this._gridSnap = false;
    this._originGridSnap = null;
    this._moved = false;
    this._position = {
      top: 0,
      left: 0
    };
  }

  _getGridSnap(position) {
    if (this._grid && this._grid[0]) {
      position.xSnap = this._gridStepper.x(position.left);
      position.left = position.xSnap * this._grid[0];
    } else if (this._grid && this._grid[0] === 0) {
      position.left = 0;
    } else {
      position.xSnap = null;
    }
    if (this._grid && this._grid[1]) {
      position.ySnap = this._gridStepper.y(position.top);
      position.top = position.ySnap * this._grid[1];
    } else if (this._grid && this._grid[1] === 0) {
      position.top = 0;
    } else {
      position.ySnap = null;
    }
    return position;
  }

  _down(evt) {
    let p = this.$el.position();
    let snap = this._getGridSnap(p);
    this._startPosition = p;
    this.active = {
      clientY: evt.clientY,
      clientX: evt.clientX,
      origin: {
        top: p.top,
        left: p.left
      }
    };
    this._originGridSnap = {
      x: snap.xSnap,
      y: snap.ySnap
    };

    evt.preventDefault();
  }
  _move(evt) {
    if (this._overDrop) {
      return null;
    } else if (this.active) {

      const scrollTop = $(window).scrollTop();
      let y;
      let x;

      log(`scrolltop: ${scrollTop}`);

      evt.preventDefault();
      this.msgBus.activeDrag = this;

      if (this._isElSnapped) {
        let box = math.difference(this.$parent.offset(), { y: this.active.clientY + scrollTop, x: this.active.clientX });
        x = this.active.origin.left = box.x;
        y = this.active.origin.top = box.y - 18;
      } else {
        x = this.active.origin.left + evt.clientX - this.active.clientX;
        y = this.active.origin.top + evt.clientY - this.active.clientY;
      }

      log(`move x:${x}, y:${y}`);

      let {
        top,
        left,
        xSnap,
        ySnap
      } = this._getGridSnap({
        top: math.fitToRange(y, this._range[1]),
        left: math.fitToRange(x, this._range[0])
      });

      let position = {
        top,
        left
      };

      if (this._gridSnap.x !== xSnap || this._gridSnap.y !== ySnap) {
        this.snapFns.forEach((fn) => fn({ target: { x: xSnap, y: ySnap } }));
      }

      log(`position`, position);

      this.dragFns.forEach((fn) => fn(position));
      this._isElSnapped = false;

      this._position = position;
      this.$el.css({
        top: `${position.top}px`,
        left: `${position.left}px`
      });
      this._gridSnap = { x: xSnap, y: ySnap };
      this._moved = true;
    }
  }
  _up() {
    if (this.active && this._moved) {
      if ((!this._grid && this._overDrop) || (this._gridSnap.x !== this._originGridSnap.x || this._gridSnap.y !== this._originGridSnap.y)) {
        this.dropFns.forEach((fn) => fn({ position: this._position, target: this._overDrop || this._gridSnap }));
      } else {
        this.resetPosition();
      }
      this._overDrop = false;
      this.msgBus.activeDrag = null;
      this._isGridSnapped = false;
      this._calledGridSnapFunctions = false;
    }
    this._moved = false;
    this.active = false;
  }
  _getAbsoluteOrigin() {
    return math.difference(this.$reference.offset(), this.$parent.offset());
  }

  // public api
  attachElement(config) {
    this.$el = config.el;
    this.$reference = config.reference;
    this.$parent = config.parent;
    this.$handle = config.handle || config.el;
    this._resetPosition = config.reset || null;
    this._downBound = Ember.run.bind(this, this._down);
    this._moveBound = Ember.run.bind(this, this._move);
    this._upBound = Ember.run.bind(this, this._up);
    this.$handle.on('mousedown', this._downBound);
    $(document).on('mousemove', this._moveBound);
    $(document).on('mouseup', this._upBound);

    return this;
  }
  setToReceiver(position) {
    this._isElSnapped = true;
    this.setPosition(position);
  }
  setPosition(position) {
    //fit to range
    this.$el.css({
      top: `${position.top}px`,
      left: `${position.left}px`
    });
    this._position = position;
  }
  onDrag(callback) {
    this.dragFns.push(callback);
    return this;
  }
  onSnap(callback) {
    this.snapFns.push(callback);
    return this;
  }
  onDrop(callback) {
    this.dropFns.push(callback);
    return this;
  }
  onReset(callback) {
    this.resetFns.push(callback);
    return this;
  }
  resetDraggerPosition() {
    let { top, left } = this._resetPosition || this._startPosition;
    this._position = {
      top,
      left
    };
    this._overDrop = false;
    this.$el.css(this._position);
  }
  resetPosition() {
    this.resetFns.forEach((fn) => fn());
    this.resetDraggerPosition();
  }
  snapDragToDrop(droppable) {
    if (this._grid) {
      return false;
    }
    this._overDrop = droppable.target;
    const origin = math.difference(this._getAbsoluteOrigin(), droppable.absoluteOrigin);
    const position = {
      top: origin.y,
      left: origin.x
    };
    this.setPosition(position);
    this._isElSnapped = true;
    this.snapFns.forEach((fn) => fn(position));
  }
  releaseDragFromDrop() {
    this._overDrop = false;
  }
  getDropOrigin(sender, receiver) {
    const { x, y } = math.difference(sender.offset(), receiver.offset());
    return {
      top: +receiver.attr('originy') + y,
      left: +receiver.attr('originx') + x// + this.$reference.scrollLeft()
    };
  }
  destroy() {
    this.$handle.off('mousedown', this._downBound);
    $(document).off('mousemove', this._moveBound);
    $(document).off('mouseup', this._upBound);
  }
}
