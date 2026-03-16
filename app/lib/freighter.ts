import {
  isConnected,
  isAllowed,
  requestAccess,
  getAddress,
  signTransaction,
  getNetworkDetails,
} from "@stellar/freighter-api";

export type NetworkType = "TESTNET" | "PUBLIC" | "FUTURENET" | "STANDALONE" | string;

function withTimeout<T>(promise: Promise<T>, ms: number): Promise<T> {
  const timeout = new Promise<never>((_, reject) =>
    setTimeout(() => reject(new Error("timeout")), ms)
  );
  return Promise.race([promise, timeout]);
}

export async function checkFreighterInstalled(): Promise<boolean> {
  try {
    const result = await withTimeout(isConnected(), 2000);
    return !("error" in result);
  } catch {
    return false;
  }
}

export async function checkFreighterAllowed(): Promise<boolean> {
  try {
    const result = await withTimeout(isAllowed(), 2000);
    if ("isAllowed" in result) return result.isAllowed;
    return false;
  } catch {
    return false;
  }
}

export async function connectFreighter(): Promise<{
  address: string;
  network: string;
  networkPassphrase: string;
} | null> {
  try {
    const accessResult = await requestAccess();
    if ("error" in accessResult) throw new Error(accessResult.error);

    const addressResult = await getAddress();
    if ("error" in addressResult) throw new Error(addressResult.error);

    const networkResult = await getNetworkDetails();
    if ("error" in networkResult) throw new Error(networkResult.error);

    return {
      address: addressResult.address,
      network: networkResult.network,
      networkPassphrase: networkResult.networkPassphrase,
    };
  } catch (err) {
    console.error("Error connecting to Freighter:", err);
    return null;
  }
}

export async function getFreighterAddress(): Promise<string | null> {
  try {
    const result = await withTimeout(getAddress(), 2000);
    if ("error" in result) return null;
    return result.address;
  } catch {
    return null;
  }
}

export async function getFreighterNetwork(): Promise<{
  network: string;
  networkPassphrase: string;
} | null> {
  try {
    const result = await withTimeout(getNetworkDetails(), 2000);
    if ("error" in result) return null;
    return { network: result.network, networkPassphrase: result.networkPassphrase };
  } catch {
    return null;
  }
}

export async function signXDR(xdr: string, networkPassphrase: string): Promise<string | null> {
  try {
    const result = await signTransaction(xdr, { networkPassphrase });
    if ("error" in result) throw new Error(result.error);
    return result.signedTxXdr;
  } catch (err) {
    console.error("Error signing transaction:", err);
    return null;
  }
}
