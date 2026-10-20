/**
 * Central Notification Event Map
 * Prevents magic strings scattered across the application and defines the taxonomy of events.
 */
const NotificationTypes = {
  // Orders
  ORDER_CREATED: "ORDER_CREATED",
  ORDER_CONFIRMED: "ORDER_CONFIRMED",
  ORDER_CANCELLED: "ORDER_CANCELLED",
  
  // Payments
  PAYMENT_SUCCESS: "PAYMENT_SUCCESS",
  PAYMENT_FAILED: "PAYMENT_FAILED",
  
  // Deliveries
  DELIVERY_REQUEST: "DELIVERY_REQUEST",
  DELIVERY_ACCEPTED: "DELIVERY_ACCEPTED",
  COURIER_ARRIVING: "COURIER_ARRIVING",
  ORDER_PICKED_UP: "ORDER_PICKED_UP",
  ORDER_DELIVERED: "ORDER_DELIVERED",
  
  // Messaging
  NEW_MESSAGE: "NEW_MESSAGE",
  
  // Marketing & Promo
  FLASH_SALE: "FLASH_SALE",
  PRICE_DROP: "PRICE_DROP",
  
  // Refunds
  REFUND_REQUESTED: "REFUND_REQUESTED",
  REFUND_COMPLETED: "REFUND_COMPLETED"
};

module.exports = NotificationTypes;
