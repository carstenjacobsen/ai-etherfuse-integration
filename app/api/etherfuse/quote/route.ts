import { NextRequest, NextResponse } from "next/server";
import { getQuote } from "@/lib/etherfuse";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { type, fromCurrency, toAsset, fromAsset, toCurrency, amount, publicKey, blockchain, customerId } =
      body as {
        type: "onramp" | "offramp" | "swap";
        fromCurrency?: string;
        toAsset?: string;
        fromAsset?: string;
        toCurrency?: string;
        amount: number;
        publicKey?: string;
        blockchain?: string;
        customerId?: string;
      };

    if (!type || !amount || amount <= 0) {
      return NextResponse.json(
        { error: "type and amount are required" },
        { status: 400 }
      );
    }

    const quote = await getQuote({
      type,
      fromCurrency: fromCurrency || "MXN",
      toAsset,
      fromAsset,
      toCurrency,
      amount,
      publicKey,
      blockchain,
      customerId,
    });

    return NextResponse.json({ quote });
  } catch (err) {
    console.error("EtherFuse quote error:", err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Failed to get quote" },
      { status: 500 }
    );
  }
}
