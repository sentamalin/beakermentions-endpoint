// Beakermentions Endpoint - BeakermentionsEndpoint.js
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

import { endpointIdentityMessage, sendMessage } from "./webmentionMessages.js";
import { sendJSONMessage, receiveJSONMessage } from "./sendJSON.js";
import { createWebmention } from "./createWebmention.js";

export class BeakermentionsEndpoint {
  #configurationFile = "/configuration.json";
  #peerEvents = beaker.peersockets.watch();
  #topic = beaker.peersockets.join("webmention");

  #blacklist = [""];
  get blacklist() { return this.#blacklist; }
  set blacklist(blacklist) {
    this.#blacklist = blacklist;
    this.blacklistLoaded(blacklist);
  }
  blacklistLoaded(blacklist) {}
  onBlacklistLoaded(eventHandler) {
    this.blacklistLoaded = eventHandler;
  }

  #whitelist = [""];
  get whitelist() { return this.#whitelist; }
  set whitelist(whitelist) {
    this.#whitelist = whitelist;
    this.whitelistLoaded(whitelist);
  }
  whitelistLoaded(whitelist) {}
  onWhitelistLoaded(eventHandler) {
    this.whitelistLoaded = eventHandler;
  }

  #response;
  get response() { return this.#response; }
  set response(response) {
    this.#response = response;
    this.responseSet(response);
  }
  responseSet(response) {}
  onResponseSet(eventHandler) {
    this.responseSet = eventHandler;
  }

  #endpoint;
  get endpoint() { return this.#endpoint; }

  #hyperdriveWritable = false;
  get hyperdriveWritable() { return this.#hyperdriveWritable; }
  set hyperdriveWritable(hyperdriveWritable)
    { this.#hyperdriveWritable = hyperdriveWritable; }

  #source;
  get source() { return this.#source; }
  set source(source) { this.#source = source; }

  #target;
  get target() { return this.#target; }
  set target(target) { this.#target = target; }

  #done;
  get done() { return this.#done; }
  set done(done) { this.#done = done; }

  /********** Constructor/Init **********/

  constructor(endpoint) {
    this.#endpoint = endpoint;
  }

  async init() {
    this.hyperdriveWritable = await beaker.hyperdrive.getInfo("/");
    await this.#loadConfigurationFile();
    if (this.hyperdriveWritable) this.#setupEndpoint();
    else this.#setupVisitor();
  }

  /********** Public Methods **********/

  async sendWebmention() {
    if (this.#checkMessageURLs(this.source, this.target)) {
      let message = sendMessage(this.source, this.target);
      let response = await createWebmention(message, this.endpoint);
      this.response = response;
    } else {
      this.response = failMessage(this.source, this.target,
        "One of the URLs are blocked.");
    }
  }

  async saveConfigurationFile() {
    let file = JSON.stringify({
      "blacklist" : this.blacklist,
      "whitelist" : this.whitelist
    });
    try {
      await beaker.hyperdrive.writeFile(this.#configurationFile, file);
    } catch {}
  }

  /********** Private Methods **********/

  async #loadConfigurationFile() {
    try {
      let fileString = await beaker.hyperdrive.readFile(this.#configurationFile);
      let file = JSON.parse(fileString);
      if (file === null) throw "errorConfigurationFile";
      else {
        this.blacklist = file.blacklist;
        this.whitelist = file.whitelist;
      }
    } catch {}
  }

  #setupEndpoint() {
    this.#peerEvents.addEventListener("join", e => {
      sendJSONMessage(endpointIdentityMessage(), e.peerId);
    });
    this.#topic.addEventListener("message", async(e) => {
      let message = receiveJSONMessage(e);
      switch(message.type) {
        case "send":
          let reply = await createWebmention(message, this.endpoint);
          sendJSONMessage(reply, e.peerId);
          break;
      }
    });
  }

  #setupVisitor() {
    this.#topic.addEventListener("message", e => {
      let message = receiveJSONMessage(e);
      switch(message.type) {
        case "endpoint":
          if (this.#checkMessageURLs(this.source, this.target)) {
            let reply = sendMessage(this.source, this.target);
            sendJSONMessage(reply, e.peerId);
          } else {
            this.response = failMessage(this.source, this.target,
              "One of the URLs are blocked.");
            this.#topic.close();
          }
          break;
        case "success":
        case "failure":
          this.response = message;
          this.#topic.close();
          break;
      }
    });
  }

  #checkMessageURLs(source, target) {
    let passesBlacklist = true;
    let passesWhitelist = false;

    if (!((this.blacklist.length === 1) && (this.blacklist[0] === "")))
      this.blacklist.forEach(url => {
        let pattern = new RegExp(url);
        if (pattern.test(source)) {
          passesBlacklist = false;
        }
      });
    if (!((this.whitelist.length === 1) && (this.whitelist[0] === "")))
      this.whitelist.forEach(url => {
        let pattern = new RegExp(url);
        if (pattern.test(target)) {
          passesWhitelist = true;
        }
      });
    else passesWhitelist = true;
  
    if (passesBlacklist && passesWhitelist) return true;
    else return false;
  }
}