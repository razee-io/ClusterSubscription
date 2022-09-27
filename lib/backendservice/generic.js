/**
 * Copyright 2022 IBM Corp. All Rights Reserved.
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

module.exports = class Generic extends BackendService {
  constructor(sub, razeeApi, namespace) {
    super(sub, razeeApi, namespace);
    this._url = `${this.razeeApi}/${sub.url}`;
  }

  get url() {
    return this._url;
  }

  render() {
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
    return Mustache.render(requestsTemplate, { url: this.url, secretName: this.secretName, namespace: this.namespace });
  }
};
