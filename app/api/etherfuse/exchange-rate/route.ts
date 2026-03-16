import { NextRequest, NextResponse } from "next/server";
import { getExchangeRate } from "@/lib/etherfuse";

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const from = searchParams.get("from") || "MXN";
  const to = searchParams.get("to") || "MXNe";

  try {
    const rate = await getExchangeRate(from, to);
    return NextResponse.json({ rate });
  } catch (err) {
    console.error("EtherFuse exchange rate error:", err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Failed to fetch exchange rate" },
      { status: 500 }
    );
  }
}
