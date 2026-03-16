import { NextRequest, NextResponse } from "next/server";
import { submitSorobanTransaction } from "@/lib/stellar";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { xdr, network = "TESTNET" } = body as { xdr: string; network?: string };

    if (!xdr) {
      return NextResponse.json({ error: "xdr is required" }, { status: 400 });
    }

    const result = await submitSorobanTransaction(xdr, network.toUpperCase());

    if (!result.success) {
      return NextResponse.json({ error: result.error }, { status: 400 });
    }

    return NextResponse.json({ hash: result.hash, success: true });
  } catch (err) {
    console.error("Send transaction error:", err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Failed to submit transaction" },
      { status: 500 }
    );
  }
}
