import { NextRequest, NextResponse } from "next/server";
import { createSDK, mapNetwork, buildDepositXDR, extractErrorMessage } from "@/lib/defindex";

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ address: string }> }
) {
  const { address } = await params;

  try {
    const body = await req.json();
    const { amounts, caller, network: freighterNetwork = "TESTNET" } = body as {
      amounts: number[];
      caller: string;
      network?: string;
    };

    if (!amounts || !Array.isArray(amounts) || amounts.length === 0) {
      return NextResponse.json({ error: "amounts array is required" }, { status: 400 });
    }
    if (!caller) {
      return NextResponse.json({ error: "caller address is required" }, { status: 400 });
    }

    const network = mapNetwork(freighterNetwork.toUpperCase());
    const sdk = createSDK();
    const xdr = await buildDepositXDR(sdk, address, amounts, caller, network);

    return NextResponse.json({ xdr });
  } catch (err) {
    console.error("Deposit XDR error:", err);
    return NextResponse.json(
      { error: extractErrorMessage(err) || "Failed to build deposit transaction" },
      { status: 500 }
    );
  }
}
