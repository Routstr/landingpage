# How Routstr Verifies Tinfoil Enclaves Before Spending a Single Sat

Privacy tools only matter if you can trust them. A promise of "private AI" is worthless if the server that decrypts your prompts is actually running something else — or if the operator can read everything the moment it leaves your machine.

This article explains how Routstr's current Tinfoil integration works under the hood: how we prove what is running inside the enclave, how we prove your encrypted request can only be read by that enclave, and why **not a single sat is spent before those checks pass**.

## The Tinfoil setup in one paragraph

Tinfoil provides private AI inference using **confidential computing** — secure hardware enclaves in the cloud. When you use a `tinfoil-*` model through Routstr, your request eventually reaches an AMD SEV-SNP enclave running Tinfoil's model router, which then routes to the inference enclave holding the model.

From the client's point of view there are three parties:

- **Your SDK** — the trusted client.
- **The host machine** — operated by Tinfoil, but treated as untrusted.
- **The enclave** — a hardware-isolated server the host operator cannot see into.

The whole point of attestation is to make sure "the enclave" isn't just the host pretending.

## The problem: how do you know what's running?

Imagine the host operator swaps the real enclave for a fake one that decrypts your request and logs it. If your client blindly encrypts to whatever key the server presents, privacy is gone.

Tinfoil's answer has two parts:

1. **Code transparency** — prove the enclave is running auditable, open-source code.
2. **Key binding** — prove the encryption key belongs to that specific enclave, not the host.

## Part 1: Remote attestation proves the code

Remote attestation works because the CPU has a manufacturer-fused secret key that the host cannot read. At boot, the hardware measures the full launch configuration — firmware, kernel, security parameters, and the application binary — and signs that measurement with the CPU key.

That signed **attestation report** is effectively a cryptographic fingerprint of everything running in the enclave. Same configuration twice = same fingerprint. Change one byte = different fingerprint.

The report is verified against AMD's root of trust using the VCEK certificate chain. This tells us: *a real AMD SEV-SNP enclave produced this measurement.*

But a measurement is just a hex string. It doesn't tell us whether the measured code is good.

## Part 2: Linking the fingerprint to auditable code

This is where transparency logs come in.

Tinfoil publishes the enclave code as open source. GitHub Actions builds the release, and the resulting measurement is signed and published to **Sigstore** — an append-only transparency log managed by the Linux Foundation.

On every connection, the client verifies:

1. The Sigstore bundle is signed by GitHub Actions for the correct repository.
2. The bundle is for a tagged release.
3. The release digest in the bundle matches the release digest fetched from GitHub.
4. The bundle contains the expected **code measurement**.

Then the client compares:

- **Expected measurement** from the signed GitHub release (Sigstore)
- **Actual measurement** from the live enclave attestation report (AMD)

If they match, the live enclave is running the open-source release. If they don't match, the SDK throws and **no request is sent**.

## Part 3: Binding the encryption key to the enclave

The remaining risk is a man-in-the-middle: what if the client encrypts to a key the host controls?

The enclave solves this by generating its HPKE encryption key pair at boot. The public key is included in the signed attestation report, so the key is bound to the measured enclave state.

The enclave also embeds two things into its TLS certificate SANs:

- The **HPKE public key**.
- A **hash of the attestation report**.

The client verifies both against the attestation report. This binds the encryption key, the attestation, and the `*.tinfoil.sh` domain together — a third-party enclave cannot cosplay as Tinfoil.

## What the Routstr SDK actually does

This logic lives in `client/TinfoilSecure.ts` and is triggered from `client/RoutstrClient.ts`.

### 1. Detect Tinfoil models

Any model id starting with `tinfoil-` takes the attestation path:

```ts
export function isTinfoilModel(modelId: string): boolean {
  return modelId.startsWith("tinfoil-");
}
```

### 2. Attest before spending

The important design choice: Routstr runs attestation **before** `_spendToken()`.

```ts
if (tinfoilEnabled) {
  const { verification } = await prepareTinfoilClient({ baseUrl });

  this._log(
    "DEBUG",
    `Tinfoil attestation passed, enclave=${verification.enclaveHost}, codeFingerprint=${verification.codeFingerprint.slice(0, 16)}...`
  );
}
```

`prepareTinfoilClient()` creates a Tinfoil `SecureClient` and waits for verification:

```ts
const { SecureClient } = await import("tinfoil");

const client = new SecureClient({
  baseURL: resolved.baseUrl,
  transport: "ehbp",
});

await client.ready();
const verification = client.getVerificationDocument();
```

If `ready()` throws, attestation failed — and the token spend never happens.

### 3. Encrypt the body to the attested key

Routstr does not use the stock `SecureClient.fetch`. It uses a custom wrapper built on the lower-level `ehbp` primitives:

- `Identity.fromPublicKeyHex(verification.hpkePublicKey)`
- `encryptRequestWithContext(request)`
- `decryptResponseWithToken(...)`

This gives us two things at once:

- The request body is encrypted to the **attested** enclave HPKE key.
- Plaintext proxy errors (401, 402, 429, etc.) are preserved instead of being hidden behind a missing-nonce `ProtocolError`.

The wrapper also enforces an origin allow-list. The target URL must be either the verified provider/proxy origin or the verified enclave origin — nothing else:

```ts
if (!allowedOrigins.has(targetUrl.origin)) {
  throw new Error(
    `refusing to send Tinfoil request to ${targetUrl.origin}: client is bound to the verified enclave/proxy`
  );
}
```

### 4. Handle key rotation

Enclaves rotate keys. If a response signals an EHBP key-config mismatch, the SDK resets the client, re-attests, and retries once — so a rotated key never causes silent trust degradation.

### 5. Re-attest on failover

When a provider fails and Routstr moves to the next node, it attests the failover provider too:

```ts
await prepareTinfoilClient({ baseUrl: nextProvider });
```

## The full flow

```text
Client SDK (routstr-sdk)
   |
   | model id starts with "tinfoil-"
   v
prepareTinfoilClient()
   |
   | new SecureClient({ transport: "ehbp" })
   v
client.ready()
   |
   | 1. fetch attestation bundle (atc.tinfoil.sh)
   | 2. verify AMD SEV-SNP report against VCEK
   | 3. verify Sigstore bundle for GitHub release
   | 4. compare enclave measurement vs signed release measurement
   | 5. verify TLS cert SANs bind HPKE key + attestation hash
   v
verification document (codeFingerprint, hpkePublicKey)
   |
   v
spend token  <-- only after attestation passes
   |
   v
EHBP encrypt body -> Routstr proxy -> attested enclave
```

## What this buys you

When you use a `tinfoil-*` model through Routstr, the SDK has verified:

- **Real AMD SEV-SNP hardware** — the attestation report is verified against AMD's VCEK certificate chain.
- **Running auditable, immutable code** — the Sigstore bundle proves the open-source router repo release.
- **The measured code is the live code** — the enclave measurement must equal the signed release measurement.
- **Only the enclave can read the body** — EHBP encrypts to the attested HPKE key.
- **No third-party enclave impersonation** — certificate SANs bind the key and attestation hash to `*.tinfoil.sh`.

## Honest trust boundaries

No trust system is absolute. A few things are worth saying out loud:

- **Routstr follows the latest signed release.** We do not currently pin a hardcoded `codeFingerprint`. We verify that the enclave matches the latest signed release of the configured repo.
- **The attestation bundle is assembled by Tinfoil's ATC.** The SDK fetches a pre-assembled bundle from `atc.tinfoil.sh`. This is safe because every component is independently signed and verified, but the ATC is still a part of the path.
- **The directly verified repo is the router.** By default that's `tinfoilsh/confidential-model-router`. The model enclave behind the router is covered by Tinfoil's enclave chaining.
- **Headers are plaintext to the proxy.** EHBP encrypts the request body. The auth token and `X-Routstr-Model` header remain visible to the Routstr proxy so it can route and bill.
- **We trust the SDK dependencies.** The verification is only as strong as `tinfoil`, `ehbp`, and their pinned transitive dependencies.

## The bottom line

Routstr's current Tinfoil setup is **verify-then-encrypt-then-spend**. The SDK does real client-side attestation: it checks the hardware report, verifies the code provenance, compares measurements, validates the certificate bindings, and only then releases sats.

That's what makes `tinfoil-*` models different from a generic "private" API endpoint. The trust is in cryptography and transparency logs — not in a privacy policy.
