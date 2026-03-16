"use client";

import type { AccountBalance } from "@/lib/stellar";

interface BalanceCardProps {
  address: string | null;
  balance: AccountBalance | null;
  balanceLoading: boolean;
  network: string | null;
  onRefresh: () => void;
}

// Well-known token display names
const TOKEN_LABELS: Record<string, string> = {
  USDC: "USD Coin",
  MXNe: "Mexican Peso",
  XLM: "Stellar Lumens",
};

export function BalanceCard({ address, balance, balanceLoading, network, onRefresh }: BalanceCardProps) {
  if (!address) {
    return (
      <div className="rounded-2xl bg-white/5 border border-white/10 p-6 text-center">
        <div className="w-12 h-12 rounded-full bg-white/10 flex items-center justify-center mx-auto mb-3">
          <svg className="w-6 h-6 text-gray-500" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z" />
          </svg>
        </div>
        <p className="text-gray-400 text-sm">Connect your Freighter wallet to see your balances</p>
      </div>
    );
  }

  return (
    <div className="rounded-2xl bg-white/5 border border-white/10 p-6">
      <div className="flex items-center justify-between mb-5">
        <div>
          <p className="text-xs text-gray-500 uppercase tracking-wide mb-1">Portfolio</p>
          <p className="text-xs font-mono text-gray-600 truncate max-w-[200px]">
            {address.slice(0, 8)}…{address.slice(-8)}
          </p>
        </div>
        <button
          onClick={onRefresh}
          disabled={balanceLoading}
          className="p-2 rounded-lg hover:bg-white/10 text-gray-500 hover:text-white transition-colors disabled:opacity-30"
          title="Refresh balances"
        >
          <svg
            className={`w-4 h-4 ${balanceLoading ? "animate-spin" : ""}`}
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth={2}
          >
            <path strokeLinecap="round" strokeLinejoin="round" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
          </svg>
        </button>
      </div>

      {balanceLoading && !balance ? (
        <div className="space-y-3">
          {[1, 2, 3].map((i) => (
            <div key={i} className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-full bg-white/10 animate-pulse" />
              <div className="flex-1 space-y-1">
                <div className="h-4 w-24 bg-white/10 rounded animate-pulse" />
                <div className="h-3 w-16 bg-white/10 rounded animate-pulse" />
              </div>
              <div className="h-5 w-20 bg-white/10 rounded animate-pulse" />
            </div>
          ))}
        </div>
      ) : (
        <div className="space-y-3">
          {/* XLM */}
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-full bg-gradient-to-br from-sky-500 to-blue-600 flex items-center justify-center text-xs font-bold text-white flex-shrink-0">
              XLM
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-semibold text-white">Stellar Lumens</p>
              <p className="text-xs text-gray-600">Native</p>
            </div>
            <p className="text-sm font-bold text-white tabular-nums">
              {balance ? parseFloat(balance.xlm).toLocaleString(undefined, { maximumFractionDigits: 4 }) : "—"} XLM
            </p>
          </div>

          {/* Other assets */}
          {balance?.assets.map((asset) => (
            <div key={`${asset.code}-${asset.issuer}`} className="flex items-center gap-3">
              <div className={`w-9 h-9 rounded-full flex items-center justify-center text-xs font-bold text-white flex-shrink-0 ${
                asset.code === "USDC"
                  ? "bg-gradient-to-br from-blue-500 to-indigo-600"
                  : asset.code === "MXNe"
                  ? "bg-gradient-to-br from-green-500 to-emerald-600"
                  : "bg-gradient-to-br from-violet-500 to-purple-600"
              }`}>
                {asset.code.slice(0, 3)}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold text-white">{TOKEN_LABELS[asset.code] || asset.code}</p>
                <p className="text-xs text-gray-600 truncate">{asset.issuer.slice(0, 8)}…</p>
              </div>
              <p className="text-sm font-bold text-white tabular-nums">
                {parseFloat(asset.balance).toLocaleString(undefined, { maximumFractionDigits: 4 })} {asset.code}
              </p>
            </div>
          ))}

          {balance?.assets.length === 0 && (
            <p className="text-xs text-gray-600 text-center py-2">
              No tokens yet — use the Ramp tab to add funds
            </p>
          )}
        </div>
      )}
    </div>
  );
}
