// Beakermentions Endpoint (index.js) - An endpoint implementation of the W3C Webmention
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

import { BeakermentionsEndpoint } from "./modules/BeakermentionsEndpoint.js";
import * as WindowMessages from "./modules/WindowMessages.js";

let Endpoint;
let appWindow = null;
let appOrigin = "*";

async function main() {
  // Initialize the environment
  Endpoint = new BeakermentionsEndpoint(`${location.protocol}//${location.hostname}${location.pathname}`, window.localStorage);
  document.getElementById("endpoint").value = Endpoint.endpoint;
  let params = new URLSearchParams(document.location.search.substring(1));
  console.debug("index.main: Grabbed variables from the environment");
  loadREADME();

  // Initialize the endpoint and its event handlers
  Endpoint.onResponseSet(response => { newResponse(response); });
  console.debug("index.main: Added Endpoint.onResponseSet event handler.");
  Endpoint.onBlacklistLoaded(blacklist => { document.getElementById("blacklist").value = blacklist.join("\n"); });
  console.debug("index.main: Added Endpoint.onBlacklistLoaded event handler.");
  Endpoint.onWhitelistLoaded(whitelist => { document.getElementById("whitelist").value = whitelist.join("\n"); });
  console.debug("index.main: Added Endpoint.onWhitelistLoaded event handler.");
  Endpoint.onApplistLoaded(applist => { document.getElementById("applist").value = applist.join("\n"); });
  console.debug("index.main: Added Endpoint.onApplistLoaded event handler.");
  document.getElementById("save-configuration").addEventListener("click", saveConfiguration);
  await Endpoint.init();
  console.debug("index.main: Endpoint is ready.");

  // If open in an <iframe> or in a child window, send ready message and reply to postMessage() events
  if ((window.opener) || (window.self !== window.top)) {
    if (window.opener) { appWindow = window.opener; }
    else { appWindow = window.parent; }

    window.addEventListener("message", event => {
      const message = JSON.parse(event.data);
      if (message.type === "origin") {
        appOrigin = event.origin;
        appWindow.postMessage(JSON.stringify(WindowMessages.sendReady(appOrigin)), appOrigin);
      }
      else if (appOrigin === event.origin) {
        switch (message.type) {
          case "send":
            Endpoint.source = message.source;
            Endpoint.target = message.target;
            Endpoint.origin = appOrigin;
            Endpoint.sendWebmention();
            break;
          case "get":
            Endpoint.target = message.target;
            Endpoint.origin = appOrigin;
            Endpoint.getWebmentions();
            break;
        }
      }
    }, false);

    appWindow.postMessage(JSON.stringify(WindowMessages.sendHandshake()), appOrigin);
  }

  // If the query strings are there, send or get webmentions
  let sendMode = params.get("source") && params.get("target");
  const getMode = params.get("get");
  if (sendMode) {
    Endpoint.source = params.get("source");
    document.getElementById("send-webmention-source").value = Endpoint.source;
    Endpoint.target = params.get("target");
    document.getElementById("send-webmention-target").value = Endpoint.target;
    if (params.get("done")) { Endpoint.done = params.get("done"); }
    Endpoint.sendWebmention();
  } else if (getMode) {
    Endpoint.target = getMode;
    Endpoint.getWebmentions();
  }
}

// Read the contents of README.md
async function loadREADME() {
  let readme = await beaker.hyperdrive.readFile("/README.md", "utf8");
  document.getElementById("readme").innerHTML = beaker.markdown.toHTML(readme);
}

// Call the Endpoint to save the configuration
function saveConfiguration() {
  Endpoint.blacklist = document.getElementById("blacklist").value.split("\n");
  Endpoint.whitelist = document.getElementById("whitelist").value.split("\n");
  Endpoint.applist = document.getElementById("applist").value.split("\n");
  Endpoint.saveConfigurationFile();
}

// Do something different if the response is from sending or getting webmentions
function newResponse(message) {
  switch (message.type) {
    case "webmentions":
      sendWebmentionsToParentWindow(message);
      break;
    case "success":
    case "failure":
      updatePageResponse(message);
      break;
  }
}

// Update the response on the HTML
function updatePageResponse(message) {
  let response = document.querySelector(".response-container");
  let template = document.querySelector(".response");
  let clone = template.content.cloneNode(true);
  if (message.type === "success") { clone.querySelector(".response-type").classList.add("responsePass"); }
  else { clone.querySelector(".response-type").classList.add("responseFail"); }
  clone.querySelector(".response-type").textContent = message.type;
  clone.querySelector(".response-source").textContent = message.source;
  clone.querySelector(".response-source").setAttribute("href", message.source);
  clone.querySelector(".response-target").textContent = message.target;
  clone.querySelector(".response-target").setAttribute("href", message.target);
  clone.querySelector(".response-status").textContent = message.status;
  response.appendChild(clone);
  if (Endpoint.done) {
    let redirect = new URL(Endpoint.done);
    redirect.search = `?result=${message.type}&source=${message.source}`;
    location.href = redirect;
  }
  console.debug("index.updatePageResponse: Displayed response.");
  sendResponseToParentWindow(message);
}

// Send messages to the parent application window
async function sendWebmentionsToParentWindow(message) {
  // If the endpoint responds to use capabilities, change all Hyperdrive links to Capability URLs
  if (message.capabilities) {
    for (let i = 0; i < message.webmentions.length; i++) {
      const url = new URL(message.webmentions[i]);
      let origin;
      if (url.protocol === "hyper:") { origin = await beaker.capabilities.create(`${url.protocol}//${url.hostname}/`); }
      else { origin = `${url.protocol}//${url.hostname}/`; }
      const newURL = new URL(url.pathname, origin);
      message.webmentions[i] = newURL.toString();
    }
  }
  sendResponseToParentWindow(message);
}

// Send response back to parent window
function sendResponseToParentWindow(message) {
  if (appWindow && (appOrigin !== "*")) {
    appWindow.postMessage(JSON.stringify(message), appOrigin);
  }
}

main();