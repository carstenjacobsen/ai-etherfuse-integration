"use client";

import { useState, useEffect, useCallback } from "react";
import type { VaultInfoResponse } from "@/lib/defindex";

export interface VaultData {
  address: string;
  info: VaultInfoResponse | null;
  apy: number | null;
  balance: { dfTokens: number; underlyingBalance: number[] } | null;
  loading: boolean;
  error: string | null;
}

function isAuthError(msg: string | null): boolean {
  if (!msg) return false;
  const lower = msg.toLowerCase();
  return lower.includes("forbidden") || lower.includes("unauthorized") || lower.includes("401") || lower.includes("403");
}

function humanizeVaultError(msg: string | null | undefined): string | null {
  if (!msg) return null;
  if (msg.toLowerCase().includes("trying to call a missing value")) {
    return "Not a valid DeFindex vault — check the contract address";
  }
  return msg;
}

export function useVaults(network: string | null, userAddress: string | null) {
  const [vaults, setVaults] = useState<VaultData[]>([]);
  const [loading, setLoading] = useState(false);
  const [customAddresses, setCustomAddresses] = useState<string[]>([]);

  const fetchVaults = useCallback(async () => {
    if (!network) return;
    setLoading(true);

    try {
      const res = await fetch(`/api/vaults?network=${network}`);
      const data = await res.json();

      const vaultList: VaultData[] = (data.vaults || []).map(
        (v: { address: string; info: VaultInfoResponse | null; apy: number | null; error?: string }) => ({
          address: v.address,
          info: v.info,
          apy: v.apy,
          balance: null,
          loading: false,
          error: humanizeVaultError(v.error),
        })
      );

      setVaults(vaultList);
    } catch (err) {
      console.error("Failed to fetch vaults:", err);
    } finally {
      setLoading(false);
    }
  }, [network]);

  const fetchVaultWithUser = useCallback(
    async (address: string) => {
      if (!network) return;

      setVaults((prev) =>
        prev.map((v) => (v.address === address ? { ...v, loading: true } : v))
      );

      try {
        const userParam = userAddress ? `&user=${userAddress}` : "";
        const res = await fetch(`/api/vaults/${address}?network=${network}${userParam}`);
        const data = await res.json();

        setVaults((prev) =>
          prev.map((v) =>
            v.address === address
              ? {
                  ...v,
                  info: data.info,
                  apy: data.apy,
                  balance: data.balance,
                  loading: false,
                  error: humanizeVaultError(data.error),
                }
              : v
          )
        );
      } catch (err) {
        const msg = err instanceof Error ? err.message : "Failed to load vault";
        setVaults((prev) =>
          prev.map((v) =>
            v.address === address ? { ...v, loading: false, error: msg } : v
          )
        );
      }
    },
    [network, userAddress]
  );

  const addVault = useCallback(
    async (address: string) => {
      const trimmed = address.trim().toUpperCase();
      if (!trimmed || vaults.some((v) => v.address === trimmed)) return;

      const newVault: VaultData = {
        address: trimmed,
        info: null,
        apy: null,
        balance: null,
        loading: true,
        error: null,
      };
      setVaults((prev) => [...prev, newVault]);
      setCustomAddresses((prev) => [...prev, trimmed]);
      await fetchVaultWithUser(trimmed);
    },
    [vaults, fetchVaultWithUser]
  );

  const refreshVault = useCallback(
    (address: string) => fetchVaultWithUser(address),
    [fetchVaultWithUser]
  );

  useEffect(() => {
    fetchVaults();
  }, [fetchVaults]);

  // Load user balances when address becomes available
  useEffect(() => {
    if (userAddress && vaults.length > 0 && network) {
      vaults.forEach((v) => {
        if (!v.loading) fetchVaultWithUser(v.address);
      });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [userAddress]);

  const needsApiKey = vaults.some((v) => isAuthError(v.error));

  return { vaults, loading, addVault, refreshVault, refetch: fetchVaults, customAddresses, needsApiKey };
}
