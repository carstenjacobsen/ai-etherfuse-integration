"use client";

import { useState, useEffect } from "react";

interface OnboardingCardProps {
  isConnected: boolean;
  customerId: string | null;
  onGenerateUrl: () => Promise<string | null>;
}

function verifiedKey(customerId: string) {
  return `etherfuse_verified_${customerId}`;
}

export function OnboardingCard({ isConnected, customerId, onGenerateUrl }: OnboardingCardProps) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [url, setUrl] = useState<string | null>(null);
  const [verified, setVerified] = useState(false);

  // Read persisted verification status from localStorage
  useEffect(() => {
    if (customerId) {
      setVerified(localStorage.getItem(verifiedKey(customerId)) === "true");
    }
  }, [customerId]);

  const markVerified = () => {
    if (customerId) {
      localStorage.setItem(verifiedKey(customerId), "true");
      setVerified(true);
    }
  };

  const handleGetVerified = async () => {
    setLoading(true);
    setError(null);
    setUrl(null);
    try {
      const presignedUrl = await onGenerateUrl();
      if (presignedUrl) {
        setUrl(presignedUrl);
        window.open(presignedUrl, "_blank", "noopener,noreferrer");
      } else {
        setError("Could not generate onboarding URL. Check your EtherFuse API key.");
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to generate onboarding URL");
    } finally {
      setLoading(false);
    }
  };

  if (!isConnected) {
    return (
      <div className="rounded-2xl bg-amber-500/10 border border-amber-500/20 p-5">
        <div className="flex gap-3 items-start">
          <div className="w-8 h-8 rounded-full bg-amber-500/20 flex items-center justify-center flex-shrink-0 mt-0.5">
            <svg className="w-4 h-4 text-amber-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
            </svg>
          </div>
          <div>
            <p className="text-sm font-semibold text-amber-300">Connect wallet first</p>
            <p className="text-xs text-amber-400/70 mt-1">
              Connect your Freighter wallet to access EtherFuse on/off-ramp services.
            </p>
          </div>
        </div>
      </div>
    );
  }

  // Verified state — compact badge
  if (verified) {
    return (
      <div className="rounded-2xl bg-emerald-500/10 border border-emerald-500/20 p-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-full bg-emerald-500/20 flex items-center justify-center flex-shrink-0">
              <svg className="w-4 h-4 text-emerald-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
              </svg>
            </div>
            <div>
              <p className="text-sm font-semibold text-emerald-300">Identity Verified</p>
              <p className="text-xs text-emerald-400/70 mt-0.5">EtherFuse KYC complete — ready to ramp</p>
            </div>
          </div>
          <button
            onClick={() => {
              if (customerId) localStorage.removeItem(verifiedKey(customerId));
              setVerified(false);
            }}
            className="text-xs text-emerald-500/60 hover:text-emerald-400 transition-colors"
            title="Reset verification status"
          >
            Reset
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="rounded-2xl bg-white/5 border border-white/10 p-5">
      <div className="flex items-start gap-4">
        <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-violet-500 to-purple-600 flex items-center justify-center flex-shrink-0">
          <svg className="w-5 h-5 text-white" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M17 9V7a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2m2 4h10a2 2 0 002-2v-6a2 2 0 00-2-2H9a2 2 0 00-2 2v6a2 2 0 002 2zm7-5a2 2 0 11-4 0 2 2 0 014 0z" />
          </svg>
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-semibold text-white">EtherFuse Identity Verification</p>
          <p className="text-xs text-gray-400 mt-1">
            Complete KYC once to unlock MXN on/off-ramp. You&apos;ll be redirected to EtherFuse&apos;s
            secure verification page (valid for 15 minutes).
          </p>

          {error && (
            <div className="mt-3 p-2.5 rounded-xl bg-red-500/10 border border-red-500/20">
              <p className="text-xs text-red-400">{error}</p>
            </div>
          )}

          {url && (
            <div className="mt-3 p-2.5 rounded-xl bg-emerald-500/10 border border-emerald-500/20">
              <p className="text-xs text-emerald-400 mb-1">Verification page opened in new tab.</p>
              <a
                href={url}
                target="_blank"
                rel="noopener noreferrer"
                className="text-xs text-emerald-300 hover:text-emerald-200 underline break-all"
              >
                Click here if it didn&apos;t open
              </a>
            </div>
          )}

          <div className="mt-3 flex items-center gap-3 flex-wrap">
            <button
              onClick={handleGetVerified}
              disabled={loading}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-violet-600 hover:bg-violet-700 disabled:opacity-50 text-white text-sm font-medium transition-colors"
            >
              {loading ? (
                <>
                  <svg className="w-4 h-4 animate-spin" viewBox="0 0 24 24" fill="none">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                  </svg>
                  Generating…
                </>
              ) : url ? (
                "Reopen Verification"
              ) : (
                "Get Verified"
              )}
            </button>
            <button
              onClick={markVerified}
              className="text-xs text-gray-500 hover:text-gray-300 transition-colors"
            >
              Already verified
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
