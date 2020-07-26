// Beakermentions Endpoint (MentionFilestore.js) - An endpoint implementation of the W3C
// Webmention recommendation for Beaker Browser users.
// 
// Written in 2020 by Don Geronimo <email@sentamal.in>
//
// To the extent possible under law, the author(s) have dedicated all copyright
// and related and neighboring rights to this software to the public domain
// worldwide. This software is distributed without any warranty.
// 
// You should have received a copy of the CC0 Public Domain Dedication along
// with this software. If not, see <http://creativecommons.org/publicdomain/zero/1.0/>.

export class MentionFilestore {
  #thisHyperdrive;
  #path;
  #file;

  /********** Constructor **********/

  constructor(path) {
    const url = new URL(path);
    this.#thisHyperdrive = beaker.hyperdrive.drive(`hyper://${url.hostname}/`);
    this.#path = url.pathname;
  }

  /********** Public Methods **********/

  // Load the file, or create a blank array if the file doesn't exist
  async init() {
    let file = [];
    try {
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