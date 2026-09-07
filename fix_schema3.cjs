const fs = require('fs');
const path = require('path');

const schemaPath = path.join(__dirname, 'database', 'prisma', 'schema.prisma');
let schema = fs.readFileSync(schemaPath, 'utf8');

// Remove any existing InventoryReservation relation definitions
schema = schema.replace(/.*InventoryReservation\[\].*\n/g, '');

// Add them back cleanly
schema = schema.replace(
    /model Product \{/,
    'model Product {\n  inventoryReservations InventoryReservation[] @relation("InventoryReservationProduct")\n'
);

schema = schema.replace(
    /model FulfillmentOrder \{/,
    'model FulfillmentOrder {\n  inventoryReservations InventoryReservation[] @relation("InventoryReservationFO")\n'
);

fs.writeFileSync(schemaPath, schema, 'utf8');
console.log('Cleaned and fixed schema relations');
