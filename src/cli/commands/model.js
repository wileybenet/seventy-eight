/* eslint-disable no-sync */
const { color, modelDir, getTemplate } = require('../../utils');
const fs = require('fs-extra');

const green = color('green');
// const red = color('red');
const modelTemplate = getTemplate('model');

module.exports = {
  createModel(modelName) {
    return new Promise((resolve, reject) => {
      const filePath = `${modelDir}/${modelName}.js`;
      const file = modelTemplate({ modelName });
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
