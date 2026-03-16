"use client";

import { useState } from "react";
import type { EtherFuseQuote, EtherFuseAsset } from "@/lib/etherfuse";

interface QuoteFormProps {
  type: "onramp" | "offramp";
  assets: EtherFuseAsset[];
  isConnected: boolean;
  quoteLoading: boolean;
  quote: EtherFuseQuote | null;
  quoteError: string | null;
  onGetQuote: (params: {
    type: "onramp" | "offramp";
    amount: number;
    fromCurrency?: string;
    toAsset?: string;
    fromAsset?: string;
    toCurrency?: string;
  }) => Promise<EtherFuseQuote | null>;
  onCreateOrder: (quoteId: string) => Promise<unknown>;
  onClearQuote: () => void;
}

/** Derive a short display symbol from a Stellar asset identifier */
function symbolFromIdentifier(identifier: string): string {
  if (!identifier) return "";
  if (identifier === "native") return "XLM";
  return identifier.split(":")[0];
}

export function QuoteForm({
  type,
  assets,
  isConnected,
  quoteLoading,
  quote,
  quoteError,
  onGetQuote,
  onCreateOrder,
  onClearQuote,
}: QuoteFormProps) {
  const [amount, setAmount] = useState("");
  const [selectedAsset, setSelectedAsset] = useState("");
  const [orderLoading, setOrderLoading] = useState(false);

  const isOnramp = type === "onramp";

  // Onramp: receive MXN-pegged tokens (currency !== null); offramp: send crypto assets (currency === null)
  const filteredAssets = assets.filter((a) =>
    isOnramp ? a.currency !== null : a.currency === null
  );

  const selectedSymbol = selectedAsset
    ? symbolFromIdentifier(selectedAsset)
    : isOnramp
    ? "CETES"
    : "USDC";

  const fromLabel = isOnramp ? "MXN" : selectedSymbol;
  const toLabel = isOnramp ? selectedSymbol : "MXN";

  const handleGetQuote = async () => {
    const n = parseFloat(amount);
    if (!n || n <= 0) return;

    if (isOnramp) {
      await onGetQuote({
        type: "onramp",
        amount: n,
        fromCurrency: "MXN",
        toAsset: selectedAsset || undefined,
      });
    } else {
      await onGetQuote({
        type: "offramp",
        amount: n,
        fromAsset: selectedAsset || undefined,
        toCurrency: "MXN",
      });
    }
  };

  const handleCreateOrder = async () => {
    if (!quote) return;
    setOrderLoading(true);
    try {
      await onCreateOrder(quote.quoteId);
    } finally {
      setOrderLoading(false);
    }
  };

  if (!isConnected) {
    return (
      <div className="text-center py-8 text-gray-600 text-sm">
        Connect your wallet to access ramp services
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Asset selector */}
      {filteredAssets.length > 0 && (
        <div>
          <label className="block text-xs text-gray-500 mb-1.5 uppercase tracking-wide">
            {isOnramp ? "Receive Token" : "Send Token"}
          </label>
          <select
            value={selectedAsset}
            onChange={(e) => { setSelectedAsset(e.target.value); onClearQuote(); }}
            className="w-full px-4 py-3 rounded-xl bg-white/5 border border-white/10 text-white focus:outline-none focus:border-violet-500/50 transition-all appearance-none"
          >
            <option value="">{isOnramp ? "Default (CETES)" : "Default (USDC)"}</option>
            {filteredAssets.map((a) => (
              <option key={a.identifier} value={a.identifier}>
                {a.symbol} — {a.name}
              </option>
            ))}
          </select>
        </div>
      )}

      {/* Amount input */}
      <div>
        <label className="block text-xs text-gray-500 mb-1.5 uppercase tracking-wide">
          {isOnramp ? "You Pay (MXN)" : `You Send (${fromLabel})`}
        </label>
        <div className="relative">
          <input
            type="number"
            min="0"
            step="any"
            value={amount}
            onChange={(e) => { setAmount(e.target.value); onClearQuote(); }}
            placeholder={isOnramp ? "e.g. 500" : "e.g. 25"}
            className="w-full px-4 py-3 rounded-xl bg-white/5 border border-white/10 text-white placeholder-gray-600 focus:outline-none focus:border-violet-500/50 transition-all"
          />
          <span className="absolute right-4 top-1/2 -translate-y-1/2 text-sm text-gray-500 font-semibold">
            {fromLabel}
          </span>
        </div>
      </div>

      {/* Get Quote button */}
      <button
        onClick={handleGetQuote}
        disabled={quoteLoading || !amount || parseFloat(amount) <= 0}
        className="w-full py-3 rounded-xl bg-violet-600 hover:bg-violet-700 disabled:opacity-50 disabled:cursor-not-allowed text-white font-semibold transition-colors flex items-center justify-center gap-2"
      >
        {quoteLoading ? (
          <>
            <svg className="w-4 h-4 animate-spin" viewBox="0 0 24 24" fill="none">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
            </svg>
            Getting Quote…
          </>
        ) : (
          "Get Quote"
        )}
      </button>

      {/* Quote error */}
      {quoteError && (
        <div className="p-3 rounded-xl bg-red-500/10 border border-red-500/20">
          <p className="text-sm text-red-400">{quoteError}</p>
        </div>
      )}

      {/* Quote result */}
      {quote && (
        <div className="rounded-xl bg-violet-500/10 border border-violet-500/20 p-4 space-y-3">
          <p className="text-xs text-violet-400 font-semibold uppercase tracking-wide">Quote</p>

          <div className="flex justify-between items-center">
            <span className="text-sm text-gray-400">You {isOnramp ? "pay" : "send"}</span>
            <span className="text-sm font-bold text-white">
              {quote.fromAmount?.toLocaleString(undefined, { maximumFractionDigits: 6 })} {fromLabel}
            </span>
          </div>

          <div className="flex justify-between items-center">
            <span className="text-sm text-gray-400">You receive</span>
            <span className="text-sm font-bold text-emerald-400">
              {quote.toAmount?.toLocaleString(undefined, { maximumFractionDigits: 6 })} {toLabel}
            </span>
          </div>

          {quote.exchangeRate && (
            <div className="flex justify-between items-center">
              <span className="text-sm text-gray-400">Rate</span>
              <span className="text-sm text-gray-300">
                1 {toLabel} = {(1 / quote.exchangeRate).toLocaleString(undefined, { maximumFractionDigits: 4 })} {fromLabel}
              </span>
            </div>
          )}

          {quote.fees?.total != null && (
            <div className="flex justify-between items-center">
              <span className="text-sm text-gray-400">Total fees</span>
              <span className="text-sm text-gray-300">
                {quote.fees.total.toLocaleString(undefined, { maximumFractionDigits: 2 })} {fromLabel}
              </span>
            </div>
          )}

          {quote.expiresAt && (
            <p className="text-xs text-gray-600">
              Quote expires: {new Date(quote.expiresAt).toLocaleTimeString()}
            </p>
          )}

          <div className="flex gap-2 pt-1">
            <button
              onClick={handleCreateOrder}
              disabled={orderLoading}
              className="flex-1 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white text-sm font-semibold transition-colors"
            >
              {orderLoading ? "Creating Order…" : isOnramp ? "Buy Now" : "Sell Now"}
            </button>
            <button
              onClick={onClearQuote}
              className="px-4 py-2.5 rounded-xl bg-white/5 hover:bg-white/10 text-gray-400 hover:text-white text-sm font-medium transition-colors"
            >
              Cancel
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
