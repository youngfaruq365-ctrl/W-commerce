const fs = require('fs');
const file = 'prisma/schema.prisma';
let content = fs.readFileSync(file, 'utf8');

const replacement = ` model Store {
   id            String    @id @default(uuid())
   sellerId      String    @unique
   user          User      @relation(fields: [sellerId], references: [id])

   storeName     String
   description   String?
   logoUrl       String?
   bannerUrl     String?
   country       String

   isVerified    Boolean   @default(false)
   kycTier       Int       @default(1)
   trustScore    Int       @default(50) // 0-100

   // Store Approval Workflow
   approvalStatus String  @default("PENDING") // PENDING, APPROVED, REJECTED, SUSPENDED
   approvedAt      DateTime?       // When store was approved
   rejectionReason String?        // Why store was rejected
   complianceScore Int?           // Compliance check score (0-100)
   lastComplianceCheck DateTime?  // When last compliance check was done

   // Performance Score (0-100) - composite of rating, trust, metrics
   performanceScore Int   @default(50)

   // Premium Features
   isPremium     Boolean   @default(false)
   portfolioLayout String?
   portfolioSlug   String?   @unique
   portfolioConfig String?
   brandStory    String?

   // Store DNA Engine
   storeDna            String?
   storeDnaDraft       String?
   storeDnaVersion     Int       @default(1)
   storeDnaUpdatedAt   DateTime?

   // Ratings
   averageRating Float     @default(0.0)
   totalReviews  Int       @default(0)

   // Fulfillment metrics
   defaultDeliveryDays Int @default(5)
   onTimeDeliveryRate  Decimal @default(0.0)
   avgResponseMinutes  Int @default(45)

   // Business Intelligence
   totalSales     Decimal   @default(0)
   totalOrders    Int       @default(0)
   repeatBuyerRate Decimal  @default(0)
   topSellingProductId String?
   topSellingProductName String?

   // Alerts
   hasPendingAlerts Boolean @default(false)
   alertMessage    String?
   lastAlertAt    DateTime?

   // Tier-based benefits
   sellerTier     String    @default("STANDARD") // STANDARD, PREMIUM, ELITE
   sellerPlanId   String?
   sellerPlan     SellerPlan? @relation(fields: [sellerPlanId], references: [id])

   // Seller-configured plan benefits and payout rails
   enabledBenefits String?
   bankName        String?
   accountNumber   String?
   accountName     String?
   bankCode        String?
   paystackRecipientCode String?

   createdAt     DateTime  @default(now())
   updatedAt     DateTime  @updatedAt

   products      Product[]
   integrations StoreIntegration[]`;

const startIdx = content.indexOf(' model Store {');
const endIdx = content.indexOf('   integrations StoreIntegration[]');

if (startIdx !== -1 && endIdx !== -1) {
    const end = endIdx + '   integrations StoreIntegration[]'.length;
    const newContent = content.substring(0, startIdx) + replacement + content.substring(end);
    fs.writeFileSync(file, newContent);
    console.log("Successfully restored and updated model Store");
} else {
    console.log("Could not find start or end index");
}
