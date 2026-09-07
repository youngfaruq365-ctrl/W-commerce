/*
  Warnings:

  - You are about to drop the column `accountName` on the `Store` table. All the data in the column will be lost.
  - You are about to drop the column `accountNumber` on the `Store` table. All the data in the column will be lost.
  - You are about to drop the column `bankCountry` on the `Store` table. All the data in the column will be lost.
  - You are about to drop the column `bankName` on the `Store` table. All the data in the column will be lost.
  - You are about to drop the column `paymentConfig` on the `Store` table. All the data in the column will be lost.
  - You are about to drop the column `paymentGatewayType` on the `Store` table. All the data in the column will be lost.
  - You are about to drop the column `paystackRecipientCode` on the `Store` table. All the data in the column will be lost.
  - You are about to drop the column `paystackSubaccount` on the `Store` table. All the data in the column will be lost.
  - You are about to drop the column `routingNumber` on the `Store` table. All the data in the column will be lost.
  - A unique constraint covering the columns `[conversationId,userId]` on the table `ConversationParticipant` will be added. If there are existing duplicate values, this will fail.
  - Added the required column `sellerId` to the `Review` table without a default value. This is not possible if the table is not empty.
  - Added the required column `updatedAt` to the `Store` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "Dispute" ADD COLUMN "adminId" TEXT;
ALTER TABLE "Dispute" ADD COLUMN "adminNotes" TEXT;
ALTER TABLE "Dispute" ADD COLUMN "buyerResponse" TEXT;
ALTER TABLE "Dispute" ADD COLUMN "responseDeadline" DATETIME;
ALTER TABLE "Dispute" ADD COLUMN "sellerResponse" TEXT;
ALTER TABLE "Dispute" ADD COLUMN "sellerResponseAt" DATETIME;

-- AlterTable
ALTER TABLE "request_responses" ADD COLUMN "alternativeSuggestion" TEXT;
ALTER TABLE "request_responses" ADD COLUMN "estimatedDeliveryDays" INTEGER;

-- CreateTable
CREATE TABLE "DisputeMessage" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "disputeId" TEXT NOT NULL,
    "senderId" TEXT NOT NULL,
    "senderType" TEXT NOT NULL,
    "message" TEXT NOT NULL,
    "evidenceUrl" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "DisputeMessage_disputeId_fkey" FOREIGN KEY ("disputeId") REFERENCES "Dispute" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "PackingIssue" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "orderId" TEXT NOT NULL,
    "buyerId" TEXT NOT NULL,
    "sellerId" TEXT NOT NULL,
    "issueType" TEXT NOT NULL,
    "buyerMessage" TEXT,
    "status" TEXT NOT NULL DEFAULT 'OPEN',
    "responseDeadline" DATETIME,
    "sellerRespondedAt" DATETIME,
    "escalatedAt" DATETIME,
    "responseLatencyMinutes" INTEGER,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "PackingIssue_orderId_fkey" FOREIGN KEY ("orderId") REFERENCES "Order" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "PackingIssue_buyerId_fkey" FOREIGN KEY ("buyerId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "PackingIssue_sellerId_fkey" FOREIGN KEY ("sellerId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "QuickReplyTemplate" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "sellerId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "content" TEXT NOT NULL,
    "category" TEXT NOT NULL DEFAULT 'general',
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "usageCount" INTEGER NOT NULL DEFAULT 0,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE "SellerFollow" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "buyerId" TEXT NOT NULL,
    "sellerId" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "SellerFollow_buyerId_fkey" FOREIGN KEY ("buyerId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "SellerFollow_sellerId_fkey" FOREIGN KEY ("sellerId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "BuyerProductInteraction" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "userId" TEXT NOT NULL,
    "productId" TEXT NOT NULL,
    "interactionType" TEXT NOT NULL,
    "weight" INTEGER NOT NULL DEFAULT 1,
    "source" TEXT,
    "metadata" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "BuyerProductInteraction_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "BuyerProductInteraction_productId_fkey" FOREIGN KEY ("productId") REFERENCES "Product" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "BuyerSellerProfile" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "sellerId" TEXT NOT NULL,
    "buyerId" TEXT NOT NULL,
    "totalOrders" INTEGER NOT NULL DEFAULT 0,
    "totalSpend" DECIMAL NOT NULL DEFAULT 0.0,
    "repeatOrders" INTEGER NOT NULL DEFAULT 0,
    "averageOrderValue" DECIMAL NOT NULL DEFAULT 0.0,
    "lastOrderAt" DATETIME,
    "favoriteCategories" TEXT,
    "intelligenceLabels" TEXT,
    "intelligenceScore" REAL NOT NULL DEFAULT 0.0,
    "lastNotifiedAt" DATETIME,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "BuyerSellerProfile_sellerId_fkey" FOREIGN KEY ("sellerId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "BuyerSellerProfile_buyerId_fkey" FOREIGN KEY ("buyerId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "PromoCampaign" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "title" TEXT NOT NULL,
    "promoType" TEXT NOT NULL DEFAULT 'FLASH_DEAL',
    "status" TEXT NOT NULL DEFAULT 'SCHEDULED',
    "bannerImage" TEXT,
    "startDate" DATETIME NOT NULL,
    "endDate" DATETIME NOT NULL,
    "audienceScope" TEXT NOT NULL DEFAULT 'SELLER',
    "seasonTag" TEXT,
    "targetRegion" TEXT,
    "priority" INTEGER NOT NULL DEFAULT 0,
    "autoSuggested" BOOLEAN NOT NULL DEFAULT false,
    "clicks" INTEGER NOT NULL DEFAULT 0,
    "conversions" INTEGER NOT NULL DEFAULT 0,
    "revenue" DECIMAL NOT NULL DEFAULT 0.0,
    "createdById" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "PromoCampaign_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "MarketplaceAnalyticsEvent" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "userId" TEXT,
    "eventType" TEXT NOT NULL,
    "entityType" TEXT NOT NULL,
    "entityId" TEXT NOT NULL,
    "metadata" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "MarketplaceAnalyticsEvent_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "RestockNotification" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "productId" TEXT NOT NULL,
    "buyerId" TEXT NOT NULL,
    "isNotified" BOOLEAN NOT NULL DEFAULT false,
    "notifiedAt" DATETIME,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "RestockNotification_productId_fkey" FOREIGN KEY ("productId") REFERENCES "Product" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "RestockNotification_buyerId_fkey" FOREIGN KEY ("buyerId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "Wishlist" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "buyerId" TEXT NOT NULL,
    "productId" TEXT NOT NULL,
    "priority" TEXT NOT NULL DEFAULT 'MEDIUM',
    "notes" TEXT,
    "priceDropAlertEnabled" BOOLEAN NOT NULL DEFAULT true,
    "lastPriceNotifiedAt" DATETIME,
    "targetPrice" DECIMAL,
    "restockAlertEnabled" BOOLEAN NOT NULL DEFAULT true,
    "lastRestockNotifiedAt" DATETIME,
    "addedToCartAt" DATETIME,
    "purchasedAt" DATETIME,
    "convertedToBuyerRequest" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "Wishlist_buyerId_fkey" FOREIGN KEY ("buyerId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "Wishlist_productId_fkey" FOREIGN KEY ("productId") REFERENCES "Product" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "ReviewLike" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "reviewId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "isHelpful" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "ReviewLike_reviewId_fkey" FOREIGN KEY ("reviewId") REFERENCES "Review" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "ReviewLike_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "ReviewReport" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "reviewId" TEXT NOT NULL,
    "reporterId" TEXT NOT NULL,
    "reason" TEXT NOT NULL,
    "description" TEXT,
    "status" TEXT NOT NULL DEFAULT 'PENDING',
    "adminId" TEXT,
    "adminNotes" TEXT,
    "resolvedAt" DATETIME,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "ReviewReport_reviewId_fkey" FOREIGN KEY ("reviewId") REFERENCES "Review" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "ReviewReport_reporterId_fkey" FOREIGN KEY ("reporterId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "ReviewReport_adminId_fkey" FOREIGN KEY ("adminId") REFERENCES "User" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "SellerPerformance" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "sellerId" TEXT NOT NULL,
    "periodType" TEXT NOT NULL,
    "periodStart" DATETIME NOT NULL,
    "periodEnd" DATETIME NOT NULL,
    "totalRevenue" DECIMAL NOT NULL DEFAULT 0,
    "totalOrders" INTEGER NOT NULL DEFAULT 0,
    "totalItemsSold" INTEGER NOT NULL DEFAULT 0,
    "averageOrderValue" DECIMAL NOT NULL DEFAULT 0,
    "newBuyers" INTEGER NOT NULL DEFAULT 0,
    "returningBuyers" INTEGER NOT NULL DEFAULT 0,
    "repeatBuyerRate" DECIMAL NOT NULL DEFAULT 0,
    "buyerSatisfactionScore" REAL NOT NULL DEFAULT 0,
    "onTimeDeliveryRate" DECIMAL NOT NULL DEFAULT 0,
    "averageShippingDays" INTEGER NOT NULL DEFAULT 0,
    "disputeRate" DECIMAL NOT NULL DEFAULT 0,
    "disputeResolutionTime" REAL NOT NULL DEFAULT 0,
    "averageResponseMinutes" INTEGER NOT NULL DEFAULT 0,
    "responseRate" DECIMAL NOT NULL DEFAULT 0,
    "trustScore" INTEGER NOT NULL DEFAULT 50,
    "ratingTrend" TEXT NOT NULL DEFAULT 'STABLE',
    "hasNegativeTrend" BOOLEAN NOT NULL DEFAULT false,
    "alertMessage" TEXT,
    "requiresAttention" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "SellerPerformance_sellerId_fkey" FOREIGN KEY ("sellerId") REFERENCES "User" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "SellerInsight" (
    "id" TEXT NOT NULL PRIMARY KEY,
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
    "actedAt" DATETIME,
    "dismissedAt" DATETIME,
    "expiresAt" DATETIME,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "SellerInsight_sellerId_fkey" FOREIGN KEY ("sellerId") REFERENCES "User" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "ProductUrgency" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "productId" TEXT NOT NULL,
    "stockLevel" INTEGER NOT NULL DEFAULT 0,
    "urgencyLevel" TEXT NOT NULL DEFAULT 'NORMAL',
    "urgencyScore" INTEGER NOT NULL DEFAULT 0,
    "daysUntilStockout" INTEGER,
    "lastRestockAt" DATETIME,
    "restockInProgress" BOOLEAN NOT NULL DEFAULT false,
    "wishlistCount" INTEGER NOT NULL DEFAULT 0,
    "viewCount24h" INTEGER NOT NULL DEFAULT 0,
    "cartAdds24h" INTEGER NOT NULL DEFAULT 0,
    "autoBoostActive" BOOLEAN NOT NULL DEFAULT false,
    "autoBoostUntil" DATETIME,
    "bannerMessage" TEXT,
    "lastCalculatedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "ProductUrgency_productId_fkey" FOREIGN KEY ("productId") REFERENCES "Product" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_FlashDeal" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "productId" TEXT NOT NULL,
    "sellerId" TEXT NOT NULL,
    "campaignId" TEXT,
    "discount" INTEGER NOT NULL,
    "promoType" TEXT NOT NULL DEFAULT 'FLASH_DEAL',
    "promoTitle" TEXT,
    "bannerImage" TEXT,
    "startDate" DATETIME NOT NULL,
    "endDate" DATETIME NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT false,
    "isFeatured" BOOLEAN NOT NULL DEFAULT false,
    "targetRegion" TEXT,
    "priority" INTEGER NOT NULL DEFAULT 0,
    "maxStock" INTEGER,
    "soldCount" INTEGER NOT NULL DEFAULT 0,
    "viewerCount" INTEGER NOT NULL DEFAULT 0,
    "clicks" INTEGER NOT NULL DEFAULT 0,
    "conversions" INTEGER NOT NULL DEFAULT 0,
    "revenue" DECIMAL NOT NULL DEFAULT 0.0,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "FlashDeal_productId_fkey" FOREIGN KEY ("productId") REFERENCES "Product" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "FlashDeal_sellerId_fkey" FOREIGN KEY ("sellerId") REFERENCES "User" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "FlashDeal_campaignId_fkey" FOREIGN KEY ("campaignId") REFERENCES "PromoCampaign" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);
INSERT INTO "new_FlashDeal" ("createdAt", "discount", "endDate", "id", "isActive", "maxStock", "productId", "sellerId", "soldCount", "startDate", "updatedAt", "viewerCount") SELECT "createdAt", "discount", "endDate", "id", "isActive", "maxStock", "productId", "sellerId", "soldCount", "startDate", "updatedAt", "viewerCount" FROM "FlashDeal";
DROP TABLE "FlashDeal";
ALTER TABLE "new_FlashDeal" RENAME TO "FlashDeal";
CREATE INDEX "FlashDeal_isActive_idx" ON "FlashDeal"("isActive");
CREATE INDEX "FlashDeal_endDate_idx" ON "FlashDeal"("endDate");
CREATE INDEX "FlashDeal_sellerId_startDate_idx" ON "FlashDeal"("sellerId", "startDate");
CREATE INDEX "FlashDeal_startDate_idx" ON "FlashDeal"("startDate");
CREATE INDEX "FlashDeal_promoType_isActive_idx" ON "FlashDeal"("promoType", "isActive");
CREATE INDEX "FlashDeal_campaignId_idx" ON "FlashDeal"("campaignId");
CREATE UNIQUE INDEX "FlashDeal_sellerId_productId_key" ON "FlashDeal"("sellerId", "productId");
CREATE TABLE "new_Message" (
    "id" TEXT NOT NULL PRIMARY KEY,
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
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "Message_conversationId_fkey" FOREIGN KEY ("conversationId") REFERENCES "Conversation" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "Message_senderId_fkey" FOREIGN KEY ("senderId") REFERENCES "User" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "Message_recipientId_fkey" FOREIGN KEY ("recipientId") REFERENCES "User" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "Message_productId_fkey" FOREIGN KEY ("productId") REFERENCES "Product" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "Message_orderId_fkey" FOREIGN KEY ("orderId") REFERENCES "Order" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);
INSERT INTO "new_Message" ("attachmentUrl", "content", "conversationId", "createdAt", "id", "isSystemMessage", "recipientId", "senderId") SELECT "attachmentUrl", "content", "conversationId", "createdAt", "id", "isSystemMessage", "recipientId", "senderId" FROM "Message";
DROP TABLE "Message";
ALTER TABLE "new_Message" RENAME TO "Message";
CREATE INDEX "Message_conversationId_createdAt_idx" ON "Message"("conversationId", "createdAt");
CREATE INDEX "Message_recipientId_createdAt_idx" ON "Message"("recipientId", "createdAt");
CREATE TABLE "new_Order" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "buyerId" TEXT NOT NULL,
    "totalAmount" DECIMAL NOT NULL,
    "currency" TEXT NOT NULL DEFAULT 'USD',
    "shippingCost" DECIMAL NOT NULL,
    "taxAmount" DECIMAL NOT NULL,
    "commissionRate" REAL NOT NULL DEFAULT 0.10,
    "commissionAmount" DECIMAL,
    "sellerAmount" DECIMAL,
    "status" TEXT NOT NULL DEFAULT 'PENDING',
    "paymentStatus" TEXT NOT NULL DEFAULT 'PENDING',
    "paymentMethod" TEXT,
    "stripePaymentId" TEXT,
    "proofUrl" TEXT,
    "escrowId" TEXT,
    "orderType" TEXT NOT NULL DEFAULT 'PHYSICAL',
    "sellerId" TEXT,
    "packingSerial" TEXT,
    "packingConfirmationCode" TEXT,
    "packedAt" DATETIME,
    "packageConfirmedAt" DATETIME,
    "readyToShipAt" DATETIME,
    "responseDueAt" DATETIME,
    "escalatedAt" DATETIME,
    "estimatedDeliveryDate" DATETIME,
    "deliveryConfirmationCode" TEXT,
    "deliveryConfirmedAt" DATETIME,
    "lastTrackingUpdateAt" DATETIME,
    "isDeliveryDelayed" BOOLEAN NOT NULL DEFAULT false,
    "delayReason" TEXT,
    "deliveredAt" DATETIME,
    "escrowReleaseAt" DATETIME,
    "escrowReleasedAt" DATETIME,
    "isConsolidated" BOOLEAN NOT NULL DEFAULT false,
    "hubLocation" TEXT,
    "shippingAddressId" TEXT,
    "shippingAddress" TEXT,
    "trackingNumber" TEXT,
    "carrier" TEXT,
    "carrierService" TEXT,
    "originCountry" TEXT,
    "destinationCountry" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "Order_buyerId_fkey" FOREIGN KEY ("buyerId") REFERENCES "User" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "Order_sellerId_fkey" FOREIGN KEY ("sellerId") REFERENCES "User" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);
INSERT INTO "new_Order" ("buyerId", "carrier", "commissionAmount", "commissionRate", "createdAt", "currency", "deliveredAt", "escrowId", "escrowReleaseAt", "escrowReleasedAt", "hubLocation", "id", "isConsolidated", "orderType", "paymentMethod", "paymentStatus", "proofUrl", "sellerAmount", "sellerId", "shippingAddress", "shippingAddressId", "shippingCost", "status", "stripePaymentId", "taxAmount", "totalAmount", "trackingNumber", "updatedAt") SELECT "buyerId", "carrier", "commissionAmount", "commissionRate", "createdAt", "currency", "deliveredAt", "escrowId", "escrowReleaseAt", "escrowReleasedAt", "hubLocation", "id", "isConsolidated", "orderType", "paymentMethod", "paymentStatus", "proofUrl", "sellerAmount", "sellerId", "shippingAddress", "shippingAddressId", "shippingCost", "status", "stripePaymentId", "taxAmount", "totalAmount", "trackingNumber", "updatedAt" FROM "Order";
DROP TABLE "Order";
ALTER TABLE "new_Order" RENAME TO "Order";
CREATE UNIQUE INDEX "Order_packingSerial_key" ON "Order"("packingSerial");
CREATE INDEX "Order_buyerId_createdAt_idx" ON "Order"("buyerId", "createdAt");
CREATE INDEX "Order_status_createdAt_idx" ON "Order"("status", "createdAt");
CREATE INDEX "Order_paymentStatus_idx" ON "Order"("paymentStatus");
CREATE INDEX "Order_escrowReleaseAt_idx" ON "Order"("escrowReleaseAt");
CREATE INDEX "Order_sellerId_idx" ON "Order"("sellerId");
CREATE INDEX "Order_estimatedDeliveryDate_idx" ON "Order"("estimatedDeliveryDate");
CREATE INDEX "Order_isDeliveryDelayed_idx" ON "Order"("isDeliveryDelayed");
CREATE TABLE "new_PackingResponse" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "orderId" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "message" TEXT NOT NULL,
    "buyerMessage" TEXT,
    "templateKey" TEXT,
    "issueType" TEXT,
    "respondedAt" DATETIME,
    "responseTimeMinutes" INTEGER,
    "escalated" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "PackingResponse_orderId_fkey" FOREIGN KEY ("orderId") REFERENCES "Order" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);
INSERT INTO "new_PackingResponse" ("buyerMessage", "createdAt", "id", "message", "orderId", "type", "updatedAt") SELECT "buyerMessage", "createdAt", "id", "message", "orderId", "type", "updatedAt" FROM "PackingResponse";
DROP TABLE "PackingResponse";
ALTER TABLE "new_PackingResponse" RENAME TO "PackingResponse";
CREATE UNIQUE INDEX "PackingResponse_orderId_key" ON "PackingResponse"("orderId");
CREATE INDEX "PackingResponse_orderId_idx" ON "PackingResponse"("orderId");
CREATE INDEX "PackingResponse_type_idx" ON "PackingResponse"("type");
CREATE TABLE "new_Product" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "storeId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "price" DECIMAL NOT NULL,
    "stock" INTEGER NOT NULL,
    "lowStockThreshold" INTEGER NOT NULL DEFAULT 5,
    "category" TEXT NOT NULL,
    "subCategory" TEXT,
    "tags" TEXT,
    "sku" TEXT,
    "hsCode" TEXT,
    "weightKg" REAL,
    "originHub" TEXT,
    "estimatedDeliveryDays" INTEGER NOT NULL DEFAULT 5,
    "productGroupId" TEXT,
    "normalizedTitle" TEXT,
    "isFlashSale" BOOLEAN NOT NULL DEFAULT false,
    "flashPrice" DECIMAL,
    "flashEndsAt" DATETIME,
    "earlyAccessTiers" TEXT,
    "exclusiveTier" TEXT,
    "urgencyLevel" TEXT NOT NULL DEFAULT 'NORMAL',
    "autoBoostExpiresAt" DATETIME,
    "isUrgencyBannerVisible" BOOLEAN NOT NULL DEFAULT false,
    "viewCount" INTEGER NOT NULL DEFAULT 0,
    "soldCount" INTEGER NOT NULL DEFAULT 0,
    "rating" REAL NOT NULL DEFAULT 0.0,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "Product_storeId_fkey" FOREIGN KEY ("storeId") REFERENCES "Store" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);
INSERT INTO "new_Product" ("category", "createdAt", "description", "earlyAccessTiers", "exclusiveTier", "flashEndsAt", "flashPrice", "hsCode", "id", "isFlashSale", "originHub", "price", "rating", "sku", "soldCount", "stock", "storeId", "subCategory", "title", "updatedAt", "viewCount", "weightKg") SELECT "category", "createdAt", "description", "earlyAccessTiers", "exclusiveTier", "flashEndsAt", "flashPrice", "hsCode", "id", "isFlashSale", "originHub", "price", "rating", "sku", "soldCount", "stock", "storeId", "subCategory", "title", "updatedAt", "viewCount", "weightKg" FROM "Product";
DROP TABLE "Product";
ALTER TABLE "new_Product" RENAME TO "Product";
CREATE INDEX "Product_category_createdAt_idx" ON "Product"("category", "createdAt");
CREATE INDEX "Product_category_price_idx" ON "Product"("category", "price");
CREATE INDEX "Product_storeId_idx" ON "Product"("storeId");
CREATE INDEX "Product_title_idx" ON "Product"("title");
CREATE INDEX "Product_sku_idx" ON "Product"("sku");
CREATE INDEX "Product_productGroupId_idx" ON "Product"("productGroupId");
CREATE INDEX "Product_normalizedTitle_idx" ON "Product"("normalizedTitle");
CREATE INDEX "Product_urgencyLevel_idx" ON "Product"("urgencyLevel");
CREATE INDEX "Product_isUrgencyBannerVisible_idx" ON "Product"("isUrgencyBannerVisible");
CREATE TABLE "new_Review" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "productId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "sellerId" TEXT NOT NULL,
    "rating" INTEGER NOT NULL,
    "comment" TEXT,
    "images" TEXT NOT NULL,
    "isFeatured" BOOLEAN NOT NULL DEFAULT false,
    "reply" TEXT,
    "repliedAt" DATETIME,
    "helpfulCount" INTEGER NOT NULL DEFAULT 0,
    "reportCount" INTEGER NOT NULL DEFAULT 0,
    "isTopReview" BOOLEAN NOT NULL DEFAULT false,
    "verifiedPurchase" BOOLEAN NOT NULL DEFAULT true,
    "orderId" TEXT,
    "transactionHash" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "Review_productId_fkey" FOREIGN KEY ("productId") REFERENCES "Product" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "Review_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "Review_sellerId_fkey" FOREIGN KEY ("sellerId") REFERENCES "User" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);
INSERT INTO "new_Review" ("comment", "createdAt", "id", "images", "isFeatured", "productId", "rating", "repliedAt", "reply", "userId") SELECT "comment", "createdAt", "id", "images", "isFeatured", "productId", "rating", "repliedAt", "reply", "userId" FROM "Review";
DROP TABLE "Review";
ALTER TABLE "new_Review" RENAME TO "Review";
CREATE INDEX "Review_productId_idx" ON "Review"("productId");
CREATE INDEX "Review_userId_idx" ON "Review"("userId");
CREATE INDEX "Review_sellerId_idx" ON "Review"("sellerId");
CREATE INDEX "Review_rating_idx" ON "Review"("rating");
CREATE INDEX "Review_isTopReview_idx" ON "Review"("isTopReview");
CREATE INDEX "Review_createdAt_idx" ON "Review"("createdAt");
CREATE TABLE "new_Store" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "sellerId" TEXT NOT NULL,
    "storeName" TEXT NOT NULL,
    "description" TEXT,
    "logoUrl" TEXT,
    "bannerUrl" TEXT,
    "country" TEXT NOT NULL,
    "isVerified" BOOLEAN NOT NULL DEFAULT false,
    "kycTier" INTEGER NOT NULL DEFAULT 1,
    "trustScore" INTEGER NOT NULL DEFAULT 50,
    "approvalStatus" TEXT NOT NULL DEFAULT 'PENDING',
    "approvedAt" DATETIME,
    "rejectionReason" TEXT,
    "complianceScore" INTEGER,
    "lastComplianceCheck" DATETIME,
    "performanceScore" INTEGER NOT NULL DEFAULT 50,
    "isPremium" BOOLEAN NOT NULL DEFAULT false,
    "portfolioLayout" TEXT,
    "portfolioSlug" TEXT,
    "portfolioConfig" TEXT,
    "brandStory" TEXT,
    "averageRating" REAL NOT NULL DEFAULT 0.0,
    "totalReviews" INTEGER NOT NULL DEFAULT 0,
    "defaultDeliveryDays" INTEGER NOT NULL DEFAULT 5,
    "onTimeDeliveryRate" DECIMAL NOT NULL DEFAULT 0.0,
    "avgResponseMinutes" INTEGER NOT NULL DEFAULT 45,
    "totalSales" DECIMAL NOT NULL DEFAULT 0,
    "totalOrders" INTEGER NOT NULL DEFAULT 0,
    "repeatBuyerRate" DECIMAL NOT NULL DEFAULT 0,
    "topSellingProductId" TEXT,
    "topSellingProductName" TEXT,
    "hasPendingAlerts" BOOLEAN NOT NULL DEFAULT false,
    "alertMessage" TEXT,
    "lastAlertAt" DATETIME,
    "sellerTier" TEXT NOT NULL DEFAULT 'STANDARD',
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "Store_sellerId_fkey" FOREIGN KEY ("sellerId") REFERENCES "User" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);
INSERT INTO "new_Store" ("averageRating", "bannerUrl", "brandStory", "country", "createdAt", "description", "id", "isPremium", "isVerified", "kycTier", "logoUrl", "portfolioConfig", "portfolioLayout", "portfolioSlug", "sellerId", "storeName", "trustScore") SELECT "averageRating", "bannerUrl", "brandStory", "country", "createdAt", "description", "id", "isPremium", "isVerified", "kycTier", "logoUrl", "portfolioConfig", "portfolioLayout", "portfolioSlug", "sellerId", "storeName", "trustScore" FROM "Store";
DROP TABLE "Store";
ALTER TABLE "new_Store" RENAME TO "Store";
CREATE UNIQUE INDEX "Store_sellerId_key" ON "Store"("sellerId");
CREATE UNIQUE INDEX "Store_portfolioSlug_key" ON "Store"("portfolioSlug");
CREATE INDEX "Store_sellerId_idx" ON "Store"("sellerId");
CREATE INDEX "Store_performanceScore_idx" ON "Store"("performanceScore");
CREATE INDEX "Store_hasPendingAlerts_idx" ON "Store"("hasPendingAlerts");
CREATE TABLE "new_User" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "email" TEXT NOT NULL,
    "passwordHash" TEXT NOT NULL,
    "fullName" TEXT NOT NULL,
    "role" TEXT NOT NULL DEFAULT 'BUYER',
    "avatarUrl" TEXT,
    "phone" TEXT,
    "isVerified" BOOLEAN NOT NULL DEFAULT false,
    "kycTier" INTEGER NOT NULL DEFAULT 1,
    "verificationLevel" TEXT NOT NULL DEFAULT 'BASIC',
    "hasPaidAccess" BOOLEAN NOT NULL DEFAULT false,
    "subscriptionTier" TEXT NOT NULL DEFAULT 'NONE',
    "accessExpiry" DATETIME,
    "verificationCode" TEXT,
    "verificationCodeExpires" DATETIME,
    "balance" DECIMAL NOT NULL DEFAULT 0.0,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    "country" TEXT,
    "googleId" TEXT,
    "appleId" TEXT,
    "authProvider" TEXT NOT NULL DEFAULT 'LOCAL',
    "failedLoginAttempts" INTEGER NOT NULL DEFAULT 0,
    "lockoutUntil" DATETIME,
    "isFlagged" BOOLEAN NOT NULL DEFAULT false,
    "deletionScheduledAt" DATETIME,
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
    "trialStartDate" DATETIME,
    "trialEndDate" DATETIME,
    "trialStatus" TEXT NOT NULL DEFAULT 'NONE',
    "isTrialActive" BOOLEAN NOT NULL DEFAULT false,
    "trialConversionDate" DATETIME,
    "trialPlan" TEXT,
    "trialPromoCode" TEXT
);
INSERT INTO "new_User" ("accessExpiry", "accountName", "accountNumber", "appleId", "authProvider", "avatarUrl", "balance", "bankCode", "bankName", "country", "createdAt", "deletionReason", "deletionScheduledAt", "email", "failedLoginAttempts", "fullName", "googleId", "hasPaidAccess", "id", "isFlagged", "isTrialActive", "isVerified", "kycTier", "lockoutUntil", "notificationPrefs", "passwordHash", "paystackSubaccount", "phone", "role", "subscriptionTier", "trialConversionDate", "trialEndDate", "trialPlan", "trialPromoCode", "trialStartDate", "trialStatus", "updatedAt", "verificationCode", "verificationCodeExpires", "verificationLevel") SELECT "accessExpiry", "accountName", "accountNumber", "appleId", "authProvider", "avatarUrl", "balance", "bankCode", "bankName", "country", "createdAt", "deletionReason", "deletionScheduledAt", "email", "failedLoginAttempts", "fullName", "googleId", "hasPaidAccess", "id", "isFlagged", "isTrialActive", "isVerified", "kycTier", "lockoutUntil", "notificationPrefs", "passwordHash", "paystackSubaccount", "phone", "role", "subscriptionTier", "trialConversionDate", "trialEndDate", "trialPlan", "trialPromoCode", "trialStartDate", "trialStatus", "updatedAt", "verificationCode", "verificationCodeExpires", "verificationLevel" FROM "User";
DROP TABLE "User";
ALTER TABLE "new_User" RENAME TO "User";
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");
CREATE UNIQUE INDEX "User_googleId_key" ON "User"("googleId");
CREATE UNIQUE INDEX "User_appleId_key" ON "User"("appleId");
CREATE INDEX "User_email_idx" ON "User"("email");
CREATE TABLE "new_buyer_requests" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "buyer_id" TEXT NOT NULL,
    "product_name" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "budget" DECIMAL NOT NULL,
    "preferredBudgetMax" DECIMAL,
    "quantity" INTEGER NOT NULL DEFAULT 1,
    "urgency" TEXT NOT NULL DEFAULT 'STANDARD',
    "category" TEXT,
    "location" TEXT,
    "neededBy" DATETIME,
    "isBulkRequest" BOOLEAN NOT NULL DEFAULT false,
    "demandScore" INTEGER NOT NULL DEFAULT 0,
    "status" TEXT NOT NULL DEFAULT 'OPEN',
    "created_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" DATETIME NOT NULL,
    CONSTRAINT "buyer_requests_buyer_id_fkey" FOREIGN KEY ("buyer_id") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);
INSERT INTO "new_buyer_requests" ("budget", "buyer_id", "created_at", "description", "id", "product_name", "status", "updated_at") SELECT "budget", "buyer_id", "created_at", "description", "id", "product_name", "status", "updated_at" FROM "buyer_requests";
DROP TABLE "buyer_requests";
ALTER TABLE "new_buyer_requests" RENAME TO "buyer_requests";
CREATE INDEX "buyer_requests_buyer_id_created_at_idx" ON "buyer_requests"("buyer_id", "created_at");
CREATE INDEX "buyer_requests_status_created_at_idx" ON "buyer_requests"("status", "created_at");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;

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
CREATE INDEX "QuickReplyTemplate_sellerId_idx" ON "QuickReplyTemplate"("sellerId");

-- CreateIndex
CREATE INDEX "QuickReplyTemplate_category_idx" ON "QuickReplyTemplate"("category");

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
CREATE INDEX "ConversationParticipant_userId_lastReadAt_idx" ON "ConversationParticipant"("userId", "lastReadAt");

-- CreateIndex
CREATE UNIQUE INDEX "ConversationParticipant_conversationId_userId_key" ON "ConversationParticipant"("conversationId", "userId");

-- CreateIndex
CREATE INDEX "Dispute_buyerId_idx" ON "Dispute"("buyerId");

-- CreateIndex
CREATE INDEX "Dispute_sellerId_idx" ON "Dispute"("sellerId");

-- CreateIndex
CREATE INDEX "Dispute_status_idx" ON "Dispute"("status");
