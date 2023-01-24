/**
 * Copyright 2023 IBM Corp. All Rights Reserved.
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *      http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

const BackendService = require('./backendservice');

/*
S3 backend is similar to razee (generic) backend but
- gets url from sub.remote.parameters instead of building from razeeApi and sub.url
- has S3 authentication support from a separate secret rather than using razeeApiKey saved in the clustersubscription-[uuid]-secret

Current limitations:
- Only supports `hmac` for authType (`iam` not fully implemented)
- The secret must be in the same namespace as the remoteresource (could take from adittional sub.remote.parameters)
- The secret keys must be `accessKeyId` / `secretAccessKey` (could take from adittional sub.remote.parameters)
*/

module.exports = class S3 extends BackendService {
  constructor(sub, razeeApi, razeeApiKey, namespace) {
    super(sub, null, null, namespace);  // razeeApi and razeeApiKey are unused for S3 backend

    this._url = null; // no default
    this._secretNameS3 = 'razee-s3';
    this._authType = 'hmac'; // hmac | iam
    sub.remote.parameters.forEach(param => {
      if (param.key == 'secretName') {
        this._secretNameS3 = param.value;
      } else if (param.key == 'authType' && param.value.toLowerCase() === 'iam') {
        this._authType = 'iam';
      } else if (param.key == 'url') {
        this._url = param.value;
      }
    });
  }

  get url() {
    return this._url;
  }
  get secretNameS3() {
    return this._secretNameS3;
  }
  get authType() {
    return this._authType;
  }

  renderRequests() {
    const requests = {
      options: {
        url: this.url,
      }
    };
    return requests;
  }

  renderAuth() {
    const auth = {};
    if( this.authType === 'hmac' ) {
      auth[ this.authType ] = {
        accessKeyIdRef: {
          valueFrom: {
            secretKeyRef: {
              name: this.secretNameS3,
              key: 'accessKeyId'
            }
          }
        },
        secretAccessKeyRef: {
          valueFrom: {
            secretKeyRef: {
              name: this.secretNameS3,
              key: 'secretAccessKey'
            }
          }
        }
      };
    }
    else if( this.authType === 'iam' ) {
      auth[ this.authType ] = {
        url: 'incomplete_implementation', // E.g. 'https://iam.cloud.ibm.com/identity/token'
        grantType: 'incomplete_implementation', // E.g. 'urn:ibm:params:oauth:grant-type:apikey'
        apiKeyRef: {
          valueFrom: {
            secretKeyRef: {
              name: this.secretNameS3,
              key: 'apiKey'
            }
          }
        }
      };
      throw new Error( 'iam authentication is not yet supported' ); // Requires support for getting correct url and grantType
    }
    return( auth );
  }
};
