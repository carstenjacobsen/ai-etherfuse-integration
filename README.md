# AI Etherfuse DeFindex Integration





# Build Report: `stellar-etherfuse-wallet`

**Date:** 2026-03-15
**Stack:** Next.js 16 · React 19 · TypeScript · Tailwind CSS v4 · Turbopack
**Port:** 3006

---

## Objective

Build a Stellar wallet app combining three distinct features into a single UI:

1. **Portfolio** — Freighter wallet connect + XLM balance
2. **Ramp** — MXN ↔ MXNe (tokenized peso) on/off-ramp via EtherFuse
3. **Yield** — DeFindex USDC vaults (deposit / withdraw)

---

## Architecture Overview

```
app/
├── page.tsx                  ← Three-tab shell
├── hooks/
│   ├── useFreighter.ts       ← Wallet connect, balance, sign
│   ├── useEtherFuse.ts       ← Ramp state machine (quotes, orders, assets)
│   └── useVaults.ts          ← DeFindex vault list + actions
├── components/
│   ├── RampTab.tsx           ← EtherFuse onboarding + quote + orders
│   ├── YieldTab.tsx          ← Vault cards, deposit/withdraw modals
│   ├── OnboardingCard.tsx    ← KYC presigned URL flow
│   ├── QuoteForm.tsx         ← Amount input → quote → create order
│   ├── OrderCard.tsx         ← Order status display
│   └── AddTrustlineButton.tsx← Inline trustline management
├── api/
│   ├── etherfuse/
│   │   ├── assets/route.ts
│   │   ├── quote/route.ts
│   │   ├── orders/route.ts   ← GET (list) + POST (create)
│   │   ├── onboarding/route.ts
│   │   └── exchange-rate/route.ts
│   ├── vaults/[address]/deposit/route.ts
│   ├── vaults/[address]/withdraw/route.ts
│   └── trustline/route.ts
└── lib/
    ├── etherfuse.ts          ← EtherFuse API client (server-side)
    ├── defindex.ts           ← DeFindex SDK wrapper (server-side)
    ├── freighter.ts          ← Freighter browser adapter
    ├── stellar.ts            ← Horizon balance fetch
    └── constants.ts          ← Addresses, network config
```

---

## Build Steps

### 1. Project scaffold
`create-next-app` with TypeScript, Tailwind CSS v4, and Turbopack. Port set to 3006 (after 3003–3005 were occupied by sibling projects).

### 2. Freighter integration
Reused the `useFreighter` hook pattern from `stellar-freighter-wallet`. Added a `sign(xdr)` method exposed to both the Ramp and Yield tabs so Soroban transactions can be signed without the hook owning the full transaction lifecycle.

### 3. DeFindex Yield tab
Lifted verbatim from `stellar-defindex-yield` — vault cards, deposit/withdraw modals, `useVaults` hook. `@defindex/sdk` kept server-side only (via API routes) since it imports Node.js modules that break in the browser bundle.

### 4. EtherFuse Ramp integration
The new work. Steps:
- `etherfuse.ts` — thin server-side fetch wrapper for all ramp endpoints
- `useEtherFuse.ts` — client-side state hook orchestrating the full flow
- UI components: `OnboardingCard`, `QuoteForm`, `OrderCard`

---

## Gotchas & Issues Discovered

### Auth header — no `Bearer` prefix
EtherFuse uses `Authorization: <api-key>` directly. Using the conventional `Authorization: Bearer <token>` returns 401. This is documented but easy to miss.

```ts
Authorization: ETHERFUSE_API_KEY   // correct
Authorization: `Bearer ${key}`    // wrong — 401
```

---

### `customerId` — derived vs real
The EtherFuse sandbox has a single pre-provisioned customer tied to the API key. Its `customerId` is a UUID that has nothing to do with our wallet address.

Our approach: derive a deterministic UUID v5 from the wallet public key using the RFC 4122 URL namespace — no database needed, reproducible across sessions. However, the real EtherFuse customerId is captured from the first order list response and stored in a `useRef` (`efCustomerIdRef`). All subsequent quote and order calls prefer the real ID.

```ts
// Derived locally
uuidv5(walletAddress, "6ba7b810-9dad-11d1-80b4-00c04fd430c8")

// Real EtherFuse ID (captured from order history)
efCustomerIdRef.current = orders[0].customerId
```

---

### `bankAccountId` — must be echoed back
Order creation requires a `bankAccountId` that EtherFuse assigned during initial KYC. It is not returned from the quote or onboarding endpoint — only from order list responses. Solved by extracting it from the first fetched order and storing it in `bankAccountIdRef`.

---

### Quote response field naming mismatch
EtherFuse returns `sourceAmount` / `destinationAmount` in the quote response, not `fromAmount` / `toAmount` as their docs suggest. The `quoteAssets` sub-object uses `targetAsset` / `sourceAsset` as field names. A normalization step in `useEtherFuse.getQuote()` maps all variants to the internal interface.

```ts
fromAmount: Number(raw.fromAmount) || Number(raw.sourceAmount)
toAmount: Number(raw.toAmount) || Number(raw.destinationAmount)
fromCurrency: raw.fromCurrency ?? raw.quoteAssets?.targetAsset ?? "MXN"
```

---

### `quoteAssets` field — undocumented flat enum format
The quote endpoint requires a `quoteAssets` array in a non-obvious "tagged tuple" shape: `[variantName, field1, field2]`. For an on-ramp: `["onramp", "MXN", toAssetContractAddress]`. Sending the object shape shown in some docs returns a 422.

---

### Assets endpoint — inconsistent response shape
`GET /ramp/assets` returns either a bare array or `{ assets: [...] }` depending on the query parameters. Added a normalisation guard:

```ts
return Array.isArray(data) ? data : (data.assets || data.data || [])
```

---

### Exchange rate endpoint — two possible paths
`/exchange-rate` returns 404 in some sandbox configurations; the fallback `/ramp/exchange-rate` works. Both are tried in sequence before throwing.

---

### `POST /ramp/orders` — sandbox is read-only
**The most significant limitation.** The sandbox treats `POST /ramp/orders` identically to `GET /ramp/orders`: it ignores the request body and returns the same 3 pre-seeded orders every time. No new order is ever created. The response is a paginated list (`{ items, totalItems, pageSize, ... }`) rather than a single created order.

**Workaround:** After posting, the client diffs the returned order list against a pre-creation snapshot. If no new `orderId` appears, a **synthetic pending order** is built from the quote data. It copies the CLABE from order history so the UI gives the user actionable payment instructions. In production the real API would return a genuine new order.

```ts
const newOrder = freshOrders.find(o => !previousOrderIds.has(o.orderId))
if (!newOrder) {
  // build synthetic order from currentQuote + clabeFromHistory
}
```

---

### Trustline requirement
CETES and MXNe are non-native Stellar assets. Without a trustline, `DESTINATION_ACCOUNT_DOES_NOT_EXIST` or `op_no_trust` errors are thrown silently on the send side. Added an `AddTrustlineButton` component to the Ramp tab that builds and submits a `ChangeTrust` operation signed through Freighter.

---

### `@defindex/sdk` — browser bundle crash
The SDK imports Node.js-only modules (`crypto`, `fs`, etc.) and must not be imported in client components. All DeFindex calls go through Next.js API routes. The client only calls `/api/vaults/...`.

---

### Node.js not on default PATH
On this machine `node` / `npm` live at `/usr/local/bin/` which is not in the shell PATH used by some tool runners. Dev server config in `.claude/launch.json` must use absolute paths:

```json
"runtimeExecutable": "/usr/local/bin/node",
"runtimeArgs": ["node_modules/.bin/next", "dev", "--port", "3006"]
```

---

## Environment Variables

| Variable | Purpose |
|---|---|
| `ETHERFUSE_API_KEY` | EtherFuse sandbox API key |
| `ETHERFUSE_API_URL` | Defaults to `https://api.sand.etherfuse.com` |
| `DEFINDEX_API_KEY` | Optional DeFindex API key for vault data |

---

## Known Sandbox Limitations (EtherFuse)

| Behaviour | Sandbox | Production |
|---|---|---|
| `POST /ramp/orders` creates a new order | No — returns existing order list | Yes |
| `customerId` matches wallet address | No — fixed API-key account | Yes |
| KYC onboarding URL is functional | Partially | Yes |
| Order status updates | Static (3 pre-seeded orders) | Live webhooks |


