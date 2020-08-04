// Beakermentions Endpoint (BeakermentionsEndpoint.js) - An endpoint implementation of
// the W3C Webmention recommendation for Beaker Browser users.
// 
// Written in 2020 by Don Geronimo <email@sentamal.in>
//
// To the extent possible under law, the author(s) have dedicated all copyright
// and related and neighboring rights to this software to the public domain
// worldwide. This software is distributed without any warranty.
// 
// You should have received a copy of the CC0 Public Domain Dedication along
// with this software. If not, see <http://creativecommons.org/publicdomain/zero/1.0/>.

import { WebmentionValidator } from "./Validator/index.js";
import { MentionFilestore } from "./MentionFilestore.js";
import * as Messages from "./Messages.js";

export class BeakermentionsEndpoint {
  #peerEvents;
  #peers;
  #topic;
  #validator = new WebmentionValidator();
  #storage;
  #currentRequest;

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
    clearTimeout(this.#responseTimeout);
    this.#response = response;
    this.responseSet(response);
  }
  responseSet(response) {}
  onResponseSet(eventHandler) {
    this.responseSet = eventHandler;
  }
  #responseTimeout;

  #endpoint;
  get endpoint() { return this.#endpoint; }

  #source;
  get source() { return this.#source; }
  set source(source) { this.#source = source; }

  #target;
  get target() { return this.#target; }
  set target(target) { this.#target = target; }

  #done;
  get done() { return this.#done; }
  set done(done) { this.#done = done; }

  #isIndexedDB;
  get isIndexedDB() { return this.#isIndexedDB; }
  set isIndexedDB(isIndexedDB) {
    this.#isIndexedDB = isIndexedDB;
    this.isIndexedDBLoaded(isIndexedDB);
  }
  isIndexedDBLoaded(isIndexedDB) {}
  onIsIndexedDBLoaded(eventHandler) {
    this.isIndexedDBLoaded = eventHandler;
  }

  #useCapabilities;
  get useCapabilities() { return this.#useCapabilities; }
  set useCapabilities(useCapabilities) {
    this.#useCapabilities = useCapabilities;
    this.useCapabilitiesLoaded(useCapabilities);
  }
  useCapabilitiesLoaded(useCapabilities) {}
  onUseCapabilitiesLoaded(eventHandler) {
    this.useCapabilitiesLoaded = eventHandler;
  }

  /********** Constructor/Init **********/

  constructor(endpoint, storage) {
    this.#endpoint = endpoint;
    this.#storage = storage;
  }

  async init() {
    try {
      this.#loadConfigurationFile();
      this.#setupPeerList();
      this.#topic = beaker.peersockets.join("webmention");
      this.#setupMessaging();
    } catch (error) {
      console.error("BeakermentionsEndpoint.init:", error);
    }
  }

  /********** Public Methods **********/

  async sendWebmention() {
    const url = new URL(this.#target);
    const origin = `hyper://${url.hostname}/`;
    const info = await beaker.hyperdrive.getInfo(origin);
    if (info.writable) {
      try {
        if (this.#checkMessageURLsAgainstConfiguration({
          source: this.source,
          target: this.target
        })) {
          let message = Messages.sendMessage(this.source, this.target);
          let response = await this.#createWebmention(message, this.endpoint);
          this.response = response;
        } else {
          this.response = Messages.failMessage(this.source, this.target, "One of the URLs are blocked.");
        }
      } catch (error) {
        console.error("BeakermentionsEndpoint.sendWebmention:", error);
      }
    } else {
      this.#currentRequest = "send";
      await this.#sendVisitorMessage();
    }
  }

  async getWebmentions() {
    const url = new URL(this.#target);
    const origin = `hyper://${url.hostname}/`;
    const info = await beaker.hyperdrive.getInfo(origin);
    if (info.writable) {
      try {
        if (this.#checkMessageURLsAgainstConfiguration({
          target: this.target
        })) {
          let message = Messages.getMessage(this.target);
          let response = await this.#getWebmentions(message, this.endpoint);
          this.response = response;
        }
      } catch (error) {
        console.error("BeakermentionsEndpoint.getWebmentions:", error);
      }
    } else {
      this.#currentRequest = "get";
      await this.#sendVisitorMessage();
    }
  }

  async saveConfigurationFile() {
    this.#storage.setItem("blacklist", JSON.stringify(this.blacklist));
    this.#storage.setItem("whitelist", JSON.stringify(this.whitelist));
    if (this.#isIndexedDB) { this.#storage.setItem("isIndexedDB", "true"); }
    else { this.#storage.setItem("isIndexedDB", "false"); }
    if (this.#useCapabilities) { this.#storage.setItem("useCapabilities", "true"); }
    else { this.#storage.setItem("useCapabilities", "false"); }

    // Save and delete a temporary file in each whitelisted drive to ask for write permissions.
    for (let i = 1; i < this.#whitelist.length; i++) {
      const hyperdrive = beaker.hyperdrive.drive(this.#whitelist[i]);
      await hyperdrive.writeFile("/tmp-beakermentions", "", "utf8");
      await hyperdrive.unlink("/tmp-beakermentions");
    }

    console.debug("BeakermentionsEndpoint.saveConfigurationFile: Configuration saved to local storage.");
  }

  /********** Private Methods **********/

  async #checkTarget(target, endpoint) {
    let output = false;
    let targetEndpoint = await this.#validator.getTargetEndpoint(target);
    if (targetEndpoint !== null) {
      if (targetEndpoint = endpoint) { output = true; }
    }
    return output;
  }

  #loadConfigurationFile() {
    if (this.#storage.getItem("blacklist")) { this.blacklist = JSON.parse(this.#storage.getItem("blacklist")); }
    if (this.#storage.getItem("whitelist")) { this.whitelist = JSON.parse(this.#storage.getItem("whitelist")); }
    if (this.#storage.getItem("isIndexedDB")) {
      if (this.#storage.getItem("isIndexedDB") === "true") { this.isIndexedDB = true; }
    } else { this.isIndexedDB = false; }
    if (this.#storage.getItem("useCapabilities")) {
      if (this.#storage.getItem("useCapabilities") === "true") { this.useCapabilities = true; }
    } else { this.useCapabilities = false; }
  }

  #setupPeerList() {
    this.#peerEvents = beaker.peersockets.watch();
    this.#peers = new Set();
    this.#peerEvents.addEventListener("join", e => {
      this.#peers.add(e.peerId);
      console.debug("BeakermentionsEndpoint: Peer joined -", e.peerId);
    });
    this.#peerEvents.addEventListener("leave", e => {
      this.#peers.delete(e.peerId);
      console.debug("BeakermentionsEndpoint: Peer left -", e.peerId);
    });
    console.debug("BeakermentionsEndpoint.#setupPeerList: Peer list set up.");
  }

  #setupMessaging() {
    this.#topic.addEventListener("message", async(e) => {
      const message = this.#receiveJSONMessage(e);
      let reply;
      let url;
      let origin;
      let info;

      switch(message.type) {
        case "visitor":
          const hashInList = await this.#checkHashAgainstWhitelist(message.hash);
          if (hashInList) {
            reply = Messages.endpointIdentityMessage();
            this.#sendJSONMessage(reply, e.peerId);
            console.debug("BeakermentionsEndpoint: Visitor message has whitelisted hash; sending Endpoint message.");
          }
          break;
        case "endpoint":
          console.debug("BeakermentionsEndpoint: Endpoint message received.");
          switch(this.#currentRequest) {
            case "send":
              if (this.source && this.target) {
                reply = Messages.sendMessage(this.source, this.target);
                this.#sendJSONMessage(reply, e.peerId);
                console.debug("BeakermentionsEndpoint: Source and Target set; sent Send message.");
              }
              break;
            case "get":
              if (this.target) {
                reply = Messages.getMessage(this.target);
                this.#sendJSONMessage(reply, e.peerId);
                console.debug("BeakermentionsEndpoint: Target set; sent Get message.");
              }
              break;
          }
          break;
        case "send":
          url = new URL(message.target);
          origin = `hyper://${url.hostname}/`;
          info = await beaker.hyperdrive.getInfo(origin);
          if (info.writable) {
            if (this.#checkMessageURLsAgainstConfiguration({
              source: message.source,
              target: message.target
            })) {
              reply = await this.#createWebmention(message, this.endpoint);
              console.debug("BeakermentionsEndpoint: Send message checks out; sending Success message.");
            } else {
              reply = Messages.failMessage(message.source, message.target, "One of the URLs are blocked.");
              console.debug("BeakermentionsEndpoint: URLs are blocked; sending Fail message.");
            }
          } else {
            reply = Messages.failMessage(message.source, message.target, "The Target URL's Webmention store is not writable.");
            console.debug("BeakermentionsEndpoint: Can't write to webmention store; sending Fail message.");
          }
          this.#sendJSONMessage(reply, e.peerId);
          break;
        case "get":
          url = new URL(this.#target);
          origin = `hyper://${url.hostname}/`;
          info = await beaker.hyperdrive.getInfo(origin);
          if (info.writable) {
            if (this.#checkMessageURLsAgainstConfiguration({
              target: this.target
            })) {
              reply = await this.#getWebmentions(message, this.endpoint);
              console.debug("Get message checks out; sending Webmentions message.");
            } else {
              reply = Messages.failMessage("null", message.target, "The Target URL is not in the whitelist.");
              console.debug("Beakermentions Endpoint: Target URL is not in the whitelist; sending Fail message.");
            }
          } else {
            reply = Messages.failMessage("null", message.target, "The Target URL's Webmention store is not available.");
            console.debug("BeakermentionsEndpoint: Can't write to webmention store; sending Fail message.");
          }
          this.#sendJSONMessage(reply, e.peerId);
          break;
        case "success":
        case "failure":
        case "webmentions":
          this.response = message;
          break;
      }
    });
    console.debug("BeakermentionsEndpoint.#setupMessaging: Message listeners set up.");
  }

  async #getHash(target) {
    const url = new URL(target);
    const origin = `hyper://${url.hostname}/`;
    const output = await this.#sha256sum(origin);
    return output;
  }

  async #checkHashAgainstWhitelist(hash) {
    let output = false;
    for (let i = 0; i < this.#whitelist.length; i++) {
      const whitelistHash = await this.#getHash(this.#whitelist[i]);
      if (whitelistHash === hash) {
        output = true;
        break;
      }
    }
    return output;
  }

  async #sha256sum(message) {
    // Utilize the Web Cryptography API instead of importing another source
    // Obtained from https://developer.mozilla.org/en-US/docs/Web/API/SubtleCrypto/digest
    const msgUint8 = new TextEncoder().encode(message);
    const hashBuffer = await crypto.subtle.digest('SHA-256', msgUint8);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    const hashHex = hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
    return hashHex;
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

  #checkMessageURLsAgainstConfiguration(options) {
    let passesBlacklist = true;
    let passesWhitelist = false;
    let source = null;
    let target = null;
    if (options.source) { source = options.source; }
    if (options.target) { target = options.target; }

    if (source) {
      if (!((this.blacklist.length === 1) && (this.blacklist[0] === ""))) {
        this.blacklist.forEach(url => {
          let pattern = new RegExp(url);
          if (pattern.test(source)) {
            passesBlacklist = false;
          }
        });
      }
    }
    if (!((this.whitelist.length === 1) && (this.whitelist[0] === ""))) {
      this.whitelist.forEach(url => {
        let pattern = new RegExp(url);
        if (pattern.test(target)) {
          passesWhitelist = true;
        }
      });
    } else { passesWhitelist = true; }
  
    if (passesBlacklist && passesWhitelist) { return true; }
    else { return false; }
  }

  async #createWebmention(input, endpoint) {
    let source = input.source;
    let target = input.target;
  
    try {
      // Create and initialize an instance of MentionFilestore
      let file = new MentionFilestore(`${target}.webmention`);
      await file.init();
  
      // Check to see if the target is valid
      let targetValid = await this.#checkTarget(target, endpoint);
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

  async #sendVisitorMessage() {
    for (let peer of this.#peers) {
      const hash = await this.#getHash(this.target);
      this.#sendJSONMessage(Messages.visitorIdentityMessage(hash), peer);
    }
    this.#responseTimeout = setTimeout(() => {
      this.response = Messages.failMessage(this.source, this.target, "No peers around that has whitelisted target URL's origin.");
    }, 60000);
  }

  async #getWebmentions(input, endpoint) {
    const target = input.target;
    let mentions = [];
    try {
      // Check to see if the target is valid
      let targetValid = await this.#checkTarget(target, endpoint);
      if (!targetValid) { throw "Target URL is not valid. Make sure that the URL exists and properly references this webmention endpoint."; }

      // STUB: If the endpoint stores webmentions using IndexedDB, grab the webmentions from the database
      if (this.#isIndexedDB) {
      }

      // Else, grab the webmentions from the target URL's .webmention file
      else {
        let mentionsFile = await beaker.hyperdrive.readFile(`${target}.webmention`, "utf8");
        mentions = JSON.parse(mentionsFile);
      }

      return Messages.webmentionsMessage(target, JSON.stringify(mentions), this.useCapabilities, "Webmentions fetched successfully.");
    } catch (error) {
      console.error("BeakermentionsEndpoint.#getWebmentions:", error);
      return Messages.failMessage("null", target, error);
    }
  }
}