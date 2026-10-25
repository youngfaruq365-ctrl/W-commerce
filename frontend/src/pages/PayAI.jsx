import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { 
  Globe, Sparkles, Send, ShieldCheck, CheckCircle2, 
  Clock, ArrowRight, ExternalLink, Plane, RefreshCw, X, ChevronRight, ChevronDown, ChevronLeft, ChevronUp, Check, Info, Box, Package,
  Search, PackageCheck, Copy, Eye, Star, ShoppingBag, Link2, Tag, AlertTriangle, Store, Wallet, MessageSquarePlus, Compass,
  Lock, CreditCard, Camera, Mic, Volume2, Maximize2,
  PanelLeft, PanelLeftClose, Plus, Trash2, History, MessageSquare, User,
  Receipt, Table, Calculator
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import toast from 'react-hot-toast';
import { apiClient } from '../utils/apiClient';
import { useAuthStore } from '../store/authStore';
import { useCartStore } from '../store/cartStore';
import { getSocket, identifyUser } from '../lib/socketClient';
import { decodeHtml, resolveProductImage, isVideoUrl, convertVideoToImageUrl, FALLBACK_PACKAGE_BOX_IMG } from '../utils/imageHelpers';
import { PLACEHOLDER_IMAGE } from '../constants/placeholders';

// Supporting Modular Components
import PayAIProductCard from '../components/payai/PayAIProductCard';
import PayAIOrderTracker from '../components/payai/PayAIOrderTracker';
import PayAICartDrawer from '../components/payai/PayAICartDrawer';
import PayPalCheckoutModal from '../components/payai/PayPalCheckoutModal';
import ExternalStoreShowcaseModal from '../components/payai/ExternalStoreShowcaseModal';
import AILazyResponseSkeleton from '../components/payai/AILazyResponseSkeleton';
import StoreLogoAvatar from '../components/payai/StoreLogoAvatar';
import TopUpModal from '../components/buyer/TopUpModal';
import OfficialReceiptCard, { parseReceiptData } from '../components/payai/OfficialReceiptCard';
import PayAITasteMatchCard from '../components/payai/PayAITasteMatchCard';
import { useWalletStore } from '../store/walletStore';

const QUICK_PROMPTS = [
  { label: '🧠 TasteMatch Plan (₦6k • 3 Days Food)', text: 'Plan a 3-day food basket for me under ₦6,000 using TasteMatch AI based on spicy comfort palate' },
  { label: '🎨 Vibe Match: Streetwear & Indie', text: 'Show me trending streetwear and indie fashion matching my cultural aesthetic and vibe' },
  { label: '💳 Pay with PayPal', text: 'Can I pay using PayPal?' },
  { label: '💰 Check Wallet Balance', text: 'How much am I having in my wallet?' },
  { label: '📸 Warehouse Photo & Voice Note', text: 'Can you share a live warehouse photo and seller voice note confirming the product condition before I buy?' },
  { label: '🔍 Find Tech & Gadgets', text: 'Search verified electronics, smartphones, and computers with high seller ratings' },
  { label: '🤝 Negotiate with Seller', text: 'Negotiate price directly with verified sellers for an instant discount' },
  { label: '⚡ W-Commerce Bestsellers', text: 'Show me the trending and bestselling products right now' },
  { label: '🔗 Compare Global Prices', text: 'Compare W-Commerce prices with global store imports' },
  { label: '📦 Track My Orders', text: 'Track my recent order shipment and delivery status' },
  { label: '↩️ Buyer Protection Policy', text: 'Explain the buyer protection, escrow release, and dispute policy' },
];

const DESTINATIONS = [
  { code: 'NG', name: 'Nigeria (Lagos Hub)', currency: 'NGN', rate: 1480, flag: '🇳🇬' },
  { code: 'GH', name: 'Ghana (Accra Hub)', currency: 'GHS', rate: 15.5, flag: '🇬🇭' },
  { code: 'KE', name: 'Kenya (Nairobi Hub)', currency: 'KES', rate: 130, flag: '🇰🇪' },
  { code: 'GB', name: 'United Kingdom (London)', currency: 'GBP', rate: 0.78, flag: '🇬🇧' },
  { code: 'US', name: 'United States (Express)', currency: 'USD', rate: 1, flag: '🇺🇸' },
];

const STORES = [
  { id: 'all', label: 'All Stores' },
  { id: 'w-commerce', label: 'W-Commerce Direct' },
  { id: 'amazon', label: 'Amazon (Ref)' },
  { id: 'aliexpress', label: 'AliExpress (Ref)' },
  { id: 'ebay', label: 'eBay (Ref)' },
  { id: 'asos', label: 'ASOS (Ref)' },
];

const CATEGORIES = [
  { id: 'all', label: 'All Categories' },
  { id: 'electronics', label: 'Electronics' },
  { id: 'fashion', label: 'Fashion' },
  { id: 'beauty', label: 'Beauty' },
  { id: 'home', label: 'Home & Kitchen' },
];

const INITIAL_SHIPMENTS = [
  {
    id: 'ord-78192',
    orderNumber: 'W-DOM-78192-NG',
    trackingNumber: 'GIGL-DOM-48912401',
    carrier: 'GIG Logistics Direct',
    status: 'IN_TRANSIT',
    itemTitle: 'Apple MacBook Air M3 (16GB, 512GB SSD)',
    origin: 'Ikeja Tech Hub (NG)',
    destination: 'Victoria Island, Lagos (NG)',
    eta: 'Tomorrow by 2:00 PM',
    grandTotal: 1099.00
  },
  {
    id: 'ord-65239',
    orderNumber: 'W-INT-65239-US',
    trackingNumber: 'DHL-EXP-91823054',
    carrier: 'DHL Express International',
    status: 'DELIVERED',
    itemTitle: 'Sony WH-1000XM5 Wireless Headphones',
    origin: 'New York Export Terminal (US)',
    destination: 'Lagos Import Terminal (NG)',
    eta: 'Delivered',
    grandTotal: 348.00
  }
];

// Helper: Persistent Recent Chat Sessions Storage
// Keys are user-scoped to prevent cross-user data leaks on shared browsers.
const SESSIONS_STORAGE_KEY_BASE = 'payai_recent_sessions_v1';

function getSessionsStorageKey(userId) {
  return userId ? `${SESSIONS_STORAGE_KEY_BASE}_${userId}` : `${SESSIONS_STORAGE_KEY_BASE}_guest`;
}

function loadStoredSessions(userId) {
  try {
    const key = getSessionsStorageKey(userId);
    const raw = localStorage.getItem(key);
    return raw ? JSON.parse(raw) : [];
  } catch (e) {
    return [];
  }
}

function saveStoredSessions(sessions, userId) {
  try {
    const key = getSessionsStorageKey(userId);
    localStorage.setItem(key, JSON.stringify(sessions.slice(0, 30)));
  } catch (e) {}
}

// Helper: Extract amount (NGN or USD) from text
function extractAmountFromText(text) {
  if (!text || typeof text !== 'string') return null;
  const ngnMatch = text.match(/₦\s*([0-9,]+)/);
  if (ngnMatch) {
    const raw = parseInt(ngnMatch[1].replace(/,/g, ''), 10);
    return {
      currency: 'NGN',
      amount: raw,
      formatted: `₦${raw.toLocaleString()} NGN`
    };
  }
  const usdMatch = text.match(/\$\s*([0-9,.]+)/);
  if (usdMatch) {
    const raw = parseFloat(usdMatch[1].replace(/,/g, ''));
    return {
      currency: 'USD',
      amount: raw,
      formatted: `$${raw.toFixed(2)} USD`
    };
  }
  return null;
}

// Helper: Check if content discusses payment, wallet, or checkout actions
function hasPaymentOrCheckoutIntent(content) {
  if (!content || typeof content !== 'string') return false;
  // Exclude wallet balance inquiries, receipts, and order confirmations from triggering checkout cards
  if (/Available\s+Balance|Your\s+W-Commerce\s+Wallet\s+Balance|in\s+my\s+wallet|how\s+much.*wallet|check.*wallet/i.test(content)) return false;
  if (/Official\s+Purchase\s+Receipt|Order\s+Summary:|Payment\s+Authorized\s+&\s+Escrow\s+Locked|Order\s+Confirmed|Order\s+Delivered|PAID_IN_ESCROW/i.test(content)) return false;
  return /confirm\s*&\s*pay|pay\s+from\s+wallet|pay\s+with\s+wallet|deduction\s+from\s+(?:your\s+)?wallet|proceed\s+to\s+secure\s+checkout|ready\s+to\s+complete\s+your\s+order|choose\s+your\s+preferred\s+payment\s+method|secure\s+checkout\s+link\s+is\s+ready|authorize\s+the\s+payment|authorize\s+the\s+deduction|action\s+card\s+below|click\s+(?:the\s+blue\s+)?secure\s+checkout|finalize\s+your\s+order|complete\s+(?:this|your)\s+(?:purchase|order)|ready\s+to\s+pay|ready\s+to\s+place\s+your\s+order|buttons?\s+(?:are\s+)?(?:active|highlighted)\s+below|checkout\s+controls\s+are\s+ready|interactive\s+checkout\s+controls/i.test(content);
}

// Rich inline markdown renderer for chat responses with interactive action button conversion
// Specialized Premium Table Component for Markdown Tables (Financial breakdowns, itemized plans, specs)
function MarkdownTableCard({ headers = [], alignments = [], rows = [], renderInline, onAction }) {
  const [copied, setCopied] = useState(false);

  if (!headers.length && !rows.length) return null;

  // Determine if this is a financial, pricing, or budget table
  const allText = (headers.join(' ') + ' ' + rows.map(r => r.join(' ')).join(' ')).toLowerCase();
  const isFinancialTable = /(?:financial|breakdown|budget|price|cost|amount|total|summary|drink|meal|breakfast|lunch|dinner|item|day|fee|subtotal|₦|\$|ngn|usd)/i.test(allText) ||
    rows.some(r => r.some(c => /(?:₦|\$|NGN|USD)/i.test(c)));

  // Identify numeric / currency columns for right-alignment
  const isNumericColumn = (colIdx) => {
    let numCount = 0;
    let totalCells = 0;
    rows.forEach(r => {
      const cell = r[colIdx]?.trim();
      if (cell) {
        totalCells++;
        if (/(?:₦|\$|€|£|NGN|USD|\d+[\d,.]*)/i.test(cell)) numCount++;
      }
    });
    return totalCells > 0 && (numCount / totalCells) >= 0.5;
  };

  // Find grand total amount if present
  let grandTotalCell = null;
  const totalRow = rows.find(r => r.some(c => /^(total|total planned|grand total)/i.test(c.trim())));
  if (totalRow) {
    grandTotalCell = totalRow.find(c => /(?:₦|\$|NGN|USD|\d+[\d,.]*)/i.test(c) && !/total/i.test(c));
  }

  const handleCopyTable = () => {
    try {
      const headerLine = `| ${headers.join(' | ')} |`;
      const sepLine = `| ${headers.map(() => '---').join(' | ')} |`;
      const rowLines = rows.map(r => `| ${r.join(' | ')} |`).join('\n');
      const textToCopy = `${headerLine}\n${sepLine}\n${rowLines}`;
      navigator.clipboard.writeText(textToCopy);
      setCopied(true);
      toast.success('Table copied to clipboard!');
      setTimeout(() => setCopied(false), 2000);
    } catch (_) {
      toast.error('Failed to copy table');
    }
  };

  return (
    <div className="my-3.5 w-full rounded-2xl border border-slate-200/90 dark:border-white/10 bg-white/80 dark:bg-[#121829]/90 shadow-[0_8px_30px_rgb(0,0,0,0.06)] dark:shadow-[0_8px_30px_rgb(0,0,0,0.35)] backdrop-blur-xl overflow-hidden transition-all duration-200">
      {/* Top accent bar */}
      <div className={`h-1 w-full ${isFinancialTable ? 'bg-gradient-to-r from-blue-600 via-indigo-500 to-emerald-500' : 'bg-gradient-to-r from-slate-300 to-slate-400 dark:from-white/10 dark:to-white/20'}`} />

      {/* Card Header Top Bar */}
      <div className="flex items-center justify-between px-3.5 sm:px-4 py-2.5 bg-gradient-to-r from-slate-50/90 via-blue-50/30 to-slate-50/90 dark:from-white/[0.04] dark:via-blue-500/[0.04] dark:to-white/[0.02] border-b border-slate-200/80 dark:border-white/10 flex-wrap gap-2">
        <div className="flex items-center gap-2">
          <div className={`w-6 h-6 rounded-lg flex items-center justify-center shadow-xs ${
            isFinancialTable
              ? 'bg-blue-600/10 dark:bg-blue-400/20 text-blue-600 dark:text-blue-400'
              : 'bg-slate-500/10 dark:bg-white/10 text-slate-600 dark:text-zinc-300'
          }`}>
            {isFinancialTable ? <Receipt size={13} /> : <Table size={13} />}
          </div>
          <span className="text-xs font-black tracking-wide text-slate-800 dark:text-zinc-100">
            {isFinancialTable ? 'Financial Breakdown' : 'Structured Data Summary'}
          </span>
          <span className="text-[10px] font-bold text-slate-500 dark:text-zinc-400 font-mono hidden sm:inline">
            ({rows.length} {rows.length === 1 ? 'row' : 'rows'})
          </span>
        </div>

        <div className="flex items-center gap-2">
          {isFinancialTable && (
            <span className="inline-flex items-center gap-1 text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20">
              <ShieldCheck size={10} /> Escrow Protected
            </span>
          )}

          <button
            type="button"
            onClick={handleCopyTable}
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 dark:hover:text-white bg-black/[0.03] dark:bg-white/[0.05] hover:bg-black/[0.06] dark:hover:bg-white/[0.1] transition-all cursor-pointer"
            title="Copy table to clipboard"
          >
            {copied ? <Check size={12} className="text-emerald-500" /> : <Copy size={12} />}
          </button>
        </div>
      </div>

      {/* Responsive Table Wrapper */}
      <div className="overflow-x-auto w-full hide-scrollbar">
        <table className="w-full text-left border-collapse min-w-[320px]">
          <thead>
            <tr className="bg-slate-50/90 dark:bg-white/[0.03] border-b border-slate-200/80 dark:border-white/10">
              {headers.map((h, hIdx) => {
                const align = alignments[hIdx] || (isNumericColumn(hIdx) ? 'right' : 'left');
                return (
                  <th
                    key={hIdx}
                    className={`py-2.5 px-3.5 text-[11px] font-extrabold uppercase tracking-wider text-slate-500 dark:text-zinc-400 select-none ${
                      align === 'right' ? 'text-right' : align === 'center' ? 'text-center' : 'text-left'
                    }`}
                  >
                    {renderInline(h)}
                  </th>
                );
              })}
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 dark:divide-white/[0.04] text-xs">
            {rows.map((row, rIdx) => {
              const isTotalRow = row.some(c => /^(total|total planned|grand total|subtotal)/i.test(c.trim()));

              if (isTotalRow) {
                return (
                  <tr
                    key={rIdx}
                    className="bg-emerald-500/[0.07] dark:bg-emerald-500/[0.12] border-t-2 border-emerald-500/30 dark:border-emerald-500/40 font-black"
                  >
                    {row.map((cell, cIdx) => {
                      const align = alignments[cIdx] || (isNumericColumn(cIdx) ? 'right' : 'left');
                      const isCurrency = /(?:₦|\$|NGN|USD)/i.test(cell);
                      const isLabel = /total/i.test(cell);

                      return (
                        <td
                          key={cIdx}
                          className={`py-3 px-3.5 ${
                            align === 'right' ? 'text-right' : align === 'center' ? 'text-center' : 'text-left'
                          }`}
                        >
                          {isCurrency ? (
                            <span className="inline-flex items-center font-mono font-black text-xs sm:text-sm px-2.5 py-1 rounded-lg bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 border border-emerald-500/30 shadow-xs tabular-nums">
                              {renderInline(cell)}
                            </span>
                          ) : isLabel ? (
                            <span className="flex items-center gap-1.5 text-xs font-black text-emerald-800 dark:text-emerald-200 uppercase tracking-wide">
                              <Calculator size={13} className="text-emerald-500 shrink-0" />
                              {renderInline(cell)}
                            </span>
                          ) : cell.trim() ? (
                            <span className="font-bold text-slate-800 dark:text-zinc-200">{renderInline(cell)}</span>
                          ) : (
                            <span className="text-slate-300 dark:text-zinc-600">—</span>
                          )}
                        </td>
                      );
                    })}
                  </tr>
                );
              }

              return (
                <tr
                  key={rIdx}
                  className="hover:bg-blue-500/[0.03] dark:hover:bg-blue-400/[0.04] transition-colors group"
                >
                  {row.map((cell, cIdx) => {
                    const align = alignments[cIdx] || (isNumericColumn(cIdx) ? 'right' : 'left');
                    const isCurrency = /(?:₦|\$|NGN|USD)/i.test(cell);
                    const isDayOrCategory = /^(day\s*\d+|day|date|breakfast|lunch|dinner|week\s*\d+)/i.test(cell.trim());

                    return (
                      <td
                        key={cIdx}
                        className={`py-2.5 px-3.5 text-slate-800 dark:text-zinc-200 ${
                          align === 'right' ? 'text-right' : align === 'center' ? 'text-center' : 'text-left'
                        }`}
                      >
                        {isCurrency ? (
                          <span className="inline-flex items-center font-mono font-semibold text-[11.5px] px-2 py-0.5 rounded-md bg-slate-100/80 dark:bg-white/[0.06] border border-slate-200/60 dark:border-white/[0.08] text-slate-900 dark:text-zinc-100 tabular-nums">
                            {renderInline(cell)}
                          </span>
                        ) : isDayOrCategory ? (
                          <span className="font-bold text-slate-900 dark:text-white flex items-center gap-1.5">
                            <span className="w-1.5 h-1.5 rounded-full bg-blue-500/60 dark:bg-blue-400/80 group-hover:scale-125 transition-transform shrink-0" />
                            {renderInline(cell)}
                          </span>
                        ) : cell.trim() ? (
                          <span className="text-slate-700 dark:text-zinc-300">
                            {renderInline(cell)}
                          </span>
                        ) : (
                          <span className="text-slate-300 dark:text-zinc-600">—</span>
                        )}
                      </td>
                    );
                  })}
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* Optional Financial Escrow Footer Note */}
      {isFinancialTable && grandTotalCell && (
        <div className="px-3.5 sm:px-4 py-2 bg-slate-50/60 dark:bg-white/[0.02] border-t border-slate-200/60 dark:border-white/[0.06] flex items-center justify-between text-[11px] text-slate-500 dark:text-zinc-400 flex-wrap gap-2">
          <span className="flex items-center gap-1.5 font-medium">
            <Lock size={11} className="text-emerald-500 shrink-0" />
            <span>Escrow lock for total: <strong className="font-mono text-emerald-600 dark:text-emerald-400">{grandTotalCell}</strong></span>
          </span>
          <span className="text-[10px] text-slate-400 dark:text-zinc-500">
            Progressive release upon daily confirmation
          </span>
        </div>
      )}
    </div>
  );
}

function MarkdownContent({ content, onAction, isSending = false }) {
  if (!content) return null;

  const lines = content.split('\n');
  const elements = [];
  let currentUnorderedList = [];
  let currentOrderedList = [];
  let keyIdx = 0;

  const flushLists = () => {
    if (currentUnorderedList.length > 0) {
      elements.push(
        <ul key={`ul-${keyIdx++}`} className="list-disc list-inside space-y-1 my-1.5 pl-1">
          {currentUnorderedList}
        </ul>
      );
      currentUnorderedList = [];
    }
    if (currentOrderedList.length > 0) {
      elements.push(
        <ol key={`ol-${keyIdx++}`} className="list-decimal list-inside space-y-1 my-1.5 pl-1">
          {currentOrderedList}
        </ol>
      );
      currentOrderedList = [];
    }
  };

  const renderInline = (text) => {
    if (!text || typeof text !== 'string') return text || '';

    // Split on bold (**...**), italic (*...*), markdown images (![alt](url)), and markdown links ([label](url))
    const tokenRegex = /(\*\*[^*\n]+?\*\*|\*[^*\n]+?\*|!\[[^\]\n]*\]\([^)\n]*\)|\[[^\]\n]+\]\([^)\n]*\))/g;
    const parts = text.split(tokenRegex);

    return parts.map((part, pIdx) => {
      if (!part) return null;

      // Markdown Image or Video: ![alt](url)
      const imgMatch = part.match(/^!\[([^\]]*)\]\(([^)]*)\)$/);
      if (imgMatch) {
        const alt = imgMatch[1] || 'Product Media';
        const src = imgMatch[2]?.trim() || '';
        if (!src) return null;

        const isVideo = isVideoUrl(src);
        const effectiveSrc = isVideo ? getImageUrl(src) : (convertVideoToImageUrl(src) || resolveProductImage(null, alt));
        return (
          <span key={pIdx} className="block my-2 max-w-sm rounded-xl overflow-hidden border border-slate-200 dark:border-zinc-700/60 shadow-sm bg-slate-50 dark:bg-zinc-800/50 group">
            {isVideo ? (
              <video
                src={effectiveSrc}
                controls
                playsInline
                className="w-full h-44 object-cover"
              />
            ) : (
              <img
                src={effectiveSrc}
                alt={alt}
                loading="lazy"
                className="w-full h-44 object-cover group-hover:scale-105 transition-transform duration-300"
                onError={(e) => {
                  e.currentTarget.onerror = null;
                  e.currentTarget.src = convertVideoToImageUrl(src) || resolveProductImage(null, alt);
                }}
              />
            )}
            {alt && (
              <span className="block px-2.5 py-1 text-[11px] font-medium text-slate-600 dark:text-zinc-300 truncate bg-white/80 dark:bg-zinc-900/80 border-t border-slate-100 dark:border-zinc-800">
                {alt}
              </span>
            )}
          </span>
        );
      }

      // Bold: **text**
      if (part.startsWith('**') && part.endsWith('**') && part.length > 4) {
        const inner = part.slice(2, -2);
        const lowerInner = inner.toLowerCase();
        const isAction =
          lowerInner === 'add to cart' ||
          lowerInner === 'secure checkout' ||
          lowerInner === 'pay with wallet' ||
          lowerInner === 'pay from wallet' ||
          lowerInner === 'proceed to checkout' ||
          lowerInner === 'negotiate price' ||
          lowerInner === 'negotiate with seller';

        if (isAction) {
          const isWallet = lowerInner.includes('wallet');
          const isCheckout = lowerInner.includes('checkout');
          const isNegotiate = lowerInner.includes('negotiat');
          return (
            <button
              key={pIdx}
              type="button"
              disabled={isSending}
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                if (!isSending) {
                  onAction && onAction({ label: inner, url: '#' });
                }
              }}
              className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 my-0.5 mx-1 rounded-lg text-xs font-black shadow-sm transition-all ${
                isSending ? 'opacity-60 cursor-not-allowed' : 'cursor-pointer active:scale-95'
              } ${
                isWallet
                  ? 'bg-emerald-600 hover:bg-emerald-700 text-white'
                  : isCheckout
                  ? 'bg-blue-600 hover:bg-blue-700 text-white'
                  : isNegotiate
                  ? 'bg-purple-600 hover:bg-purple-700 text-white'
                  : 'bg-amber-600 hover:bg-amber-700 text-white'
              }`}
            >
              {isWallet ? (
                <Wallet size={11} className="shrink-0" />
              ) : isCheckout ? (
                <Lock size={11} className="shrink-0" />
              ) : isNegotiate ? (
                <Tag size={11} className="shrink-0" />
              ) : (
                <ShoppingBag size={11} className="shrink-0" />
              )}
              <span>{inner}</span>
            </button>
          );
        }

        return (
          <strong key={pIdx} className="font-bold text-slate-900 dark:text-white">
            {inner}
          </strong>
        );
      }

      // Italic: *text*
      if (part.startsWith('*') && part.endsWith('*') && part.length > 2) {
        return (
          <em key={pIdx} className="italic text-slate-700 dark:text-zinc-300">
            {part.slice(1, -1)}
          </em>
        );
      }

      // Markdown Link or Action Button: [label](url)
      const linkMatch = part.match(/^\[([^\]]+)\]\(([^)]*)\)$/);
      if (linkMatch) {
        const label = linkMatch[1];
        const url = linkMatch[2]?.trim() || '';
        const lowerLabel = label.toLowerCase();

        // Detect if this is an interactive prompt suggestion chip (e.g. prompt:add item to cart)
        if (url.startsWith('prompt:')) {
          return (
            <span key={pIdx} className="inline-block my-1 mx-1 align-middle">
              <button
                type="button"
                disabled={isSending}
                onClick={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  if (!isSending) {
                    onAction && onAction({ label, url });
                  }
                }}
                className={`inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl text-xs sm:text-sm font-semibold shadow-sm transition-all select-none ${
                  isSending
                    ? 'opacity-60 cursor-not-allowed bg-[var(--bg-secondary)] text-[var(--text-muted)] border border-[var(--border-subtle)]'
                    : 'cursor-pointer active:scale-95 bg-[var(--bg-secondary)] hover:bg-[var(--bg-primary)] text-[var(--text-main)] hover:text-[#006cff] dark:hover:text-blue-400 border border-[var(--border-subtle)] hover:border-[#006cff]/40 hover:shadow-md'
                } group`}
              >
                <Sparkles size={13} className="shrink-0 text-amber-500 group-hover:text-amber-400 transition-colors" />
                <span>{label}</span>
              </button>
            </span>
          );
        }

        // Detect if this is an interactive action button (cart, checkout, negotiate, wallet)
        const isAction =
          url === '#' ||
          url === '' ||
          url.startsWith('#') ||
          url === '/cart' ||
          url === '/checkout' ||
          url === '/negotiate' ||
          lowerLabel.includes('pay') ||
          lowerLabel.includes('wallet') ||
          lowerLabel.includes('checkout') ||
          lowerLabel.includes('confirm') ||
          lowerLabel.includes('order') ||
          lowerLabel.includes('buy') ||
          lowerLabel.includes('cart') ||
          lowerLabel.includes('negotiat') ||
          lowerLabel.includes('discount');

        if (isAction) {
          const isWallet = lowerLabel.includes('wallet') || lowerLabel.includes('deduction');
          const isCheckout = lowerLabel.includes('checkout') || lowerLabel.includes('proceed') || url === '/cart' || url === '/checkout';
          const isNegotiate = lowerLabel.includes('negotiat') || lowerLabel.includes('discount') || url === '/negotiate';

          return (
            <span key={pIdx} className="inline-block my-1.5 mx-1 align-middle">
              <button
                type="button"
                disabled={isSending}
                onClick={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  if (!isSending) {
                    onAction && onAction({ label, url });
                  }
                }}
                className={`inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl text-xs sm:text-sm font-black shadow-md transition-all select-none ${
                  isSending ? 'opacity-60 cursor-not-allowed' : 'cursor-pointer active:scale-95'
                } ${
                  isWallet
                    ? 'bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 text-white shadow-emerald-500/25 ring-2 ring-emerald-400/30'
                    : isCheckout
                    ? 'bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white shadow-blue-500/25 ring-2 ring-blue-400/30'
                    : isNegotiate
                    ? 'bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-700 hover:to-indigo-700 text-white shadow-purple-500/25 ring-2 ring-purple-400/30'
                    : 'bg-gradient-to-r from-amber-600 to-orange-600 hover:from-amber-700 hover:to-orange-700 text-white shadow-amber-500/25 ring-2 ring-amber-400/30'
                }`}
              >
                {isWallet ? (
                  <Wallet size={14} className="shrink-0" />
                ) : isCheckout ? (
                  <Lock size={14} className="shrink-0" />
                ) : isNegotiate ? (
                  <Tag size={14} className="shrink-0" />
                ) : (
                  <ShoppingBag size={14} className="shrink-0" />
                )}
                <span>{label}</span>
                <ArrowRight size={13} className="shrink-0" />
              </button>
            </span>
          );
        }

        // Standard External/Internal Link
        if (url && (url.startsWith('/') || url.startsWith('#'))) {
          return (
            <button
              key={pIdx}
              type="button"
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                onAction && onAction({ label, url });
              }}
              className="inline-flex items-center gap-1 text-blue-600 hover:text-blue-700 dark:text-blue-400 underline font-semibold text-xs sm:text-sm cursor-pointer"
            >
              <span>{label}</span>
              <ArrowRight size={12} className="shrink-0" />
            </button>
          );
        }

        return (
          <a
            key={pIdx}
            href={url}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1 text-blue-600 hover:text-blue-700 dark:text-blue-400 underline font-semibold text-xs sm:text-sm"
          >
            <span>{label}</span>
            <ExternalLink size={12} className="shrink-0" />
          </a>
        );
      }

      return part;
    });
  };

  const isTableSeparator = (s) => /^\|?\s*:?-{2,}:?\s*(\|\s*:?-{2,}:?\s*)+\|?$/.test((s || '').trim());
  const splitTableRow = (r) => {
    let s = (r || '').trim();
    if (s.startsWith('|')) s = s.slice(1);
    if (s.endsWith('|')) s = s.slice(0, -1);
    return s.split('|').map(c => c.trim());
  };

  for (let idx = 0; idx < lines.length; idx++) {
    const line = lines[idx];
    const trimmed = (line || '').trim();

    // 1. Markdown Table Check
    if (trimmed.includes('|') && idx + 1 < lines.length && isTableSeparator(lines[idx + 1])) {
      flushLists();
      const rawHeaders = splitTableRow(trimmed);
      const sepRow = lines[idx + 1];
      const alignments = splitTableRow(sepRow).map(c => {
        const cell = c.trim();
        if (cell.startsWith(':') && cell.endsWith(':')) return 'center';
        if (cell.endsWith(':')) return 'right';
        if (cell.startsWith(':')) return 'left';
        return null;
      });

      idx += 2; // Advance past header and separator rows
      const tableRows = [];
      while (idx < lines.length && lines[idx].trim().includes('|') && !isTableSeparator(lines[idx])) {
        const rowCells = splitTableRow(lines[idx]);
        while (rowCells.length < rawHeaders.length) rowCells.push('');
        tableRows.push(rowCells.slice(0, Math.max(rawHeaders.length, rowCells.length)));
        idx++;
      }
      idx--; // Balance the loop increment

      elements.push(
        <MarkdownTableCard
          key={`table-${keyIdx++}`}
          headers={rawHeaders}
          alignments={alignments}
          rows={tableRows}
          renderInline={renderInline}
          onAction={onAction}
        />
      );
      continue;
    }

    // 2. Horizontal Divider
    if (trimmed === '---' || trimmed === '***' || trimmed === '___') {
      flushLists();
      elements.push(
        <hr key={`hr-${keyIdx++}`} className="my-2.5 border-slate-200 dark:border-zinc-800" />
      );
      continue;
    }

    // 3. Standalone Image or Video Line: ![alt](url)
    const imgLineMatch = trimmed.match(/^!\[([^\]]*)\]\(([^)]*)\)$/);
    if (imgLineMatch) {
      flushLists();
      const alt = imgLineMatch[1] || 'Product Media';
      const src = imgLineMatch[2]?.trim() || '';
      if (src) {
        const isVideo = isVideoUrl(src);
        const effectiveSrc = isVideo ? getImageUrl(src) : (convertVideoToImageUrl(src) || resolveProductImage(null, alt));
        elements.push(
          <div key={`img-${keyIdx++}`} className="my-2 max-w-sm rounded-xl overflow-hidden border border-slate-200 dark:border-zinc-700/60 shadow-sm bg-slate-50 dark:bg-zinc-800/50 group">
            {isVideo ? (
              <video
                src={effectiveSrc}
                controls
                playsInline
                className="w-full h-44 object-cover"
              />
            ) : (
              <img
                src={effectiveSrc}
                alt={alt}
                loading="lazy"
                className="w-full h-44 object-cover group-hover:scale-105 transition-transform duration-300"
                onError={(e) => {
                  e.currentTarget.onerror = null;
                  e.currentTarget.src = convertVideoToImageUrl(src) || resolveProductImage(null, alt);
                }}
              />
            )}
            {alt && (
              <div className="px-2.5 py-1 text-[11px] font-medium text-slate-600 dark:text-zinc-300 truncate bg-white/80 dark:bg-zinc-900/80 border-t border-slate-100 dark:border-zinc-800">
                {alt}
              </div>
            )}
          </div>
        );
      }
      continue;
    }

    // 4. Headings
    if (trimmed.startsWith('### ')) {
      flushLists();
      elements.push(
        <h4 key={`h4-${keyIdx++}`} className="font-black text-xs sm:text-sm text-slate-900 dark:text-white mt-2.5 mb-1 flex items-center gap-1.5">
          {renderInline(trimmed.slice(4))}
        </h4>
      );
      continue;
    }
    if (trimmed.startsWith('## ')) {
      flushLists();
      elements.push(
        <h3 key={`h3-${keyIdx++}`} className="font-black text-sm sm:text-base text-slate-900 dark:text-white mt-3 mb-1">
          {renderInline(trimmed.slice(3))}
        </h3>
      );
      continue;
    }
    if (trimmed.startsWith('# ')) {
      flushLists();
      elements.push(
        <h2 key={`h2-${keyIdx++}`} className="font-black text-base sm:text-lg text-slate-900 dark:text-white mt-3.5 mb-1.5">
          {renderInline(trimmed.slice(2))}
        </h2>
      );
      continue;
    }

    // 5. Short Emoji Section Headers (e.g. 📊 Itemized Financial Summary, 💡 Recommended Choices, 📦 Shipping Details)
    const isEmojiHeader = /^(?:[\u{1F300}-\u{1F9FF}\u{2600}-\u{26FF}\u{2700}-\u{27BF}]\s*)+[A-Za-z0-9\s&:-]+$/u.test(trimmed) && trimmed.length < 60;
    if (isEmojiHeader) {
      flushLists();
      elements.push(
        <div key={`section-${keyIdx++}`} className="font-black text-xs sm:text-sm text-slate-900 dark:text-white flex items-center gap-2 mt-3.5 mb-1">
          {renderInline(trimmed)}
        </div>
      );
      continue;
    }

    // 6. Unordered List Items: - or *
    if (trimmed.startsWith('- ') || trimmed.startsWith('* ')) {
      const itemText = trimmed.slice(2);
      const leadingImgMatch = itemText.match(/^!\[([^\]]*)\]\(([^)]*)\)\s*(.*)/s);
      if (leadingImgMatch) {
        if (currentUnorderedList.length > 0) flushLists();
        if (currentOrderedList.length > 0) flushLists();
        const imgAlt = leadingImgMatch[1] || 'Product Image';
        const imgSrc = leadingImgMatch[2]?.trim() || '';
        const afterText = leadingImgMatch[3]?.trim() || '';
        if (imgSrc) {
          elements.push(
            <div key={`imgblock-${keyIdx++}`} className="my-2 max-w-sm rounded-xl overflow-hidden border border-slate-200 dark:border-zinc-700/60 shadow-sm bg-slate-50 dark:bg-zinc-800/50 group">
              <img
                src={imgSrc}
                alt={imgAlt}
                loading="lazy"
                className="w-full h-44 object-cover group-hover:scale-105 transition-transform duration-300"
                onError={(e) => {
                  e.currentTarget.onerror = null;
                  e.currentTarget.src = FALLBACK_PACKAGE_BOX_IMG;
                }}
              />
              {imgAlt && (
                <div className="px-2.5 py-1 text-[11px] font-medium text-slate-600 dark:text-zinc-300 truncate bg-white/80 dark:bg-zinc-900/80 border-t border-slate-100 dark:border-zinc-800">
                  {imgAlt}
                </div>
              )}
            </div>
          );
        }
        if (afterText) {
          elements.push(
            <p key={`imgafter-${keyIdx++}`} className="text-xs sm:text-sm leading-relaxed text-slate-800 dark:text-zinc-100">
              {renderInline(afterText)}
            </p>
          );
        }
        continue;
      }
      if (currentOrderedList.length > 0) flushLists();
      currentUnorderedList.push(
        <li key={`uli-${idx}`} className="text-xs sm:text-sm text-slate-700 dark:text-zinc-200">
          {renderInline(itemText)}
        </li>
      );
      continue;
    }

    // 7. Ordered List Items: e.g. 1. Item
    const numMatch = trimmed.match(/^(\d+)\.\s+(.*)$/s);
    if (numMatch) {
      const itemText = numMatch[2];
      const leadingImgMatch = itemText.match(/^!\[([^\]]*)\]\(([^)]*)\)\s*(.*)/s);
      if (leadingImgMatch) {
        if (currentUnorderedList.length > 0) flushLists();
        if (currentOrderedList.length > 0) flushLists();
        const imgAlt = leadingImgMatch[1] || 'Product Image';
        const imgSrc = leadingImgMatch[2]?.trim() || '';
        const afterText = leadingImgMatch[3]?.trim() || '';
        if (imgSrc) {
          elements.push(
            <div key={`imgblock-${keyIdx++}`} className="my-2 max-w-sm rounded-xl overflow-hidden border border-slate-200 dark:border-zinc-700/60 shadow-sm bg-slate-50 dark:bg-zinc-800/50 group">
              <img
                src={imgSrc}
                alt={imgAlt}
                loading="lazy"
                className="w-full h-44 object-cover group-hover:scale-105 transition-transform duration-300"
                onError={(e) => {
                  e.currentTarget.onerror = null;
                  e.currentTarget.src = FALLBACK_PACKAGE_BOX_IMG;
                }}
              />
              {imgAlt && (
                <div className="px-2.5 py-1 text-[11px] font-medium text-slate-600 dark:text-zinc-300 truncate bg-white/80 dark:bg-zinc-900/80 border-t border-slate-100 dark:border-zinc-800">
                  {imgAlt}
                </div>
              )}
            </div>
          );
        }
        if (afterText) {
          elements.push(
            <p key={`imgafter-${keyIdx++}`} className="text-xs sm:text-sm leading-relaxed text-slate-800 dark:text-zinc-100">
              {renderInline(afterText)}
            </p>
          );
        }
        continue;
      }
      if (currentUnorderedList.length > 0) flushLists();
      currentOrderedList.push(
        <li key={`oli-${idx}`} className="text-xs sm:text-sm text-slate-700 dark:text-zinc-200">
          {renderInline(itemText)}
        </li>
      );
      continue;
    }

    // 8. Paragraph or empty spacing line
    flushLists();
    if (trimmed === '') {
      elements.push(<div key={`br-${keyIdx++}`} className="h-1.5" />);
    } else {
      elements.push(
        <p key={`p-${keyIdx++}`} className="text-xs sm:text-sm leading-relaxed text-slate-800 dark:text-zinc-100">
          {renderInline(trimmed)}
        </p>
      );
    }
  }

  flushLists();

  return <div className="space-y-1">{elements}</div>;
}

export default function PayAI() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { user } = useAuthStore();
  const { addToCart, fetchCart: fetchAppCart, cartItems } = useCartStore();
  
  // Navigation Tabs: 'chat', 'discover', 'tracking'
  const [activeTab, setActiveTab] = useState('chat');
  const [slideDirection, setSlideDirection] = useState(1);

  // Sync tab and search from query params (e.g. /payai?tab=tracking&orderId=... or /payai?status=success)
  useEffect(() => {
    const tabParam = searchParams.get('tab');
    const orderIdParam = searchParams.get('orderId') || searchParams.get('track');
    const statusParam = searchParams.get('status') || searchParams.get('payment');

    if (statusParam === 'success') {
      toast.success('🎉 PayPal Payment Verified! Your W-Commerce order is confirmed and queued for fulfillment.', { duration: 6000 });
      setActiveTab('tracking');
    } else if (statusParam === 'cancel') {
      toast('PayPal checkout was cancelled. Your items are safe in cart.', { icon: 'ℹ️' });
    }

    if (tabParam === 'tracking') {
      setActiveTab('tracking');
    }
    if (orderIdParam) {
      setTrackingSearchCode(orderIdParam);
      setActiveTab('tracking');
    }
  }, [searchParams]);

  // Responsive Collapsible Sidebar State (defaults open on desktop >= 1024px)
  const [isSidebarOpen, setIsSidebarOpen] = useState(() => {
    if (typeof window !== 'undefined') {
      return window.innerWidth >= 1024;
    }
    return true;
  });

  // Recent Sessions History State — initially loaded from guest key; overwritten by initSession for logged-in users
  const [recentSessions, setRecentSessions] = useState(() => loadStoredSessions(null));

  // Market & Destination
  const [marketCode, setMarketCode] = useState('INTERNATIONAL');
  const [destinationCountry, setDestinationCountry] = useState('NG');

  // Session & Chat States
  const [sessionId, setSessionId] = useState(null);
  const [messages, setMessages] = useState([]);
  const [inputText, setInputText] = useState('');
  const [isSending, setIsSending] = useState(false);
  const [isInitializing, setIsInitializing] = useState(true);
  const chatScrollRef = useRef(null);

  // Discover & Deals Catalog States
  const [discoverQuery, setDiscoverQuery] = useState('');
  const [selectedStore, setSelectedStore] = useState('all');
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [discoverItems, setDiscoverItems] = useState([]);
  const [isSearchingCatalog, setIsSearchingCatalog] = useState(false);

  // External Stores Discovery States
  const [discoverableStores, setDiscoverableStores] = useState([]);
  const [selectedExternalStore, setSelectedExternalStore] = useState(null);
  const [isStoreShowcaseOpen, setIsStoreShowcaseOpen] = useState(false);
  const [isLoadingExternalStores, setIsLoadingExternalStores] = useState(false);
  const [expandedStoreDropdownId, setExpandedStoreDropdownId] = useState(null);
  const storeScrollContainerRef = useRef(null);

  const [hoveredPreviewProduct, setHoveredPreviewProduct] = useState(null);

  const scrollStores = (direction) => {
    if (storeScrollContainerRef.current) {
      const containerWidth = storeScrollContainerRef.current.clientWidth;
      const scrollAmount = direction === 'left' ? -containerWidth : containerWidth;
      storeScrollContainerRef.current.scrollBy({ left: scrollAmount, behavior: 'smooth' });
    }
  };

  // PayAI Cart State (syncs session items)
  const [cart, setCart] = useState({ items: [] });

  // Negotiation Status Map (Offer ID -> Result)
  const [negotiationStatusMap, setNegotiationStatusMap] = useState({});
  const [customOfferInput, setCustomOfferInput] = useState('');

  // Order Tracking States
  const [shipments, setShipments] = useState(INITIAL_SHIPMENTS);
  const [loadingShipments, setLoadingShipments] = useState(false);
  const [trackingSearchCode, setTrackingSearchCode] = useState('');

  // Quick View Modal States
  const [quickViewItem, setQuickViewItem] = useState(null);
  const [modalTab, setModalTab] = useState('overview');
  const [quickViewRecommendations, setQuickViewRecommendations] = useState([]);
  const [loadingQuickViewRecommendations, setLoadingQuickViewRecommendations] = useState(false);

  // 1-Click Attached Product in Chat State
  const [attachedChatProduct, setAttachedChatProduct] = useState(null);
  const [isQuickChattingSeller, setIsQuickChattingSeller] = useState(false);
  const tasteMatchHandledRef = useRef(false);

  // Live Seller Quick-Chat & Presence States
  const [activeQuickChatSeller, setActiveQuickChatSeller] = useState(null);
  const [isSellerTyping, setIsSellerTyping] = useState(false);
  const activeQuickChatSellerRef = useRef(null);
  activeQuickChatSellerRef.current = activeQuickChatSeller;

  // Live Warehouse Verification & Audio Note States
  const [activeVoiceNoteId, setActiveVoiceNoteId] = useState(null);
  const [isPlayingVoiceNote, setIsPlayingVoiceNote] = useState(false);
  const [photoZoomModal, setPhotoZoomModal] = useState(null);

  // Buyer Wallet Top-Up Modal State
  const [isTopUpOpen, setIsTopUpOpen] = useState(false);
  const { balance: storeWalletBalance, fetchWallet: refreshWalletStore } = useWalletStore();

  // PayAI Cart Drawer & PayPal Checkout Modal States
  const [isCartDrawerOpen, setIsCartDrawerOpen] = useState(false);
  const [isPayPalModalOpen, setIsPayPalModalOpen] = useState(false);
  const [checkoutQuote, setCheckoutQuote] = useState(null);

  // Touch Swiping Refs
  const touchStartX = useRef(null);
  const touchStartY = useRef(null);

  const TABS = [
    { id: 'chat', label: 'AI Shopper', icon: Sparkles, badge: null },
    { id: 'discover', label: 'Global Deals', icon: Globe, badge: 'Deals' },
    { id: 'tracking', label: 'Live Tracking', icon: Plane, badge: `${shipments.length}` },
  ];

  const switchTab = (tabId, dir = null) => {
    const currentIdx = TABS.findIndex(t => t.id === activeTab);
    const targetIdx = TABS.findIndex(t => t.id === tabId);
    const newDir = dir !== null ? dir : targetIdx > currentIdx ? 1 : -1;
    setSlideDirection(newDir);
    setActiveTab(tabId);
  };

  // Start fresh chat session cleanly without page reload
  const handleStartNewChat = async () => {
    if (isSending) return;
    setIsInitializing(true);
    try {
      const createRes = await apiClient.post('/api/v1/payai/sessions', {
        marketCode,
        destinationCountry
      });
      if (createRes.data?.success) {
        const newSession = createRes.data.session;
        setSessionId(newSession.id);
        // Store session ID under user-scoped key to prevent cross-user leaks
        const _userId = user?.id || user?._id || null;
        const _sessionKey = _userId ? `payai_session_id_${_userId}` : 'payai_session_id_guest';
        localStorage.setItem(_sessionKey, newSession.id);
        const msgs = createRes.data.messages || [];
        setMessages(msgs);
        setAttachedChatProduct(null);
        setActiveQuickChatSeller(null);

        const newEntry = {
          id: newSession.id,
          title: 'New Shopping Chat',
          timestamp: Date.now(),
          messageCount: msgs.length
        };
        setRecentSessions(prev => {
          const filtered = prev.filter(s => s.id !== newSession.id);
          const updated = [newEntry, ...filtered].slice(0, 30);
          saveStoredSessions(updated, _userId);
          return updated;
        });

        fetchCart(newSession.id);
        toast.success('Started a fresh shopping session!', { icon: '✨' });
        switchTab('chat');
      }
    } catch (err) {
      console.error('Failed to start new chat:', err);
      toast.error('Could not start new chat session.');
    } finally {
      setIsInitializing(false);
      if (typeof window !== 'undefined' && window.innerWidth < 1024) {
        setIsSidebarOpen(false);
      }
    }
  };

  // Switch to an existing session from history
  const handleSwitchSession = async (targetId) => {
    if (targetId === sessionId) {
      if (typeof window !== 'undefined' && window.innerWidth < 1024) setIsSidebarOpen(false);
      return;
    }
    setIsInitializing(true);
    try {
      const res = await apiClient.get(`/api/v1/payai/sessions/${targetId}`);
      if (res.data?.success && res.data.session) {
        setSessionId(res.data.session.id);
        setMarketCode(res.data.session.marketCode || 'INTERNATIONAL');
        setDestinationCountry(res.data.session.destinationCountry || 'NG');
        setMessages(res.data.session.messages || []);
        // Store under user-scoped key
        const _userId = user?.id || user?._id || null;
        const _sessionKey = _userId ? `payai_session_id_${_userId}` : 'payai_session_id_guest';
        localStorage.setItem(_sessionKey, res.data.session.id);
        setAttachedChatProduct(null);
        setActiveQuickChatSeller(null);
        fetchCart(res.data.session.id);
        switchTab('chat');
      }
    } catch (err) {
      console.error('Failed to switch session:', err);
      toast.error('Session expired or unavailable.');
      setRecentSessions(prev => {
        const updated = prev.filter(s => s.id !== targetId);
        const _uid2 = user?.id || user?._id || null;
        saveStoredSessions(updated, _uid2);
        return updated;
      });
    } finally {
      setIsInitializing(false);
      if (typeof window !== 'undefined' && window.innerWidth < 1024) {
        setIsSidebarOpen(false);
      }
    }
  };

  // Delete session from history
  const handleDeleteSession = (targetId, e) => {
    e.stopPropagation();
    setRecentSessions(prev => {
      const updated = prev.filter(s => s.id !== targetId);
      const _uid3 = user?.id || user?._id || null;
      saveStoredSessions(updated, _uid3);
      return updated;
    });
    if (targetId === sessionId) {
      handleStartNewChat();
    }
    toast.success('Chat removed from history');
  };

  // Clear all recent session history
  const handleClearAllSessions = () => {
    const _uid4 = user?.id || user?._id || null;
    setRecentSessions([]);
    saveStoredSessions([], _uid4);
    handleStartNewChat();
  };

  // Format local price helper based on destination currency & guaranteed rate
  const formatLocalPrice = (amount, currencyOrDest = destinationCountry, destCode = destinationCountry) => {
    if (!amount && amount !== 0) return '₦0';
    const num = Number(amount) || 0;
    const curr = (typeof currencyOrDest === 'string' ? currencyOrDest : '').toUpperCase();

    // If price is explicitly in Naira (or passed currency is NGN), DO NOT multiply by 1480!
    if (curr === 'NGN' || curr === '₦' || curr === 'NAIRA') {
      return `₦${Math.round(num).toLocaleString()}`;
    }

    if (curr === 'GHS' || curr === 'GH₵') return `GH₵${num.toFixed(2)}`;
    if (curr === 'KES') return `KSh${Math.round(num).toLocaleString()}`;
    if (curr === 'GBP' || curr === '£') return `£${num.toFixed(2)}`;

    // If destination code (e.g. 'NG', 'GH', 'KE') is passed or USD
    const dest = DESTINATIONS.find(d => d.code === currencyOrDest) || DESTINATIONS.find(d => d.code === destCode) || DESTINATIONS[0];

    // Guard against accidental double conversion if the amount is already in Naira magnitude (>= 500) and target is NGN
    if (dest.currency === 'NGN' && num >= 500 && curr !== 'USD') {
      return `₦${Math.round(num).toLocaleString()}`;
    }

    const converted = num * (dest.rate || 1);
    if (dest.currency === 'NGN') return `₦${Math.round(converted).toLocaleString()}`;
    if (dest.currency === 'GHS') return `GH₵${converted.toFixed(2)}`;
    if (dest.currency === 'KES') return `KSh${converted.toLocaleString(undefined, { maximumFractionDigits: 0 })}`;
    if (dest.currency === 'GBP') return `£${converted.toFixed(2)}`;
    return `$${converted.toFixed(2)}`;
  };

  // Touch Swipe Handlers
  const handleTouchStart = (e) => {
    touchStartX.current = e.touches[0].clientX;
    touchStartY.current = e.touches[0].clientY;
  };

  const handleTouchEnd = (e) => {
    if (quickViewItem) return;
    if (touchStartX.current === null || touchStartY.current === null) return;
    const deltaX = e.changedTouches[0].clientX - touchStartX.current;
    const deltaY = e.changedTouches[0].clientY - touchStartY.current;

    if (Math.abs(deltaX) > Math.abs(deltaY) && Math.abs(deltaX) > 60) {
      const currentIdx = TABS.findIndex(t => t.id === activeTab);
      if (deltaX < 0 && currentIdx < TABS.length - 1) {
        switchTab(TABS[currentIdx + 1].id, 1);
      } else if (deltaX > 0 && currentIdx > 0) {
        switchTab(TABS[currentIdx - 1].id, -1);
      }
    }
    touchStartX.current = null;
    touchStartY.current = null;
  };

  // 1. Initialize PayAI Session & Cart — scoped per logged-in user
  useEffect(() => {
    async function initSession() {
      setIsInitializing(true);
      try {
        // Scope the session key to the logged-in user so different users
        // on the same browser never share sessions.
        const userId = user?.id || user?._id || null;
        const SESSION_KEY = userId ? `payai_session_id_${userId}` : 'payai_session_id_guest';
        const SESSIONS_KEY = userId ? `payai_recent_sessions_v1_${userId}` : 'payai_recent_sessions_v1_guest';

        // Load user-scoped recent sessions list immediately so sidebar is correct
        try {
          const storedSessionsRaw = localStorage.getItem(SESSIONS_KEY);
          if (storedSessionsRaw) {
            const storedSessions = JSON.parse(storedSessionsRaw);
            if (Array.isArray(storedSessions)) {
              setRecentSessions(storedSessions);
            }
          }
        } catch (_) {}

        // Remove any stale generic key to prevent cross-user leaks
        if (userId) {
          const genericStored = localStorage.getItem('payai_session_id');
          if (genericStored) {
            // Only clear it if it belongs to a different user — we'll never
            // know for sure, so always migrate: copy to user-scoped key if
            // user-scoped key is empty, then remove the generic one.
            if (!localStorage.getItem(SESSION_KEY)) {
              localStorage.setItem(SESSION_KEY, genericStored);
            }
            localStorage.removeItem('payai_session_id');
          }
        }

        const storedSessionId = localStorage.getItem(SESSION_KEY);
        let currentSessionId = storedSessionId;

        if (storedSessionId) {
          try {
            const res = await apiClient.get(`/api/v1/payai/sessions/${storedSessionId}`);
            if (res.data?.success && res.data.session) {
              // Validate session belongs to this user (if logged in)
              const sessionUserId = res.data.session.userId;
              if (userId && sessionUserId && sessionUserId !== userId) {
                // Session belongs to a different user — discard it
                localStorage.removeItem(SESSION_KEY);
                currentSessionId = null;
              } else {
                setSessionId(res.data.session.id);
                setMarketCode(res.data.session.marketCode || 'INTERNATIONAL');
                setDestinationCountry(res.data.session.destinationCountry || 'NG');
                setMessages(res.data.session.messages || []);
                currentSessionId = res.data.session.id;

                // Ensure stored in recentSessions
                setRecentSessions(prev => {
                  const exists = prev.some(s => s.id === currentSessionId);
                  if (!exists) {
                    const entry = {
                      id: currentSessionId,
                      title: 'Active Shopping Chat',
                      timestamp: Date.now(),
                      messageCount: res.data.session.messages?.length || 1
                    };
                    const updated = [entry, ...prev].slice(0, 30);
                    try { localStorage.setItem(SESSIONS_KEY, JSON.stringify(updated)); } catch (_) {}
                    return updated;
                  }
                  return prev;
                });
              }
            }
          } catch (e) {
            localStorage.removeItem(SESSION_KEY);
            currentSessionId = null;
          }
        }

        if (!currentSessionId) {
          const createRes = await apiClient.post('/api/v1/payai/sessions', {
            marketCode,
            destinationCountry
          });
          if (createRes.data?.success) {
            const newSession = createRes.data.session;
            setSessionId(newSession.id);
            localStorage.setItem(SESSION_KEY, newSession.id);
            const msgs = createRes.data.messages || [];
            setMessages(msgs);
            currentSessionId = newSession.id;

            // Add new session to recentSessions
            setRecentSessions(prev => {
              const entry = {
                id: newSession.id,
                title: 'New Shopping Chat',
                timestamp: Date.now(),
                messageCount: msgs.length
              };
              const filtered = prev.filter(s => s.id !== newSession.id);
              const updated = [entry, ...filtered].slice(0, 30);
              try { localStorage.setItem(SESSIONS_KEY, JSON.stringify(updated)); } catch (_) {}
              return updated;
            });
          }
        }

        // Fetch Cart
        fetchCart(currentSessionId);
      } catch (err) {
        console.error('PayAI Session Init Failed:', err);
      } finally {
        setIsInitializing(false);
      }
    }

    initSession();
    fetchAppCart();
    fetchCatalogOffers('', 'all', 'all');
    fetchDiscoverableStores();
  }, [user?.id, user?._id]);

  // Fetch Discoverable External Seller Stores
  const fetchDiscoverableStores = async () => {
    setIsLoadingExternalStores(true);
    try {
      const res = await apiClient.get('/api/v1/payai/global-store/discover-stores');
      if (res.data?.success && Array.isArray(res.data.stores)) {
        setDiscoverableStores(res.data.stores);
      }
    } catch (err) {
      console.debug('Failed to fetch discoverable external stores:', err);
    } finally {
      setIsLoadingExternalStores(false);
    }
  };

  // Fetch Cart from Backend
  const fetchCart = async (sId = sessionId) => {
    try {
      const res = await apiClient.get('/api/v1/payai/cart', {
        params: { sessionId: sId || undefined }
      });
      if (res.data?.success && res.data.cart) {
        setCart(res.data.cart);
      }
    } catch (err) {
      console.debug('PayAI Cart fetch notice:', err.message);
    }
  };

  // Fetch Live Orders & Shipments for Tracking Tab
  const fetchShipments = useCallback(async () => {
    setLoadingShipments(true);
    try {
      const currentUserId = user?.id || user?._id;
      const res = await apiClient.get('/api/v1/payai/orders', {
        params: {
          userId: currentUserId || undefined,
          sessionId: sessionId || undefined
        }
      });
      if (res.data?.success && Array.isArray(res.data.orders)) {
        if (res.data.orders.length > 0) {
          setShipments(res.data.orders);
        } else {
          setShipments(INITIAL_SHIPMENTS);
        }
      }
    } catch (err) {
      console.warn('PayAI Shipments fetch notice:', err.message);
    } finally {
      setLoadingShipments(false);
    }
  }, [user?.id, sessionId]);

  // Load Shipments on mount and tab switch
  useEffect(() => {
    fetchShipments();
  }, [fetchShipments]);

  useEffect(() => {
    if (activeTab === 'tracking') {
      fetchShipments();
    }
  }, [activeTab, fetchShipments]);

  // Fetch Catalog Offers for Discover Tab
  const fetchCatalogOffers = async (query = '', provider = selectedStore, category = selectedCategory) => {
    setIsSearchingCatalog(true);
    try {
      const payload = {
        marketCode,
        destinationCountry,
        query: query.trim() || undefined,
        provider: provider !== 'all' ? provider : undefined,
        category: category !== 'all' ? category : undefined,
        limit: 24
      };
      const res = await apiClient.post('/api/v1/catalog/search', payload);
      if (res.data?.success && res.data.items) {
        setDiscoverItems(res.data.items);
      }
    } catch (err) {
      console.error('Catalog search error:', err);
    } finally {
      setIsSearchingCatalog(false);
    }
  };

  // Fetch Recommendations when Quick View Item is opened
  useEffect(() => {
    if (!quickViewItem) {
      setQuickViewRecommendations([]);
      return;
    }

    let isSubscribed = true;
    setLoadingQuickViewRecommendations(true);

    const fetchQuickViewRecommendations = async () => {
      try {
        const itemId = quickViewItem.id || quickViewItem._id;
        const providerLower = (quickViewItem.provider || '').toLowerCase();
        const isExternal = ['amazon', 'aliexpress', 'ebay', 'asos'].includes(providerLower);

        // 1. Try bundle endpoint if it's a native product with valid ID
        if (itemId && !isExternal) {
          try {
            const bundleRes = await apiClient.get(`/api/v1/products/${itemId}/bundle`);
            if (bundleRes.data?.success && bundleRes.data?.bundle) {
              const b = bundleRes.data.bundle;
              const combined = [
                ...(b.recommended || []),
                ...(b.similar || []),
                ...(b.peopleAlsoBought || []),
                ...(b.alternatives || [])
              ].filter(p => (p.id || p._id) !== itemId);

              const unique = [];
              const seen = new Set();
              for (const p of combined) {
                const pid = p.id || p._id;
                if (pid && !seen.has(pid)) {
                  seen.add(pid);
                  unique.push(p);
                }
              }

              if (unique.length > 0 && isSubscribed) {
                setQuickViewRecommendations(unique.slice(0, 6));
                setLoadingQuickViewRecommendations(false);
                return;
              }
            }
          } catch (e) {
            // Bundle error, continue to general recommendations
          }
        }

        // 2. Fetch general / personalized recommendations
        try {
          const recRes = await apiClient.get('/api/v1/products/recommendations?limit=8');
          if (recRes.data?.success && Array.isArray(recRes.data?.recommendations) && recRes.data.recommendations.length > 0) {
            const filtered = recRes.data.recommendations.filter(p => (p.id || p._id) !== itemId);
            if (filtered.length > 0 && isSubscribed) {
              setQuickViewRecommendations(filtered.slice(0, 6));
              setLoadingQuickViewRecommendations(false);
              return;
            }
          }
        } catch (e) {
          // Continue to discoverItems fallback
        }

        // 3. Fallback to discoverItems or products
        if (discoverItems && discoverItems.length > 0) {
          const categoryMatches = discoverItems.filter(p => {
            if ((p.id || p._id) === itemId) return false;
            if (quickViewItem.category && p.category && p.category.toLowerCase() === quickViewItem.category.toLowerCase()) return true;
            return false;
          });
          const otherItems = discoverItems.filter(p => (p.id || p._id) !== itemId && !categoryMatches.includes(p));
          const fallbackList = [...categoryMatches, ...otherItems].slice(0, 6);
          if (isSubscribed) {
            setQuickViewRecommendations(fallbackList);
            setLoadingQuickViewRecommendations(false);
            return;
          }
        }

        if (isSubscribed) {
          setQuickViewRecommendations([]);
          setLoadingQuickViewRecommendations(false);
        }
      } catch (err) {
        console.warn('Failed to load preview recommendations:', err);
        if (isSubscribed) {
          if (discoverItems && discoverItems.length > 0) {
            setQuickViewRecommendations(discoverItems.filter(p => (p.id || p._id) !== (quickViewItem?.id || quickViewItem?._id)).slice(0, 6));
          }
          setLoadingQuickViewRecommendations(false);
        }
      }
    };

    fetchQuickViewRecommendations();

    return () => {
      isSubscribed = false;
    };
  }, [quickViewItem?.id, quickViewItem?._id, quickViewItem?.title]);

  // Scroll chat to bottom on new message
  useEffect(() => {
    if (chatScrollRef.current) {
      chatScrollRef.current.scrollTop = chatScrollRef.current.scrollHeight;
    }
  }, [messages, isSending, isSellerTyping]);

  // Real-Time Socket Connection: Listen for Seller Typing, Presence Changes, and Live Replies
  useEffect(() => {
    const socket = getSocket();
    const currentUserId = user?.id || user?._id;

    if (currentUserId) {
      identifyUser(currentUserId);
    }

    const handleUserTyping = (data) => {
      const activeSeller = activeQuickChatSellerRef.current;
      if (activeSeller && String(data?.userId) === String(activeSeller.sellerId)) {
        setIsSellerTyping(true);
      }
    };

    const handleUserStopTyping = (data) => {
      const activeSeller = activeQuickChatSellerRef.current;
      if (activeSeller && String(data?.userId) === String(activeSeller.sellerId)) {
        setIsSellerTyping(false);
      }
    };

    const handleUserStatusChange = (data) => {
      const activeSeller = activeQuickChatSellerRef.current;
      if (activeSeller && String(data?.user) === String(activeSeller.sellerId)) {
        const isNowOnline = data.status === 'online';
        setActiveQuickChatSeller(prev => prev ? {
          ...prev,
          isOnline: isNowOnline,
          statusLabel: isNowOnline ? 'ONLINE NOW • Live Chat Active' : 'OFFLINE • Priority Inbox Notified',
          responseEta: isNowOnline ? 'Replies in ~1-2 mins' : 'Offline — will reply when back online'
        } : null);
        toast(isNowOnline ? `${activeSeller.storeName} is now online!` : `${activeSeller.storeName} is currently offline`, {
          icon: isNowOnline ? '🟢' : '⚪'
        });
      }
    };

    const handleReceiveMessage = (msg) => {
      const activeSeller = activeQuickChatSellerRef.current;
      const senderId = String(msg.senderId || msg.sender?.id || '');
      const activeSellerId = String(activeSeller?.sellerId || '');

      // Check if message originated from active seller
      if (activeSellerId && senderId === activeSellerId) {
        setIsSellerTyping(false);

        try {
          const audio = new Audio('/notification.wav');
          audio.play().catch(() => {});
        } catch (e) {}

        const storeName = activeSeller.storeName || msg.senderName || 'Seller';
        const currentProduct = activeSeller.productItem;
        const productTitle = currentProduct?.title || 'this product';

        // 1. Deliver the real seller message (NO fake placeholder!)
        const sellerReplyMsg = {
          id: `seller-reply-${Date.now()}`,
          role: 'assistant',
          isSellerReply: true,
          senderName: storeName,
          content: `💬 **${storeName} (Live Seller Reply):**\n"${msg.content || msg.text}"`,
          createdAt: new Date().toISOString()
        };

        // 2. AI assistant immediately responds to buyer after seller reply
        const aiAssistMsg = {
          id: `ai-followup-${Date.now() + 1}`,
          role: 'assistant',
          isSellerFollowUp: true,
          productItem: currentProduct,
          content: `🤖 **PayAI Assistant:** ${storeName} has replied regarding "${productTitle}". Would you like to proceed with checkout, make an offer, or pay directly with your escrow wallet?`,
          toolResults: currentProduct ? JSON.stringify({ items: [currentProduct] }) : null,
          createdAt: new Date(Date.now() + 100).toISOString()
        };

        setMessages(prev => [...prev, sellerReplyMsg, aiAssistMsg]);
        toast.success(`${storeName} replied!`, { icon: '💬' });
      }
    };

    const handleOrderEvent = (data) => {
      console.log('Realtime order event received in PayAI:', data);
      fetchShipments();
    };

    socket.on('userTyping', handleUserTyping);
    socket.on('userStopTyping', handleUserStopTyping);
    socket.on('user_status_change', handleUserStatusChange);
    socket.on('receiveMessage', handleReceiveMessage);
    socket.on('order:updated', handleOrderEvent);
    socket.on('order:status_changed', handleOrderEvent);

    return () => {
      socket.off('userTyping', handleUserTyping);
      socket.off('userStopTyping', handleUserStopTyping);
      socket.off('user_status_change', handleUserStatusChange);
      socket.off('receiveMessage', handleReceiveMessage);
      socket.off('order:updated', handleOrderEvent);
      socket.off('order:status_changed', handleOrderEvent);
    };
  }, [user?.id, fetchShipments]);

  // Send Message to PayAI Assistant with optional context parameters (e.g. productId, proposedPrice, actionType)
  const handleSendMessage = async (textToSend = inputText, extraParams = {}) => {
    const text = textToSend?.trim();
    // Use user-scoped session key to avoid reading another user's session
    const _uid = user?.id || user?._id || null;
    const _sk = _uid ? `payai_session_id_${_uid}` : 'payai_session_id_guest';
    const effectiveSessionId = sessionId || localStorage.getItem(_sk);
    if (!text || !effectiveSessionId || isSending) return;

    if (!sessionId) {
      setSessionId(effectiveSessionId);
    }

    setInputText('');
    const tempUserMsg = {
      id: `temp-${Date.now()}`,
      role: 'user',
      content: text,
      createdAt: new Date().toISOString()
    };
    setMessages(prev => [...prev, tempUserMsg]);
    setIsSending(true);

    // Update session title in recentSessions if it was generic
    setRecentSessions(prev => {
      const existing = prev.find(s => s.id === effectiveSessionId);
      const isDefault = !existing || existing.title === 'New Shopping Chat' || existing.title === 'Active Shopping Chat' || existing.title === 'Shopping Session';
      const cleanTitle = isDefault ? (text.length > 34 ? text.slice(0, 34) + '...' : text) : existing.title;
      const updatedEntry = {
        id: effectiveSessionId,
        title: cleanTitle,
        timestamp: Date.now(),
        messageCount: (existing?.messageCount || 1) + 1
      };
      const filtered = prev.filter(s => s.id !== effectiveSessionId);
      const updated = [updatedEntry, ...filtered].slice(0, 30);
      saveStoredSessions(updated, _uid);
      return updated;
    });

    try {
      const isMultiOrCombo = Boolean(extraParams.isCombo) ||
        /\s+(?:and|\+|\&|\band\s+also\b|\bplus\b|\bwith\b)\s+/i.test(text) ||
        text.toLowerCase().includes('combo') ||
        text.toLowerCase().includes('entire');

      const autoProductId = !isMultiOrCombo
        ? (extraParams.productId || attachedChatProduct?.id || attachedChatProduct?.productId || undefined)
        : undefined;

      const res = await apiClient.post(`/api/v1/payai/sessions/${effectiveSessionId}/messages`, {
        message: text,
        ...(autoProductId ? { productId: autoProductId } : {}),
        ...extraParams
      });

      if (res.data?.success && res.data.message) {
        setMessages(prev => {
          const filtered = prev.filter(m => m.id !== tempUserMsg.id);
          return [...filtered, tempUserMsg, res.data.message];
        });

        // Instantly refresh cart if item was added or tool executed
        fetchCart();
        if (res.data.toolCall?.toolName === 'add_to_cart' && res.data.toolCall.result?.success) {
          fetchAppCart();
          useCartStore.getState().fetchCart();
          const r = res.data.toolCall.result;
          const toastText = (r.isCombo || (r.items && r.items.length > 1))
            ? `Combo (${r.items?.length || 2} items) added to Cart!`
            : `"${r.item?.title || 'Item'}" added to Cart!`;
          toast.success(toastText, {
            action: {
              label: 'View Cart & Checkout',
              onClick: () => navigate('/cart')
            }
          });
        }
        if (res.data.toolCall?.toolName === 'plan_tastematch_basket' && res.data.toolCall.result) {
          if (!res.data.message.tasteMatchPlan) {
            res.data.message.tasteMatchPlan = res.data.toolCall.result;
          }
        }
        if (res.data.toolCall?.toolName === 'checkout_with_wallet' && res.data.toolCall.result?.success) {
          toast.success('Paid with W-Commerce Wallet! Funds locked in Escrow.');
          handleOrderCompleted(res.data.toolCall.result);
        }
      }
    } catch (err) {
      console.error('PayAI Message Error:', err);
      toast.error('PayAI assistant was unable to respond. Please try again.');
    } finally {
      setIsSending(false);
    }
  };

  // Add Item to existing Cart and navigate to Cart page if needed
  const handleAddToCart = async (item, directCheckout = false) => {
    const providerLower = (item.provider || '').toLowerCase();
    const isExternalStore = ['amazon', 'aliexpress', 'ebay', 'asos'].includes(providerLower) && !item.isImported;
    
    if (isExternalStore || item.isExternal === true || item.canAddToCart === false) {
      toast.error('Global store links are for reference only. Cart & checkout are exclusive to native W-Commerce products.');
      return;
    }

    const targetProductId = item.id || item.productId || item.externalOfferId;
    if (!targetProductId || targetProductId === 'wcom-order-item') {
      toast.error('Please select a specific verified product to add to cart.');
      return;
    }

    if (typeof targetProductId === 'string' && (targetProductId.startsWith('amz-') || targetProductId.startsWith('ali-') || targetProductId.startsWith('ebay-') || targetProductId.startsWith('asos-'))) {
      toast.error('Global store links are for reference only. Cart & checkout are exclusive to native W-Commerce products.');
      return;
    }

    // Guard against synthetic combo IDs — items already added by AI; just navigate to cart
    if (typeof targetProductId === 'string' && (targetProductId.startsWith('combo-') || targetProductId.startsWith('warehouse-') || targetProductId.startsWith('offline_item_'))) {
      if (directCheckout) {
        navigate('/cart');
      } else {
        toast.success('Your items are ready in cart!', { action: { label: 'View Cart', onClick: () => navigate('/cart') } });
      }
      return;
    }

    const qty = Number(item.quantity) || 1;

    try {
      // 1. Add directly to existing W-Commerce Cart via useCartStore
      await addToCart(targetProductId, qty);

      // 2. Also sync to PayAI session cart in background
      apiClient.post('/api/v1/payai/cart/items', {
        sessionId,
        item: {
          productId: targetProductId,
          provider: 'w-commerce',
          title: item.title,
          price: Number(item.price) || 0,
          currency: item.currency || 'NGN',
          quantity: qty,
          imageUrl: item.imageUrl,
          sellerName: item.seller?.name || item.sellerName || 'Verified W-Commerce Merchant'
        }
      }).then(res => {
        if (res.data?.success && res.data.cart) setCart(res.data.cart);
      }).catch(() => {});

      // Auto-apply promo code if this item has a negotiated deal code
      if (item.promoCode) {
        sessionStorage.setItem('auto_apply_promo', item.promoCode);
      }

      const cartTargetUrl = item.promoCode ? `/cart?promo=${encodeURIComponent(item.promoCode)}` : '/cart';

      if (directCheckout) {
        navigate(cartTargetUrl);
      } else {
        toast.success(`"${(item.title || 'Product').slice(0, 30)}..." added to Cart!${item.promoCode ? ` (Promo: ${item.promoCode})` : ''}`, {
          action: {
            label: 'View Cart & Checkout',
            onClick: () => navigate(cartTargetUrl)
          }
        });
      }
    } catch (err) {
      console.error('PayAI Cart Add Error:', err);
      toast.error(err.response?.data?.message || err.message || 'Failed to add item to cart');
    }
  };

  // Normalize any product/offer object into guaranteed { priceUSD, priceNGN, isExternal }
  const resolveOfferPrices = (offer) => {
    if (!offer) return { priceUSD: 0, priceNGN: 0, isExternal: false };
    const providerLower = (offer.provider || '').toLowerCase();
    const isExternal = ['amazon', 'aliexpress', 'ebay', 'asos'].includes(providerLower) || Boolean(offer.isExternal);
    if (offer._normalizedPrices && offer.priceNGN && offer.priceUSD) {
      return {
        priceUSD: Number(Number(offer.priceUSD).toFixed(2)),
        priceNGN: Math.round(Number(offer.priceNGN)),
        isExternal
      };
    }
    const rawPrice = Number(offer.price) || 0;
    const isPricedInNGN =
      offer.currency === 'NGN' ||
      (!isExternal && rawPrice >= 500 && offer.currency !== 'USD_NORMALIZED');

    const priceNGN = offer.priceNGN && Number(offer.priceNGN) < 5000000
      ? Math.round(Number(offer.priceNGN))
      : isPricedInNGN
      ? Math.round(rawPrice)
      : Math.round(rawPrice * 1480);

    const priceUSD = offer.priceUSD
      ? Number(Number(offer.priceUSD).toFixed(2))
      : isPricedInNGN
      ? Number((rawPrice / 1480).toFixed(2))
      : Number(rawPrice.toFixed(2));

    return { priceUSD, priceNGN, isExternal };
  };

  // Direct Private AI Panel Negotiation (Zero Popups - Seamless In-Chat AI Sales Rep)
  const handleOpenNegotiate = (offer) => {
    const { priceUSD, priceNGN, isExternal } = resolveOfferPrices(offer);
    if (isExternal) {
      toast.error('Price negotiation is exclusively supported for native W-Commerce sellers. External store items are fixed-price reference only.');
      return;
    }

    const normalizedOffer = {
      ...offer,
      price: priceUSD,
      priceUSD,
      priceNGN,
      currency: 'USD_NORMALIZED',
      _normalizedPrices: true,
      sellerName: offer.seller?.name || offer.sellerName || 'Verified W-Commerce Merchant'
    };

    setAttachedChatProduct(normalizedOffer);

    // Switch to AI Shopper chat tab if currently on another tab
    if (activeTab !== 'chat') {
      switchTab('chat', -1);
    }

    const offerId = normalizedOffer.id || normalizedOffer.productId || normalizedOffer.externalOfferId || normalizedOffer.externalProductId;
    const negotiationPrompt = `I would like to negotiate the price for "${normalizedOffer.title}" (Listed at ₦${priceNGN.toLocaleString()} NGN / $${priceUSD.toFixed(2)} USD). What is the seller's best price or available discount?`;

    toast.success(`Opening private AI negotiation for "${normalizedOffer.title.slice(0, 24)}..."`);

    handleSendMessage(negotiationPrompt, {
      productId: offerId,
      actionType: 'START',
      quantity: 1
    });
  };

  // Apply Negotiation Result to Product Card and State
  const handleApplyNegotiation = (negotiationResult) => {
    const offerId = negotiationResult.offer?.id || negotiationResult.offer?.externalProductId || negotiationResult.offer?.externalOfferId || negotiationResult.productId;
    if (offerId) {
      setNegotiationStatusMap(prev => ({
        ...prev,
        [offerId]: {
          status: negotiationResult.status || (negotiationResult.accepted ? 'accepted' : 'counter'),
          newPrice: negotiationResult.newPrice || negotiationResult.currentOfferUnitPrice,
          originalPrice: negotiationResult.originalPrice,
          savings: negotiationResult.savings,
          sellerNote: negotiationResult.reply || negotiationResult.sellerNote
        }
      }));
    }

    // Add to cart at negotiated price
    if (negotiationResult.offer) {
      handleAddToCart({
        ...negotiationResult.offer,
        price: negotiationResult.newPrice || negotiationResult.currentOfferUnitPrice,
        promoCode: negotiationResult.promoCode || negotiationResult.offerId
      });
    }
  };

  // 1-Click Add Product to Chat
  const handleAddProductToChat = (item) => {
    const { priceUSD, priceNGN } = resolveOfferPrices(item);
    setAttachedChatProduct({
      ...item,
      price: priceUSD,
      priceUSD,
      priceNGN,
      currency: 'USD_NORMALIZED',
      _normalizedPrices: true,
      sellerName: item.seller?.name || item.sellerName || 'Verified W-Commerce Merchant'
    });
    if (activeTab !== 'chat') {
      switchTab('chat', -1);
    }
    toast.success(`"${item.title.slice(0, 28)}..." attached to chat! Add an optional message or pick an action.`);
  };

  // Seamless TasteMatch & Negotiate Entry from Product Details Bridge
  useEffect(() => {
    const action = searchParams.get('action');
    const productId = searchParams.get('productId');
    const rawTitle = searchParams.get('title') || 'Product';
    const rawPrice = Number(searchParams.get('price')) || 0;
    const rawCategory = searchParams.get('category') || '';
    const rawImage = searchParams.get('image') || '';

    if (action === 'tastematch' && productId) {
      if (activeTab !== 'chat') {
        setActiveTab('chat');
      }

      const decodedTitle = decodeURIComponent(rawTitle);
      const decodedCategory = decodeURIComponent(rawCategory);
      const decodedImage = rawImage ? decodeURIComponent(rawImage) : '';

      // Attach immediately to chat context if not already attached
      if (!attachedChatProduct || (attachedChatProduct.id !== productId && attachedChatProduct.productId !== productId)) {
        const { priceUSD, priceNGN } = resolveOfferPrices({
          id: productId,
          productId,
          title: decodedTitle,
          price: rawPrice,
          currency: 'NGN',
          imageUrl: decodedImage
        });

        const initialProduct = {
          id: productId,
          productId,
          title: decodedTitle,
          price: priceUSD,
          priceUSD,
          priceNGN,
          category: decodedCategory,
          imageUrl: decodedImage,
          currency: 'USD_NORMALIZED',
          _normalizedPrices: true,
          isTasteMatch: true,
          sellerName: 'Verified W-Commerce Merchant'
        };

        setAttachedChatProduct(initialProduct);

        // Fetch complete product details in the background to enrich images/store
        apiClient.get(`/api/v1/products/${productId}`)
          .then(res => {
            if (res.data?.success && res.data.product) {
              const p = res.data.product;
              const pPrices = resolveOfferPrices(p);
              const pImg = p.images?.[0]?.url || decodedImage;
              setAttachedChatProduct(prev => ({
                ...(prev || initialProduct),
                ...p,
                id: productId,
                productId,
                title: p.title || decodedTitle,
                price: pPrices.priceUSD,
                priceUSD: pPrices.priceUSD,
                priceNGN: pPrices.priceNGN,
                imageUrl: pImg ? (pImg.startsWith('http') || pImg.startsWith('/') ? pImg : `/${pImg}`) : decodedImage,
                sellerName: p.store?.storeName || prev?.sellerName || 'Verified W-Commerce Merchant',
                isTasteMatch: true,
                _normalizedPrices: true
              }));
            }
          })
          .catch(e => console.debug('TasteMatch product enrichment notice:', e.message));
      }

      // Auto-trigger agentic TasteMatch prompt once session is active
      const promptText = `I'm checking out "${decodedTitle}". Can you find matching items for my vibe and negotiate the best deal within my budget?`;

      if (!isInitializing && sessionId && !tasteMatchHandledRef.current) {
        tasteMatchHandledRef.current = true;
        toast.success(`🧠 TasteMatch Activated for "${decodedTitle.slice(0, 22)}..."`, { icon: '✨', duration: 4000 });
        handleSendMessage(promptText, {
          productId,
          actionType: 'TASTEMATCH'
        });
      } else if (!tasteMatchHandledRef.current) {
        // Pre-populate input in case session initialization is pending
        setInputText(promptText);
      }
    }
  }, [searchParams, isInitializing, sessionId]);

  // Quick Chat Seller (checks if product owner is online & relays buyer message in real-time)
  const handleQuickChatSeller = async (productItem = attachedChatProduct, optionalMsg = inputText) => {
    if (!productItem || isQuickChattingSeller) return;
    setIsQuickChattingSeller(true);
    const { priceNGN } = resolveOfferPrices(productItem);
    const sellerName = productItem.seller?.name || productItem.sellerName || 'Seller A Official Store';
    const buyerText = optionalMsg?.trim() || `Hi ${sellerName}, are you online? I'm interested in "${productItem.title}".`;

    const userMsg = {
      id: `user-qchat-${Date.now()}`,
      role: 'user',
      content: `💬 **[Quick Chat to ${sellerName} • ${productItem.title}]**\n${buyerText}`,
      createdAt: new Date().toISOString()
    };
    setMessages(prev => [...prev, userMsg]);
    setInputText('');

    try {
      const res = await apiClient.post('/api/v1/payai/seller/quick-chat', {
        sessionId,
        sellerId: productItem.sellerId || productItem.seller?.id,
        storeName: sellerName,
        productId: productItem.id || productItem.externalProductId,
        productTitle: productItem.title,
        listPrice: priceNGN,
        currency: 'NGN',
        buyerMessage: buyerText
      });

      if (res.data?.success) {
        const sp = res.data.sellerPresence;

        // Save active seller for live socket typing, status changes, and real replies
        setActiveQuickChatSeller({
          sellerId: sp.sellerId,
          storeName: sp.storeName,
          sellerName: sp.sellerName,
          productId: productItem.id || productItem.externalProductId,
          productTitle: productItem.title,
          isOnline: sp.isOnline,
          statusLabel: sp.statusLabel,
          responseEta: sp.responseEta,
          productItem: productItem
        });

        // Truthful system status: NO fake instantSellerAck placeholder
        const aiBridgeMsg = {
          id: `ai-qchat-${Date.now()}`,
          role: 'assistant',
          content: sp.isOnline
            ? `🟢 **${sp.storeName} (${sp.statusLabel})**\n*${sp.responseEta}*\n\n📨 **Delivered in real-time to seller:** "${res.data.relayedMessage}"\n\n⏳ *Waiting for ${sp.storeName} to reply. You can see their typing status live below, and I will assist you the moment they reply.*`
            : `⚪ **${sp.storeName} (${sp.statusLabel})**\n*${sp.responseEta}*\n\n📨 **Delivered to seller priority inbox:** "${res.data.relayedMessage}"\n\n📌 *The seller is currently offline. They will receive an instant notification when they return online, and you will be alerted here when they reply.*`,
          toolResults: JSON.stringify({ items: [productItem] }),
          createdAt: new Date().toISOString()
        };
        setMessages(prev => [...prev, aiBridgeMsg]);

        if (sp.isOnline) {
          toast.success(`${sp.storeName} is online! Message delivered in real time.`);
        } else {
          toast(`${sp.storeName} is offline. Delivered to priority inbox.`, { icon: '⚪' });
        }
      }
    } catch (err) {
      toast.error('Could not reach seller quick chat');
    } finally {
      setIsQuickChattingSeller(false);
    }
  };

  // Direct 1-Click Wallet Checkout from Chat or Negotiation -> routes to unified /cart page
  const handleDirectWalletCheckout = async ({ offer, quantity = 1, promoCode }) => {
    const targetUrl = promoCode ? `/cart?promo=${encodeURIComponent(promoCode)}` : '/cart';

    if (!offer) {
      navigate(targetUrl);
      return;
    }

    const offerId = offer.id || offer.productId || '';
    const isComboId = typeof offerId === 'string' && (
      offerId.startsWith('combo-') ||
      offerId.startsWith('warehouse-') ||
      offerId.startsWith('offline_item_') ||
      offerId === 'wcom-order-item'
    );

    // If it's a combo or already-added item (synthetic ID), skip re-adding — just go to cart
    if (isComboId || !offerId) {
      navigate(targetUrl);
      return;
    }

    // Real product ID — add to cart then navigate
    await handleAddToCart({ ...offer, quantity, promoCode: promoCode || offer.promoCode }, true);
  };

  // Handle action clicks originating from chat messages or action buttons
  const handleChatAction = ({ label, url }) => {
    // Helper to find a product in recent message toolResults by title substring
    const findOfferByTitle = (titleQuery) => {
      if (!titleQuery) return null;
      const cleanQ = titleQuery.toLowerCase().replace(/[^a-z0-9]/g, ' ').trim();
      const tokens = cleanQ.split(/\s+/).filter(t => t.length >= 3);
      for (let i = messages.length - 1; i >= 0; i--) {
        const offers = getToolOffers(messages[i]);
        for (const o of offers) {
          const oTitle = (o.title || '').toLowerCase();
          if (cleanQ && oTitle.includes(cleanQ)) return o;
          if (tokens.length > 0 && tokens.every(tok => oTitle.includes(tok))) return o;
        }
      }
      return null;
    };

    // 0. Instant 1-Click Prompt Execution
    if (url && url.startsWith('prompt:')) {
      const promptText = decodeURIComponent(url.slice(7)).trim();
      if (!promptText) return;

      const lowerPrompt = promptText.toLowerCase();

      // Check if this is an "add to cart" prompt
      if (lowerPrompt.includes('add') && lowerPrompt.includes('cart')) {
        const isMultiItem = /\s+(?:and|\+|\&|\band\s+also\b|\bplus\b|\bwith\b)\s+/i.test(promptText) ||
          lowerPrompt.includes('combo') ||
          lowerPrompt.includes('entire') ||
          lowerPrompt.includes('all items');

        if (isMultiItem) {
          handleSendMessage(promptText, { actionType: 'ADD_TO_CART', isCombo: true });
          return;
        }

        const extractedTitle = promptText
          .replace(/^add\s+/i, '')
          .replace(/\s+(?:to|in|into)\s+(?:my\s+)?cart.*$/i, '')
          .trim();
        const matchedOffer = findOfferByTitle(extractedTitle);
        const extraParams = {
          actionType: 'ADD_TO_CART'
        };
        if (matchedOffer?.id) {
          extraParams.productId = matchedOffer.id;
        }
        handleSendMessage(promptText, extraParams);
        return;
      }

      // Check if this is a "negotiate / discount" prompt
      if (lowerPrompt.includes('discount') || lowerPrompt.includes('negotiat')) {
        const extractedTitle = promptText
          .replace(/^(?:can\s+i\s+get\s+a\s+discount\s+on|can\s+you\s+give\s+me\s+a\s+discount\s+on|negotiate\s+price\s+for|negotiate)\s+/i, '')
          .replace(/\?*$/g, '')
          .trim();
        const matchedOffer = findOfferByTitle(extractedTitle);
        const extraParams = {
          actionType: 'REQUEST_SELLER_NEGOTIATION'
        };
        if (matchedOffer?.id) {
          extraParams.productId = matchedOffer.id;
        }
        handleSendMessage(promptText, extraParams);
        return;
      }

      // General prompt execution
      handleSendMessage(promptText);
      return;
    }

    const lower = (label || '').toLowerCase();

    // 1. Extract amount from label or message if present
    const ngnMatch = (label || '').match(/₦\s*([0-9,]+)/i);
    const usdMatch = (label || '').match(/\$\s*([0-9,.]+)/i);
    let extractedNGN = ngnMatch ? parseInt(ngnMatch[1].replace(/,/g, ''), 10) : null;
    let extractedUSD = usdMatch ? parseFloat(usdMatch[1].replace(/,/g, '')) : null;

    // 2. Locate active product or offer context from recent messages
    let targetOffer = attachedChatProduct || {
      id: 'wcom-order-item',
      title: 'W-Commerce Escrow Order',
      sellerName: 'Verified Merchant'
    };

    for (let i = messages.length - 1; i >= 0; i--) {
      const m = messages[i];
      const cartData = getToolCartData(m);
      if (cartData) {
        if (cartData.isCombo) {
          // For combos: items are already added to cart by the AI.
          // Use a sentinel that signals "go to cart directly" — not a real product ID.
          targetOffer = {
            id: null, // null signals handleDirectWalletCheckout to just navigate to /cart
            isCombo: true,
            title: `Combo: ${cartData.items.map(it => it.title).join(' + ')}`,
            sellerName: cartData.items[0]?.sellerName || cartData.items[0]?.storeName || 'Verified Merchant',
            imageUrl: cartData.items[0]?.imageUrl
          };
          if (!extractedNGN && cartData.totalNGN) {
            extractedNGN = cartData.totalNGN;
          }
        } else if (cartData.item) {
          const cartIt = cartData.item;
          targetOffer = {
            id: cartIt.id || cartIt.productId || targetOffer.id,
            productId: cartIt.productId || cartIt.id,
            title: cartIt.title,
            price: cartIt.price,
            currency: cartIt.currency || 'NGN',
            sellerName: cartIt.sellerName || cartIt.storeName || targetOffer.sellerName,
            imageUrl: cartIt.imageUrl
          };
          if (!extractedNGN && cartIt.price) {
            extractedNGN = Number(cartIt.price);
          }
        }
        break;
      }
      const deal = getNegotiationDeal(m);
      if (deal && (deal.productId || deal.productTitle)) {
        targetOffer = {
          id: deal.productId || targetOffer.id,
          title: deal.productTitle || targetOffer.title,
          sellerName: deal.storeName || targetOffer.sellerName
        };
        if (!extractedNGN && deal.currentOfferUnitPrice) {
          extractedNGN = deal.currency === 'NGN' ? Math.round(deal.currentOfferUnitPrice) : Math.round(deal.currentOfferUnitPrice * 1480);
        }
        break;
      }
      const guidance = getCheckoutGuidance(m);
      if (guidance) {
        if (!extractedNGN && guidance.amountNGN) extractedNGN = Number(guidance.amountNGN);
        if (guidance.productTitle) {
          targetOffer = {
            id: guidance.productId || targetOffer.id,
            productId: guidance.productId || targetOffer.id,
            title: guidance.productTitle,
            sellerName: guidance.storeName || targetOffer.sellerName,
            imageUrl: guidance.imageUrl || targetOffer.imageUrl
          };
        }
      }
      const offers = getToolOffers(m);
      if (offers && offers.length > 0) {
        targetOffer = {
          id: offers[0].id || offers[0].productId || targetOffer.id,
          productId: offers[0].productId || offers[0].id || targetOffer.id,
          title: offers[0].title || targetOffer.title,
          price: offers[0].price || targetOffer.price,
          currency: offers[0].currency || targetOffer.currency || 'NGN',
          provider: offers[0].provider || 'w-commerce',
          isExternal: Boolean(offers[0].isExternal),
          sellerName: offers[0].seller?.name || offers[0].sellerName || targetOffer.sellerName,
          imageUrl: offers[0].imageUrl || offers[0].images?.[0]?.url
        };
        if (!extractedNGN && offers[0].price) {
          const p = Number(offers[0].price);
          extractedNGN = offers[0].currency === 'NGN' ? p : Math.round(p * 1480);
        }
        break;
      }
      const boldTitleMatch = m.content?.match(/\*\*([A-Za-z0-9\s-]{3,40})\*\*/);
      if (boldTitleMatch && targetOffer.title === 'W-Commerce Escrow Order') {
        targetOffer.title = boldTitleMatch[1];
      }
    }

    // Default fallback amount if none found in label or messages
    const finalNGN = extractedNGN || (cart?.items?.length > 0 ? Math.round(cart.items.reduce((s, it) => s + (Number(it.price) * (it.quantity || 1)), 0) * 1480) : 18000);
    const finalUSD = extractedUSD || Number((finalNGN / 1480).toFixed(2));

    // Handle Add to Cart action
    if (lower.includes('add to cart') || lower.includes('add to my cart')) {
      if (targetOffer && targetOffer.id && targetOffer.id !== 'wcom-order-item') {
        handleAddToCart(targetOffer);
        return;
      }
      if (targetOffer?.title && targetOffer.title !== 'W-Commerce Escrow Order') {
        handleSendMessage(`Add ${targetOffer.title} to my cart`, { actionType: 'ADD_TO_CART' });
        return;
      }
      handleSendMessage('Add this product to my cart', { actionType: 'ADD_TO_CART' });
      return;
    }

    // Handle Negotiate / Discount action
    if (lower.includes('negotiat') || lower.includes('discount') || url === '/negotiate') {
      const prodName = targetOffer?.title && targetOffer.title !== 'W-Commerce Escrow Order'
        ? targetOffer.title
        : null;
      const negPrompt = prodName ? `Can I get a discount on ${prodName}?` : 'Can I negotiate a discount on this product?';
      handleSendMessage(negPrompt, {
        productId: targetOffer?.productId || (targetOffer?.id !== 'wcom-order-item' ? targetOffer?.id : undefined),
        actionType: 'REQUEST_SELLER_NEGOTIATION'
      });
      return;
    }

    // Handle Direct Wallet Checkout
    if (lower.includes('wallet') || lower.includes('deduction') || lower.includes('confirm & pay') || lower.includes('confirm and pay')) {
      handleDirectWalletCheckout({
        offer: targetOffer,
        totalNGN: finalNGN,
        totalUSD: finalUSD,
        quantity: 1,
        optionalBuyerMessage: `PayAI 1-Click Checkout: ${label}`
      });
      return;
    }

    // Handle Live Tracking navigation & Deep queries
    if (
      url?.startsWith('track:') ||
      (url && (url.startsWith('/orders/') || url === '/tracking')) ||
      lower.startsWith('track') ||
      lower.includes('track my order') ||
      lower.includes('view order tracking') ||
      lower.includes('live tracking')
    ) {
      let targetCode = '';
      if (url?.startsWith('track:')) {
        targetCode = decodeURIComponent(url.slice(6)).trim();
      } else if (url && url.startsWith('/orders/')) {
        targetCode = decodeURIComponent(url.slice(8)).trim();
      } else {
        const matched = label?.match(/(?:W-[A-Z0-9-]+|GIGL-[A-Z0-9-]+|DHL-[A-Z0-9-]+|[0-9a-f]{8}-[0-9a-f]{4})/i)?.[0];
        targetCode = matched || '';
      }
      if (targetCode) {
        setTrackingSearchCode(targetCode);
      }
      switchTab('tracking', 1);
      return;
    }

    // Handle PayPal Checkout trigger
    if (lower.includes('paypal') || lower.includes('pay pal')) {
      const defaultNGN = 18000;
      const defaultUSD = Number((defaultNGN / 1480).toFixed(2));
      handleProceedToCheckout({
        total: defaultUSD,
        totalNGN: defaultNGN,
        productTitle: 'W-Commerce Order',
        storeName: 'Verified Merchant',
        items: cart?.items || []
      });
      return;
    }

    // Handle Cart / Checkout navigation
    if (lower.includes('checkout') || lower.includes('proceed') || lower.includes('pay') || lower.includes('view cart') || url === '/cart' || url === '/checkout') {
      navigate('/cart');
      return;
    }

    // Handle External / Internal URLs
    if (url && url !== '#' && !url.startsWith('#')) {
      if (url.startsWith('http://') || url.startsWith('https://')) {
        window.open(url, '_blank', 'noopener,noreferrer');
      } else if (url.startsWith('/')) {
        navigate(url);
      }
    }
  };

  // Handle "Ask PayAI" from Live Tracking tab
  const handleAskAIAboutOrder = (order) => {
    if (!order) return;
    switchTab('chat', -1);
    const trackingPrompt = `Where is my order ${order.orderNumber || order.trackingNumber}? Can you provide the latest tracking status, carrier checkpoints, and estimated delivery?`;
    handleSendMessage(trackingPrompt);
  };

  // Proceed to Cart Drawer / PayPal Checkout Modal
  const handleProceedToCheckout = (quoteData = null) => {
    if (quoteData) {
      const totalNGN = Number(quoteData.totalNGN || quoteData.amountNGN || 0);
      const totalUSD = Number(quoteData.total || quoteData.totalLandedUSD || quoteData.amountUSD || (totalNGN > 0 ? (totalNGN / 1480).toFixed(2) : 12.16));
      const resolvedItems = (quoteData.items && quoteData.items.length > 0)
        ? quoteData.items
        : (cart?.items && cart.items.length > 0)
          ? cart.items
          : [{
              title: quoteData.productTitle || quoteData.title || 'W-Commerce Order',
              price: totalUSD,
              quantity: 1,
              imageUrl: quoteData.imageUrl || FALLBACK_PACKAGE_BOX_IMG
            }];
      setCheckoutQuote({
        ...quoteData,
        sessionId: quoteData.sessionId || sessionId,
        total: totalUSD,
        totalNGN: totalNGN > 0 ? totalNGN : Math.round(totalUSD * 1480),
        items: resolvedItems,
        imageUrl: quoteData.imageUrl || resolvedItems[0]?.imageUrl || FALLBACK_PACKAGE_BOX_IMG
      });
      setIsCartDrawerOpen(false);
      setIsPayPalModalOpen(true);
    } else {
      setIsCartDrawerOpen(true);
    }
  };

  // Order Completed via PayPal or Wallet
  const handleOrderCompleted = (completedOrder, options = {}) => {
    const keepModalOpen = options?.keepModalOpen === true;
    if (!keepModalOpen) {
      setIsPayPalModalOpen(false);
      setIsCartDrawerOpen(false);
    }

    // 1. Immediately clear cart in local state and global store
    setCart(prev => ({ ...prev, items: [] }));
    try {
      const cartStore = useCartStore?.getState?.();
      if (cartStore?.clearCart) cartStore.clearCart();
    } catch (_) {}
    fetchCart();
    fetchAppCart && fetchAppCart();
    refreshWalletStore && refreshWalletStore();

    if (!completedOrder) return;

    const orderAmt = Number(completedOrder?.grandTotal || completedOrder?.amount || checkoutQuote?.total || 12.16);
    const orderNum = completedOrder?.orderNumber || `W-INT-${Date.now().toString().slice(-6)}`;
    const trackNum = completedOrder?.trackingNumber || `DHL-EXP-${Math.floor(10000000 + Math.random() * 90000000)}`;
    const payoutNgn = completedOrder?.sellerPayoutNGN || completedOrder?.sellerPayoutNgn || Math.round(orderAmt * 1480);
    const carrier = completedOrder?.carrier || 'DHL Express International';
    const itemTitle = completedOrder?.itemTitle || checkoutQuote?.productTitle || 'W-Commerce PayAI Verified Order';

    // 2. Add Official AI Purchase Receipt into the Chat
    const receiptContent = completedOrder?.receiptMessage?.content || (
      `🧾 **Official Purchase Receipt & Escrow Guarantee**\n\n` +
      `Thank you! Your payment via **PayPal** has been verified and securely locked in the W-Commerce Escrow Vault.\n\n` +
      `📦 **Order Summary:**\n` +
      `- **Order Number:** \`${orderNum}\`\n` +
      `- **Payment Method:** PayPal (USD)\n` +
      `- **Amount Paid:** **$${orderAmt.toFixed(2)} USD**\n` +
      `- **Seller Payout:** **₦${Number(payoutNgn).toLocaleString()} NGN** (Exchange rate: 1480 NGN/USD)\n` +
      `- **Escrow Status:** **PAID_IN_ESCROW** (100% Buyer Protection active) 🛡️\n` +
      `- **Fulfillment Status:** **CONFIRMED & QUEUED FOR DISPATCH** ⚡\n` +
      `- **Carrier:** **${carrier}**\n` +
      `- **Tracking Number:** \`${trackNum}\`\n\n` +
      `Funds will remain safely locked in escrow until you confirm delivery of your package. You can track this delivery anytime in the **Live Tracking** tab or ask me: *"Track order ${orderNum}"*!`
    );

    setMessages(prev => {
      const alreadyHas = prev.some(m => m.content?.includes(orderNum));
      if (alreadyHas) return prev;
      return [
        ...prev,
        {
          id: completedOrder?.receiptMessage?.id || `receipt-${Date.now()}`,
          role: 'assistant',
          content: receiptContent,
          toolResults: {
            isReceipt: true,
            orderNumber: orderNum,
            orderId: completedOrder?.orderId,
            trackingNumber: trackNum,
            carrier,
            amountUSD: orderAmt,
            sellerPayoutNGN: payoutNgn,
            exchangeRate: 1480,
            fulfillmentStatus: 'CONFIRMED & QUEUED FOR DISPATCH',
            paymentMethod: 'PayPal (USD)',
            itemTitle
          },
          createdAt: new Date().toISOString()
        }
      ];
    });

    // 3. Update Shipments / Tracking
    setShipments(prev => [
      {
        id: completedOrder?.orderId || `ord-${Date.now()}`,
        orderNumber: orderNum,
        trackingNumber: trackNum,
        carrier,
        status: 'PAID',
        fulfillmentStatus: 'CONFIRMED',
        itemTitle,
        origin: 'Lagos Mainland Fulfillment Vault • Bay 4',
        destination: `${DESTINATIONS.find(d => d.code === destinationCountry)?.name || 'Lagos, Nigeria'}`,
        eta: 'In 2-4 Business Days',
        grandTotal: orderAmt,
        sellerPayoutNGN: payoutNgn,
        checkpoints: [
          { status: 'PAID', label: 'Payment verified & escrow held', timestamp: new Date().toISOString() },
          { status: 'CONFIRMED', label: 'Order confirmed and queued for fulfillment', timestamp: new Date().toISOString() }
        ]
      },
      ...prev.filter(s => s.orderNumber !== orderNum)
    ]);

    if (options?.switchTab) {
      switchTab('tracking', 1);
    }
  };

  // Helper: Parse Tool Result Offers from AI message
  const getToolOffers = (message) => {
    if (!message?.toolResults) return [];
    try {
      const parsed = typeof message.toolResults === 'string' ? JSON.parse(message.toolResults) : message.toolResults;
      if (Array.isArray(parsed?.items) && parsed.items.length > 0) return parsed.items;
      if (parsed?.product) return [parsed.product];
      if (Array.isArray(parsed?.products) && parsed.products.length > 0) return parsed.products;
      if (parsed?.offer) return [parsed.offer];
      return [];
    } catch (e) {
      return [];
    }
  };

  // Helper: Parse Negotiation Deal from AI message tool results
  const getNegotiationDeal = (message) => {
    if (!message?.toolResults) return null;
    try {
      const parsed = typeof message.toolResults === 'string' ? JSON.parse(message.toolResults) : message.toolResults;
      if (
        parsed && (
          parsed.authorizedRuleCode ||
          parsed.currentOfferUnitPrice !== undefined ||
          parsed.bundleOption ||
          parsed.accepted !== undefined ||
          parsed.rejected !== undefined ||
          parsed.isNegotiable !== undefined
        )
      ) {
        return parsed;
      }
      return null;
    } catch (e) {
      return null;
    }
  };

  // Helper: Parse Warehouse Inspection from AI message or tool results
  const getWarehouseInspection = (message) => {
    if (!message) return null;
    if (message.warehouseInspection) return message.warehouseInspection;
    if (message.toolResults) {
      try {
        const parsed = typeof message.toolResults === 'string' ? JSON.parse(message.toolResults) : message.toolResults;
        if (parsed?.warehouseInspection) return parsed.warehouseInspection;
        if (parsed?.result?.warehouseInspection) return parsed.result.warehouseInspection;
        if (parsed?.photos && parsed?.voiceNote) return parsed;
      } catch (e) {
        return null;
      }
    }
    return null;
  };

  // Helper: Parse Added Cart Items / Combo Data from AI message tool results
  // Helper: Parse TasteMatch Plan & Basket from AI message or tool results
  const getTasteMatchPlan = (message) => {
    if (!message) return null;
    if (message.tasteMatchPlan) return message.tasteMatchPlan;
    if (message.toolResults) {
      try {
        const parsed = typeof message.toolResults === 'string' ? JSON.parse(message.toolResults) : message.toolResults;
        if (parsed?.plan_tastematch_basket) return parsed.plan_tastematch_basket;
        if (parsed?.tasteMatchPlan) return parsed.tasteMatchPlan;
        if (parsed?.taste_match_plan) return parsed.taste_match_plan;
        if (parsed?.tool === 'plan_tastematch_basket') return parsed.result || parsed.data || parsed;
        if (parsed?.action === 'TASTEMATCH_PLAN' || parsed?.isTasteMatch) return parsed;
        if (parsed?.budgetLimit && (parsed?.days || parsed?.schedule || parsed?.items)) return parsed;
      } catch (e) {
        // continue
      }
    }
    if (typeof message.content === 'string' && message.role !== 'user') {
      const c = message.content;
      if (
        c.includes('TasteMatch™ Plan') ||
        c.includes('TasteMatch Plan') ||
        (c.includes('TasteMatch') && (c.includes('Budget') || c.includes('Basket') || c.includes('6,000') || c.includes('5,400')))
      ) {
        return {
          budgetLimit: 6000,
          totalPrice: 5400,
          currency: 'NGN',
          tasteTags: ['🌶️ Spicy Palate', '🍲 Suya / Peppered Variety', '⚡ Comfort Dining']
        };
      }
    }
    return null;
  };

  const getToolCartData = (message) => {
    if (!message) return null;
    if (message.toolResults) {
      try {
        const parsed = typeof message.toolResults === 'string' ? JSON.parse(message.toolResults) : message.toolResults;
        if (parsed?.action === 'CART_UPDATED' || parsed?.isCombo || parsed?.isPlanBulk || (parsed?.cart && (parsed?.items || parsed?.item))) {
          const rawItems = Array.isArray(parsed.items) && parsed.items.length > 0
            ? parsed.items
            : (parsed.item ? [parsed.item] : []);
          if (rawItems.length > 0) {
            const isCombo = Boolean(parsed.isCombo || parsed.isPlanBulk || rawItems.length > 1);
            const totalNGN = rawItems.reduce((sum, it) => sum + (Number(it.price || 0) * (it.quantity || 1)), 0);
            return {
              isCombo,
              items: rawItems,
              item: parsed.item || rawItems[0],
              totalNGN,
              totalUSD: Number((totalNGN / 1480).toFixed(2))
            };
          }
        }
      } catch (e) {
        return null;
      }
    }
    return null;
  };

  // Helper: Parse Added Cart Item from AI message tool results
  const getToolCartItem = (message) => {
    if (!message) return null;
    if (message.toolResults) {
      try {
        const parsed = typeof message.toolResults === 'string' ? JSON.parse(message.toolResults) : message.toolResults;
        if (parsed?.action === 'CART_UPDATED' && parsed?.item) return parsed.item;
        if (parsed?.item && (parsed?.success || parsed?.cart)) return parsed.item;
      } catch (e) {
        return null;
      }
    }
    return null;
  };

  // Helper: Parse Checkout Guidance from AI message tool results
  const getCheckoutGuidance = (message) => {
    if (!message) return null;
    if (message.toolResults) {
      try {
        const parsed = typeof message.toolResults === 'string' ? JSON.parse(message.toolResults) : message.toolResults;
        if (parsed?.checkoutReady) return parsed;
      } catch (e) {
        return null;
      }
    }
    return null;
  };

  // Helper: Parse Wallet Balance Inquiry from AI message tool results or content
  const getWalletInquiryData = (message) => {
    if (!message) return null;
    if (message.toolResults) {
      try {
        const parsed = typeof message.toolResults === 'string' ? JSON.parse(message.toolResults) : message.toolResults;
        if (parsed?.walletBalance) return parsed.walletBalance;
      } catch (e) {
        // continue
      }
    }
    if (typeof message.content === 'string' && (/Available\s+Balance/i.test(message.content) || /Your\s+W-Commerce\s+Wallet\s+Balance/i.test(message.content))) {
      const ngnMatch = message.content.match(/₦\s*([0-9,]+)/i);
      const usdMatch = message.content.match(/\$\s*([0-9.]+)/i);
      const balanceNGN = ngnMatch ? parseInt(ngnMatch[1].replace(/,/g, ''), 10) : 250000;
      const balanceUSD = usdMatch ? parseFloat(usdMatch[1]) : Number((balanceNGN / 1480).toFixed(2));
      return {
        balanceNGN,
        balanceUSD,
        escrowProtected: true,
        walletUrl: '/buyer/wallet'
      };
    }
    return null;
  };

  // Helper: Audio Playback for Warehouse Inspection Voice Notes
  const handlePlayVoiceNote = (voiceNoteId, transcriptText) => {
    if (isPlayingVoiceNote && activeVoiceNoteId === voiceNoteId) {
      if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
        window.speechSynthesis.cancel();
      }
      setIsPlayingVoiceNote(false);
      setActiveVoiceNoteId(null);
      return;
    }

    setActiveVoiceNoteId(voiceNoteId);
    if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
      window.speechSynthesis.cancel();
      const utter = new SpeechSynthesisUtterance(transcriptText);
      utter.rate = 1.02;
      utter.onstart = () => setIsPlayingVoiceNote(true);
      utter.onend = () => {
        setIsPlayingVoiceNote(false);
        setActiveVoiceNoteId(null);
      };
      utter.onerror = () => {
        setIsPlayingVoiceNote(false);
        setActiveVoiceNoteId(null);
      };
      window.speechSynthesis.speak(utter);
    } else {
      setIsPlayingVoiceNote(true);
      toast.success('Playing Seller Warehouse Voice Note...');
      setTimeout(() => {
        setIsPlayingVoiceNote(false);
        setActiveVoiceNoteId(null);
      }, 5000);
    }
  };

  return (
    <div 
      className="w-full h-[calc(100vh-4rem)] flex flex-row overflow-hidden relative bg-[var(--bg-primary)] text-[var(--text-main)] p-0 gap-0 hide-scrollbar"
      onTouchStart={handleTouchStart}
      onTouchEnd={handleTouchEnd}
    >
      {/* Mobile Backdrop Overlay when sidebar is open */}
      <AnimatePresence>
        {isSidebarOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            onClick={() => setIsSidebarOpen(false)}
            className="fixed inset-0 z-40 bg-black/40 backdrop-blur-xs lg:hidden"
          />
        )}
      </AnimatePresence>

      {/* LEFT SIDEBAR: Seller-Dashboard Neumorphic Studio Sidebar */}
      <aside
        className={`
          flex flex-col shrink-0 z-50 transition-all duration-300 ease-in-out
          fixed lg:relative top-16 lg:top-0 bottom-0 left-0 lg:inset-auto h-[calc(100vh-4rem)] lg:h-full
          ${isSidebarOpen 
            ? 'w-72 translate-x-0 shadow-2xl lg:shadow-none' 
            : '-translate-x-[110%] lg:translate-x-0 lg:w-0 lg:overflow-hidden'
          }
        `}
      >
        <div className="w-72 h-full neu-panel rounded-none p-4 sm:p-5 flex flex-col min-h-0 overflow-hidden border-r border-t-0 border-b-0 border-l-0 border-[var(--border-color)] bg-[var(--bg-primary)]">
          {/* 1. Seller-Dashboard Style Identity Header Card */}
          <div className="flex w-full items-center justify-between pb-4 mb-4 border-b border-[var(--border-color)] relative shrink-0">
            <div className="flex items-center gap-3 min-w-0">
              <div className="w-10 h-10 rounded-xl bg-[#006cff]/10 text-[#006cff] border border-[#006cff]/20 shadow-xs flex items-center justify-center shrink-0">
                <Sparkles size={18} />
              </div>
              <div className="flex flex-col min-w-0">
                <div className="flex items-center gap-1.5">
                  <h3 className="font-black text-[var(--text-main)] tracking-tight text-sm truncate">PayAI Studio</h3>
                  <span className="text-[9px] font-black px-1.5 py-0.5 rounded-md bg-[#006cff]/10 text-[#006cff] border border-[#006cff]/20 leading-none">
                    3.0
                  </span>
                </div>
                <p className="text-[11px] text-[var(--text-muted)] flex items-center gap-1.5 mt-0.5 font-medium truncate">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse shrink-0" />
                  <span className="truncate">Escrow Engine Online</span>
                </p>
              </div>
            </div>

            <button
              onClick={() => setIsSidebarOpen(false)}
              className="p-2 rounded-xl neu-button text-[var(--text-main)] hover:text-[#006cff] transition-all cursor-pointer shrink-0 ml-2"
              title="Close sidebar"
              aria-label="Close sidebar"
            >
              <PanelLeftClose size={15} className="hidden lg:block" />
              <X size={15} className="lg:hidden" />
            </button>
          </div>

          {/* New Shopping Chat Capsule Action */}
          <div className="px-2 mb-4 shrink-0">
            <button
              onClick={handleStartNewChat}
              disabled={isInitializing}
              className="w-full h-10 px-4 rounded-xl bg-[#006cff] hover:bg-[#0056cc] text-white text-xs font-bold flex items-center justify-between shadow-[0_4px_14px_rgba(0,108,255,0.35)] hover:scale-[1.02] active:scale-[0.98] transition-all cursor-pointer"
            >
              <div className="flex items-center gap-2.5">
                <Plus size={15} />
                <span>New Shopping Chat</span>
              </div>
              <Sparkles size={13} />
            </button>
          </div>

          {/* 2. Seller-Dashboard Capsule Navigation Buttons */}
          <div className="px-2 pb-3 flex flex-col gap-[10px] shrink-0">
            <span className="px-2 text-[10px] font-extrabold uppercase tracking-wider text-[var(--text-muted)]">
              Workspace Modes
            </span>

            <button
              onClick={() => { switchTab('chat'); if (typeof window !== 'undefined' && window.innerWidth < 1024) setIsSidebarOpen(false); }}
              className={`w-full h-10 px-4 flex items-center justify-between rounded-xl neu-input hover:scale-[1.02] active:scale-[0.98] transition-all cursor-pointer ${
                activeTab === 'chat'
                  ? 'text-[#008cff] font-bold !shadow-[inset_4px_4px_8px_rgba(0,140,255,0.12),_inset_-4px_-4px_8px_rgba(0,140,255,0.2)]'
                  : 'text-[var(--text-main)] font-medium'
              }`}
            >
              <div className="flex items-center gap-3">
                <Sparkles
                  size={15}
                  className={activeTab === 'chat' ? 'text-[#008cff]' : 'text-[#006cff]'}
                  style={{ filter: activeTab === 'chat' ? 'drop-shadow(0 0 3px rgba(0,140,255,0.65))' : 'none' }}
                />
                <span className="text-xs">AI Shopper Chat</span>
              </div>
              <span className="w-2 h-2 rounded-full bg-emerald-500" />
            </button>

            <button
              onClick={() => { switchTab('discover'); if (typeof window !== 'undefined' && window.innerWidth < 1024) setIsSidebarOpen(false); }}
              className={`w-full h-10 px-4 flex items-center justify-between rounded-xl neu-input hover:scale-[1.02] active:scale-[0.98] transition-all cursor-pointer ${
                activeTab === 'discover'
                  ? 'text-[#008cff] font-bold !shadow-[inset_4px_4px_8px_rgba(0,140,255,0.12),_inset_-4px_-4px_8px_rgba(0,140,255,0.2)]'
                  : 'text-[var(--text-main)] font-medium'
              }`}
            >
              <div className="flex items-center gap-3">
                <Globe size={15} className={activeTab === 'discover' ? 'text-[#008cff]' : 'text-purple-500'} />
                <span className="text-xs">Global Deals & Catalog</span>
              </div>
              <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-purple-500/10 text-purple-600 dark:text-purple-400">
                Deals
              </span>
            </button>

            <button
              onClick={() => { switchTab('tracking'); if (typeof window !== 'undefined' && window.innerWidth < 1024) setIsSidebarOpen(false); }}
              className={`w-full h-10 px-4 flex items-center justify-between rounded-xl neu-input hover:scale-[1.02] active:scale-[0.98] transition-all cursor-pointer ${
                activeTab === 'tracking'
                  ? 'text-[#008cff] font-bold !shadow-[inset_4px_4px_8px_rgba(0,140,255,0.12),_inset_-4px_-4px_8px_rgba(0,140,255,0.2)]'
                  : 'text-[var(--text-main)] font-medium'
              }`}
            >
              <div className="flex items-center gap-3">
                <Plane size={15} className={activeTab === 'tracking' ? 'text-[#008cff]' : 'text-orange-500'} />
                <span className="text-xs">Live Package Tracking</span>
              </div>
              <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-orange-500/10 text-orange-600 dark:text-orange-400">
                {shipments.length}
              </span>
            </button>
          </div>

          {/* 3. Quick Shortcuts (Cart & Wallet Capsules) */}
          <div className="px-2 pb-3 flex flex-col gap-[10px] shrink-0">
            <span className="px-2 text-[10px] font-extrabold uppercase tracking-wider text-[var(--text-muted)]">
              Quick Shortcuts
            </span>

            <button
              onClick={() => setIsCartDrawerOpen(true)}
              className="w-full h-10 px-4 flex items-center justify-between rounded-xl neu-input hover:scale-[1.02] active:scale-[0.98] transition-all cursor-pointer text-[var(--text-main)] font-medium"
            >
              <div className="flex items-center gap-3">
                <ShoppingBag size={15} className="text-emerald-500" />
                <span className="text-xs">Shopping Cart</span>
              </div>
              <span className="px-2 py-0.5 rounded-full bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 font-bold text-[10px]">
                {cart?.items?.length || cartItems?.length || 0}
              </span>
            </button>

            <button
              onClick={() => navigate('/buyer/wallet')}
              className="w-full h-10 px-4 flex items-center justify-between rounded-xl neu-input hover:scale-[1.02] active:scale-[0.98] transition-all cursor-pointer text-[#e6a51a] font-semibold"
            >
              <div className="flex items-center gap-3">
                <Wallet size={15} className="text-[#e6a51a]" />
                <span className="text-xs">Escrow Wallet</span>
              </div>
              <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-amber-500/15 text-amber-600 dark:text-amber-400">
                Safe
              </span>
            </button>
          </div>

          {/* 4. Recent Chat Sessions History */}
          <div className="flex-1 overflow-y-auto hide-scrollbar px-2 py-2 space-y-2 min-h-0 border-t border-[var(--border-color)]">
            <div className="flex items-center justify-between px-2 pt-1">
              <span className="text-[10px] font-extrabold uppercase tracking-wider text-[var(--text-muted)]">
                Recent Chats
              </span>
              {recentSessions.length > 0 && (
                <button
                  onClick={handleClearAllSessions}
                  className="text-[10px] font-bold text-rose-500 hover:underline cursor-pointer"
                  title="Clear recent chat history"
                >
                  Clear
                </button>
              )}
            </div>

            {recentSessions.length === 0 ? (
              <div className="p-3 rounded-xl neu-card-pressed text-center text-xs text-[var(--text-muted)]">
                <p className="font-semibold">No previous chats</p>
                <p className="text-[10px] mt-0.5">Ask PayAI anything to begin</p>
              </div>
            ) : (
              recentSessions.map((s) => {
                const isActive = s.id === sessionId;
                return (
                  <div
                    key={s.id}
                    onClick={() => handleSwitchSession(s.id)}
                    className={`group relative w-full h-9 px-3.5 rounded-xl text-xs flex items-center justify-between transition-all cursor-pointer ${
                      isActive
                        ? 'neu-input text-[#008cff] font-bold !shadow-[inset_3px_3px_6px_rgba(0,140,255,0.12),_inset_-3px_-3px_6px_rgba(0,140,255,0.2)]'
                        : 'hover:bg-white/50 dark:hover:bg-white/5 text-[var(--text-muted)] hover:text-[var(--text-main)] font-medium'
                    }`}
                  >
                    <div className="flex items-center gap-2.5 min-w-0 pr-6">
                      <MessageSquare size={13} className={isActive ? 'text-[#008cff] shrink-0' : 'text-[var(--text-muted)] shrink-0'} />
                      <span className="truncate text-xs">{s.title || 'Shopping Conversation'}</span>
                    </div>
                    <button
                      onClick={(e) => handleDeleteSession(s.id, e)}
                      className="absolute right-2 opacity-0 group-hover:opacity-100 hover:text-rose-500 p-1 rounded-md transition-all cursor-pointer text-[var(--text-muted)]"
                      title="Delete chat session"
                    >
                      <Trash2 size={12} />
                    </button>
                  </div>
                );
              })
            )}
          </div>

          {/* 5. Footer: Destination Hub & Escrow Status Capsules */}
          <div className="pt-3 mt-2 border-t border-[var(--border-color)] shrink-0 space-y-2 px-1">
            <div className="h-9 px-3.5 rounded-xl neu-input flex items-center justify-between gap-2">
              <div className="flex items-center gap-2 min-w-0">
                <Plane size={13} className="text-[#006cff] shrink-0" />
                <span className="text-[11px] font-semibold text-[var(--text-muted)] shrink-0">Hub:</span>
                <select
                  value={destinationCountry}
                  onChange={(e) => setDestinationCountry(e.target.value)}
                  className="bg-transparent font-bold outline-none cursor-pointer truncate text-xs text-[var(--text-main)]"
                >
                  {DESTINATIONS.map((d) => (
                    <option key={d.code} value={d.code} className="bg-white dark:bg-zinc-900">
                      {d.flag} {d.name}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div className="flex items-center justify-between text-[11px] px-3.5 py-2 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-700 dark:text-emerald-400 font-bold">
              <div className="flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                <span>1 USD = ₦1,480</span>
              </div>
              <span className="text-[10px] flex items-center gap-1">
                <ShieldCheck size={12} /> Escrow
              </span>
            </div>
          </div>
        </div>
      </aside>

      {/* RIGHT MAIN WORKSPACE: Elevated Studio Panel + ChatGPT Flow */}
      <main className="flex-1 flex flex-col h-full min-w-0 overflow-hidden relative rounded-none border-0 bg-white dark:bg-[#1c1c1e] hide-scrollbar">
        {/* Top Studio Header Bar (Seller-Dashboard Spacing & Color System) */}
        <div className="h-16 px-3 sm:px-6 lg:px-8 border-b border-gray-200/70 dark:border-white/[0.07] bg-[var(--bg-primary)]/70 backdrop-blur-md flex items-center justify-between gap-3 sm:gap-4 lg:gap-6 shrink-0 z-10">
          {/* Left: Sidebar Toggle & Studio Badge */}
          <div className="flex items-center gap-2.5 sm:gap-3 min-w-0 flex-1 max-w-[40%] sm:max-w-none overflow-hidden">
            <button
              onClick={() => setIsSidebarOpen(!isSidebarOpen)}
              className="p-2.5 rounded-xl neu-button text-[var(--text-main)] hover:text-[#006cff] transition-all cursor-pointer shrink-0"
              title={isSidebarOpen ? "Collapse sidebar" : "Open sidebar"}
              aria-label="Toggle sidebar"
            >
              <PanelLeft size={17} />
            </button>

            <div className="flex items-center gap-2.5 min-w-0 overflow-hidden">
              <div className="hidden xl:inline-flex items-center gap-1.5 px-3 py-1 bg-[#006cff]/10 border border-[#006cff]/20 rounded-full text-[#006cff] text-[11px] font-extrabold uppercase tracking-wider shrink-0">
                <Sparkles size={12} /> Live AI Studio
              </div>
              <h1 className="font-black text-sm sm:text-base lg:text-lg tracking-tight truncate text-[var(--text-main)] min-w-0">
                {activeTab === 'chat' && 'PayAI Shopping Assistant'}
                {activeTab === 'discover' && 'Global Deals & Verified Catalog'}
                {activeTab === 'tracking' && '7-Stage Package Tracking'}
              </h1>
            </div>
          </div>

          {/* Center: Seller-Dashboard Neumorphic Segmented Pill Switcher */}
          <div className="neu-card-pressed p-1 sm:p-1.5 rounded-2xl flex items-center gap-1 shrink-0 mx-1 sm:mx-3">
            {TABS.map((tab) => {
              const Icon = tab.icon;
              const isActive = activeTab === tab.id;
              const iconColor =
                tab.id === 'chat' ? 'text-[#006cff]' :
                tab.id === 'discover' ? 'text-purple-500' : 'text-orange-500';
              return (
                <button
                  key={tab.id}
                  onClick={() => switchTab(tab.id)}
                  title={tab.label}
                  aria-label={tab.label}
                  className={`relative py-1.5 px-2.5 sm:px-3.5 lg:px-4 rounded-xl flex items-center gap-1.5 sm:gap-2 transition-all duration-200 cursor-pointer text-xs shrink-0 select-none ${
                    isActive 
                      ? 'text-[#006cff] font-extrabold' 
                      : 'text-[var(--text-muted)] hover:text-[var(--text-main)] font-semibold'
                  }`}
                >
                  {isActive && (
                    <motion.div
                      layoutId="payai-active-tab-indicator"
                      className="absolute inset-0 bg-[var(--bg-primary)] rounded-xl shadow-[3px_3px_7px_rgba(163,177,198,0.45),-3px_-3px_7px_rgba(255,255,255,0.9)] dark:shadow-md border border-white/70 dark:border-white/10"
                      transition={{ type: 'spring', stiffness: 400, damping: 32 }}
                    />
                  )}
                  
                  <span className="relative z-10 flex items-center gap-1.5">
                    <Icon size={14} className={isActive ? 'text-[#006cff]' : iconColor} />
                    <span className={isActive ? 'inline font-extrabold' : 'hidden md:inline'}>{tab.label}</span>
                    {tab.badge !== null && (
                      <span 
                        className={`text-[10px] min-w-[18px] h-[18px] px-1.5 rounded-full font-extrabold flex items-center justify-center ${
                          isActive 
                            ? 'bg-[#006cff] text-white' 
                            : 'bg-black/[0.06] dark:bg-white/[0.1] text-[var(--text-main)]'
                        }`}
                      >
                        {tab.badge}
                      </span>
                    )}
                  </span>
                </button>
              );
            })}
          </div>

          {/* Right: Tactile Neumorphic Actions */}
          <div className="flex items-center gap-2 sm:gap-2.5 shrink-0">
            <button
              onClick={() => setIsCartDrawerOpen(true)}
              className="relative p-2.5 rounded-xl neu-button text-[var(--text-main)] hover:text-emerald-600 transition-all cursor-pointer shrink-0"
              title="Shopping Cart & PayPal Checkout"
            >
              <ShoppingBag size={17} className="text-emerald-500" />
              {(cart?.items?.length > 0 || cartItems?.length > 0) && (
                <span className="absolute -top-1 -right-1 min-w-[18px] h-[18px] px-1 rounded-full bg-emerald-600 text-white text-[10px] font-black flex items-center justify-center shadow-sm">
                  {cart?.items?.length || cartItems?.length}
                </span>
              )}
            </button>

            {activeTab === 'chat' && (
              <button
                onClick={handleStartNewChat}
                className="px-3 sm:px-3.5 py-2 rounded-xl neu-button text-xs font-bold flex items-center gap-1.5 cursor-pointer text-[var(--text-main)] hover:text-[#006cff] transition-all shrink-0"
                title="Start fresh conversation"
              >
                <Plus size={14} className="text-[#006cff]" />
                <span className="hidden sm:inline">New Chat</span>
              </button>
            )}
          </div>
        </div>

        {/* Main Tab Content */}
        <div className="flex-1 h-full min-h-0 relative overflow-hidden hide-scrollbar">
          <AnimatePresence mode="wait" custom={slideDirection}>
            {/* TAB 1: AI SHOPPER CONVERSATIONAL CHAT */}
            {activeTab === 'chat' && (
              <motion.div
                key="chat-tab"
                custom={slideDirection}
                initial={{ x: slideDirection > 0 ? 50 : -50, opacity: 0 }}
                animate={{ x: 0, opacity: 1 }}
                exit={{ x: slideDirection < 0 ? 50 : -50, opacity: 0 }}
                transition={{ duration: 0.2 }}
                className="h-full flex flex-col min-h-0 overflow-hidden w-full relative hide-scrollbar"
              >

              {/* Chat Message Scroll Area */}
              <div ref={chatScrollRef} className="flex-1 overflow-y-auto hide-scrollbar px-4 sm:px-8 py-6">
                <div className="max-w-4xl mx-auto w-full space-y-6">
                  {isInitializing ? (
                    <div className="h-64 flex flex-col items-center justify-center gap-3 text-[var(--text-muted)]">
                      <div className="p-4 rounded-2xl neu-card-pressed text-[#006cff]">
                        <RefreshCw size={24} className="animate-spin" />
                      </div>
                      <p className="text-xs font-bold uppercase tracking-wider">Initializing PayAI Studio...</p>
                    </div>
                  ) : (
                    <>
                      {/* Seller-Dashboard Inspired Welcome Hero + 4-Color KPI Action Cards */}
                      {messages.length <= 1 && (
                        <div className="space-y-6 pb-2">
                          {/* Top Hero Banner Card (matches Seller Dashboard AnalyticsView header) */}
                          <div className="neu-card p-6 sm:p-8 rounded-3xl flex flex-col md:flex-row justify-between items-start md:items-center gap-4 border border-white/60 dark:border-white/[0.06]">
                            <div>
                              <div className="inline-flex items-center gap-2 px-3 py-1 bg-[#006cff]/10 border border-[#006cff]/20 rounded-full text-[#006cff] text-xs font-bold uppercase tracking-wider mb-3">
                                <Sparkles size={14} /> Intelligent Buyer Concierge
                              </div>
                              <h2 className="text-2xl sm:text-4xl font-black text-[var(--text-main)] mb-2 tracking-tight">
                                How can PayAI help you shop today?
                              </h2>
                              <p className="text-[var(--text-muted)] text-xs sm:text-sm font-medium max-w-2xl">
                                Search verified W-Commerce stores, negotiate live discounts directly with sellers, or inspect real warehouse photos and voice notes before locking escrow.
                              </p>
                            </div>

                            <div className="flex items-center gap-2.5 shrink-0 flex-wrap">
                              <span className="px-3.5 py-2 rounded-xl neu-card-pressed text-emerald-600 dark:text-emerald-400 text-xs font-bold flex items-center gap-1.5">
                                <ShieldCheck size={15} className="text-emerald-500" /> 100% Escrow Safe
                              </span>
                            </div>
                          </div>

                          {/* 4-Card Seller-Dashboard Style Action Grid (Blue, Emerald, Orange, Purple) */}
                          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-5">
                            {[
                              {
                                label: 'TasteMatch AI',
                                title: 'TasteMatch Food Plan',
                                sub: '3-Day food basket under ₦6k',
                                badge: 'Qloo Taste',
                                icon: ShoppingBag,
                                color: 'text-amber-500',
                                prompt: 'Plan a 3-day food basket for me under ₦6,000 using TasteMatch AI based on spicy comfort palate'
                              },
                              {
                                label: 'Live AI Haggle',
                                title: 'Negotiate Deals',
                                sub: 'Unlock 5%–10% off instantly',
                                badge: '-10% Max',
                                icon: Tag,
                                color: 'text-emerald-500',
                                prompt: 'Show me negotiable products where I can make an offer to the seller'
                              },
                              {
                                label: 'Fulfillment QC',
                                title: 'Warehouse Proof',
                                sub: 'Live macro photos & voice note',
                                badge: 'Verified',
                                icon: Camera,
                                color: 'text-orange-500',
                                prompt: 'Show me live warehouse inspection photos and seller voice note for Gymshark Flagship Premier Edition'
                              },
                              {
                                label: 'Market Compare',
                                title: 'Top Tech & Gear',
                                sub: 'Compare W-Commerce vs Global',
                                badge: 'Live FX',
                                icon: Globe,
                                color: 'text-purple-500',
                                prompt: 'Find the best headphones and smartwatches available in stock'
                              }
                            ].map((card, i) => {
                              const CardIcon = card.icon;
                              return (
                                <button
                                  key={i}
                                  type="button"
                                  onClick={() => handleSendMessage(card.prompt)}
                                  className="neu-card p-5 rounded-3xl text-left transition-all duration-300 hover:-translate-y-1 flex flex-col justify-between cursor-pointer group border border-white/60 dark:border-white/[0.06]"
                                >
                                  <div className="flex items-center justify-between w-full mb-4">
                                    <div className={`p-3 rounded-xl neu-card-pressed ${card.color}`}>
                                      <CardIcon className="w-5 h-5" strokeWidth={2.2} />
                                    </div>
                                    <div className="flex items-center gap-1 text-[11px] font-bold text-[var(--text-main)] neu-card-pressed px-2.5 py-1 rounded-full">
                                      <span>{card.badge}</span>
                                    </div>
                                  </div>
                                  <div className="w-full">
                                    <p className="text-[var(--text-muted)] text-xs font-medium mb-0.5 truncate">{card.label}</p>
                                    <h3 className="text-base sm:text-lg font-black text-[var(--text-main)] group-hover:text-[#006cff] transition-colors tracking-tight truncate">
                                      {card.title}
                                    </h3>
                                    <p className="text-[11px] text-[var(--text-muted)] font-medium mt-1 truncate">{card.sub}</p>
                                  </div>
                                </button>
                              );
                            })}
                          </div>
                        </div>
                      )}

                      {messages.map((msg, idx) => {
                      const isUser = msg.role === 'user';
                      const offers = getToolOffers(msg);
                      const deal = getNegotiationDeal(msg);
                      const warehouseInsp = getWarehouseInspection(msg);
                      const tasteMatchPlan = getTasteMatchPlan(msg);
                      const cartData = getToolCartData(msg);
                      const cartItem = cartData?.item || getToolCartItem(msg);
                      const checkoutGuidance = getCheckoutGuidance(msg);
                      const walletInquiry = getWalletInquiryData(msg);
                      const receiptData = !isUser ? parseReceiptData(msg) : null;

                      return (
                        <motion.div
                          key={msg.id || idx}
                          initial={isUser ? { opacity: 0, y: 10 } : { opacity: 0, y: 20, scale: 0.97 }}
                          animate={{ opacity: 1, y: 0, scale: 1 }}
                          transition={{
                            type: 'spring',
                            stiffness: 300,
                            damping: 24,
                            mass: 0.85
                          }}
                          className={`flex gap-3.5 ${isUser ? 'justify-end' : 'justify-start'} max-w-full`}
                        >
                          {!isUser && (
                            <div className={`w-9 h-9 rounded-xl ${
                              msg.isSellerReply
                                ? 'bg-purple-600 text-white shadow-md'
                                : receiptData
                                ? 'neu-card text-emerald-500 border border-emerald-500/30'
                                : 'neu-card text-[#006cff] border border-white/70 dark:border-white/10'
                            } flex items-center justify-center shrink-0 mt-0.5`}>
                              {msg.isSellerReply ? <Store size={15} /> : receiptData ? <ShieldCheck size={16} /> : <Sparkles size={15} />}
                            </div>
                          )}

                          <div className={`${isUser ? 'max-w-[85%] sm:max-w-[74%] items-end' : 'flex-1 min-w-0 items-start'} flex flex-col`}>
                            {msg.isSellerReply && (
                              <div className="flex items-center gap-2 mb-1.5">
                                <span className="text-[10px] font-bold px-2.5 py-0.5 rounded-full bg-purple-500/10 text-purple-600 dark:text-purple-300 border border-purple-500/20 flex items-center gap-1">
                                  <Store size={10} /> Live Seller Reply
                                </span>
                                <span className="text-[10px] text-emerald-600 dark:text-emerald-400 font-bold flex items-center gap-1">
                                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                                  Real-Time
                                </span>
                              </div>
                            )}

                            <div
                              className={`text-xs sm:text-sm leading-relaxed relative overflow-hidden ${
                                isUser
                                  ? 'neu-card bg-[var(--bg-primary)] text-[var(--text-main)] font-medium px-5 py-3.5 rounded-3xl rounded-tr-lg border border-[#006cff]/20 shadow-sm'
                                  : msg.isSellerReply
                                  ? 'neu-card p-4 rounded-3xl border border-purple-500/25'
                                  : receiptData
                                  ? 'w-full'
                                  : 'neu-card p-4 sm:p-5 rounded-3xl rounded-tl-lg text-[var(--text-main)] w-full border border-white/60 dark:border-white/[0.06] shadow-sm'
                              }`}
                            >
                              {/* One-time Drop Flare Light Sweep when AI response lands */}
                              {!isUser && !receiptData && (
                                <motion.div
                                  initial={{ x: '-120%', opacity: 0.8 }}
                                  animate={{ x: '220%', opacity: 0 }}
                                  transition={{ duration: 1.4, ease: 'easeOut' }}
                                  className="absolute inset-0 pointer-events-none bg-gradient-to-r from-transparent via-blue-500/15 via-purple-500/15 dark:via-white/[0.08] to-transparent skew-x-12 z-10"
                                />
                              )}
                              {isUser ? (
                                <div className="whitespace-pre-wrap break-words">{msg.content}</div>
                              ) : receiptData ? (
                                <OfficialReceiptCard
                                  message={msg}
                                  onTrackOrder={(trackingCode, orderNumber) => {
                                    setTrackingSearchCode(trackingCode || orderNumber);
                                    switchTab('tracking', 1);
                                  }}
                                  onAskAI={(prompt) => {
                                    handleSendMessage(prompt);
                                  }}
                                />
                              ) : (
                                <MarkdownContent content={msg.content} onAction={handleChatAction} isSending={isSending} />
                              )}
                            </div>

                            {/* Follow-up Interactive Action Bar when Seller Replies */}
                            {msg.isSellerFollowUp && (
                              <div className="w-full mt-3.5 p-4 rounded-3xl neu-card border border-white/60 dark:border-white/[0.06] space-y-3">
                                <div className="flex items-center justify-between gap-2 flex-wrap">
                                  <span className="text-[11px] font-extrabold uppercase tracking-wider text-[#006cff] flex items-center gap-1.5">
                                    <Sparkles size={12} /> Next Steps
                                  </span>
                                  <span className="text-[11px] text-emerald-600 dark:text-emerald-400 font-bold flex items-center gap-1">
                                    <ShieldCheck size={12} /> Escrow Protected
                                  </span>
                                </div>
                                <div className="flex items-center gap-2.5 flex-wrap">
                                  <button
                                    type="button"
                                    onClick={() => {
                                      if (msg.productItem) {
                                        handleAddToCart(msg.productItem, true);
                                      } else {
                                        handleProceedToCheckout();
                                      }
                                    }}
                                    className="flex-1 min-w-[130px] py-2.5 px-4 rounded-xl bg-[#006cff] hover:bg-[#0056cc] text-white text-xs font-bold flex items-center justify-center gap-1.5 shadow-sm cursor-pointer transition-all"
                                  >
                                    <ShoppingBag size={13} />
                                    <span>Proceed to Checkout</span>
                                  </button>

                                  <button
                                    type="button"
                                    onClick={() => {
                                      const prod = msg.productItem || attachedChatProduct;
                                      if (prod) {
                                        const { priceUSD, priceNGN } = resolveOfferPrices(prod);
                                        handleDirectWalletCheckout({
                                          offer: prod,
                                          totalUSD: priceUSD,
                                          totalNGN: priceNGN,
                                          quantity: 1,
                                          optionalBuyerMessage: '1-Click Wallet Checkout after Seller Reply'
                                        });
                                      } else {
                                        handleChatAction({ label: 'Confirm & Pay from Wallet', url: '#' });
                                      }
                                    }}
                                    className="flex-1 min-w-[130px] py-2.5 px-4 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold flex items-center justify-center gap-1.5 shadow-sm cursor-pointer transition-all"
                                  >
                                    <Wallet size={13} />
                                    <span>Pay with Wallet</span>
                                  </button>

                                  <button
                                    type="button"
                                    onClick={() => {
                                      const sellerName = activeQuickChatSeller?.storeName || 'Seller';
                                      setInputText(`@${sellerName} `);
                                    }}
                                    className="py-2.5 px-4 rounded-xl neu-button text-[var(--text-main)] text-xs font-bold flex items-center justify-center gap-1.5 cursor-pointer transition-all"
                                  >
                                    <MessageSquarePlus size={13} className="text-purple-500" />
                                    <span>Reply to Seller</span>
                                  </button>
                                </div>
                              </div>
                            )}

                            {/* Inline Interactive Deal Action Card */}
                            {deal && (
                              <div className="w-full mt-3 p-5 rounded-3xl neu-card border border-[var(--border-subtle)] space-y-3.5">
                                <div className="flex items-center justify-between gap-2 flex-wrap">
                                  <div className="flex items-center gap-1.5 flex-wrap">
                                    <span className={`text-[10px] font-black uppercase tracking-widest px-3 py-1 rounded-full flex items-center gap-1.5 ${
                                      deal.accepted || deal.status === 'ACCEPTED_PENDING_CHECKOUT'
                                        ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20'
                                        : deal.status === 'ABANDONED' || deal.rejected
                                        ? 'bg-rose-500/10 text-rose-600 dark:text-rose-400 border border-rose-500/20'
                                        : 'bg-orange-500/10 text-orange-600 dark:text-orange-400 border border-orange-500/20'
                                    }`}>
                                      {deal.accepted || deal.status === 'ACCEPTED_PENDING_CHECKOUT' ? (
                                        <>
                                          <CheckCircle2 size={11} /> Authorized Deal Locked
                                        </>
                                      ) : deal.status === 'ABANDONED' || deal.rejected ? (
                                        <>
                                          <AlertTriangle size={11} /> Floor Price Reached
                                        </>
                                      ) : (
                                        <>
                                          <Sparkles size={11} /> Seller Counter-Offer
                                        </>
                                      )}
                                    </span>
                                    {deal.offerId && (
                                      <span className="text-[10px] font-mono font-bold text-[var(--text-muted)] neu-card-pressed px-2.5 py-0.5 rounded-lg">
                                        #{deal.offerId}
                                      </span>
                                    )}
                                  </div>

                                  {deal.currentOfferUnitPrice && (() => {
                                    const qty = deal.currentQuantity || 1;
                                    const unitPrice = Number(deal.currentOfferUnitPrice);
                                    const totalPrice = Number(deal.currentOfferTotal || (unitPrice * qty));
                                    const savings = Number(deal.savings || 0);

                                    return (
                                      <div className="text-right">
                                        <div className="text-base font-black text-[var(--text-main)]">
                                          {deal.currency === 'NGN'
                                            ? `₦${Math.round(totalPrice).toLocaleString()} NGN`
                                            : `$${totalPrice.toFixed(2)} USD`}
                                        </div>
                                        {qty > 1 && (
                                          <div className="text-[10px] font-semibold text-[var(--text-muted)]">
                                            ({deal.currency === 'NGN' ? `₦${Math.round(unitPrice).toLocaleString()}` : `$${unitPrice.toFixed(2)}`} each • {qty} units)
                                          </div>
                                        )}
                                        {savings > 0 && (
                                          <div className="text-[10px] font-black text-emerald-600 dark:text-emerald-400">
                                            Save {deal.currency === 'NGN' ? `₦${Math.round(savings).toLocaleString()}` : `$${savings.toFixed(2)}`}
                                            {deal.discountPct ? ` (${deal.discountPct}%)` : ''}
                                          </div>
                                        )}
                                      </div>
                                    );
                                  })()}
                                </div>

                                {/* Exclusive Negotiated Promo Code Box */}
                                {(deal.promoCode || deal.offerId) && (
                                  <div className="flex items-center justify-between p-3 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 text-xs">
                                    <div className="flex items-center gap-2">
                                      <Tag size={16} className="text-emerald-600 dark:text-emerald-400 shrink-0" />
                                      <div>
                                        <span className="text-[10px] font-bold uppercase tracking-wider text-[var(--text-muted)] block">
                                          Negotiated Promo Code (Product-Locked)
                                        </span>
                                        <div className="flex items-center gap-1.5 mt-0.5">
                                          <span className="font-mono font-black text-emerald-600 dark:text-emerald-400 text-sm tracking-wider">
                                            {deal.promoCode || deal.offerId}
                                          </span>
                                          <span className="text-[10px] px-1.5 py-0.5 rounded bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 font-bold">
                                            {deal.discountPct ? `${deal.discountPct}% OFF` : 'DEAL LOCKED'}
                                          </span>
                                        </div>
                                      </div>
                                    </div>
                                    <button
                                      type="button"
                                      onClick={() => {
                                        const code = deal.promoCode || deal.offerId;
                                        if (navigator.clipboard) {
                                          navigator.clipboard.writeText(code);
                                        }
                                        toast.success(`Copied promo code "${code}"!`);
                                      }}
                                      className="px-3 py-1.5 text-xs font-bold rounded-xl neu-button text-[var(--text-main)] hover:bg-emerald-500/20 flex items-center gap-1.5 transition-all shadow-sm cursor-pointer"
                                    >
                                      <Copy size={12} />
                                      <span>Copy Code</span>
                                    </button>
                                  </div>
                                )}

                                {/* Action Buttons for Deal */}
                                <div className="flex items-center gap-2.5 flex-wrap pt-2.5 border-t border-[var(--border-subtle)]">
                                  {(deal.accepted || deal.status === 'ACCEPTED_PENDING_CHECKOUT' || deal.currentOfferUnitPrice) && (() => {
                                    const qty = deal.currentQuantity || 1;
                                    const unitPrice = Number(deal.currentOfferUnitPrice);
                                    const totalPrice = Number(deal.currentOfferTotal || (unitPrice * qty));
                                    const unitUSD = deal.currency === 'NGN' ? Math.round((unitPrice / 1480) * 100) / 100 : unitPrice;
                                    const totalUSD = Math.round(unitUSD * qty * 100) / 100;
                                    const totalNGN = deal.currency === 'NGN' ? Math.round(totalPrice) : Math.round(totalUSD * 1480);

                                    return (
                                      <>
                                        <button
                                          type="button"
                                          onClick={() => {
                                            handleAddToCart({
                                              id: deal.productId || attachedChatProduct?.id,
                                              productId: deal.productId || attachedChatProduct?.id,
                                              title: deal.productTitle || attachedChatProduct?.title || 'Negotiated Item',
                                              price: unitUSD,
                                              quantity: qty,
                                              promoCode: deal.promoCode || deal.offerId,
                                              currency: 'USD',
                                              imageUrl: attachedChatProduct?.imageUrl,
                                              sellerName: deal.storeName || attachedChatProduct?.sellerName || 'Verified Merchant',
                                              isNative: true,
                                              negotiated: true
                                            });
                                          }}
                                          className="flex-1 min-w-[130px] py-2.5 px-4 rounded-xl bg-[#006cff] hover:bg-[#0057d9] text-white text-xs font-bold flex items-center justify-center gap-1.5 shadow-[0_6px_16px_rgba(0,108,255,0.25)] cursor-pointer transition-all"
                                        >
                                          <ShoppingBag size={13} />
                                          <span>
                                            Add to Cart ({deal.currency === 'NGN' ? `₦${Math.round(totalPrice).toLocaleString()}` : `$${totalPrice.toFixed(2)}`}{qty > 1 ? ` • ${qty} units` : ''})
                                          </span>
                                        </button>

                                        <button
                                          type="button"
                                          onClick={() => {
                                            handleDirectWalletCheckout({
                                              offer: {
                                                id: deal.productId || attachedChatProduct?.id,
                                                productId: deal.productId || attachedChatProduct?.id,
                                                title: deal.productTitle || attachedChatProduct?.title || 'Negotiated Item',
                                                imageUrl: attachedChatProduct?.imageUrl,
                                                sellerName: deal.storeName || attachedChatProduct?.sellerName || 'Verified Merchant',
                                                price: unitUSD,
                                                currency: 'USD',
                                                promoCode: deal.promoCode || deal.offerId
                                              },
                                              totalUSD,
                                              totalNGN,
                                              quantity: qty,
                                              promoCode: deal.promoCode || deal.offerId,
                                              optionalBuyerMessage: `Locked Offer #${deal.offerId || 'AUTH'}`
                                            });
                                          }}
                                          className="flex-1 min-w-[130px] py-2.5 px-4 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold flex items-center justify-center gap-1.5 shadow-[0_6px_16px_rgba(16,185,129,0.25)] cursor-pointer transition-all"
                                        >
                                          <Wallet size={13} />
                                          <span>Instant Checkout</span>
                                        </button>
                                      </>
                                    );
                                  })()}

                                  {deal.bundleOption && deal.bundleOption.discountPct > 0 && (
                                    <button
                                      type="button"
                                      onClick={() => {
                                        const prompt = `I accept the 2-unit bundle deal for "${deal.productTitle || attachedChatProduct?.title || 'this product'}"! Please lock the bundle price.`;
                                        handleSendMessage(prompt, {
                                          productId: deal.productId || attachedChatProduct?.id,
                                          actionType: 'ACCEPT_BUNDLE',
                                          quantity: 2
                                        });
                                      }}
                                      className="py-2.5 px-4 rounded-xl neu-button text-[var(--text-main)] text-xs font-bold flex items-center gap-1.5 cursor-pointer transition-all"
                                    >
                                      <Box size={13} className="text-orange-500" />
                                      <span>Accept 2-Item Bundle ({deal.bundleOption.discountPct}% Off)</span>
                                    </button>
                                  )}

                                  <button
                                    type="button"
                                    onClick={() => {
                                      const prompt = `Check other connected stores for "${deal.productTitle || attachedChatProduct?.title || 'this product'}"`;
                                      handleSendMessage(prompt, {
                                        productId: deal.productId || attachedChatProduct?.id,
                                        actionType: 'COMPARE_STORES'
                                      });
                                    }}
                                    className="py-2.5 px-4 rounded-xl neu-button text-[var(--text-main)] text-xs font-bold flex items-center gap-1.5 cursor-pointer transition-all hover:text-[#006cff]"
                                  >
                                    <Compass size={13} className="text-[#006cff]" />
                                    <span>Check Other Connected Stores</span>
                                  </button>
                                </div>

                                {/* Side-by-Side Store Comparisons */}
                                {Array.isArray(deal.comparisons) && deal.comparisons.length > 0 && (
                                  <div className="w-full mt-3 pt-3 border-t border-[var(--border-subtle)] space-y-2.5">
                                    <div className="flex items-center justify-between">
                                      <span className="text-[11px] font-black uppercase tracking-wider text-[var(--text-main)] flex items-center gap-1.5">
                                        <Compass size={12} className="text-[#006cff]" /> Connected Store Price Comparison
                                      </span>
                                      <span className="text-[10px] text-[var(--text-muted)] font-medium">
                                        Live side-by-side rates
                                      </span>
                                    </div>
                                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                                      {deal.comparisons.map((comp, cIdx) => (
                                        <div
                                          key={cIdx}
                                          className={`p-3 rounded-2xl neu-card border ${
                                            comp.isCurrentSeller
                                              ? 'border-[#006cff]/30 bg-[#006cff]/5'
                                              : 'border-white/60 dark:border-white/[0.06]'
                                          } flex flex-col justify-between space-y-2`}
                                        >
                                          <div className="flex items-start justify-between gap-2">
                                            <div className="min-w-0">
                                              <p className="text-[10px] font-bold text-[var(--text-muted)] truncate">{comp.sellerLabel || comp.sellerName}</p>
                                              <p className="text-xs font-black text-[var(--text-main)] truncate">{comp.title}</p>
                                            </div>
                                            <span className={`text-[9px] font-bold px-2 py-0.5 rounded-full shrink-0 ${
                                              comp.isCurrentSeller
                                                ? 'bg-[#006cff]/10 text-[#006cff]'
                                                : comp.isVerifiedPrice
                                                ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400'
                                                : 'bg-amber-500/10 text-amber-600 dark:text-amber-400'
                                            }`}>
                                              {comp.isCurrentSeller ? 'Current Store' : (comp.isVerifiedPrice ? 'Verified Store' : 'Connected Store')}
                                            </span>
                                          </div>
                                          <div className="flex items-baseline justify-between pt-1 border-t border-black/5 dark:border-white/5">
                                            <div>
                                              <span className="text-sm font-black text-[var(--text-main)]">
                                                {comp.currency === 'NGN' ? `₦${Math.round(comp.price).toLocaleString()} NGN` : `$${Number(comp.price).toFixed(2)} USD`}
                                              </span>
                                              <span className="text-[10px] text-[var(--text-muted)] ml-1">
                                                ({comp.deliveryFee > 0 ? `+ ₦${Math.round(comp.deliveryFee).toLocaleString()} deliv.` : 'Free deliv. 🚚'})
                                              </span>
                                            </div>
                                            <span className="text-[10px] font-extrabold text-[var(--text-main)]">
                                              Total: {comp.currency === 'NGN' ? `₦${Math.round(comp.totalPayable).toLocaleString()}` : `$${Number(comp.totalPayable).toFixed(2)}`}
                                            </span>
                                          </div>
                                        </div>
                                      ))}
                                    </div>
                                  </div>
                                )}
                              </div>
                            )}

                            {/* Live Warehouse Verification & Escrow Media Card */}
                            {warehouseInsp && (
                              <div className="w-full mt-3 p-5 rounded-3xl neu-card border border-[var(--border-subtle)] space-y-3.5">
                                {/* Header badge & vault info */}
                                <div className="flex items-center justify-between gap-2 flex-wrap">
                                  <div className="flex items-center gap-1.5 flex-wrap">
                                    <span className="text-[10px] font-black uppercase tracking-widest px-3 py-1 rounded-full flex items-center gap-1.5 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20">
                                      <Camera size={11} /> Warehouse Verification
                                    </span>
                                    <span className="text-[10px] font-mono font-bold text-[var(--text-main)] neu-card-pressed px-2.5 py-0.5 rounded-lg flex items-center gap-1">
                                      <ShieldCheck size={11} className="text-emerald-500" />
                                      {warehouseInsp.serialBatchCode || 'SN-GYM-2026-X892'}
                                    </span>
                                  </div>
                                  <div className="text-[11px] font-bold text-[var(--text-muted)] flex items-center gap-1">
                                    <span>📍 {warehouseInsp.warehouseLocation || 'Lagos Mainland Fulfillment Vault • Bay 4'}</span>
                                  </div>
                                </div>

                                {/* Product context line if present */}
                                <div className="text-xs font-bold text-[var(--text-main)] flex items-center justify-between">
                                  <span>{warehouseInsp.productTitle || attachedChatProduct?.title || 'Fulfillment Inspection Batch'}</span>
                                  <span className="text-[10px] font-black text-emerald-600 dark:text-emerald-400 bg-emerald-500/10 px-2.5 py-0.5 rounded-full">
                                    ✓ Macro Inspected
                                  </span>
                                </div>

                                {/* Macro Inspection Photos Gallery (3 photos) */}
                                {Array.isArray(warehouseInsp.photos) && warehouseInsp.photos.length > 0 && (
                                  <div className="grid grid-cols-3 gap-2.5">
                                    {warehouseInsp.photos.map((photo, pIdx) => (
                                      <div
                                        key={photo.id || pIdx}
                                        onClick={() => setPhotoZoomModal(photo)}
                                        className="group relative rounded-2xl overflow-hidden neu-card-pressed p-1.5 cursor-pointer hover:border-[#006cff]/30 border border-transparent transition-all"
                                      >
                                        <div className="relative aspect-square rounded-xl overflow-hidden bg-zinc-100 dark:bg-zinc-800">
                                          <img
                                            src={photo.url}
                                            alt={photo.caption || photo.badge}
                                            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                                            onError={(e) => {
                                              e.currentTarget.src = 'https://images.unsplash.com/photo-1523275335684-37898b6baf30?w=600';
                                            }}
                                          />
                                          <div className="absolute inset-0 bg-black/25 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center text-white">
                                            <Maximize2 size={15} className="drop-shadow-xs" />
                                          </div>
                                        </div>
                                        <span className="block text-[9px] font-bold text-[var(--text-muted)] truncate mt-1 px-0.5">
                                          {photo.badge || photo.caption || `Angle ${pIdx + 1}`}
                                        </span>
                                      </div>
                                    ))}
                                  </div>
                                )}

                                {/* Seller Voice Note Player */}
                                {warehouseInsp.voiceNote && (
                                  <div className="p-3 rounded-2xl neu-card-pressed space-y-2">
                                    <div className="flex items-center justify-between gap-2">
                                      <div className="flex items-center gap-2 min-w-0">
                                        <button
                                          type="button"
                                          onClick={() => handlePlayVoiceNote(msg.id || idx, warehouseInsp.voiceNote.transcript)}
                                          className="px-3 py-1.5 rounded-xl bg-[#006cff] hover:bg-[#0057d9] text-white text-[11px] font-bold flex items-center gap-1.5 shrink-0 cursor-pointer transition-all"
                                        >
                                          <Volume2 size={13} className={isPlayingVoiceNote && activeVoiceNoteId === (msg.id || idx) ? 'animate-bounce' : ''} />
                                          <span>{isPlayingVoiceNote && activeVoiceNoteId === (msg.id || idx) ? 'Playing...' : 'Play Voice Note'}</span>
                                        </button>
                                        
                                        {/* Waveform bars */}
                                        <div className="flex items-end gap-1 h-5 px-1">
                                          {(warehouseInsp.voiceNote.waveformBars || [40, 65, 80, 50, 95, 70, 85, 60, 90, 75, 45, 85, 60]).map((h, bIdx) => (
                                            <span
                                              key={bIdx}
                                              style={{ height: `${Math.max(25, h)}%` }}
                                              className={`w-1 rounded-full transition-all duration-150 ${
                                                isPlayingVoiceNote && activeVoiceNoteId === (msg.id || idx)
                                                  ? 'bg-emerald-500 animate-pulse'
                                                  : 'bg-slate-300 dark:bg-zinc-600'
                                              }`}
                                            />
                                          ))}
                                        </div>
                                      </div>

                                      <div className="flex items-center gap-1.5 shrink-0">
                                        <span className="text-[10px] font-mono font-bold text-[var(--text-muted)] px-1.5 py-0.5 rounded">
                                          {warehouseInsp.voiceNote.duration || '0:34'}
                                        </span>
                                      </div>
                                    </div>

                                    {/* Transcript text quote */}
                                    {warehouseInsp.voiceNote.transcript && (
                                      <p className="text-[11px] text-[var(--text-muted)] italic p-2 rounded-xl border border-[var(--border-subtle)] leading-snug">
                                        "{warehouseInsp.voiceNote.transcript}"
                                      </p>
                                    )}
                                  </div>
                                )}

                                {/* Action Bar: 1-Click Escrow Wallet Checkout & Add to Cart */}
                                <div className="flex items-center gap-2.5 pt-2.5 border-t border-[var(--border-subtle)] flex-wrap">
                                  <button
                                    type="button"
                                    onClick={() => {
                                      const unitPriceNGN = warehouseInsp.suggestedPrice || 18000;
                                      const unitPriceUSD = Number((unitPriceNGN / 1480).toFixed(2));
                                      handleDirectWalletCheckout({
                                        offer: {
                                          id: warehouseInsp.productId || attachedChatProduct?.id || 'warehouse-inspected-item',
                                          title: warehouseInsp.productTitle || attachedChatProduct?.title || 'Warehouse Inspected Item',
                                          imageUrl: warehouseInsp.photos?.[0]?.url || attachedChatProduct?.imageUrl,
                                          sellerName: warehouseInsp.storeName || attachedChatProduct?.sellerName || 'Verified Merchant'
                                        },
                                        totalUSD: unitPriceUSD,
                                        totalNGN: unitPriceNGN,
                                        quantity: 1,
                                        optionalBuyerMessage: `Verified Warehouse Serial #${warehouseInsp.serialBatchCode || 'SN-VERIFIED'}`
                                      });
                                    }}
                                    className="flex-1 min-w-[140px] py-2.5 px-4 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold flex items-center justify-center gap-1.5 shadow-[0_6px_16px_rgba(16,185,129,0.25)] cursor-pointer transition-all"
                                  >
                                    <Wallet size={13} />
                                    <span>Escrow Wallet Checkout</span>
                                  </button>

                                  <button
                                    type="button"
                                    onClick={() => {
                                      const unitPriceNGN = warehouseInsp.suggestedPrice || 18000;
                                      const unitPriceUSD = Number((unitPriceNGN / 1480).toFixed(2));
                                      handleAddToCart({
                                        id: warehouseInsp.productId || attachedChatProduct?.id || 'warehouse-inspected-item',
                                        productId: warehouseInsp.productId || attachedChatProduct?.id || 'warehouse-inspected-item',
                                        title: warehouseInsp.productTitle || attachedChatProduct?.title || 'Warehouse Inspected Item',
                                        imageUrl: warehouseInsp.photos?.[0]?.url || attachedChatProduct?.imageUrl,
                                        price: unitPriceUSD,
                                        currency: 'USD',
                                        sellerName: warehouseInsp.storeName || attachedChatProduct?.sellerName || 'Verified Merchant',
                                        warehouseVerified: true,
                                        serialBatchCode: warehouseInsp.serialBatchCode
                                      });
                                    }}
                                    className="py-2.5 px-4 rounded-xl bg-[#006cff] hover:bg-[#0057d9] text-white text-xs font-bold flex items-center justify-center gap-1.5 shadow-[0_6px_16px_rgba(0,108,255,0.25)] cursor-pointer transition-all"
                                  >
                                    <ShoppingBag size={13} />
                                    <span>Add to Cart</span>
                                  </button>

                                  <button
                                    type="button"
                                    onClick={() => {
                                      handleSendMessage(`Can you offer a discount for ${warehouseInsp.productTitle || 'this item'}?`, {
                                        productId: warehouseInsp.productId || attachedChatProduct?.id,
                                        actionType: 'REQUEST_SELLER_NEGOTIATION'
                                      });
                                    }}
                                    className="py-2.5 px-4 rounded-xl neu-button text-[var(--text-main)] text-xs font-bold flex items-center justify-center gap-1.5 cursor-pointer transition-all"
                                  >
                                    <Tag size={13} className="text-orange-500" />
                                    <span>Negotiate Price</span>
                                  </button>
                                </div>
                              </div>
                            )}

                            {/* Interactive PayAI TasteMatch Plan & Basket Card */}
                            {!isUser && tasteMatchPlan && (
                              <PayAITasteMatchCard
                                plan={tasteMatchPlan}
                                formatLocalPrice={formatLocalPrice}
                                onSendMessage={handleSendMessage}
                                onOpenCart={() => setIsCartDrawerOpen(true)}
                                onLockEscrowCheckout={({ totalNGN, totalUSD, items, planTitle }) => {
                                  handleProceedToCheckout({
                                    total: totalUSD || Number((totalNGN / 1480).toFixed(2)),
                                    totalNGN: totalNGN,
                                    productTitle: planTitle || 'PayAI TasteMatch™ 3-Day Plan',
                                    storeName: 'Verified Kitchen Vendors',
                                    items: items || []
                                  });
                                }}
                              />
                            )}

                            {/* Dedicated Interactive Card when an Item or Combo is Added to Cart */}
                            {(cartData || cartItem) && (() => {
                              const isCombo = Boolean(cartData?.isCombo);
                              const items = cartData?.items || (cartItem ? [cartItem] : []);
                              const totalNGN = cartData?.totalNGN || (cartItem?.currency === 'USD' ? Math.round(Number(cartItem.price) * 1480 * (cartItem.quantity || 1)) : Number(cartItem?.price || 0) * (cartItem?.quantity || 1));
                              const totalUSD = cartData?.totalUSD || (cartItem?.currency === 'USD' ? Number(cartItem.price) * (cartItem.quantity || 1) : Number((totalNGN / 1480).toFixed(2)));

                              return (
                              <div className="w-full mt-3 p-5 rounded-3xl neu-card border border-[var(--border-subtle)] space-y-3.5">
                                <div className="flex items-center justify-between gap-2 flex-wrap">
                                  <div className="flex items-center gap-1.5 flex-wrap">
                                    <span className="text-[10px] font-black uppercase tracking-widest px-3 py-1 rounded-full flex items-center gap-1 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20">
                                      <CheckCircle2 size={11} /> {isCombo ? 'Combo Added to Cart' : 'Added to Cart'}
                                    </span>
                                    <span className="text-[10px] font-mono font-bold text-[var(--text-muted)] neu-card-pressed px-2.5 py-0.5 rounded-lg">
                                      {isCombo ? `${items.length} Items` : `Qty: ${cartItem?.quantity || 1}`}
                                    </span>
                                  </div>
                                  <div className="text-right">
                                    <div className="text-base font-black text-[var(--text-main)]">
                                      {isCombo ? `₦${totalNGN.toLocaleString()} NGN` : (cartItem?.currency === 'USD' ? `$${Number(cartItem.price).toFixed(2)} USD` : `₦${totalNGN.toLocaleString()} NGN`)}
                                    </div>
                                  </div>
                                </div>

                                <div className="space-y-2">
                                  {items.map((it, itemIdx) => {
                                      const itemImg = it.imageUrl || it.image || '';
                                      const resolvedImg = resolveProductImage(itemImg, it.title || '', it.category || '');
                                      return (
                                    <div key={it.id || it.productId || itemIdx} className="flex items-center gap-3 p-3 rounded-2xl neu-card-pressed">
                                      {isVideoUrl(itemImg) ? (
                                        <video
                                          src={getImageUrl(itemImg)}
                                          className="w-11 h-11 rounded-xl object-cover border border-[var(--border-subtle)] shrink-0"
                                          muted
                                          playsInline
                                          preload="metadata"
                                        />
                                      ) : (
                                        <img
                                          src={resolvedImg}
                                          alt={it.title || 'Product'}
                                          className="w-11 h-11 rounded-xl object-cover border border-[var(--border-subtle)] shrink-0"
                                          onError={(e) => {
                                            e.currentTarget.onerror = null;
                                            e.currentTarget.src = FALLBACK_PACKAGE_BOX_IMG;
                                          }}
                                        />
                                      )}
                                      <div className="min-w-0 flex-1">
                                        <div className="flex items-center justify-between gap-2">
                                          <h4 className="text-xs font-bold text-[var(--text-main)] truncate">{it.title || 'W-Commerce Item'}</h4>
                                          <span className="text-[11px] font-bold text-emerald-600 dark:text-emerald-400 shrink-0">
                                            {it.currency === 'USD' ? `$${Number(it.price).toFixed(2)}` : `₦${Number(it.price || 0).toLocaleString()}`}
                                          </span>
                                        </div>
                                        <p className="text-[10px] font-medium text-[var(--text-muted)] flex items-center justify-between gap-1 mt-0.5">
                                          <span className="flex items-center gap-1 truncate">
                                            <Store size={10} className="text-emerald-500 shrink-0" />
                                            <span className="truncate">{it.sellerName || it.storeName || 'Verified Merchant'}</span>
                                          </span>
                                          <span className="shrink-0 text-[10px] font-mono opacity-80">Qty: {it.quantity || 1}</span>
                                        </p>
                                      </div>
                                    </div>
                                      );
                                    })}
                                </div>

                                <div className="flex items-center gap-2.5 flex-wrap pt-1">
                                  <button
                                    type="button"
                                    onClick={() => handleProceedToCheckout()}
                                    className="flex-1 min-w-[140px] py-2.5 px-4 rounded-xl bg-[#006cff] hover:bg-[#0057d9] text-white text-xs font-bold flex items-center justify-center gap-1.5 shadow-[0_6px_16px_rgba(0,108,255,0.25)] cursor-pointer transition-all"
                                  >
                                    <Lock size={12} className="shrink-0" />
                                    <span>Secure Checkout</span>
                                  </button>

                                  <button
                                    type="button"
                                    onClick={() => {
                                      if (isCombo) {
                                        // Combo items are already in cart (added by AI) — just go to cart
                                        navigate('/cart');
                                      } else {
                                        const finalPrice = Number(cartItem?.price) || 7500;
                                        const itemId = cartItem?.id || cartItem?.productId;
                                        if (!itemId || typeof itemId === 'string' && (itemId.startsWith('combo-') || itemId.startsWith('offline_'))) {
                                          // Already in cart, navigate directly
                                          navigate('/cart');
                                        } else {
                                          handleDirectWalletCheckout({
                                            offer: {
                                              id: itemId,
                                              title: cartItem?.title,
                                              imageUrl: cartItem?.imageUrl,
                                              sellerName: cartItem?.sellerName || cartItem?.storeName
                                            },
                                            totalNGN: cartItem?.currency === 'USD' ? Math.round(finalPrice * 1480) : finalPrice,
                                            totalUSD: cartItem?.currency === 'USD' ? finalPrice : Number((finalPrice / 1480).toFixed(2)),
                                            quantity: cartItem?.quantity || 1,
                                            optionalBuyerMessage: `PayAI Cart Checkout: ${cartItem?.title}`
                                          });
                                        }
                                      }
                                    }}
                                    className="flex-1 min-w-[140px] py-2.5 px-4 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold flex items-center justify-center gap-1.5 shadow-[0_6px_16px_rgba(16,185,129,0.25)] cursor-pointer transition-all"
                                  >
                                    <Wallet size={12} className="shrink-0" />
                                    <span>Pay with Wallet</span>
                                  </button>

                                  <button
                                    type="button"
                                    onClick={() => handleProceedToCheckout()}
                                    className="py-2.5 px-4 rounded-xl neu-button text-[var(--text-main)] text-xs font-bold flex items-center justify-center gap-1.5 cursor-pointer transition-all"
                                  >
                                    <ShoppingBag size={12} />
                                    <span>View Cart</span>
                                  </button>
                                </div>
                              </div>
                              );
                            })()}

                            {/* Dedicated Interactive Wallet Balance Card for Wallet Inquiries */}
                            {!isUser && walletInquiry && (
                              <div className="w-full mt-3 p-5 rounded-3xl neu-card border border-[var(--border-subtle)] space-y-4">
                                <div className="flex items-center justify-between gap-2 flex-wrap">
                                  <div className="flex items-center gap-2.5">
                                    <div className="w-9 h-9 rounded-2xl bg-[#006cff]/10 text-[#006cff] border border-[#006cff]/20 flex items-center justify-center shadow-xs">
                                      <Wallet size={17} />
                                    </div>
                                    <div>
                                      <div className="text-xs font-black text-[var(--text-main)] flex items-center gap-1.5">
                                        W-Commerce Escrow Wallet
                                      </div>
                                      <div className="text-[10px] text-emerald-600 dark:text-emerald-400 font-bold flex items-center gap-1 mt-0.5">
                                        <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                                        100% Escrow Protected Vault
                                      </div>
                                    </div>
                                  </div>
                                  <span className="text-[10px] font-black uppercase tracking-wider px-2.5 py-1 rounded-full bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20">
                                    Instant 1-Click Ready
                                  </span>
                                </div>

                                <div className="p-4 rounded-2xl neu-card-pressed flex items-baseline justify-between gap-3 flex-wrap">
                                  <div>
                                    <div className="text-[10px] font-bold text-[var(--text-muted)] uppercase tracking-wider">Available Balance</div>
                                    <div className="text-2xl sm:text-3xl font-black text-[var(--text-main)] tracking-tight">
                                      ₦{Number(walletInquiry.balanceNGN || 0).toLocaleString()} <span className="text-xs font-bold text-[var(--text-muted)]">NGN</span>
                                    </div>
                                  </div>
                                  <div className="text-right">
                                    <div className="text-[10px] font-bold text-[var(--text-muted)] uppercase tracking-wider">USD Equivalent</div>
                                    <div className="text-base font-black text-[#006cff]">
                                      ≈ ${Number(walletInquiry.balanceUSD || 0).toFixed(2)} <span className="text-[10px] font-semibold text-[var(--text-muted)]">USD</span>
                                    </div>
                                  </div>
                                </div>

                                <p className="text-[11px] font-medium text-[var(--text-muted)] leading-snug">
                                  Funds in your wallet are held safely in escrow and can be used for instant 1-click checkout on any store with zero card fees.
                                </p>

                                <div className="flex items-center gap-2.5 flex-wrap pt-1">
                                  <button
                                    type="button"
                                    onClick={() => setIsTopUpOpen(true)}
                                    className="flex-1 min-w-[130px] py-2.5 px-4 rounded-xl bg-[#006cff] hover:bg-[#0057d9] text-white text-xs font-bold flex items-center justify-center gap-1.5 shadow-[0_6px_16px_rgba(0,108,255,0.25)] cursor-pointer transition-all"
                                  >
                                    <Plus size={14} className="shrink-0" />
                                    <span>Top Up Wallet</span>
                                  </button>

                                  <button
                                    type="button"
                                    onClick={() => navigate('/buyer/wallet')}
                                    className="flex-1 min-w-[130px] py-2.5 px-4 rounded-xl neu-button text-[var(--text-main)] hover:text-[#006cff] text-xs font-bold flex items-center justify-center gap-1.5 cursor-pointer transition-all"
                                  >
                                    <ArrowRight size={14} className="shrink-0" />
                                    <span>Manage Wallet</span>
                                  </button>
                                </div>
                              </div>
                            )}

                            {/* Standalone Interactive Payment & Escrow Card for Checkout/Wallet Intent */}
                            {!deal && !warehouseInsp && !cartItem && !walletInquiry && !isUser && (hasPaymentOrCheckoutIntent(msg.content) || checkoutGuidance) && (() => {
                              // Never render a checkout card for completed orders or official receipts
                              const isOrderReceiptOrCompletion =
                                /Official\s+Purchase\s+Receipt|Order\s+Summary:|Order\s+Confirmed|Payment\s+Authorized|PAID_IN_ESCROW|Order\s+Confirmed\s+Delivered/i.test(msg.content) ||
                                (typeof msg.toolResults === 'string' && (msg.toolResults.includes('"isReceipt"') || msg.toolResults.includes('"status":"VERIFIED"')));
                              if (isOrderReceiptOrCompletion) return null;

                              const rawProductMatch = msg.content.match(/\*\*([A-Za-z0-9\s-]{3,40})\*\*/);
                              const genericBlacklist = ['Escrow', 'Payment', 'Safe', 'Security', 'Protection', 'Wallet', 'Paystack', 'Monnify', 'W-Commerce', 'Rest easy', 'PayPal', 'Paypal', 'Order'];
                              const validExtractedProduct = rawProductMatch && !genericBlacklist.includes(rawProductMatch[1]?.trim())
                                ? rawProductMatch[1].trim()
                                : null;
                              const effectiveItems = (checkoutGuidance?.items && checkoutGuidance.items.length > 0)
                                ? checkoutGuidance.items
                                : (cart?.items && cart.items.length > 0)
                                  ? cart.items
                                  : null;
                              const cartTotalNGN = (cart?.items && cart.items.length > 0)
                                ? cart.items.reduce((s, it) => s + (Number(it.price || 0) * (it.quantity || 1)), 0)
                                : 0;
                              const isPayPal = Boolean(checkoutGuidance?.isPayPalCheckout || /paypal|pay\s*pal/i.test(msg.content));
                              const rawExtractedNGN = extractAmountFromText(msg.content)?.numeric;

                              const totalNGNAmt = Number(
                                (checkoutGuidance?.items && checkoutGuidance.items.length > 0)
                                  ? (checkoutGuidance.amountNGN || checkoutGuidance.items.reduce((s, it) => s + (Number(it.price || 0) * (it.quantity || 1)), 0))
                                  : (cartTotalNGN > 0 && (!rawExtractedNGN || rawExtractedNGN < cartTotalNGN)
                                      ? cartTotalNGN
                                      : (checkoutGuidance?.amountNGN || rawExtractedNGN || 18000))
                              );
                              const totalUSDAmt = (checkoutGuidance?.amountUSD && checkoutGuidance.amountNGN === totalNGNAmt)
                                ? checkoutGuidance.amountUSD
                                : Number((totalNGNAmt / 1480).toFixed(2));
                              const displayProductTitle = checkoutGuidance?.productTitle || validExtractedProduct;

                              return (
                              <div className="w-full mt-3 p-5 rounded-3xl neu-card border border-[var(--border-subtle)] space-y-3.5">
                                <div className="flex items-center justify-between gap-2 flex-wrap">
                                  <div className="flex items-center gap-1.5 flex-wrap">
                                    <span className={`text-[10px] font-black uppercase tracking-widest px-3 py-1 rounded-full flex items-center gap-1 ${
                                      isPayPal
                                        ? 'bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20'
                                        : 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20'
                                    }`}>
                                      <ShieldCheck size={11} /> {isPayPal ? 'PayPal Escrow Protected Checkout' : 'Escrow Protected Checkout'}
                                    </span>
                                  </div>
                                  <div className="text-right">
                                    <div className="text-base font-black text-[var(--text-main)]">
                                      {isPayPal ? `${totalUSDAmt} USD` : `₦${Number(totalNGNAmt).toLocaleString()} NGN`}
                                    </div>
                                    {isPayPal && (
                                      <div className="text-[10px] font-medium text-[var(--text-muted)]">
                                        ≈ ₦{Number(totalNGNAmt).toLocaleString()} NGN
                                      </div>
                                    )}
                                  </div>
                                </div>

                                {effectiveItems && effectiveItems.length > 1 ? (
                                  <div className="space-y-1.5 max-h-48 overflow-y-auto pr-0.5">
                                    {effectiveItems.map((it, idx) => {
                                      const itemImg = it.imageUrl || it.image || '';
                                      const resolvedImg = resolveProductImage(itemImg, it.title || '', it.category || '');
                                      return (
                                        <div key={it.id || it.productId || idx} className="text-xs font-bold text-[var(--text-main)] flex items-center justify-between gap-2 px-3 py-2 rounded-xl neu-card-pressed">
                                          <div className="flex items-center gap-2 min-w-0">
                                            {isVideoUrl(itemImg) ? (
                                              <video
                                                src={getImageUrl(itemImg)}
                                                className="w-8 h-8 rounded-lg object-cover shrink-0"
                                                muted
                                                playsInline
                                                preload="metadata"
                                              />
                                            ) : (
                                              <img
                                                src={resolvedImg}
                                                alt={it.title || 'Product'}
                                                className="w-8 h-8 rounded-lg object-cover shrink-0"
                                                onError={(e) => { e.currentTarget.onerror = null; e.currentTarget.src = FALLBACK_PACKAGE_BOX_IMG; }}
                                              />
                                            )}
                                            <div className="min-w-0">
                                              <span className="truncate block font-semibold">{it.title}</span>
                                              {(it.sellerName || it.storeName) && (
                                                <span className="text-[10px] text-[var(--text-muted)] shrink-0 block">{it.sellerName || it.storeName}</span>
                                              )}
                                            </div>
                                          </div>
                                          <div className="text-right shrink-0">
                                            <span className="text-xs font-bold text-emerald-600 dark:text-emerald-400">
                                              {it.currency === 'USD' ? `${Number(it.price).toFixed(2)}` : `₦${Number(it.price || 0).toLocaleString()}`}
                                            </span>
                                            {it.quantity > 1 && (
                                              <span className="text-[10px] text-[var(--text-muted)] block font-mono">Qty: {it.quantity}</span>
                                            )}
                                          </div>
                                        </div>
                                      );
                                    })}
                                  </div>
                                ) : displayProductTitle ? (
                                  <div className="text-xs font-bold text-[var(--text-main)] flex items-center gap-2 px-3 py-2 rounded-xl neu-card-pressed">
                                    {isVideoUrl(checkoutGuidance?.imageUrl) ? (
                                      <video
                                        src={getImageUrl(checkoutGuidance.imageUrl)}
                                        className="w-8 h-8 rounded-lg object-cover shrink-0"
                                        muted
                                        playsInline
                                        preload="metadata"
                                      />
                                    ) : (
                                      <img
                                        src={resolveProductImage(checkoutGuidance?.imageUrl || '', displayProductTitle, checkoutGuidance?.category || '')}
                                        alt={displayProductTitle}
                                        className="w-8 h-8 rounded-lg object-cover shrink-0"
                                        onError={(e) => { e.currentTarget.onerror = null; e.currentTarget.src = FALLBACK_PACKAGE_BOX_IMG; }}
                                      />
                                    )}
                                    <span className="truncate">{displayProductTitle}</span>
                                    {checkoutGuidance?.storeName && (
                                      <span className="text-[10px] text-[var(--text-muted)] shrink-0">• {checkoutGuidance.storeName}</span>
                                    )}
                                  </div>
                                ) : null}

                                <p className="text-[11px] font-medium text-[var(--text-muted)] leading-snug">
                                  {isPayPal ? (
                                    <>Pay via <strong className="text-amber-600 dark:text-amber-400">PayPal (USD)</strong>, <strong>W-Commerce Wallet</strong>, or <strong>Paystack</strong>. Funds stay locked in Escrow until delivery is confirmed.</>
                                  ) : (
                                    <>Pay via <strong>Paystack</strong>, <strong>Monnify</strong>, or <strong>W-Commerce Wallet</strong>. Funds stay locked in Escrow until delivery is confirmed.</>
                                  )}
                                </p>

                                <div className="flex items-center gap-2.5 flex-wrap pt-1">
                                  {/* PayPal Checkout Button */}
                                  <button
                                    type="button"
                                    onClick={() => {
                                      const defaultItems = (effectiveItems && effectiveItems.length > 0)
                                        ? effectiveItems
                                        : [{
                                            title: displayProductTitle || 'W-Commerce Order',
                                            price: totalUSDAmt,
                                            quantity: 1,
                                            imageUrl: checkoutGuidance?.imageUrl || FALLBACK_PACKAGE_BOX_IMG
                                          }];
                                      handleProceedToCheckout({
                                        total: totalUSDAmt,
                                        totalNGN: totalNGNAmt,
                                        productTitle: displayProductTitle || (defaultItems.length > 1 ? `${defaultItems.length} Items Order` : 'W-Commerce Order'),
                                        storeName: checkoutGuidance?.storeName || defaultItems[0]?.storeName || defaultItems[0]?.sellerName || 'Verified Merchant',
                                        imageUrl: checkoutGuidance?.imageUrl || defaultItems[0]?.imageUrl || '',
                                        items: defaultItems
                                      });
                                    }}
                                    className={`flex-1 min-w-[150px] py-2.5 px-4 rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 cursor-pointer transition-all ${
                                      isPayPal
                                        ? 'bg-[#ffc439] hover:bg-[#f4b628] text-[#003087] font-black shadow-[0_6px_16px_rgba(255,196,57,0.35)]'
                                        : 'bg-[#0070ba] hover:bg-[#003087] text-white shadow-[0_6px_16px_rgba(0,112,186,0.25)]'
                                    }`}
                                  >
                                    <CreditCard size={13} className="shrink-0" />
                                    <span>Pay with PayPal (${totalUSDAmt})</span>
                                  </button>

                                  <button
                                    type="button"
                                    onClick={() => {
                                      handleChatAction({
                                        label: `Confirm & Pay ₦${Number(totalNGNAmt).toLocaleString()} NGN from Wallet`,
                                        url: '#'
                                      });
                                    }}
                                    className="flex-1 min-w-[140px] py-2.5 px-4 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold flex items-center justify-center gap-1.5 shadow-[0_6px_16px_rgba(16,185,129,0.25)] cursor-pointer transition-all"
                                  >
                                    <Wallet size={12} className="shrink-0" />
                                    <span>Pay ₦{Number(totalNGNAmt).toLocaleString()} from Wallet</span>
                                  </button>

                                  <button
                                    type="button"
                                    onClick={() => handleChatAction({
                                      label: 'Proceed to Secure Checkout',
                                      url: '#'
                                    })}
                                    className="py-2.5 px-4 rounded-xl neu-button text-[var(--text-main)] hover:text-[#006cff] text-xs font-bold flex items-center justify-center gap-1.5 cursor-pointer transition-all"
                                  >
                                    <Lock size={12} className="shrink-0" />
                                    <span>Paystack / Monnify</span>
                                  </button>
                                </div>
                              </div>
                              );
                            })()}

                            {/* Embedded Interactive Product Cards */}
                            {offers.length > 0 && (
                              <div className="w-full mt-3.5 columns-1 sm:columns-2 gap-3.5 space-y-3.5">
                                {offers.map((offer, index) => {
                                  const offerKey = offer.id || offer.externalOfferId || offer.externalProductId;
                                  return (
                                    <motion.div
                                      key={offerKey}
                                      initial={{ opacity: 0, y: 16, scale: 0.98 }}
                                      animate={{ opacity: 1, y: 0, scale: 1 }}
                                      transition={{
                                        type: 'spring',
                                        stiffness: 320,
                                        damping: 24,
                                        delay: index * 0.08
                                      }}
                                      className="break-inside-avoid"
                                    >
                                      <PayAIProductCard
                                        offer={offer}
                                        index={index}
                                        formatLocalPrice={formatLocalPrice}
                                        negotiationStatus={negotiationStatusMap[offerKey]}
                                        onNegotiate={handleOpenNegotiate}
                                        onAddToCart={handleAddToCart}
                                        onAddToChat={handleAddProductToChat}
                                        onQuickView={(item) => {
                                          setQuickViewItem(item);
                                          setModalTab('overview');
                                        }}
                                      />
                                    </motion.div>
                                  );
                                })}
                              </div>
                            )}
                          </div>

                          {/* Sender Avatar for User Messages */}
                          {isUser && (
                            <div className="w-9 h-9 rounded-xl overflow-hidden shrink-0 mt-0.5 shadow-sm border border-slate-200/80 dark:border-white/10 flex items-center justify-center bg-gradient-to-tr from-[#006cff] to-indigo-600 text-white font-bold text-xs select-none ring-2 ring-[#006cff]/20">
                              {user?.avatarUrl || user?.avatar || user?.profileImage ? (
                                <img
                                  src={user.avatarUrl || user.avatar || user.profileImage}
                                  alt={user.fullName || 'User'}
                                  className="w-full h-full object-cover"
                                  onError={(e) => {
                                    e.currentTarget.style.display = 'none';
                                  }}
                                />
                              ) : user?.fullName || user?.name || user?.email ? (
                                <span className="text-white font-bold text-xs">
                                  {(user.fullName || user.name || user.email).charAt(0).toUpperCase()}
                                </span>
                              ) : (
                                <User size={15} className="text-white" />
                              )}
                            </div>
                          )}
                        </motion.div>
                      );
                    })}

                    {/* Lazy Loading Skeleton Animation when AI is preparing to drop response */}
                    <AnimatePresence>
                      {isSending && (
                        <AILazyResponseSkeleton />
                      )}
                    </AnimatePresence>

                    {/* Live Seller Typing Indicator */}
                    {isSellerTyping && (
                      <motion.div
                        initial={{ opacity: 0, y: 5 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: 5 }}
                        className="flex items-center gap-2.5 text-xs text-purple-600 dark:text-purple-400 pl-11 py-1"
                      >
                        <div className="flex items-center gap-2 bg-purple-500/10 border border-purple-500/20 px-3 py-1.5 rounded-full">
                          <span className="font-bold">{activeQuickChatSeller?.storeName || 'Seller'} is typing</span>
                          <span className="flex gap-1 items-center ml-1">
                            <span className="w-1 h-1 rounded-full bg-purple-500 animate-bounce" style={{ animationDelay: '0ms' }} />
                            <span className="w-1 h-1 rounded-full bg-purple-500 animate-bounce" style={{ animationDelay: '150ms' }} />
                            <span className="w-1 h-1 rounded-full bg-purple-500 animate-bounce" style={{ animationDelay: '300ms' }} />
                          </span>
                        </div>
                      </motion.div>
                    )}
                  </>
                )}
                </div>
              </div>

              {/* Floating Seller-Dashboard Neumorphic Omnibox Composer Dock */}
              <div className="shrink-0 w-full bg-gradient-to-t from-[var(--bg-primary)] via-[var(--bg-primary)]/95 to-transparent pt-2 pb-3 sm:pb-4 px-3 sm:px-6 z-10">
                <div className="max-w-3xl mx-auto w-full space-y-2.5">
                  {/* Quick Prompts Carousel Pills */}
                  <div className="flex items-center gap-2 overflow-x-auto min-w-0 max-w-full hide-scrollbar pb-0.5">
                    {QUICK_PROMPTS.map((prompt, i) => (
                      <button
                        key={i}
                        onClick={() => handleSendMessage(prompt.text)}
                        className="px-3.5 py-1.5 rounded-full text-[11px] font-bold whitespace-nowrap neu-card text-[var(--text-muted)] hover:text-[#006cff] border border-[var(--border-subtle)] transition-all shrink-0 cursor-pointer"
                      >
                        <span>{prompt.label}</span>
                      </button>
                    ))}
                  </div>

                  {/* Unified Neumorphic Rounded-3xl Omnibox Container */}
                  <div className="rounded-3xl neu-card border border-[var(--border-subtle)] focus-within:border-[#006cff]/40 transition-all overflow-hidden">
                    {/* Attached Product Context & Negotiation Console inside Omnibox */}
                    {attachedChatProduct && (() => {
                      const attachedPrices = resolveOfferPrices(attachedChatProduct);
                      const discount5NGN = Math.round(attachedPrices.priceNGN * 0.95);
                      const discount10NGN = Math.round(attachedPrices.priceNGN * 0.90);
                      return (
                        <div className="px-4 py-3 border-b border-[var(--border-subtle)] neu-card-pressed flex flex-col gap-2.5">
                          <div className="flex items-center justify-between gap-2">
                            <div className="flex items-center gap-3 min-w-0">
                              <img
                                src={resolveProductImage(attachedChatProduct)}
                                alt={decodeHtml(attachedChatProduct.title)}
                                onError={(e) => {
                                  e.currentTarget.src = resolveProductImage(attachedChatProduct);
                                }}
                                className="w-10 h-10 rounded-xl object-contain bg-white p-0.5 border border-[var(--border-subtle)] shrink-0"
                              />
                              <div className="min-w-0">
                                <div className="flex items-center gap-1.5 flex-wrap">
                                  {attachedChatProduct.isTasteMatch ? (
                                    <span className="text-[9px] font-black uppercase tracking-widest px-2 py-0.5 rounded-full bg-purple-600/15 text-purple-600 dark:text-purple-300 border border-purple-500/30 flex items-center gap-1">
                                      <span>🧠</span> TasteMatch Mode
                                    </span>
                                  ) : (
                                    <span className="text-[9px] font-black uppercase tracking-widest px-2 py-0.5 rounded-full bg-[#006cff]/10 text-[#006cff] border border-[#006cff]/20">
                                      Attached Item
                                    </span>
                                  )}
                                  <span className="text-[10px] font-bold text-emerald-600 dark:text-emerald-400">
                                    • Live Negotiation Ready
                                  </span>
                                </div>
                                <p className="text-xs font-bold text-[var(--text-main)] truncate max-w-sm sm:max-w-md mt-0.5">
                                  {decodeHtml(attachedChatProduct.title)} — <span className="text-[#006cff]">₦{attachedPrices.priceNGN.toLocaleString()} NGN</span> <span className="text-[var(--text-muted)] font-normal">(≈ ${attachedPrices.priceUSD.toFixed(2)} USD)</span>
                                </p>
                              </div>
                            </div>

                            <button
                              type="button"
                              onClick={() => setAttachedChatProduct(null)}
                              className="p-1.5 rounded-xl neu-button text-[var(--text-muted)] hover:text-rose-500 cursor-pointer transition-colors"
                              title="Detach product"
                            >
                              <X size={14} />
                            </button>
                          </div>

                          {/* 1-Click Quick Negotiation & Checkout Chips */}
                          <div className="flex items-center gap-2 overflow-x-auto hide-scrollbar">
                            {attachedChatProduct.isTasteMatch && (
                              <button
                                type="button"
                                onClick={() => {
                                  const prompt = `Find complementary fashion/style items and bundle matches for "${attachedChatProduct.title}" within my budget.`;
                                  handleSendMessage(prompt, {
                                    productId: attachedChatProduct.id || attachedChatProduct.productId,
                                    actionType: 'TASTEMATCH_BUNDLE'
                                  });
                                }}
                                className="px-3 py-1.5 rounded-xl bg-purple-600/15 hover:bg-purple-600/25 border border-purple-500/30 text-[11px] font-bold text-purple-600 dark:text-purple-300 shrink-0 flex items-center gap-1 cursor-pointer transition-all"
                              >
                                <span>🧠</span> Match My Vibe
                              </button>
                            )}
                            <button
                              type="button"
                              onClick={() => {
                                const prompt = `I would like to offer 5% off for "${attachedChatProduct.title}" at ₦${discount5NGN.toLocaleString()} NGN. Can the seller accept this?`;
                                handleSendMessage(prompt, {
                                  productId: attachedChatProduct.id || attachedChatProduct.productId,
                                  proposedPrice: discount5NGN,
                                  actionType: 'COUNTER_OFFER'
                                });
                              }}
                              className="px-3 py-1.5 rounded-xl neu-button text-[11px] font-bold text-[var(--text-main)] hover:text-orange-600 shrink-0 flex items-center gap-1 cursor-pointer transition-all"
                            >
                              <Tag size={10} className="text-orange-500" /> Offer -5% (₦{discount5NGN.toLocaleString()})
                            </button>

                            <button
                              type="button"
                              onClick={() => {
                                const prompt = `Can you do a 10% discount on "${attachedChatProduct.title}" at ₦${discount10NGN.toLocaleString()} NGN?`;
                                handleSendMessage(prompt, {
                                  productId: attachedChatProduct.id || attachedChatProduct.productId,
                                  proposedPrice: discount10NGN,
                                  actionType: 'COUNTER_OFFER'
                                });
                              }}
                              className="px-3 py-1.5 rounded-xl neu-button text-[11px] font-bold text-emerald-600 dark:text-emerald-400 shrink-0 flex items-center gap-1 cursor-pointer transition-all"
                            >
                              <Sparkles size={10} /> Offer -10% (₦{discount10NGN.toLocaleString()})
                            </button>

                            <button
                              type="button"
                              onClick={() => {
                                const prompt = `What is the seller's absolute last price / lowest floor price for "${attachedChatProduct.title}"?`;
                                handleSendMessage(prompt, {
                                  productId: attachedChatProduct.id || attachedChatProduct.productId,
                                  actionType: 'REQUEST_LOWEST_PRICE'
                                });
                              }}
                              className="px-3 py-1.5 rounded-xl neu-button text-[11px] font-bold text-[var(--text-main)] shrink-0 flex items-center gap-1 cursor-pointer transition-all"
                            >
                              <span>Lowest Floor Price</span>
                            </button>

                            <button
                              type="button"
                              onClick={() => handleAddToCart(attachedChatProduct)}
                              className="px-3 py-1.5 rounded-xl bg-[#006cff] hover:bg-[#0057d9] text-white text-[11px] font-bold shrink-0 flex items-center gap-1 cursor-pointer shadow-2xs"
                            >
                              <ShoppingBag size={10} /> Add to Cart
                            </button>

                            <button
                              type="button"
                              disabled={isQuickChattingSeller}
                              onClick={() => handleQuickChatSeller(attachedChatProduct, inputText)}
                              className="px-3 py-1.5 rounded-xl neu-button text-[var(--text-main)] text-[11px] font-bold shrink-0 flex items-center gap-1 cursor-pointer disabled:opacity-50"
                            >
                              <MessageSquarePlus size={10} className="text-purple-500" /> Ask Seller
                            </button>
                          </div>
                        </div>
                      );
                    })()}

                    {/* Live Real-Time Seller Bridge Status inside Omnibox */}
                    {activeQuickChatSeller && (
                      <div className="px-4 py-2 bg-emerald-500/[0.08] border-b border-[var(--border-subtle)] flex items-center justify-between gap-2">
                        <div className="flex items-center gap-2 min-w-0">
                          <span className={`w-2 h-2 rounded-full shrink-0 ${
                            activeQuickChatSeller.isOnline ? 'bg-emerald-500 animate-pulse' : 'bg-zinc-400'
                          }`} />
                          <span className="text-[11px] font-bold truncate text-[var(--text-main)]">
                            Connected to <strong>{activeQuickChatSeller.storeName}</strong> ({activeQuickChatSeller.isOnline ? 'Online' : 'Inbox'})
                          </span>
                        </div>
                        <button
                          type="button"
                          onClick={() => {
                            setActiveQuickChatSeller(null);
                            setIsSellerTyping(false);
                          }}
                          className="p-0.5 rounded hover:bg-black/10 dark:hover:bg-white/10 text-[var(--text-muted)] hover:text-rose-500 transition-colors cursor-pointer"
                          title="Close seller bridge"
                        >
                          <X size={13} />
                        </button>
                      </div>
                    )}

                    {/* Main Input Form Row */}
                    <form
                      onSubmit={(e) => {
                        e.preventDefault();
                        if (activeQuickChatSeller && inputText.trim()) {
                          handleQuickChatSeller(activeQuickChatSeller.productItem || attachedChatProduct, inputText.trim());
                        } else if (attachedChatProduct && !inputText.trim()) {
                          handleSendMessage(`Tell me about "${attachedChatProduct.title}" and check the best price or comparable stores.`);
                        } else if (attachedChatProduct && inputText.trim()) {
                          handleSendMessage(`[Regarding "${attachedChatProduct.title}"]: ${inputText.trim()}`);
                        } else {
                          handleSendMessage();
                        }
                      }}
                      className="flex items-center gap-2.5 px-4 py-3"
                    >
                      <input
                        type="text"
                        value={inputText}
                        onChange={(e) => setInputText(e.target.value)}
                        placeholder={
                          attachedChatProduct
                            ? `Ask about "${attachedChatProduct.title.slice(0, 28)}..." or propose a price in ₦...`
                            : 'Ask PayAI anything — compare prices, negotiate deals, or inspect inventory...'
                        }
                        className="flex-1 min-w-0 bg-transparent border-none outline-none text-xs sm:text-sm font-medium text-[var(--text-main)] placeholder:text-[var(--text-muted)] py-1"
                        disabled={isSending}
                      />
                      <button
                        type="submit"
                        disabled={isSending || (!inputText.trim() && !attachedChatProduct)}
                        className="w-9 h-9 sm:w-10 sm:h-10 rounded-2xl bg-[#006cff] hover:bg-[#0057d9] text-white flex items-center justify-center shrink-0 disabled:opacity-25 transition-all cursor-pointer shadow-[0_6px_16px_rgba(0,108,255,0.3)]"
                        aria-label="Send message"
                      >
                        <Send size={15} />
                      </button>
                    </form>
                  </div>

                  {/* Subtle Footer Caption */}
                  <p className="text-[10px] font-medium text-center text-[var(--text-muted)]">
                    PayAI verifies live W-Commerce inventory, seller floor prices, and locks funds in Escrow until delivery.
                  </p>
                </div>
              </div>
          </motion.div>
        )}

          {/* TAB 2: GLOBAL DEALS & STORE LINKING */}
          {activeTab === 'discover' && (
            <motion.div
              key="discover-tab"
              custom={slideDirection}
              initial={{ x: slideDirection > 0 ? 50 : -50, opacity: 0 }}
              animate={{ x: 0, opacity: 1 }}
              exit={{ x: slideDirection < 0 ? 50 : -50, opacity: 0 }}
              transition={{ duration: 0.2 }}
              className="h-full overflow-y-auto hide-scrollbar p-4 sm:p-6 md:p-8 space-y-6"
            >
              <div className="max-w-5xl mx-auto w-full space-y-6">
                {/* Featured External Seller Stores & Global Brands */}
              <div className="rounded-3xl neu-card border border-[var(--border-subtle)] p-5 sm:p-6 w-full max-w-full min-w-0 overflow-hidden">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-5 border-b border-[var(--border-subtle)] pb-4">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-2xl bg-purple-500/10 text-purple-600 dark:text-purple-400 border border-purple-500/20 flex items-center justify-center shrink-0">
                      <Globe size={18} />
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <h2 className="text-sm sm:text-base font-black tracking-tight text-[var(--text-main)]">Connected Merchant Storefronts</h2>
                        <span className="text-[10px] font-black uppercase tracking-wider px-2.5 py-0.5 rounded-full bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20">
                          Verified
                        </span>
                      </div>
                      <p className="text-xs font-medium text-[var(--text-muted)] flex flex-wrap items-center gap-x-2 gap-y-0.5">
                        <span>Verified Pro, Premium & Ultra seller webstores.</span>
                        <span className="text-[#006cff] font-semibold text-[11px] inline-flex items-center gap-1">
                          Scroll horizontally side-by-side &bull; Dropdowns scroll vertically
                        </span>
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 self-start sm:self-auto">
                    {/* Left & Right Horizontal Scroll Navigation for Mobile & Desktop */}
                    <div className="flex items-center gap-1 sm:gap-1.5">
                      <button
                        type="button"
                        onClick={() => scrollStores('left')}
                        className="p-1.5 sm:p-2 rounded-xl neu-button text-[var(--text-main)] hover:text-[#006cff] cursor-pointer transition-all active:scale-95"
                        title="Scroll Left"
                        aria-label="Scroll Left"
                      >
                        <ChevronLeft size={15} />
                      </button>
                      <button
                        type="button"
                        onClick={() => scrollStores('right')}
                        className="p-1.5 sm:p-2 rounded-xl neu-button text-[var(--text-main)] hover:text-[#006cff] cursor-pointer transition-all active:scale-95"
                        title="Scroll Right"
                        aria-label="Scroll Right"
                      >
                        <ChevronRight size={15} />
                      </button>
                    </div>

                    <button
                      onClick={fetchDiscoverableStores}
                      disabled={isLoadingExternalStores}
                      className="px-3.5 py-2 rounded-xl neu-button text-xs font-bold text-[var(--text-main)] flex items-center gap-1.5 cursor-pointer transition-colors"
                    >
                      <RefreshCw size={13} className={isLoadingExternalStores ? 'animate-spin text-[#006cff]' : 'text-[#006cff]'} />
                      <span>Refresh</span>
                    </button>
                  </div>
                </div>

                {/* Store Cards: 1-Column Width Side-by-Side with Smooth Horizontal Scrolling across Mobile & Desktop */}
                {discoverableStores.length === 0 ? (
                  <div className="text-center py-8 text-xs font-medium text-[var(--text-muted)]">
                    No external seller stores connected yet. Pro, Premium and Ultra sellers can link their store from the Seller Dashboard!
                  </div>
                ) : (
                  <div
                    ref={storeScrollContainerRef}
                    className="flex overflow-x-auto snap-x snap-mandatory gap-3 sm:gap-4 pb-4 hide-scrollbar scroll-smooth items-start w-full min-w-0"
                  >
                    {discoverableStores.map((store) => {
                      const tier = String(store.sellerTier || 'PRO').toUpperCase();
                      const tierBadgeStyle = tier === 'ULTRA'
                        ? 'bg-purple-600 text-white font-bold'
                        : tier === 'PREMIUM'
                        ? 'bg-amber-500 text-slate-950 font-bold'
                        : 'bg-[#006cff] text-white font-bold';
                      const storeKey = `${store.storeId}-${store.linkId}`;
                      const isExpanded = expandedStoreDropdownId === storeKey;
                      const productsList = store.sampleProducts || [];
                      const productCount = store.productCount || productsList.length || 0;

                      return (
                        <motion.div
                          key={storeKey}
                          initial={{ opacity: 0, y: 15 }}
                          animate={{ opacity: 1, y: 0 }}
                          transition={{ duration: 0.25 }}
                          whileHover={{ y: -4, transition: { duration: 0.2, ease: 'easeOut' } }}
                          className="w-full min-w-full sm:min-w-[320px] sm:w-[320px] md:w-[320px] shrink-0 snap-center sm:snap-start rounded-3xl bg-white dark:bg-[#1A1A1A] overflow-hidden transition-all flex flex-col group shadow-[0_4px_24px_rgba(0,0,0,0.06)] dark:shadow-[0_4px_24px_rgba(0,0,0,0.45)] hover:shadow-2xl border-none"
                        >
                          {/* Top Badges (No Banner) */}
                          <div className="flex items-center justify-between w-full px-3.5 pt-3.5 pb-1">
                            <span className="text-[9px] sm:text-[10px] font-bold uppercase tracking-wider px-2.5 py-0.5 rounded-full bg-slate-100 dark:bg-zinc-800 text-slate-600 dark:text-zinc-300">
                              {store.platform || 'Shopify'}
                            </span>
                            <span className={`text-[9px] sm:text-[10px] uppercase font-bold tracking-wider px-2.5 py-0.5 rounded-full ${tierBadgeStyle}`}>
                              {store.sellerTier || 'PRO'}
                            </span>
                          </div>

                          {/* Vertical Store Logo (Circular Thumbnail with Gemini Rainbow 🌈 Light Design) */}
                          <div className="pt-2 pb-1 mx-auto z-10 flex flex-col items-center">
                            <motion.div
                              whileHover={{ scale: 1.1, rotate: 2 }}
                              transition={{ type: 'spring', stiffness: 400, damping: 20 }}
                              className="w-16 h-16 sm:w-18 sm:h-18 rounded-full p-[2.5px] bg-gradient-to-tr from-[#4285F4] via-[#9B72CB] via-[#D96570] to-[#00D2FF] shadow-[0_0_18px_rgba(155,114,203,0.5),0_0_30px_rgba(66,133,244,0.35)] flex items-center justify-center shrink-0 cursor-pointer relative group/avatar"
                              onClick={() => {
                                setSelectedExternalStore(store);
                                setIsStoreShowcaseOpen(true);
                              }}
                              title={`Open ${store.storeName} Showcase`}
                            >
                              {/* Gemini Rainbow Aura Glow */}
                              <div className="absolute inset-0 rounded-full bg-gradient-to-tr from-[#4285F4] via-[#9B72CB] via-[#D96570] to-[#00D2FF] blur-md opacity-60 group-hover/avatar:opacity-100 transition-opacity" />

                              {/* Inner Avatar Ring */}
                              <div className="w-full h-full rounded-full bg-white dark:bg-[#181818] p-0.5 overflow-hidden relative z-10 flex items-center justify-center border border-white/60 dark:border-white/20">
                                <StoreLogoAvatar store={store} />
                              </div>
                            </motion.div>
                          </div>

                          {/* Store Info (Centered) */}
                          <div className="px-3 sm:px-4 pt-1.5 pb-3.5 flex-1 flex flex-col justify-between text-center">
                            <div>
                              <div className="flex items-center justify-center gap-1 mb-0.5">
                                <h3
                                  onClick={() => {
                                    setSelectedExternalStore(store);
                                    setIsStoreShowcaseOpen(true);
                                  }}
                                  className="font-black text-[var(--text-main)] text-xs sm:text-sm truncate cursor-pointer hover:text-[#006cff] transition-colors"
                                  title={store.storeName}
                                >
                                  {store.storeName}
                                </h3>
                                <CheckCircle2 size={13} className="text-emerald-500 shrink-0" title="Verified W-Commerce Seller" />
                              </div>

                              <div className="flex items-center justify-center gap-1.5 text-[10px] sm:text-[11px] text-[var(--text-muted)] mb-2">
                                <span className="truncate max-w-[120px] sm:max-w-[160px] font-medium">{store.sellerName}</span>
                                <span>•</span>
                                <span className="font-semibold text-blue-500">{store.sampleProducts?.length || 0} Products</span>
                              </div>

                              <p className="text-[10px] sm:text-[11px] font-medium text-[var(--text-muted)] line-clamp-2 mb-3">
                                {store.description || 'Verified cross-border merchant. Discover their catalog inside W-Commerce or visit their official site directly.'}
                              </p>

                              {/* Products Dropdown Toggle Button */}
                              <button
                                type="button"
                                onClick={() => setExpandedStoreDropdownId(isExpanded ? null : storeKey)}
                                className={`w-full py-2 px-2.5 sm:px-3 rounded-xl text-[11px] sm:text-xs font-bold flex items-center justify-between transition-all cursor-pointer mb-2.5 border-none ${
                                  isExpanded
                                    ? 'bg-[#006cff] text-white shadow-[0_4px_12px_rgba(0,108,255,0.25)]'
                                    : 'bg-slate-100/90 dark:bg-zinc-800/80 hover:bg-slate-200/90 dark:hover:bg-zinc-700/80 text-[var(--text-main)]'
                                }`}
                                title={isExpanded ? 'Collapse products list' : 'View products dropdown'}
                              >
                                <span className="flex items-center gap-1.5 truncate">
                                  <Package size={13} className={isExpanded ? 'text-white' : 'text-[#006cff]'} />
                                  <span>Top Products</span>
                                  <span className={`text-[10px] px-1.5 py-0.2 rounded-full font-black ${
                                    isExpanded ? 'bg-white/20 text-white' : 'bg-[#006cff]/10 text-[#006cff]'
                                  }`}>
                                    {productCount}
                                  </span>
                                </span>
                                <motion.span
                                  animate={{ rotate: isExpanded ? 180 : 0 }}
                                  transition={{ duration: 0.2 }}
                                  className="shrink-0 ml-1"
                                >
                                  <ChevronDown size={14} />
                                </motion.span>
                              </button>

                              {/* Animated Vertical Products Dropdown (Matching Reference Image 2) */}
                              <AnimatePresence>
                                {isExpanded && (
                                  <motion.div
                                    initial={{ opacity: 0, height: 0 }}
                                    animate={{ opacity: 1, height: 'auto' }}
                                    exit={{ opacity: 0, height: 0 }}
                                    transition={{ type: 'spring', damping: 25, stiffness: 280 }}
                                    className="overflow-hidden mb-3 text-left pt-2"
                                  >
                                    {/* Header (Matching User's Reference Image 2) */}
                                    <div className="flex items-center justify-between px-1 mb-2">
                                      <div>
                                        <h4 className="text-xs font-black text-[var(--text-main)] flex items-center gap-1">
                                          <span>📦</span> Top Products
                                        </h4>
                                        <p className="text-[10px] font-medium text-[var(--text-muted)]">
                                          Best performing items
                                        </p>
                                      </div>
                                      <span className="text-[10px] font-black text-[#006cff] bg-[#006cff]/10 px-2 py-0.5 rounded-full">
                                        {productsList.length} items
                                      </span>
                                    </div>

                                    {/* Vertical Scrollable Products List */}
                                    <div className="max-h-72 sm:max-h-80 overflow-y-auto space-y-2 pr-1 hide-scrollbar">
                                      {productsList.length === 0 ? (
                                        <div className="py-4 text-center text-[10px] text-[var(--text-muted)]">
                                          No products cataloged for this store yet.
                                        </div>
                                      ) : (
                                        productsList.map((prod) => {
                                          const prodPrices = resolveOfferPrices(prod);
                                          return (
                                            <motion.div
                                              key={prod.id}
                                              whileHover={{ scale: 1.015, x: 2 }}
                                              whileTap={{ scale: 0.98 }}
                                              onMouseEnter={() => setHoveredPreviewProduct(prod)}
                                              onMouseLeave={() => setHoveredPreviewProduct(null)}
                                              onClick={() => {
                                                setSelectedExternalStore(store);
                                                setIsStoreShowcaseOpen(true);
                                              }}
                                              className="p-2 sm:p-2.5 rounded-2xl bg-slate-50/80 dark:bg-zinc-800/50 hover:bg-blue-50/60 dark:hover:bg-zinc-800 border-none flex items-center gap-3 transition-all cursor-pointer group/prod relative"
                                              title={`View "${decodeHtml(prod.title)}" in Store Showcase`}
                                            >
                                              {/* Circular Thumbnail - 2X SIZE (w-18 h-18 sm:w-20 sm:h-20) with Gemini Rainbow 🌈 Light Design */}
                                              <div className="w-18 h-18 sm:w-20 sm:h-20 rounded-full p-[2.5px] bg-gradient-to-tr from-[#4285F4] via-[#9B72CB] via-[#D96570] to-[#00D2FF] shadow-[0_0_14px_rgba(155,114,203,0.45)] shrink-0 flex items-center justify-center relative group-hover/prod:shadow-[0_0_22px_rgba(66,133,244,0.7)] group-hover/prod:scale-105 transition-all">
                                                <div className="w-full h-full rounded-full overflow-hidden bg-white dark:bg-[#181818] p-1 flex items-center justify-center">
                                                  <img
                                                    src={resolveProductImage(prod)}
                                                    alt={decodeHtml(prod.title)}
                                                    onError={(e) => {
                                                      e.currentTarget.src = resolveProductImage(prod);
                                                    }}
                                                    className="w-full h-full object-cover rounded-full group-hover/prod:scale-110 transition-transform duration-200"
                                                    loading="lazy"
                                                  />
                                                </div>
                                              </div>

                                              {/* Title & Price */}
                                              <div className="min-w-0 flex-1">
                                                <p className="text-xs sm:text-sm font-bold text-[var(--text-main)] truncate leading-tight group-hover/prod:text-[#006cff] transition-colors">
                                                  {decodeHtml(prod.title)}
                                                </p>
                                                <div className="flex items-center gap-2 mt-1">
                                                  <p className="text-xs sm:text-sm font-black text-[#006cff]">
                                                    ₦{prodPrices.priceNGN.toLocaleString()}
                                                  </p>
                                                  <span className="text-[10px] text-[var(--text-muted)] font-medium">
                                                    (${prodPrices.priceUSD.toFixed(2)})
                                                  </span>
                                                </div>
                                              </div>

                                              {/* 1-Click Add to Cart Button */}
                                              <button
                                                type="button"
                                                onClick={(e) => {
                                                  e.stopPropagation();
                                                  handleAddToCart(prod);
                                                }}
                                                className="p-2 rounded-xl bg-slate-100 dark:bg-zinc-800 text-[var(--text-muted)] hover:text-white hover:bg-[#006cff] transition-all cursor-pointer shrink-0 border-none"
                                                title="Add to Cart"
                                                aria-label="Add to Cart"
                                              >
                                                <ShoppingBag size={14} />
                                              </button>
                                            </motion.div>
                                          );
                                        })
                                      )}
                                    </div>
                                  </motion.div>
                                )}
                              </AnimatePresence>
                            </div>

                            {/* Action Buttons (No divider border) */}
                            <div className="pt-2.5 flex items-center gap-1.5 sm:gap-2 mt-auto">
                              <button
                                type="button"
                                onClick={() => {
                                  setSelectedExternalStore(store);
                                  setIsStoreShowcaseOpen(true);
                                }}
                                className="flex-1 py-2 px-3 rounded-xl bg-[#006cff] hover:bg-[#0057d9] text-white font-bold text-xs flex items-center justify-center gap-1.5 cursor-pointer transition-all shadow-[0_4px_12px_rgba(0,108,255,0.25)] truncate border-none"
                              >
                                <Store size={13} className="shrink-0" />
                                <span className="truncate">Explore</span>
                              </button>

                              <a
                                href={store.externalUrl || store.storeUrl || '#'}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="py-2 px-3 rounded-xl bg-slate-100 dark:bg-zinc-800 hover:bg-slate-200 dark:hover:bg-zinc-700 text-xs font-bold text-slate-700 dark:text-zinc-200 flex items-center gap-1.5 cursor-pointer transition-all shrink-0 border-none"
                                title={`Visit ${store.storeName} directly`}
                              >
                                <ExternalLink size={13} className="shrink-0" />
                                <span>Site</span>
                              </a>
                            </div>
                          </div>
                        </motion.div>
                      );
                    })}
                  </div>
                )}

                {/* Floating Product Image Pop-up on Hover with Gemini Rainbow Light Design */}
                <AnimatePresence>
                  {hoveredPreviewProduct && (
                    <motion.div
                      initial={{ opacity: 0, scale: 0.85, y: 15 }}
                      animate={{ opacity: 1, scale: 1, y: 0 }}
                      exit={{ opacity: 0, scale: 0.85, y: 10 }}
                      transition={{ type: 'spring', damping: 25, stiffness: 350 }}
                      className="fixed bottom-6 right-6 sm:bottom-8 sm:right-8 z-50 pointer-events-none max-w-[280px] w-full"
                    >
                      <div className="rounded-3xl p-[2px] bg-gradient-to-tr from-[#4285F4] via-[#9B72CB] via-[#D96570] to-[#00D2FF] shadow-[0_0_35px_rgba(155,114,203,0.5),0_15px_40px_rgba(0,0,0,0.35)] overflow-hidden">
                        <div className="bg-white dark:bg-[#181818] rounded-[22px] p-3 text-center pointer-events-auto">
                          <div className="w-full h-48 rounded-2xl overflow-hidden bg-slate-100 dark:bg-zinc-800 mb-2.5 relative shadow-inner">
                            <img
                              src={resolveProductImage(hoveredPreviewProduct)}
                              alt={decodeHtml(hoveredPreviewProduct.title)}
                              className="w-full h-full object-cover"
                            />
                            <div className="absolute top-2 left-2 px-2 py-0.5 rounded-full bg-black/60 backdrop-blur-md text-white text-[9px] font-bold">
                              HD Pop-up Preview
                            </div>
                            <div className="absolute top-2 right-2 px-2.5 py-0.5 rounded-full bg-[#006cff]/90 text-white text-[10px] font-black shadow-sm">
                              ₦{resolveOfferPrices(hoveredPreviewProduct).priceNGN.toLocaleString()}
                            </div>
                          </div>
                          <p className="font-bold text-xs sm:text-sm text-slate-900 dark:text-zinc-100 truncate">
                            {decodeHtml(hoveredPreviewProduct.title)}
                          </p>
                          <p className="text-[10px] text-slate-500 dark:text-zinc-400 mt-0.5">
                            Click item to inspect in Store Showcase
                          </p>
                        </div>
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>

              {/* 3. Native W-Commerce Products & Verified Deals Catalog */}
              <div className="rounded-3xl neu-card border border-[var(--border-subtle)] p-5 sm:p-6 min-h-[500px] flex flex-col w-full max-w-full min-w-0 overflow-hidden">
                {/* Search Bar - Full Width with Gemini Rainbow Light Focus Glow */}
                <div className="mb-4">
                  <div className="p-[1.5px] rounded-2xl bg-gradient-to-r from-[#4285F4]/30 via-[#9B72CB]/30 via-[#D96570]/30 to-[#00D2FF]/30 focus-within:from-[#4285F4] focus-within:via-[#9B72CB] focus-within:via-[#D96570] focus-within:to-[#00D2FF] focus-within:shadow-[0_0_20px_rgba(155,114,203,0.35)] transition-all">
                    <div className="relative flex items-center bg-white dark:bg-[#181818] rounded-[14px] overflow-hidden">
                      <Search size={16} className="absolute left-3.5 text-slate-400 dark:text-zinc-500 shrink-0 pointer-events-none" />
                      <input
                        type="text"
                        value={discoverQuery}
                        onChange={(e) => setDiscoverQuery(e.target.value)}
                        onKeyDown={(e) => e.key === 'Enter' && fetchCatalogOffers(discoverQuery)}
                        placeholder="Search W-Commerce products (Alpha Tech, Gadget Hub, etc.)..."
                        className="w-full bg-transparent outline-none pl-10 pr-24 py-3 text-xs sm:text-sm font-medium text-[var(--text-main)] placeholder:text-slate-400 dark:placeholder:text-zinc-500"
                      />
                      <button
                        onClick={() => fetchCatalogOffers(discoverQuery)}
                        className="absolute right-1.5 bg-gradient-to-r from-[#006cff] to-[#4285F4] hover:from-[#0057d9] hover:to-[#3367D6] text-white px-4 py-2 rounded-xl text-xs font-bold cursor-pointer shadow-md transition-all active:scale-95 shrink-0"
                      >
                        Search
                      </button>
                    </div>
                  </div>
                </div>

                {/* Store Filters Row */}
                <div className="flex items-center gap-2 overflow-x-auto min-w-0 max-w-full hide-scrollbar pb-2 mb-2 shrink-0">
                  {STORES.map((s) => (
                    <button
                      key={s.id}
                      onClick={() => {
                        setSelectedStore(s.id);
                        fetchCatalogOffers(discoverQuery, s.id, selectedCategory);
                      }}
                      className={`px-3.5 py-1.5 rounded-xl text-xs font-bold whitespace-nowrap transition-all cursor-pointer ${
                        selectedStore === s.id
                          ? 'bg-gradient-to-r from-[#006cff] to-[#4285F4] text-white shadow-[0_4px_14px_rgba(0,108,255,0.3)]'
                          : 'bg-slate-100/90 dark:bg-zinc-800/80 hover:bg-slate-200/90 dark:hover:bg-zinc-700/80 text-slate-700 dark:text-zinc-300 border border-black/[0.05] dark:border-white/[0.06]'
                      }`}
                    >
                      {s.label}
                    </button>
                  ))}
                </div>

                {/* Category Pills Row */}
                <div className="flex items-center gap-1.5 overflow-x-auto min-w-0 max-w-full hide-scrollbar mb-5 pb-1 shrink-0">
                  {CATEGORIES.map((c) => (
                    <button
                      key={c.id}
                      onClick={() => {
                        setSelectedCategory(c.id);
                        fetchCatalogOffers(discoverQuery, selectedStore, c.id);
                      }}
                      className={`px-3.5 py-1.5 rounded-full text-xs font-bold whitespace-nowrap transition-all cursor-pointer ${
                        selectedCategory === c.id
                          ? 'bg-[#006cff]/10 text-[#006cff] border border-[#006cff]/30 font-extrabold'
                          : 'bg-slate-100/70 dark:bg-zinc-800/60 hover:bg-slate-200/70 dark:hover:bg-zinc-700/60 text-slate-600 dark:text-zinc-400 border border-transparent hover:border-black/[0.06] dark:hover:border-white/[0.06]'
                      }`}
                    >
                      {c.label}
                    </button>
                  ))}
                </div>

                {/* Products Grid */}
                {isSearchingCatalog ? (
                  <div className="flex-1 flex flex-col items-center justify-center py-20 text-[var(--text-muted)] gap-2.5">
                    <RefreshCw size={22} className="animate-spin text-[#006cff]" />
                    <p className="text-xs font-bold">Fetching live offers...</p>
                  </div>
                ) : discoverItems.length === 0 ? (
                  <div className="flex-1 flex flex-col items-center justify-center py-20 text-[var(--text-muted)] text-center">
                    <Box size={32} className="opacity-40 mb-2" />
                    <h4 className="font-bold text-sm text-[var(--text-main)]">No products found</h4>
                    <p className="text-xs max-w-sm mt-1">
                      Try another search term or ask the AI Shopper tab to source specific products.
                    </p>
                    <button
                      onClick={() => switchTab('chat', -1)}
                      className="mt-4 bg-[#006cff] hover:bg-[#0057d9] text-white px-5 py-2.5 rounded-2xl text-xs font-bold cursor-pointer shadow-[0_6px_16px_rgba(0,108,255,0.25)]"
                    >
                      Ask PayAI Assistant
                    </button>
                  </div>
                ) : (
                  <div className="columns-2 sm:columns-2 md:columns-3 xl:columns-4 gap-3.5 sm:gap-4 space-y-3.5 sm:space-y-4">
                    {discoverItems.map((item, index) => {
                      const itemKey = item.id || item.externalProductId || item.externalOfferId;
                      return (
                        <div key={itemKey} className="break-inside-avoid">
                          <PayAIProductCard
                            offer={item}
                            index={index}
                            formatLocalPrice={formatLocalPrice}
                            negotiationStatus={negotiationStatusMap[itemKey]}
                            onNegotiate={handleOpenNegotiate}
                            onAddToCart={handleAddToCart}
                            onAddToChat={handleAddProductToChat}
                            onQuickView={(it) => {
                              setQuickViewItem(it);
                              setModalTab('overview');
                            }}
                          />
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            </div>
          </motion.div>
        )}

        {/* TAB 3: LIVE ORDER TRACKING & 7-CHECKPOINT MILESTONES */}
        {activeTab === 'tracking' && (
          <motion.div
            key="tracking-tab"
            custom={slideDirection}
            initial={{ x: slideDirection > 0 ? 50 : -50, opacity: 0 }}
            animate={{ x: 0, opacity: 1 }}
            exit={{ x: slideDirection < 0 ? 50 : -50, opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="h-full overflow-y-auto hide-scrollbar p-4 sm:p-6 md:p-8"
          >
            <div className="max-w-4xl mx-auto w-full">
              <PayAIOrderTracker
                shipments={shipments}
                formatLocalPrice={formatLocalPrice}
                onOrderUpdated={() => {
                  fetchCart();
                  fetchShipments();
                }}
                onAskAI={handleAskAIAboutOrder}
                onRefresh={fetchShipments}
                loading={loadingShipments}
                initialSearchCode={trackingSearchCode}
              />
            </div>
          </motion.div>
        )}
        </AnimatePresence>
      </div>

      {/* Product Quick View / Preview Modal */}
      <AnimatePresence>
        {quickViewItem && (() => {
          const qvPrices = resolveOfferPrices(quickViewItem);
          const isExternalItem = ['amazon', 'aliexpress', 'ebay', 'asos'].includes((quickViewItem.provider || '').toLowerCase());
          return (
            <div 
              className="fixed inset-0 z-[120] flex items-center justify-center p-3 sm:p-5 bg-black/50 backdrop-blur-xs overflow-hidden"
              onClick={() => setQuickViewItem(null)}
            >
              <motion.div
                initial={{ scale: 0.96, opacity: 0, y: 12 }}
                animate={{ scale: 1, opacity: 1, y: 0 }}
                exit={{ scale: 0.96, opacity: 0, y: 12 }}
                className="w-full max-w-2xl sm:max-w-3xl max-h-[90vh] overflow-y-auto custom-scrollbar p-5 sm:p-7 rounded-3xl neu-card border border-[var(--border-subtle)] shadow-2xl relative flex flex-col"
                onClick={(e) => e.stopPropagation()}
              >
                {/* Header Bar */}
                <div className="flex items-center justify-between pb-3 mb-4 border-b border-[var(--border-subtle)] gap-2 flex-wrap">
                  <div className="flex items-center gap-2 flex-wrap">
                    {isExternalItem ? (
                      <span className="text-[10px] font-black uppercase tracking-wider px-3 py-1 rounded-full bg-purple-500/10 text-purple-600 dark:text-purple-400 border border-purple-500/20 flex items-center gap-1.5">
                        <Globe size={11} />
                        {quickViewItem.provider} • External Reference
                      </span>
                    ) : (
                      <span className="text-[10px] font-black uppercase tracking-wider px-3 py-1 rounded-full bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20 flex items-center gap-1.5">
                        <ShieldCheck size={12} className="text-emerald-500" />
                        W-COMMERCE VERIFIED • {quickViewItem.seller?.name || quickViewItem.sellerName || 'Alpha Tech Store'}
                      </span>
                    )}
                    <span className="text-[10px] font-bold px-2.5 py-0.5 rounded-full bg-blue-500/10 text-blue-600 dark:text-blue-400 border border-blue-500/20">
                      Escrow Protected
                    </span>
                  </div>

                  <button
                    onClick={() => setQuickViewItem(null)}
                    className="w-8 h-8 rounded-full neu-button text-[var(--text-muted)] hover:text-rose-500 flex items-center justify-center cursor-pointer transition-colors shrink-0"
                  >
                    <X size={15} />
                  </button>
                </div>

                {/* Main Product Hero Split */}
                <div className="grid grid-cols-1 md:grid-cols-12 gap-5 mb-5 items-start">
                  {/* Left Column: Image */}
                  <div className="md:col-span-5 flex flex-col items-center">
                    <div className="w-full h-52 sm:h-60 rounded-2xl neu-card-pressed p-3 flex items-center justify-center overflow-hidden relative group bg-white/40 dark:bg-black/20">
                      <img
                        src={resolveProductImage(quickViewItem)}
                        alt={quickViewItem.title}
                        className="max-h-full max-w-full object-contain transition-transform duration-300 group-hover:scale-105"
                      />
                      <div className="absolute top-2.5 right-2.5 px-2 py-1 rounded-lg bg-black/60 text-white backdrop-blur-xs flex items-center gap-1 text-[11px] font-bold">
                        <Star size={11} className="fill-amber-400 text-amber-400" />
                        <span>{Number(quickViewItem.rating || 4.8).toFixed(1)}</span>
                      </div>
                    </div>
                  </div>

                  {/* Right Column: Details & Actions */}
                  <div className="md:col-span-7 flex flex-col justify-between h-full">
                    <div>
                      <h3 className="font-extrabold text-base sm:text-lg text-[var(--text-main)] mb-1.5 leading-snug">
                        {decodeHtml(quickViewItem.title)}
                      </h3>

                      <div className="flex items-baseline gap-2.5 mb-2.5 flex-wrap">
                        <span className="text-xl sm:text-2xl font-black text-[var(--text-main)] tracking-tight">
                          {isExternalItem ? `$${qvPrices.priceUSD.toFixed(2)} USD` : `₦${qvPrices.priceNGN.toLocaleString()} NGN`}
                        </span>
                        <span className="text-xs font-bold text-[#006cff]">
                          {isExternalItem ? `≈ ₦${qvPrices.priceNGN.toLocaleString()} NGN` : `≈ $${qvPrices.priceUSD.toFixed(2)} USD`}
                        </span>
                        <span className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20">
                          In Stock
                        </span>
                      </div>

                      <div className="flex items-center gap-2 text-xs text-[var(--text-muted)] mb-3 flex-wrap">
                        {quickViewItem.category && (
                          <span className="px-2 py-0.5 rounded-md neu-card-pressed text-[10px] font-semibold text-[var(--text-muted)]">
                            {quickViewItem.category}
                          </span>
                        )}
                        <span>•</span>
                        <span className="flex items-center gap-1 font-medium">
                          <Package size={12} className="text-blue-500" />
                          Verified Escrow Delivery
                        </span>
                      </div>

                      <p className="text-xs font-medium text-[var(--text-muted)] mb-4 leading-relaxed line-clamp-3">
                        {quickViewItem.description || 'Native W-Commerce merchant product with verified escrow protection, quality inspection, and direct express checkout.'}
                      </p>
                    </div>

                    {isExternalItem ? (
                      <div className="space-y-2.5 pt-2">
                        <div className="p-2.5 rounded-xl bg-amber-500/10 border border-amber-500/20 text-xs font-medium text-amber-800 dark:text-amber-300">
                          Global store listing for reference only.
                        </div>
                        <div className="flex items-center gap-2.5">
                          <a
                            href={quickViewItem.url || '#'}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="flex-1 py-2.5 px-4 rounded-xl bg-[#006cff] hover:bg-[#0057d9] text-white font-bold text-xs flex items-center justify-center gap-2 cursor-pointer transition-colors shadow-xs"
                          >
                            <ExternalLink size={13} />
                            <span>Visit External Store</span>
                          </a>
                          <button
                            onClick={() => {
                              const prompt = `Can you find native W-Commerce alternatives for "${quickViewItem.title}"?`;
                              setQuickViewItem(null);
                              switchTab('chat', -1);
                              handleSendMessage(prompt);
                            }}
                            className="py-2.5 px-4 rounded-xl neu-button text-xs font-bold text-[var(--text-main)] flex items-center gap-1.5 cursor-pointer hover:border-orange-500/40 transition-colors"
                          >
                            <Sparkles size={13} className="text-orange-500" />
                            <span>Find on W-Commerce</span>
                          </button>
                        </div>
                      </div>
                    ) : (
                      <div className="flex items-center gap-2.5 pt-2">
                        <button
                          onClick={() => {
                            const itemToNegotiate = quickViewItem;
                            setQuickViewItem(null);
                            handleOpenNegotiate(itemToNegotiate);
                          }}
                          className="py-2.5 px-4 rounded-xl neu-button text-xs font-bold text-orange-600 dark:text-orange-400 flex items-center gap-1.5 cursor-pointer hover:border-orange-500/40 transition-colors"
                        >
                          <Sparkles size={13} />
                          <span>Negotiate</span>
                        </button>

                        <button
                          onClick={() => {
                            handleAddToCart(quickViewItem);
                            setQuickViewItem(null);
                          }}
                          className="flex-1 py-2.5 px-4 rounded-xl bg-[#006cff] hover:bg-[#0057d9] text-white font-bold text-xs flex items-center justify-center gap-2 cursor-pointer shadow-[0_6px_16px_rgba(0,108,255,0.25)] transition-all hover:scale-[1.01]"
                        >
                          <ShoppingBag size={14} />
                          <span>Add to Cart</span>
                        </button>
                      </div>
                    )}
                  </div>
                </div>

                {/* Product Recommendations Section */}
                <div className="pt-4 border-t border-[var(--border-subtle)]">
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-2">
                      <div className="w-6 h-6 rounded-lg bg-orange-500/10 text-orange-500 flex items-center justify-center">
                        <Sparkles size={13} />
                      </div>
                      <h4 className="font-extrabold text-xs sm:text-sm text-[var(--text-main)] uppercase tracking-wider">
                        Recommended For You
                      </h4>
                      <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-blue-500/10 text-blue-600 dark:text-blue-400 border border-blue-500/20">
                        AI Curated
                      </span>
                    </div>
                    {quickViewRecommendations.length > 0 && (
                      <span className="text-[11px] font-semibold text-[var(--text-muted)]">
                        {quickViewRecommendations.length} similar deals
                      </span>
                    )}
                  </div>

                  {loadingQuickViewRecommendations ? (
                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                      {[1, 2, 3].map((idx) => (
                        <div key={idx} className="neu-card-pressed rounded-2xl p-3 animate-pulse">
                          <div className="w-full h-24 rounded-xl bg-gray-300/40 dark:bg-gray-700/40 mb-2" />
                          <div className="h-3 w-3/4 rounded bg-gray-300/40 dark:bg-gray-700/40 mb-1.5" />
                          <div className="h-3 w-1/2 rounded bg-gray-300/40 dark:bg-gray-700/40" />
                        </div>
                      ))}
                    </div>
                  ) : quickViewRecommendations.length > 0 ? (
                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                      {quickViewRecommendations.map((recItem) => {
                        const recPrices = resolveOfferPrices(recItem);
                        const recImg = resolveProductImage(recItem);
                        const recTitle = decodeHtml(recItem.title || recItem.name || 'Recommended Product');
                        const recCategory = recItem.category || 'Similar Choice';

                        return (
                          <div
                            key={recItem.id || recItem._id || recTitle}
                            onClick={() => setQuickViewItem(recItem)}
                            className="group relative neu-card p-2.5 rounded-2xl border border-[var(--border-subtle)] hover:border-[#006cff]/40 transition-all cursor-pointer flex flex-col justify-between hover:shadow-lg hover:-translate-y-0.5"
                          >
                            {/* Product Thumbnail */}
                            <div className="w-full h-24 rounded-xl neu-card-pressed p-2 mb-2 flex items-center justify-center overflow-hidden relative bg-white/40 dark:bg-black/20">
                              <img
                                src={recImg}
                                alt={recTitle}
                                className="max-h-full max-w-full object-contain transition-transform duration-300 group-hover:scale-105"
                                onError={(e) => { e.currentTarget.src = PLACEHOLDER_IMAGE; }}
                              />
                              <span className="absolute top-1 left-1 text-[8px] font-black uppercase tracking-wider px-1.5 py-0.5 rounded-md bg-black/60 text-white backdrop-blur-xs">
                                {recCategory}
                              </span>
                            </div>

                            {/* Title & Price */}
                            <div>
                              <h5 className="font-bold text-xs text-[var(--text-main)] line-clamp-2 mb-1 group-hover:text-[#006cff] transition-colors leading-tight">
                                {recTitle}
                              </h5>
                              <div className="flex items-baseline gap-1.5 flex-wrap mb-2">
                                <span className="text-xs font-black text-[var(--text-main)]">
                                  ₦{recPrices.priceNGN.toLocaleString()}
                                </span>
                                <span className="text-[10px] font-bold text-[#006cff]">
                                  ≈ ${recPrices.priceUSD.toFixed(2)}
                                </span>
                              </div>
                            </div>

                            {/* Action Buttons */}
                            <div className="flex items-center gap-1.5 pt-1.5 border-t border-[var(--border-subtle)] mt-auto">
                              <button
                                type="button"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setQuickViewItem(recItem);
                                }}
                                className="flex-1 py-1 px-2 rounded-lg neu-button text-[10px] font-bold text-[var(--text-muted)] hover:text-[var(--text-main)] flex items-center justify-center gap-1 transition-colors"
                              >
                                <Eye size={11} />
                                <span>Preview</span>
                              </button>

                              <button
                                type="button"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleAddToCart(recItem);
                                }}
                                className="py-1 px-2.5 rounded-lg bg-[#006cff] hover:bg-[#0057d9] text-white text-[10px] font-bold flex items-center justify-center gap-1 cursor-pointer transition-colors shadow-xs"
                                title="1-Click Add to Cart"
                              >
                                <ShoppingBag size={11} />
                                <span>Add</span>
                              </button>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  ) : (
                    <div className="text-center py-4 px-3 rounded-2xl neu-card-pressed text-xs text-[var(--text-muted)]">
                      <Sparkles size={16} className="mx-auto text-orange-400 mb-1" />
                      <p>No similar items found for this specific listing right now.</p>
                    </div>
                  )}
                </div>
              </motion.div>
            </div>
          );
        })()}

        {/* Live Warehouse Photo Zoom Modal */}
        {photoZoomModal && (
          <div
            className="fixed inset-0 z-[140] flex items-center justify-center p-3 sm:p-5 bg-black/75 backdrop-blur-sm cursor-pointer"
            onClick={() => setPhotoZoomModal(null)}
          >
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="relative max-w-3xl w-full max-h-[88vh] neu-card rounded-3xl overflow-hidden border border-[var(--border-subtle)] shadow-2xl p-4 sm:p-5 flex flex-col"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex items-center justify-between pb-3 mb-3 border-b border-[var(--border-subtle)]">
                <div>
                  <h4 className="font-bold text-sm sm:text-base text-[var(--text-main)] flex items-center gap-2">
                    <Camera size={15} className="text-emerald-500" />
                    <span>{photoZoomModal.badge || 'Live Warehouse Macro Inspection'}</span>
                  </h4>
                  {photoZoomModal.caption && (
                    <p className="text-xs text-[var(--text-muted)] mt-0.5">{photoZoomModal.caption}</p>
                  )}
                </div>
                <button
                  type="button"
                  onClick={() => setPhotoZoomModal(null)}
                  className="w-8 h-8 rounded-full neu-button text-[var(--text-muted)] hover:text-rose-500 flex items-center justify-center transition-colors cursor-pointer"
                >
                  <X size={15} />
                </button>
              </div>

              <div className="flex-1 min-h-0 flex items-center justify-center neu-card-pressed rounded-2xl overflow-hidden p-2">
                <img
                  src={photoZoomModal.url}
                  alt={photoZoomModal.caption || 'Inspection Macro'}
                  className="max-h-[62vh] max-w-full object-contain rounded-xl"
                  onError={(e) => {
                    e.currentTarget.src = 'https://images.unsplash.com/photo-1523275335684-37898b6baf30?w=800';
                  }}
                />
              </div>

              <div className="mt-3 flex items-center justify-between text-xs text-[var(--text-muted)] flex-wrap gap-2">
                <span className="flex items-center gap-1.5 font-mono font-bold text-[11px]">
                  <ShieldCheck size={14} className="text-emerald-500" /> W-Commerce Tamper-Evident Fulfillment Log
                </span>
                <button
                  type="button"
                  onClick={() => setPhotoZoomModal(null)}
                  className="px-4 py-2 rounded-xl bg-[#006cff] hover:bg-[#0057d9] text-white font-bold text-xs cursor-pointer transition-all"
                >
                  Close
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* PayAI Dedicated Shopping Cart Drawer */}
      <PayAICartDrawer
        isOpen={isCartDrawerOpen}
        onClose={() => setIsCartDrawerOpen(false)}
        cart={cart}
        sessionId={sessionId}
        destinationCountry={destinationCountry}
        formatLocalPrice={formatLocalPrice}
        onProceedToCheckout={handleProceedToCheckout}
        onRefreshCart={() => fetchCart()}
      />

      {/* PayAI PayPal Sandbox & Live Checkout Modal */}
      <PayPalCheckoutModal
        isOpen={isPayPalModalOpen}
        onClose={() => setIsPayPalModalOpen(false)}
        quote={checkoutQuote}
        cart={cart}
        formatLocalPrice={formatLocalPrice}
        onOrderCompleted={handleOrderCompleted}
      />

      {/* External Seller Store Showcase Modal */}
      <ExternalStoreShowcaseModal
        isOpen={isStoreShowcaseOpen}
        store={selectedExternalStore}
        onClose={() => setIsStoreShowcaseOpen(false)}
        formatLocalPrice={formatLocalPrice}
        resolveOfferPrices={resolveOfferPrices}
        onAddToCart={handleAddToCart}
        destinationCountry={destinationCountry}
      />

      {/* Buyer Wallet Top Up Modal */}
      <TopUpModal
        isOpen={isTopUpOpen}
        onClose={() => {
          setIsTopUpOpen(false);
          refreshWalletStore();
        }}
      />
      </main>
    </div>
  );
}
