import assert from "node:assert/strict";
import test from "node:test";
import {
  consolidateAnnouncementsByKey,
  isNewerAnnouncement,
} from "../lib/api/provider-consolidation.ts";

const KEY = "3d8333c5a3467c62b055c72f7f197df161faad20a5219ae694a92457c0e48a7c";
const OTHER = "2ca46ee98f3134c4e11a638663a45983b590bfdefd31588f9c2f03455fba15e7";

const announcement = (overrides = {}) => ({
  pubkey: KEY,
  id: "3d8333c5a346",
  created_at: 1_792_959_913,
  endpoint_url: "https://routstr.otrta.me",
  endpoint_urls: [
    "https://routstr.otrta.me",
    "http://zdnt2juw6htljsu25ftnbvdicgvr4s3ts4ldlx2myjcuyz4woaf4l7id.onion",
  ],
  ...overrides,
});

test("one key that rotated its d tag is listed once, newest announcement wins", () => {
  const old = announcement({
    id: "MacBook-Pro-2.local",
    created_at: 1_774_382_821,
    endpoint_urls: ["https://routstr.otrta.me"],
  });
  const current = announcement();

  for (const records of [
    [old, current],
    [current, old],
  ]) {
    const rows = consolidateAnnouncementsByKey(records);
    assert.equal(rows.length, 1);
    assert.equal(rows[0].id, "3d8333c5a346");
    assert.equal(rows[0].created_at, 1_792_959_913);
  }
});

test("a newer announcement replaces the one already kept, wherever it arrives", () => {
  const old = announcement({ id: "MacBook-Pro-2.local", created_at: 1_774_382_821 });
  const current = announcement();
  const rows = consolidateAnnouncementsByKey([old, current, old]);
  assert.equal(rows.length, 1);
  assert.equal(rows[0].id, "3d8333c5a346");
});

test("different keys stay separate even when they share a d tag", () => {
  const rows = consolidateAnnouncementsByKey([
    announcement(),
    announcement({ pubkey: OTHER, endpoint_url: "https://api.ppq.ai", endpoint_urls: ["https://api.ppq.ai"] }),
  ]);
  assert.equal(rows.length, 2);
  assert.deepEqual(
    rows.map((row) => row.pubkey).sort(),
    [KEY, OTHER].sort()
  );
});

test("equal timestamps prefer the fuller announcement, then the lower d tag", () => {
  const thin = announcement({ id: "aaa", endpoint_urls: ["https://routstr.otrta.me"] });
  const full = announcement({ id: "bbb" });
  assert.equal(isNewerAnnouncement(full, thin), true);
  assert.equal(isNewerAnnouncement(thin, full), false);

  const same = announcement({ id: "aaa" });
  const tie = announcement({ id: "bbb" });
  assert.equal(isNewerAnnouncement(tie, same), false);
  assert.equal(consolidateAnnouncementsByKey([tie, same])[0].id, "aaa");
});

test("an announcement without a pubkey cannot shadow a key's row", () => {
  const keyless = announcement({ pubkey: "", endpoint_url: "https://routstr.otrta.me" });
  const keyed = announcement();
  const rows = consolidateAnnouncementsByKey([keyless, keyed]);
  assert.equal(rows.length, 2);

  // Two keyless announcements sharing a d tag are the same address, so they collapse.
  const keylessTwin = { ...keyless, created_at: keyless.created_at - 1 };
  assert.equal(consolidateAnnouncementsByKey([keyless, keylessTwin]).length, 1);
});

test("missing or malformed timestamps never outrank a real announcement", () => {
  const stamped = announcement({ created_at: 1_792_959_913 });
  for (const broken of [undefined, null, Number.NaN, "not-a-date"]) {
    const candidate = announcement({ id: "zzz", created_at: broken });
    assert.equal(isNewerAnnouncement(candidate, stamped), false);
  }
});

test("the retained row is the first one seen for each key, in input order", () => {
  const a = announcement({ id: "a" });
  const b = announcement({ pubkey: OTHER, id: "b", created_at: 1_700_000_000 });
  const rows = consolidateAnnouncementsByKey([b, a]);
  assert.deepEqual(
    rows.map((row) => row.id),
    ["b", "a"]
  );
});
