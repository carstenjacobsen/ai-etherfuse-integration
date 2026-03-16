import { NextRequest, NextResponse } from "next/server";
import { createSDK, mapNetwork, fetchVaultInfo, fetchVaultAPY, extractErrorMessage } from "@/lib/defindex";

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ address: string }> }
) {
  const { address } = await params;
  const { searchParams } = new URL(req.url);
  const freighterNetwork = (searchParams.get("network") || "TESTNET").toUpperCase();
  const userAddress = searchParams.get("user") || undefined;
  const network = mapNetwork(freighterNetwork);

  const sdk = createSDK();

  try {
    const [infoResult, apyResult] = await Promise.allSettled([
      fetchVaultInfo(sdk, address, network),
      fetchVaultAPY(sdk, address, network),
    ]);

    let balanceResult = null;
    if (userAddress) {
      const balRes = await Promise.allSettled([
        sdk.getVaultBalance(address, userAddress, network),
      ]);
      if (balRes[0].status === "fulfilled") {
        balanceResult = balRes[0].value;
      }
    }

    return NextResponse.json({
      address,
      info: infoResult.status === "fulfilled" ? infoResult.value : null,
      apy: apyResult.status === "fulfilled" ? apyResult.value.apy : null,
      balance: balanceResult,
      error:
        infoResult.status === "rejected" ? extractErrorMessage(infoResult.reason) : undefined,
    });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Unknown error" },
      { status: 500 }
    );
  }
}
