// Beakermentions Endpoint (Messages.js) - An endpoint implementation of the W3C Webmention
// recommendation for Beaker Browser users.
// 
// Written in 2020 by Don Geronimo <email@sentamal.in>
//
// To the extent possible under law, the author(s) have dedicated all copyright
// and related and neighboring rights to this software to the public domain
// worldwide. This software is distributed without any warranty.
// 
// You should have received a copy of the CC0 Public Domain Dedication along
// with this software. If not, see <http://creativecommons.org/publicdomain/zero/1.0/>.

// Create an endpoint identity message
export function endpointIdentityMessage() {
  let message = {
    "type" : "endpoint"
  };
  return message;
}

export function visitorIdentityMessage() {
  let message = {
    "type" : "visitor"
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