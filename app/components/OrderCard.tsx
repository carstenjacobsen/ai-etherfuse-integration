"use client";

import type { EtherFuseOrder } from "@/lib/etherfuse";

interface OrderCardProps {
  order: EtherFuseOrder;
  onDismiss?: () => void;
}

const STATUS_STYLES: Record<string, string> = {
  created: "text-blue-400 bg-blue-400/10 border-blue-400/20",
  pending: "text-amber-400 bg-amber-400/10 border-amber-400/20",
  processing: "text-violet-400 bg-violet-400/10 border-violet-400/20",
  completed: "text-emerald-400 bg-emerald-400/10 border-emerald-400/20",
  failed: "text-red-400 bg-red-400/10 border-red-400/20",
  canceled: "text-gray-400 bg-gray-400/10 border-gray-400/20",
  cancelled: "text-gray-400 bg-gray-400/10 border-gray-400/20",
};

export function OrderCard({ order, onDismiss }: OrderCardProps) {
  const isOnramp = order.orderType === "onramp";
  const statusStyle = STATUS_STYLES[order.status] || STATUS_STYLES.pending;

  return (
    <div className="rounded-2xl bg-white/5 border border-white/10 p-5">
      <div className="flex items-start justify-between mb-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className={`text-xs font-semibold px-2 py-0.5 rounded-full border ${statusStyle}`}>
              {(order.status || "unknown").toUpperCase()}
            </span>
            <span className="text-xs text-gray-500">
              {isOnramp ? "On-Ramp" : "Off-Ramp"}
            </span>
          </div>
          <p className="text-xs text-gray-600 font-mono mt-1">
            #{order.orderId?.slice(0, 16) || "—"}
          </p>
        </div>
        {onDismiss && (
          <button
            onClick={onDismiss}
            className="p-1.5 rounded-lg hover:bg-white/10 text-gray-500 hover:text-white transition-colors"
          >
            <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        )}
      </div>

      {/* Amount info */}
      <div className="flex items-center gap-3 mb-4">
        <div className="flex-1 p-3 rounded-xl bg-white/5">
          <p className="text-xs text-gray-500 mb-0.5">{isOnramp ? "You Pay" : "You Send"}</p>
          <p className="text-base font-bold text-white">
            {order.amountInFiat} MXN
          </p>
        </div>
        <svg className="w-5 h-5 text-gray-600 flex-shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M17 8l4 4m0 0l-4 4m4-4H3" />
        </svg>
        <div className="flex-1 p-3 rounded-xl bg-white/5">
          <p className="text-xs text-gray-500 mb-0.5">You Receive</p>
          <p className="text-base font-bold text-emerald-400">
            {isOnramp ? "CETES" : `${order.amountInFiat} MXN`}
          </p>
        </div>
      </div>

      {/* Payment instructions for on-ramp */}
      {isOnramp && order.depositClabe && (
        <div className="rounded-xl bg-violet-500/10 border border-violet-500/20 p-4 space-y-2">
          <p className="text-xs text-violet-400 font-semibold uppercase tracking-wide flex items-center gap-1.5">
            <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z" />
            </svg>
            Bank Transfer Instructions
          </p>

          <div className="flex justify-between text-sm">
            <span className="text-gray-400">CLABE</span>
            <span className="text-white font-mono font-medium tracking-wide">
              {order.depositClabe}
            </span>
          </div>

          {order.memo && (
            <div className="flex justify-between text-sm">
              <span className="text-gray-400">Reference</span>
              <span className="text-white font-mono font-medium">{order.memo}</span>
            </div>
          )}

          <p className="text-xs text-violet-300/70 pt-1">
            Transfer exactly {order.amountInFiat} MXN to this CLABE.
            Tokens will be sent to your wallet automatically.
          </p>
        </div>
      )}

      {/* Status page link */}
      {order.statusPage && (
        <div className="mt-3">
          <a
            href={order.statusPage as string}
            target="_blank"
            rel="noopener noreferrer"
            className="text-xs text-violet-400 hover:text-violet-300 underline"
          >
            View order status →
          </a>
        </div>
      )}

      {order.createdAt && (
        <p className="text-xs text-gray-700 mt-2">
          Created: {new Date(order.createdAt).toLocaleString()}
        </p>
      )}
    </div>
  );
}
