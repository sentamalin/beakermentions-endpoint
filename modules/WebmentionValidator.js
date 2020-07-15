// Beakermentions Endpoint - WebmentionValidator.js
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

export class WebmentionValidator {
  #domParser = new DOMParser();
  #htmlRegex = new RegExp(/\.html?$/i);
  #relRegex = new RegExp(/rel=.*webmention.*/);
  #endpointRegex = new RegExp(/<.*>/);

  /********** Public Methods **********/

  async checkSource(source, target) {
    let output = false;
    let sourceRegex = RegExp(target);
    let sourceSplit = source.split("/");
    let sourceHost = `${sourceSplit[0]}//${sourceSplit[2]}/`;
    for (let i = 0; i > 3; i++) { sourceSplit.shift(); }
    let sourcePath = `/${sourceSplit.join("/")}`;

    // First, try to find the target reference through Beaker
    try {
      let sourceHyperdrive = beaker.hyperdrive.drive(sourceHost);
      let sourceStat = await sourceHyperdrive.stat(sourcePath);
      if (sourceStat.isFile()) {
        // Check if the source references the target in metadata
        console.debug("WebmentionValidator.checkSource: Checking metadata for 'target.'");
        let metadata = JSON.stringify(sourceStat.metadata);
        if (sourceRegex.test(metadata)) { output = true; }

        // Check if the source references the target in its HTML
        if (!output) {
          console.debug("WebmentionValidator.checkSource: If HTML, checking @href/@src for 'target.'");
          let sourceFile = await sourceHyperdrive.readFile(sourcePath, "utf8");
          if (this.#htmlRegex.test(source)) {
            if (this.#checkTargetInSourceHTML(sourceFile, target)) {
              output = true;
            }
          }

          // Check if the source references the target in its contents
          if (!output) {
            console.debug("WebmentionValidator.checkSource: Checking content for 'target.'");
            if (regex.test(sourceFile)) { output = true; }
          }
        }
      }
    }
    
    // If not through Beaker, use standard Fetch API requests
    catch {
      try {
        console.debug("WebmentionValidator.checkSource: Using Hyperdrive API failed; using Fetch API.");
        let response = await fetch(source);
        if (response.ok) {
          // Check if the source references the target in its HTML
          console.debug("WebmentionValidator.checkSource: If HTML, checking @href/@src for 'target.'");
          let sourceFile = await response.text();
          if (this.#htmlRegex.test(source)) {
            if (this.#checkTargetInSourceHTML(sourceFile, target)) {
              output = true;
            }
          }

          // Check if the source references the target in its content
          if (!output) {
            console.debug("WebmentionValidator.checkSource: Checking content for 'target.'");
            if (sourceRegex.test(sourceFile)) { output = true; }
          }
        }
      } catch (error) {
        console.error("WebmentionValidator.checkSource:", error);
      }
    } finally {
      if (output) {
        console.debug("WebmentionValidator.checkSource: 'target' found in 'source.'");
      }
      return output;
    }
  }

  async checkTarget(target, endpoint) {
    let output = false;
    let targetSplit = target.split("/");
    let targetHost = `${targetSplit[0]}//${targetSplit[2]}/`;
    for (let i = 0; i > 3; i++) { targetSplit.shift(); }
    let targetPath = `/${targetSplit.join("/")}`;
    // First, try to find the webmention endpoint through Beaker
    try {
      let targetHyperdrive = beaker.hyperdrive.drive(targetHost);
      let targetStat = await targetHyperdrive.stat(targetPath);
      let webmentionURL = this.#getAbsoluteURL(target, targetStat.metadata.webmention);
      if (targetStat.isFile() === true) {
        // Check if the metadata mentions this endpoint as @webmention
        console.debug("WebmentionValidator.checkTarget: Checking metadata for @webmention.");
        if (webmentionURL === endpoint) { output = true; }

        // Check if any <a> or <link> tags mention the endpoint with @rel="webmention"
        if (!output) {
          console.debug("WebmentionValidator.checkTarget: Checking HTML for @rel=webmention.");
          let targetFile = await targetHyperdrive.readFile(target, "utf8");
          if (this.#htmlRegex.test(target)) {
            if (this.#checkEndpointInTargetHTML(target, targetFile, endpoint)) {
              output = true;
            }
          }
        }
      }
    }

    // If not through Beaker, use HTTP Link Headers and Fetch API Requests
    catch {
      try {
        console.debug("WebmentionValidator.checkTarget: Using Hyperdrive API failed; using Fetch API.");
        let response = await fetch(target);
        if (response.ok) {
          // First, check the HTTP Link Headers
          console.debug("WebmentionValidator.checkTarget: Checking HTTP Request for Link headers.");
          let linkHeadersString = response.get("link");
          if (!(linkHeadersString === null)) {
            let found = false;
            let linkHeaders = linkHeadersString.split(",");
            linkHeaders.forEach(element => {
              if (this.#relRegex.test(element)) {
                let url = element.match(this.#endpointRegex);
                url = this.#getAbsoluteURL(target, url.slice(1, url.length - 1));
                if (url === endpoint) { found = true; }
              }
            });
            if (found) { output = true; }
          } else {
            console.debug("WebmentionValidator.checkTarget: Checking HTML for @rel=webmention.");
            let targetFile = await response.text();
            if (this.#htmlRegex.test(target)) {
              if (this.#checkEndpointInTargetHTML(target, targetFile, endpoint)) {
                output = true;
              }
            }
          }
        }
      } catch (error) {
        console.error("WebmentionValidator: .checkTarget:", error);
      } finally {
        if (output) {
          console.debug("WebmentionValidator.checkSource: 'endpoint' found in 'target.'");
        }
        return output;
      }
    }
  }

  /********** Private Methods **********/

  #checkTargetInSourceHTML(sourceFile, target) {
    let output = true;
    let sourceDom = this.#domParser.parseFromString(sourceFile, "text/html");
    let hrefQuery = `*[href="${target}"]`;
    let srcQuery = `*[src="${target}"]`;
    let hrefInDom = sourceDom.querySelector(hrefQuery);
    let srcInDom = sourceDom.querySelector(srcQuery);
    if ((hrefInDom === null) && (srcInDom === null)) { output = false; }
    return output;
  }

  #checkEndpointInTargetHTML(target, targetFile, endpoint) {
    let output = false;
    let targetDom = this.#domParser.parseFromString(targetFile, "text/html");
    let relWebmention = targetDom.querySelector("*[rel='webmention']");
    if (!(relWebmention === null)) {
      let relWebmentionURL = relWebmention.getAttribute("href");
      if (this.#getAbsoluteURL(target, relWebmentionURL) === endpoint) { output = true; }
    }
    return output;
  }

  #getAbsoluteURL(baseURL, relURL) {
    let regex = RegExp(/:\/\//);
    if (regex.test(relURL)) return relURL;
    let output = baseURL.split("/");
    if (relURL.charAt(0) === "/") {
      output = output[0] + "//" + output[2] + relURL;
      return output;
    } else {
      let array = relURL.split("/");
      output.pop();
      for (let i = 0; i < array.length; i++) {
        if (array[i] === ".") continue;
        if (array[i] === "..") output.pop();
        else output.push(array[i]);
      }
      return output.join("/");
    }
  }
}