import { NextRequest, NextResponse } from "next/server";
import { generateOnboardingUrl } from "@/lib/etherfuse";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { customerId, bankAccountId, publicKey, blockchain = "stellar" } = body as {
      customerId: string;
      bankAccountId: string;
      publicKey: string;
      blockchain?: string;
    };

    if (!customerId || !publicKey) {
      return NextResponse.json(
        { error: "customerId and publicKey are required" },
        { status: 400 }
      );
    }

    const result = await generateOnboardingUrl({
      customerId,
      bankAccountId: bankAccountId || customerId, // fallback to customerId if no bank account yet
      publicKey,
      blockchain,
    });

    return NextResponse.json(result);
  } catch (err) {
    console.error("EtherFuse onboarding error:", err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Failed to generate onboarding URL" },
      { status: 500 }
    );
  }
}
