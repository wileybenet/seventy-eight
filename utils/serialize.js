
function searchQuery(obj) {
  return Object.keys(obj).reduce((memo, key) => memo + `${key}=${encodeURIComponent(obj[key])}&`, '?');
}

const api = {
  searchQuery
};

export {
  api as default,
  searchQuery
};
