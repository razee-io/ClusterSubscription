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

module.exports = class BackendService {
  constructor (sub, razeeApi, razeeApiKey, namespace) {
    this._namespace = namespace;
    this._secretName = `clustersubscription-${sub.subscriptionUuid}-secret`;
    this._razeeApi = razeeApi;
    this._razeeApiKey = razeeApiKey;
  }

  get namespace() {
    return this._namespace;
  }
  get secretName() {
    return this._secretName;
  }
  get razeeApi() {
    return this._razeeApi;
  }
  get razeeApiKey() {
    return this._razeeApiKey;
  }

  renderRequests() {
    return null;
  }
  renderAuth() {
    return null;
  }
  renderSecretData() {
    return null;
  }
};
