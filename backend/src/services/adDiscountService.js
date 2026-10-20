const prisma = require('../utils/prismaClient');
const logger = require('../utils/logger');
const { sendPushNotification } = require('./oneSignalService');

// Ad Discount logic
const STAGES = [
  { stage: 1, discountPct: 2, timerMins: 20 },
  { stage: 2, discountPct: 4, timerMins: 10 },
  { stage: 3, discountPct: 5, timerMins: 0 }
];

async function getEligibleAdDiscount(productId) {
  const product = await prisma.product.findUnique({
    where: { id: productId },
    include: { store: { include: { user: true } } }
  });

  if (!product || !product.store) return null;

  // Seller tier check
  const tier = (product.store.sellerTier || 'STANDARD').toUpperCase();
  const isPremiumStore = product.store.isPremium || false;
  const userSubscription = (product.store.user?.subscriptionTier || '').toUpperCase();
  const price = parseFloat(product.price);

  let isEligible = false;
  const hasPremiumStatus = tier === 'PRO' || tier === 'PREMIUM' || isPremiumStore || userSubscription.includes('PREMIUM');
  const hasEliteStatus = tier === 'ULTRA' || tier === 'ELITE';

  if (hasPremiumStatus && price > 1000) isEligible = true;
  if (hasEliteStatus && price > 2500) isEligible = true;

  if (isEligible) {
    return product;
  }
  return null;
}

async function startAdDiscountSession(buyerId, productId) {
  const product = await getEligibleAdDiscount(productId);
  if (!product) throw new Error('Product not eligible for ad discounts.');

  const stageDef = STAGES[0];
  const nextClaimTime = new Date(Date.now() + stageDef.timerMins * 60000);

  const session = await prisma.adDiscountSession.upsert({
    where: {
      buyerId_productId: {
        buyerId,
        productId
      }
    },
    update: {
      currentDiscountPct: stageDef.discountPct,
      currentStage: stageDef.stage,
      nextClaimAvailableAt: nextClaimTime,
      isCompleted: false
    },
    create: {
      buyerId,
      productId,
      currentDiscountPct: stageDef.discountPct,
      currentStage: stageDef.stage,
      nextClaimAvailableAt: nextClaimTime,
      isCompleted: false
    }
  });

  if (stageDef.timerMins > 0) {
    sendPushNotification(
      buyerId, 
      `Your next Ad Discount tier is ready! Claim your additional discount now.`, 
      nextClaimTime
    );
  }

  return session;
}

async function claimNextAdDiscount(buyerId, productId) {
  const session = await prisma.adDiscountSession.findUnique({
    where: {
      buyerId_productId: { buyerId, productId }
    }
  });

  if (!session) throw new Error('No active ad discount session found.');
  if (session.isCompleted) throw new Error('You have already claimed the maximum discount.');

  if (session.nextClaimAvailableAt && Date.now() < session.nextClaimAvailableAt.getTime()) {
      throw new Error('Next ad claim is not available yet.');
  }

  const nextStageNum = session.currentStage + 1;
  const stageDef = STAGES.find(s => s.stage === nextStageNum);

  if (!stageDef) {
    throw new Error('Maximum discount already reached.');
  }

  const isFinalStage = nextStageNum === STAGES.length;
  const nextClaimTime = isFinalStage ? null : new Date(Date.now() + stageDef.timerMins * 60000);

  const updatedSession = await prisma.adDiscountSession.update({
    where: { id: session.id },
    data: {
      currentDiscountPct: stageDef.discountPct,
      currentStage: stageDef.stage,
      nextClaimAvailableAt: nextClaimTime,
      isCompleted: isFinalStage
    }
  });

  if (stageDef.timerMins > 0) {
    sendPushNotification(
      buyerId, 
      `Your next Ad Discount tier is ready! Claim your additional discount now.`, 
      nextClaimTime
    );
  }

  return updatedSession;
}

async function getActiveSession(buyerId, productId) {
  const session = await prisma.adDiscountSession.findUnique({
    where: {
      buyerId_productId: { buyerId, productId }
    }
  });
  return session;
}

module.exports = {
  getEligibleAdDiscount,
  startAdDiscountSession,
  claimNextAdDiscount,
  getActiveSession
};
