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

import { WebmentionValidator } from "./WebmentionValidator.js";
import { MentionFilestore } from "./MentionFilestore.js";
import * as Messages from "./Messages.js";

export class BeakermentionsEndpoint {
  #thisHyperdrive = beaker.hyperdrive.drive("/");
  #configurationFile = "/configuration.json";
  #peerEvents = beaker.peersockets.watch();
  #topic = beaker.peersockets.join("webmention");
  #validator = new WebmentionValidator();

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
    try {
      let hyperdriveInfo = await this.#thisHyperdrive.getInfo();
      this.#hyperdriveWritable = hyperdriveInfo.writable;
      await this.#loadConfigurationFile();
      if (this.hyperdriveWritable) { this.#setupEndpoint(); }
      else { this.#setupVisitor(); }
    } catch (error) {
      console.error("BeakermentionsEndpoint.init:", error);
    }
  }

  /********** Public Methods **********/

  async sendWebmention() {
    try {
      if (this.#checkMessageURLsAgainstConfiguration(this.source, this.target)) {
        let message = Messages.sendMessage(this.source, this.target);
        let response = await this.#createWebmention(message, this.endpoint);
        this.response = response;
      } else {
        this.response = Messages.failMessage(this.source, this.target,
          "One of the URLs are blocked.");
      }
    } catch (error) {
      console.error("BeakermentionsEndpoint.sendWebmention:", error);
    }
  }

  async saveConfigurationFile() {
    let file = JSON.stringify({
      "blacklist" : this.blacklist,
      "whitelist" : this.whitelist
    });
    try {
      await this.#thisHyperdrive.writeFile(this.#configurationFile, file);
      console.debug("BeakermentionsEndpoint.saveConfigurationFile: Configuration saved.");
    } catch (error) {
      console.error("BeakermentionsEndpoint.saveConfigurationFile:", error);
    }
  }

  /********** Private Methods **********/

  async #loadConfigurationFile() {
    try {
      let fileString = await this.#thisHyperdrive.readFile(this.#configurationFile);
      let file = JSON.parse(fileString);
      if (file === null) throw "errorConfigurationFile";
      else {
        this.blacklist = file.blacklist;
        this.whitelist = file.whitelist;
      }
    } catch (error) {
      console.error("BeakermentionsEndpoint.#loadConfigurationFile:", error);
    }
  }

  #setupEndpoint() {
    this.#peerEvents.addEventListener("join", e => {
      this.#sendJSONMessage(Messages.endpointIdentityMessage(), e.peerId);
    });
    this.#topic.addEventListener("message", async(e) => {
      let message = this.#receiveJSONMessage(e);
      switch(message.type) {
        case "send":
          let reply = await this.#createWebmention(message, this.endpoint);
          this.#sendJSONMessage(reply, e.peerId);
          break;
      }
    });
  }

  #setupVisitor() {
    this.#topic.addEventListener("message", e => {
      let message = this.#receiveJSONMessage(e);
      switch(message.type) {
        case "endpoint":
          if (this.#checkMessageURLsAgainstConfiguration(this.source, this.target)) {
            let reply = Messages.sendMessage(this.source, this.target);
            this.#sendJSONMessage(reply, e.peerId);
          } else {
            this.response = Messages.failMessage(this.source, this.target,
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

  #sendJSONMessage(input, peerId) {
    let serialized = JSON.stringify(input);
    let message = new TextEncoder("utf-8").encode(serialized);
    this.#topic.send(peerId, message);
  }

  #receiveJSONMessage(input) {
    let message = new TextDecoder("utf-8").decode(input.message);
    let parsedJSON = JSON.parse(message);
    return parsedJSON;
  }

  #checkMessageURLsAgainstConfiguration(source, target) {
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

  async #createWebmention(input, endpoint) {
    let source = input.source;
    let target = input.target;
  
    try {
      // Create and initialize an instance of MentionFilestore
      let filePath = "/mentions/" + target;
      filePath = filePath.replace("://", "/");
      let file = new MentionFilestore(filePath + ".json");
      await file.init();
  
      // Check to see if the target is valid
      let targetValid = await this.#validator.checkTarget(target, endpoint);
      if (!targetValid) { throw "targetNotValid"; }
  
      // Check to see if the source is valid
      let sourceValid = await this.#validator.checkSource(source, target);
      if (!sourceValid) {
        // Delete the mention if the source URL is in the filestore
        if (file.mentionExists(source) > -1) {
          file.deleteMention(source);
          return Messages.successMessage(source, target, "Source URL deleted.");
        // Otherwise stop
        } else { throw "sourceNotValid"; }
      } else {
        // Write the mention into storage and send a success message
        file.addMention(source);
        return Messages.successMessage(source, target, "Source URL Added.");
      }
    } catch (error) {
      // Make all the errors human-readable, then send it as a message
      switch(error) {
        case "targetNotValid":
          error = "Target URL is not valid. Make sure that the URL exists and properly references this webmention endpoint.";
          break;
        case "sourceNotValid":
          error = "Source URL is not valid. Make sure that the URL exists and properly references the target.";
        default:
          break;
      }
      console.error("BeakermentionsEndpoint.createWebmention:", error);
      return Messages.failMessage(source, target, error);
    }
  }
}