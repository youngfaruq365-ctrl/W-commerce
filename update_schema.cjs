const fs = require('fs');
const path = require('path');

const schemaPath = path.join(__dirname, 'database', 'prisma', 'schema.prisma');
let schema = fs.readFileSync(schemaPath, 'utf8');

// Add to User
if (!schema.includes('MarketplaceOrderBuyer')) {
    schema = schema.replace(
        /model User \{[\s\S]+?@@index\(\[email\]\)\n\}/,
        match => {
            const insertion = `\n  marketplaceOrders MarketplaceOrder[] @relation("MarketplaceOrderBuyer")\n  fulfillmentAsBuyer FulfillmentOrder[] @relation("FulfillmentBuyer")\n  fulfillmentAsSeller FulfillmentOrder[] @relation("FulfillmentSeller")\n`;
            return match.replace('@@index([email])', insertion + '  @@index([email])');
        }
    );
}

// Add to Address
if (!schema.includes('MarketplaceOrderAddress')) {
    schema = schema.replace(
        /model Address \{[\s\S]+?isDefault\s+Boolean\s+@default\(false\)\n\}/,
        match => match.replace('isDefault  Boolean @default(false)\n', 'isDefault  Boolean @default(false)\n  marketplaceOrders MarketplaceOrder[] @relation("MarketplaceOrderAddress")\n')
    );
}

// Add to Product
if (!schema.includes('FulfillmentItemProduct')) {
    schema = schema.replace(
        /model Product \{[\s\S]+?@@index\(\[isUrgencyBannerVisible\]\)\n\}/,
        match => {
            const insertion = `\n  fulfillmentItems FulfillmentItem[] @relation("FulfillmentItemProduct")\n`;
            return match.replace('@@index([category, createdAt])', insertion + '  @@index([category, createdAt])');
        }
    );
}

// Add to PromoCode (need to check where PromoCode is, assuming it has a createdAt or updatedAt)
if (!schema.includes('MarketplaceOrderPromo')) {
    schema = schema.replace(
        /model PromoCode \{[\s\S]+?\}/,
        match => {
            return match.slice(0, -1) + '  marketplaceOrders MarketplaceOrder[] @relation("MarketplaceOrderPromo")\n}';
        }
    );
}

// Add to ConsolidatedPackage
if (!schema.includes('FulfillmentPackage')) {
    schema = schema.replace(
        /model ConsolidatedPackage \{[\s\S]+?\}/,
        match => {
            return match.slice(0, -1) + '  fulfillmentOrders FulfillmentOrder[] @relation("FulfillmentPackage")\n}';
        }
    );
}

const newModels = `
model MarketplaceOrder {
  id                String             @id @default(uuid())
  buyerId           String
  buyer             User               @relation("MarketplaceOrderBuyer", fields: [buyerId], references: [id])
  subtotal          Decimal
  shippingCost      Decimal
  discountTotal     Decimal            @default(0)
  grandTotal        Decimal
  currency          String             @default("NGN")
  promoCodeId       String?
  promoCode         PromoCode?         @relation("MarketplaceOrderPromo", fields: [promoCodeId], references: [id])
  promoDiscount     Decimal?           @default(0)
  shippingAddressId String?
  shippingAddress   Address?           @relation("MarketplaceOrderAddress", fields: [shippingAddressId], references: [id])
  shippingSnapshot  String?
  paymentMethod     String?
  paymentReference  String?
  paymentStatus     String             @default("PENDING")
  paidAt            DateTime?
  status            String             @default("PENDING")
  idempotencyKey    String?            @unique
  notes             String?
  expiresAt         DateTime?
  createdAt         DateTime           @default(now())
  updatedAt         DateTime           @updatedAt

  fulfillmentOrders FulfillmentOrder[]
}

model FulfillmentOrder {
  id                 String           @id @default(uuid())
  marketplaceOrderId String
  marketplaceOrder   MarketplaceOrder @relation(fields: [marketplaceOrderId], references: [id])
  buyerId            String
  buyer              User             @relation("FulfillmentBuyer", fields: [buyerId], references: [id])
  sellerId           String
  seller             User             @relation("FulfillmentSeller", fields: [sellerId], references: [id])
  subtotal           Decimal
  shippingCost       Decimal
  discountAmount     Decimal          @default(0)
  grandTotal         Decimal
  currency           String           @default("NGN")
  commissionRate     Float
  commissionAmount   Decimal
  sellerAmount       Decimal
  status             String           @default("PENDING")
  paymentStatus      String           @default("PENDING")
  isConsolidated     Boolean          @default(false)
  hubLocation        String?
  consolidatedPackageId String?
  consolidatedPackage   ConsolidatedPackage? @relation("FulfillmentPackage", fields: [consolidatedPackageId], references: [id])

  createdAt          DateTime         @default(now())
  updatedAt          DateTime         @updatedAt

  items              FulfillmentItem[]
}

model FulfillmentItem {
  id                 String           @id @default(uuid())
  fulfillmentOrderId String
  fulfillmentOrder   FulfillmentOrder @relation(fields: [fulfillmentOrderId], references: [id], onDelete: Cascade)
  productId          String
  product            Product          @relation("FulfillmentItemProduct", fields: [productId], references: [id])
  quantity           Int
  priceAtTime        Decimal
  subtotal           Decimal
  variants           String?
  itemDiscount       Decimal          @default(0)
  weightKg           Float?
  dimensionsCm       String?

  createdAt          DateTime         @default(now())
  updatedAt          DateTime         @updatedAt
}
`;

if (!schema.includes('model MarketplaceOrder')) {
    schema += newModels;
}

fs.writeFileSync(schemaPath, schema, 'utf8');
console.log('Schema updated successfully!');
