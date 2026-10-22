import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  ShieldCheck, CheckCircle2, Copy, Check, Plane, Truck, ExternalLink,
  Lock, ArrowRight, MessageSquare, Clock, Sparkles, Box, CheckCircle
} from 'lucide-react';
import toast from 'react-hot-toast';

/**
 * Robust Receipt Parser: Extracts verified receipt metadata from
 * toolResults or regex match on markdown content.
 */
export function parseReceiptData(msg) {
  if (!msg) return null;

  // 1. Check toolResults first
  let tr = msg.toolResults;
  if (typeof tr === 'string') {
    try {
      tr = JSON.parse(tr);
    } catch (e) {
      tr = null;
    }
  }

  const isReceiptTool = tr && (tr.isReceipt || tr.status === 'VERIFIED' || tr.receiptMessage);
  const content = msg.content || '';
  const isReceiptText =
    /Official\s+Purchase\s+Receipt|Official\s+Receipt|Escrow\s+Guarantee|Order\s+Summary:/i.test(content) &&
    (/Order\s+Number:/i.test(content) || /Amount\s+Paid:/i.test(content) || /PAID_IN_ESCROW/i.test(content));

  if (!isReceiptTool && !isReceiptText) {
    return null;
  }

  // Order Number
  const orderNumber =
    tr?.orderNumber ||
    tr?.orderId ||
    content.match(/Order\s+Number:\*?\*?\s*[`*]*([A-Za-z0-9-]+)[`*]*/i)?.[1] ||
    content.match(/\b(W-[A-Z0-9]+-[A-Za-z0-9-]+)\b/)?.[1] ||
    'W-INT-CONFIRMED';

  // Tracking Number
  const trackingNumber =
    tr?.trackingNumber ||
    content.match(/Tracking\s+Number:\*?\*?\s*[`*]*([A-Za-z0-9-]+)[`*]*/i)?.[1] ||
    content.match(/\b(DHL-EXP-[A-Za-z0-9]+|GIGL-DOM-[A-Za-z0-9]+|WCOM-EXP-[A-Za-z0-9]+)\b/)?.[1] ||
    'DHL-EXP-PENDING';

  // Carrier
  const carrier =
    tr?.carrier ||
    content.match(/Carrier:\*?\*?\s*[*`]*([^*\n`]+)[*`]*/i)?.[1]?.trim() ||
    'DHL Express International';

  // Payment Method
  const paymentMethod =
    tr?.paymentMethod ||
    content.match(/Payment\s+Method:\*?\*?\s*[*`]*([^*\n`]+)[*`]*/i)?.[1]?.trim() ||
    (content.toLowerCase().includes('paypal') ? 'PayPal (USD)' : 'W-Commerce Wallet');

  // Amount in USD
  const parsedAmtUSD = tr?.amountUSD ?? tr?.grandTotal ?? tr?.amount;
  let amountUSD = parsedAmtUSD !== undefined ? Number(parsedAmtUSD) : null;
  if (amountUSD === null || isNaN(amountUSD)) {
    const matchUSD = content.match(/Amount\s+Paid:\*?\*?\s*[*`]*\$?([0-9.,]+)\s*(?:USD)?/i);
    if (matchUSD) {
      amountUSD = parseFloat(matchUSD[1].replace(/,/g, ''));
    }
  }

  // Seller Payout in NGN
  const parsedPayoutNGN = tr?.sellerPayoutNGN ?? tr?.sellerPayoutNgn;
  let sellerPayoutNGN = parsedPayoutNGN !== undefined ? Number(parsedPayoutNGN) : null;
  if (sellerPayoutNGN === null || isNaN(sellerPayoutNGN)) {
    const matchNGN = content.match(/Seller\s+Payout:\*?\*?\s*[*`]*₦?([0-9.,]+)\s*(?:NGN)?/i);
    if (matchNGN) {
      sellerPayoutNGN = parseFloat(matchNGN[1].replace(/,/g, ''));
    }
  }

  // Exchange rate
  const exchangeRate =
    tr?.exchangeRate ||
    Number(content.match(/Exchange\s+rate:\s*([0-9.,]+)/i)?.[1]?.replace(/,/g, '') || 1480);

  // Cross-compute amounts if one is missing
  if (amountUSD && !sellerPayoutNGN) {
    sellerPayoutNGN = Math.round(amountUSD * exchangeRate);
  } else if (!amountUSD && sellerPayoutNGN) {
    amountUSD = Number((sellerPayoutNGN / exchangeRate).toFixed(2));
  }

  // Escrow Status & Fulfillment Status
  const escrowStatus =
    tr?.escrowStatus ||
    content.match(/Escrow\s+Status:\*?\*?\s*[*`]*([A-Za-z0-9_]+)/i)?.[1] ||
    'PAID_IN_ESCROW';

  const fulfillmentStatus =
    tr?.fulfillmentStatus ||
    content.match(/Fulfillment\s+Status:\*?\*?\s*[*`]*([^*\n`]+)/i)?.[1]?.trim() ||
    'CONFIRMED & QUEUED FOR DISPATCH';

  const itemTitle =
    tr?.itemTitle ||
    tr?.productTitle ||
    content.match(/Product:\*?\*?\s*[*`]*([^*\n`]+)/i)?.[1]?.trim() ||
    null;

  return {
    orderNumber,
    trackingNumber,
    carrier,
    paymentMethod,
    amountUSD: amountUSD || 0,
    sellerPayoutNGN: sellerPayoutNGN || 0,
    exchangeRate,
    escrowStatus,
    fulfillmentStatus,
    itemTitle,
    rawContent: content
  };
}

export default function OfficialReceiptCard({
  message,
  onTrackOrder,
  onAskAI
}) {
  const [copiedField, setCopiedField] = useState(null);
  const data = parseReceiptData(message);

  if (!data) return null;

  const handleCopy = (text, fieldName) => {
    navigator.clipboard.writeText(text);
    setCopiedField(fieldName);
    toast.success(`Copied ${fieldName}!`, { id: `copy-${fieldName}`, duration: 2000 });
    setTimeout(() => {
      setCopiedField(null);
    }, 2000);
  };

  const isPayPal = /paypal/i.test(data.paymentMethod);
  const formattedUSD = Number(data.amountUSD).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  const formattedNGN = Number(data.sellerPayoutNGN).toLocaleString();

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.96, y: 12 }}
      animate={{ opacity: 1, scale: 1, y: 0 }}
      transition={{ duration: 0.45, ease: [0.16, 1, 0.3, 1] }}
      className="w-full my-3 relative select-text"
    >
      {/* Outer Soft Graphics Voucher Frame */}
      <div className="relative overflow-hidden rounded-[2rem] neu-card border border-emerald-500/30 dark:border-emerald-500/20 bg-gradient-to-b from-emerald-500/[0.05] via-[var(--bg-primary)]/80 to-[var(--bg-primary)] shadow-2xl backdrop-blur-xl">
        
        {/* Ambient Top Glow Orbs */}
        <div className="absolute -top-24 left-1/2 -translate-x-1/2 w-80 h-32 bg-emerald-500/15 dark:bg-emerald-400/10 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute top-10 right-4 w-40 h-40 bg-blue-500/10 rounded-full blur-2xl pointer-events-none" />

        {/* Subtle Watermark Shield Background Icon */}
        <div className="absolute right-3 top-6 text-emerald-500/[0.035] dark:text-emerald-400/[0.04] pointer-events-none select-none">
          <ShieldCheck size={230} strokeWidth={1} />
        </div>

        {/* CARD CONTENT */}
        <div className="relative z-10 p-5 sm:p-7 space-y-6">

          {/* 1. Header Bar: Status Badge + Order Number */}
          <div className="flex items-center justify-between gap-3 flex-wrap border-b border-[var(--border-subtle)]/60 pb-4">
            <div className="flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse shadow-[0_0_10px_rgba(16,185,129,0.7)]" />
              <div className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-500/10 dark:bg-emerald-500/15 border border-emerald-500/30 text-emerald-600 dark:text-emerald-400 font-extrabold text-[11px] uppercase tracking-wider shadow-sm">
                <ShieldCheck size={13} className="shrink-0" />
                <span>Verified Escrow Guarantee</span>
              </div>
            </div>

            <div className="flex items-center gap-2 ml-auto">
              <button
                type="button"
                onClick={() => handleCopy(data.orderNumber, 'Order Number')}
                className="group flex items-center gap-1.5 px-3 py-1 rounded-xl neu-card-pressed text-[11px] font-mono font-bold text-[var(--text-main)] hover:border-emerald-500/40 transition-all cursor-pointer"
                title="Click to copy Order ID"
              >
                <span className="text-[var(--text-muted)] group-hover:text-emerald-500 font-sans font-medium text-[10px]">Order:</span>
                <span className="tracking-wide">{data.orderNumber}</span>
                {copiedField === 'Order Number' ? (
                  <Check size={12} className="text-emerald-500 ml-0.5" />
                ) : (
                  <Copy size={11} className="text-[var(--text-muted)] group-hover:text-emerald-500 ml-0.5 transition-colors" />
                )}
              </button>
            </div>
          </div>

          {/* 2. Hero Price & Payment Method Section */}
          <div className="text-center py-2 space-y-2">
            <div className="text-[11px] font-bold uppercase tracking-widest text-[var(--text-muted)] flex items-center justify-center gap-1.5">
              <span>Total Payment Received & Protected</span>
            </div>

            {/* Dual Currency Hero Display */}
            <div className="flex items-baseline justify-center gap-2 flex-wrap">
              <span className="text-3xl sm:text-4xl font-black tracking-tight text-[var(--text-main)]">
                ${formattedUSD}
              </span>
              <span className="text-xs sm:text-sm font-bold text-emerald-600 dark:text-emerald-400 px-2 py-0.5 rounded-lg bg-emerald-500/10 border border-emerald-500/20">
                USD
              </span>
            </div>

            {/* Seller Escrow Guarantee Conversion */}
            <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full neu-card-pressed border border-[var(--border-subtle)] text-xs text-[var(--text-muted)] shadow-inner">
              <span className="font-semibold text-[var(--text-main)]">≈ ₦{formattedNGN} NGN</span>
              <span className="text-[10px] opacity-75">• Seller Payout Guarded @ {data.exchangeRate} NGN/USD</span>
            </div>

            {/* Payment Method Badge */}
            <div className="pt-2 flex justify-center">
              {isPayPal ? (
                <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-xl bg-[#0070ba]/10 dark:bg-[#0070ba]/20 border border-[#0070ba]/30 text-xs font-bold text-[#0070ba] dark:text-blue-300">
                  <span className="italic font-black text-sm text-[#0070ba] dark:text-blue-400">Pay<span className="text-[#003087] dark:text-blue-200">Pal</span></span>
                  <span className="text-[11px] font-medium text-[var(--text-main)]">• Instant Verified Capture</span>
                </div>
              ) : (
                <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-xl bg-purple-500/10 border border-purple-500/30 text-xs font-bold text-purple-600 dark:text-purple-300">
                  <span>W-Commerce Escrow Wallet</span>
                  <span className="text-[11px] font-medium text-[var(--text-main)]">• Multi-Sig Hold</span>
                </div>
              )}
            </div>

            {/* Purchased Item Line if present */}
            {data.itemTitle && (
              <div className="pt-2 max-w-md mx-auto">
                <div className="flex items-center gap-3 p-3 rounded-2xl neu-card-pressed border border-[var(--border-subtle)] text-xs text-left">
                  <div className="w-8 h-8 rounded-xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 flex items-center justify-center shrink-0 border border-emerald-500/20">
                    <Box size={15} />
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="text-[10px] font-bold uppercase tracking-wider text-[var(--text-muted)]">Item in Order</div>
                    <div className="font-bold text-[var(--text-main)] truncate">{data.itemTitle}</div>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* 3. Perforated Receipt Graphic Divider */}
          <div className="relative py-1 flex items-center justify-center">
            <div className="w-full border-t border-dashed border-[var(--border-subtle)]" />
            <div className="absolute -left-7 w-4 h-6 bg-[var(--bg-primary)] rounded-r-full border-r border-[var(--border-subtle)]" />
            <div className="absolute -right-7 w-4 h-6 bg-[var(--bg-primary)] rounded-l-full border-l border-[var(--border-subtle)]" />
          </div>

          {/* 4. Itemized Escrow Vault & Logistics Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
            
            {/* Escrow Vault Protection Card */}
            <div className="p-4 rounded-2xl neu-card-pressed border border-emerald-500/20 space-y-2">
              <div className="flex items-center justify-between text-[11px] font-bold text-emerald-600 dark:text-emerald-400">
                <span className="flex items-center gap-1.5">
                  <Lock size={13} /> Escrow Vault Status
                </span>
                <span className="px-2 py-0.5 rounded-full bg-emerald-500/15 border border-emerald-500/30 text-[10px] uppercase font-black">
                  Active Hold
                </span>
              </div>
              <p className="text-[11px] text-[var(--text-muted)] leading-relaxed font-medium">
                100% of your funds are secured in the Escrow Vault. Payout will only be released to the seller after your physical delivery is inspected and confirmed.
              </p>
            </div>

            {/* Carrier & Waybill Card */}
            <div className="p-4 rounded-2xl neu-card-pressed border border-[var(--border-subtle)] space-y-2">
              <div className="flex items-center justify-between text-[11px] font-bold text-[var(--text-main)]">
                <span className="flex items-center gap-1.5 text-blue-600 dark:text-blue-400">
                  <Plane size={13} /> {data.carrier}
                </span>
                <span className="text-[10px] text-emerald-600 dark:text-emerald-400 font-bold flex items-center gap-1">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                  Queued
                </span>
              </div>
              <div className="flex items-center justify-between gap-2 pt-0.5">
                <div className="truncate font-mono font-bold text-[var(--text-main)] text-xs">
                  {data.trackingNumber}
                </div>
                <button
                  type="button"
                  onClick={() => handleCopy(data.trackingNumber, 'Tracking Number')}
                  className="px-2 py-1 rounded-lg neu-button text-[10px] font-bold text-[var(--text-muted)] hover:text-emerald-500 flex items-center gap-1 shrink-0 cursor-pointer transition-colors"
                  title="Copy Waybill"
                >
                  {copiedField === 'Tracking Number' ? <Check size={11} className="text-emerald-500" /> : <Copy size={11} />}
                  <span>Copy</span>
                </button>
              </div>
            </div>

          </div>

          {/* 5. 3-Step Fulfillment Progress Pipeline */}
          <div className="p-4 rounded-2xl neu-card border border-[var(--border-subtle)]/70 space-y-3">
            <div className="flex items-center justify-between text-[11px] font-bold text-[var(--text-main)]">
              <span className="flex items-center gap-1.5">
                <Clock size={12} className="text-[#006cff]" /> Fulfillment Timeline
              </span>
              <span className="text-[10px] uppercase font-bold text-emerald-600 dark:text-emerald-400">
                {data.fulfillmentStatus}
              </span>
            </div>

            <div className="grid grid-cols-3 gap-2 text-center pt-1">
              {/* Step 1 */}
              <div className="flex flex-col items-center space-y-1.5">
                <div className="w-6 h-6 rounded-full bg-emerald-500 text-white flex items-center justify-center text-[10px] font-bold shadow-md shadow-emerald-500/30">
                  ✓
                </div>
                <span className="text-[10px] font-bold text-[var(--text-main)]">Payment Verified</span>
                <span className="text-[9px] text-[var(--text-muted)]">Escrow Locked</span>
              </div>

              {/* Step 2 */}
              <div className="flex flex-col items-center space-y-1.5">
                <div className="w-6 h-6 rounded-full bg-blue-500 text-white flex items-center justify-center text-[10px] font-bold shadow-md shadow-blue-500/30 animate-pulse">
                  ⚡
                </div>
                <span className="text-[10px] font-bold text-blue-600 dark:text-blue-400">Bay Dispatch</span>
                <span className="text-[9px] text-[var(--text-muted)]">Ready at Lagos Hub</span>
              </div>

              {/* Step 3 */}
              <div className="flex flex-col items-center space-y-1.5 opacity-60">
                <div className="w-6 h-6 rounded-full neu-card-pressed text-[var(--text-muted)] flex items-center justify-center text-[10px] font-bold border border-[var(--border-subtle)]">
                  3
                </div>
                <span className="text-[10px] font-medium text-[var(--text-main)]">Final Delivery</span>
                <span className="text-[9px] text-[var(--text-muted)]">Confirm & Release</span>
              </div>
            </div>
          </div>

          {/* 6. Interactive Action CTA Bar */}
          <div className="flex items-center gap-2.5 flex-wrap pt-1">
            <button
              type="button"
              onClick={() => onTrackOrder && onTrackOrder(data.trackingNumber, data.orderNumber)}
              className="flex-1 min-w-[150px] py-3 px-4 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white font-extrabold text-xs flex items-center justify-center gap-2 shadow-lg shadow-emerald-500/20 cursor-pointer transition-all active:scale-[0.98]"
            >
              <Plane size={14} className="shrink-0" />
              <span>Track Package Live</span>
              <ArrowRight size={13} className="shrink-0 opacity-80" />
            </button>

            <button
              type="button"
              onClick={() => onAskAI && onAskAI(`Track my order ${data.orderNumber} and check the current shipment status`)}
              className="flex-1 min-w-[140px] py-3 px-4 rounded-xl neu-button text-[var(--text-main)] hover:text-[#006cff] font-bold text-xs flex items-center justify-center gap-1.5 cursor-pointer transition-all"
            >
              <MessageSquare size={14} className="text-[#006cff] shrink-0" />
              <span>Ask PayAI Status</span>
            </button>
          </div>

          {/* 7. Authenticity Watermark & Security Seal Footer */}
          <div className="pt-3 border-t border-[var(--border-subtle)]/50 flex items-center justify-between gap-3 text-[10px] text-[var(--text-muted)] flex-wrap">
            <div className="flex items-center gap-2">
              {/* Subtle Barcode Lines Graphic Accent */}
              <div className="flex items-center gap-[2px] h-4 opacity-40 px-1 py-0.5 rounded bg-[var(--text-muted)]/10" title="Cryptographic Escrow Barcode">
                <span className="w-[1.5px] h-full bg-current" />
                <span className="w-[1px] h-full bg-current" />
                <span className="w-[2px] h-full bg-current" />
                <span className="w-[1px] h-full bg-current" />
                <span className="w-[3px] h-full bg-current" />
                <span className="w-[1px] h-full bg-current" />
                <span className="w-[2px] h-full bg-current" />
                <span className="w-[1.5px] h-full bg-current" />
              </div>
              <span className="font-mono tracking-wider text-[9px] uppercase">
                ESCROW-HASH-{(data.orderNumber.replace(/[^A-Za-z0-9]/g, '').slice(-8) || 'VERIFIED')}
              </span>
            </div>

            <div className="flex items-center gap-1 font-medium text-[10px]">
              <ShieldCheck size={12} className="text-emerald-500" />
              <span>Protected by W-Commerce Multi-Sig Escrow</span>
            </div>
          </div>

        </div>
      </div>
    </motion.div>
  );
}
