// Beakermentions Endpoint - sendJSON.js
// © 2020 [Don Geronimo][1]
//
// To the extent possible under law, [Don Geronimo][1] has waived all copyright
// and related or neighboring rights to [Beakermentions Endpoint][2] by publishing it
// under the [CC0 1.0 Universal Public Domain Dedication][3]. This work is
// published from the United States.
// 
// [1]: hyper://9fa076bdc2a83f6d0d32ec010a71113b0d25eccf300a5eaedf72cf3326546c9a/
// [2]: hyper://c34b768fb205adbcd22474177f1b24ba202a44da171b452ec5aef6cd4e744d25/
// [3]: /LICENSE.md

// Send JSON Message
export function sendJSONMessage(input, peerId, topic) {
  let serialized = JSON.stringify(input);
  let message = new TextEncoder("utf-8").encode(serialized);
  topic.send(peerId, message);
}

// Receive JSON Message
export function receiveJSONMessage(input) {
  let message = new TextDecoder("utf-8").decode(input.message);
  let parsedJSON = JSON.parse(message);
  return parsedJSON;
}