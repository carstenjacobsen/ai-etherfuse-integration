"use client";

import { useState } from "react";
import type { VaultInfoResponse } from "@/lib/defindex";
import { toSmallestUnit, fromSmallestUnit } from "@/lib/constants";
import { getExplorerUrl } from "@/lib/stellar";

interface WithdrawModalProps {
  vault: VaultInfoResponse;
  vaultAddress: string;
  network: string;
  onSign: (xdr: string) => Promise<string | null>;
  onClose: () => void;
  onSuccess: () => void;
  callerAddress: string;
  dfTokens: number;
  underlyingBalance: number[];
}

export function WithdrawModal({
  vault,
  vaultAddress,
  network,
  onSign,
  onClose,
  onSuccess,
  callerAddress,
  dfTokens,
  underlyingBalance,
}: WithdrawModalProps) {
  const [sharePercent, setSharePercent] = useState<string>("100");
  const [status, setStatus] = useState<"idle" | "building" | "signing" | "submitting" | "success" | "error">("idle");
  const [error, setError] = useState<string | null>(null);
  const [txHash, setTxHash] = useState<string | null>(null);

  const percentValue = Math.min(100, Math.max(0, parseFloat(sharePercent) || 0));
  const sharesToRedeem = Math.floor((dfTokens * percentValue) / 100);

  const handleWithdraw = async () => {
    setError(null);
    if (sharesToRedeem <= 0) {
      setError("No shares to redeem");
      return;
    }
    setStatus("building");

    try {
      const res = await fetch(`/api/vaults/${vaultAddress}/withdraw`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ shares: sharesToRedeem, caller: callerAddress, network }),
      });

      const data = await res.json();
      if (!res.ok || !data.xdr) throw new Error(data.error || "Failed to build withdraw transaction");

      setStatus("signing");
      const signedXdr = await onSign(data.xdr);
      if (!signedXdr) throw new Error("Transaction signing was cancelled or failed");

      setStatus("submitting");
      const sendRes = await fetch("/api/send", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ xdr: signedXdr, network }),
      });

      const sendData = await sendRes.json();
      if (!sendRes.ok || !sendData.success) throw new Error(sendData.error || "Transaction failed");

      setTxHash(sendData.hash);
      setStatus("success");
      onSuccess();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unknown error");
      setStatus("error");
    }
  };

  const isLoading = ["building", "signing", "submitting"].includes(status);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm">
      <div className="w-full max-w-md rounded-2xl bg-gray-900 border border-white/10 p-6 shadow-2xl">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h2 className="text-lg font-bold text-white">Withdraw from Vault</h2>
            <p className="text-sm text-gray-400 mt-0.5">
              {vault.name} ({vault.symbol})
            </p>
          </div>
          <button
            onClick={onClose}
            disabled={isLoading}
            className="p-2 rounded-lg hover:bg-white/10 text-gray-400 hover:text-white transition-colors disabled:opacity-50"
          >
            <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {status === "success" ? (
          <div className="text-center py-6">
            <div className="w-14 h-14 rounded-full bg-emerald-500/20 flex items-center justify-center mx-auto mb-4">
              <svg className="w-7 h-7 text-emerald-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
              </svg>
            </div>
            <p className="text-white font-semibold mb-2">Withdrawal Successful!</p>
            {txHash && (
              <a
                href={getExplorerUrl(txHash, network)}
                target="_blank"
                rel="noopener noreferrer"
                className="text-sm text-emerald-400 hover:text-emerald-300 underline"
              >
                View on Explorer
              </a>
            )}
            <button onClick={onClose} className="mt-4 w-full py-2.5 rounded-xl bg-white/10 hover:bg-white/20 text-white font-medium transition-colors">
              Close
            </button>
          </div>
        ) : (
          <>
            <div className="mb-5 p-4 rounded-xl bg-white/5 border border-white/10 space-y-2">
              <p className="text-xs text-gray-500 uppercase tracking-wide">Your Position</p>
              <div className="flex justify-between items-center">
                <span className="text-sm text-gray-400">dfTokens</span>
                <span className="text-sm font-semibold text-white">
                  {fromSmallestUnit(dfTokens).toLocaleString(undefined, { maximumFractionDigits: 4 })}
                </span>
              </div>
              {vault.assets.map((asset, idx) => (
                <div key={asset.address} className="flex justify-between items-center">
                  <span className="text-sm text-gray-400">{asset.symbol || asset.name}</span>
                  <span className="text-sm text-gray-300">
                    ≈{" "}
                    {fromSmallestUnit(underlyingBalance[idx] || 0).toLocaleString(undefined, {
                      maximumFractionDigits: 4,
                    })}{" "}
                    {asset.symbol}
                  </span>
                </div>
              ))}
            </div>

            <div className="mb-5">
              <label className="block text-sm text-gray-400 mb-2">
                Amount to Withdraw: <span className="text-white font-semibold">{percentValue}%</span>
              </label>
              <input
                type="range"
                min="1"
                max="100"
                step="1"
                value={percentValue}
                onChange={(e) => setSharePercent(e.target.value)}
                disabled={isLoading}
                className="w-full accent-emerald-500 disabled:opacity-50"
              />
              <div className="flex justify-between text-xs text-gray-600 mt-1">
                <span>1%</span><span>25%</span><span>50%</span><span>75%</span><span>100%</span>
              </div>
            </div>

            <div className="flex gap-2 mb-5">
              {[25, 50, 75, 100].map((pct) => (
                <button
                  key={pct}
                  onClick={() => setSharePercent(String(pct))}
                  disabled={isLoading}
                  className={`flex-1 py-1.5 rounded-lg text-xs font-medium transition-colors disabled:opacity-50 ${
                    percentValue === pct
                      ? "bg-emerald-600 text-white"
                      : "bg-white/5 hover:bg-white/10 text-gray-400"
                  }`}
                >
                  {pct}%
                </button>
              ))}
            </div>

            {sharesToRedeem > 0 && (
              <div className="mb-4 p-3 rounded-xl bg-white/5 border border-white/10 text-sm">
                <span className="text-gray-400">Redeeming: </span>
                <span className="text-white font-medium">
                  {fromSmallestUnit(sharesToRedeem).toLocaleString(undefined, { maximumFractionDigits: 4 })} dfTokens
                </span>
              </div>
            )}

            {error && (
              <div className="mb-4 p-3 rounded-xl bg-red-500/10 border border-red-500/20">
                <p className="text-sm text-red-400">{error}</p>
              </div>
            )}

            {status !== "idle" && status !== "error" && (
              <div className="flex items-center gap-2 text-sm text-gray-400 mb-3">
                <svg className="w-4 h-4 animate-spin text-emerald-400" viewBox="0 0 24 24" fill="none">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                </svg>
                {status === "building" && "Building transaction…"}
                {status === "signing" && "Waiting for signature in Freighter…"}
                {status === "submitting" && "Submitting to Stellar…"}
              </div>
            )}

            <div className="space-y-2">
              <button
                onClick={handleWithdraw}
                disabled={isLoading || sharesToRedeem <= 0}
                className="w-full py-3 rounded-xl bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 disabled:cursor-not-allowed text-white font-semibold transition-colors"
              >
                {isLoading ? "Processing…" : "Withdraw"}
              </button>
              <button
                onClick={onClose}
                disabled={isLoading}
                className="w-full py-2.5 rounded-xl bg-white/5 hover:bg-white/10 text-gray-400 hover:text-white font-medium transition-colors disabled:opacity-50"
              >
                Cancel
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
