const fs = require('fs');

const path = 'prisma/schema.prisma';
let content = fs.readFileSync(path, 'utf8');

// We need to restore Conversation, ConversationParticipant, Message, QuickReplyTemplate, Notification, SellerFollow
// First, let's find where Conversation ends. Actually, the file got mangled.
// Let's find "model ConversationParticipant {" (or whatever is left of it) 
// and find "model Notification {" or whatever is left.
// To be extremely safe, I will find "model StoreIntegration {" and "model Notification {" 
// Wait, StoreIntegration is higher up. Let's just find the index of "model ConversationParticipant {"
// Oh wait, the previous script REPLACED a large chunk. Let's find where it started and ended.
// I will just use `npx prisma format` to see if it fixes things. No, format won't recreate missing models.

// I will look for "model Conversation {" and "model SellerFollow {"
// and replace everything in between with the correct models.
const startStr = "model Conversation {";
const endStr = "model SellerFollow {";

const startIndex = content.indexOf(startStr);
const endIndex = content.indexOf(endStr);

if (startIndex === -1 || endIndex === -1) {
    console.error("Could not find bounds", startIndex, endIndex);
    process.exit(1);
}

const replacement = `model Conversation {
  id            String    @id @default(uuid())
  storeId       String?
  store         Store?    @relation(fields: [storeId], references: [id])
  status        String    @default("ACTIVE") // ACTIVE, ARCHIVED, CLOSED
  context       String?   // GENERAL, ORDER, PRODUCT
  contextId     String?   // Order ID or Product ID related to chat
  createdAt     DateTime  @default(now())
  updatedAt     DateTime  @updatedAt
  
  participants  ConversationParticipant[]
  messages      Message[]
}

model ConversationParticipant {
  id              String       @id @default(uuid())
  conversationId  String
  conversation    Conversation @relation(fields: [conversationId], references: [id])
  userId          String
  user            User         @relation(fields: [userId], references: [id])
  
  lastReadAt      DateTime     @default(now())

  @@unique([conversationId, userId])
  @@index([userId, lastReadAt])
}

model Message {
  id              String       @id @default(uuid())
  conversationId  String
  conversation    Conversation @relation(fields: [conversationId], references: [id])
  
  senderId        String
  sender          User         @relation("SentMessages", fields: [senderId], references: [id])
  
  recipientId     String?      // Optional direct reference for quick lookup
  recipient       User?        @relation("ReceivedMessages", fields: [recipientId], references: [id])

  // Context: linked product and/or order
  productId       String?
  product         Product?     @relation(fields: [productId], references: [id])
  orderId         String?
  order           Order?       @relation(fields: [orderId], references: [id])

  content         String
  attachmentUrl   String?
  metadata        String?
  feedComment     FeedComment? @relation("FeedCommentMessage")
  
  isSystemMessage Boolean      @default(false)
  isAutoReply     Boolean      @default(false)
  responseTimeMinutes Int?
  createdAt       DateTime     @default(now())

  @@index([conversationId, createdAt])
  @@index([recipientId, createdAt])
}

// Quick Reply Templates for Sellers
model QuickReplyTemplate {
  id          String    @id @default(uuid())
  sellerId    String
  title       String    // Short title shown in quick reply menu
  content     String    // The actual message template
  
  // Category for organizing templates
  category    String    @default("general") // general, shipping, payment, thanks, custom
  
  isActive    Boolean   @default(true)
  usageCount  Int       @default(0) // Track how often used
  createdAt   DateTime  @default(now())
  updatedAt   DateTime  @updatedAt

  @@index([sellerId])
  @@index([category])
}

model Notification {
  id            String    @id @default(uuid())
  userId        String
  user          User      @relation(fields: [userId], references: [id])

  title         String
  body          String
  type          String    // INFO, ORDER, POOL, ALERT
  isRead        Boolean   @default(false)
  linkUrl       String?

  createdAt     DateTime  @default(now())
}

`;

content = content.substring(0, startIndex) + replacement + content.substring(endIndex);

fs.writeFileSync(path, content, 'utf8');
console.log('Fixed using robust index replacement!');
