import { NextRequest, NextResponse } from "next/server";
import { createSDK, mapNetwork, fetchVaultInfo, fetchVaultAPY, extractErrorMessage } from "@/lib/defindex";
import { DEFAULT_TESTNET_VAULTS, DEFAULT_MAINNET_VAULTS } from "@/lib/constants";
import type { VaultInfoResponse } from "@/lib/defindex";

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const freighterNetwork = (searchParams.get("network") || "TESTNET").toUpperCase();
  const network = mapNetwork(freighterNetwork);

  const addresses =
    freighterNetwork === "PUBLIC" ? DEFAULT_MAINNET_VAULTS : DEFAULT_TESTNET_VAULTS;

  if (addresses.length === 0) {
    return NextResponse.json({ vaults: [] });
  }

  const sdk = createSDK();

  const results = await Promise.allSettled(
    addresses.map(async (address) => {
      const [info, apyRes] = await Promise.allSettled([
        fetchVaultInfo(sdk, address, network),
        fetchVaultAPY(sdk, address, network),
      ]);

      return {
        address,
        info: info.status === "fulfilled" ? info.value : null,
        apy: apyRes.status === "fulfilled" ? apyRes.value.apy : null,
        error: info.status === "rejected" ? extractErrorMessage(info.reason) : undefined,
      };
    })
  );

  type VaultResult = { address: string; info: VaultInfoResponse | null; apy: number | null; error?: string };
  const vaults = results
    .filter((r) => r.status === "fulfilled")
    .map((r) => (r as PromiseFulfilledResult<VaultResult>).value);

  return NextResponse.json({ vaults });
}
