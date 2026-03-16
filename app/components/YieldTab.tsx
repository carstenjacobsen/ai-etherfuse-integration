"use client";

import { useState } from "react";
import { VaultCard } from "./VaultCard";
import { DepositModal } from "./DepositModal";
import { WithdrawModal } from "./WithdrawModal";
import type { VaultData } from "@/hooks/useVaults";

interface YieldTabProps {
  vaults: VaultData[];
  vaultsLoading: boolean;
  isConnected: boolean;
  walletAddress: string | null;
  network: string | null;
  needsApiKey: boolean;
  onSign: (xdr: string) => Promise<string | null>;
  onAddVault: (address: string) => Promise<void>;
  onRefreshVault: (address: string) => void;
  onRefetchVaults: () => void;
}

export function YieldTab({
  vaults,
  vaultsLoading,
  isConnected,
  walletAddress,
  network,
  needsApiKey,
  onSign,
  onAddVault,
  onRefreshVault,
  onRefetchVaults,
}: YieldTabProps) {
  const [depositVault, setDepositVault] = useState<string | null>(null);
  const [withdrawVault, setWithdrawVault] = useState<string | null>(null);
  const [addVaultInput, setAddVaultInput] = useState("");
  const [addVaultLoading, setAddVaultLoading] = useState(false);

  const activeDepositVault = depositVault
    ? vaults.find((v) => v.address === depositVault)
    : null;
  const activeWithdrawVault = withdrawVault
    ? vaults.find((v) => v.address === withdrawVault)
    : null;

  const handleAddVault = async () => {
    if (!addVaultInput.trim()) return;
    setAddVaultLoading(true);
    try {
      await onAddVault(addVaultInput.trim());
      setAddVaultInput("");
    } finally {
      setAddVaultLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-3">
        <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-emerald-500 to-teal-600 flex items-center justify-center">
          <svg className="w-4 h-4 text-white" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
          </svg>
        </div>
        <div>
          <h2 className="text-base font-bold text-white">DeFindex Yield Vaults</h2>
          <p className="text-xs text-gray-500">Earn yield on USDC • Powered by DeFindex</p>
        </div>
      </div>

      {needsApiKey && (
        <div className="rounded-xl bg-amber-500/10 border border-amber-500/20 p-4">
          <p className="text-xs text-amber-400">
            DeFindex API key required. Add <code className="font-mono bg-amber-500/10 px-1 py-0.5 rounded">DEFINDEX_API_KEY</code> to your <code className="font-mono bg-amber-500/10 px-1 py-0.5 rounded">.env.local</code>.
          </p>
        </div>
      )}

      {/* Add vault form */}
      <div className="rounded-2xl bg-white/5 border border-white/10 p-5">
        <h3 className="text-sm font-semibold text-white mb-3">Add Vault by Address</h3>
        <div className="flex gap-2">
          <input
            type="text"
            value={addVaultInput}
            onChange={(e) => setAddVaultInput(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && handleAddVault()}
            placeholder="Enter vault contract address…"
            className="flex-1 px-4 py-2.5 rounded-xl bg-white/5 border border-white/10 text-white placeholder-gray-600 focus:outline-none focus:border-emerald-500/50 text-sm transition-all font-mono"
          />
          <button
            onClick={handleAddVault}
            disabled={addVaultLoading || !addVaultInput.trim()}
            className="px-4 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white text-sm font-semibold transition-colors"
          >
            {addVaultLoading ? "…" : "Add"}
          </button>
        </div>
        <p className="text-xs text-gray-600 mt-2">
          Find vault addresses at{" "}
          <a
            href="https://app.defindex.io"
            target="_blank"
            rel="noopener noreferrer"
            className="text-emerald-500 hover:text-emerald-400 underline"
          >
            app.defindex.io
          </a>
        </p>
      </div>

      {/* Vault list */}
      {vaultsLoading && vaults.length === 0 ? (
        <div className="grid gap-4 sm:grid-cols-2">
          {[1, 2].map((i) => (
            <div key={i} className="rounded-2xl bg-white/5 border border-white/10 p-5 animate-pulse">
              <div className="h-5 w-32 bg-white/10 rounded mb-3" />
              <div className="h-4 w-20 bg-white/10 rounded mb-4" />
              <div className="h-16 bg-white/5 rounded-xl mb-4" />
              <div className="h-10 bg-white/10 rounded-xl" />
            </div>
          ))}
        </div>
      ) : vaults.length === 0 ? (
        <div className="text-center py-12 rounded-2xl bg-white/3 border border-white/5">
          <div className="w-12 h-12 rounded-full bg-emerald-500/10 flex items-center justify-center mx-auto mb-4">
            <svg className="w-6 h-6 text-emerald-500/50" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
            </svg>
          </div>
          <p className="text-gray-500 text-sm mb-1">No vaults loaded</p>
          <p className="text-gray-600 text-xs">Add a vault address above to get started</p>
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2">
          {vaults.map((vault) => (
            <VaultCard
              key={vault.address}
              address={vault.address}
              info={vault.info}
              apy={vault.apy}
              balance={vault.balance}
              loading={vault.loading}
              error={vault.error}
              isConnected={isConnected}
              onDeposit={() => setDepositVault(vault.address)}
              onWithdraw={() => setWithdrawVault(vault.address)}
              onRefresh={() => onRefreshVault(vault.address)}
            />
          ))}
        </div>
      )}

      {/* Modals */}
      {depositVault && activeDepositVault?.info && walletAddress && network && (
        <DepositModal
          vault={activeDepositVault.info}
          vaultAddress={depositVault}
          network={network}
          onSign={onSign}
          onClose={() => setDepositVault(null)}
          onSuccess={() => {
            setDepositVault(null);
            onRefreshVault(depositVault);
          }}
          callerAddress={walletAddress}
        />
      )}

      {withdrawVault && activeWithdrawVault?.info && activeWithdrawVault.balance && walletAddress && network && (
        <WithdrawModal
          vault={activeWithdrawVault.info}
          vaultAddress={withdrawVault}
          network={network}
          onSign={onSign}
          onClose={() => setWithdrawVault(null)}
          onSuccess={() => {
            setWithdrawVault(null);
            onRefreshVault(withdrawVault);
          }}
          callerAddress={walletAddress}
          dfTokens={activeWithdrawVault.balance.dfTokens}
          underlyingBalance={activeWithdrawVault.balance.underlyingBalance}
        />
      )}
    </div>
  );
}
