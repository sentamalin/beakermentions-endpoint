// Beakermentions Endpoint - index.js
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

import { BeakermentionsEndpoint } from "./modules/BeakermentionsEndpoint.js";

let Endpoint;

async function main() {
  // Initialize the environment
  Endpoint = new BeakermentionsEndpoint(`${location.protocol}//${location.host}${location.pathname}`);
  document.getElementById("endpoint").value = Endpoint.endpoint;
  let params = new URLSearchParams(document.location.search.substring(1));
  console.debug("index.main: Grabbed variables from the environment");

  // Initialize the endpoint and its event handlers
  Endpoint.onResponseSet(response => {
    updatePageResponse(response);
  });
  console.debug("index.main: Added Endpoint.onResponseSet event handler.");
  Endpoint.onBlacklistLoaded(blacklist => {
    document.getElementById("blacklist").value = blacklist.join("\n");
  });
  console.debug("index.main: Added Endpoint.onBlacklistLoaded event handler.");
  Endpoint.onWhitelistLoaded(whitelist => {
    document.getElementById("whitelist").value = whitelist.join("\n");
  });
  console.debug("index.main: Added Endpoint.onWhitelistLoaded event handler.");
  await Endpoint.init();
  if (Endpoint.hyperdriveWritable) {
    enableConfigurationSaving();
  }
  console.debug("index.main: Endpoint is ready.");
  let sendMode = params.get("source") && params.get("target");
  if (sendMode) {
    Endpoint.source = params.get("source");
    document.getElementById("send-webmention-source").value = Endpoint.source;
    Endpoint.target = params.get("target");
    document.getElementById("send-webmention-target").value = Endpoint.target;
    if (params.get("done")) { Endpoint.done = params.get("done"); }
    if (Endpoint.hyperdriveWritable) {
      console.debug("index.main: Try directly sending a webmention.");
      Endpoint.sendWebmention();
    }
  }
}

// Enable Configuration Saving
function enableConfigurationSaving() {
  document.getElementById("blacklist").removeAttribute("disabled");
  document.getElementById("whitelist").removeAttribute("disabled");
  document.getElementById("save-configuration").removeAttribute("disabled");
  document.getElementById("save-configuration").addEventListener("click", saveConfiguration);
  console.debug("index.enableConfigurationSaving: Enabled configuration saving.");
}

// Call the Endpoint to save the configuration
function saveConfiguration() {
  Endpoint.blacklist = document.getElementById("blacklist").value.split("\n");
  Endpoint.whitelist = document.getElementById("whitelist").value.split("\n");
  Endpoint.saveConfigurationFile();
}

// Update the response on the HTML
function updatePageResponse(message) {
  let response = document.querySelector(".response-container");
  let template = document.querySelector(".response");
  let clone = template.content.cloneNode(true);
  if (message.type === "success")
    clone.querySelector(".response-type").classList.add("responsePass");
  else
    clone.querySelector(".response-type").classList.add("responseFail");
  clone.querySelector(".response-type").textContent = message.type;
  clone.querySelector(".response-source").textContent = message.source;
  clone.querySelector(".response-source").setAttribute("href", message.source);
  clone.querySelector(".response-target").textContent = message.target;
  clone.querySelector(".response-target").setAttribute("href", message.target);
  clone.querySelector(".response-status").textContent = message.status;
  response.appendChild(clone);
  if (Endpoint.done) location.href = Endpoint.done;
  console.debug("index.updatePageResponse: Displayed response.");
}

main();