const fs = require('fs');
const path = require('path');

const schemaPath = path.join(__dirname, 'database', 'prisma', 'schema.prisma');
let schema = fs.readFileSync(schemaPath, 'utf8');

// Add to Product
if (!schema.includes('InventoryReservationProduct')) {
    schema = schema.replace(
        /model Product \{[\s\S]+?@@index\(\[category, createdAt\]\)\n\}/,
        match => {
            const insertion = `\n  inventoryReservations InventoryReservation[] @relation("InventoryReservationProduct")\n`;
            return match.replace('@@index([category, createdAt])', insertion + '  @@index([category, createdAt])');
        }
    );
}

// Add to FulfillmentOrder
if (!schema.includes('InventoryReservationFO')) {
    schema = schema.replace(
        /model FulfillmentOrder \{[\s\S]+?items\s+FulfillmentItem\[\]\n\}/,
        match => {
            return match.slice(0, -1) + '  inventoryReservations InventoryReservation[] @relation("InventoryReservationFO")\n}';
        }
    );
}

const newModels = `
model InventoryReservation {
  id                 String    @id @default(uuid())
  productId          String
  product            Product   @relation("InventoryReservationProduct", fields: [productId], references: [id])
  fulfillmentOrderId String?
  fulfillmentOrder   FulfillmentOrder? @relation("InventoryReservationFO", fields: [fulfillmentOrderId], references: [id])
  quantity           Int
  status             String    @default("ACTIVE")
  expiresAt          DateTime
  releasedAt         DateTime?
  deductedAt         DateTime?
  createdAt          DateTime  @default(now())
  updatedAt          DateTime  @updatedAt
}
`;

if (!schema.includes('model InventoryReservation')) {
    schema += newModels;
}

fs.writeFileSync(schemaPath, schema, 'utf8');
console.log('Schema updated successfully!');
