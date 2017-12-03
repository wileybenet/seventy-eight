/* eslint-disable no-sync */
const { color, modelDir } = require('../../utils');
const path = require('path');
const fs = require('fs');

const green = color('green');
// const red = color('red');
const modelTemplate = fs.readFileSync(path.resolve(__dirname, '../model.tpl')).toString();
const render = options => modelTemplate.replace(/\{\{([^}]+)\}\}/g, (str, match) => options[match]);

module.exports = {
  createModel(modelName) {
    return new Promise((resolve, reject) => {
      const filePath = `${modelDir}/${modelName}.js`;
      const file = render({ modelName });
      console.log(`${green('Creating')} model ${modelName}: ${filePath}`);
      if (fs.existsSync(filePath)) {
        reject(new Error(`${modelName} model already exists`));
      } else {
        fs.writeFileSync(filePath, file);
        resolve(green('Done'));
      }
    });
  },
};
