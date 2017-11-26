const { requireHelper } = require('../helper');
const { field: { primary, string, time } } = requireHelper('seventy.eight');
const utils = requireHelper('lib/migrator.utils');

describe('schema utils', () => {

  it('should not have schema validation errors', function() {
    const error = utils.schemaValidationError([
      utils.applySchemaDefaults(primary('id')),
      utils.applySchemaDefaults(string({ default: 'hello world' }, 'name')),
      utils.applySchemaDefaults(time({ default: 'now' }, 'created')),
    ]);

    expect(error).toBe(false);
  });

  it('should have schema validation type error', function() {
    const id = utils.applySchemaDefaults(primary('id'));
    id.type = 'number';
    const error = utils.schemaValidationError([id]);

    expect(error).toContain('invalid field type');
  });

});
