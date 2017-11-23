const { requireHelper } = require('../helper');
var utils = requireHelper('lib/migrator.utils');

describe('schema utils', () => {

  it('should not have schema validation errors', function() {
    const error = utils.schemaValidationError([
      utils.applySchemaDefaults({ name: 'id', type: 'int', primary: true, autoIncrement: true }),
      utils.applySchemaDefaults({ name: 'name', type: 'string', default: 'hello world' }),
      utils.applySchemaDefaults({ name: 'created', type: 'time', default: 'now' }),
    ]);

    expect(error).toBe(false);
  });

  it('should have schema validation type error', function() {
    const error = utils.schemaValidationError([
      utils.applySchemaDefaults({ name: 'id', type: 'number', primary: true, autoIncrement: true }),
    ]);

    expect(error).toContain('invalid field type');
  });

  it('should have schema validation primary error', function() {
    const error = utils.schemaValidationError([
      utils.applySchemaDefaults({ name: 'id', type: 'int' }),
    ]);

    expect(error).toContain('primary field needed');
  });

});
