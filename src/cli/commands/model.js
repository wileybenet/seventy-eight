/* eslint-disable no-sync */
const { modelDir, getTemplate } = require('../../utils');
const fs = require('fs-extra');

const modelTemplate = getTemplate('model');

module.exports = {
  createModel(modelName) {
    return new Promise((resolve, reject) => {
      const filePath = `${modelDir}/${modelName}.js`;
      const file = modelTemplate({ modelName });
      if (fs.existsSync(filePath)) {
        reject(new Error(`${modelName} model already exists`));
      } else {
        fs.writeFileSync(filePath, file);
        resolve(`created model ${modelName}: ${filePath}`);
      }
    });
  },
};
