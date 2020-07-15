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
    let sourceRegex = RegExp(target);

    // First, try to find the target reference through Beaker
    try {
      let sourceStat = await beaker.hyperdrive.stat(source);
      if (sourceStat.isFile() === true) {
        // Check if the source references the target in metadata
        let metadata = JSON.stringify(sourceStat.metadata);
        if (sourceRegex.test(metadata)) return true;

        // Check if the source references the target in its HTML
        let sourceFile = await beaker.hyperdrive.readFile(source, "utf8");
        if (this.#htmlRegex.test(source))
          if (this.#checkTargetInSourceHTML(sourceFile, target))
            return true;

        // Check if the source references the target in its contents
        if (regex.test(sourceFile)) return true;
        else return false;
      }
    }
    
    // If not through Beaker, use standard Fetch API requests
    catch {
      try {
        let response = await fetch(source);
        if (response.ok) {
          // Check if the source references the target in its HTML
          let sourceFile = await response.text();
          if (this.#htmlRegex.test(source))
            if (this.#checkTargetInSourceHTML(sourceFile, target))
              return true;

          // Check if the source references the target in its content
          if (sourceRegex.test(sourceFile)) return true;
          else return false;
        }
      } catch { return false; }
    }
  }

  async checkTarget(target, endpoint) {
    // First, try to find the webmention endpoint through Beaker
    try {
      let targetStat = await beaker.hyperdrive.stat(target);
      let webmentionURL = this.#getAbsoluteURL(target, targetStat.metadata.webmention);
      if (targetStat.isFile() === true) {
        // Check if the metadata mentions this endpoint as @webmention
        if (webmentionURL === endpoint) return true;

        // Check if any <a> or <link> tags mention the endpoint with @rel="webmention"
        let targetFile = await beaker.hyperdrive.readFile(target, "utf8");
        if (this.#htmlRegex.test(target))
          if (this.#checkEndpointInTargetHTML(target, targetFile, endpoint))
            return true;
        else return false;
      }
    }

    // If not through Beaker, use HTTP Link Headers and Fetch API Requests
    catch {
      try {
        let response = await fetch(target);
        if (response.ok) {
          // First, check the HTTP Link Headers
          try {
            let linkHeadersString = response.get("link");
            if (linkHeadersString === null) throw "targetNoHeader";
            let found = false;
            let linkHeaders = linkHeadersString.split(",");
            linkHeaders.forEach(element => {
              if (this.#relRegex.test(element)) {
                let url = element.match(this.#endpointRegex);
                url = this.#getAbsoluteURL(target, url.slice(1, url.length - 1));
                if (url === endpoint) found = true;
              }
            });
            if (found) return true;
            else throw "targetNoHeader";
          }

          // Then, check using Fetch API
          catch {
            let targetFile = await response.text();
            if (this.#htmlRegex.test(target))
              if (this.#checkEndpointInTargetHTML(target, targetFile, endpoint))
                return true;
            else return false;
          }
        }
      } catch { return false; }
    }
  }

  /********** Private Methods **********/

  #checkTargetInSourceHTML(sourceFile, target) {
    let sourceDom = this.#domParser.parseFromString(sourceFile, "text/html");
    let hrefQuery = `*[href="${target}"]`;
    let srcQuery = `*[src="${target}"]`;
    let hrefInDom = sourceDom.querySelector(hrefQuery);
    let srcInDom = sourceDom.querySelector(srcQuery);
    if ((hrefInDom === null) && (srcInDom === null)) return false;
    else return true;
  }

  #checkEndpointInTargetHTML(target, targetFile, endpoint) {
    let targetDom = this.#domParser.parseFromString(targetFile, "text/html");
    let relWebmention = targetDom.querySelector("*[rel='webmention']");
    if (relWebmention === null) return false;
    let relWebmentionURL = relWebmention.getAttribute("href");
    if (this.#getAbsoluteURL(target, relWebmentionURL) === endpoint) return true;
    else return false;
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