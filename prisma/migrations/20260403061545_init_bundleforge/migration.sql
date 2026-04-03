-- CreateTable
CREATE TABLE "Shop" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "shopDomain" TEXT NOT NULL,
    "currency" TEXT NOT NULL DEFAULT 'USD',
    "brandColor" TEXT NOT NULL DEFAULT '#6366F1',
    "accentColor" TEXT NOT NULL DEFAULT '#0D9488',
    "defaultDiscount" REAL NOT NULL DEFAULT 10,
    "defaultHeadline" TEXT NOT NULL DEFAULT 'Complete the look',
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE "Bundle" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "shopId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'draft',
    "priority" INTEGER NOT NULL DEFAULT 0,
    "discountType" TEXT,
    "discountValue" REAL,
    "bogoTriggerQty" INTEGER,
    "bogoRewardQty" INTEGER,
    "bogoRewardType" TEXT,
    "bogoRewardValue" REAL,
    "targetProducts" TEXT,
    "targetTags" TEXT,
    "targetMinOrder" REAL,
    "targetMaxOrder" REAL,
    "headline" TEXT NOT NULL DEFAULT 'Complete the look',
    "description" TEXT,
    "imageUrl" TEXT,
    "impressions" INTEGER NOT NULL DEFAULT 0,
    "clicks" INTEGER NOT NULL DEFAULT 0,
    "conversions" INTEGER NOT NULL DEFAULT 0,
    "revenue" REAL NOT NULL DEFAULT 0,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "Bundle_shopId_fkey" FOREIGN KEY ("shopId") REFERENCES "Shop" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "BundleProduct" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "bundleId" TEXT NOT NULL,
    "productId" TEXT NOT NULL,
    "variantId" TEXT,
    "title" TEXT NOT NULL,
    "imageUrl" TEXT,
    "price" REAL NOT NULL DEFAULT 0,
    "quantity" INTEGER NOT NULL DEFAULT 1,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "BundleProduct_bundleId_fkey" FOREIGN KEY ("bundleId") REFERENCES "Bundle" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "VolumeRule" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "shopId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'draft',
    "targetProducts" TEXT,
    "targetCollections" TEXT,
    "impressions" INTEGER NOT NULL DEFAULT 0,
    "conversions" INTEGER NOT NULL DEFAULT 0,
    "revenue" REAL NOT NULL DEFAULT 0,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "VolumeRule_shopId_fkey" FOREIGN KEY ("shopId") REFERENCES "Shop" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "VolumeTier" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "volumeRuleId" TEXT NOT NULL,
    "minQuantity" INTEGER NOT NULL,
    "maxQuantity" INTEGER,
    "discountType" TEXT NOT NULL,
    "discountValue" REAL NOT NULL,
    "label" TEXT,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    CONSTRAINT "VolumeTier_volumeRuleId_fkey" FOREIGN KEY ("volumeRuleId") REFERENCES "VolumeRule" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "AnalyticsEvent" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "shopId" TEXT NOT NULL,
    "bundleId" TEXT,
    "volumeRuleId" TEXT,
    "eventType" TEXT NOT NULL,
    "orderId" TEXT,
    "revenue" REAL,
    "metadata" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "AnalyticsEvent_shopId_fkey" FOREIGN KEY ("shopId") REFERENCES "Shop" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "AnalyticsEvent_bundleId_fkey" FOREIGN KEY ("bundleId") REFERENCES "Bundle" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "AnalyticsEvent_volumeRuleId_fkey" FOREIGN KEY ("volumeRuleId") REFERENCES "VolumeRule" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateIndex
CREATE UNIQUE INDEX "Shop_shopDomain_key" ON "Shop"("shopDomain");

-- CreateIndex
CREATE INDEX "Bundle_shopId_status_idx" ON "Bundle"("shopId", "status");

-- CreateIndex
CREATE INDEX "Bundle_shopId_type_idx" ON "Bundle"("shopId", "type");

-- CreateIndex
CREATE INDEX "BundleProduct_bundleId_idx" ON "BundleProduct"("bundleId");

-- CreateIndex
CREATE UNIQUE INDEX "BundleProduct_bundleId_productId_key" ON "BundleProduct"("bundleId", "productId");

-- CreateIndex
CREATE INDEX "VolumeRule_shopId_status_idx" ON "VolumeRule"("shopId", "status");

-- CreateIndex
CREATE INDEX "VolumeTier_volumeRuleId_idx" ON "VolumeTier"("volumeRuleId");

-- CreateIndex
CREATE INDEX "AnalyticsEvent_shopId_eventType_createdAt_idx" ON "AnalyticsEvent"("shopId", "eventType", "createdAt");

-- CreateIndex
CREATE INDEX "AnalyticsEvent_bundleId_eventType_idx" ON "AnalyticsEvent"("bundleId", "eventType");

-- CreateIndex
CREATE INDEX "AnalyticsEvent_volumeRuleId_eventType_idx" ON "AnalyticsEvent"("volumeRuleId", "eventType");
