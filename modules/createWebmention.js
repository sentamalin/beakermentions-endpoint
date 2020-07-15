// Beakermentions Endpoint - createWebmention.js
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
import { failMessage,
         successMessage } from "./webmentionMessages.js";

// Create/Delete Webmentions
export async function createWebmention(input, endpoint) {
  let source = input.source;
  let target = input.target;
  let validator = new WebmentionValidator();

  try {
    // Create and initialize an instance of MentionFilestore
    let filePath = "/mentions/" + target;
    filePath = filePath.replace("://", "/");
    let file = new MentionFilestore(filePath + ".json");
    await file.init();

    // Check to see if the target is valid
    if (!validator.checkTarget(target, endpoint)) throw "targetNotValid";

    // Check to see if the source is valid
    if (!validator.checkSource(source, target)) {
      // Delete the mention if the source URL is in the filestore
      if (file.mentionExists(source) > -1) {
        file.deleteMention(source);
        return successMessage(source, target, "Source URL deleted.");
      // Otherwise stop
      } else throw "sourceNotValid";
    } else {
      // Write the mention into storage and send a success message
      file.addMention(source);
      return successMessage(source, target, "Source URL Added.");
    }
  } catch (error) {
    // Make all the errors human-readable, then send it as a message
    switch(error) {
      case "targetNotValid":
        error = "Target URL is not valid. Make sure that the URL exists and properly references the source URL.";
        break;
      case "sourceNotValid":
        error = "Source URL is not valid. Make sure that the URL exists and properly references the webmention endpoint.";
      default:
        break;
    }
    console.error("endpoint:", error);
    return failMessage(source, target, error);
  }
}