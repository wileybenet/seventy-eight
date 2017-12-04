/* eslint-disable no-sync */
const fs = require('fs-extra');
const { log, indent, modelDir, migrationDir, makeModelDir, makeMigrationDir, getTemplate } = require('../../utils');
const _ = require('lodash');
const seventyEight = require('../../seventy.eight');
const { getModel, field: { primary, string } } = seventyEight;

const logG = log('green');

process.env.CONNECTED_TO_78 = true;

const LAST_MIGRATION = 'last_migration';
const NEEDS_INIT = 'please run `78 init` before making migrations';

const migrationTemplate = getTemplate('migration');

const escapeTicks = str => str.replace(/`/g, '\\`');

const pad = (num, zeros) => {
  const backwards = `${num}`.split('').reverse().join('');
  return `${backwards}00000000`.substr(0, zeros).split('').reverse().join('');
};

const inSerial = async (items, promiser) => {
  for (const item of items) {
    await promiser(item); // eslint-disable-line no-await-in-loop
  }
};

const orderByRelation = Models => {
  const models = Models.map(({ Model }) => Model);
  const modelIndex = models.reduce((memo, Model) => {
    memo[Model.name] = Model;
    return memo;
  }, {});
  const order = models.filter(Model => {
    if (!Model.getSchema().find(field => field.relation)) {
      delete modelIndex[Model.name];
      return true;
    }
    return false;
  });
  const addRelations = modelGroup => modelGroup.forEach(Model => {
    if (modelIndex[Model.name]) {
      delete modelIndex[Model.name];
      addRelations(Model.getRelations().map(getModel));
      order.push(Model);
    }
  });
  addRelations(models);
  return order;
};

const requireModel = name => new Promise((resolve, reject) => {
  try {
    const Model = require(`${modelDir}/${name}`);
    resolve({ Model });
  } catch (err) {
    reject(err);
  }
});

const getAllModels = () => new Promise((resolve, reject) => {
  fs.readdir(modelDir, (err, items) => {
    if (err) {
      return reject(err);
    }
    Promise.all(items.filter(item => item.match(/\.js$/)).map(model => requireModel(model)))
      .then(resolve)
      .catch(reject);
  });
});

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
  init() {
    return new Promise((resolve, reject) => {
      makeModelDir();
      makeMigrationDir();
      SeventyEightSetting
        .syncTable()
        .then(() => Promise.all([
           new SeventyEightSetting({ setting_name: LAST_MIGRATION, setting_value: 0 }).save(),
         ]))
         .then(() => {
           resolve('initialized');
         })
        .catch(reject);
    });
  },
  syncTable(modelName) {
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
  makeMigrations(migrationName) {
    return new Promise((resolve, reject) => {
      makeMigrationDir();
      getAllModels()
        .then(Models => {
          Promise.all(orderByRelation(Models).map(Model => Model.migrationSyntax()))
            .then(syntaxes => {
              let change = false;
              const sql = syntaxes
                .map((syntax, index) => {
                  if (syntax) {
                    change = true;
                    return `${syntax};`;
                  }
                  return `/* ${Models[index].Model.tableName} (no changes) */`;
                })
                .join('\n\n')
                .replace(/\n/g, indent);

              if (!change) {
                return reject('no changes to model schemas found');
              }
              SeventyEightSetting.where({ setting_name: LAST_MIGRATION }).one()
                .then(migrationSetting => {
                  if (!migrationSetting) {
                    return reject(NEEDS_INIT);
                  }
                  getAllMigrationsAfter(Number(migrationSetting.setting_value))
                    .then(migrations => {
                      if (migrations !== null) {
                        return reject('there are unapplied migrations, please run `78 run-migrations` before creating new migrations');
                      }
                      const migrationNumber = Number(migrationSetting.setting_value) + 1;
                      const fileName = `${pad(migrationNumber, 5)}${migrationName ? `_${migrationName}` : ''}.js`;
                      fs.writeFile(`${migrationDir}/${fileName}`, migrationTemplate({ sql: escapeTicks(sql) }))
                        .then(() => resolve(`created migration file: migrations/${fileName}`))
                        .catch(reject);
                    })
                    .catch(reject);
                })
                .catch(() => reject(NEEDS_INIT));
            })
            .catch(reject);
        })
        .catch(reject);
    });
  },
  runMigrations() {
    return new Promise((resolve, reject) => {
      let migrationSetting = null;
      let newMigrationId = null;
      SeventyEightSetting.where({ setting_name: LAST_MIGRATION }).one()
        .then(foundSetting => {
          if (!foundSetting) {
            return reject(NEEDS_INIT);
          }
          migrationSetting = foundSetting;
          const lastMigrationId = migrationSetting.setting_value ? Number(migrationSetting.setting_value) : 0;
          logG(`db currently at migration [${lastMigrationId}]`);
          getAllMigrationsAfter(lastMigrationId)
            .then(migrations => {
              if (!migrations) {
                return resolve('db already up-to-date, no new migrations to run');
              }
              return migrations;
            })
            .then(migrations => {
              getAllModels()
                .then(Models => Models.reduce((memo, Model) => {
                  memo[Model.name] = Model;
                  return memo;
                }, {}))
                .then(modelIndex => {
                  newMigrationId = migrations.lastId;
                  const migrationFiles = readMigrationFiles(migrations.files);
                  return inSerial(migrationFiles, ({ sql, data = null }) => new Promise((serialResolve, serialReject) => {
                    seventyEight.db.query(sql)
                      .then(() => {
                        let dataPromise = Promise.resolve(null);
                        if (typeof data === 'function') {
                          dataPromise = data(modelIndex);
                        }
                        return dataPromise;
                      })
                      .then(serialResolve)
                      .catch(serialReject);
                  }));
                })
                .then(() => {
                  logG(`db upgraded to migration [${newMigrationId}]`);
                  return migrationSetting.update({ setting_value: newMigrationId });
                })
                .then(() => resolve('migration complete'))
                .catch(reject);
            })
            .catch(reject);
        }, () => reject(NEEDS_INIT));
    });
  },
};
