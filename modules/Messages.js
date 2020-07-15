// Beakermentions Endpoint - webmentionMessages.js
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

// Create an identity message
export function endpointIdentityMessage() {
  let message = {
    "type" : "endpoint",
  };
  return message;
}

// Create a failure message
export function failMessage(source, target, status) {
  let message = {
    "type" : "failure",
    "source" : source,
    "target" : target,
    "status" : status
  };
  return message;
}

// Create a success message
export function successMessage(source, target, status) {
  let message = {
    "type" : "success",
    "source" : source,
    "target" : target,
    "status" : status
  };
  return message;
}

// Create a send message
export function sendMessage(source, target) {
  let message = {
    "type" : "send",
    "source" : source,
    "target" : target
  };
  return message;
}