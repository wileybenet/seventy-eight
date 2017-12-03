const seventyEight = require('../src/seventy.eight');
const { field: { primary, int, string, boolean, text, json, time, relation } } = seventyEight;

module.exports = {
  buildFullSchema() {
    return new Promise((resolve, reject) => { // eslint-disable-line max-statements
      const PageMigration = seventyEight.createModel({
        constructor: function PageMigration() {},
        schema: {
          id: primary(),
        },
      });
      const PageMigration2 = seventyEight.createModel({
        constructor: function PageMigration2() {},
        schema: {
          xxxx_xxxx: primary(),
        },
      });

      const params = {
        length: [1, 9, 130],
        signed: [true, null],
        unique: [true, null],
        indexed: [true, null],
      };

      const longTextParams = {
        indexed: [true, null],
        keyLength: [null, 10, 255],
      };

      const timeParams = {
        default: [null, 'now'],
        indexed: [true, null],
      };

      const relationParams = {
        indexed: [true, null],
        sync: [true, null],
      };

      const intParams = {
        default: [null, 0, 1, 9837],
      };
      const stringParams = {
        default: [null, 'yes', "hello world'"],
      };
      const booleanParams = {
        default: [null, true, false],
      };

      const schema = {
        id: primary(),
      };

      let fieldCount = 0;
      const setSchemaKeys = (field, props, subParams, keyFn) => {
        props.forEach(prop => {
          (subParams[prop] || []).forEach((option, optionIndex) => {
            schema[`${field.name}_${prop}_${optionIndex}_${fieldCount}`] = keyFn(prop, option);
            fieldCount += 1;
          });
        });
      };

      [int, string, boolean].forEach(field => {
        setSchemaKeys(field, Object.keys(field()), params, (prop, option) => field({ [prop]: option }));
      });

      [text, json].forEach(field => {
        setSchemaKeys(field, Object.keys(longTextParams), longTextParams, (prop, option) => {
          if (prop === 'indexed' && option) {
            return field({ [prop]: option, keyLength: 1 });
          } else if (prop === 'keyLength' && option) {
            return field({ indexed: true, [prop]: option });
          }
          return field();
        });
      });

      setSchemaKeys(time, Object.keys(timeParams), timeParams, (fieldName, option) => time({ [fieldName]: option }));

      setSchemaKeys(int, Object.keys(intParams), intParams, (fieldName, option) => int({ [fieldName]: option, length: 11 }));
      setSchemaKeys(string, Object.keys(stringParams), stringParams, (fieldName, option) => string({ [fieldName]: option, length: 255 }));
      setSchemaKeys(boolean, Object.keys(booleanParams), booleanParams, (fieldName, option) => boolean({ [fieldName]: option }));

      setSchemaKeys(relation, Object.keys(relationParams), relationParams, (fieldName, option) => relation(PageMigration, { [fieldName]: option }));
      setSchemaKeys(relation, Object.keys(relationParams), relationParams, (fieldName, option) => relation(PageMigration2, { [fieldName]: option, relationColumn: 'xxxx_xxxx' }));

      Promise.all([
        PageMigration.syncTable(),
        PageMigration2.syncTable(),
      ]).then(() => resolve(schema)).catch(reject);
    });
  },
};
