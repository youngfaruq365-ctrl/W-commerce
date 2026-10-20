'use strict';

/**
 * Store approval helpers.
 *
 * A seller's store starts as PENDING. Only an admin (KYB / store approval)
 * moves it to APPROVED. Until then the store and its products must be
 * invisible to buyers and cannot be purchased.
 */

const APPROVED = 'APPROVED';

/** Prisma `where` fragment for a Product relation: `{ store: APPROVED_STORE }` */
const APPROVED_STORE = Object.freeze({ approvalStatus: APPROVED });

function isStoreApproved(store) {
    return !!store && store.approvalStatus === APPROVED;
}

/**
 * Throws a 409-style error if any product in the list belongs to an unapproved store.
 * Products must have `store` loaded (include: { store: true }).
 */
function assertProductsPurchasable(products) {
    for (const p of products) {
        if (p?.store && !isStoreApproved(p.store)) {
            const err = new Error(`"${p.title}" is not available for purchase.`);
            err.statusCode = 409;
            throw err;
        }
    }
}

module.exports = { APPROVED, APPROVED_STORE, isStoreApproved, assertProductsPurchasable };
