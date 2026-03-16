// DeFindex SDK config
export const DEFINDEX_API_URL = process.env.DEFINDEX_BASE_URL || "https://api.defindex.io";
export const DEFINDEX_API_KEY = process.env.DEFINDEX_API_KEY || "";

// EtherFuse API config (server-side only)
export const ETHERFUSE_API_URL =
  process.env.ETHERFUSE_API_URL || "https://api.sand.etherfuse.com";
export const ETHERFUSE_API_KEY = process.env.ETHERFUSE_API_KEY || "";

// Default vault addresses (users can also add their own from app.defindex.io)
export const DEFAULT_TESTNET_VAULTS: string[] = [];
export const DEFAULT_MAINNET_VAULTS: string[] = [];

// Well-known Stellar classic assets (code + issuer) used in this app
export const KNOWN_STELLAR_ASSETS = {
  TESTNET: {
    USDC:  { code: "USDC",  issuer: "GBBD47IF6LWK7P7MDEVSCWR7DPUWV3NY3DTQEVFL4NAT4AQH3ZLLFLA5" },
    CETES: { code: "CETES", issuer: "GC3CW7EDYRTWQ635VDIGY6S4ZUF5L6TQ7AA4MWS7LEQDBLUSZXV7UPS4" },
    MXNe:  { code: "MXNe",  issuer: "GC3CW7EDYRTWQ635VDIGY6S4ZUF5L6TQ7AA4MWS7LEQDBLUSZXV7UPS4" },
  },
  MAINNET: {
    USDC:  { code: "USDC",  issuer: "GA5ZSEJYB37JRC5AVCIA5MOP4RHTM335X2KGX3IHOJAPP5RE34K4KZVN" },
    CETES: { code: "CETES", issuer: "" }, // update when mainnet goes live
    MXNe:  { code: "MXNe",  issuer: "" },
  },
} as const;

export type KnownAssetKey = keyof typeof KNOWN_STELLAR_ASSETS.TESTNET;

// Token decimal places for amount conversion
// Stellar native XLM = 7 decimal places (1 XLM = 10_000_000 stroops)
export const TOKEN_DECIMALS = 7;
export const STROOPS_PER_UNIT = Math.pow(10, TOKEN_DECIMALS);

export function toSmallestUnit(amount: string | number, decimals = TOKEN_DECIMALS): number {
  return Math.round(Number(amount) * Math.pow(10, decimals));
}

export function fromSmallestUnit(amount: number, decimals = TOKEN_DECIMALS): number {
  return amount / Math.pow(10, decimals);
}
