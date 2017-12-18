const RAD_TO_DEG = 57.2958;

export default {
  rand(/*[min,] max*/) {
    let min;
    let max;
    if (arguments.length === 2) {
      min = arguments[0];
      max = arguments[1];
    } else {
      min = 1;
      max = arguments[0];
    }
    if ((max+'').match(/\./)) {
      return Math.random()*(max-min)+min;
    } else {
      max++;
      return Math.floor(Math.random()*(max-min)+min);
    }
  },
  fitToRange(val, range) {
    return Math.max(Math.min(val, range[1]), range[0]);
  },
  stepper(stepSize) {
    return (value) => {
      return Math.round(value / stepSize);
    };
  },
  snap(raw, grid, snapDistance) {
    if (grid > 0 && snapDistance >= 0) {
      if (raw === 0) {
        return [0, 0];
      }
      let snapped = null;
      let value = raw;
      let sign = raw / Math.abs(raw);
      let abs = Math.abs(raw);
      let delta = abs % grid;

      if (delta - snapDistance <= 0) {
        snapped = sign * Math.floor(abs / grid);
        value = snapped * grid;
      } else if (delta + snapDistance >= grid) {
        snapped = sign * (Math.floor(abs / grid) + 1);
        value = snapped * grid;
      }
      return [value, snapped];
    } else {
      return [0, null];
    }
  },
  toRadial(coords) {
    const x = coords.x || coords.left;
    const y = coords.y || coords.top;
    return {
      angle: Math.atan(y/x) * RAD_TO_DEG,
      length: Math.sqrt(x*x + y*y)
    };
  },
  atan(x, y) {
    return Math.atan(x/y) * RAD_TO_DEG;
  },
  sin(angleInDegrees) {
    return Math.sin(angleInDegrees / RAD_TO_DEG);
  },
  cos(angleInDegrees) {
    return Math.cos(angleInDegrees / RAD_TO_DEG);
  },
  pythag(a, b, c) {
    if (a && b) {
      return Math.sqrt(a * a + b * b);
    } else if (a && c) {
      return Math.sqrt(c * c - a * a);
    } else if (b && c) {
      return Math.sqrt(c * c - b * b);
    }
  },
  difference(coords1, coords2) {
    return {
      x: (coords2.x || coords2.left) - (coords1.x || coords1.left),
      y: (coords2.y || coords2.top) - (coords1.y || coords1.top)
    };
  },
  sum(coords1, coords2) {
    return {
      x: (coords2.x || coords2.left) + (coords1.x || coords1.left),
      y: (coords2.y || coords2.top) + (coords1.y || coords1.top)
    };
  },
  absShift(base, delta) {
    return base + (base >= 0 ? delta : -delta);
  },
  arrayFill(count, value) {
    let arr = [];
    for (let i = 0; i < count; i++) {
      arr.push(value);
    }
    return arr;
  }
};
