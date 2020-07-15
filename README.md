# 📡 Beakermentions Endpoint

[Beakermentions Endpoint][1] is an endpoint implementation of the [W3C][2] [Webmention][3] recommendation for [Beaker Browser][4] users. Webmentions are a simple way to notify any URL when you mention it from another URL. This implementation utilizes Beaker Browser's [`hyperdrive`][5] and [`peersockets`][6] API. Deviations exist from the official recommendation due to the unique environment Beaker Browser provides:

* The `source` may reference the `target` URL of the Webmention through the file's metadata keys (like `@inReplyTo`, `@likeOf`, `@rsvpTo`, etc.) in addition to the file's content.

* The sender may look for a metadata key `@webmention` in the `target`'s URL to discover the `target`'s Beakermentions Endpoint in addition to the sender looking for an HTTP link header, a `<link>` element, or an `<a>` element with a `@rel` value of "webmention."

* Communication between the users and the Beakermentions Endpoint are done through [Location][9] search strings and `beaker.peersockets` instead of HTTP POST.

Mentions are not limited to HTML; any file can mention any other file using metadata key-value pairs.

Do note that this is only an endpoint implementation; an endpoint only stores and provides the `source` URLs that mention a particular `target` URL. Any rendering of mentions (including which mentions to render) is done by an application itself after retrieving a `target`'s `sources`.

## How This Works

1. Alice writes a new file and saves it to `hyper://alice/microblog/a-good-day.md`.

2. Alice adds a `@webmention` metadata key to the new file with a value of their Beakermentions Endpoint: `hyper://alice-beakermentions/`

3. Alice opens their Beakermentions Endpoint so it's listening for new sent mentions, then minimizes it to the background.

4. Bob sees Alice's new file and wants to tell Alice that they like it! They write a new file in response, add their own `@webmention` key in the metadata so others can respond to it, add a `@likeOf` key with a value of Alice's file URL, and saves their response to `hyper://bob/microblog/that-is-good.md`.

5. Bob's application notices that the file they're saving mentions Alice's file. After saving, it offers to bring Bob to Alice's Beakermentions Endpoint's page to automatically send the mention: `hyper://alice-beakermentions/?source=hyper://bob/microblog/that-is-good.md&target=hyper://alice/microblog/a-good-day.md&done=hyper://bob/`.

6. Alice's Beakermentions Endpoint verifies that Alice wants their file mentioned by checking that their file's `@webmention` key is the Beakermention Endpoint's URL, then checks Bob's file to make sure that they mention Alice's file URL in its metadata or in its content.

7. After verification, Alice's Beakermentions Endpoint stores the mention in `hyper://alice-beakermentions/mentions/hyper/alice/microblog/a-good-day.md.json`, then sends Bob a success message. At this point, the endpoint may send Bob back to `hyper://bob/`.

As an alternative to step 5, Bob may interactively send the webmention (instead of their application) by visiting Alice's Beakermention Endpoint, entering their response as the source and Alice's file as the target, and pressing send.

Now, when an application opens Alice's file, they may notice the `@webmention` key in the metadata. They may get all the stored mentions from the Beakermentions Endpoint by reading `hyper://alice-beakermentions/mentions/hyper/alice/microblog/a-good-day.md.json` and display whichever mentions they want to present by processing each URL.

## License
© 2020 [Don Geronimo][7]. To the extent possible under law, Don Geronimo has waived all copyright and related or neighboring rights to Beakermentions Endpoint by publishing it under the [CC0 1.0 Universal Public Domain Dedication][8]. This work is published from the United States.

Made with ❤️ and JavaScript. Please freely share and remix.

[1]: hyper://c34b768fb205adbcd22474177f1b24ba202a44da171b452ec5aef6cd4e744d25/
[2]: https://www.w3.org/
[3]: https://www.w3.org/TR/webmention/
[4]: https://beakerbrowser.com/
[5]: https://docs.beakerbrowser.com/apis/beaker.hyperdrive/
[6]: https://docs.beakerbrowser.com/apis/beaker.peersockets/
[7]: hyper://9fa076bdc2a83f6d0d32ec010a71113b0d25eccf300a5eaedf72cf3326546c9a/
[8]: hyper://c34b768fb205adbcd22474177f1b24ba202a44da171b452ec5aef6cd4e744d25/LICENSE.md
[9]: https://developer.mozilla.org/en-US/docs/Web/API/Location/search