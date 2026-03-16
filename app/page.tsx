"use client";

import { useState } from "react";
import { ConnectButton } from "./components/ConnectButton";
import { BalanceCard } from "./components/BalanceCard";
import { RampTab } from "./components/RampTab";
import { YieldTab } from "./components/YieldTab";
import { useFreighter } from "./hooks/useFreighter";
import { useVaults } from "./hooks/useVaults";
import { useEtherFuse } from "./hooks/useEtherFuse";

type Tab = "portfolio" | "ramp" | "yield";

export default function Home() {
  const [activeTab, setActiveTab] = useState<Tab>("portfolio");

  const {
    isInstalled,
    isConnected,
    address,
    network,
    balance,
    loading,
    balanceLoading,
    connect,
    disconnect,
    refreshBalance,
    sign,
  } = useFreighter();

  const {
    vaults,
    loading: vaultsLoading,
    addVault,
    refreshVault,
    refetch: refetchVaults,
    needsApiKey,
  } = useVaults(network, address);

  const etherFuse = useEtherFuse(address);

  const tabs: { id: Tab; label: string; icon: React.ReactNode }[] = [
    {
      id: "portfolio",
      label: "Portfolio",
      icon: (
        <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z" />
        </svg>
      ),
    },
    {
      id: "ramp",
      label: "Ramp",
      icon: (
        <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M8 7h12m0 0l-4-4m4 4l-4 4m0 5H4m0 0l4 4m-4-4l4-4" />
        </svg>
      ),
    },
    {
      id: "yield",
      label: "Yield",
      icon: (
        <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
        </svg>
      ),
    },
  ];

  return (
    <div className="min-h-screen bg-gray-950 text-white">
      {/* Background gradient */}
      <div className="fixed inset-0 bg-gradient-to-br from-violet-950/20 via-gray-950 to-emerald-950/20 pointer-events-none" />

      {/* Header */}
      <header className="relative z-10 border-b border-white/5 bg-gray-950/80 backdrop-blur-md sticky top-0">
        <div className="max-w-2xl mx-auto px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-1.5">
              <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-violet-500 to-emerald-500 flex items-center justify-center">
                <svg className="w-4 h-4 text-white" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
              <span className="font-bold text-white text-sm">Stellar Wallet</span>
            </div>
          </div>
          <ConnectButton
            isInstalled={isInstalled}
            isConnected={isConnected}
            loading={loading}
            address={address}
            network={network}
            onConnect={connect}
            onDisconnect={disconnect}
          />
        </div>
      </header>

      {/* Main content */}
      <main className="relative z-10 max-w-2xl mx-auto px-4 py-6">
        {/* Tab bar */}
        <div className="flex rounded-2xl bg-white/5 p-1 gap-1 mb-6">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl text-sm font-semibold transition-all ${
                activeTab === tab.id
                  ? tab.id === "ramp"
                    ? "bg-violet-600 text-white shadow-lg shadow-violet-500/20"
                    : tab.id === "yield"
                    ? "bg-emerald-600 text-white shadow-lg shadow-emerald-500/20"
                    : "bg-white/15 text-white"
                  : "text-gray-500 hover:text-gray-300"
              }`}
            >
              {tab.icon}
              {tab.label}
            </button>
          ))}
        </div>

        {/* Portfolio tab */}
        {activeTab === "portfolio" && (
          <div className="space-y-6">
            <BalanceCard
              address={address}
              balance={balance}
              balanceLoading={balanceLoading}
              network={network}
              onRefresh={refreshBalance}
            />

            {isConnected && (
              <div className="grid grid-cols-2 gap-3">
                <button
                  onClick={() => setActiveTab("ramp")}
                  className="flex flex-col items-center gap-2 p-4 rounded-2xl bg-violet-500/10 border border-violet-500/20 hover:bg-violet-500/20 transition-colors"
                >
                  <div className="w-9 h-9 rounded-xl bg-violet-500/20 flex items-center justify-center">
                    <svg className="w-5 h-5 text-violet-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
                    </svg>
                  </div>
                  <span className="text-sm font-semibold text-violet-300">Add Funds</span>
                  <span className="text-xs text-violet-400/60">EtherFuse Ramp</span>
                </button>

                <button
                  onClick={() => setActiveTab("yield")}
                  className="flex flex-col items-center gap-2 p-4 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 hover:bg-emerald-500/20 transition-colors"
                >
                  <div className="w-9 h-9 rounded-xl bg-emerald-500/20 flex items-center justify-center">
                    <svg className="w-5 h-5 text-emerald-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
                    </svg>
                  </div>
                  <span className="text-sm font-semibold text-emerald-300">Earn Yield</span>
                  <span className="text-xs text-emerald-400/60">DeFindex Vaults</span>
                </button>
              </div>
            )}

            {etherFuse.orders.length > 0 && (
              <div>
                <h3 className="text-sm font-semibold text-white mb-3">Recent Ramp Activity</h3>
                <div className="space-y-2">
                  {etherFuse.orders.slice(0, 3).map((order) => (
                    <div
                      key={order.orderId}
                      className="flex items-center justify-between p-3 rounded-xl bg-white/5 border border-white/5"
                    >
                      <div className="flex items-center gap-2">
                        <div className={`w-2 h-2 rounded-full ${
                          order.status === "completed" ? "bg-emerald-400" :
                          order.status === "failed" ? "bg-red-400" :
                          "bg-amber-400"
                        }`} />
                        <span className="text-sm text-gray-300 capitalize">{order.type}</span>
                      </div>
                      <span className="text-sm text-white font-medium">
                        {order.fromAmount?.toLocaleString()} {order.fromCurrency || "MXN"}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {!isConnected && !loading && (
              <div className="text-center py-8 text-gray-600 text-sm">
                <p>Connect your Freighter wallet to get started</p>
              </div>
            )}
          </div>
        )}

        {/* Ramp tab */}
        {activeTab === "ramp" && (
          <RampTab
            isConnected={isConnected}
            walletAddress={address}
            network={network}
            onSign={sign}
            customerId={etherFuse.customerId}
            assets={etherFuse.assets}
            assetsLoading={etherFuse.assetsLoading}
            quote={etherFuse.quote}
            quoteLoading={etherFuse.quoteLoading}
            quoteError={etherFuse.quoteError}
            orders={etherFuse.orders}
            activeOrder={etherFuse.activeOrder}
            orderError={etherFuse.orderError}
            onGenerateOnboardingUrl={etherFuse.generateOnboardingUrl}
            onGetQuote={etherFuse.getQuote}
            onCreateOrder={etherFuse.createOrder}
            onClearQuote={etherFuse.clearQuote}
            onClearActiveOrder={etherFuse.clearActiveOrder}
            onRefreshOrders={etherFuse.refreshOrders}
          />
        )}

        {/* Yield tab */}
        {activeTab === "yield" && (
          <YieldTab
            vaults={vaults}
            vaultsLoading={vaultsLoading}
            isConnected={isConnected}
            walletAddress={address}
            network={network}
            needsApiKey={needsApiKey}
            onSign={sign}
            onAddVault={addVault}
            onRefreshVault={refreshVault}
            onRefetchVaults={refetchVaults}
          />
        )}
      </main>
    </div>
  );
}
