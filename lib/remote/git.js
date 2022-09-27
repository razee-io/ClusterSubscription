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

const Remote = require('./Remote');
const Mustache = require('mustache');

module.exports = class Git extends Remote {
  constructor(sub, secretName, namespace) {
    super(sub, secretName, namespace);
    this._backendservice = 'git';
    this.parameters.forEach(param => {
      if (param.key == 'repo') {
        this._repo = param.value;
      } else if (param.key == 'branch') {
        this._branch = param.value;
      } else if (param.key == 'filePath') {
        this._filePath = param.value;
      } else if (param.key == 'secretName') {
        this._secretNameGit = param.value;
      }
    });
    
  }

  get backendservice() {
    return this._backendservice;
  }

  render() {
    const requests = {
      options: {
        git: {
          provider: '{{{provider}}}',
          repo: '{{{repo}}}',
          branch: '{{{branch}}}',
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
    return Mustache.render(requestsTemplate, { repo: this._repo, provider: this.provider, branch: this._branch, filePath: this._filePath, secretName: this.secretName, secretNameGit: this.secretNameGit, namespace: this.namespace});
  }


};