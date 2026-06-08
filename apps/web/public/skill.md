# ClawPump Launchpad — Agent SKILL (v0.6)

> Drop this file into your agent (Hermes, OpenClaw, KaiNova, or any LLM agent).
> The agent reads it and learns how to **launch real on-chain SPL tokens
> against CLAW** through a Meteora Dynamic Bonding Curve (DBC) pool, then
> trade or read live pool state.
>
> This is the **real on-chain path**, not a proxy. Every transaction is
> built server-side, signed by a Solana wallet (Phantom / Solflare / agent
> custodial keypair), and broadcast directly to mainnet.

---

## 1. Identity

| Field | Value |
|---|---|
| Platform | **ClawPump v2** |
| API base | `https://clawpump-v2.vercel.app/api` |
| Quote currency | **CLAW** (`739dnZEG4yaBWFsY8L8ZwrfhGG6dhtCSercW8Umspump`) |
| AMM | Meteora Dynamic Bonding Curve (`dbcij3LWUppWqq96dh6gJWwBifmcGfLSB5D4DuSMaqN`) |
| Migration target | DAMM v2 (`cpamdpZCGKUy5JxQXB4dcpGPiikHawvSWAd6mEn1sGG`) |
| Solana cluster | **mainnet-beta** |
| Token decimals (base) | 6 |
| Quote decimals (CLAW) | 6 |

> Legacy SOL-quoted launches via `clawpump.vercel.app` are a separate
> upstream product. This SKILL only covers the CLAW-quoted v2 path.

---

## 2. Read-only endpoints (no wallet needed)

```
GET  /api/claw                          live CLAW price + curve constants
GET  /api/tier?wallet=<PUBKEY>          tier (None | Cub | Lion | Apex)
GET  /api/pool/<POOL_PUBKEY>            live pool reserves + migration %
POST /api/swap/quote                    pure swap preview, no tx
```

`/api/pool/<POOL_PUBKEY>` returns:
```json
{
  "pool": "<base58>",
  "config": "<base58>",
  "baseMint": "<base58>",
  "quoteMint": "739dnZEG…pump",
  "isMigrated": false,
  "baseReserve": "1000000000000000",
  "quoteReserve": "12345000000",
  "migrationQuoteThreshold": "100000000000",
  "progressPct": 12.345
}
```

> **`pool` is the DBC pool pubkey, NOT the base mint.** The pool address
> is what `/api/launch` returns as `poolPubkey`. Confusing the two is the
> #1 mistake — store both.

---

## 3. Tier gate (optional UX guard)

```
GET /api/tier?wallet=<SOLANA_PUBKEY>
```
Returns `{ tier: "None" | "Cub" | "Lion" | "Apex", balanceClaw, canLaunch }`.
The on-chain DBC program does NOT enforce tier — only the UI does. Agents
launching headless can skip the check, but it's good manners to warn the
user if their wallet has < 10k CLAW.

---

## 4. **Launching a token (the only flow that works)**

ClawPump v2 is **non-custodial**. The server never sees your private key.
It builds and pre-signs the transaction with two ephemeral keypairs
(config + base mint), and the **user wallet finalizes the signature in
the browser or agent**.

### Step 1 — Prepare Metaplex metadata JSON

DBC requires a `uri` pointing at a Metaplex-format JSON file. Upload it
to IPFS, Arweave, or any CDN first:

```json
{
  "name": "My CLAW Token",
  "symbol": "MCT",
  "description": "First memecoin from agent Hermes",
  "image": "https://example.com/mct.png"
}
```

### Step 2 — Request unsigned tx

```
POST https://clawpump-v2.vercel.app/api/launch
Content-Type: application/json

{
  "name": "My CLAW Token",
  "symbol": "MCT",
  "uri": "https://example.com/mct-metadata.json",
  "userWallet": "<USER_OR_AGENT_PUBKEY>",
  "initialMarketCapClaw": 1000,        // optional, default 1k CLAW
  "migrationMarketCapClaw": 100000     // optional, default 100k CLAW
}
```

Returns:
```json
{
  "status": "ready_to_sign",
  "txBase64": "<base64 wire-format unsigned tx>",
  "configPubkey": "<base58>",
  "baseMintPubkey": "<base58>",
  "poolPubkey": "<base58>",
  "instructions": {
    "next": "Deserialize, sign, submit, then poll for baseMint.",
    "decimals": 6,
    "quoteMint": "739dnZEG…pump"
  }
}
```

### Step 3 — Sign + submit (browser, Phantom)

```ts
import { Connection, Transaction } from "@solana/web3.js";
import { useConnection, useWallet } from "@solana/wallet-adapter-react";

const { connection } = useConnection();
const { publicKey, signTransaction } = useWallet();

const r = await fetch("https://clawpump-v2.vercel.app/api/launch", {
  method: "POST",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify({
    name, symbol, uri,
    userWallet: publicKey!.toBase58(),
  }),
});
const j = await r.json();

const tx = Transaction.from(Buffer.from(j.txBase64, "base64"));
const signed = await signTransaction!(tx);
const sig = await connection.sendRawTransaction(signed.serialize());
await connection.confirmTransaction(sig, "confirmed");

console.log("mint:", j.baseMintPubkey);
console.log("pool:", j.poolPubkey);
console.log("tx:  ", `https://solscan.io/tx/${sig}`);
```

### Step 3' — Sign + submit (Node, agent custodial keypair)

```ts
import { Connection, Keypair, Transaction } from "@solana/web3.js";

const conn = new Connection(process.env.HELIUS_RPC!, "confirmed");
const agent = Keypair.fromSecretKey(/* base58/u8 */ secret);

const r = await fetch("https://clawpump-v2.vercel.app/api/launch", {
  method: "POST",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify({
    name, symbol, uri,
    userWallet: agent.publicKey.toBase58(),
  }),
}).then((r) => r.json());

const tx = Transaction.from(Buffer.from(r.txBase64, "base64"));
tx.partialSign(agent);                       // wallet's slot
const sig = await conn.sendRawTransaction(
  tx.serialize({ requireAllSignatures: true })
);
await conn.confirmTransaction(sig, "confirmed");
```

### Common launch errors

| Error | Cause | Fix |
|---|---|---|
| `userWallet is not a valid Solana public key` | wrong base58 | use `publicKey.toBase58()`, not the wallet object |
| `uri required` | empty uri field | upload metadata JSON first, paste URL |
| `failed to build launch tx: RPC unreachable` | server lost RPC | retry after 5s, or set `HELIUS_RPC` env on the server |
| Blockhash expired before user signed | wallet sat idle too long | request a fresh tx (each `/api/launch` call stamps a fresh blockhash) |
| Tx accepted but mint not visible | confirmation race | poll `/api/pool/<poolPubkey>` until 200 |

---

## 5. **Trading the pool (buy / sell base for CLAW)**

After launch you have `poolPubkey`. Trade either direction with `/api/swap`.

### Get a quote first

```
POST /api/swap/quote
{
  "pool": "<poolPubkey>",
  "amountIn": "1000000",          // STRING, atomic units (avoid u64 truncation)
  "swapBaseForQuote": false,      // false = buy base with CLAW
  "slippageBps": 100              // optional, default 1%
}
```
Returns `{ amountIn, amountOut, minimumAmountOut, feeAmount }`. All strings.

### Build the swap tx

```
POST /api/swap
{
  "pool": "<poolPubkey>",
  "userWallet": "<traderPubkey>",
  "amountIn": "1000000",
  "swapBaseForQuote": false,
  "slippageBps": 100
}
```
Returns `{ status: "ready_to_sign", txBase64, quote }`.

Sign + submit identically to launch (Section 4 step 3 / 3').

### `swapBaseForQuote` cheat-sheet

| Flag | Direction | Use case |
|---|---|---|
| `false` | CLAW → base token | **buy** the new memecoin |
| `true`  | base → CLAW       | **sell** the memecoin back |

---

## 6. Pool state polling (graduation watcher)

```
GET /api/pool/<poolPubkey>
```

`progressPct` = `quoteReserve / migrationQuoteThreshold * 100`.
When `isMigrated === true` the DBC pool is dead — liquidity has been
seeded into a DAMM v2 pool and the token now trades there.

Poll every 5–15s while a user is on the trading page. Don't hammer.

---

## 7. End-to-end script every agent should be able to run

```ts
// 1. Pick a metadata URI you already uploaded.
const uri = "https://my-cdn.com/metadata.json";

// 2. Ask server for an unsigned tx.
const launch = await fetch("https://clawpump-v2.vercel.app/api/launch", {
  method: "POST",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify({
    name: "Hermes Token",
    symbol: "HERMES",
    uri,
    userWallet: agent.publicKey.toBase58(),
  }),
}).then((r) => r.json());

// 3. Sign + submit.
const tx = Transaction.from(Buffer.from(launch.txBase64, "base64"));
tx.partialSign(agent);
const sig = await conn.sendRawTransaction(tx.serialize({ requireAllSignatures: true }));
await conn.confirmTransaction(sig, "confirmed");

// 4. Confirm on chain.
const state = await fetch(
  `https://clawpump-v2.vercel.app/api/pool/${launch.poolPubkey}`,
).then((r) => r.json());
console.log("pool live, progress:", state.progressPct + "%");

// 5. Optionally seed a first buy with 1 CLAW (1_000_000 atomic units).
const swap = await fetch("https://clawpump-v2.vercel.app/api/swap", {
  method: "POST",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify({
    pool: launch.poolPubkey,
    userWallet: agent.publicKey.toBase58(),
    amountIn: "1000000",
    swapBaseForQuote: false,
    slippageBps: 200,
  }),
}).then((r) => r.json());

const buyTx = Transaction.from(Buffer.from(swap.txBase64, "base64"));
buyTx.partialSign(agent);
const buySig = await conn.sendRawTransaction(buyTx.serialize({ requireAllSignatures: true }));
await conn.confirmTransaction(buySig, "confirmed");
```

That's it. Mint, pool, first buy — all real on chain, no proxy.

---

## 8. Defaults baked into every CLAW-quoted launch

| Parameter | Value | Rationale |
|---|---|---|
| Base token decimals | 6 | matches CLAW, fits in u64 |
| Total supply | 1,000,000,000 | pump.fun-style cap |
| Initial market cap | 1,000 CLAW | low start so curve has runway |
| Migration market cap | 100,000 CLAW | graduates to DAMM v2 |
| Base trading fee | 25 bps (0.25%) | Meteora minimum |
| Migration fee | 100 bps (1%) | DAMM v2 standard |
| Mint authority | revoked at launch | immutable, fair-launch posture |
| Permanent-locked LP | 20% (creator side) | meets ≥10% protocol minimum |
| Creator share of fees | 100% | flips to platform once relayer ships |

Override `initialMarketCapClaw` and `migrationMarketCapClaw` in `/api/launch`
if you need a longer or shorter runway.

---

## 9. Wallet integration notes

- **Phantom / Solflare** — supported via `@solana/wallet-adapter-react` in
  the launchpad UI. No extra setup.
- **Headless agents** — store a Solana `Keypair` and call `tx.partialSign(kp)`.
  The keypair only needs SOL for tx fees (~0.005 SOL covers a launch).
- **Server-side signing** — never POST private keys to ClawPump. Sign
  client-side and submit yourself, or run your own relayer. The server
  intentionally has no way to receive secrets.

---

## 10. Versioning + sunset notes

- `v0.6` (this doc) — Meteora DBC native, CLAW-quoted, on-chain only.
- `v0.5` and earlier — proxied through `clawpump.vercel.app/api/launch`,
  SOL-quoted. **Deprecated.** Agents pointed at the old proxy will
  silently get the wrong token shape.
- Future `v0.7` — platform relayer + partial custodial mode for agents
  that don't want to manage a Solana keypair.

Questions: drop them in the GitHub repo at
[`Maliot100X/clawpump-v2`](https://github.com/Maliot100X/clawpump-v2).
