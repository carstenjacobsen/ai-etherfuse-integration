import * as StellarSdk from "@stellar/stellar-sdk";

function humanizeStellarError(msg: string): string {
  const lower = msg.toLowerCase();
  if (lower.includes("missingtrustline") || lower.includes("missing_trustline")) {
    return "Missing trustline — your account needs a trustline for one of the vault's assets. Add it in your Stellar wallet (e.g. via Stellar Laboratory or the asset's website) and try again.";
  }
  return msg;
}

export type HorizonServer = StellarSdk.Horizon.Server;

const TESTNET_HORIZON = "https://horizon-testnet.stellar.org";
const MAINNET_HORIZON = "https://horizon.stellar.org";
const TESTNET_SOROBAN_RPC = "https://soroban-testnet.stellar.org";
const MAINNET_SOROBAN_RPC = "https://soroban.stellar.org";

export function getHorizonServer(network: string): HorizonServer {
  if (network === "TESTNET") return new StellarSdk.Horizon.Server(TESTNET_HORIZON);
  return new StellarSdk.Horizon.Server(MAINNET_HORIZON);
}

export function getSorobanRpcUrl(network: string): string {
  return network === "TESTNET" ? TESTNET_SOROBAN_RPC : MAINNET_SOROBAN_RPC;
}

export interface AccountBalance {
  xlm: string;
  assets: { code: string; issuer: string; balance: string }[];
}

export async function getAccountBalances(address: string, network: string): Promise<AccountBalance> {
  try {
    const server = getHorizonServer(network);
    const account = await server.loadAccount(address);
    let xlm = "0";
    const assets: { code: string; issuer: string; balance: string }[] = [];

    for (const balance of account.balances) {
      if (balance.asset_type === "native") {
        xlm = balance.balance;
      } else if (
        balance.asset_type === "credit_alphanum4" ||
        balance.asset_type === "credit_alphanum12"
      ) {
        assets.push({
          code: balance.asset_code,
          issuer: balance.asset_issuer,
          balance: balance.balance,
        });
      }
    }
    return { xlm, assets };
  } catch {
    return { xlm: "0", assets: [] };
  }
}

export async function submitSorobanTransaction(
  signedXdr: string,
  network: string
): Promise<{ hash: string; success: boolean; error?: string }> {
  try {
    const rpcUrl = getSorobanRpcUrl(network);
    const server = new StellarSdk.rpc.Server(rpcUrl);
    const networkPassphrase =
      network === "TESTNET" ? StellarSdk.Networks.TESTNET : StellarSdk.Networks.PUBLIC;

    const tx = StellarSdk.TransactionBuilder.fromXDR(signedXdr, networkPassphrase);
    const sendResponse = await server.sendTransaction(tx);

    if (sendResponse.status === "ERROR") {
      // Try to surface a meaningful error string from the RPC response
      const errDetail =
        (sendResponse as Record<string, unknown>).errorResult
          ? String((sendResponse as Record<string, unknown>).errorResult)
          : undefined;
      return {
        hash: sendResponse.hash,
        success: false,
        error: humanizeStellarError(errDetail || "Transaction rejected by the network"),
      };
    }

    let getResponse = await server.getTransaction(sendResponse.hash);
    let retries = 0;
    while (getResponse.status === StellarSdk.rpc.Api.GetTransactionStatus.NOT_FOUND && retries < 20) {
      await new Promise((r) => setTimeout(r, 1500));
      getResponse = await server.getTransaction(sendResponse.hash);
      retries++;
    }

    if (getResponse.status === StellarSdk.rpc.Api.GetTransactionStatus.SUCCESS) {
      return { hash: sendResponse.hash, success: true };
    }

    return { hash: sendResponse.hash, success: false, error: "Transaction did not confirm in time" };
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Submit failed";
    return { hash: "", success: false, error: humanizeStellarError(msg) };
  }
}

export async function submitClassicTransaction(
  signedXdr: string,
  network: string
): Promise<{ hash: string; success: boolean; error?: string }> {
  try {
    const server = getHorizonServer(network.toUpperCase());
    const networkPassphrase =
      network.toUpperCase() === "TESTNET" ? StellarSdk.Networks.TESTNET : StellarSdk.Networks.PUBLIC;
    const tx = StellarSdk.TransactionBuilder.fromXDR(signedXdr, networkPassphrase);
    const result = await server.submitTransaction(tx);
    return { hash: result.hash, success: true };
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Submit failed";
    return { hash: "", success: false, error: humanizeStellarError(msg) };
  }
}

export function formatAddress(address: string): string {
  if (!address) return "";
  return `${address.slice(0, 6)}...${address.slice(-6)}`;
}

export function getExplorerUrl(hash: string, network: string): string {
  const base =
    network === "TESTNET"
      ? "https://stellar.expert/explorer/testnet/tx/"
      : "https://stellar.expert/explorer/public/tx/";
  return `${base}${hash}`;
}
