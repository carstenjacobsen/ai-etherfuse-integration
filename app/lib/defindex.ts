import { DefindexSDK, SupportedNetworks } from "@defindex/sdk";
import type { VaultInfoResponse, VaultBalanceResponse, VaultApyResponse } from "@defindex/sdk";
import { DEFINDEX_API_URL, DEFINDEX_API_KEY } from "./constants";

export type { VaultInfoResponse, VaultBalanceResponse, VaultApyResponse };

function humanizeError(msg: string): string {
  const lower = msg.toLowerCase();
  if (lower.includes("trying to call a missing value")) {
    return "Not a valid DeFindex vault — check the contract address";
  }
  if (lower.includes("missingtrustline") || lower.includes("missing_trustline")) {
    return "Missing trustline — your account needs a trustline for one of the vault's assets. Add it in your Stellar wallet (e.g. via Stellar Laboratory or the asset's website) and try again.";
  }
  return msg;
}

export function extractErrorMessage(reason: unknown): string {
  if (!reason) return "Unknown error";
  if (typeof reason === "string") return humanizeError(reason || "Unknown error");
  if (reason instanceof Error) return humanizeError(reason.message);
  if (typeof reason === "object") {
    const r = reason as Record<string, unknown>;
    if (typeof r.message === "string") return humanizeError(r.message);
    if (typeof r.error === "string") return humanizeError(r.error);
    if (typeof r.detail === "string") return humanizeError(r.detail);
    if (typeof r.msg === "string") return humanizeError(r.msg);
    try { return JSON.stringify(r); } catch { /* fallthrough */ }
  }
  return "API error";
}

export function createSDK(): DefindexSDK {
  return new DefindexSDK({
    apiKey: DEFINDEX_API_KEY || undefined,
    baseUrl: DEFINDEX_API_URL,
    defaultNetwork: SupportedNetworks.TESTNET,
  });
}

export function mapNetwork(freighterNetwork: string): SupportedNetworks {
  if (freighterNetwork === "TESTNET") return SupportedNetworks.TESTNET;
  if (freighterNetwork === "PUBLIC") return SupportedNetworks.MAINNET;
  return SupportedNetworks.TESTNET;
}

export async function fetchVaultInfo(
  sdk: DefindexSDK,
  vaultAddress: string,
  network: SupportedNetworks
): Promise<VaultInfoResponse> {
  return sdk.getVaultInfo(vaultAddress, network);
}

export async function fetchVaultBalance(
  sdk: DefindexSDK,
  vaultAddress: string,
  userAddress: string,
  network: SupportedNetworks
): Promise<VaultBalanceResponse> {
  return sdk.getVaultBalance(vaultAddress, userAddress, network);
}

export async function fetchVaultAPY(
  sdk: DefindexSDK,
  vaultAddress: string,
  network: SupportedNetworks
): Promise<VaultApyResponse> {
  return sdk.getVaultAPY(vaultAddress, network);
}

export async function buildDepositXDR(
  sdk: DefindexSDK,
  vaultAddress: string,
  amounts: number[],
  callerAddress: string,
  network: SupportedNetworks
): Promise<string> {
  const response = await sdk.depositToVault(
    vaultAddress,
    { amounts, caller: callerAddress, invest: true, slippageBps: 100 },
    network
  );
  return response.xdr;
}

export async function buildWithdrawXDR(
  sdk: DefindexSDK,
  vaultAddress: string,
  shares: number,
  callerAddress: string,
  network: SupportedNetworks
): Promise<string> {
  const response = await sdk.withdrawShares(
    vaultAddress,
    { shares, caller: callerAddress, slippageBps: 100 },
    network
  );
  return response.xdr;
}
