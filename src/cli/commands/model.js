/* eslint-disable no-sync */
const { modelDir, getTemplate } = require('../../utils');
const fs = require('fs-extra');

const modelTemplate = getTemplate('model');

module.exports = {
  createModel(modelName) {
    const filePath = `${modelDir}/${modelName}.js`;
    const file = modelTemplate({ modelName });
    if (fs.existsSync(filePath)) {
      return Promise.reject(new Error(`${modelName} model already exists`));
    }
    fs.writeFileSync(filePath, file);
    return Promise.resolve(`created model ${modelName}: ${filePath}`);
  },
};
