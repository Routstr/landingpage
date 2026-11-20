import assert from "node:assert/strict";
import test from "node:test";
import { finalizeEvent, getPublicKey } from "nostr-tools";
import {
  PROVIDER_ANNOUNCEMENT_KIND, announcementLabel, applyProviderLabels,
  labelForProviderId, providerLabelsFromAnnouncements, sanitizeProviderLabels,
} from "../lib/provider-identity.ts";
import { providerShortId } from "../components/stats/stats-chart-domain.ts";

// Real keys behave like any other hex key here, and using one keeps the
// fixtures honest about the 64-character shape the join requires.
const KEY = new Uint8Array(32).fill(29);
const PUBKEY = getPublicKey(KEY);
const OTHER_CREATED_AT = 1_790_000_000;

/** An announcement as relays store it: signed, addressable, one per key. */
function announcement({
  node = PUBKEY.slice(0, 12), name = "A Routstr Node", endpoints = ["https://node.example.com"],
  created_at = OTHER_CREATED_AT, key = KEY,
} = {}) {
  return finalizeEvent({
    kind: PROVIDER_ANNOUNCEMENT_KIND,
    created_at,
    tags: [["d", node], ...endpoints.map((url) => ["u", url]), ["mint", "https://mint.example.com"]],
    content: JSON.stringify({ name, about: "A Routstr Node" }),
  }, key);
}

function labelsOf(...events) {
  return providerLabelsFromAnnouncements(events);
}

test("a named v2-only node gets its published name instead of its node id", () => {
  const event = announcement({ node: "7efd1dff8699", name: "ARoutstrNode" });
  const labels = labelsOf(event);
  assert.equal(labels[PUBKEY], "ARoutstrNode");
  assert.equal(
    labelForProviderId(`38421:${PUBKEY}:7efd1dff8699`, labels),
    "ARoutstrNode",
  );
});

test("without a name the clearnet host is used, and an onion host only as a last resort", () => {
  assert.equal(
    announcementLabel(announcement({ name: "", endpoints: ["https://www.ai.redsh1ft.com/"] })),
    "ai.redsh1ft.com",
  );
  assert.equal(
    announcementLabel(announcement({
      name: "",
      endpoints: ["http://abcdef.onion", "https://node.example.com:8443"],
    })),
    "node.example.com:8443",
  );
  assert.equal(
    announcementLabel(announcement({ name: "", endpoints: ["http://abcdefgh.onion"] })),
    "abcdefgh.onion",
  );
  // A bare IP is still the address clients dial, so it beats the node id.
  assert.equal(
    announcementLabel(announcement({ name: "", endpoints: ["https://140.245.192.194"] })),
    "140.245.192.194",
  );
  assert.equal(
    announcementLabel(announcement({ name: "", endpoints: ["ws://relay.example.com"] })),
    null,
  );
});

test("the join needs a usable name or host and never fabricates one", () => {
  for (const name of ["", "   ", "🎉", "\u0000\u0001", 42, null]) {
    assert.equal(
      announcementLabel(announcement({ name, endpoints: [] })),
      null,
      `name ${JSON.stringify(name)} must not become a label`,
    );
  }
  assert.equal(Object.keys(labelsOf(announcement({ name: "", endpoints: [] }))).length, 0);
});

test("control characters and whitespace never reach the legend, and long names truncate", () => {
  assert.equal(
    announcementLabel(announcement({ name: "  Ashen\n Routstr\t Node  ", endpoints: [] })),
    "Ashen Routstr Node",
  );
  const long = announcementLabel(announcement({ name: "n".repeat(200), endpoints: [] }));
  assert.equal(long.length, 64);
  assert.ok(long.endsWith("…"));
});

test("one key with several live announcements resolves deterministically", () => {
  const older = announcement({ name: "Old Name", created_at: OTHER_CREATED_AT });
  const newer = announcement({ name: "New Name", created_at: OTHER_CREATED_AT + 60 });
  for (const order of [[older, newer], [newer, older]]) {
    assert.equal(labelsOf(...order)[PUBKEY], "New Name");
  }
});

test("a created_at tie resolves the way NIP-01 replaces, by lower id", () => {
  const first = announcement({ name: "First", created_at: OTHER_CREATED_AT });
  const second = announcement({ name: "Second", created_at: OTHER_CREATED_AT });
  const expected = (first.id < second.id ? first : second).content.includes("First")
    ? "First" : "Second";
  for (const order of [[first, second], [second, first]]) {
    assert.equal(labelsOf(...order)[PUBKEY], expected);
  }
});

test("a malformed or unsigned-looking announcement is skipped, not guessed at", () => {
  const broken = { ...announcement(), pubkey: "not-a-key" };
  assert.deepEqual(labelsOf(broken), {});

  // Content that is not JSON, or JSON with no name, still falls back to the
  // advertised host: only the name read needs parseable content.
  for (const content of ["{not json", "[]", "null", JSON.stringify({ about: "no name" })]) {
    assert.equal(labelsOf({ ...announcement(), content })[PUBKEY], "node.example.com", content);
  }
});

test("labelling changes only the display name, never the identity or the order", () => {
  const providers = [
    { providerId: `38421:${PUBKEY}:7efd1dff8699`, providerLabel: "7efd1dff8699", reports: [] },
    { providerId: "38421:aa:other", providerLabel: "other.example.com", reports: [] },
  ];
  const labelled = applyProviderLabels(providers, labelsOf(announcement({ name: "ARoutstrNode" })));
  assert.deepEqual(labelled.map((provider) => provider.providerId), providers.map((provider) => provider.providerId));
  assert.deepEqual(labelled.map((provider) => provider.providerLabel), ["ARoutstrNode", "other.example.com"]);
  // The input is not mutated, so a cached list stays reusable.
  assert.equal(providers[0].providerLabel, "7efd1dff8699");
});

test("a provider id is only joined when it carries a 38421 coordinate", () => {
  const labels = labelsOf(announcement({ name: "Named" }));
  assert.equal(labelForProviderId(`38421:${PUBKEY}:7efd1dff8699`, labels), "Named");
  assert.equal(labelForProviderId(`${PUBKEY}:7efd1dff8699`, labels), null);
  assert.equal(labelForProviderId("38420:pub:node", labels), null);
  assert.equal(labelForProviderId(`38421:${PUBKEY}`, labels), "Named");
});

test("labels restored from browser storage are re-validated", () => {
  assert.deepEqual(sanitizeProviderLabels({ [PUBKEY]: "Named Node" }), { [PUBKEY]: "Named Node" });
  for (const value of [null, [], "Named", 7, { [PUBKEY]: "" }, { [PUBKEY]: "🎉" },
    { [PUBKEY]: "\u0000bad" }, { [PUBKEY]: "x".repeat(200) }, { nope: "Named" }]) {
    assert.deepEqual(sanitizeProviderLabels(value), {}, JSON.stringify(value));
  }
});

test("a shared label is disambiguated by public key, not by the constant kind", () => {
  const keyA = "7efd1dff86991cf6448780837a6c6dbbf79bb9b80dbc5b65b163191f0443b5a7";
  const keyB = "5bbacd5535f4d8138e3fa194f31d702c0ad67d6b258984d97c1eb5e753b5dcee";
  assert.equal(providerShortId(`38421:${keyA}:7efd1dff8699`), "7efd1dff8699");
  assert.equal(providerShortId(`38421:${keyB}:5bbacd5535f4`), "5bbacd5535f4");
  assert.notEqual(providerShortId(`38421:${keyA}:x`), providerShortId(`38421:${keyB}:x`));
  // Anything that is not a provider coordinate is still shown shortened, so a
  // legacy row keeps the identifier it already had.
  assert.equal(providerShortId("ac783c5d4ec1:stats"), "ac783c5d4ec1");
});

test("a live read never erases a name cached from a healthy relay", () => {
  // The page merges cached labels as the floor, so a refresh where the
  // announcement relays answer nothing must not downgrade a named provider.
  const cached = labelsOf(announcement({ name: "ARoutstrNode" }));
  const failedRead = labelsOf();
  const labels = { ...cached, ...failedRead };
  assert.equal(labelForProviderId(`38421:${PUBKEY}:7efd1dff8699`, labels), "ARoutstrNode");

  // A successful read still wins over the cache.
  const fresh = labelsOf(announcement({ name: "Renamed Node", created_at: OTHER_CREATED_AT + 60 }));
  assert.equal(labelForProviderId(`38421:${PUBKEY}:7efd1dff8699`, { ...cached, ...fresh }), "Renamed Node");
});
