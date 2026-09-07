-- Update flash deals table to match production-ready spec
-- Convert discount from Float to Int (percentage 0-100)
-- Remove originalPrice and dealPrice (calculate on the fly)
-- Add unique constraint on (sellerId, productId)
-- Update indexes

-- First, create a new table with the updated schema
CREATE TABLE "FlashDeal_new" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "productId" TEXT NOT NULL,
    "sellerId" TEXT NOT NULL,
    "discount" INTEGER NOT NULL,
    "startDate" DATETIME NOT NULL,
    "endDate" DATETIME NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT false,
    "maxStock" INTEGER,
    "soldCount" INTEGER NOT NULL DEFAULT 0,
    "viewerCount" INTEGER NOT NULL DEFAULT 0,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "FlashDeal_productId_fkey" FOREIGN KEY ("productId") REFERENCES "Product" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "FlashDeal_sellerId_fkey" FOREIGN KEY ("sellerId") REFERENCES "User" ("id") ON UPDATE CASCADE
);

-- Migrate data, converting discount from decimal to integer
INSERT INTO "FlashDeal_new" ("id", "productId", "sellerId", "discount", "startDate", "endDate", "isActive", "maxStock", "soldCount", "viewerCount", "createdAt", "updatedAt")
SELECT "id", "productId", "sellerId", ROUND("discount" * 100), "startDate", "endDate", "isActive", "maxStock", "soldCount", "viewerCount", "createdAt", "updatedAt"
FROM "FlashDeal";

-- Drop old table
DROP TABLE "FlashDeal";

-- Rename new table
ALTER TABLE "FlashDeal_new" RENAME TO "FlashDeal";

-- Create unique constraint
CREATE UNIQUE INDEX "FlashDeal_sellerId_productId_key" ON "FlashDeal"("sellerId", "productId");

-- Create indexes
CREATE INDEX "FlashDeal_isActive_idx" ON "FlashDeal"("isActive");
CREATE INDEX "FlashDeal_endDate_idx" ON "FlashDeal"("endDate");
CREATE INDEX "FlashDeal_sellerId_startDate_idx" ON "FlashDeal"("sellerId", "startDate");
CREATE INDEX "FlashDeal_startDate_idx" ON "FlashDeal"("startDate");