"use client";

interface ConnectButtonProps {
  isInstalled: boolean;
  isConnected: boolean;
  loading: boolean;
  address: string | null;
  network: string | null;
  onConnect: () => void;
  onDisconnect: () => void;
}

export function ConnectButton({
  isInstalled,
  isConnected,
  loading,
  address,
  network,
  onConnect,
  onDisconnect,
}: ConnectButtonProps) {
  if (!isInstalled) {
    return (
      <a
        href="https://freighter.app"
        target="_blank"
        rel="noopener noreferrer"
        className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-medium transition-colors text-sm"
      >
        Install Freighter
      </a>
    );
  }

  if (isConnected && address) {
    return (
      <div className="flex items-center gap-3">
        {network && (
          <span
            className={`text-xs font-semibold px-2.5 py-1 rounded-full ${
              network === "TESTNET"
                ? "text-amber-400 bg-amber-400/10 border border-amber-400/20"
                : "text-emerald-400 bg-emerald-400/10 border border-emerald-400/20"
            }`}
          >
            {network === "PUBLIC" ? "MAINNET" : network}
          </span>
        )}
        <button
          onClick={onDisconnect}
          className="inline-flex items-center gap-2 px-4 py-2 rounded-xl border border-red-500/30 hover:bg-red-500/10 text-red-400 font-medium transition-colors text-sm"
        >
          <span className="font-mono text-xs text-gray-400">
            {address.slice(0, 4)}…{address.slice(-4)}
          </span>
          Disconnect
        </button>
      </div>
    );
  }

  return (
    <button
      onClick={onConnect}
      disabled={loading}
      className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white font-medium transition-colors text-sm"
    >
      {loading ? (
        <>
          <svg className="w-4 h-4 animate-spin" viewBox="0 0 24 24" fill="none">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
          </svg>
          Connecting…
        </>
      ) : (
        "Connect Freighter"
      )}
    </button>
  );
}
