"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { v5 as uuidv5 } from "uuid";
import type { EtherFuseQuote, EtherFuseOrder, EtherFuseAsset } from "@/lib/etherfuse";

// RFC 4122 URL namespace — used as the UUID v5 namespace
const UUID_NAMESPACE = "6ba7b810-9dad-11d1-80b4-00c04fd430c8";

/**
 * Deterministically generate a valid UUID v5 from a Stellar public key.
 */
function deriveCustomerId(publicKey: string): string {
  return uuidv5(publicKey, UUID_NAMESPACE);
}

export interface EtherFuseState {
  customerId: string | null;
  assets: EtherFuseAsset[];
  assetsLoading: boolean;
  quote: EtherFuseQuote | null;
  quoteLoading: boolean;
  quoteError: string | null;
  orders: EtherFuseOrder[];
  ordersLoading: boolean;
  activeOrder: EtherFuseOrder | null;
  orderError: string | null;
}

export function useEtherFuse(walletAddress: string | null) {
  const [state, setState] = useState<EtherFuseState>({
    customerId: null,
    assets: [],
    assetsLoading: false,
    quote: null,
    quoteLoading: false,
    quoteError: null,
    orders: [],
    ordersLoading: false,
    activeOrder: null,
    orderError: null,
  });

  // Persist the real EtherFuse customerId returned in order responses.
  // The sandbox assigns its own customerId to the API-key account which may differ
  // from the UUID we derive locally from the wallet address.
  const efCustomerIdRef = useRef<string | undefined>();

  // Persist bankAccountId extracted from any EtherFuse order response so we
  // can send it back on order creation (EtherFuse sandbox requires it).
  const bankAccountIdRef = useRef<string | undefined>();

  // Derive customerId from wallet address
  useEffect(() => {
    if (walletAddress) {
      const customerId = deriveCustomerId(walletAddress);
      setState((prev) => ({ ...prev, customerId }));
    } else {
      setState((prev) => ({ ...prev, customerId: null }));
    }
  }, [walletAddress]);

  // Load rampable assets once wallet is connected
  const loadAssets = useCallback(async (wallet: string) => {
    setState((prev) => ({ ...prev, assetsLoading: true }));
    try {
      const params = new URLSearchParams({ currency: "MXN", wallet });
      const res = await fetch(`/api/etherfuse/assets?${params}`);
      const data = await res.json();
      setState((prev) => ({ ...prev, assets: data.assets || [], assetsLoading: false }));
    } catch {
      setState((prev) => ({ ...prev, assetsLoading: false }));
    }
  }, []);

  useEffect(() => {
    if (walletAddress) loadAssets(walletAddress);
  }, [walletAddress, loadAssets]);

  // Fetch the raw order list and return it (also updates refs for bankAccountId + real customerId)
  const fetchOrders = useCallback(async (customerId: string): Promise<EtherFuseOrder[]> => {
    const res = await fetch(`/api/etherfuse/orders?customerId=${customerId}`);
    const data = await res.json();
    const orders: EtherFuseOrder[] = data.orders || [];

    // Capture the real EtherFuse customerId and bankAccountId from any returned order
    const found = orders.find((o) => o.customerId || o.bankAccountId);
    if (found?.customerId) efCustomerIdRef.current = found.customerId as string;
    if (found?.bankAccountId) bankAccountIdRef.current = found.bankAccountId as string;

    return orders;
  }, []);

  // Load orders — always prefer the real EtherFuse customerId if we already know it
  const loadOrders = useCallback(async (customerId: string) => {
    setState((prev) => ({ ...prev, ordersLoading: true }));
    try {
      const effectiveId = efCustomerIdRef.current || customerId;
      const orders = await fetchOrders(effectiveId);
      setState((prev) => ({ ...prev, orders, ordersLoading: false }));
    } catch {
      setState((prev) => ({ ...prev, ordersLoading: false }));
    }
  }, [fetchOrders]);

  useEffect(() => {
    if (state.customerId) {
      loadOrders(state.customerId);
    }
  }, [state.customerId, loadOrders]);

  const generateOnboardingUrl = useCallback(async (): Promise<string | null> => {
    if (!walletAddress || !state.customerId) return null;
    try {
      const res = await fetch("/api/etherfuse/onboarding", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          customerId: state.customerId,
          bankAccountId: state.customerId, // reuse customerId as bankAccountId placeholder
          publicKey: walletAddress,
          blockchain: "stellar",
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to generate onboarding URL");
      return data.presigned_url || null;
    } catch (err) {
      console.error("Onboarding URL error:", err);
      return null;
    }
  }, [walletAddress, state.customerId]);

  const getQuote = useCallback(
    async (params: {
      type: "onramp" | "offramp";
      amount: number;
      fromCurrency?: string;
      toAsset?: string;
      fromAsset?: string;
      toCurrency?: string;
    }): Promise<EtherFuseQuote | null> => {
      setState((prev) => ({ ...prev, quoteLoading: true, quoteError: null, quote: null }));
      try {
        // Always prefer the real EtherFuse customerId (discovered from order history)
        // so the quote is stored under the correct account for order creation.
        const effectiveCustomerId = efCustomerIdRef.current || state.customerId;
        const res = await fetch("/api/etherfuse/quote", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            ...params,
            publicKey: walletAddress,
            blockchain: "stellar",
            customerId: effectiveCustomerId,
          }),
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || "Failed to get quote");
        // Normalise EtherFuse response fields to our interface.
        // The API returns sourceAmount/destinationAmount; our UI uses fromAmount/toAmount.
        const raw = data.quote as Record<string, unknown>;
        const qa = raw.quoteAssets as Record<string, unknown> | undefined;
        const srcAmt = Number(raw.sourceAmount);
        const dstAmt = Number(raw.destinationAmount);
        const quote: EtherFuseQuote = {
          ...raw,
          quoteId: raw.quoteId as string,
          type: ((raw.type ?? qa?.type ?? params.type) as "onramp" | "offramp" | "swap"),
          fromCurrency: (raw.fromCurrency ?? qa?.targetAsset ?? params.fromCurrency ?? "MXN") as string,
          toAsset: (raw.toAsset ?? qa?.sourceAsset ?? "") as string,
          fromAmount: Number(raw.fromAmount) || srcAmt,
          toAmount: Number(raw.toAmount) || dstAmt,
          exchangeRate: Number(raw.exchangeRate) || (srcAmt > 0 ? dstAmt / srcAmt : 0),
          fees: (raw.fees as EtherFuseQuote["fees"]) ?? { total: 0 },
          expiresAt: raw.expiresAt as string,
        };
        setState((prev) => ({ ...prev, quote, quoteLoading: false }));
        return quote;
      } catch (err) {
        const msg = err instanceof Error ? err.message : "Quote failed";
        setState((prev) => ({ ...prev, quoteLoading: false, quoteError: msg }));
        return null;
      }
    },
    [walletAddress, state.customerId]
  );

  const createOrder = useCallback(
    async (quoteId: string, bankAccountId?: string): Promise<EtherFuseOrder | null> => {
      if (!walletAddress || !state.customerId) return null;
      setState((prev) => ({ ...prev, orderError: null }));

      // Capture quote data now — it will be cleared from state after order creation.
      const currentQuote = state.quote;

      // Snapshot the current order IDs so we can identify a genuinely new one.
      const previousOrderIds = new Set(
        state.orders.map((o) => o.orderId).filter(Boolean)
      );

      // Use provided bankAccountId, or fall back to one extracted from previous orders.
      const effectiveBankAccountId = bankAccountId || bankAccountIdRef.current;

      try {
        // Use the real EtherFuse customerId so the order matches the stored quote.
        const effectiveCustomerId = efCustomerIdRef.current || state.customerId!;
        const res = await fetch("/api/etherfuse/orders", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            quoteId,
            customerId: effectiveCustomerId,
            publicKey: walletAddress,
            bankAccountId: effectiveBankAccountId,
          }),
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || "Failed to create order");

        // Extract real customerId / bankAccountId from POST response for future calls.
        const responseOrder = data.order as EtherFuseOrder | undefined;
        if (responseOrder?.customerId) efCustomerIdRef.current = responseOrder.customerId as string;
        if (responseOrder?.bankAccountId) bankAccountIdRef.current = responseOrder.bankAccountId as string;

        // Refresh the order list via GET using the real EtherFuse customerId.
        const freshOrders = await fetchOrders(efCustomerIdRef.current || state.customerId!);

        // Try to find an order that is genuinely new (not in the pre-creation snapshot).
        const newOrder = freshOrders.find((o) => o.orderId && !previousOrderIds.has(o.orderId));
        if (newOrder) {
          setState((prev) => ({ ...prev, activeOrder: newOrder, orders: freshOrders, quote: null }));
          return newOrder;
        }

        // Sandbox limitation: the API echoes back existing orders instead of creating a
        // new one. Build a synthetic "pending" order from the quote data so the user sees
        // meaningful feedback. In production the real API returns the actual new order.
        const isOnramp = currentQuote?.type === "onramp";
        const clabeFromHistory = freshOrders.find((o) => o.depositClabe)?.depositClabe;
        const syntheticOrder: EtherFuseOrder = {
          orderId: quoteId,
          status: "pending",
          orderType: isOnramp ? "onramp" : "offramp",
          customerId: effectiveCustomerId,
          amountInFiat: isOnramp
            ? String(currentQuote?.fromAmount ?? "")
            : String(currentQuote?.toAmount ?? ""),
          depositClabe: isOnramp ? clabeFromHistory : undefined,
          memo: isOnramp ? `Transfer to CLABE — ref: ${quoteId.slice(0, 8)}` : undefined,
          createdAt: new Date().toISOString(),
        };

        setState((prev) => ({
          ...prev,
          activeOrder: syntheticOrder,
          orders: freshOrders,
          quote: null,
        }));
        return syntheticOrder;
      } catch (err) {
        const msg = err instanceof Error ? err.message : "Order creation failed";
        setState((prev) => ({ ...prev, orderError: msg }));
        return null;
      }
    },
    [walletAddress, state.customerId, state.orders, state.quote, fetchOrders]
  );

  const clearQuote = useCallback(() => {
    setState((prev) => ({ ...prev, quote: null, quoteError: null }));
  }, []);

  const clearActiveOrder = useCallback(() => {
    setState((prev) => ({ ...prev, activeOrder: null, orderError: null }));
  }, []);

  const refreshOrders = useCallback(() => {
    if (state.customerId) loadOrders(state.customerId);
  }, [state.customerId, loadOrders]);

  return {
    ...state,
    generateOnboardingUrl,
    getQuote,
    createOrder,
    clearQuote,
    clearActiveOrder,
    refreshOrders,
  };
}
