const fs = require('fs');
const path = require('path');

const schemaPath = path.join(__dirname, 'database', 'prisma', 'schema.prisma');
let schema = fs.readFileSync(schemaPath, 'utf8');

if (!schema.includes('InventoryReservationProduct')) {
    schema = schema.replace(
        /model Product \{/,
        'model Product {\n  inventoryReservations InventoryReservation[] @relation("InventoryReservationProduct")\n'
    );
}

if (!schema.includes('InventoryReservationFO')) {
    schema = schema.replace(
        /model FulfillmentOrder \{/,
        'model FulfillmentOrder {\n  inventoryReservations InventoryReservation[] @relation("InventoryReservationFO")\n'
    );
}

fs.writeFileSync(schemaPath, schema, 'utf8');
console.log('Fixed schema relation fields');
