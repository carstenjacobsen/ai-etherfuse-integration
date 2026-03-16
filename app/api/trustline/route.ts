import { NextRequest, NextResponse } from "next/server";
import * as StellarSdk from "@stellar/stellar-sdk";
import { getHorizonServer } from "@/lib/stellar";

export async function POST(req: NextRequest) {
  try {
    const { assetCode, assetIssuer, caller, network = "TESTNET" } = await req.json() as {
      assetCode: string;
      assetIssuer: string;
      caller: string;
      network?: string;
    };

    if (!assetCode || !assetIssuer || !caller) {
      return NextResponse.json(
        { error: "assetCode, assetIssuer, and caller are required" },
        { status: 400 }
      );
    }

    const net = network.toUpperCase();
    const server = getHorizonServer(net);
    const account = await server.loadAccount(caller);

    const asset = new StellarSdk.Asset(assetCode, assetIssuer);
    const networkPassphrase =
      net === "TESTNET" ? StellarSdk.Networks.TESTNET : StellarSdk.Networks.PUBLIC;

    const tx = new StellarSdk.TransactionBuilder(account, {
      fee: StellarSdk.BASE_FEE,
      networkPassphrase,
    })
      .addOperation(StellarSdk.Operation.changeTrust({ asset }))
      .setTimeout(300)
      .build();

    return NextResponse.json({ xdr: tx.toXDR() });
  } catch (err) {
    console.error("Build trustline error:", err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Failed to build trustline transaction" },
      { status: 500 }
    );
  }
}
