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

module.exports = class Git extends BackendService {
  constructor(sub, razeeApi, namespace) {
    super(sub, razeeApi, namespace);
    this._provider = sub.remote.remoteType;
    this._secretNameGit = 'satellite-config-gitops';
    sub.remote.parameters.forEach(param => {
      if (param.key == 'repo') {
        this._repo = param.value;
      } else if (param.key == 'ref') {
        this._ref = param.value;
      } else if (param.key == 'filePath') {
        this._filePath = param.value;
      } else if (param.key == 'release') {
        this._release = param.value;
      } else if (param.key == 'secretName') {
        this._secretNameGit = param.value;
      }
    });
    
  }

  get provider() {
    return this._provider;
  }

  get secretNameGit() {
    return this._secretNameGit;
  }

  get repo() {
    return this._repo;
  }

  get ref() {
    return this._ref;
  }

  get release() {
    return this._release;
  }
  
  get filePath() {
    return this._filePath;
  }

  render() {
    let rendered;
    if (this.ref) {
      const requests = {
        options: {
          git: {
            provider: '{{{provider}}}',
            repo: '{{{repo}}}',
            ref: '{{{ref}}}',
            filePath: '{{{filePath}}}'
          },
          headers: {
            'razee-org-key': {
              valueFrom: {
                secretKeyRef:{
                  name: '{{{secretName}}}',
                  namespace: '{{namespace}}',
                  key: 'razee-api-org-key'
                }
              }
            },
            Authorization: {
              valueFrom: {
                secretKeyRef:{
                  name: '{{{secretNameGit}}}',
                  namespace: '{{namespace}}',
                  key: 'token'
                }
              }
            }
          }
          
        }
      };
      const requestsTemplate = JSON.stringify(requests);
      rendered = Mustache.render(requestsTemplate, { repo: this.repo, provider: this.provider, ref: this.ref, filePath: this.filePath, secretName: this.secretName, secretNameGit: this.secretNameGit, namespace: this.namespace});
    } else if (this.release) {
      const requests = {
        options: {
          git: {
            provider: '{{{provider}}}',
            repo: '{{{repo}}}',
            release: '{{{release}}}',
            filePath: '{{{filePath}}}'
          },
          headers: {
            'razee-org-key': {
              valueFrom: {
                secretKeyRef:{
                  name: '{{{secretName}}}',
                  namespace: '{{namespace}}',
                  key: 'razee-api-org-key'
                }
              }
            },
            Authorization: {
              valueFrom: {
                secretKeyRef:{
                  name: '{{{secretNameGit}}}',
                  namespace: '{{namespace}}',
                  key: 'token'
                }
              }
            }
          }
          
        }
      };
      const requestsTemplate = JSON.stringify(requests);
      rendered = Mustache.render(requestsTemplate, { repo: this.repo, provider: this.provider, release: this.release, filePath: this.filePath, secretName: this.secretName, secretNameGit: this.secretNameGit, namespace: this.namespace});
    }
    return rendered;
  } 

};
