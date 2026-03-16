/**
 * EtherFuse Ramp API client — server-side only.
 * Docs: https://docs.etherfuse.com
 * Sandbox: https://api.sand.etherfuse.com
 * Auth: Authorization: <api-key>  (no "Bearer" prefix)
 */

import { v4 as uuidv4 } from "uuid";
import { ETHERFUSE_API_URL, ETHERFUSE_API_KEY } from "./constants";

async function etherfuseFetch(path: string, options: RequestInit = {}): Promise<Response> {
  const url = `${ETHERFUSE_API_URL}${path}`;
  return fetch(url, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      Authorization: ETHERFUSE_API_KEY,
      ...(options.headers as Record<string, string>),
    },
  });
}

// ── Types ────────────────────────────────────────────────────────────────────

export interface EtherFuseAsset {
  identifier: string;
  symbol: string;
  name: string;
  currency: string | null;
  balance: string | null;
  image: string | null;
}

export interface EtherFuseQuote {
  quoteId: string;
  type: "onramp" | "offramp" | "swap";
  fromCurrency: string;
  toAsset: string;
  fromAmount: number;
  toAmount: number;
  exchangeRate: number;
  fees: {
    networkFee?: number;
    serviceFee?: number;
    total: number;
  };
  expiresAt: string;
  [key: string]: unknown;
}

export interface EtherFuseOrder {
  orderId: string;
  status: string;
  orderType: "onramp" | "offramp";
  customerId: string;
  amountInFiat: string;
  depositClabe?: string;
  memo?: string;
  walletId?: string;
  bankAccountId?: string;
  feeBps?: number;
  statusPage?: string;
  createdAt: string;
  updatedAt?: string;
  [key: string]: unknown;
}

export interface ExchangeRate {
  from: string;
  to: string;
  rate: number;
  updatedAt: string;
}

// ── API Methods ───────────────────────────────────────────────────────────────

/**
 * Generate a presigned KYC onboarding URL for a customer.
 * The URL is valid for 15 minutes.
 */
export async function generateOnboardingUrl(params: {
  customerId: string;
  bankAccountId: string;
  publicKey: string;
  blockchain?: string;
}): Promise<{ presigned_url: string }> {
  const res = await etherfuseFetch("/ramp/onboarding-url", {
    method: "POST",
    body: JSON.stringify({
      customerId: params.customerId,
      bankAccountId: params.bankAccountId,
      publicKey: params.publicKey,
      blockchain: params.blockchain || "stellar",
    }),
  });
  if (!res.ok) {
    const body = await res.text().catch(() => "");
    console.error(`EtherFuse /ramp/onboarding-url ${res.status}:`, body);
    let parsed: { error?: string; message?: string } = {};
    try { parsed = JSON.parse(body); } catch { /* not JSON */ }
    throw new Error(parsed.error || parsed.message || `EtherFuse error ${res.status}: ${body}`);
  }
  return res.json();
}

/**
 * List assets available for ramping on a given blockchain.
 */
export async function getRampableAssets(currency = "MXN", blockchain = "stellar", wallet?: string): Promise<EtherFuseAsset[]> {
  const params = new URLSearchParams({ currency, blockchain });
  if (wallet) params.set("wallet", wallet);
  const res = await etherfuseFetch(`/ramp/assets?${params}`);
  if (!res.ok) {
    const body = await res.text().catch(() => "");
    console.error(`EtherFuse /ramp/assets ${res.status}:`, body);
    let parsed: { error?: string; message?: string } = {};
    try { parsed = JSON.parse(body); } catch { /* not JSON */ }
    throw new Error(parsed.error || parsed.message || `EtherFuse error ${res.status}: ${body}`);
  }
  const data = await res.json();
  // EtherFuse may return { assets: [...] } or an array directly
  return Array.isArray(data) ? data : (data.assets || data.data || []);
}

/**
 * Get a quote for on-ramp, off-ramp, or swap.
 */
export async function getQuote(params: {
  type: "onramp" | "offramp" | "swap";
  fromCurrency: string;
  toAsset?: string;
  fromAsset?: string;
  toCurrency?: string;
  amount: number;
  blockchain?: string;
  publicKey?: string;
  customerId?: string;
  quoteAssets?: unknown[];
}): Promise<EtherFuseQuote> {
  const blockchain = params.blockchain || "stellar";
  const toAsset = params.toAsset ?? "CETES:GC3CW7EDYRTWQ635VDIGY6S4ZUF5L6TQ7AA4MWS7LEQDBLUSZXV7UPS4";
  const fromAsset = params.fromAsset ?? "USDC:GBBD47IF6LWK7P7MDEVSCWR7DPUWV3NY3DTQEVFL4NAT4AQH3ZLLFLA5";
  // quoteAssets: single enum value as flat sequence — ["variantName", field1, field2]
  const quoteAssets = params.quoteAssets ?? (
    params.type === "onramp"
      ? ["onramp", params.fromCurrency ?? "MXN", toAsset]
      : ["offramp", fromAsset, params.toCurrency ?? "MXN"]
  );
  const requestBody: Record<string, unknown> =
    params.type === "onramp"
      ? {
          quoteId: uuidv4(),
          type: "onramp",
          fromCurrency: params.fromCurrency ?? "MXN",
          toAsset,
          sourceAmount: String(params.amount),
          publicKey: params.publicKey,
          blockchain,
          customerId: params.customerId,
          quoteAssets,
        }
      : {
          quoteId: uuidv4(),
          type: "offramp",
          fromAsset,
          toCurrency: params.toCurrency ?? "MXN",
          sourceAmount: String(params.amount),
          publicKey: params.publicKey,
          blockchain,
          customerId: params.customerId,
          quoteAssets,
        };
  // Remove undefined fields
  Object.keys(requestBody).forEach((k) => requestBody[k] === undefined && delete requestBody[k]);
  const res = await etherfuseFetch("/ramp/quote", {
    method: "POST",
    body: JSON.stringify(requestBody),
  });
  if (!res.ok) {
    const body = await res.text().catch(() => "");
    console.error(`EtherFuse /ramp/quote ${res.status}:`, body);
    let parsed: { error?: string; message?: string } = {};
    try { parsed = JSON.parse(body); } catch { /* not JSON */ }
    throw new Error(parsed.error || parsed.message || `EtherFuse error ${res.status}: ${body}`);
  }
  return res.json();
}

/**
 * Create an order from a previously generated quote.
 */
export async function createOrder(params: {
  quoteId: string;
  customerId: string;
  publicKey: string;
  bankAccountId?: string;
}): Promise<EtherFuseOrder> {
  const res = await etherfuseFetch("/ramp/orders", {
    method: "POST",
    body: JSON.stringify(params),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error((err as { error?: string }).error || `EtherFuse error ${res.status}`);
  }
  const data = await res.json();
  // Response is paginated: { items: [...] } — return the first item
  return Array.isArray(data) ? data[0] : (data.items?.[0] ?? data);
}

/**
 * List orders for a customer.
 */
export async function listOrders(customerId: string): Promise<EtherFuseOrder[]> {
  const res = await etherfuseFetch(`/ramp/orders?customerId=${customerId}`);
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error((err as { error?: string }).error || `EtherFuse error ${res.status}`);
  }
  const data = await res.json();
  return Array.isArray(data) ? data : (data.items || data.orders || data.data || []);
}

/**
 * Get the current MXN/USDC exchange rate (public endpoint).
 */
export async function getExchangeRate(from = "MXN", to = "MXNe"): Promise<ExchangeRate> {
  const res = await etherfuseFetch(`/exchange-rate?from=${from}&to=${to}`);
  if (!res.ok) {
    // Try alternative endpoint shape
    const res2 = await etherfuseFetch(`/ramp/exchange-rate?from=${from}&to=${to}`);
    if (!res2.ok) {
      throw new Error(`Unable to fetch exchange rate (${res.status})`);
    }
    return res2.json();
  }
  return res.json();
}
