// Beakermentions Endpoint - MentionFilestore.js
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

// Define a MentionFilestore class
export class MentionFilestore {
  #thisHyperdrive;
  #path;
  #file;

  /********** Constructor **********/

  constructor(path) {
    this.#path = path;
  }

  /********** Public Methods **********/

  // Load the file, or create a blank array if the file doesn't exist
  async init() {
    let file = [];
    try {
      this.#thisHyperdrive = beaker.hyperdrive.drive("/");
      let fileString = await this.#thisHyperdrive.readFile(this.#path, "utf8");
      file = JSON.parse(fileString);
    } catch (error) {
      console.error("WebmentionFilestore.init:", error);
    } finally {
      this.#file = file;
    }
  }

  // Check to see if a source mention already exists in the store
  mentionExists(path) {
    let exists = -1;
    for (let i = 0; i < this.#file.length; i++) {
      if (this.#file[i] === path) {
        exists = i;
        break;
      }
    }
    return exists;
  }

  // Add a new mention to the store if it's not already in there
  async addMention(path) {
    try {
      let exists = this.mentionExists(path);
      if (exists === -1) {
        this.#file.push(path);
        await this.#write();
      }
    } catch (error) {
      console.error("WebmentionFilestore.addMention:", error);
    }
  }

  // Delete a mention from the store
  async deleteMention(path) {
    try {
      let exists = this.mentionExists(path);
      if (exists > -1) {
        this.#file.splice(exists, 1);
        await this.#write();
      }
    } catch (error) {
      console.error("WebmentionFilestore.deleteMention:", error);
    }
  }

  /********** Private Methods **********/

  // (Over)write the file
  async #write() {
    try {
      let fileString = JSON.stringify(this.#file);
      await this.#thisHyperdrive.writeFile(this.#path, fileString, "utf8");
    } catch (error) {
      console.error("WebmentionFilestore.#write:", error);
    }
  }
}