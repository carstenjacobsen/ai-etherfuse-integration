"use client";

import { useState } from "react";

interface AddTrustlineButtonProps {
  assetCode: string;
  assetIssuer: string;
  callerAddress: string;
  network: string;
  onSign: (xdr: string) => Promise<string | null>;
  /** Optional callback invoked after the trustline is successfully added */
  onSuccess?: () => void;
}

type Status = "idle" | "building" | "signing" | "submitting" | "success" | "error";

export function AddTrustlineButton({
  assetCode,
  assetIssuer,
  callerAddress,
  network,
  onSign,
  onSuccess,
}: AddTrustlineButtonProps) {
  const [status, setStatus] = useState<Status>("idle");
  const [error, setError] = useState<string | null>(null);

  const handleAdd = async () => {
    setError(null);
    setStatus("building");

    try {
      // 1. Build ChangeTrust XDR
      const res = await fetch("/api/trustline", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ assetCode, assetIssuer, caller: callerAddress, network }),
      });
      const data = await res.json();
      if (!res.ok || !data.xdr) throw new Error(data.error || "Failed to build trustline transaction");

      // 2. Sign with Freighter
      setStatus("signing");
      const signedXdr = await onSign(data.xdr);
      if (!signedXdr) throw new Error("Signing was cancelled");

      // 3. Submit via Horizon (classic transaction)
      setStatus("submitting");
      const sendRes = await fetch("/api/classic-send", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ xdr: signedXdr, network }),
      });
      const sendData = await sendRes.json();
      if (!sendRes.ok || !sendData.success) throw new Error(sendData.error || "Transaction failed");

      setStatus("success");
      onSuccess?.();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unknown error");
      setStatus("error");
    }
  };

  const isLoading = status === "building" || status === "signing" || status === "submitting";

  if (status === "success") {
    return (
      <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-sm">
        <svg className="w-3.5 h-3.5 flex-shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
        </svg>
        <span>{assetCode} trustline added</span>
      </div>
    );
  }

  return (
    <div className="space-y-1">
      <button
        onClick={handleAdd}
        disabled={isLoading}
        className="flex items-center gap-2 px-3 py-2 rounded-lg bg-violet-600/20 hover:bg-violet-600/30 border border-violet-500/30 text-violet-300 hover:text-violet-200 text-sm font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed w-full justify-center"
      >
        {isLoading ? (
          <>
            <svg className="w-3.5 h-3.5 animate-spin flex-shrink-0" viewBox="0 0 24 24" fill="none">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
            </svg>
            {status === "building" && "Building…"}
            {status === "signing" && "Sign in Freighter…"}
            {status === "submitting" && "Submitting…"}
          </>
        ) : (
          <>
            <svg className="w-3.5 h-3.5 flex-shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
            </svg>
            Add {assetCode} trustline
          </>
        )}
      </button>
      {status === "error" && error && (
        <p className="text-xs text-red-400 px-1">{error}</p>
      )}
    </div>
  );
}
