import { NextRequest, NextResponse } from "next/server";
import { createSDK, mapNetwork, buildWithdrawXDR, extractErrorMessage } from "@/lib/defindex";

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ address: string }> }
) {
  const { address } = await params;

  try {
    const body = await req.json();
    const { shares, caller, network: freighterNetwork = "TESTNET" } = body as {
      shares: number;
      caller: string;
      network?: string;
    };

    if (!shares || shares <= 0) {
      return NextResponse.json({ error: "shares must be a positive number" }, { status: 400 });
    }
    if (!caller) {
      return NextResponse.json({ error: "caller address is required" }, { status: 400 });
    }

    const network = mapNetwork(freighterNetwork.toUpperCase());
    const sdk = createSDK();
    const xdr = await buildWithdrawXDR(sdk, address, shares, caller, network);

    return NextResponse.json({ xdr });
  } catch (err) {
    console.error("Withdraw XDR error:", err);
    return NextResponse.json(
      { error: extractErrorMessage(err) || "Failed to build withdraw transaction" },
      { status: 500 }
    );
  }
}
