"use client";

import type { VaultInfoResponse } from "@/lib/defindex";
import { formatAddress } from "@/lib/stellar";
import { fromSmallestUnit as fromSmallest } from "@/lib/constants";

interface VaultCardProps {
  address: string;
  info: VaultInfoResponse | null;
  apy: number | null;
  balance: { dfTokens: number; underlyingBalance: number[] } | null;
  loading: boolean;
  error: string | null;
  isConnected: boolean;
  onDeposit: () => void;
  onWithdraw: () => void;
  onRefresh: () => void;
}

export function VaultCard({
  address,
  info,
  apy,
  balance,
  loading,
  error,
  isConnected,
  onDeposit,
  onWithdraw,
  onRefresh,
}: VaultCardProps) {
  const hasPosition = balance && balance.dfTokens > 0;

  return (
    <div className="rounded-2xl bg-white/5 border border-white/10 p-5 hover:border-emerald-500/30 transition-colors">
      <div className="flex items-start justify-between mb-4">
        <div>
          {loading && !info ? (
            <div className="space-y-2">
              <div className="h-5 w-32 bg-white/10 rounded animate-pulse" />
              <div className="h-4 w-20 bg-white/10 rounded animate-pulse" />
            </div>
          ) : info ? (
            <>
              <h3 className="text-base font-bold text-white">{info.name}</h3>
              <span className="text-xs text-gray-500 font-mono">{info.symbol}</span>
            </>
          ) : (
            <>
              <h3 className="text-base font-bold text-white">Vault</h3>
              <span className="text-xs text-gray-500 font-mono">{formatAddress(address)}</span>
            </>
          )}
        </div>

        <div className="flex items-center gap-2">
          {apy !== null && (
            <div className="text-right">
              <p className="text-xs text-gray-500">APY</p>
              <p className="text-lg font-bold text-emerald-400">
                {(apy * 100).toFixed(2)}%
              </p>
            </div>
          )}
          <button
            onClick={onRefresh}
            disabled={loading}
            className="p-1.5 rounded-lg hover:bg-white/10 text-gray-500 hover:text-white transition-colors disabled:opacity-30"
            title="Refresh"
          >
            <svg
              className={`w-4 h-4 ${loading ? "animate-spin" : ""}`}
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth={2}
            >
              <path strokeLinecap="round" strokeLinejoin="round" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
            </svg>
          </button>
        </div>
      </div>

      {error && (() => {
        const lower = error.toLowerCase();
        const isAuth = lower.includes("forbidden") || lower.includes("unauthorized");
        return (
          <div className={`mb-3 p-2.5 rounded-xl ${isAuth ? "bg-amber-500/10 border border-amber-500/20" : "bg-red-500/10 border border-red-500/20"}`}>
            <p className={`text-xs ${isAuth ? "text-amber-400" : "text-red-400"}`}>
              {isAuth ? "API key required — check your DEFINDEX_API_KEY" : error}
            </p>
          </div>
        );
      })()}

      {info?.assets && (
        <div className="mb-4 space-y-2">
          {info.assets.map((asset) => (
            <div key={asset.address} className="flex items-center gap-2.5">
              <div className="w-7 h-7 rounded-full bg-gradient-to-br from-emerald-500 to-teal-600 flex items-center justify-center text-xs font-bold text-white flex-shrink-0">
                {(asset.symbol || asset.name || "?").slice(0, 2).toUpperCase()}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-white">
                  {asset.symbol || asset.name}
                </p>
                {asset.strategies.length > 0 && (
                  <p className="text-xs text-gray-600 truncate">
                    {asset.strategies.map((s) => s.name).join(" · ")}
                  </p>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {info?.feesBps && (
        <div className="mb-4 flex gap-3 text-xs text-gray-600">
          <span>Vault fee: {(info.feesBps.vaultFee / 100).toFixed(2)}%</span>
          <span>·</span>
          <span>Protocol fee: {(info.feesBps.defindexFee / 100).toFixed(2)}%</span>
        </div>
      )}

      {hasPosition && info && (
        <div className="mb-4 p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/20">
          <p className="text-xs text-emerald-400 font-semibold mb-2 uppercase tracking-wide">
            My Position
          </p>
          <div className="space-y-1">
            <div className="flex justify-between text-sm">
              <span className="text-gray-400">Shares (dfTokens)</span>
              <span className="text-white font-medium">
                {fromSmallest(balance!.dfTokens).toLocaleString(undefined, { maximumFractionDigits: 4 })}
              </span>
            </div>
            {info.assets.map((asset, idx) => (
              <div key={asset.address} className="flex justify-between text-sm">
                <span className="text-gray-400">{asset.symbol} value</span>
                <span className="text-gray-300">
                  ≈{" "}
                  {fromSmallest(balance!.underlyingBalance[idx] || 0).toLocaleString(undefined, {
                    maximumFractionDigits: 4,
                  })}{" "}
                  {asset.symbol}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      <p className="text-xs text-gray-700 font-mono mb-4 truncate" title={address}>
        {formatAddress(address)}
      </p>

      {isConnected && info && (
        <div className="flex gap-2">
          <button
            onClick={onDeposit}
            className="flex-1 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-sm font-semibold transition-colors"
          >
            Deposit
          </button>
          {hasPosition && (
            <button
              onClick={onWithdraw}
              className="flex-1 py-2.5 rounded-xl bg-white/10 hover:bg-white/20 text-white text-sm font-semibold transition-colors"
            >
              Withdraw
            </button>
          )}
        </div>
      )}

      {!isConnected && (
        <p className="text-xs text-gray-600 text-center">Connect wallet to deposit</p>
      )}
    </div>
  );
}
