const fs = require('fs');

const path = 'prisma/schema.prisma';
let content = fs.readFileSync(path, 'utf8');

// The file is currently messed up around the Conversation and Notification models.
// Let's find "model Conversation {" and replace everything up to "model Notification {"

const regex = /model Conversation \{[\s\S]*?user\s+User\s+@relation\(fields:\s*\[userId\],\s*references:\s*\[id\]\)/m;

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
  user          User      @relation(fields: [userId], references: [id])`;

content = content.replace(regex, replacement);

fs.writeFileSync(path, content, 'utf8');
console.log('Schema fixed!');
