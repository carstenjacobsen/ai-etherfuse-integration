"use client";

import { useState } from "react";
import type { VaultInfoResponse } from "@/lib/defindex";
import { toSmallestUnit, KNOWN_STELLAR_ASSETS } from "@/lib/constants";
import { getExplorerUrl } from "@/lib/stellar";
import { AddTrustlineButton } from "./AddTrustlineButton";

interface DepositModalProps {
  vault: VaultInfoResponse;
  vaultAddress: string;
  network: string;
  onSign: (xdr: string) => Promise<string | null>;
  onClose: () => void;
  onSuccess: () => void;
  callerAddress: string;
}

export function DepositModal({
  vault,
  vaultAddress,
  network,
  onSign,
  onClose,
  onSuccess,
  callerAddress,
}: DepositModalProps) {
  const [amounts, setAmounts] = useState<string[]>(vault.assets.map(() => ""));
  const [status, setStatus] = useState<"idle" | "building" | "signing" | "submitting" | "success" | "error">("idle");
  const [error, setError] = useState<string | null>(null);
  const [txHash, setTxHash] = useState<string | null>(null);

  const handleAmountChange = (idx: number, value: string) => {
    setAmounts((prev) => {
      const next = [...prev];
      next[idx] = value;
      return next;
    });
  };

  const handleDeposit = async () => {
    setError(null);
    setStatus("building");

    try {
      const parsedAmounts = amounts.map((a) => {
        const n = parseFloat(a);
        if (isNaN(n) || n <= 0) throw new Error("Please enter valid amounts for all assets");
        return toSmallestUnit(n);
      });

      const res = await fetch(`/api/vaults/${vaultAddress}/deposit`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ amounts: parsedAmounts, caller: callerAddress, network }),
      });

      const data = await res.json();
      if (!res.ok || !data.xdr) {
        throw new Error(data.error || "Failed to build deposit transaction");
      }

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
      if (!sendRes.ok || !sendData.success) {
        throw new Error(sendData.error || "Transaction failed");
      }

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
            <h2 className="text-lg font-bold text-white">Deposit to Vault</h2>
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
            <p className="text-white font-semibold mb-2">Deposit Successful!</p>
            <p className="text-gray-400 text-sm mb-4">Your assets are now earning yield</p>
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
            <button
              onClick={onClose}
              className="mt-4 w-full py-2.5 rounded-xl bg-white/10 hover:bg-white/20 text-white font-medium transition-colors"
            >
              Close
            </button>
          </div>
        ) : (
          <>
            <div className="space-y-4 mb-6">
              {vault.assets.map((asset, idx) => (
                <div key={asset.address}>
                  <label className="block text-sm text-gray-400 mb-1.5">
                    {asset.symbol || asset.name || `Asset ${idx + 1}`} Amount
                  </label>
                  <div className="relative">
                    <input
                      type="number"
                      min="0"
                      step="any"
                      value={amounts[idx]}
                      onChange={(e) => handleAmountChange(idx, e.target.value)}
                      placeholder="0.00"
                      disabled={isLoading}
                      className="w-full px-4 py-3 rounded-xl bg-white/5 border border-white/10 text-white placeholder-gray-600 focus:outline-none focus:border-emerald-500/50 transition-all disabled:opacity-50"
                    />
                    <span className="absolute right-4 top-1/2 -translate-y-1/2 text-sm text-gray-500 font-medium">
                      {asset.symbol}
                    </span>
                  </div>
                </div>
              ))}
            </div>

            <div className="mb-4 p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/20">
              <p className="text-xs text-emerald-400">
                You will receive dfTokens representing your share of the vault. Assets are automatically invested.
              </p>
            </div>

            {error && (() => {
              const isTrustline = error.toLowerCase().includes("trustline");
              const netKey = (network || "TESTNET").toUpperCase() === "PUBLIC" ? "MAINNET" : "TESTNET";
              const assets = KNOWN_STELLAR_ASSETS[netKey as keyof typeof KNOWN_STELLAR_ASSETS];
              return (
                <div className="mb-4 p-3 rounded-xl bg-red-500/10 border border-red-500/20 space-y-3">
                  <p className="text-sm text-red-400">{error}</p>
                  {isTrustline && (
                    <div className="space-y-2">
                      <p className="text-xs text-gray-400">Add the missing trustline to your account:</p>
                      <AddTrustlineButton
                        assetCode={assets.USDC.code}
                        assetIssuer={assets.USDC.issuer}
                        callerAddress={callerAddress}
                        network={network}
                        onSign={onSign}
                        onSuccess={() => setError(null)}
                      />
                    </div>
                  )}
                </div>
              );
            })()}

            <div className="space-y-2">
              {status !== "idle" && status !== "error" && (
                <div className="flex items-center gap-2 text-sm text-gray-400 mb-2">
                  <svg className="w-4 h-4 animate-spin text-emerald-400" viewBox="0 0 24 24" fill="none">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                  </svg>
                  {status === "building" && "Building transaction…"}
                  {status === "signing" && "Waiting for signature in Freighter…"}
                  {status === "submitting" && "Submitting to Stellar…"}
                </div>
              )}
              <button
                onClick={handleDeposit}
                disabled={isLoading || amounts.some((a) => !a || parseFloat(a) <= 0)}
                className="w-full py-3 rounded-xl bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 disabled:cursor-not-allowed text-white font-semibold transition-colors"
              >
                {isLoading ? "Processing…" : "Deposit & Earn"}
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
