/**
 * Copyright 2022, 2023 IBM Corp. All Rights Reserved.
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

const Mustache = require('mustache');
const BackendService = require('./backendservice');

/*
razee (generic) backend:
- uses razeeApi and sub.url to build url
- uses razeeApiKey (via secret ref) as razee-org-key header on request

This is the only backend that uses razeeApi and razeeApiKey constructor args.

The naming is historical, but this backend is not truly 'generic' as it explicitly targets Razee auth.
This backend should **only** be used with Razee endpoint, as it will leak the orgKey to the URL recipient.
A truly generic backend should avoid razee-org-key by default.
*/

module.exports = class Generic extends BackendService {
  constructor(sub, razeeApi, razeeApiKey, namespace) {
    super(sub, razeeApi, razeeApiKey, namespace);

    this._url = `${this.razeeApi}/${sub.url}`;
  }

  get url() {
    return this._url;
  }

  renderRequests() {
    const requests = {
      options: {
        url: '{{{url}}}',
        headers: {
          'razee-org-key': {
            valueFrom: {
              secretKeyRef:{
                name: '{{{secretName}}}',
                namespace: '{{namespace}}',
                key: 'razee-api-org-key'
              }
            }
          }
        }
      }
    };
    const requestsTemplate = JSON.stringify(requests);
    return JSON.parse( Mustache.render( requestsTemplate, { url: this.url, secretName: this.secretName, namespace: this.namespace } ) );
  }

  renderSecretData() {
    return Buffer.from(this.razeeApiKey).toString('base64');
  }
};
