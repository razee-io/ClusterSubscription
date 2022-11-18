const assert = require('chai').assert;

describe('logger', function () {
  afterEach(function () {
    delete require.cache[require.resolve('../lib/log')];
  });

  describe('#createLogger()', function () {
    it('should create logger with specified env var LOG_LEVEL=warn(40)', function () {
      process.env.LOG_LEVEL = 'warn';
      const log = require('../lib/log');
      assert.equal(log.level, 'warn', 'should be at log level warn(40)');
    });

    it('should create logger with log level info(30) when no LOG_LEVEL specified', function () {
      delete process.env.LOG_LEVEL;
      const log = require('../lib/log');
      assert.equal(log.level, 'info', 'should be at log level info(30)');
    });
  });
});
