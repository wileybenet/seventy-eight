const SQUASH_TAGS = ['style', 'script'];
const SELF_CLOSING_TAGS = ['meta', 'link', 'br', 'hr', 'img', 'input'];

function repeat(str) {
  return (times) => {
    if (times < 0) {
      return '';
    }
    const arr = new Array(times);
    return arr.fill(str).join('');
  };
}

function collectUntil(strArray, terminator) {
  let text = '';
  while (strArray.length) {
    const char = strArray.pop();
    text += char;
    if (char === terminator[terminator.length-1] && text.toLowerCase().indexOf(terminator) > -1) {
      return text;
    }
  }

  return text;
}

function elementFormatter(el, strArray) {
  return {
    squash(names) {
      [].concat(names).forEach(name => {
        if (el.name === name && el.type === 'open') {
          el.type = 'self';
          collectUntil(strArray, `</${name}>`);
          el.text = `<!-- {{ requio_filtered_${name.toLowerCase()} }} -->`;
        }
      });
    },
    alwaysSelfClosing(els) {
      els.forEach(e => {
        if (el.name === e) {
          el.type = 'self';
        }
      });
    }
  };
}

function getElement(strArray) {
  const el = {
    name: null,
    text: '<',
    type: 'open'
  };
  const formatter = elementFormatter(el, strArray);
  let name = '';
  let cur = strArray.pop();

  if (cur === '/') {
    el.type = 'close';
    el.text += '/';
    cur = strArray.pop();
  } else if (strArray.slice(-2).join('') + cur === '--!') {
    el.type = 'self';
    el.text = '<!' + collectUntil(strArray, '-->');
    return el;
  } else if (!cur.match(/[A-z]/)) {
    el.type = 'self';
  }

  while (cur !== '>') {
    if (el.name === null) {
      if (cur.match(/[A-z]/)) {
        name += cur.toLowerCase();
      } else {
        el.name = name;
      }
    }
    el.text += cur;
    cur = strArray.pop();
  }

  if (el.name === null) {
    el.name = name;
  }

  if (el.text[el.text.length-1] === '/') {
    el.type = 'self';
  }
  el.text += cur;

  formatter.squash(SQUASH_TAGS);
  formatter.alwaysSelfClosing(SELF_CLOSING_TAGS);

  return el;
}

function print(str, indentSize = 2) {
  const stack = [];
  let depth = 0;
  const indent = repeat(repeat(' ')(indentSize));
  const strArray = str.trim().split('').reverse();

  let html = '';
  let block = '';
  while (strArray.length) {
    const cur = strArray.pop();
    if (cur === '<') {
      if (block.trim()) {
        const ind = indent(depth);
        html += ind + block.replace(/\r?\n/g, '\n' + ind) + '\n';
      }
      block = '';
      const el = getElement(strArray);
      let tag;
      if (el.type === 'open') {
        stack.push(el.name);
        tag = indent(depth) + el.text + '\n';
        depth++;
      } else if (el.type === 'close') {
        let open = stack.pop();
        if (open !== el.name) {
          console.log(`Invalid close: ${el.name}`);
        }
        depth--;
        tag = indent(depth) + el.text + '\n';
      } else {
        tag = indent(depth) + el.text + '\n';
      }
      html += tag;

    } else {
      block += cur;
    }
  }

  return html || str;
}

export default {
  print
};
