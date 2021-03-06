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
var assert = require('assert');
var IfParser = require('../lib/backend/ifparser');

function IfQueue(rule){
  var p = new IfParser(rule);

  var events = [
    'resourceTag', // A resource tag (URI).
    'stateToken', // Lock ID
    'eTag', // ETag
    'not', // Not
    'startList', 'endList'
  ];

  var q = [];

  for (var i = 0; i < events.length; ++i) {
    var eventName = events[i];
    p.on(eventName, (function(eName) {
      return function () {
        q.push({
          event: eName,
          args: Array.prototype.slice.call(arguments)
        });
      };
    })(eventName));
  }

  this.q = q;
  this.p = p;

}

IfQueue.prototype.parse = function (fn) {
  var q = this.q;
  this.p.on('end', function () {
    fn(false, q);
  });
  this.p.on('error', function (e) {
    //console.log("Error! %s", e.message);
    fn(e);
  });

  this.p.parse();
}

// ==================================================================
// THE TESTS
// ==================================================================
var test0 = new IfQueue('   ');
test0.parse(function (e, queue) {
  if (e) {
    console.log(e);
  }
  console.log(queue);
  assert.equal(0, queue.length);
});

var test1 = new IfQueue('()');
test1.parse(function (e, queue) {
  if (e) {
    console.log(e);
  }
  console.log(queue);
  assert.equal(2, queue.length);
  assert.equal('startList', queue[0].event);
  assert.equal('endList', queue[1].event);
});


var test2 = new IfQueue('( <urn:uri:I❤U>)');
test2.parse(function (e, queue) {
  if (e) {
    console.log(e);
  }
  console.log(queue);
  assert.equal(queue.length, 3);
  assert.equal('startList', queue[0].event);
  assert.equal('stateToken', queue[1].event);
  assert.equal('urn:uri:I❤U', queue[1].args[0]);
  assert.equal('endList', queue[2].event);
});

// Whitespace is treated as significant inside of etags.
var test3 = new IfQueue('(   ["QBert &^%$"]  )    ');
test3.parse(function (e, queue) {
  if (e) {
    console.log(e);
  }
  console.log(queue);
  assert.equal(queue.length, 3);
  assert.equal('startList', queue[0].event);
  assert.equal('eTag', queue[1].event);
  assert.equal('"QBert &^%$"', queue[1].args[0]);
  assert.equal('endList', queue[2].event);
});

new IfQueue('(<urn> ["etag"])').parse(function (e, queue) {
  if (e) {
    console.log(e);
  }
  console.log(queue);
  assert.equal('startList', queue[0].event);
  assert.equal('stateToken', queue[1].event);
  assert.equal('urn', queue[1].args[0]);
  assert.equal('eTag', queue[2].event);
  assert.equal('"etag"', queue[2].args[0]);
  assert.equal('endList', queue[3].event);
});

new IfQueue('(Illegal values)').parse(function (e, queue) {
  assert.ok(e instanceof Error);
});

new IfQueue('(Not <urn:uri:eieio> ["etag"])').parse(function (e, queue) {
  if (e) {
    console.log(e);
    return;
  }
  console.log(queue);
  assert.equal('startList', queue[0].event);
  assert.equal('not', queue[1].event);
  assert.equal('stateToken', queue[2].event);
  assert.equal('eTag', queue[3].event);
  assert.equal('"etag"', queue[3].args[0]);
  assert.equal('endList', queue[4].event);
});

new IfQueue('(Nat <urn:uri:eieio> ["etag"])').parse(function (e, queue) {
  assert.ok(e instanceof Error);
});

new IfQueue('<urn> (["etag"])').parse(function (e, queue) {
  if (e) {
    console.log(e);
  }
  console.log(queue);
  assert.equal('resourceTag', queue[0].event);
  assert.equal('urn', queue[0].args[0]);

  assert.equal('startList', queue[1].event);
  assert.equal('eTag', queue[2].event);
  assert.equal('"etag"', queue[2].args[0]);
  assert.equal('endList', queue[3].event);
});

new IfQueue('<urn>(<foo>["etag"])').parse(function (e, queue) {
  if (e) {
    console.log(e);
  }
  console.log(queue);
  assert.equal('resourceTag', queue[0].event);
  assert.equal('urn', queue[0].args[0]);

  assert.equal('startList', queue[1].event);
  assert.equal('stateToken', queue[2].event);
  assert.equal('eTag', queue[3].event);
  assert.equal('endList', queue[4].event);
});

new IfQueue('</ref <urn:uri:eieio> ["etag"])>').parse(function (e, queue) {
  assert.ok(e instanceof Error);
});


new IfQueue('(Not ["etag1"] [W/"etag2"] <stateTag>)').parse(function (e, queue) {
  if (e) {
    console.log(e);
    return;
  }
  console.log(queue);
  assert.equal('startList', queue[0].event);
  assert.equal('not', queue[1].event);
  assert.equal('eTag', queue[2].event);
  assert.equal('"etag1"', queue[2].args[0]);
  assert.equal('eTag', queue[3].event);
  assert.equal('W/"etag2"', queue[3].args[0]);
  assert.equal('stateToken', queue[4].event);
  assert.equal('endList', queue[5].event);
});


new IfQueue('(Not ["etag1"] [W/"etag2"] <stateTag>) (<anotherTag>)').parse(function (e, queue) {
  if (e) {
    console.log(e);
    return;
  }
  console.log(queue);
  assert.equal('startList', queue[0].event);
  assert.equal('not', queue[1].event);
  assert.equal('eTag', queue[2].event);
  assert.equal('eTag', queue[3].event);
  assert.equal('stateToken', queue[4].event);
  assert.equal('endList', queue[5].event);
  assert.equal('startList', queue[6].event);
  assert.equal('stateToken', queue[7].event);
  assert.equal('endList', queue[8].event);
});

new IfQueue('(<test>) ([test]').parse(function (e, queue) {
  assert.ok(e instanceof Error);
});
new IfQueue('(<test> ([test])').parse(function (e, queue) {
  assert.ok(e instanceof Error);
});


new IfQueue('(<a>)(<b>)(<c>)(Not <d>)').parse(function (e, queue) {
  if (e) {
    console.log(e);
    return;
  }
  console.log(queue);
  assert.equal(queue.length, 13);
});

new IfQueue('<urn>(<foo>["etag"])(["foooo"])').parse(function (e, queue) {
  if (e) {
    console.log(e);
  }
  console.log(queue);
  assert.equal('resourceTag', queue[0].event);
  assert.equal('urn', queue[0].args[0]);

  assert.equal('startList', queue[1].event);
  assert.equal('stateToken', queue[2].event);
  assert.equal('eTag', queue[3].event);
  assert.equal('endList', queue[4].event);
  assert.equal('startList', queue[5].event);
  assert.equal('eTag', queue[6].event);
  assert.equal('endList', queue[7].event);
});

new IfQueue('  <urn>    (<foo>    ["etag"]   )    (   ["foooo"]   )  ').parse(function (e, queue) {
  if (e) {
    console.log(e);
  }
  console.log(queue);
  assert.equal('resourceTag', queue[0].event);
  assert.equal('urn', queue[0].args[0]);

  assert.equal('startList', queue[1].event);
  assert.equal('stateToken', queue[2].event);
  assert.equal('eTag', queue[3].event);
  assert.equal('endList', queue[4].event);
  assert.equal('startList', queue[5].event);
  assert.equal('eTag', queue[6].event);
  assert.equal('endList', queue[7].event);
});


new IfQueue('<urn> (<foo>["etag"]) <urn2> (["foooo"])').parse(function (e, queue) {
  if (e) {
    console.log(e);
  }
  console.log(queue);
  assert.equal('resourceTag', queue[0].event);
  assert.equal('startList', queue[1].event);
  assert.equal('stateToken', queue[2].event);
  assert.equal('eTag', queue[3].event);
  assert.equal('endList', queue[4].event);
  assert.equal('resourceTag', queue[5].event);
  assert.equal('startList', queue[6].event);
  assert.equal('eTag', queue[7].event);
  assert.equal('endList', queue[8].event);
});
