import { NextRequest, NextResponse } from "next/server";
import { createOrder, listOrders } from "@/lib/etherfuse";

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const customerId = searchParams.get("customerId");

  if (!customerId) {
    return NextResponse.json({ error: "customerId is required" }, { status: 400 });
  }

  try {
    const orders = await listOrders(customerId);
    return NextResponse.json({ orders });
  } catch (err) {
    console.error("EtherFuse list orders error:", err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Failed to list orders", orders: [] },
      { status: 500 }
    );
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { quoteId, customerId, publicKey, bankAccountId } = body as {
      quoteId: string;
      customerId: string;
      publicKey: string;
      bankAccountId?: string;
    };

    if (!quoteId || !customerId || !publicKey) {
      return NextResponse.json(
        { error: "quoteId, customerId, and publicKey are required" },
        { status: 400 }
      );
    }

    const order = await createOrder({ quoteId, customerId, publicKey, bankAccountId });
    return NextResponse.json({ order });
  } catch (err) {
    console.error("EtherFuse create order error:", err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Failed to create order" },
      { status: 500 }
    );
  }
}
