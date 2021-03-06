/**
 * (c) Copyright 2015 Hewlett-Packard Development Company, L.P.
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *     http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */
/**
 * Given a resource bridge, load a resource.
 *
 * Params:
 * - resourceBridge: an instance of a webdav.ResourceBridge (REQUIRED)
 * - name: If given, the name of the resource. If this is not specified,
 *   the request path will be used.
 * - addDatasource: If this is set to `true` then the resource will be
 *   added as a datasource, which makes it usable in `from()` clauses.
 * - skipBody: If set to true, this will not make the body of the
 *   document available. For network-based backends, this can save much
 *   network overhead.
 */

var pronto = require('pronto');

function LoadResource() {
}
module.exports = LoadResource;
pronto.inheritsCommand(LoadResource);

LoadResource.prototype.execute = function (cxt, params) {
  this.required(params, ['resourceBridge']);

  this.bridge = params.resourceBridge;
  this.cxt = cxt;
  this.addDatasource = params.addDatasource || false;
  this.skipBody = params.skipBody || false;

  var name = params.name || cxt.getDatasource('request').parsedUrl.pathname;
  cxt.log("Loading resource %s", name, "debug");
  this.load(name);
}

LoadResource.prototype.load = function(name) {
  var cmd = this;
  var cxt = this.cxt;

  this.bridge.load(name, this.skipBody, function (e, resource) {
    // FIXME: What should be done here?
    if (e) {
      //console.log(e);
      cxt.log("Load error: " + e.message, 'info');

      if (!e.status) {
        cxt.log('No code was set: ' + e.message, 'warning');
        cmd.reroute('@500', cmd.cxt);
        return;
      }

      switch (e.status) {
        case 404:
          break;
        case 403:
          cmd.reroute('@403', cmd.cxt);
          return;
        case 500:
        default:
          cxt.log('A low level i/o error occured: ' + e.message, 'warning');
          cmd.reroute('@500', cmd.cxt);
          return;
      }
    }

    // If we should add a datasource, put the resource in as a
    // datasource with the name of the command. This makes
    // `from('resource:stream')` work.
    if (cmd.addDatasource) {
      cxt.addDatasource(cmd.name, resource);
    }
    cmd.done(resource);
  });
}
