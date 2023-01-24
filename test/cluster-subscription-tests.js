const assert = require('chai').assert;
const rewire = require('rewire');
const rr_rewired = rewire('../lib/remoteResource');
let applied = [];

describe('#ClusterSubscriptionTests', async function() {
  before(function() {
    rr_rewired.__set__('NAMESPACE', 'default');
    rr_rewired.__set__('applyResource', applyResourceMock);
  });

  afterEach(function() {
    applied = [];
  });

  const applyResourceMock = function(resourceJson) {
    applied.push(resourceJson);
  };

  const razeeApi = 'testRazeeApi';
  const apiKey = 'testApiKey';
  const clusterId = 'testClusterId';

  const subRazee = {
    subscriptionName: 'testSubName',
    subscriptionUuid: 'testSubUuid',
    url: 'api/v1/channels/testConfigName/uuid',
    kubeOwnerName: null,
    remote: null
  };
  const subRemoteS3 = {
    subscriptionName: 'testSubNameRemote',
    subscriptionUuid: 'testSubRemoteUuid',
    url: null,
    kubeOwnerName: null,
    remote: {
      remoteType: 's3',
      parameters: [
        { key: 'url', value: 'dummyUrl-s3' },
        { key: 'authType', value: 'hmac' },
        { key: 'secretName', value: 'dummySecret-s3' }
      ],
    }
  };
  const subRemoteGit = {
    subscriptionName: 'testSubNameRemote',
    subscriptionUuid: 'testSubRemoteUuid',
    url: null,
    kubeOwnerName: null,
    remote: {
      remoteType: 'github',
      parameters: [
        { key: 'repo', value: 'https://github.com/razee-io/ClusterSubscription.git' },
        { key: 'ref', value: 'master' },
        { key: 'filePath', value: '*.yaml' },
        { key: 'secretname', value: 'razee-git' },
        { key: 'authentication', value: 'true' }
      ],

    }
  };
  const subRemoteGitNoAuth = {
    subscriptionName: 'testSubNameRemoteNoAuth',
    subscriptionUuid: 'testSubRemoteNoAuthUuid',
    url: null,
    kubeOwnerName: null,
    remote: {
      remoteType: 'github',
      parameters: [
        { key: 'repo', value: 'https://github.com/razee-io/ClusterSubscription.git' },
        { key: 'ref', value: 'master' },
        { key: 'filePath', value: '*.yaml' },
        { key: 'authentication', value: 'false' }
      ],
    }
  };

  const secretRazee = {
    apiVersion: 'v1',
    kind: 'Secret',
    metadata: {
      namespace: 'default',
      name: 'clustersubscription-testSubUuid-secret',
      annotations: {
        'deploy.razee.io/clustersubscription-secret': 'testSubUuid',
        'deploy.razee.io/clusterid': 'testClusterId'
      },
      labels: { 'razee/watch-resource': 'lite' }
    },
    data: { 'razee-api-org-key': 'dGVzdEFwaUtleQ==' }
  };

  const rrRazee = {
    apiVersion: 'deploy.razee.io/v1alpha2',
    kind: 'RemoteResource',
    metadata: {
      namespace: 'default',
      name: 'clustersubscription-testSubUuid',
      annotations: {
        'deploy.razee.io/clustersubscription': 'testSubUuid',
        'deploy.razee.io/clusterid': 'testClusterId'
      },
      labels: { 'razee/watch-resource': 'lite' }
    },
    spec: {
      clusterAuth: { impersonateUser: 'razeedeploy' },
      backendService: 'generic',
      requests: [ {
        options: {
          url: 'testRazeeApi/api/v1/channels/testConfigName/uuid',
          headers: { 'razee-org-key': { valueFrom: { secretKeyRef: {
            name: 'clustersubscription-testSubUuid-secret',
            namespace: 'default',
            key: 'razee-api-org-key'
          } } } }
        }
      } ]
    }
  };
  const rrS3 = {
    apiVersion: 'deploy.razee.io/v1alpha2',
    kind: 'RemoteResource',
    metadata: {
      namespace: 'default',
      name: 'clustersubscription-testSubRemoteUuid',
      annotations: {
        'deploy.razee.io/clustersubscription': 'testSubRemoteUuid',
        'deploy.razee.io/clusterid': 'testClusterId'
      },
      labels: { 'razee/watch-resource': 'lite' }
    },
    spec: {
      clusterAuth: { impersonateUser: 'razeedeploy' },
      backendService: 's3',
      auth: {
        hmac: {
          accessKeyIdRef: {
            valueFrom: {
              secretKeyRef: {
                name: 'dummySecret-s3',
                key: 'accessKeyId'
              }
            }
          },
          secretAccessKeyRef: {
            valueFrom: {
              secretKeyRef: {
                name: 'dummySecret-s3',
                key: 'secretAccessKey'
              }
            }
          }
        }
      },
      requests: [ {
        options: {
          url: 'dummyUrl-s3',
        }
      } ]
    }
  };
  const rrGit = {
    apiVersion: 'deploy.razee.io/v1alpha2',
    kind: 'RemoteResource',
    metadata: {
      namespace: 'default',
      name: 'clustersubscription-testSubRemoteUuid',
      annotations: {
        'deploy.razee.io/clustersubscription': 'testSubRemoteUuid',
        'deploy.razee.io/clusterid': 'testClusterId'
      },
      labels: { 'razee/watch-resource': 'lite' }
    },
    spec: {
      clusterAuth: { impersonateUser: 'razeedeploy' },
      backendService: 'git',
      requests: [ {
        options: {
          git: {
            provider: 'github',
            repo: 'https://github.com/razee-io/ClusterSubscription.git',
            ref: 'master',
            filePath: '*.yaml'
          },
          headers: { Authorization: { valueFrom: {
            secretKeyRef: { name: 'razee-git', namespace: 'default', key: 'token' }
          }} }
        }
      } ]
    }
  };
  const rrGitNoAuth = {
    apiVersion: 'deploy.razee.io/v1alpha2',
    kind: 'RemoteResource',
    metadata: {
      namespace: 'default',
      name: 'clustersubscription-testSubRemoteNoAuthUuid',
      annotations: {
        'deploy.razee.io/clustersubscription': 'testSubRemoteNoAuthUuid',
        'deploy.razee.io/clusterid': 'testClusterId'
      },
      labels: { 'razee/watch-resource': 'lite' }
    },
    spec: {
      clusterAuth: { impersonateUser: 'razeedeploy' },
      backendService: 'git',
      requests: [ {
        options: {
          git: {
            provider: 'github',
            repo: 'https://github.com/razee-io/ClusterSubscription.git',
            ref: 'master',
            filePath: '*.yaml'
          }
        }
      } ]
    }
  };

  it('Create razee remote resource', async function() {
    // with a razee subscription, should create a generic rr with razee-org-key secret
    await rr_rewired.createRemoteResources(razeeApi, apiKey, [subRazee], clusterId);
    assert.deepEqual(applied[0], secretRazee);
    assert.deepEqual(applied[1], rrRazee);
  });

  it('Create s3 remote resource', async function() {
    // with a s3 subscription, should create a s3 rr with razee-org-key secret
    await rr_rewired.createRemoteResources(razeeApi, apiKey, [subRemoteS3], clusterId);
    assert.deepEqual(applied[1], rrS3);
  });

  it('Create git remote resource', async function() {
    // for remote subscription with auth, should create git rr with provided parmeters and include Authorization header
    await rr_rewired.createRemoteResources(razeeApi, apiKey, [subRemoteGit], clusterId);
    assert.deepEqual(applied[1], rrGit);
  });

  it('Create git remote resource without auth', async function() {
    // for remote subscription without auth, should create git rr with provided parmeters and not include Authorization header
    await rr_rewired.createRemoteResources(razeeApi, apiKey, [subRemoteGitNoAuth], clusterId);
    assert.deepEqual(applied[1], rrGitNoAuth);
  });

  it('Multiple subs', async function() {
    // should be able to handle multiple subscriptions and create the correct rr based on subscription type
    await rr_rewired.createRemoteResources(razeeApi, apiKey, [subRazee, subRemoteS3, subRemoteGit, subRemoteGitNoAuth], clusterId);
    assert.deepEqual(applied[0], secretRazee);
    assert.deepEqual(applied[4], rrRazee);
    assert.deepEqual(applied[5], rrS3);
    assert.deepEqual(applied[6], rrGit);
    assert.deepEqual(applied[7], rrGitNoAuth);
  });
});
