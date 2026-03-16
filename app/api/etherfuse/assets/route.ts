import { NextRequest, NextResponse } from "next/server";
import { getRampableAssets } from "@/lib/etherfuse";

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const currency = searchParams.get("currency") || "MXN";
  const wallet = searchParams.get("wallet") || undefined;

  try {
    const assets = await getRampableAssets(currency, "stellar", wallet);
    return NextResponse.json({ assets });
  } catch (err) {
    console.error("EtherFuse assets error:", err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Failed to fetch assets", assets: [] },
      { status: 500 }
    );
  }
}
