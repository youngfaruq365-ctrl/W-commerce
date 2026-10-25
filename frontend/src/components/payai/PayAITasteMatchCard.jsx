import React, { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Sparkles, ShoppingBag, RefreshCw, CheckCircle2, ShieldCheck, 
  Tag, ArrowRight, Utensils, Flame, ChevronRight, Clock, Plus, Check, X, AlertCircle
} from 'lucide-react';
import toast from 'react-hot-toast';
import { convertVideoToImageUrl, isVideoUrl, resolveProductImage, FALLBACK_PACKAGE_BOX_IMG } from '../../utils/imageHelpers';
import { useCartStore } from '../../store/cartStore';

// Preset alternative swap options matching cultural taste palates
const ALTERNATIVE_SWAPS = [
  {
    id: 'alt-suya-wrap',
    title: 'Gourmet Suya Beef Wrap with Spicy Aioli',
    price: 1800,
    currency: 'NGN',
    imageUrl: 'https://images.unsplash.com/photo-1544025162-d76694265947?w=500',
    mealType: 'Lunch',
    tasteTag: '🌶️ Spicy Palate',
    calories: '480 kcal'
  },
  {
    id: 'alt-asun-pasta',
    title: 'Peppered Asun Stir-Fry Noodles',
    price: 2100,
    currency: 'NGN',
    imageUrl: 'https://images.unsplash.com/photo-1569718212165-3a8278d5f624?w=500',
    mealType: 'Dinner',
    tasteTag: '🍲 Suya / Peppered Variety',
    calories: '550 kcal'
  },
  {
    id: 'alt-plantain-bowl',
    title: 'Grilled Croaker Fish & Sweet Plantain Bites',
    price: 2400,
    currency: 'NGN',
    imageUrl: 'https://images.unsplash.com/photo-1519708227418-c8fd9a32b7a2?w=500',
    mealType: 'Lunch',
    tasteTag: '⚡ Comfort Dining',
    calories: '510 kcal'
  },
  {
    id: 'alt-akara-waffles',
    title: 'Crispy Akara Waffles & Spiced Honey Dip',
    price: 1400,
    currency: 'NGN',
    imageUrl: 'https://images.unsplash.com/photo-1525351484163-7529414344d8?w=500',
    mealType: 'Breakfast',
    tasteTag: '⚡ Comfort Dining',
    calories: '420 kcal'
  }
];

export default function PayAITasteMatchCard({
  plan = {},
  formatLocalPrice,
  onSendMessage,
  onLockEscrowCheckout,
  onOpenCart
}) {
  const addToCartStore = useCartStore((state) => state.addToCart);

  // Normalize initial data
  const initialBudgetLimit = Number(
    plan.budgetLimit || plan.targetBudget || plan.budget || plan.maxBudget || plan.budgetLimitNGN || 6000
  );

  // Default days & meals if not provided or empty
  const initialSchedule = useMemo(() => {
    if (Array.isArray(plan.days) && plan.days.length > 0) {
      return plan.days;
    }
    if (Array.isArray(plan.schedule) && plan.schedule.length > 0) {
      return plan.schedule;
    }
    if (Array.isArray(plan.items) && plan.items.length > 0) {
      // Group items by day
      const grouped = {};
      plan.items.forEach((item, idx) => {
        const dayKey = item.day || item.dayNumber || (Math.floor(idx / 2) + 1);
        if (!grouped[dayKey]) {
          grouped[dayKey] = {
            dayNumber: dayKey,
            dayLabel: `Day ${dayKey}`,
            subtitle: dayKey === 1 ? 'Breakfast & Lunch' : 'Lunch & Dinner',
            meals: []
          };
        }
        grouped[dayKey].meals.push({
          id: item.id || item.productId || `item-${idx}`,
          title: item.title || item.name || 'Artisanal Meal',
          mealType: item.mealType || item.category || (idx % 2 === 0 ? 'Breakfast' : 'Lunch'),
          price: Number(item.price || item.priceNGN || 1800),
          currency: item.currency || 'NGN',
          imageUrl: item.imageUrl || item.image || 'https://images.unsplash.com/photo-1546069901-ba9599a7e63c?w=500',
          sellerName: item.sellerName || item.storeName || 'Verified Kitchen'
        });
      });
      return Object.values(grouped);
    }

    // Default canonical 3-day plan matching prompt specification (₦5,400 / ₦6,000)
    return [
      {
        dayNumber: 1,
        dayLabel: 'Day 1',
        subtitle: 'Breakfast & Lunch',
        meals: [
          {
            id: 'taste-d1-m1',
            title: 'Golden Akara & Warm Honey Custard Bowl',
            mealType: 'Breakfast',
            price: 1200,
            currency: 'NGN',
            imageUrl: 'https://images.unsplash.com/photo-1525351484163-7529414344d8?w=500',
            sellerName: 'Lagos Island Artisan Bakery',
            tasteTag: '⚡ Comfort Dining'
          },
          {
            id: 'taste-d1-m2',
            title: 'Smoked Suya Spiced Rice & Diced Plantain',
            mealType: 'Lunch',
            price: 2200,
            currency: 'NGN',
            imageUrl: 'https://images.unsplash.com/photo-1546069901-ba9599a7e63c?w=500',
            sellerName: 'Suya Central Kitchen',
            tasteTag: '🌶️ Spicy Palate'
          }
        ]
      },
      {
        dayNumber: 2,
        dayLabel: 'Day 2',
        subtitle: 'Lunch Comfort',
        meals: [
          {
            id: 'taste-d2-m1',
            title: 'Smoky Firewood Jollof & Peppered Grilled Turkey',
            mealType: 'Lunch',
            price: 2000,
            currency: 'NGN',
            imageUrl: 'https://images.unsplash.com/photo-1565299624946-b28f40a0ae38?w=500',
            sellerName: 'Bukateria Express VI',
            tasteTag: '🍲 Suya / Peppered Variety'
          }
        ]
      },
      {
        dayNumber: 3,
        dayLabel: 'Day 3',
        subtitle: 'High Protein Dinner',
        meals: [
          {
            id: 'taste-d3-m1',
            title: 'Crispy Peppered Suya Beef Strips & Yam Wedges',
            mealType: 'Lunch',
            price: 2000,
            currency: 'NGN',
            imageUrl: 'https://images.unsplash.com/photo-1544025162-d76694265947?w=500',
            sellerName: 'Glover Court Grill Hub',
            tasteTag: '🌶️ Spicy Palate'
          }
        ]
      }
    ];
  }, [plan]);

  // Dynamic state for days & meals so user can interactively swap items
  const [scheduleState, setScheduleState] = useState(initialSchedule);
  const [selectedDayFilter, setSelectedDayFilter] = useState('ALL'); // 'ALL' or dayNumber
  const [activeSwapTarget, setActiveSwapTarget] = useState(null); // { dayIdx, mealIdx, meal }
  const [isAddingAll, setIsAddingAll] = useState(false);

  // Inferred Cultural Taste Tags
  const culturalTasteTags = useMemo(() => {
    if (Array.isArray(plan.tasteTags) && plan.tasteTags.length > 0) return plan.tasteTags;
    if (Array.isArray(plan.culturalTasteTags) && plan.culturalTasteTags.length > 0) return plan.culturalTasteTags;
    if (Array.isArray(plan.inferredTasteTags) && plan.inferredTasteTags.length > 0) return plan.inferredTasteTags;
    if (Array.isArray(plan.tags) && plan.tags.length > 0) return plan.tags;
    return ['🌶️ Spicy Palate', '🍲 Suya / Peppered Variety', '⚡ Comfort Dining'];
  }, [plan]);

  // Calculate live total price from scheduleState
  const currentTotalPrice = useMemo(() => {
    return scheduleState.reduce((daySum, day) => {
      const mealsTotal = (day.meals || []).reduce((mSum, m) => mSum + (Number(m.price) || 0), 0);
      return daySum + mealsTotal;
    }, 0);
  }, [scheduleState]);

  // Compute under / over budget
  const budgetSavings = initialBudgetLimit - currentTotalPrice;
  const isUnderBudget = budgetSavings >= 0;
  const budgetProgressPercent = Math.min(100, Math.round((currentTotalPrice / initialBudgetLimit) * 100));

  // Format currency helper fallback
  const renderPrice = (amt) => {
    if (typeof formatLocalPrice === 'function') {
      return formatLocalPrice(amt, 'NGN', 'NG');
    }
    return `₦${Number(amt).toLocaleString()}`;
  };

  // Perform interactive swap of a meal
  const handleApplySwap = (replacementItem) => {
    if (!activeSwapTarget) return;
    const { dayIdx, mealIdx } = activeSwapTarget;

    const updated = [...scheduleState];
    const targetDay = { ...updated[dayIdx] };
    const targetMeals = [...targetDay.meals];

    targetMeals[mealIdx] = {
      ...replacementItem,
      mealType: targetMeals[mealIdx].mealType || replacementItem.mealType || 'Meal'
    };

    targetDay.meals = targetMeals;
    updated[dayIdx] = targetDay;

    setScheduleState(updated);
    setActiveSwapTarget(null);

    toast.success(`Swapped in "${replacementItem.title}"! Budget updated.`);
  };

  // Add entire plan to cart
  const handleAddEntirePlanToCart = async () => {
    setIsAddingAll(true);
    let totalItemsAdded = 0;

    try {
      for (const day of scheduleState) {
        for (const meal of day.meals || []) {
          const itemId = meal.id || meal.productId || `meal-${Date.now()}-${Math.random()}`;
          try {
            await addToCartStore(itemId, 1);
            totalItemsAdded++;
          } catch (e) {
            console.warn('TasteMatch single add cart error:', e);
          }
        }
      }

      toast.success(
        `Added all ${totalItemsAdded} TasteMatch meals to Cart (${renderPrice(currentTotalPrice)})!`,
        {
          duration: 4000,
          icon: '🧠'
        }
      );

      if (onOpenCart) {
        onOpenCart();
      }
    } catch (err) {
      console.error('Error adding entire plan to cart:', err);
      toast.error('Failed to add all meals to cart. Please try again.');
    } finally {
      setIsAddingAll(false);
    }
  };

  // Handle single meal add
  const handleAddSingleMeal = async (meal) => {
    try {
      const itemId = meal.id || meal.productId || `meal-${Date.now()}`;
      await addToCartStore(itemId, 1);
      toast.success(`"${meal.title}" added to cart!`);
    } catch (err) {
      toast.error('Could not add meal to cart.');
    }
  };

  // Filtered days
  const displayedDays = useMemo(() => {
    if (selectedDayFilter === 'ALL') return scheduleState;
    return scheduleState.filter((d) => d.dayNumber === selectedDayFilter);
  }, [scheduleState, selectedDayFilter]);

  return (
    <div className="w-full mt-3.5 p-4 sm:p-6 rounded-3xl neu-card border border-[var(--border-subtle)] space-y-5 overflow-hidden relative">
      {/* Subtle background glow */}
      <div className="absolute top-0 right-0 w-72 h-72 bg-gradient-to-bl from-emerald-500/10 via-purple-500/5 to-transparent rounded-full blur-3xl pointer-events-none -mr-20 -mt-20" />

      {/* 1. Header & Budget Progress Meter */}
      <div className="space-y-3 relative z-10">
        <div className="flex items-center justify-between gap-3 flex-wrap">
          <div className="flex items-center gap-2.5">
            <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-indigo-500 to-purple-600 text-white flex items-center justify-center shadow-md shadow-indigo-500/20 shrink-0">
              <span className="text-lg">🧠</span>
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-sm sm:text-base font-black text-[var(--text-main)] tracking-tight">
                  PayAI TasteMatch™ Plan
                </h3>
                <span className="text-[10px] font-extrabold uppercase px-2 py-0.5 rounded-full bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 border border-indigo-500/20">
                  3-Day Schedule
                </span>
              </div>
              <p className="text-[11px] font-medium text-[var(--text-muted)] mt-0.5">
                Curated meals optimized for your personal flavor cravings & budget limit
              </p>
            </div>
          </div>

          {/* Under Budget Badge */}
          <div className="flex items-center gap-2">
            <span
              className={`text-xs font-black px-3 py-1.5 rounded-2xl flex items-center gap-1.5 shadow-xs transition-all ${
                isUnderBudget
                  ? 'bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border border-emerald-500/30'
                  : 'bg-rose-500/15 text-rose-600 dark:text-rose-400 border border-rose-500/30'
              }`}
            >
              <CheckCircle2 size={13} className={isUnderBudget ? 'text-emerald-500' : 'text-rose-500'} />
              <span>
                {isUnderBudget
                  ? `${renderPrice(budgetSavings)} Under Budget`
                  : `${renderPrice(Math.abs(budgetSavings))} Over Budget`}
              </span>
            </span>
          </div>
        </div>

        {/* Sleek Budget Progress Meter Bar */}
        <div className="p-3.5 rounded-2xl neu-card-pressed space-y-2">
          <div className="flex items-baseline justify-between text-xs">
            <span className="text-[11px] font-bold text-[var(--text-muted)] flex items-center gap-1.5">
              <span>Allocated Basket:</span>
              <strong className="text-sm font-black text-[var(--text-main)]">
                {renderPrice(currentTotalPrice)}
              </strong>
              <span className="text-[11px] text-[var(--text-muted)] font-medium">
                / {renderPrice(initialBudgetLimit)} target
              </span>
            </span>
            <span className="text-[11px] font-mono font-black text-emerald-600 dark:text-emerald-400">
              {budgetProgressPercent}% Used
            </span>
          </div>

          <div className="w-full h-2.5 rounded-full bg-zinc-200/80 dark:bg-zinc-800/80 overflow-hidden p-0.5">
            <motion.div
              initial={{ width: 0 }}
              animate={{ width: `${budgetProgressPercent}%` }}
              transition={{ duration: 0.8, ease: 'easeOut' }}
              className={`h-full rounded-full transition-all ${
                isUnderBudget
                  ? 'bg-gradient-to-r from-emerald-500 via-teal-400 to-emerald-400 shadow-[0_0_12px_rgba(16,185,129,0.4)]'
                  : 'bg-gradient-to-r from-amber-500 to-rose-500 shadow-[0_0_12px_rgba(244,63,94,0.4)]'
              }`}
            />
          </div>
        </div>
      </div>

      {/* 2. Qloo Cultural Taste Badge & Inferred Tags */}
      <div className="p-3.5 rounded-2xl bg-gradient-to-r from-purple-500/10 via-indigo-500/5 to-transparent border border-purple-500/20 space-y-2 relative z-10">
        <div className="flex items-center justify-between gap-2 flex-wrap">
          <div className="flex items-center gap-2">
            <span className="w-5 h-5 rounded-lg bg-gradient-to-br from-purple-500 to-indigo-600 text-white flex items-center justify-center text-[10px] shadow-xs font-black">
              ✨
            </span>
            <span className="text-xs font-black tracking-tight bg-gradient-to-r from-purple-600 to-indigo-600 dark:from-purple-300 dark:to-indigo-300 bg-clip-text text-transparent">
              Powered by Qloo Taste AI
            </span>
          </div>
          <span className="text-[10px] font-bold text-[var(--text-muted)]">
            Inferred Cultural Taste Profile
          </span>
        </div>

        <div className="flex items-center gap-2 flex-wrap pt-0.5">
          {culturalTasteTags.map((tag, tIdx) => {
            const tagLabel = typeof tag === 'string' ? tag : tag.label || tag.name || 'Taste Match';
            return (
              <span
                key={tIdx}
                className="text-xs font-bold px-3 py-1 rounded-xl neu-card text-[var(--text-main)] border border-purple-500/20 hover:border-purple-500/40 transition-colors flex items-center gap-1.5 shadow-xs"
              >
                <span>{tagLabel}</span>
              </span>
            );
          })}
        </div>
      </div>

      {/* 3. Interactive Schedule Breakdown */}
      <div className="space-y-3.5 relative z-10">
        <div className="flex items-center justify-between gap-2 flex-wrap">
          <div className="flex items-center gap-2">
            <Clock size={14} className="text-[#006cff]" />
            <h4 className="text-xs font-black uppercase tracking-wider text-[var(--text-main)]">
              Daily Schedule Breakdown
            </h4>
          </div>

          {/* Day Tabs */}
          <div className="flex items-center gap-1.5 bg-black/5 dark:bg-white/5 p-1 rounded-2xl">
            <button
              type="button"
              onClick={() => setSelectedDayFilter('ALL')}
              className={`px-2.5 py-1 rounded-xl text-[11px] font-bold transition-all cursor-pointer ${
                selectedDayFilter === 'ALL'
                  ? 'bg-white dark:bg-zinc-800 text-[#006cff] shadow-xs'
                  : 'text-[var(--text-muted)] hover:text-[var(--text-main)]'
              }`}
            >
              All Days
            </button>
            {scheduleState.map((d) => (
              <button
                key={d.dayNumber}
                type="button"
                onClick={() => setSelectedDayFilter(d.dayNumber)}
                className={`px-2.5 py-1 rounded-xl text-[11px] font-bold transition-all cursor-pointer ${
                  selectedDayFilter === d.dayNumber
                    ? 'bg-white dark:bg-zinc-800 text-[#006cff] shadow-xs'
                    : 'text-[var(--text-muted)] hover:text-[var(--text-main)]'
                }`}
              >
                {d.dayLabel || `Day ${d.dayNumber}`}
              </button>
            ))}
          </div>
        </div>

        {/* Days & Meals Grid */}
        <div className="space-y-4">
          {displayedDays.map((day, dayIndex) => {
            const actualDayIdx = scheduleState.findIndex((s) => s.dayNumber === day.dayNumber);
            const dayMealsTotal = (day.meals || []).reduce((acc, m) => acc + (Number(m.price) || 0), 0);

            return (
              <div
                key={day.dayNumber || dayIndex}
                className="p-3.5 sm:p-4 rounded-2xl neu-card border border-white/60 dark:border-white/[0.06] space-y-3"
              >
                {/* Day Header */}
                <div className="flex items-center justify-between border-b border-[var(--border-subtle)] pb-2.5">
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-black text-[var(--text-main)] px-2.5 py-0.5 rounded-lg neu-card-pressed text-[#006cff]">
                      {day.dayLabel || `Day ${day.dayNumber}`}
                    </span>
                    {day.subtitle && (
                      <span className="text-[11px] font-semibold text-[var(--text-muted)]">
                        • {day.subtitle}
                      </span>
                    )}
                  </div>
                  <span className="text-xs font-extrabold text-[var(--text-main)]">
                    {renderPrice(dayMealsTotal)}
                  </span>
                </div>

                {/* Meals in Day */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {(day.meals || []).map((meal, mealIndex) => {
                    const rawImg = meal.imageUrl || meal.image || '';
                    const thumbnail = convertVideoToImageUrl(rawImg) || resolveProductImage(rawImg, meal.title, 'food');

                    return (
                      <div
                        key={meal.id || mealIndex}
                        className="group p-3 rounded-2xl neu-card-pressed hover:border-[#006cff]/30 border border-transparent transition-all flex flex-col justify-between space-y-2.5 relative"
                      >
                        <div className="flex items-start gap-3">
                          {/* Thumbnail with Video/Image fallback */}
                          <div className="w-14 h-14 rounded-xl overflow-hidden bg-zinc-100 dark:bg-zinc-800 shrink-0 relative border border-[var(--border-subtle)]">
                            {isVideoUrl(rawImg) && !thumbnail ? (
                              <video
                                src={rawImg}
                                className="w-full h-full object-cover"
                                muted
                                playsInline
                                preload="metadata"
                              />
                            ) : (
                              <img
                                src={thumbnail}
                                alt={meal.title}
                                className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                                onError={(e) => {
                                  e.currentTarget.onerror = null;
                                  e.currentTarget.src = FALLBACK_PACKAGE_BOX_IMG;
                                }}
                              />
                            )}
                            <div className="absolute top-1 left-1 bg-black/60 backdrop-blur-xs text-[9px] font-bold text-white px-1.5 py-0.2 rounded-md">
                              {meal.mealType || 'Meal'}
                            </div>
                          </div>

                          {/* Content */}
                          <div className="min-w-0 flex-1">
                            <h5 className="text-xs font-black text-[var(--text-main)] leading-snug line-clamp-2">
                              {meal.title}
                            </h5>
                            <div className="flex items-center gap-1.5 mt-1 text-[10px] text-[var(--text-muted)]">
                              <span>{meal.sellerName || 'Verified Kitchen'}</span>
                              {meal.tasteTag && (
                                <span className="text-purple-600 dark:text-purple-300 font-bold truncate">
                                  • {meal.tasteTag}
                                </span>
                              )}
                            </div>
                          </div>
                        </div>

                        {/* Price & Swap pill footer */}
                        <div className="flex items-center justify-between pt-2 border-t border-black/5 dark:border-white/5">
                          <span className="text-xs font-black text-emerald-600 dark:text-emerald-400">
                            {renderPrice(meal.price)}
                          </span>

                          <div className="flex items-center gap-1.5">
                            {/* Swap pill button */}
                            <button
                              type="button"
                              onClick={() => {
                                setActiveSwapTarget({
                                  dayIdx: actualDayIdx,
                                  mealIdx: mealIndex,
                                  meal
                                });
                              }}
                              className="px-2.5 py-1 rounded-xl neu-button text-[var(--text-main)] hover:text-[#006cff] text-[10px] font-bold flex items-center gap-1 cursor-pointer transition-all shadow-xs"
                              title="Swap this meal with an alternative"
                            >
                              <RefreshCw size={10} className="text-[#006cff]" />
                              <span>Swap</span>
                            </button>

                            {/* Quick single add to cart */}
                            <button
                              type="button"
                              onClick={() => handleAddSingleMeal(meal)}
                              className="p-1 rounded-xl neu-button text-[var(--text-muted)] hover:text-emerald-500 cursor-pointer transition-all shadow-xs"
                              title="Add just this item to cart"
                            >
                              <Plus size={12} />
                            </button>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* 4. Action Footer */}
      <div className="pt-2 border-t border-[var(--border-subtle)] space-y-2.5 relative z-10">
        <div className="flex items-center gap-2.5 flex-wrap">
          {/* Primary Button: Add Entire TasteMatch Plan to Cart */}
          <button
            type="button"
            disabled={isAddingAll}
            onClick={handleAddEntirePlanToCart}
            className="flex-1 min-w-[200px] py-3 px-5 rounded-2xl bg-gradient-to-r from-[#006cff] to-blue-600 hover:from-[#0057d9] hover:to-blue-700 text-white text-xs sm:text-sm font-black flex items-center justify-center gap-2 shadow-[0_8px_20px_rgba(0,108,255,0.28)] cursor-pointer transition-all active:scale-[0.98] disabled:opacity-60"
          >
            {isAddingAll ? (
              <>
                <RefreshCw size={15} className="animate-spin" />
                <span>Adding TasteMatch Plan...</span>
              </>
            ) : (
              <>
                <ShoppingBag size={15} />
                <span>Add Entire TasteMatch Plan to Cart ({renderPrice(currentTotalPrice)})</span>
              </>
            )}
          </button>

          {/* Secondary Button 1: Auto-Negotiate Plan */}
          <button
            type="button"
            onClick={() => {
              if (onSendMessage) {
                onSendMessage(
                  `Can you auto-negotiate a bundle discount on my entire 3-day TasteMatch plan (${renderPrice(currentTotalPrice)}) with the verified vendors?`
                );
              }
            }}
            className="py-3 px-4 rounded-2xl neu-button text-[var(--text-main)] hover:text-emerald-500 text-xs font-bold flex items-center justify-center gap-1.5 cursor-pointer transition-all shadow-sm shrink-0"
          >
            <Tag size={13} className="text-orange-500" />
            <span>🤝 Auto-Negotiate Plan</span>
          </button>

          {/* Secondary Button 2: Lock in Escrow Checkout */}
          <button
            type="button"
            onClick={() => {
              if (onLockEscrowCheckout) {
                onLockEscrowCheckout({
                  planTitle: 'PayAI TasteMatch™ 3-Day Plan',
                  totalNGN: currentTotalPrice,
                  totalUSD: Number((currentTotalPrice / 1480).toFixed(2)),
                  items: scheduleState.flatMap((d) => d.meals || [])
                });
              } else if (onSendMessage) {
                onSendMessage(`I am ready to lock in escrow checkout for this TasteMatch plan (${renderPrice(currentTotalPrice)})`);
              }
            }}
            className="py-3 px-4 rounded-2xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold flex items-center justify-center gap-1.5 shadow-[0_6px_16px_rgba(16,185,129,0.25)] cursor-pointer transition-all shrink-0"
          >
            <ShieldCheck size={14} />
            <span>🔒 Lock in Escrow Checkout</span>
          </button>
        </div>
      </div>

      {/* 5. Swap Replacement Modal / Popover */}
      <AnimatePresence>
        {activeSwapTarget && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs">
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 10 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 10 }}
              className="w-full max-w-md rounded-3xl neu-card p-5 border border-white/60 dark:border-white/10 space-y-4 shadow-2xl relative"
            >
              <div className="flex items-center justify-between">
                <div>
                  <h4 className="text-sm font-black text-[var(--text-main)] flex items-center gap-2">
                    <RefreshCw size={14} className="text-[#006cff]" />
                    <span>Swap Cultural Meal</span>
                  </h4>
                  <p className="text-[11px] text-[var(--text-muted)] font-medium mt-0.5">
                    Replacing: <strong className="text-[var(--text-main)]">{activeSwapTarget.meal?.title}</strong>
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => setActiveSwapTarget(null)}
                  className="p-1.5 rounded-xl neu-button text-[var(--text-muted)] hover:text-[var(--text-main)] cursor-pointer"
                >
                  <X size={15} />
                </button>
              </div>

              <div className="space-y-2.5 max-h-[300px] overflow-y-auto pr-1">
                <p className="text-[10px] font-black uppercase tracking-wider text-[var(--text-muted)]">
                  Recommended Alternatives Matching Taste Profile
                </p>

                {ALTERNATIVE_SWAPS.map((alt) => (
                  <div
                    key={alt.id}
                    onClick={() => handleApplySwap(alt)}
                    className="group p-3 rounded-2xl neu-card-pressed hover:border-emerald-500/40 border border-transparent transition-all cursor-pointer flex items-center justify-between gap-3"
                  >
                    <div className="flex items-center gap-2.5 min-w-0">
                      <img
                        src={alt.imageUrl}
                        alt={alt.title}
                        className="w-11 h-11 rounded-xl object-cover shrink-0"
                      />
                      <div className="min-w-0">
                        <h6 className="text-xs font-bold text-[var(--text-main)] truncate group-hover:text-[#006cff] transition-colors">
                          {alt.title}
                        </h6>
                        <div className="flex items-center gap-1.5 mt-0.5 text-[10px] text-[var(--text-muted)]">
                          <span className="text-emerald-600 dark:text-emerald-400 font-bold">
                            {renderPrice(alt.price)}
                          </span>
                          <span>• {alt.tasteTag}</span>
                        </div>
                      </div>
                    </div>

                    <button
                      type="button"
                      className="px-2.5 py-1 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-[10px] font-bold shrink-0 transition-colors"
                    >
                      Choose
                    </button>
                  </div>
                ))}
              </div>

              <div className="pt-2 border-t border-[var(--border-subtle)] flex items-center justify-between">
                <button
                  type="button"
                  onClick={() => {
                    const mealTitle = activeSwapTarget.meal?.title;
                    setActiveSwapTarget(null);
                    if (onSendMessage) {
                      onSendMessage(
                        `Suggest 3 spicy comfort alternatives to swap with "${mealTitle}" within my ₦6,000 budget`
                      );
                    }
                  }}
                  className="text-xs font-bold text-[#006cff] hover:underline cursor-pointer flex items-center gap-1"
                >
                  <Sparkles size={12} />
                  <span>Ask AI for custom alternatives</span>
                </button>
                <button
                  type="button"
                  onClick={() => setActiveSwapTarget(null)}
                  className="px-3 py-1.5 rounded-xl neu-button text-xs font-bold text-[var(--text-main)] cursor-pointer"
                >
                  Cancel
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
