"use client";

import { useState } from "react";
import { OnboardingCard } from "./OnboardingCard";
import { QuoteForm } from "./QuoteForm";
import { OrderCard } from "./OrderCard";
import { AddTrustlineButton } from "./AddTrustlineButton";
import type { EtherFuseAsset, EtherFuseQuote, EtherFuseOrder } from "@/lib/etherfuse";
import { KNOWN_STELLAR_ASSETS } from "@/lib/constants";

interface RampTabProps {
  isConnected: boolean;
  walletAddress: string | null;
  network: string | null;
  onSign: (xdr: string) => Promise<string | null>;
  customerId: string | null;
  assets: EtherFuseAsset[];
  assetsLoading: boolean;
  quote: EtherFuseQuote | null;
  quoteLoading: boolean;
  quoteError: string | null;
  orders: EtherFuseOrder[];
  activeOrder: EtherFuseOrder | null;
  orderError: string | null;
  onGenerateOnboardingUrl: () => Promise<string | null>;
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
  onClearActiveOrder: () => void;
  onRefreshOrders: () => void;
}

type RampDirection = "onramp" | "offramp";

export function RampTab({
  isConnected,
  walletAddress,
  network,
  onSign,
  customerId,
  assets,
  assetsLoading,
  quote,
  quoteLoading,
  quoteError,
  orders,
  activeOrder,
  orderError,
  onGenerateOnboardingUrl,
  onGetQuote,
  onCreateOrder,
  onClearQuote,
  onClearActiveOrder,
  onRefreshOrders,
}: RampTabProps) {
  const [direction, setDirection] = useState<RampDirection>("onramp");

  return (
    <div className="space-y-6">
      {/* EtherFuse branding header */}
      <div className="flex items-center gap-3">
        <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-violet-500 to-purple-600 flex items-center justify-center">
          <svg className="w-4 h-4 text-white" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M8 7h12m0 0l-4-4m4 4l-4 4m0 5H4m0 0l4 4m-4-4l4-4" />
          </svg>
        </div>
        <div>
          <h2 className="text-base font-bold text-white">EtherFuse Ramp</h2>
          <p className="text-xs text-gray-500">MXN ↔ MXNe on Stellar • Powered by EtherFuse</p>
        </div>
      </div>

      {/* KYC Onboarding */}
      <OnboardingCard
        isConnected={isConnected}
        customerId={customerId}
        onGenerateUrl={onGenerateOnboardingUrl}
      />

      {/* Direction toggle */}
      {isConnected && (
        <div className="flex rounded-xl bg-white/5 p-1 gap-1">
          <button
            onClick={() => { setDirection("onramp"); onClearQuote(); }}
            className={`flex-1 py-2 rounded-lg text-sm font-semibold transition-colors ${
              direction === "onramp"
                ? "bg-violet-600 text-white"
                : "text-gray-400 hover:text-white"
            }`}
          >
            Buy Crypto
          </button>
          <button
            onClick={() => { setDirection("offramp"); onClearQuote(); }}
            className={`flex-1 py-2 rounded-lg text-sm font-semibold transition-colors ${
              direction === "offramp"
                ? "bg-violet-600 text-white"
                : "text-gray-400 hover:text-white"
            }`}
          >
            Sell Crypto
          </button>
        </div>
      )}

      {/* Quote form */}
      {isConnected && (
        <div className="rounded-2xl bg-white/5 border border-white/10 p-5">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-sm font-semibold text-white">
              {direction === "onramp" ? "Buy Crypto with Mexican Peso" : "Sell Crypto for Mexican Peso"}
            </h3>
            {assetsLoading && (
              <span className="text-xs text-gray-500">Loading assets…</span>
            )}
          </div>
          <QuoteForm
            type={direction}
            assets={assets}
            isConnected={isConnected}
            quoteLoading={quoteLoading}
            quote={quote}
            quoteError={quoteError}
            onGetQuote={onGetQuote}
            onCreateOrder={onCreateOrder}
            onClearQuote={onClearQuote}
          />
        </div>
      )}

      {/* Active order / order error */}
      {activeOrder && (
        <div>
          <h3 className="text-sm font-semibold text-white mb-3">Active Order</h3>
          <OrderCard order={activeOrder} onDismiss={onClearActiveOrder} />
        </div>
      )}

      {orderError && (
        <div className="p-3 rounded-xl bg-red-500/10 border border-red-500/20">
          <p className="text-sm text-red-400">{orderError}</p>
        </div>
      )}

      {/* Order history */}
      {orders.length > 0 && (
        <div>
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-sm font-semibold text-white">Order History</h3>
            <button
              onClick={onRefreshOrders}
              className="text-xs text-gray-500 hover:text-white transition-colors"
            >
              Refresh
            </button>
          </div>
          <div className="space-y-3">
            {orders.slice(0, 5).map((order) => (
              <OrderCard key={order.orderId} order={order} />
            ))}
          </div>
        </div>
      )}

      {/* Trustlines section */}
      {isConnected && walletAddress && network && (
        <div className="rounded-2xl bg-white/5 border border-white/10 p-5">
          <h3 className="text-sm font-semibold text-white mb-1">Required Trustlines</h3>
          <p className="text-xs text-gray-500 mb-4">
            Your account needs trustlines for these assets to send and receive them on Stellar.
          </p>
          {(() => {
            const netKey = network.toUpperCase() === "PUBLIC" ? "MAINNET" : "TESTNET";
            const assets = KNOWN_STELLAR_ASSETS[netKey as keyof typeof KNOWN_STELLAR_ASSETS];
            return (
              <div className="grid grid-cols-1 gap-2 sm:grid-cols-3">
                {([assets.USDC, assets.CETES, assets.MXNe] as { code: string; issuer: string }[]).map((asset) => (
                  <AddTrustlineButton
                    key={asset.code}
                    assetCode={asset.code}
                    assetIssuer={asset.issuer}
                    callerAddress={walletAddress}
                    network={network}
                    onSign={onSign}
                  />
                ))}
              </div>
            );
          })()}
        </div>
      )}

      {/* Info footer */}
      <div className="rounded-xl bg-white/3 border border-white/5 p-4">
        <p className="text-xs text-gray-600 leading-relaxed">
          EtherFuse enables MXN on/off-ramp via Mexican CLABE bank transfers. Funds typically
          settle within 1–24 hours. KYC verification is required once per account.
          All transactions are processed by EtherFuse on the Stellar testnet.
        </p>
      </div>
    </div>
  );
}
