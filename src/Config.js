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

const fs = require('fs-extra');
const chokidar = require('chokidar');

module.exports = class Config {
  static razeeApiPath = 'envs/razee-identity-config/RAZEE_API';
  static clusterIdPath = 'envs/razee-identity-config/CLUSTER_ID';

  static razeeApi = process.env.RAZEE_API;
  static clusterId = process.env.CLUSTER_ID;

  static watcher;

  static async readRazeeApi() {
    if (await fs.pathExists(this.razeeApiPath)) {
      this.razeeApi = ((await fs.readFile(this.razeeApiPath, 'utf8')).trim() || this.razeeApi);
    }
  }

  static async readClusterId() {
    if (await fs.pathExists(this.clusterIdPath)) {
      this.clusterId = ((await fs.readFile(this.clusterIdPath, 'utf8')).trim() || this.clusterId);
    }
  }

  static async init() {
    await this.readRazeeApi();
    await this.readClusterId();
  }

  static {
    this.watcher = chokidar.watch('./envs/', { ignoreInitial: true }).on('all', (event, path) => {
      if (event === 'add' || event === 'change') {
        if (path === this.razeeApiPath) {
          this.readRazeeApi();
        }

        if (path === this.clusterIdPath) {
          this.readClusterId();
        }
      }
    });
  }
};
