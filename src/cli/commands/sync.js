/* eslint-disable no-sync */
const fs = require('fs-extra');
const { log, indent, modelDir, migrationDir, makeModelDir, makeMigrationDir, dataDir, getTemplate } = require('../../utils');
const _ = require('lodash');
const seventyEight = require('../../seventy.eight');
const { getModel, field: { primary, string } } = seventyEight;

const logG = log('green');

process.env.CONNECTED_TO_78 = true;

const LAST_MIGRATION = 'last_migration';
const NEEDS_INIT = action => `please run \`78 init\` before ${action}`;

const migrationTemplate = getTemplate('migration');

const escapeTicks = str => str.replace(/`/g, '\\`');

const pad = zeros => num => {
  const padded = `00000000000${num}`;
  return padded.substr(padded.length - zeros);
};

const padMigrationNumber = pad(5);

const inSerial = async (items, promiser, asTransaction) => {
  const evaluate = async () => {
    for (const item of items) {
      try {
        await promiser(item); // eslint-disable-line no-await-in-loop
      } catch (err) {
        throw err;
      }
    }
  };
  // not working yet, ignoring data changes when inside transaction block
  if (asTransaction) {
    // await seventyEight.db.startTransaction();
    try {
      await evaluate();
    } catch (err) {
      await seventyEight.db.rollback();
      throw err;
    }
    // await seventyEight.db.commit();
  } else {
    await evaluate();
  }
};

const orderByRelation = Models => {
  const modelIndex = Models.reduce((memo, Model) => {
    memo[Model.name] = Model;
    return memo;
  }, {});
  const order = Models.filter(Model => {
    if (!Model.getSchema().find(field => field.relation)) {
      delete modelIndex[Model.name];
      return true;
    }
    return false;
  });

  const addToOrderedList = Model => {
    const relations = Model.getRelations().map(getModel);
    if (relations.length) {
      relations.forEach(addToOrderedList);
    }
    if (modelIndex[Model.name]) {
      delete modelIndex[Model.name];
      order.push(Model);
    }
  };
  Models.forEach(addToOrderedList);

  return order;
};

const requireModel = name => require(`${modelDir}/${name}`);

const getAllModels = async () => {
  const items = await fs.readdir(modelDir);
  return items.filter(item => item.match(/\.js$/)).map(requireModel);
};

const getAllRelations = Model => {
  const relations = Model.getSchema().filter(field => field.relation).map(({ relation }) => getModel(relation));
  return relations.concat(_.flatMap(relations, getAllRelations));
};

const readMigrationFiles = files => files.map(fileName => require(`${migrationDir}/${fileName}`));

const getAllMigrationsAfter = async id => {
  const migrationIdRE = /^\d+/;
  const fileNames = await fs.readdir(migrationDir);
  const migrationFiles = fileNames
    .filter(f => f.match(/\.js$/))
    .filter(sqlFile => Number(sqlFile.match(migrationIdRE)) > id)
    .sort((a, b) => {
      const aId = Number(a.match(migrationIdRE));
      const bId = Number(b.match(migrationIdRE));
      return aId > bId ? 1 : -1;
    });

  if (migrationFiles.length === 0) {
    return null;
  }
  return {
    files: migrationFiles,
    lastId: Number(migrationFiles[migrationFiles.length - 1].match(migrationIdRE)[0]),
  };
};

const SeventyEightSetting = seventyEight.createModel({
  constructor: function SeventyEightSetting() {},
  schema: {
    id: primary(),
    setting_name: string({ unique: true }),
    setting_value: string(),
  },
});

module.exports = {
  async init() {
    try {
      await SeventyEightSetting.all().exec();
      return 'already initialized';
    } catch (err) {
      //
    }
    makeModelDir();
    makeMigrationDir();
    await SeventyEightSetting.syncTable();
    await new SeventyEightSetting({ setting_name: LAST_MIGRATION, setting_value: 0 }).save();
    return 'initialized';
  },
  syncTable(modelName) {
    // deprecated
    return new Promise((resolve, reject) => {
      if (!modelName) {
        return reject('model name required, run `78 sync-table <ModelName>`');
      }
      requireModel(modelName)
        .then(({ Model }) => {
          const relations = getAllRelations(Model);
          const tree = _.uniq(relations.reverse());
          logG(`syncing ${modelName}${tree.length ? `and its relations (${tree.map(n => n.name).join(', ')})` : ''}`);
          const tableSyncs = [Model, ...relations].map(relation => relation.syncTable());
          Promise.all(tableSyncs)
            .then(() => {
              resolve(`synchronized ${modelName}`);
            })
            .catch(reject)
            .then(seventyEight.db.close);
        })
        .catch(reject);
    });
  },
  async syncData() {
    try {
      await SeventyEightSetting.all().exec();
    } catch (err) {
      throw new Error(NEEDS_INIT('syncing data'));
    }
    const Models = await getAllModels();
    const modelData = orderByRelation(Models).map(Model => {
      const jsonFile = `${dataDir}/${Model.name}.json`;
      if (fs.existsSync(jsonFile)) {
        try {
          const data = require(jsonFile);
          return [Model, data];
        } catch (err) {
          throw new Error(`failed to import ${Model.name}.json, invalid JSON \n\n  ${err.message}`);
        }
      }
      return null;
    }).filter(x => x);
    await inSerial(modelData, ([Model, data]) => Model.import(data), true);
    return 'synchronized data';
  },
  async makeMigrations(migrationName) { // eslint-disable-line max-statements
    const initMsg = 'making migrations';
    makeMigrationDir();
    const Models = await getAllModels();
    const syntaxes = await Promise.all(orderByRelation(Models).map(Model => Model.migrationSyntax()));
    let change = false;
    const sql = syntaxes
      .map((syntax) => {
        if (syntax) {
          change = true;
          return `${syntax}`;
        }
        return null;
      })
      .filter(x => x)
      .join('\n\n')
      .replace(/\n/g, indent);

    if (!change) {
      throw new Error('no changes to model schemas found');
    }

    let migrationSetting = null;
    try {
      migrationSetting = await SeventyEightSetting.where({ setting_name: LAST_MIGRATION }).one().exec();
      if (!migrationSetting) {
        throw new Error(NEEDS_INIT(initMsg));
      }
    } catch (err) {
      throw new Error(NEEDS_INIT(initMsg));
    }

    const migrations = await getAllMigrationsAfter(Number(migrationSetting.setting_value));
    if (migrations !== null) {
      throw new Error('there are unapplied migrations, please run `78 run-migrations` before creating new migrations');
    }

    const migrationNumber = Number(migrationSetting.setting_value) + 1;
    const fileName = `${padMigrationNumber(migrationNumber)}${migrationName ? `_${migrationName}` : ''}.js`;
    await fs.writeFile(`${migrationDir}/${fileName}`, migrationTemplate({ sql: escapeTicks(sql) }));
    return `created migration file: migrations/${fileName}`;
  },
  async runMigrations() {
    const initMsg = 'running migrations';
    let setting = null;
    try {
      setting = await SeventyEightSetting.where({ setting_name: LAST_MIGRATION }).one().exec();
      if (!setting) {
        throw new Error(NEEDS_INIT(initMsg));
      }
    } catch (err) {
      throw new Error(NEEDS_INIT(initMsg));
    }
    const lastMigrationId = setting.setting_value ? Number(setting.setting_value) : 0;
    logG(`db currently at migration [ ${lastMigrationId} ]`);
    const migrations = await getAllMigrationsAfter(lastMigrationId);
    if (!migrations) {
      return 'db up-to-date, no new migrations';
    }
    const newMigrationId = migrations.lastId;
    const migrationFiles = readMigrationFiles(migrations.files);
    await inSerial(migrationFiles, ({ sql }) => seventyEight.db.query(sql));
    logG(`db upgraded to migration  [ ${newMigrationId} ]`);
    await setting.update({ setting_value: newMigrationId });
    return 'migration complete';
  },
};
