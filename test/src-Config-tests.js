const fs = require('fs-extra');
const assert = require('chai').assert;

function sleep(ms) {
  return new Promise(resolve => {
    setTimeout(resolve, ms);
  });
}

describe('src/Config', function () {
  afterEach(function () {
    delete require.cache[require.resolve('../src/Config')];
  });

  describe('config', function () {
    this.timeout(10000);

    it('should load default config', async function () {
      process.env.RAZEE_API = 'test-api';
      process.env.RAZEE_ORG_KEY = 'test-orgkey';
      process.env.CLUSTER_ID = 'test-clusterid';

      const Config = require('../src/Config');
      await Config.init();

      assert.equal( Config.razeeApi , 'test-api');
      assert.equal( Config.orgKey , 'test-orgkey');
      assert.equal( Config.clusterId , 'test-clusterid');
    });

    it('should load config changes', async function () {
      process.env.RAZEE_API = 'test-api';
      process.env.RAZEE_ORG_KEY = 'test-orgkey';
      process.env.CLUSTER_ID = 'test-clusterid';

      const Config = require('../src/Config');
      await Config.init();

      assert.equal( Config.razeeApi , 'test-api');
      assert.equal( Config.orgKey , 'test-orgkey');
      assert.equal( Config.clusterId , 'test-clusterid');

      try {
        for( path of [ Config.razeeApiPath, Config.orgKeyPath, Config.clusterIdPath ] ) {
          const pathExists = await fs.pathExists(path);
          assert.equal( pathExists, false, `mounted config '${path}' is not expected to exist prior to running the test` );
          await fs.outputFile( path, 'new-val' );
        }

        // wait for async automatic reload to complete
        await sleep(1000);

        assert.equal( Config.razeeApi , 'new-val');
        assert.equal( Config.orgKey , 'new-val');
        assert.equal( Config.clusterId , 'new-val');
      }
      catch( e ) {
        assert.equal( e, null, `no error expected, received: ${e.message}` );
      }
      finally {
        // clean up files
        for( path of [ Config.razeeApiPath, Config.orgKeyPath, Config.clusterIdPath ] ) {
          await fs.remove( path );
        }
      }
    });
  });
});
