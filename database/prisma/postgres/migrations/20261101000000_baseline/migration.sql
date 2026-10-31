-- CreateTable
CREATE TABLE "User" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "passwordHash" TEXT NOT NULL,
    "withdrawPin" TEXT,
    "fullName" TEXT NOT NULL,
    "role" TEXT NOT NULL DEFAULT 'BUYER',
    "avatarUrl" TEXT,
    "phone" TEXT,
    "username" TEXT,
    "dob" TEXT,
    "gender" TEXT,
    "bio" TEXT,
    "instagram" TEXT,
    "twitter" TEXT,
    "website" TEXT,
    "isVerified" BOOLEAN NOT NULL DEFAULT false,
    "kycTier" INTEGER NOT NULL DEFAULT 1,
    "verificationLevel" TEXT NOT NULL DEFAULT 'BASIC',
    "hasPaidAccess" BOOLEAN NOT NULL DEFAULT false,
    "subscriptionTier" TEXT NOT NULL DEFAULT 'NONE',
    "accessExpiry" TIMESTAMP(3),
    "verificationCode" TEXT,
    "verificationCodeExpires" TIMESTAMP(3),
    "balance" DECIMAL(65,30) NOT NULL DEFAULT 0.0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "country" TEXT,
    "googleId" TEXT,
    "appleId" TEXT,
    "authProvider" TEXT NOT NULL DEFAULT 'LOCAL',
    "failedLoginAttempts" INTEGER NOT NULL DEFAULT 0,
    "lockoutUntil" TIMESTAMP(3),
    "isFlagged" BOOLEAN NOT NULL DEFAULT false,
    "deletionScheduledAt" TIMESTAMP(3),
    "deletionReason" TEXT,
    "bankName" TEXT,
    "accountNumber" TEXT,
    "accountName" TEXT,
    "bankCode" TEXT,
    "paystackSubaccount" TEXT,
    "stripeConnectId" TEXT,
    "stripeConnectStatus" TEXT,
    "stripeConnectChargesEnabled" BOOLEAN NOT NULL DEFAULT false,
    "stripeConnectPayoutsEnabled" BOOLEAN NOT NULL DEFAULT false,
    "notificationPrefs" TEXT NOT NULL DEFAULT '{"email":true,"orderUpdates":true,"marketing":false}',
    "pushSubscription" TEXT,
    "trialStartDate" TIMESTAMP(3),
    "trialEndDate" TIMESTAMP(3),
    "trialStatus" TEXT NOT NULL DEFAULT 'NONE',
    "isTrialActive" BOOLEAN NOT NULL DEFAULT false,
    "trialConversionDate" TIMESTAMP(3),
    "trialPlan" TEXT,
    "trialPromoCode" TEXT,

    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AdDiscountSession" (
    "id" TEXT NOT NULL,
    "buyerId" TEXT NOT NULL,
    "productId" TEXT NOT NULL,
    "currentDiscountPct" INTEGER NOT NULL DEFAULT 0,
    "currentStage" INTEGER NOT NULL DEFAULT 0,
    "nextClaimAvailableAt" TIMESTAMP(3),
    "expiresAt" TIMESTAMP(3),
    "isCompleted" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "AdDiscountSession_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Address" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "type" TEXT NOT NULL DEFAULT 'SHIPPING',
    "street" TEXT NOT NULL,
    "city" TEXT NOT NULL,
    "state" TEXT NOT NULL,
    "postalCode" TEXT NOT NULL,
    "country" TEXT NOT NULL,
    "isDefault" BOOLEAN NOT NULL DEFAULT false,

    CONSTRAINT "Address_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Store" (
    "id" TEXT NOT NULL,
    "sellerId" TEXT NOT NULL,
    "storeName" TEXT NOT NULL,
    "category" TEXT,
    "description" TEXT,
    "logoUrl" TEXT,
    "bannerUrl" TEXT,
    "country" TEXT NOT NULL,
    "isVerified" BOOLEAN NOT NULL DEFAULT false,
    "kycTier" INTEGER NOT NULL DEFAULT 1,
    "trustScore" INTEGER NOT NULL DEFAULT 50,
    "approvalStatus" TEXT NOT NULL DEFAULT 'PENDING',
    "approvedAt" TIMESTAMP(3),
    "rejectionReason" TEXT,
    "complianceScore" INTEGER,
    "lastComplianceCheck" TIMESTAMP(3),
    "performanceScore" INTEGER NOT NULL DEFAULT 50,
    "banningRate" DOUBLE PRECISION NOT NULL DEFAULT 0.0,
    "disputePenaltyAppliedAt" TIMESTAMP(3),
    "isPremium" BOOLEAN NOT NULL DEFAULT false,
    "showAdsOnStorefront" BOOLEAN NOT NULL DEFAULT false,
    "portfolioLayout" TEXT,
    "portfolioSlug" TEXT,
    "portfolioConfig" TEXT,
    "brandStory" TEXT,
    "storeDna" TEXT,
    "storeDnaDraft" TEXT,
    "storeDnaVersion" INTEGER NOT NULL DEFAULT 1,
    "storeDnaUpdatedAt" TIMESTAMP(3),
    "averageRating" DOUBLE PRECISION NOT NULL DEFAULT 0.0,
    "totalReviews" INTEGER NOT NULL DEFAULT 0,
    "defaultDeliveryDays" INTEGER NOT NULL DEFAULT 5,
    "onTimeDeliveryRate" DECIMAL(65,30) NOT NULL DEFAULT 0.0,
    "avgResponseMinutes" INTEGER NOT NULL DEFAULT 45,
    "totalSales" DECIMAL(65,30) NOT NULL DEFAULT 0,
    "totalOrders" INTEGER NOT NULL DEFAULT 0,
    "repeatBuyerRate" DECIMAL(65,30) NOT NULL DEFAULT 0,
    "topSellingProductId" TEXT,
    "topSellingProductName" TEXT,
    "hasPendingAlerts" BOOLEAN NOT NULL DEFAULT false,
    "alertMessage" TEXT,
    "lastAlertAt" TIMESTAMP(3),
    "sellerTier" TEXT NOT NULL DEFAULT 'STANDARD',
    "sellerPlanId" TEXT,
    "enabledBenefits" TEXT,
    "bankName" TEXT,
    "accountNumber" TEXT,
    "accountName" TEXT,
    "bankCode" TEXT,
    "paystackRecipientCode" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Store_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "buyer_requests" (
    "id" TEXT NOT NULL,
    "buyer_id" TEXT NOT NULL,
    "product_name" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "budget" DECIMAL(65,30) NOT NULL,
    "preferredBudgetMax" DECIMAL(65,30),
    "quantity" INTEGER NOT NULL DEFAULT 1,
    "urgency" TEXT NOT NULL DEFAULT 'STANDARD',
    "category" TEXT,
    "location" TEXT,
    "neededBy" TIMESTAMP(3),
    "isBulkRequest" BOOLEAN NOT NULL DEFAULT false,
    "demandScore" INTEGER NOT NULL DEFAULT 0,
    "status" TEXT NOT NULL DEFAULT 'OPEN',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "buyer_requests_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "request_responses" (
    "id" TEXT NOT NULL,
    "request_id" TEXT NOT NULL,
    "seller_id" TEXT NOT NULL,
    "response_type" TEXT NOT NULL,
    "message" TEXT,
    "quoted_price" DECIMAL(65,30),
    "alternativeSuggestion" TEXT,
    "estimatedDeliveryDays" INTEGER,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "request_responses_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "StoreIntegration" (
    "id" TEXT NOT NULL,
    "storeId" TEXT NOT NULL,
    "platform" TEXT NOT NULL,
    "credentials" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'pending',
    "lastSync" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "StoreIntegration_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Product" (
    "id" TEXT NOT NULL,
    "storeId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "price" DECIMAL(65,30) NOT NULL,
    "stock" INTEGER NOT NULL,
    "shippingFee" DECIMAL(65,30) NOT NULL DEFAULT 0,
    "lowStockThreshold" INTEGER NOT NULL DEFAULT 5,
    "audioUrl" TEXT,
    "audioTitle" TEXT,
    "category" TEXT NOT NULL,
    "subCategory" TEXT,
    "tags" TEXT,
    "sku" TEXT,
    "hsCode" TEXT,
    "weightKg" DOUBLE PRECISION,
    "originHub" TEXT,
    "estimatedDeliveryDays" INTEGER NOT NULL DEFAULT 5,
    "productGroupId" TEXT,
    "normalizedTitle" TEXT,
    "isFlashSale" BOOLEAN NOT NULL DEFAULT false,
    "flashPrice" DECIMAL(65,30),
    "flashEndsAt" TIMESTAMP(3),
    "earlyAccessTiers" TEXT,
    "exclusiveTier" TEXT,
    "urgencyLevel" TEXT NOT NULL DEFAULT 'NORMAL',
    "autoBoostExpiresAt" TIMESTAMP(3),
    "isUrgencyBannerVisible" BOOLEAN NOT NULL DEFAULT false,
    "isAdBoosted" BOOLEAN NOT NULL DEFAULT false,
    "adBoostExpiresAt" TIMESTAMP(3),
    "viewCount" INTEGER NOT NULL DEFAULT 0,
    "soldCount" INTEGER NOT NULL DEFAULT 0,
    "rating" DOUBLE PRECISION NOT NULL DEFAULT 0.0,
    "isArchived" BOOLEAN NOT NULL DEFAULT false,
    "isNegotiable" BOOLEAN NOT NULL DEFAULT false,
    "bottomPrice" DECIMAL(65,30),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Product_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ProductImage" (
    "id" TEXT NOT NULL,
    "productId" TEXT NOT NULL,
    "url" TEXT NOT NULL,
    "altText" TEXT,
    "isPrimary" BOOLEAN NOT NULL DEFAULT false,
    "position" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "ProductImage_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ProductVideo" (
    "id" TEXT NOT NULL,
    "productId" TEXT NOT NULL,
    "videoUrl" TEXT NOT NULL,
    "thumbnailUrl" TEXT,
    "caption" TEXT,
    "viewCount" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ProductVideo_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ProductOption" (
    "id" TEXT NOT NULL,
    "productId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "value" TEXT NOT NULL,
    "priceAdj" DECIMAL(65,30) NOT NULL DEFAULT 0.0,

    CONSTRAINT "ProductOption_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ProductOffer" (
    "id" TEXT NOT NULL,
    "productId" TEXT NOT NULL,
    "buyerId" TEXT NOT NULL,
    "sellerId" TEXT NOT NULL,
    "offerAmount" DECIMAL(65,30) NOT NULL,
    "quantity" INTEGER NOT NULL DEFAULT 1,
    "message" TEXT,
    "status" TEXT NOT NULL DEFAULT 'PENDING',
    "expiresAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ProductOffer_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ProductQuestion" (
    "id" TEXT NOT NULL,
    "productId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "question" TEXT NOT NULL,
    "answer" TEXT,
    "answeredById" TEXT,
    "answeredAt" TIMESTAMP(3),
    "status" TEXT NOT NULL DEFAULT 'OPEN',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ProductQuestion_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ProductComparison" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "productId" TEXT NOT NULL,
    "comparedProductId" TEXT NOT NULL,
    "metadata" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ProductComparison_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ProductModelAsset" (
    "id" TEXT NOT NULL,
    "productId" TEXT NOT NULL,
    "assetUrl" TEXT NOT NULL,
    "format" TEXT NOT NULL DEFAULT 'GLB',
    "thumbnailUrl" TEXT,
    "fileSizeKb" INTEGER,
    "status" TEXT NOT NULL DEFAULT 'ACTIVE',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ProductModelAsset_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Pool" (
    "id" TEXT NOT NULL,
    "productId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "targetSize" INTEGER NOT NULL,
    "currentSize" INTEGER NOT NULL DEFAULT 0,
    "minBuyIn" DECIMAL(65,30) NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'ACTIVE',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Pool_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PoolParticipant" (
    "id" TEXT NOT NULL,
    "poolId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "joinedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "status" TEXT NOT NULL DEFAULT 'COMMITTED',

    CONSTRAINT "PoolParticipant_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Order" (
    "id" TEXT NOT NULL,
    "buyerId" TEXT NOT NULL,
    "parentOrderId" TEXT,
    "totalAmount" DECIMAL(65,30) NOT NULL,
    "currency" TEXT NOT NULL DEFAULT 'USD',
    "shippingCost" DECIMAL(65,30) NOT NULL,
    "taxAmount" DECIMAL(65,30) NOT NULL,
    "commissionRate" DOUBLE PRECISION NOT NULL DEFAULT 0.10,
    "commissionAmount" DECIMAL(65,30),
    "sellerAmount" DECIMAL(65,30),
    "status" TEXT NOT NULL DEFAULT 'PENDING',
    "paymentStatus" TEXT NOT NULL DEFAULT 'PENDING',
    "paymentMethod" TEXT,
    "stripePaymentId" TEXT,
    "proofUrl" TEXT,
    "escrowId" TEXT,
    "orderType" TEXT NOT NULL DEFAULT 'PHYSICAL',
    "idempotencyKey" TEXT,
    "sellerId" TEXT,
    "packingSerial" TEXT,
    "packingConfirmationCode" TEXT,
    "packedAt" TIMESTAMP(3),
    "packageConfirmedAt" TIMESTAMP(3),
    "readyToShipAt" TIMESTAMP(3),
    "responseDueAt" TIMESTAMP(3),
    "escalatedAt" TIMESTAMP(3),
    "unpackPenaltyApplied" BOOLEAN NOT NULL DEFAULT false,
    "unshipPenaltyApplied" BOOLEAN NOT NULL DEFAULT false,
    "estimatedDeliveryDate" TIMESTAMP(3),
    "deliveryConfirmationCode" TEXT,
    "deliveryConfirmedAt" TIMESTAMP(3),
    "lastTrackingUpdateAt" TIMESTAMP(3),
    "isDeliveryDelayed" BOOLEAN NOT NULL DEFAULT false,
    "delayReason" TEXT,
    "deliveredAt" TIMESTAMP(3),
    "escrowReleaseAt" TIMESTAMP(3),
    "escrowReleasedAt" TIMESTAMP(3),
    "isConsolidated" BOOLEAN NOT NULL DEFAULT false,
    "hubLocation" TEXT,
    "consolidatedPackageId" TEXT,
    "shippingAddressId" TEXT,
    "shippingAddress" TEXT,
    "trackingNumber" TEXT,
    "carrier" TEXT,
    "carrierService" TEXT,
    "originCountry" TEXT,
    "destinationCountry" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "expiresAt" TIMESTAMP(3),

    CONSTRAINT "Order_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PaymentProof" (
    "id" TEXT NOT NULL,
    "orderId" TEXT NOT NULL,
    "buyerId" TEXT NOT NULL,
    "buyerName" TEXT NOT NULL,
    "sellerId" TEXT NOT NULL,
    "sellerName" TEXT NOT NULL,
    "amount" DECIMAL(65,30) NOT NULL,
    "currency" TEXT NOT NULL DEFAULT 'USD',
    "bankName" TEXT NOT NULL,
    "accountNumber" TEXT,
    "transactionRef" TEXT NOT NULL,
    "proofImageUrl" TEXT NOT NULL,
    "proofImageId" TEXT,
    "status" TEXT NOT NULL DEFAULT 'PENDING',
    "sellerResponse" TEXT,
    "sellerVerifiedAt" TIMESTAMP(3),
    "adminReviewedAt" TIMESTAMP(3),
    "adminNotes" TEXT,
    "receiptUrl" TEXT,
    "receiptNumber" TEXT,
    "receiptGeneratedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "buyerNotified" BOOLEAN NOT NULL DEFAULT false,
    "sellerNotified" BOOLEAN NOT NULL DEFAULT false,
    "adminNotified" BOOLEAN NOT NULL DEFAULT false,

    CONSTRAINT "PaymentProof_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PaymentAuditLog" (
    "id" TEXT NOT NULL,
    "paymentProofId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "userName" TEXT NOT NULL,
    "userRole" TEXT NOT NULL,
    "action" TEXT NOT NULL,
    "previousStatus" TEXT,
    "newStatus" TEXT,
    "notes" TEXT,
    "ipAddress" TEXT,
    "userAgent" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "PaymentAuditLog_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "OrderItem" (
    "id" TEXT NOT NULL,
    "orderId" TEXT NOT NULL,
    "productId" TEXT NOT NULL,
    "quantity" INTEGER NOT NULL,
    "priceAtTime" DECIMAL(65,30) NOT NULL,
    "variants" TEXT,
    "status" TEXT NOT NULL DEFAULT 'PENDING',

    CONSTRAINT "OrderItem_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Dispute" (
    "id" TEXT NOT NULL,
    "orderId" TEXT NOT NULL,
    "buyerId" TEXT NOT NULL,
    "sellerId" TEXT NOT NULL,
    "reason" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "evidenceUrls" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'OPEN',
    "resolution" TEXT,
    "adminNotes" TEXT,
    "adminId" TEXT,
    "sellerResponse" TEXT,
    "sellerResponseAt" TIMESTAMP(3),
    "buyerResponse" TEXT,
    "responseDeadline" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Dispute_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "DisputeMessage" (
    "id" TEXT NOT NULL,
    "disputeId" TEXT NOT NULL,
    "senderId" TEXT NOT NULL,
    "senderType" TEXT NOT NULL,
    "message" TEXT NOT NULL,
    "evidenceUrl" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "DisputeMessage_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PackingIssue" (
    "id" TEXT NOT NULL,
    "orderId" TEXT NOT NULL,
    "buyerId" TEXT NOT NULL,
    "sellerId" TEXT NOT NULL,
    "issueType" TEXT NOT NULL,
    "buyerMessage" TEXT,
    "status" TEXT NOT NULL DEFAULT 'OPEN',
    "responseDeadline" TIMESTAMP(3),
    "sellerRespondedAt" TIMESTAMP(3),
    "escalatedAt" TIMESTAMP(3),
    "responseLatencyMinutes" INTEGER,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PackingIssue_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "VerificationRequest" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'PENDING',
    "idType" TEXT,
    "idNumber" TEXT,
    "documentUrls" TEXT NOT NULL,
    "adminNotes" TEXT,
    "sellerType" TEXT,
    "identityData" TEXT,
    "businessData" TEXT,
    "ownershipData" TEXT,
    "addressData" TEXT,
    "payoutData" TEXT,
    "sectionStatuses" TEXT,
    "rejectionReasons" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "VerificationRequest_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Review" (
    "id" TEXT NOT NULL,
    "productId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "sellerId" TEXT NOT NULL,
    "rating" INTEGER NOT NULL,
    "comment" TEXT,
    "images" TEXT NOT NULL,
    "isFeatured" BOOLEAN NOT NULL DEFAULT false,
    "reply" TEXT,
    "repliedAt" TIMESTAMP(3),
    "helpfulCount" INTEGER NOT NULL DEFAULT 0,
    "reportCount" INTEGER NOT NULL DEFAULT 0,
    "isTopReview" BOOLEAN NOT NULL DEFAULT false,
    "verifiedPurchase" BOOLEAN NOT NULL DEFAULT true,
    "orderId" TEXT,
    "transactionHash" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Review_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Conversation" (
    "id" TEXT NOT NULL,
    "storeId" TEXT,
    "type" TEXT NOT NULL DEFAULT 'DIRECT',
    "status" TEXT NOT NULL DEFAULT 'ACTIVE',
    "context" TEXT,
    "contextId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Conversation_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ConversationParticipant" (
    "id" TEXT NOT NULL,
    "conversationId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "lastReadAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ConversationParticipant_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Message" (
    "id" TEXT NOT NULL,
    "conversationId" TEXT NOT NULL,
    "senderId" TEXT NOT NULL,
    "recipientId" TEXT,
    "productId" TEXT,
    "orderId" TEXT,
    "content" TEXT NOT NULL,
    "attachmentUrl" TEXT,
    "metadata" TEXT,
    "isSystemMessage" BOOLEAN NOT NULL DEFAULT false,
    "isAutoReply" BOOLEAN NOT NULL DEFAULT false,
    "responseTimeMinutes" INTEGER,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Message_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "QuickReplyTemplate" (
    "id" TEXT NOT NULL,
    "sellerId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "content" TEXT NOT NULL,
    "category" TEXT NOT NULL DEFAULT 'general',
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "usageCount" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "QuickReplyTemplate_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Notification" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "body" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "isRead" BOOLEAN NOT NULL DEFAULT false,
    "linkUrl" TEXT,
    "data" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Notification_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SellerFollow" (
    "id" TEXT NOT NULL,
    "buyerId" TEXT NOT NULL,
    "sellerId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "SellerFollow_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "BuyerProductInteraction" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "productId" TEXT NOT NULL,
    "interactionType" TEXT NOT NULL,
    "weight" INTEGER NOT NULL DEFAULT 1,
    "source" TEXT,
    "metadata" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "BuyerProductInteraction_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "BuyerNotification" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "orderId" TEXT,
    "message" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "channel" TEXT NOT NULL DEFAULT 'in_app',
    "readStatus" BOOLEAN NOT NULL DEFAULT false,
    "isVisible" BOOLEAN NOT NULL DEFAULT true,
    "deliveredAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "BuyerNotification_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Transaction" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "amount" DECIMAL(65,30) NOT NULL,
    "currency" TEXT NOT NULL DEFAULT 'USD',
    "status" TEXT NOT NULL DEFAULT 'COMPLETED',
    "referenceId" TEXT,
    "description" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Transaction_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Wallet" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "gongAvailable" DECIMAL(65,30) NOT NULL DEFAULT 0,
    "gongHeld" DECIMAL(65,30) NOT NULL DEFAULT 0,
    "gxAvailable" DECIMAL(65,30) NOT NULL DEFAULT 0,
    "gxHeld" DECIMAL(65,30) NOT NULL DEFAULT 0,
    "xpAvailable" DECIMAL(65,30) NOT NULL DEFAULT 0,
    "xpHeld" DECIMAL(65,30) NOT NULL DEFAULT 0,
    "status" TEXT NOT NULL DEFAULT 'ACTIVE',
    "freezeReason" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Wallet_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "WalletLedgerEntry" (
    "id" TEXT NOT NULL,
    "walletId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "coin" TEXT NOT NULL,
    "direction" TEXT NOT NULL,
    "amount" DECIMAL(65,30) NOT NULL,
    "balanceAfter" DECIMAL(65,30) NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'COMPLETED',
    "referenceType" TEXT,
    "referenceId" TEXT,
    "idempotencyKey" TEXT,
    "metadata" TEXT,
    "description" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "WalletLedgerEntry_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "WalletHold" (
    "id" TEXT NOT NULL,
    "walletId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "coin" TEXT NOT NULL DEFAULT 'GONG',
    "amount" DECIMAL(65,30) NOT NULL,
    "reason" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'HELD',
    "referenceType" TEXT,
    "referenceId" TEXT,
    "idempotencyKey" TEXT,
    "releaseAt" TIMESTAMP(3),
    "releasedAt" TIMESTAMP(3),
    "metadata" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "WalletHold_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CoinConversionRate" (
    "id" TEXT NOT NULL,
    "fromCoin" TEXT NOT NULL,
    "toCoin" TEXT NOT NULL,
    "rate" DECIMAL(65,30) NOT NULL,
    "minAmount" DECIMAL(65,30) NOT NULL DEFAULT 0,
    "maxAmount" DECIMAL(65,30),
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "updatedById" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CoinConversionRate_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "RewardRule" (
    "id" TEXT NOT NULL,
    "eventType" TEXT NOT NULL,
    "xpAmount" DECIMAL(65,30) NOT NULL DEFAULT 0,
    "gxAmount" DECIMAL(65,30) NOT NULL DEFAULT 0,
    "discountAmount" DECIMAL(65,30) NOT NULL DEFAULT 0,
    "cooldownHours" INTEGER NOT NULL DEFAULT 0,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "metadata" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "RewardRule_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "RewardGrant" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "ruleId" TEXT,
    "eventType" TEXT NOT NULL,
    "eventKey" TEXT NOT NULL,
    "xpAmount" DECIMAL(65,30) NOT NULL DEFAULT 0,
    "gxAmount" DECIMAL(65,30) NOT NULL DEFAULT 0,
    "status" TEXT NOT NULL DEFAULT 'GRANTED',
    "referenceType" TEXT,
    "referenceId" TEXT,
    "metadata" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "RewardGrant_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Payout" (
    "id" TEXT NOT NULL,
    "sellerId" TEXT NOT NULL,
    "amount" DECIMAL(65,30) NOT NULL,
    "currency" TEXT NOT NULL DEFAULT 'USD',
    "status" TEXT NOT NULL DEFAULT 'PENDING',
    "method" TEXT NOT NULL,
    "paystackTransferId" TEXT,
    "adminNote" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "processedAt" TIMESTAMP(3),

    CONSTRAINT "Payout_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Cart" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Cart_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CartItem" (
    "id" TEXT NOT NULL,
    "cartId" TEXT NOT NULL,
    "productId" TEXT NOT NULL,
    "quantity" INTEGER NOT NULL DEFAULT 1,
    "variants" TEXT,

    CONSTRAINT "CartItem_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TrackingEvent" (
    "id" TEXT NOT NULL,
    "orderId" TEXT NOT NULL,
    "status" TEXT NOT NULL,
    "location" TEXT,
    "description" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "TrackingEvent_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SystemLog" (
    "id" TEXT NOT NULL,
    "adminId" TEXT NOT NULL,
    "action" TEXT NOT NULL,
    "targetId" TEXT NOT NULL,
    "details" TEXT,
    "ipAddress" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "SystemLog_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PageView" (
    "id" TEXT NOT NULL,
    "productId" TEXT NOT NULL,
    "viewerId" TEXT,
    "ipHash" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "PageView_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Subscription" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "tier" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'ACTIVE',
    "startDate" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "endDate" TIMESTAMP(3) NOT NULL,
    "paymentRef" TEXT,
    "amount" DECIMAL(65,30) NOT NULL,
    "currency" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Subscription_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SellerPlan" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "displayName" TEXT NOT NULL,
    "monthlyPriceGong" DECIMAL(65,30) NOT NULL DEFAULT 0,
    "commissionRate" DOUBLE PRECISION NOT NULL DEFAULT 0.10,
    "visibilityWeight" INTEGER NOT NULL DEFAULT 0,
    "analyticsLevel" TEXT NOT NULL DEFAULT 'BASIC',
    "prioritySupport" BOOLEAN NOT NULL DEFAULT false,
    "includedBoosts" INTEGER NOT NULL DEFAULT 0,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "SellerPlan_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SellerPlanBenefit" (
    "id" TEXT NOT NULL,
    "sellerPlanId" TEXT NOT NULL,
    "storeId" TEXT,
    "benefitType" TEXT NOT NULL,
    "value" DECIMAL(65,30) NOT NULL DEFAULT 0,
    "isSellerEnabled" BOOLEAN NOT NULL DEFAULT false,
    "startsAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "endsAt" TIMESTAMP(3),
    "metadata" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "SellerPlanBenefit_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SubscriptionInvoice" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "sellerPlanId" TEXT,
    "tier" TEXT NOT NULL,
    "amountGong" DECIMAL(65,30) NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'PENDING',
    "provider" TEXT,
    "paymentRef" TEXT,
    "periodStart" TIMESTAMP(3) NOT NULL,
    "periodEnd" TIMESTAMP(3) NOT NULL,
    "metadata" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "SubscriptionInvoice_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "EscrowPayment" (
    "id" TEXT NOT NULL,
    "orderId" TEXT,
    "fulfillmentOrderId" TEXT,
    "buyerId" TEXT NOT NULL,
    "sellerId" TEXT NOT NULL,
    "totalAmount" DECIMAL(65,30) NOT NULL,
    "commissionRate" DOUBLE PRECISION NOT NULL DEFAULT 0.10,
    "commissionAmount" DECIMAL(65,30) NOT NULL,
    "sellerAmount" DECIMAL(65,30) NOT NULL,
    "paymentReference" TEXT,
    "paymentProvider" TEXT,
    "status" TEXT NOT NULL DEFAULT 'HELD',
    "payoutReference" TEXT,
    "payoutMethod" TEXT,
    "heldAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "releaseScheduledAt" TIMESTAMP(3),
    "releasedAt" TIMESTAMP(3),
    "disputedAt" TIMESTAMP(3),
    "refundedAt" TIMESTAMP(3),
    "releaseTriggeredBy" TEXT,
    "adminNote" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "EscrowPayment_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Payment" (
    "id" TEXT NOT NULL,
    "orderId" TEXT,
    "buyerId" TEXT NOT NULL,
    "sellerId" TEXT,
    "amount" DECIMAL(65,30) NOT NULL,
    "currency" TEXT NOT NULL DEFAULT 'NGN',
    "platformFee" DECIMAL(65,30) NOT NULL DEFAULT 0,
    "sellerPayout" DECIMAL(65,30) NOT NULL DEFAULT 0,
    "commissionRate" DOUBLE PRECISION NOT NULL DEFAULT 0.10,
    "paystackTransactionId" TEXT,
    "paystackReference" TEXT,
    "paystackSubaccountCode" TEXT,
    "status" TEXT NOT NULL DEFAULT 'PENDING',
    "deliveryConfirmedAt" TIMESTAMP(3),
    "releaseAt" TIMESTAMP(3),
    "disputeReason" TEXT,
    "disputeStatus" TEXT,
    "disputeResolvedBy" TEXT,
    "disputeResolvedAt" TIMESTAMP(3),
    "disputeResolution" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Payment_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Commission" (
    "id" TEXT NOT NULL,
    "paymentId" TEXT NOT NULL,
    "percentage" DOUBLE PRECISION NOT NULL,
    "amount" DECIMAL(65,30) NOT NULL,
    "currency" TEXT NOT NULL DEFAULT 'NGN',
    "transactionRef" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Commission_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PaymentDispute" (
    "id" TEXT NOT NULL,
    "paymentId" TEXT NOT NULL,
    "buyerId" TEXT NOT NULL,
    "reason" TEXT NOT NULL,
    "description" TEXT,
    "evidence" TEXT,
    "status" TEXT NOT NULL DEFAULT 'OPEN',
    "resolution" TEXT,
    "resolvedBy" TEXT,
    "resolvedAt" TIMESTAMP(3),
    "resolutionNotes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PaymentDispute_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "WebhookEvent" (
    "id" TEXT NOT NULL,
    "eventType" TEXT NOT NULL,
    "eventId" TEXT NOT NULL,
    "reference" TEXT,
    "payload" TEXT NOT NULL,
    "processed" BOOLEAN NOT NULL DEFAULT false,
    "processedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "WebhookEvent_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PromoCode" (
    "id" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "description" TEXT,
    "sellerId" TEXT NOT NULL,
    "discountType" TEXT NOT NULL,
    "discountValue" DECIMAL(65,30) NOT NULL,
    "productId" TEXT,
    "maxUses" INTEGER,
    "usedCount" INTEGER NOT NULL DEFAULT 0,
    "maxUsesPerUser" INTEGER NOT NULL DEFAULT 1,
    "startsAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "expiresAt" TIMESTAMP(3),
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PromoCode_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PromoCodeUsage" (
    "id" TEXT NOT NULL,
    "promoCodeId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "orderId" TEXT NOT NULL,
    "discountApplied" DECIMAL(65,30) NOT NULL,
    "usedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "PromoCodeUsage_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SellerAnalytics" (
    "id" TEXT NOT NULL,
    "sellerId" TEXT NOT NULL,
    "date" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "totalRevenue" DECIMAL(65,30) NOT NULL DEFAULT 0,
    "totalOrders" INTEGER NOT NULL DEFAULT 0,
    "totalProductsSold" INTEGER NOT NULL DEFAULT 0,
    "averageOrderValue" DECIMAL(65,30) NOT NULL DEFAULT 0,
    "newCustomers" INTEGER NOT NULL DEFAULT 0,
    "returningCustomers" INTEGER NOT NULL DEFAULT 0,
    "topSellingProductId" TEXT,
    "topSellingProductName" TEXT,
    "topSellingProductQty" INTEGER NOT NULL DEFAULT 0,
    "pageViews" INTEGER NOT NULL DEFAULT 0,
    "uniqueVisitors" INTEGER NOT NULL DEFAULT 0,
    "conversionRate" DECIMAL(65,30) NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "SellerAnalytics_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "BuyerSellerProfile" (
    "id" TEXT NOT NULL,
    "sellerId" TEXT NOT NULL,
    "buyerId" TEXT NOT NULL,
    "totalOrders" INTEGER NOT NULL DEFAULT 0,
    "totalSpend" DECIMAL(65,30) NOT NULL DEFAULT 0.0,
    "repeatOrders" INTEGER NOT NULL DEFAULT 0,
    "averageOrderValue" DECIMAL(65,30) NOT NULL DEFAULT 0.0,
    "lastOrderAt" TIMESTAMP(3),
    "favoriteCategories" TEXT,
    "intelligenceLabels" TEXT,
    "intelligenceScore" DOUBLE PRECISION NOT NULL DEFAULT 0.0,
    "lastNotifiedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "BuyerSellerProfile_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PromoCampaign" (
    "id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "promoType" TEXT NOT NULL DEFAULT 'FLASH_DEAL',
    "status" TEXT NOT NULL DEFAULT 'SCHEDULED',
    "bannerImage" TEXT,
    "startDate" TIMESTAMP(3) NOT NULL,
    "endDate" TIMESTAMP(3) NOT NULL,
    "audienceScope" TEXT NOT NULL DEFAULT 'SELLER',
    "seasonTag" TEXT,
    "targetRegion" TEXT,
    "priority" INTEGER NOT NULL DEFAULT 0,
    "autoSuggested" BOOLEAN NOT NULL DEFAULT false,
    "clicks" INTEGER NOT NULL DEFAULT 0,
    "conversions" INTEGER NOT NULL DEFAULT 0,
    "revenue" DECIMAL(65,30) NOT NULL DEFAULT 0.0,
    "createdById" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PromoCampaign_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "MarketplaceAnalyticsEvent" (
    "id" TEXT NOT NULL,
    "userId" TEXT,
    "eventType" TEXT NOT NULL,
    "entityType" TEXT NOT NULL,
    "entityId" TEXT NOT NULL,
    "metadata" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "MarketplaceAnalyticsEvent_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "FlashDeal" (
    "id" TEXT NOT NULL,
    "productId" TEXT NOT NULL,
    "sellerId" TEXT NOT NULL,
    "campaignId" TEXT,
    "discount" INTEGER NOT NULL,
    "promoType" TEXT NOT NULL DEFAULT 'FLASH_DEAL',
    "promoTitle" TEXT,
    "bannerImage" TEXT,
    "startDate" TIMESTAMP(3) NOT NULL,
    "endDate" TIMESTAMP(3) NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT false,
    "isFeatured" BOOLEAN NOT NULL DEFAULT false,
    "targetRegion" TEXT,
    "priority" INTEGER NOT NULL DEFAULT 0,
    "maxStock" INTEGER,
    "soldCount" INTEGER NOT NULL DEFAULT 0,
    "viewerCount" INTEGER NOT NULL DEFAULT 0,
    "clicks" INTEGER NOT NULL DEFAULT 0,
    "conversions" INTEGER NOT NULL DEFAULT 0,
    "revenue" DECIMAL(65,30) NOT NULL DEFAULT 0.0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "FlashDeal_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PackingResponse" (
    "id" TEXT NOT NULL,
    "orderId" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "message" TEXT NOT NULL,
    "buyerMessage" TEXT,
    "templateKey" TEXT,
    "issueType" TEXT,
    "respondedAt" TIMESTAMP(3),
    "responseTimeMinutes" INTEGER,
    "escalated" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PackingResponse_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "RestockNotification" (
    "id" TEXT NOT NULL,
    "productId" TEXT NOT NULL,
    "buyerId" TEXT NOT NULL,
    "isNotified" BOOLEAN NOT NULL DEFAULT false,
    "notifiedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "RestockNotification_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Wishlist" (
    "id" TEXT NOT NULL,
    "buyerId" TEXT NOT NULL,
    "productId" TEXT NOT NULL,
    "priority" TEXT NOT NULL DEFAULT 'MEDIUM',
    "notes" TEXT,
    "priceDropAlertEnabled" BOOLEAN NOT NULL DEFAULT true,
    "lastPriceNotifiedAt" TIMESTAMP(3),
    "targetPrice" DECIMAL(65,30),
    "restockAlertEnabled" BOOLEAN NOT NULL DEFAULT true,
    "lastRestockNotifiedAt" TIMESTAMP(3),
    "addedToCartAt" TIMESTAMP(3),
    "purchasedAt" TIMESTAMP(3),
    "convertedToBuyerRequest" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Wishlist_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ReviewLike" (
    "id" TEXT NOT NULL,
    "reviewId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "isHelpful" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ReviewLike_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ReviewReport" (
    "id" TEXT NOT NULL,
    "reviewId" TEXT NOT NULL,
    "reporterId" TEXT NOT NULL,
    "reason" TEXT NOT NULL,
    "description" TEXT,
    "status" TEXT NOT NULL DEFAULT 'PENDING',
    "adminId" TEXT,
    "adminNotes" TEXT,
    "resolvedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ReviewReport_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SellerPerformance" (
    "id" TEXT NOT NULL,
    "sellerId" TEXT NOT NULL,
    "periodType" TEXT NOT NULL,
    "periodStart" TIMESTAMP(3) NOT NULL,
    "periodEnd" TIMESTAMP(3) NOT NULL,
    "totalRevenue" DECIMAL(65,30) NOT NULL DEFAULT 0,
    "totalOrders" INTEGER NOT NULL DEFAULT 0,
    "totalItemsSold" INTEGER NOT NULL DEFAULT 0,
    "averageOrderValue" DECIMAL(65,30) NOT NULL DEFAULT 0,
    "newBuyers" INTEGER NOT NULL DEFAULT 0,
    "returningBuyers" INTEGER NOT NULL DEFAULT 0,
    "repeatBuyerRate" DECIMAL(65,30) NOT NULL DEFAULT 0,
    "buyerSatisfactionScore" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "onTimeDeliveryRate" DECIMAL(65,30) NOT NULL DEFAULT 0,
    "averageShippingDays" INTEGER NOT NULL DEFAULT 0,
    "disputeRate" DECIMAL(65,30) NOT NULL DEFAULT 0,
    "disputeResolutionTime" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "averageResponseMinutes" INTEGER NOT NULL DEFAULT 0,
    "responseRate" DECIMAL(65,30) NOT NULL DEFAULT 0,
    "trustScore" INTEGER NOT NULL DEFAULT 50,
    "ratingTrend" TEXT NOT NULL DEFAULT 'STABLE',
    "hasNegativeTrend" BOOLEAN NOT NULL DEFAULT false,
    "alertMessage" TEXT,
    "requiresAttention" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "SellerPerformance_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SellerInsight" (
    "id" TEXT NOT NULL,
    "sellerId" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "category" TEXT NOT NULL,
    "priority" TEXT NOT NULL DEFAULT 'MEDIUM',
    "title" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "dataSnapshot" TEXT,
    "suggestedAction" TEXT,
    "isRead" BOOLEAN NOT NULL DEFAULT false,
    "isActedUpon" BOOLEAN NOT NULL DEFAULT false,
    "actedAt" TIMESTAMP(3),
    "dismissedAt" TIMESTAMP(3),
    "expiresAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "SellerInsight_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ProductUrgency" (
    "id" TEXT NOT NULL,
    "productId" TEXT NOT NULL,
    "stockLevel" INTEGER NOT NULL DEFAULT 0,
    "urgencyLevel" TEXT NOT NULL DEFAULT 'NORMAL',
    "urgencyScore" INTEGER NOT NULL DEFAULT 0,
    "daysUntilStockout" INTEGER,
    "lastRestockAt" TIMESTAMP(3),
    "restockInProgress" BOOLEAN NOT NULL DEFAULT false,
    "wishlistCount" INTEGER NOT NULL DEFAULT 0,
    "viewCount24h" INTEGER NOT NULL DEFAULT 0,
    "cartAdds24h" INTEGER NOT NULL DEFAULT 0,
    "autoBoostActive" BOOLEAN NOT NULL DEFAULT false,
    "autoBoostUntil" TIMESTAMP(3),
    "bannerMessage" TEXT,
    "lastCalculatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ProductUrgency_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "FeedPost" (
    "id" TEXT NOT NULL,
    "sellerId" TEXT NOT NULL,
    "productId" TEXT,
    "caption" TEXT,
    "mediaUrl" TEXT,
    "status" TEXT NOT NULL DEFAULT 'ACTIVE',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "FeedPost_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Like" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "postId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Like_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "EngagementEvent" (
    "id" TEXT NOT NULL,
    "userId" TEXT,
    "sessionId" TEXT,
    "postId" TEXT,
    "productId" TEXT,
    "action" TEXT NOT NULL,
    "target" TEXT,
    "metadata" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "EngagementEvent_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "FeedComment" (
    "id" TEXT NOT NULL,
    "content" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "userId" TEXT NOT NULL,
    "postId" TEXT NOT NULL,
    "sellerId" TEXT NOT NULL,
    "messageId" TEXT,
    "parentId" TEXT,

    CONSTRAINT "FeedComment_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Template" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "category" TEXT NOT NULL,
    "type" TEXT NOT NULL DEFAULT 'popup',
    "price" DECIMAL(65,30) NOT NULL,
    "currency" TEXT NOT NULL DEFAULT 'NGN',
    "thumbnail" TEXT,
    "previewImage" TEXT,
    "configuration" TEXT NOT NULL,
    "version" TEXT NOT NULL DEFAULT '1.0',
    "status" TEXT NOT NULL DEFAULT 'PUBLISHED',
    "isFeatured" BOOLEAN NOT NULL DEFAULT false,
    "isFree" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Template_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SellerTemplate" (
    "id" TEXT NOT NULL,
    "sellerId" TEXT NOT NULL,
    "templateId" TEXT NOT NULL,
    "storeId" TEXT,
    "customizedConfiguration" TEXT,
    "status" TEXT NOT NULL DEFAULT 'OWNED',
    "version" TEXT NOT NULL DEFAULT '1.0',
    "appliedAt" TIMESTAMP(3),
    "purchasedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "SellerTemplate_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TemplatePurchase" (
    "id" TEXT NOT NULL,
    "sellerId" TEXT NOT NULL,
    "templateId" TEXT NOT NULL,
    "amount" DECIMAL(65,30) NOT NULL,
    "currency" TEXT NOT NULL DEFAULT 'NGN',
    "paymentMethod" TEXT NOT NULL DEFAULT 'WALLET',
    "paymentReference" TEXT,
    "idempotencyKey" TEXT,
    "status" TEXT NOT NULL DEFAULT 'PENDING',
    "purchasedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "TemplatePurchase_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AIUsage" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "storeId" TEXT,
    "tool" TEXT NOT NULL,
    "provider" TEXT NOT NULL DEFAULT 'gemini',
    "inputTokens" INTEGER NOT NULL DEFAULT 0,
    "outputTokens" INTEGER NOT NULL DEFAULT 0,
    "estimatedCost" DECIMAL(65,30) NOT NULL DEFAULT 0.0,
    "status" TEXT NOT NULL DEFAULT 'SUCCESS',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AIUsage_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "StoreAsset" (
    "id" TEXT NOT NULL,
    "storeId" TEXT NOT NULL,
    "assetUrl" TEXT NOT NULL,
    "publicId" TEXT,
    "type" TEXT NOT NULL DEFAULT 'BANNER',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "StoreAsset_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CourierProfile" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'OFFLINE',
    "rating" DOUBLE PRECISION NOT NULL DEFAULT 5.0,
    "totalDeliveries" INTEGER NOT NULL DEFAULT 0,
    "activeVehicleId" TEXT,
    "currentLat" DOUBLE PRECISION,
    "currentLng" DOUBLE PRECISION,
    "lastLocationAt" TIMESTAMP(3),
    "driversLicenseUrl" TEXT,
    "guarantorName" TEXT,
    "guarantorPhone" TEXT,
    "guarantorAddress" TEXT,
    "kycStatus" TEXT NOT NULL DEFAULT 'PENDING',
    "kycSubmittedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CourierProfile_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Vehicle" (
    "id" TEXT NOT NULL,
    "courierProfileId" TEXT NOT NULL,
    "type" TEXT NOT NULL DEFAULT 'MOTORCYCLE',
    "plateNumber" TEXT NOT NULL,
    "make" TEXT,
    "model" TEXT,
    "color" TEXT,
    "capacityKg" DOUBLE PRECISION,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Vehicle_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Hub" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "address" TEXT NOT NULL,
    "lat" DOUBLE PRECISION NOT NULL,
    "lng" DOUBLE PRECISION NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "capacity" INTEGER NOT NULL DEFAULT 1000,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Hub_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ConsolidatedPackage" (
    "id" TEXT NOT NULL,
    "buyerId" TEXT NOT NULL,
    "hubId" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'AWAITING_ITEMS',
    "trackingNumber" TEXT,
    "finalDeliveryAssignmentId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ConsolidatedPackage_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "DeliveryRoute" (
    "id" TEXT NOT NULL,
    "name" TEXT,
    "status" TEXT NOT NULL DEFAULT 'PENDING',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "DeliveryRoute_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "DeliveryStop" (
    "id" TEXT NOT NULL,
    "routeId" TEXT,
    "assignmentId" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "address" TEXT NOT NULL,
    "lat" DOUBLE PRECISION,
    "lng" DOUBLE PRECISION,
    "sequence" INTEGER NOT NULL DEFAULT 0,
    "status" TEXT NOT NULL DEFAULT 'PENDING',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "DeliveryStop_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "DeliveryAssignment" (
    "id" TEXT NOT NULL,
    "orderId" TEXT NOT NULL,
    "courierId" TEXT,
    "vehicleId" TEXT,
    "routeId" TEXT,
    "status" TEXT NOT NULL DEFAULT 'PENDING',
    "estimatedDistance" DOUBLE PRECISION,
    "estimatedDuration" INTEGER,
    "fulfillmentOrderId" TEXT,
    "pickupLat" DOUBLE PRECISION,
    "pickupLng" DOUBLE PRECISION,
    "dropoffLat" DOUBLE PRECISION,
    "dropoffLng" DOUBLE PRECISION,
    "customerDeliveryFee" DECIMAL(65,30),
    "pricingSnapshot" TEXT,
    "pickupQrCode" TEXT,
    "deliveryPin" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "DeliveryAssignment_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "DeliveryOffer" (
    "id" TEXT NOT NULL,
    "assignmentId" TEXT NOT NULL,
    "courierId" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'PENDING',
    "offeredAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "expiresAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "DeliveryOffer_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "DeliveryTrackingEvent" (
    "id" TEXT NOT NULL,
    "assignmentId" TEXT NOT NULL,
    "status" TEXT NOT NULL,
    "lat" DOUBLE PRECISION,
    "lng" DOUBLE PRECISION,
    "metadata" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "DeliveryTrackingEvent_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "DeliveryProof" (
    "id" TEXT NOT NULL,
    "assignmentId" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "proofUrl" TEXT,
    "notes" TEXT,
    "verifiedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "DeliveryProof_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "DeliveryIncident" (
    "id" TEXT NOT NULL,
    "assignmentId" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "photoUrl" TEXT,
    "status" TEXT NOT NULL DEFAULT 'OPEN',
    "resolvedAt" TIMESTAMP(3),
    "adminNotes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "DeliveryIncident_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CourierEarning" (
    "id" TEXT NOT NULL,
    "courierId" TEXT NOT NULL,
    "assignmentId" TEXT,
    "reference" TEXT,
    "description" TEXT,
    "type" TEXT NOT NULL DEFAULT 'DELIVERY_FEE',
    "amount" DECIMAL(65,30) NOT NULL,
    "currency" TEXT NOT NULL DEFAULT 'NGN',
    "status" TEXT NOT NULL DEFAULT 'PENDING',
    "clearedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CourierEarning_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "NotificationOutbox" (
    "id" TEXT NOT NULL,
    "eventType" TEXT NOT NULL,
    "payload" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'PENDING',
    "attempts" INTEGER NOT NULL DEFAULT 0,
    "lastAttemptAt" TIMESTAMP(3),
    "error" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "NotificationOutbox_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "UserSession" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "token" TEXT NOT NULL,
    "userAgent" TEXT,
    "ipAddress" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,

    CONSTRAINT "UserSession_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "WebAuthnCredential" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "publicKey" BYTEA NOT NULL,
    "counter" BIGINT NOT NULL,
    "transports" TEXT,
    "deviceType" TEXT,
    "backedUp" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "WebAuthnCredential_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "MarketplaceOrder" (
    "id" TEXT NOT NULL,
    "buyerId" TEXT NOT NULL,
    "subtotal" DECIMAL(65,30) NOT NULL,
    "shippingCost" DECIMAL(65,30) NOT NULL,
    "discountTotal" DECIMAL(65,30) NOT NULL DEFAULT 0,
    "grandTotal" DECIMAL(65,30) NOT NULL,
    "currency" TEXT NOT NULL DEFAULT 'NGN',
    "promoCodeId" TEXT,
    "promoDiscount" DECIMAL(65,30) DEFAULT 0,
    "shippingAddressId" TEXT,
    "shippingSnapshot" TEXT,
    "paymentMethod" TEXT,
    "paymentReference" TEXT,
    "paymentStatus" TEXT NOT NULL DEFAULT 'PENDING',
    "paidAt" TIMESTAMP(3),
    "status" TEXT NOT NULL DEFAULT 'PENDING',
    "idempotencyKey" TEXT,
    "notes" TEXT,
    "expiresAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "MarketplaceOrder_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "FulfillmentOrder" (
    "id" TEXT NOT NULL,
    "marketplaceOrderId" TEXT NOT NULL,
    "buyerId" TEXT NOT NULL,
    "sellerId" TEXT NOT NULL,
    "subtotal" DECIMAL(65,30) NOT NULL,
    "shippingCost" DECIMAL(65,30) NOT NULL,
    "discountAmount" DECIMAL(65,30) NOT NULL DEFAULT 0,
    "grandTotal" DECIMAL(65,30) NOT NULL,
    "currency" TEXT NOT NULL DEFAULT 'NGN',
    "commissionRate" DOUBLE PRECISION NOT NULL,
    "commissionAmount" DECIMAL(65,30) NOT NULL,
    "sellerAmount" DECIMAL(65,30) NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'PENDING',
    "paymentStatus" TEXT NOT NULL DEFAULT 'PENDING',
    "isConsolidated" BOOLEAN NOT NULL DEFAULT false,
    "hubLocation" TEXT,
    "consolidatedPackageId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "FulfillmentOrder_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "FulfillmentItem" (
    "id" TEXT NOT NULL,
    "fulfillmentOrderId" TEXT NOT NULL,
    "productId" TEXT NOT NULL,
    "quantity" INTEGER NOT NULL,
    "priceAtTime" DECIMAL(65,30) NOT NULL,
    "subtotal" DECIMAL(65,30) NOT NULL,
    "variants" TEXT,
    "itemDiscount" DECIMAL(65,30) NOT NULL DEFAULT 0,
    "weightKg" DOUBLE PRECISION,
    "dimensionsCm" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "FulfillmentItem_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "InventoryReservation" (
    "id" TEXT NOT NULL,
    "productId" TEXT NOT NULL,
    "fulfillmentOrderId" TEXT,
    "quantity" INTEGER NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'ACTIVE',
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "releasedAt" TIMESTAMP(3),
    "deductedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "InventoryReservation_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "NotificationPreference" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "orders" BOOLEAN NOT NULL DEFAULT true,
    "payments" BOOLEAN NOT NULL DEFAULT true,
    "deliveries" BOOLEAN NOT NULL DEFAULT true,
    "messages" BOOLEAN NOT NULL DEFAULT true,
    "promotions" BOOLEAN NOT NULL DEFAULT false,

    CONSTRAINT "NotificationPreference_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "FunnelEvent" (
    "id" TEXT NOT NULL,
    "sessionId" TEXT NOT NULL,
    "event" TEXT NOT NULL,
    "userId" TEXT,
    "productId" TEXT,
    "storeId" TEXT,
    "source" TEXT,
    "metadata" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "FunnelEvent_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "MarketConfig" (
    "id" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "countryCode" TEXT NOT NULL,
    "displayCurrency" TEXT NOT NULL,
    "enabled" BOOLEAN NOT NULL DEFAULT true,
    "description" TEXT,
    "supportedCurrencies" TEXT NOT NULL DEFAULT '["NGN","USD","GBP","EUR"]',
    "checkoutMethods" TEXT NOT NULL DEFAULT '["PAYSTACK","STRIPE","WALLET"]',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "MarketConfig_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ExternalSellerIntegration" (
    "id" TEXT NOT NULL,
    "provider" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "adapterType" TEXT NOT NULL,
    "capabilities" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'ACTIVE',
    "baseUrl" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ExternalSellerIntegration_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ExternalOffer" (
    "id" TEXT NOT NULL,
    "provider" TEXT NOT NULL,
    "externalProductId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "url" TEXT NOT NULL,
    "imageUrl" TEXT,
    "category" TEXT,
    "brand" TEXT,
    "sellerName" TEXT,
    "sellerCountry" TEXT NOT NULL DEFAULT 'US',
    "originCountry" TEXT NOT NULL DEFAULT 'US',
    "listingCurrency" TEXT NOT NULL DEFAULT 'USD',
    "price" DECIMAL(65,30) NOT NULL,
    "originalPrice" DECIMAL(65,30),
    "availability" TEXT NOT NULL DEFAULT 'IN_STOCK',
    "stockQuantity" INTEGER NOT NULL DEFAULT 50,
    "rating" DOUBLE PRECISION NOT NULL DEFAULT 4.5,
    "reviewCount" INTEGER NOT NULL DEFAULT 120,
    "specifications" TEXT,
    "canNegotiate" BOOLEAN NOT NULL DEFAULT false,
    "observedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ExternalOffer_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PayAISession" (
    "id" TEXT NOT NULL,
    "userId" TEXT,
    "marketCode" TEXT NOT NULL DEFAULT 'INTERNATIONAL',
    "destinationCountry" TEXT NOT NULL DEFAULT 'NG',
    "status" TEXT NOT NULL DEFAULT 'ACTIVE',
    "metadata" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PayAISession_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PayAIMessage" (
    "id" TEXT NOT NULL,
    "sessionId" TEXT NOT NULL,
    "role" TEXT NOT NULL,
    "content" TEXT NOT NULL,
    "toolCalls" TEXT,
    "toolResults" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "PayAIMessage_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PayAICart" (
    "id" TEXT NOT NULL,
    "userId" TEXT,
    "sessionId" TEXT,
    "marketCode" TEXT NOT NULL DEFAULT 'INTERNATIONAL',
    "currency" TEXT NOT NULL DEFAULT 'USD',
    "status" TEXT NOT NULL DEFAULT 'ACTIVE',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PayAICart_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PayAICartItem" (
    "id" TEXT NOT NULL,
    "cartId" TEXT NOT NULL,
    "externalOfferId" TEXT,
    "provider" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "price" DECIMAL(65,30) NOT NULL,
    "currency" TEXT NOT NULL DEFAULT 'USD',
    "quantity" INTEGER NOT NULL DEFAULT 1,
    "imageUrl" TEXT,
    "sellerName" TEXT,
    "originCountry" TEXT,
    "offerSnapshot" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PayAICartItem_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PayAIQuote" (
    "id" TEXT NOT NULL,
    "quoteNumber" TEXT NOT NULL,
    "userId" TEXT,
    "cartId" TEXT,
    "marketCode" TEXT NOT NULL DEFAULT 'INTERNATIONAL',
    "currency" TEXT NOT NULL DEFAULT 'USD',
    "targetCurrency" TEXT NOT NULL DEFAULT 'USD',
    "exchangeRate" DECIMAL(65,30) NOT NULL DEFAULT 1.0,
    "subtotal" DECIMAL(65,30) NOT NULL,
    "shipping" DECIMAL(65,30) NOT NULL,
    "duties" DECIMAL(65,30) NOT NULL DEFAULT 0,
    "taxes" DECIMAL(65,30) NOT NULL DEFAULT 0,
    "serviceFee" DECIMAL(65,30) NOT NULL DEFAULT 0,
    "total" DECIMAL(65,30) NOT NULL,
    "convertedTotal" DECIMAL(65,30),
    "breakdown" TEXT NOT NULL,
    "itemsSnapshot" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'ACTIVE',
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PayAIQuote_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PayAIPurchaseApproval" (
    "id" TEXT NOT NULL,
    "userId" TEXT,
    "quoteId" TEXT NOT NULL,
    "approvedTotal" DECIMAL(65,30) NOT NULL,
    "approvedCurrency" TEXT NOT NULL,
    "approvedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "ipAddress" TEXT,
    "userAgent" TEXT,
    "status" TEXT NOT NULL DEFAULT 'VALID',

    CONSTRAINT "PayAIPurchaseApproval_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PayAIOrder" (
    "id" TEXT NOT NULL,
    "orderNumber" TEXT NOT NULL,
    "userId" TEXT,
    "quoteId" TEXT,
    "marketCode" TEXT NOT NULL DEFAULT 'INTERNATIONAL',
    "currency" TEXT NOT NULL DEFAULT 'USD',
    "subtotal" DECIMAL(65,30) NOT NULL,
    "shippingCost" DECIMAL(65,30) NOT NULL,
    "dutiesAndTaxes" DECIMAL(65,30) NOT NULL DEFAULT 0,
    "grandTotal" DECIMAL(65,30) NOT NULL,
    "paymentProvider" TEXT NOT NULL,
    "paymentStatus" TEXT NOT NULL DEFAULT 'AWAITING_PAYMENT',
    "fulfillmentStatus" TEXT NOT NULL DEFAULT 'CONFIRMED',
    "shippingAddress" TEXT,
    "itemsSnapshot" TEXT NOT NULL,
    "trackingNumber" TEXT,
    "carrierName" TEXT,
    "estimatedDelivery" TIMESTAMP(3),
    "idempotencyKey" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PayAIOrder_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PayAIPayment" (
    "id" TEXT NOT NULL,
    "orderId" TEXT NOT NULL,
    "provider" TEXT NOT NULL,
    "providerOrderId" TEXT,
    "providerCaptureId" TEXT,
    "amount" DECIMAL(65,30) NOT NULL,
    "currency" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'PENDING',
    "rawResponse" TEXT,
    "verifiedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "PayAIPayment_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PayAIOrderStatusEvent" (
    "id" TEXT NOT NULL,
    "orderId" TEXT NOT NULL,
    "status" TEXT NOT NULL,
    "source" TEXT NOT NULL DEFAULT 'SYSTEM',
    "message" TEXT,
    "metadata" TEXT,
    "occurredAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "PayAIOrderStatusEvent_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PayAIAuditLog" (
    "id" TEXT NOT NULL,
    "actorId" TEXT,
    "actorRole" TEXT NOT NULL DEFAULT 'BUYER',
    "action" TEXT NOT NULL,
    "entityType" TEXT NOT NULL,
    "entityId" TEXT NOT NULL,
    "details" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "PayAIAuditLog_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");

-- CreateIndex
CREATE UNIQUE INDEX "User_username_key" ON "User"("username");

-- CreateIndex
CREATE UNIQUE INDEX "User_googleId_key" ON "User"("googleId");

-- CreateIndex
CREATE UNIQUE INDEX "User_appleId_key" ON "User"("appleId");

-- CreateIndex
CREATE INDEX "User_email_idx" ON "User"("email");

-- CreateIndex
CREATE INDEX "AdDiscountSession_buyerId_idx" ON "AdDiscountSession"("buyerId");

-- CreateIndex
CREATE INDEX "AdDiscountSession_productId_idx" ON "AdDiscountSession"("productId");

-- CreateIndex
CREATE INDEX "AdDiscountSession_nextClaimAvailableAt_idx" ON "AdDiscountSession"("nextClaimAvailableAt");

-- CreateIndex
CREATE UNIQUE INDEX "AdDiscountSession_buyerId_productId_key" ON "AdDiscountSession"("buyerId", "productId");

-- CreateIndex
CREATE UNIQUE INDEX "Store_sellerId_key" ON "Store"("sellerId");

-- CreateIndex
CREATE UNIQUE INDEX "Store_portfolioSlug_key" ON "Store"("portfolioSlug");

-- CreateIndex
CREATE INDEX "Store_sellerId_idx" ON "Store"("sellerId");

-- CreateIndex
CREATE INDEX "Store_performanceScore_idx" ON "Store"("performanceScore");

-- CreateIndex
CREATE INDEX "Store_hasPendingAlerts_idx" ON "Store"("hasPendingAlerts");

-- CreateIndex
CREATE INDEX "buyer_requests_buyer_id_created_at_idx" ON "buyer_requests"("buyer_id", "created_at");

-- CreateIndex
CREATE INDEX "buyer_requests_status_created_at_idx" ON "buyer_requests"("status", "created_at");

-- CreateIndex
CREATE INDEX "request_responses_request_id_created_at_idx" ON "request_responses"("request_id", "created_at");

-- CreateIndex
CREATE INDEX "request_responses_seller_id_created_at_idx" ON "request_responses"("seller_id", "created_at");

-- CreateIndex
CREATE UNIQUE INDEX "request_responses_request_id_seller_id_key" ON "request_responses"("request_id", "seller_id");

-- CreateIndex
CREATE INDEX "StoreIntegration_storeId_idx" ON "StoreIntegration"("storeId");

-- CreateIndex
CREATE INDEX "Product_category_createdAt_idx" ON "Product"("category", "createdAt");

-- CreateIndex
CREATE INDEX "Product_category_price_idx" ON "Product"("category", "price");

-- CreateIndex
CREATE INDEX "Product_storeId_idx" ON "Product"("storeId");

-- CreateIndex
CREATE INDEX "Product_title_idx" ON "Product"("title");

-- CreateIndex
CREATE INDEX "Product_sku_idx" ON "Product"("sku");

-- CreateIndex
CREATE INDEX "Product_productGroupId_idx" ON "Product"("productGroupId");

-- CreateIndex
CREATE INDEX "Product_normalizedTitle_idx" ON "Product"("normalizedTitle");

-- CreateIndex
CREATE INDEX "Product_urgencyLevel_idx" ON "Product"("urgencyLevel");

-- CreateIndex
CREATE INDEX "Product_isUrgencyBannerVisible_idx" ON "Product"("isUrgencyBannerVisible");

-- CreateIndex
CREATE INDEX "ProductImage_productId_idx" ON "ProductImage"("productId");

-- CreateIndex
CREATE INDEX "ProductVideo_productId_idx" ON "ProductVideo"("productId");

-- CreateIndex
CREATE INDEX "ProductOption_productId_idx" ON "ProductOption"("productId");

-- CreateIndex
CREATE INDEX "ProductOffer_productId_createdAt_idx" ON "ProductOffer"("productId", "createdAt");

-- CreateIndex
CREATE INDEX "ProductOffer_buyerId_createdAt_idx" ON "ProductOffer"("buyerId", "createdAt");

-- CreateIndex
CREATE INDEX "ProductOffer_sellerId_status_idx" ON "ProductOffer"("sellerId", "status");

-- CreateIndex
CREATE INDEX "ProductQuestion_productId_createdAt_idx" ON "ProductQuestion"("productId", "createdAt");

-- CreateIndex
CREATE INDEX "ProductQuestion_userId_createdAt_idx" ON "ProductQuestion"("userId", "createdAt");

-- CreateIndex
CREATE INDEX "ProductQuestion_status_idx" ON "ProductQuestion"("status");

-- CreateIndex
CREATE INDEX "ProductComparison_userId_createdAt_idx" ON "ProductComparison"("userId", "createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "ProductComparison_userId_productId_comparedProductId_key" ON "ProductComparison"("userId", "productId", "comparedProductId");

-- CreateIndex
CREATE INDEX "ProductModelAsset_productId_idx" ON "ProductModelAsset"("productId");

-- CreateIndex
CREATE INDEX "ProductModelAsset_status_idx" ON "ProductModelAsset"("status");

-- CreateIndex
CREATE UNIQUE INDEX "Pool_productId_key" ON "Pool"("productId");

-- CreateIndex
CREATE UNIQUE INDEX "PoolParticipant_poolId_userId_key" ON "PoolParticipant"("poolId", "userId");

-- CreateIndex
CREATE UNIQUE INDEX "Order_idempotencyKey_key" ON "Order"("idempotencyKey");

-- CreateIndex
CREATE UNIQUE INDEX "Order_packingSerial_key" ON "Order"("packingSerial");

-- CreateIndex
CREATE INDEX "Order_buyerId_createdAt_idx" ON "Order"("buyerId", "createdAt");

-- CreateIndex
CREATE INDEX "Order_status_createdAt_idx" ON "Order"("status", "createdAt");

-- CreateIndex
CREATE INDEX "Order_paymentStatus_idx" ON "Order"("paymentStatus");

-- CreateIndex
CREATE INDEX "Order_escrowReleaseAt_idx" ON "Order"("escrowReleaseAt");

-- CreateIndex
CREATE INDEX "Order_sellerId_idx" ON "Order"("sellerId");

-- CreateIndex
CREATE INDEX "Order_estimatedDeliveryDate_idx" ON "Order"("estimatedDeliveryDate");

-- CreateIndex
CREATE INDEX "Order_isDeliveryDelayed_idx" ON "Order"("isDeliveryDelayed");

-- CreateIndex
CREATE UNIQUE INDEX "PaymentProof_orderId_key" ON "PaymentProof"("orderId");

-- CreateIndex
CREATE UNIQUE INDEX "PaymentProof_receiptNumber_key" ON "PaymentProof"("receiptNumber");

-- CreateIndex
CREATE INDEX "PaymentProof_buyerId_idx" ON "PaymentProof"("buyerId");

-- CreateIndex
CREATE INDEX "PaymentProof_sellerId_idx" ON "PaymentProof"("sellerId");

-- CreateIndex
CREATE INDEX "PaymentProof_status_idx" ON "PaymentProof"("status");

-- CreateIndex
CREATE INDEX "PaymentAuditLog_paymentProofId_idx" ON "PaymentAuditLog"("paymentProofId");

-- CreateIndex
CREATE INDEX "PaymentAuditLog_userId_idx" ON "PaymentAuditLog"("userId");

-- CreateIndex
CREATE INDEX "PaymentAuditLog_action_idx" ON "PaymentAuditLog"("action");

-- CreateIndex
CREATE INDEX "OrderItem_orderId_idx" ON "OrderItem"("orderId");

-- CreateIndex
CREATE INDEX "OrderItem_productId_idx" ON "OrderItem"("productId");

-- CreateIndex
CREATE UNIQUE INDEX "Dispute_orderId_key" ON "Dispute"("orderId");

-- CreateIndex
CREATE INDEX "Dispute_buyerId_idx" ON "Dispute"("buyerId");

-- CreateIndex
CREATE INDEX "Dispute_sellerId_idx" ON "Dispute"("sellerId");

-- CreateIndex
CREATE INDEX "Dispute_status_idx" ON "Dispute"("status");

-- CreateIndex
CREATE INDEX "DisputeMessage_disputeId_idx" ON "DisputeMessage"("disputeId");

-- CreateIndex
CREATE UNIQUE INDEX "PackingIssue_orderId_key" ON "PackingIssue"("orderId");

-- CreateIndex
CREATE INDEX "PackingIssue_sellerId_status_idx" ON "PackingIssue"("sellerId", "status");

-- CreateIndex
CREATE INDEX "PackingIssue_buyerId_createdAt_idx" ON "PackingIssue"("buyerId", "createdAt");

-- CreateIndex
CREATE INDEX "PackingIssue_responseDeadline_idx" ON "PackingIssue"("responseDeadline");

-- CreateIndex
CREATE INDEX "VerificationRequest_userId_idx" ON "VerificationRequest"("userId");

-- CreateIndex
CREATE INDEX "VerificationRequest_status_idx" ON "VerificationRequest"("status");

-- CreateIndex
CREATE INDEX "Review_productId_idx" ON "Review"("productId");

-- CreateIndex
CREATE INDEX "Review_userId_idx" ON "Review"("userId");

-- CreateIndex
CREATE INDEX "Review_sellerId_idx" ON "Review"("sellerId");

-- CreateIndex
CREATE INDEX "Review_rating_idx" ON "Review"("rating");

-- CreateIndex
CREATE INDEX "Review_isTopReview_idx" ON "Review"("isTopReview");

-- CreateIndex
CREATE INDEX "Review_createdAt_idx" ON "Review"("createdAt");

-- CreateIndex
CREATE INDEX "ConversationParticipant_userId_lastReadAt_idx" ON "ConversationParticipant"("userId", "lastReadAt");

-- CreateIndex
CREATE UNIQUE INDEX "ConversationParticipant_conversationId_userId_key" ON "ConversationParticipant"("conversationId", "userId");

-- CreateIndex
CREATE INDEX "Message_conversationId_createdAt_idx" ON "Message"("conversationId", "createdAt");

-- CreateIndex
CREATE INDEX "Message_recipientId_createdAt_idx" ON "Message"("recipientId", "createdAt");

-- CreateIndex
CREATE INDEX "QuickReplyTemplate_sellerId_idx" ON "QuickReplyTemplate"("sellerId");

-- CreateIndex
CREATE INDEX "QuickReplyTemplate_category_idx" ON "QuickReplyTemplate"("category");

-- CreateIndex
CREATE INDEX "Notification_userId_idx" ON "Notification"("userId");

-- CreateIndex
CREATE INDEX "Notification_isRead_idx" ON "Notification"("isRead");

-- CreateIndex
CREATE INDEX "SellerFollow_sellerId_createdAt_idx" ON "SellerFollow"("sellerId", "createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "SellerFollow_buyerId_sellerId_key" ON "SellerFollow"("buyerId", "sellerId");

-- CreateIndex
CREATE INDEX "BuyerProductInteraction_userId_createdAt_idx" ON "BuyerProductInteraction"("userId", "createdAt");

-- CreateIndex
CREATE INDEX "BuyerProductInteraction_productId_createdAt_idx" ON "BuyerProductInteraction"("productId", "createdAt");

-- CreateIndex
CREATE INDEX "BuyerProductInteraction_interactionType_createdAt_idx" ON "BuyerProductInteraction"("interactionType", "createdAt");

-- CreateIndex
CREATE INDEX "BuyerNotification_userId_createdAt_idx" ON "BuyerNotification"("userId", "createdAt");

-- CreateIndex
CREATE INDEX "BuyerNotification_userId_readStatus_idx" ON "BuyerNotification"("userId", "readStatus");

-- CreateIndex
CREATE INDEX "BuyerNotification_orderId_idx" ON "BuyerNotification"("orderId");

-- CreateIndex
CREATE INDEX "BuyerNotification_type_idx" ON "BuyerNotification"("type");

-- CreateIndex
CREATE INDEX "Transaction_userId_idx" ON "Transaction"("userId");

-- CreateIndex
CREATE INDEX "Transaction_referenceId_idx" ON "Transaction"("referenceId");

-- CreateIndex
CREATE UNIQUE INDEX "Wallet_userId_key" ON "Wallet"("userId");

-- CreateIndex
CREATE INDEX "Wallet_status_idx" ON "Wallet"("status");

-- CreateIndex
CREATE INDEX "WalletLedgerEntry_walletId_createdAt_idx" ON "WalletLedgerEntry"("walletId", "createdAt");

-- CreateIndex
CREATE INDEX "WalletLedgerEntry_userId_createdAt_idx" ON "WalletLedgerEntry"("userId", "createdAt");

-- CreateIndex
CREATE INDEX "WalletLedgerEntry_coin_createdAt_idx" ON "WalletLedgerEntry"("coin", "createdAt");

-- CreateIndex
CREATE INDEX "WalletLedgerEntry_referenceType_referenceId_idx" ON "WalletLedgerEntry"("referenceType", "referenceId");

-- CreateIndex
CREATE UNIQUE INDEX "WalletLedgerEntry_idempotencyKey_key" ON "WalletLedgerEntry"("idempotencyKey");

-- CreateIndex
CREATE INDEX "WalletHold_userId_status_idx" ON "WalletHold"("userId", "status");

-- CreateIndex
CREATE INDEX "WalletHold_referenceType_referenceId_idx" ON "WalletHold"("referenceType", "referenceId");

-- CreateIndex
CREATE INDEX "WalletHold_releaseAt_idx" ON "WalletHold"("releaseAt");

-- CreateIndex
CREATE UNIQUE INDEX "WalletHold_idempotencyKey_key" ON "WalletHold"("idempotencyKey");

-- CreateIndex
CREATE INDEX "CoinConversionRate_isActive_idx" ON "CoinConversionRate"("isActive");

-- CreateIndex
CREATE UNIQUE INDEX "CoinConversionRate_fromCoin_toCoin_key" ON "CoinConversionRate"("fromCoin", "toCoin");

-- CreateIndex
CREATE UNIQUE INDEX "RewardRule_eventType_key" ON "RewardRule"("eventType");

-- CreateIndex
CREATE INDEX "RewardGrant_userId_createdAt_idx" ON "RewardGrant"("userId", "createdAt");

-- CreateIndex
CREATE INDEX "RewardGrant_eventType_createdAt_idx" ON "RewardGrant"("eventType", "createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "RewardGrant_eventKey_key" ON "RewardGrant"("eventKey");

-- CreateIndex
CREATE UNIQUE INDEX "Cart_userId_key" ON "Cart"("userId");

-- CreateIndex
CREATE INDEX "CartItem_cartId_idx" ON "CartItem"("cartId");

-- CreateIndex
CREATE INDEX "CartItem_productId_idx" ON "CartItem"("productId");

-- CreateIndex
CREATE INDEX "TrackingEvent_orderId_idx" ON "TrackingEvent"("orderId");

-- CreateIndex
CREATE INDEX "SystemLog_adminId_idx" ON "SystemLog"("adminId");

-- CreateIndex
CREATE INDEX "PageView_productId_idx" ON "PageView"("productId");

-- CreateIndex
CREATE INDEX "PageView_createdAt_idx" ON "PageView"("createdAt");

-- CreateIndex
CREATE INDEX "Subscription_userId_idx" ON "Subscription"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "SellerPlan_name_key" ON "SellerPlan"("name");

-- CreateIndex
CREATE INDEX "SellerPlanBenefit_sellerPlanId_idx" ON "SellerPlanBenefit"("sellerPlanId");

-- CreateIndex
CREATE INDEX "SellerPlanBenefit_storeId_benefitType_idx" ON "SellerPlanBenefit"("storeId", "benefitType");

-- CreateIndex
CREATE INDEX "SellerPlanBenefit_isSellerEnabled_idx" ON "SellerPlanBenefit"("isSellerEnabled");

-- CreateIndex
CREATE INDEX "SubscriptionInvoice_userId_createdAt_idx" ON "SubscriptionInvoice"("userId", "createdAt");

-- CreateIndex
CREATE INDEX "SubscriptionInvoice_status_idx" ON "SubscriptionInvoice"("status");

-- CreateIndex
CREATE UNIQUE INDEX "EscrowPayment_orderId_key" ON "EscrowPayment"("orderId");

-- CreateIndex
CREATE UNIQUE INDEX "EscrowPayment_fulfillmentOrderId_key" ON "EscrowPayment"("fulfillmentOrderId");

-- CreateIndex
CREATE INDEX "EscrowPayment_status_idx" ON "EscrowPayment"("status");

-- CreateIndex
CREATE INDEX "EscrowPayment_sellerId_idx" ON "EscrowPayment"("sellerId");

-- CreateIndex
CREATE INDEX "EscrowPayment_releaseScheduledAt_idx" ON "EscrowPayment"("releaseScheduledAt");

-- CreateIndex
CREATE UNIQUE INDEX "Payment_paystackReference_key" ON "Payment"("paystackReference");

-- CreateIndex
CREATE INDEX "Payment_buyerId_idx" ON "Payment"("buyerId");

-- CreateIndex
CREATE INDEX "Payment_sellerId_idx" ON "Payment"("sellerId");

-- CreateIndex
CREATE INDEX "Payment_status_idx" ON "Payment"("status");

-- CreateIndex
CREATE INDEX "Payment_paystackReference_idx" ON "Payment"("paystackReference");

-- CreateIndex
CREATE INDEX "Payment_createdAt_idx" ON "Payment"("createdAt");

-- CreateIndex
CREATE INDEX "Commission_paymentId_idx" ON "Commission"("paymentId");

-- CreateIndex
CREATE UNIQUE INDEX "PaymentDispute_paymentId_key" ON "PaymentDispute"("paymentId");

-- CreateIndex
CREATE INDEX "PaymentDispute_buyerId_idx" ON "PaymentDispute"("buyerId");

-- CreateIndex
CREATE INDEX "PaymentDispute_status_idx" ON "PaymentDispute"("status");

-- CreateIndex
CREATE UNIQUE INDEX "WebhookEvent_eventId_key" ON "WebhookEvent"("eventId");

-- CreateIndex
CREATE INDEX "WebhookEvent_eventType_idx" ON "WebhookEvent"("eventType");

-- CreateIndex
CREATE INDEX "WebhookEvent_reference_idx" ON "WebhookEvent"("reference");

-- CreateIndex
CREATE INDEX "WebhookEvent_processed_idx" ON "WebhookEvent"("processed");

-- CreateIndex
CREATE UNIQUE INDEX "PromoCode_code_key" ON "PromoCode"("code");

-- CreateIndex
CREATE INDEX "PromoCode_sellerId_idx" ON "PromoCode"("sellerId");

-- CreateIndex
CREATE INDEX "PromoCode_productId_idx" ON "PromoCode"("productId");

-- CreateIndex
CREATE INDEX "PromoCode_code_idx" ON "PromoCode"("code");

-- CreateIndex
CREATE INDEX "PromoCode_isActive_idx" ON "PromoCode"("isActive");

-- CreateIndex
CREATE INDEX "PromoCode_expiresAt_idx" ON "PromoCode"("expiresAt");

-- CreateIndex
CREATE INDEX "PromoCodeUsage_promoCodeId_idx" ON "PromoCodeUsage"("promoCodeId");

-- CreateIndex
CREATE INDEX "PromoCodeUsage_userId_idx" ON "PromoCodeUsage"("userId");

-- CreateIndex
CREATE INDEX "PromoCodeUsage_orderId_idx" ON "PromoCodeUsage"("orderId");

-- CreateIndex
CREATE INDEX "SellerAnalytics_sellerId_idx" ON "SellerAnalytics"("sellerId");

-- CreateIndex
CREATE INDEX "SellerAnalytics_date_idx" ON "SellerAnalytics"("date");

-- CreateIndex
CREATE UNIQUE INDEX "SellerAnalytics_sellerId_date_key" ON "SellerAnalytics"("sellerId", "date");

-- CreateIndex
CREATE INDEX "BuyerSellerProfile_sellerId_intelligenceScore_idx" ON "BuyerSellerProfile"("sellerId", "intelligenceScore");

-- CreateIndex
CREATE INDEX "BuyerSellerProfile_buyerId_lastOrderAt_idx" ON "BuyerSellerProfile"("buyerId", "lastOrderAt");

-- CreateIndex
CREATE UNIQUE INDEX "BuyerSellerProfile_sellerId_buyerId_key" ON "BuyerSellerProfile"("sellerId", "buyerId");

-- CreateIndex
CREATE INDEX "PromoCampaign_promoType_status_idx" ON "PromoCampaign"("promoType", "status");

-- CreateIndex
CREATE INDEX "PromoCampaign_startDate_endDate_idx" ON "PromoCampaign"("startDate", "endDate");

-- CreateIndex
CREATE INDEX "PromoCampaign_audienceScope_priority_idx" ON "PromoCampaign"("audienceScope", "priority");

-- CreateIndex
CREATE INDEX "MarketplaceAnalyticsEvent_eventType_createdAt_idx" ON "MarketplaceAnalyticsEvent"("eventType", "createdAt");

-- CreateIndex
CREATE INDEX "MarketplaceAnalyticsEvent_entityType_entityId_idx" ON "MarketplaceAnalyticsEvent"("entityType", "entityId");

-- CreateIndex
CREATE INDEX "MarketplaceAnalyticsEvent_userId_createdAt_idx" ON "MarketplaceAnalyticsEvent"("userId", "createdAt");

-- CreateIndex
CREATE INDEX "FlashDeal_isActive_idx" ON "FlashDeal"("isActive");

-- CreateIndex
CREATE INDEX "FlashDeal_endDate_idx" ON "FlashDeal"("endDate");

-- CreateIndex
CREATE INDEX "FlashDeal_sellerId_startDate_idx" ON "FlashDeal"("sellerId", "startDate");

-- CreateIndex
CREATE INDEX "FlashDeal_startDate_idx" ON "FlashDeal"("startDate");

-- CreateIndex
CREATE INDEX "FlashDeal_promoType_isActive_idx" ON "FlashDeal"("promoType", "isActive");

-- CreateIndex
CREATE INDEX "FlashDeal_campaignId_idx" ON "FlashDeal"("campaignId");

-- CreateIndex
CREATE UNIQUE INDEX "FlashDeal_sellerId_productId_key" ON "FlashDeal"("sellerId", "productId");

-- CreateIndex
CREATE UNIQUE INDEX "PackingResponse_orderId_key" ON "PackingResponse"("orderId");

-- CreateIndex
CREATE INDEX "PackingResponse_orderId_idx" ON "PackingResponse"("orderId");

-- CreateIndex
CREATE INDEX "PackingResponse_type_idx" ON "PackingResponse"("type");

-- CreateIndex
CREATE INDEX "RestockNotification_productId_idx" ON "RestockNotification"("productId");

-- CreateIndex
CREATE INDEX "RestockNotification_buyerId_idx" ON "RestockNotification"("buyerId");

-- CreateIndex
CREATE UNIQUE INDEX "RestockNotification_productId_buyerId_key" ON "RestockNotification"("productId", "buyerId");

-- CreateIndex
CREATE INDEX "Wishlist_buyerId_createdAt_idx" ON "Wishlist"("buyerId", "createdAt");

-- CreateIndex
CREATE INDEX "Wishlist_productId_idx" ON "Wishlist"("productId");

-- CreateIndex
CREATE INDEX "Wishlist_priority_idx" ON "Wishlist"("priority");

-- CreateIndex
CREATE INDEX "Wishlist_createdAt_idx" ON "Wishlist"("createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "Wishlist_buyerId_productId_key" ON "Wishlist"("buyerId", "productId");

-- CreateIndex
CREATE INDEX "ReviewLike_reviewId_idx" ON "ReviewLike"("reviewId");

-- CreateIndex
CREATE INDEX "ReviewLike_userId_idx" ON "ReviewLike"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "ReviewLike_reviewId_userId_key" ON "ReviewLike"("reviewId", "userId");

-- CreateIndex
CREATE INDEX "ReviewReport_reviewId_idx" ON "ReviewReport"("reviewId");

-- CreateIndex
CREATE INDEX "ReviewReport_reporterId_idx" ON "ReviewReport"("reporterId");

-- CreateIndex
CREATE INDEX "ReviewReport_status_idx" ON "ReviewReport"("status");

-- CreateIndex
CREATE UNIQUE INDEX "ReviewReport_reviewId_reporterId_key" ON "ReviewReport"("reviewId", "reporterId");

-- CreateIndex
CREATE INDEX "SellerPerformance_sellerId_periodStart_idx" ON "SellerPerformance"("sellerId", "periodStart");

-- CreateIndex
CREATE INDEX "SellerPerformance_requiresAttention_idx" ON "SellerPerformance"("requiresAttention");

-- CreateIndex
CREATE UNIQUE INDEX "SellerPerformance_sellerId_periodType_periodStart_key" ON "SellerPerformance"("sellerId", "periodType", "periodStart");

-- CreateIndex
CREATE INDEX "SellerInsight_sellerId_priority_idx" ON "SellerInsight"("sellerId", "priority");

-- CreateIndex
CREATE INDEX "SellerInsight_type_idx" ON "SellerInsight"("type");

-- CreateIndex
CREATE INDEX "SellerInsight_isActedUpon_idx" ON "SellerInsight"("isActedUpon");

-- CreateIndex
CREATE UNIQUE INDEX "ProductUrgency_productId_key" ON "ProductUrgency"("productId");

-- CreateIndex
CREATE INDEX "ProductUrgency_urgencyLevel_idx" ON "ProductUrgency"("urgencyLevel");

-- CreateIndex
CREATE INDEX "ProductUrgency_autoBoostActive_idx" ON "ProductUrgency"("autoBoostActive");

-- CreateIndex
CREATE INDEX "FeedPost_sellerId_createdAt_idx" ON "FeedPost"("sellerId", "createdAt");

-- CreateIndex
CREATE INDEX "FeedPost_productId_createdAt_idx" ON "FeedPost"("productId", "createdAt");

-- CreateIndex
CREATE INDEX "Like_postId_createdAt_idx" ON "Like"("postId", "createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "Like_userId_postId_key" ON "Like"("userId", "postId");

-- CreateIndex
CREATE INDEX "EngagementEvent_postId_action_createdAt_idx" ON "EngagementEvent"("postId", "action", "createdAt");

-- CreateIndex
CREATE INDEX "EngagementEvent_productId_action_createdAt_idx" ON "EngagementEvent"("productId", "action", "createdAt");

-- CreateIndex
CREATE INDEX "EngagementEvent_userId_action_createdAt_idx" ON "EngagementEvent"("userId", "action", "createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "FeedComment_messageId_key" ON "FeedComment"("messageId");

-- CreateIndex
CREATE INDEX "FeedComment_postId_createdAt_idx" ON "FeedComment"("postId", "createdAt");

-- CreateIndex
CREATE INDEX "FeedComment_sellerId_createdAt_idx" ON "FeedComment"("sellerId", "createdAt");

-- CreateIndex
CREATE INDEX "FeedComment_userId_createdAt_idx" ON "FeedComment"("userId", "createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "Template_slug_key" ON "Template"("slug");

-- CreateIndex
CREATE INDEX "Template_category_idx" ON "Template"("category");

-- CreateIndex
CREATE INDEX "Template_status_idx" ON "Template"("status");

-- CreateIndex
CREATE INDEX "Template_type_idx" ON "Template"("type");

-- CreateIndex
CREATE INDEX "SellerTemplate_sellerId_idx" ON "SellerTemplate"("sellerId");

-- CreateIndex
CREATE INDEX "SellerTemplate_storeId_idx" ON "SellerTemplate"("storeId");

-- CreateIndex
CREATE INDEX "SellerTemplate_status_idx" ON "SellerTemplate"("status");

-- CreateIndex
CREATE UNIQUE INDEX "SellerTemplate_sellerId_templateId_key" ON "SellerTemplate"("sellerId", "templateId");

-- CreateIndex
CREATE UNIQUE INDEX "TemplatePurchase_idempotencyKey_key" ON "TemplatePurchase"("idempotencyKey");

-- CreateIndex
CREATE INDEX "TemplatePurchase_sellerId_idx" ON "TemplatePurchase"("sellerId");

-- CreateIndex
CREATE INDEX "TemplatePurchase_templateId_idx" ON "TemplatePurchase"("templateId");

-- CreateIndex
CREATE INDEX "TemplatePurchase_status_idx" ON "TemplatePurchase"("status");

-- CreateIndex
CREATE INDEX "AIUsage_userId_idx" ON "AIUsage"("userId");

-- CreateIndex
CREATE INDEX "AIUsage_storeId_idx" ON "AIUsage"("storeId");

-- CreateIndex
CREATE INDEX "AIUsage_createdAt_idx" ON "AIUsage"("createdAt");

-- CreateIndex
CREATE INDEX "StoreAsset_storeId_idx" ON "StoreAsset"("storeId");

-- CreateIndex
CREATE UNIQUE INDEX "CourierProfile_userId_key" ON "CourierProfile"("userId");

-- CreateIndex
CREATE INDEX "Vehicle_courierProfileId_idx" ON "Vehicle"("courierProfileId");

-- CreateIndex
CREATE UNIQUE INDEX "ConsolidatedPackage_trackingNumber_key" ON "ConsolidatedPackage"("trackingNumber");

-- CreateIndex
CREATE UNIQUE INDEX "ConsolidatedPackage_finalDeliveryAssignmentId_key" ON "ConsolidatedPackage"("finalDeliveryAssignmentId");

-- CreateIndex
CREATE INDEX "DeliveryRoute_status_idx" ON "DeliveryRoute"("status");

-- CreateIndex
CREATE INDEX "DeliveryStop_routeId_idx" ON "DeliveryStop"("routeId");

-- CreateIndex
CREATE INDEX "DeliveryStop_assignmentId_idx" ON "DeliveryStop"("assignmentId");

-- CreateIndex
CREATE UNIQUE INDEX "DeliveryAssignment_orderId_key" ON "DeliveryAssignment"("orderId");

-- CreateIndex
CREATE INDEX "DeliveryAssignment_courierId_status_idx" ON "DeliveryAssignment"("courierId", "status");

-- CreateIndex
CREATE INDEX "DeliveryAssignment_status_idx" ON "DeliveryAssignment"("status");

-- CreateIndex
CREATE INDEX "DeliveryOffer_assignmentId_idx" ON "DeliveryOffer"("assignmentId");

-- CreateIndex
CREATE INDEX "DeliveryOffer_courierId_status_idx" ON "DeliveryOffer"("courierId", "status");

-- CreateIndex
CREATE INDEX "DeliveryTrackingEvent_assignmentId_createdAt_idx" ON "DeliveryTrackingEvent"("assignmentId", "createdAt");

-- CreateIndex
CREATE INDEX "DeliveryProof_assignmentId_idx" ON "DeliveryProof"("assignmentId");

-- CreateIndex
CREATE INDEX "DeliveryIncident_assignmentId_idx" ON "DeliveryIncident"("assignmentId");

-- CreateIndex
CREATE INDEX "DeliveryIncident_status_idx" ON "DeliveryIncident"("status");

-- CreateIndex
CREATE UNIQUE INDEX "CourierEarning_assignmentId_key" ON "CourierEarning"("assignmentId");

-- CreateIndex
CREATE INDEX "CourierEarning_courierId_status_idx" ON "CourierEarning"("courierId", "status");

-- CreateIndex
CREATE INDEX "NotificationOutbox_status_createdAt_idx" ON "NotificationOutbox"("status", "createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "UserSession_token_key" ON "UserSession"("token");

-- CreateIndex
CREATE INDEX "UserSession_userId_idx" ON "UserSession"("userId");

-- CreateIndex
CREATE INDEX "WebAuthnCredential_userId_idx" ON "WebAuthnCredential"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "MarketplaceOrder_idempotencyKey_key" ON "MarketplaceOrder"("idempotencyKey");

-- CreateIndex
CREATE UNIQUE INDEX "NotificationPreference_userId_key" ON "NotificationPreference"("userId");

-- CreateIndex
CREATE INDEX "FunnelEvent_sessionId_idx" ON "FunnelEvent"("sessionId");

-- CreateIndex
CREATE INDEX "FunnelEvent_event_createdAt_idx" ON "FunnelEvent"("event", "createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "MarketConfig_code_key" ON "MarketConfig"("code");

-- CreateIndex
CREATE UNIQUE INDEX "ExternalSellerIntegration_provider_key" ON "ExternalSellerIntegration"("provider");

-- CreateIndex
CREATE INDEX "ExternalOffer_provider_idx" ON "ExternalOffer"("provider");

-- CreateIndex
CREATE INDEX "ExternalOffer_category_idx" ON "ExternalOffer"("category");

-- CreateIndex
CREATE UNIQUE INDEX "ExternalOffer_provider_externalProductId_key" ON "ExternalOffer"("provider", "externalProductId");

-- CreateIndex
CREATE INDEX "PayAIMessage_sessionId_idx" ON "PayAIMessage"("sessionId");

-- CreateIndex
CREATE INDEX "PayAICartItem_cartId_idx" ON "PayAICartItem"("cartId");

-- CreateIndex
CREATE UNIQUE INDEX "PayAIQuote_quoteNumber_key" ON "PayAIQuote"("quoteNumber");

-- CreateIndex
CREATE INDEX "PayAIQuote_quoteNumber_idx" ON "PayAIQuote"("quoteNumber");

-- CreateIndex
CREATE INDEX "PayAIQuote_status_idx" ON "PayAIQuote"("status");

-- CreateIndex
CREATE INDEX "PayAIPurchaseApproval_quoteId_idx" ON "PayAIPurchaseApproval"("quoteId");

-- CreateIndex
CREATE UNIQUE INDEX "PayAIOrder_orderNumber_key" ON "PayAIOrder"("orderNumber");

-- CreateIndex
CREATE UNIQUE INDEX "PayAIOrder_idempotencyKey_key" ON "PayAIOrder"("idempotencyKey");

-- CreateIndex
CREATE INDEX "PayAIOrder_orderNumber_idx" ON "PayAIOrder"("orderNumber");

-- CreateIndex
CREATE INDEX "PayAIOrder_userId_idx" ON "PayAIOrder"("userId");

-- CreateIndex
CREATE INDEX "PayAIPayment_orderId_idx" ON "PayAIPayment"("orderId");

-- CreateIndex
CREATE INDEX "PayAIPayment_providerOrderId_idx" ON "PayAIPayment"("providerOrderId");

-- CreateIndex
CREATE INDEX "PayAIOrderStatusEvent_orderId_idx" ON "PayAIOrderStatusEvent"("orderId");

-- CreateIndex
CREATE INDEX "PayAIAuditLog_entityId_idx" ON "PayAIAuditLog"("entityId");

-- CreateIndex
CREATE INDEX "PayAIAuditLog_action_idx" ON "PayAIAuditLog"("action");

-- AddForeignKey
ALTER TABLE "AdDiscountSession" ADD CONSTRAINT "AdDiscountSession_buyerId_fkey" FOREIGN KEY ("buyerId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AdDiscountSession" ADD CONSTRAINT "AdDiscountSession_productId_fkey" FOREIGN KEY ("productId") REFERENCES "Product"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Address" ADD CONSTRAINT "Address_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Store" ADD CONSTRAINT "Store_sellerId_fkey" FOREIGN KEY ("sellerId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Store" ADD CONSTRAINT "Store_sellerPlanId_fkey" FOREIGN KEY ("sellerPlanId") REFERENCES "SellerPlan"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "buyer_requests" ADD CONSTRAINT "buyer_requests_buyer_id_fkey" FOREIGN KEY ("buyer_id") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "request_responses" ADD CONSTRAINT "request_responses_request_id_fkey" FOREIGN KEY ("request_id") REFERENCES "buyer_requests"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "request_responses" ADD CONSTRAINT "request_responses_seller_id_fkey" FOREIGN KEY ("seller_id") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "StoreIntegration" ADD CONSTRAINT "StoreIntegration_storeId_fkey" FOREIGN KEY ("storeId") REFERENCES "Store"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Product" ADD CONSTRAINT "Product_storeId_fkey" FOREIGN KEY ("storeId") REFERENCES "Store"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProductImage" ADD CONSTRAINT "ProductImage_productId_fkey" FOREIGN KEY ("productId") REFERENCES "Product"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProductVideo" ADD CONSTRAINT "ProductVideo_productId_fkey" FOREIGN KEY ("productId") REFERENCES "Product"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProductOption" ADD CONSTRAINT "ProductOption_productId_fkey" FOREIGN KEY ("productId") REFERENCES "Product"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProductOffer" ADD CONSTRAINT "ProductOffer_productId_fkey" FOREIGN KEY ("productId") REFERENCES "Product"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProductOffer" ADD CONSTRAINT "ProductOffer_buyerId_fkey" FOREIGN KEY ("buyerId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProductOffer" ADD CONSTRAINT "ProductOffer_sellerId_fkey" FOREIGN KEY ("sellerId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProductQuestion" ADD CONSTRAINT "ProductQuestion_productId_fkey" FOREIGN KEY ("productId") REFERENCES "Product"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProductQuestion" ADD CONSTRAINT "ProductQuestion_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProductComparison" ADD CONSTRAINT "ProductComparison_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProductComparison" ADD CONSTRAINT "ProductComparison_productId_fkey" FOREIGN KEY ("productId") REFERENCES "Product"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProductComparison" ADD CONSTRAINT "ProductComparison_comparedProductId_fkey" FOREIGN KEY ("comparedProductId") REFERENCES "Product"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProductModelAsset" ADD CONSTRAINT "ProductModelAsset_productId_fkey" FOREIGN KEY ("productId") REFERENCES "Product"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Pool" ADD CONSTRAINT "Pool_productId_fkey" FOREIGN KEY ("productId") REFERENCES "Product"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PoolParticipant" ADD CONSTRAINT "PoolParticipant_poolId_fkey" FOREIGN KEY ("poolId") REFERENCES "Pool"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PoolParticipant" ADD CONSTRAINT "PoolParticipant_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Order" ADD CONSTRAINT "Order_buyerId_fkey" FOREIGN KEY ("buyerId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Order" ADD CONSTRAINT "Order_parentOrderId_fkey" FOREIGN KEY ("parentOrderId") REFERENCES "Order"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Order" ADD CONSTRAINT "Order_sellerId_fkey" FOREIGN KEY ("sellerId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Order" ADD CONSTRAINT "Order_consolidatedPackageId_fkey" FOREIGN KEY ("consolidatedPackageId") REFERENCES "ConsolidatedPackage"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PaymentProof" ADD CONSTRAINT "PaymentProof_orderId_fkey" FOREIGN KEY ("orderId") REFERENCES "Order"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PaymentAuditLog" ADD CONSTRAINT "PaymentAuditLog_paymentProofId_fkey" FOREIGN KEY ("paymentProofId") REFERENCES "PaymentProof"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "OrderItem" ADD CONSTRAINT "OrderItem_orderId_fkey" FOREIGN KEY ("orderId") REFERENCES "Order"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "OrderItem" ADD CONSTRAINT "OrderItem_productId_fkey" FOREIGN KEY ("productId") REFERENCES "Product"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Dispute" ADD CONSTRAINT "Dispute_orderId_fkey" FOREIGN KEY ("orderId") REFERENCES "Order"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Dispute" ADD CONSTRAINT "Dispute_buyerId_fkey" FOREIGN KEY ("buyerId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Dispute" ADD CONSTRAINT "Dispute_sellerId_fkey" FOREIGN KEY ("sellerId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DisputeMessage" ADD CONSTRAINT "DisputeMessage_disputeId_fkey" FOREIGN KEY ("disputeId") REFERENCES "Dispute"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PackingIssue" ADD CONSTRAINT "PackingIssue_orderId_fkey" FOREIGN KEY ("orderId") REFERENCES "Order"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PackingIssue" ADD CONSTRAINT "PackingIssue_buyerId_fkey" FOREIGN KEY ("buyerId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PackingIssue" ADD CONSTRAINT "PackingIssue_sellerId_fkey" FOREIGN KEY ("sellerId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "VerificationRequest" ADD CONSTRAINT "VerificationRequest_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Review" ADD CONSTRAINT "Review_productId_fkey" FOREIGN KEY ("productId") REFERENCES "Product"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Review" ADD CONSTRAINT "Review_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Review" ADD CONSTRAINT "Review_sellerId_fkey" FOREIGN KEY ("sellerId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Conversation" ADD CONSTRAINT "Conversation_storeId_fkey" FOREIGN KEY ("storeId") REFERENCES "Store"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ConversationParticipant" ADD CONSTRAINT "ConversationParticipant_conversationId_fkey" FOREIGN KEY ("conversationId") REFERENCES "Conversation"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ConversationParticipant" ADD CONSTRAINT "ConversationParticipant_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Message" ADD CONSTRAINT "Message_conversationId_fkey" FOREIGN KEY ("conversationId") REFERENCES "Conversation"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Message" ADD CONSTRAINT "Message_senderId_fkey" FOREIGN KEY ("senderId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Message" ADD CONSTRAINT "Message_recipientId_fkey" FOREIGN KEY ("recipientId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Message" ADD CONSTRAINT "Message_productId_fkey" FOREIGN KEY ("productId") REFERENCES "Product"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Message" ADD CONSTRAINT "Message_orderId_fkey" FOREIGN KEY ("orderId") REFERENCES "Order"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Notification" ADD CONSTRAINT "Notification_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SellerFollow" ADD CONSTRAINT "SellerFollow_buyerId_fkey" FOREIGN KEY ("buyerId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SellerFollow" ADD CONSTRAINT "SellerFollow_sellerId_fkey" FOREIGN KEY ("sellerId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BuyerProductInteraction" ADD CONSTRAINT "BuyerProductInteraction_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BuyerProductInteraction" ADD CONSTRAINT "BuyerProductInteraction_productId_fkey" FOREIGN KEY ("productId") REFERENCES "Product"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BuyerNotification" ADD CONSTRAINT "BuyerNotification_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BuyerNotification" ADD CONSTRAINT "BuyerNotification_orderId_fkey" FOREIGN KEY ("orderId") REFERENCES "Order"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Transaction" ADD CONSTRAINT "Transaction_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Wallet" ADD CONSTRAINT "Wallet_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "WalletLedgerEntry" ADD CONSTRAINT "WalletLedgerEntry_walletId_fkey" FOREIGN KEY ("walletId") REFERENCES "Wallet"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "WalletHold" ADD CONSTRAINT "WalletHold_walletId_fkey" FOREIGN KEY ("walletId") REFERENCES "Wallet"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RewardGrant" ADD CONSTRAINT "RewardGrant_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RewardGrant" ADD CONSTRAINT "RewardGrant_ruleId_fkey" FOREIGN KEY ("ruleId") REFERENCES "RewardRule"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Payout" ADD CONSTRAINT "Payout_sellerId_fkey" FOREIGN KEY ("sellerId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Cart" ADD CONSTRAINT "Cart_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CartItem" ADD CONSTRAINT "CartItem_cartId_fkey" FOREIGN KEY ("cartId") REFERENCES "Cart"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CartItem" ADD CONSTRAINT "CartItem_productId_fkey" FOREIGN KEY ("productId") REFERENCES "Product"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TrackingEvent" ADD CONSTRAINT "TrackingEvent_orderId_fkey" FOREIGN KEY ("orderId") REFERENCES "Order"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SystemLog" ADD CONSTRAINT "SystemLog_adminId_fkey" FOREIGN KEY ("adminId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PageView" ADD CONSTRAINT "PageView_productId_fkey" FOREIGN KEY ("productId") REFERENCES "Product"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Subscription" ADD CONSTRAINT "Subscription_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SellerPlanBenefit" ADD CONSTRAINT "SellerPlanBenefit_sellerPlanId_fkey" FOREIGN KEY ("sellerPlanId") REFERENCES "SellerPlan"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SellerPlanBenefit" ADD CONSTRAINT "SellerPlanBenefit_storeId_fkey" FOREIGN KEY ("storeId") REFERENCES "Store"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SubscriptionInvoice" ADD CONSTRAINT "SubscriptionInvoice_sellerPlanId_fkey" FOREIGN KEY ("sellerPlanId") REFERENCES "SellerPlan"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EscrowPayment" ADD CONSTRAINT "EscrowPayment_orderId_fkey" FOREIGN KEY ("orderId") REFERENCES "Order"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EscrowPayment" ADD CONSTRAINT "EscrowPayment_fulfillmentOrderId_fkey" FOREIGN KEY ("fulfillmentOrderId") REFERENCES "FulfillmentOrder"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Payment" ADD CONSTRAINT "Payment_orderId_fkey" FOREIGN KEY ("orderId") REFERENCES "Order"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Payment" ADD CONSTRAINT "Payment_buyerId_fkey" FOREIGN KEY ("buyerId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Payment" ADD CONSTRAINT "Payment_sellerId_fkey" FOREIGN KEY ("sellerId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Commission" ADD CONSTRAINT "Commission_paymentId_fkey" FOREIGN KEY ("paymentId") REFERENCES "Payment"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PaymentDispute" ADD CONSTRAINT "PaymentDispute_paymentId_fkey" FOREIGN KEY ("paymentId") REFERENCES "Payment"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PaymentDispute" ADD CONSTRAINT "PaymentDispute_buyerId_fkey" FOREIGN KEY ("buyerId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PromoCode" ADD CONSTRAINT "PromoCode_sellerId_fkey" FOREIGN KEY ("sellerId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PromoCode" ADD CONSTRAINT "PromoCode_productId_fkey" FOREIGN KEY ("productId") REFERENCES "Product"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PromoCodeUsage" ADD CONSTRAINT "PromoCodeUsage_promoCodeId_fkey" FOREIGN KEY ("promoCodeId") REFERENCES "PromoCode"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BuyerSellerProfile" ADD CONSTRAINT "BuyerSellerProfile_sellerId_fkey" FOREIGN KEY ("sellerId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BuyerSellerProfile" ADD CONSTRAINT "BuyerSellerProfile_buyerId_fkey" FOREIGN KEY ("buyerId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PromoCampaign" ADD CONSTRAINT "PromoCampaign_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MarketplaceAnalyticsEvent" ADD CONSTRAINT "MarketplaceAnalyticsEvent_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FlashDeal" ADD CONSTRAINT "FlashDeal_productId_fkey" FOREIGN KEY ("productId") REFERENCES "Product"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FlashDeal" ADD CONSTRAINT "FlashDeal_sellerId_fkey" FOREIGN KEY ("sellerId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FlashDeal" ADD CONSTRAINT "FlashDeal_campaignId_fkey" FOREIGN KEY ("campaignId") REFERENCES "PromoCampaign"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PackingResponse" ADD CONSTRAINT "PackingResponse_orderId_fkey" FOREIGN KEY ("orderId") REFERENCES "Order"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RestockNotification" ADD CONSTRAINT "RestockNotification_productId_fkey" FOREIGN KEY ("productId") REFERENCES "Product"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RestockNotification" ADD CONSTRAINT "RestockNotification_buyerId_fkey" FOREIGN KEY ("buyerId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Wishlist" ADD CONSTRAINT "Wishlist_buyerId_fkey" FOREIGN KEY ("buyerId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Wishlist" ADD CONSTRAINT "Wishlist_productId_fkey" FOREIGN KEY ("productId") REFERENCES "Product"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ReviewLike" ADD CONSTRAINT "ReviewLike_reviewId_fkey" FOREIGN KEY ("reviewId") REFERENCES "Review"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ReviewLike" ADD CONSTRAINT "ReviewLike_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ReviewReport" ADD CONSTRAINT "ReviewReport_reviewId_fkey" FOREIGN KEY ("reviewId") REFERENCES "Review"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ReviewReport" ADD CONSTRAINT "ReviewReport_reporterId_fkey" FOREIGN KEY ("reporterId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ReviewReport" ADD CONSTRAINT "ReviewReport_adminId_fkey" FOREIGN KEY ("adminId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SellerPerformance" ADD CONSTRAINT "SellerPerformance_sellerId_fkey" FOREIGN KEY ("sellerId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SellerInsight" ADD CONSTRAINT "SellerInsight_sellerId_fkey" FOREIGN KEY ("sellerId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProductUrgency" ADD CONSTRAINT "ProductUrgency_productId_fkey" FOREIGN KEY ("productId") REFERENCES "Product"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FeedPost" ADD CONSTRAINT "FeedPost_sellerId_fkey" FOREIGN KEY ("sellerId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FeedPost" ADD CONSTRAINT "FeedPost_productId_fkey" FOREIGN KEY ("productId") REFERENCES "Product"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Like" ADD CONSTRAINT "Like_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Like" ADD CONSTRAINT "Like_postId_fkey" FOREIGN KEY ("postId") REFERENCES "FeedPost"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EngagementEvent" ADD CONSTRAINT "EngagementEvent_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EngagementEvent" ADD CONSTRAINT "EngagementEvent_postId_fkey" FOREIGN KEY ("postId") REFERENCES "FeedPost"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EngagementEvent" ADD CONSTRAINT "EngagementEvent_productId_fkey" FOREIGN KEY ("productId") REFERENCES "Product"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FeedComment" ADD CONSTRAINT "FeedComment_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FeedComment" ADD CONSTRAINT "FeedComment_postId_fkey" FOREIGN KEY ("postId") REFERENCES "FeedPost"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FeedComment" ADD CONSTRAINT "FeedComment_sellerId_fkey" FOREIGN KEY ("sellerId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FeedComment" ADD CONSTRAINT "FeedComment_messageId_fkey" FOREIGN KEY ("messageId") REFERENCES "Message"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FeedComment" ADD CONSTRAINT "FeedComment_parentId_fkey" FOREIGN KEY ("parentId") REFERENCES "FeedComment"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SellerTemplate" ADD CONSTRAINT "SellerTemplate_sellerId_fkey" FOREIGN KEY ("sellerId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SellerTemplate" ADD CONSTRAINT "SellerTemplate_templateId_fkey" FOREIGN KEY ("templateId") REFERENCES "Template"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SellerTemplate" ADD CONSTRAINT "SellerTemplate_storeId_fkey" FOREIGN KEY ("storeId") REFERENCES "Store"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TemplatePurchase" ADD CONSTRAINT "TemplatePurchase_sellerId_fkey" FOREIGN KEY ("sellerId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TemplatePurchase" ADD CONSTRAINT "TemplatePurchase_templateId_fkey" FOREIGN KEY ("templateId") REFERENCES "Template"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CourierProfile" ADD CONSTRAINT "CourierProfile_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CourierProfile" ADD CONSTRAINT "CourierProfile_activeVehicleId_fkey" FOREIGN KEY ("activeVehicleId") REFERENCES "Vehicle"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Vehicle" ADD CONSTRAINT "Vehicle_courierProfileId_fkey" FOREIGN KEY ("courierProfileId") REFERENCES "CourierProfile"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ConsolidatedPackage" ADD CONSTRAINT "ConsolidatedPackage_buyerId_fkey" FOREIGN KEY ("buyerId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ConsolidatedPackage" ADD CONSTRAINT "ConsolidatedPackage_hubId_fkey" FOREIGN KEY ("hubId") REFERENCES "Hub"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ConsolidatedPackage" ADD CONSTRAINT "ConsolidatedPackage_finalDeliveryAssignmentId_fkey" FOREIGN KEY ("finalDeliveryAssignmentId") REFERENCES "DeliveryAssignment"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DeliveryStop" ADD CONSTRAINT "DeliveryStop_routeId_fkey" FOREIGN KEY ("routeId") REFERENCES "DeliveryRoute"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DeliveryStop" ADD CONSTRAINT "DeliveryStop_assignmentId_fkey" FOREIGN KEY ("assignmentId") REFERENCES "DeliveryAssignment"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DeliveryAssignment" ADD CONSTRAINT "DeliveryAssignment_orderId_fkey" FOREIGN KEY ("orderId") REFERENCES "Order"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DeliveryAssignment" ADD CONSTRAINT "DeliveryAssignment_courierId_fkey" FOREIGN KEY ("courierId") REFERENCES "CourierProfile"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DeliveryAssignment" ADD CONSTRAINT "DeliveryAssignment_vehicleId_fkey" FOREIGN KEY ("vehicleId") REFERENCES "Vehicle"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DeliveryAssignment" ADD CONSTRAINT "DeliveryAssignment_routeId_fkey" FOREIGN KEY ("routeId") REFERENCES "DeliveryRoute"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DeliveryOffer" ADD CONSTRAINT "DeliveryOffer_assignmentId_fkey" FOREIGN KEY ("assignmentId") REFERENCES "DeliveryAssignment"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DeliveryOffer" ADD CONSTRAINT "DeliveryOffer_courierId_fkey" FOREIGN KEY ("courierId") REFERENCES "CourierProfile"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DeliveryTrackingEvent" ADD CONSTRAINT "DeliveryTrackingEvent_assignmentId_fkey" FOREIGN KEY ("assignmentId") REFERENCES "DeliveryAssignment"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DeliveryProof" ADD CONSTRAINT "DeliveryProof_assignmentId_fkey" FOREIGN KEY ("assignmentId") REFERENCES "DeliveryAssignment"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DeliveryIncident" ADD CONSTRAINT "DeliveryIncident_assignmentId_fkey" FOREIGN KEY ("assignmentId") REFERENCES "DeliveryAssignment"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CourierEarning" ADD CONSTRAINT "CourierEarning_courierId_fkey" FOREIGN KEY ("courierId") REFERENCES "CourierProfile"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "UserSession" ADD CONSTRAINT "UserSession_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "WebAuthnCredential" ADD CONSTRAINT "WebAuthnCredential_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MarketplaceOrder" ADD CONSTRAINT "MarketplaceOrder_buyerId_fkey" FOREIGN KEY ("buyerId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MarketplaceOrder" ADD CONSTRAINT "MarketplaceOrder_promoCodeId_fkey" FOREIGN KEY ("promoCodeId") REFERENCES "PromoCode"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MarketplaceOrder" ADD CONSTRAINT "MarketplaceOrder_shippingAddressId_fkey" FOREIGN KEY ("shippingAddressId") REFERENCES "Address"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FulfillmentOrder" ADD CONSTRAINT "FulfillmentOrder_marketplaceOrderId_fkey" FOREIGN KEY ("marketplaceOrderId") REFERENCES "MarketplaceOrder"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FulfillmentOrder" ADD CONSTRAINT "FulfillmentOrder_buyerId_fkey" FOREIGN KEY ("buyerId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FulfillmentOrder" ADD CONSTRAINT "FulfillmentOrder_sellerId_fkey" FOREIGN KEY ("sellerId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FulfillmentOrder" ADD CONSTRAINT "FulfillmentOrder_consolidatedPackageId_fkey" FOREIGN KEY ("consolidatedPackageId") REFERENCES "ConsolidatedPackage"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FulfillmentItem" ADD CONSTRAINT "FulfillmentItem_fulfillmentOrderId_fkey" FOREIGN KEY ("fulfillmentOrderId") REFERENCES "FulfillmentOrder"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FulfillmentItem" ADD CONSTRAINT "FulfillmentItem_productId_fkey" FOREIGN KEY ("productId") REFERENCES "Product"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "InventoryReservation" ADD CONSTRAINT "InventoryReservation_productId_fkey" FOREIGN KEY ("productId") REFERENCES "Product"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "InventoryReservation" ADD CONSTRAINT "InventoryReservation_fulfillmentOrderId_fkey" FOREIGN KEY ("fulfillmentOrderId") REFERENCES "FulfillmentOrder"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "NotificationPreference" ADD CONSTRAINT "NotificationPreference_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PayAIMessage" ADD CONSTRAINT "PayAIMessage_sessionId_fkey" FOREIGN KEY ("sessionId") REFERENCES "PayAISession"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PayAICartItem" ADD CONSTRAINT "PayAICartItem_cartId_fkey" FOREIGN KEY ("cartId") REFERENCES "PayAICart"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PayAIQuote" ADD CONSTRAINT "PayAIQuote_cartId_fkey" FOREIGN KEY ("cartId") REFERENCES "PayAICart"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PayAIPurchaseApproval" ADD CONSTRAINT "PayAIPurchaseApproval_quoteId_fkey" FOREIGN KEY ("quoteId") REFERENCES "PayAIQuote"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PayAIOrder" ADD CONSTRAINT "PayAIOrder_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PayAIOrder" ADD CONSTRAINT "PayAIOrder_quoteId_fkey" FOREIGN KEY ("quoteId") REFERENCES "PayAIQuote"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PayAIPayment" ADD CONSTRAINT "PayAIPayment_orderId_fkey" FOREIGN KEY ("orderId") REFERENCES "PayAIOrder"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PayAIOrderStatusEvent" ADD CONSTRAINT "PayAIOrderStatusEvent_orderId_fkey" FOREIGN KEY ("orderId") REFERENCES "PayAIOrder"("id") ON DELETE CASCADE ON UPDATE CASCADE;
