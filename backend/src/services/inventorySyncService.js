/**
 * GlobalX Inventory Sync Service
 * Syncs inventory with Shopify and WooCommerce
 */

const prisma = require('../utils/prismaClient');
const logger = require('../utils/logger');
const axios = require('axios');

class InventorySyncService {
    static assertFeatureAvailable() {
        if (process.env.ENABLE_REAL_INVENTORY_SYNC !== 'true') {
            throw new Error('Inventory sync is disabled in this deployment.');
        }
    }

    /**
     * Connect a store to external inventory
     * @param {string} storeId - Store ID
     * @param {Object} credentials - Platform credentials
     */
    static async connectStore(storeId, credentials) {
        const { platform, apiKey, apiSecret, storeUrl, accessToken } = credentials;
        
        try {
            this.assertFeatureAvailable();
            let connection = null;
            
            switch (platform) {
                case 'shopify':
                    connection = await this.connectShopify(storeId, { apiKey, apiSecret, storeUrl, accessToken });
                    break;
                case 'woocommerce':
                    connection = await this.connectWooCommerce(storeId, { apiKey, apiSecret, storeUrl, accessToken });
                    break;
                default:
                    throw new Error('Unsupported platform');
            }
            
            // Save connection to database
            await prisma.storeIntegration.create({
                data: {
                    storeId,
                    platform,
                    credentials: JSON.stringify(credentials),
                    status: 'connected',
                    lastSync: new Date()
                }
            });
            
            return { success: true, connection };
            
        } catch (error) {
            logger.error('Inventory sync connection error:', error);
            return { success: false, message: error.message };
        }
    }
    
    /**
     * Connect to Shopify
     */
    static async connectShopify(storeId, credentials) {
        this.assertFeatureAvailable();
        const { storeUrl, accessToken } = credentials;
        const response = await axios.get(`https://${storeUrl}/admin/api/2023-10/shop.json`, {
            headers: { 'X-Shopify-Access-Token': accessToken }
        });
        return response.data;
    }
    
    /**
     * Connect to WooCommerce
     */
    static async connectWooCommerce(storeId, credentials) {
        this.assertFeatureAvailable();
        const { storeUrl, apiKey, apiSecret } = credentials;
        const auth = Buffer.from(`${apiKey}:${apiSecret}`).toString('base64');
        const response = await axios.get(`https://${storeUrl}/wp-json/wc/v3/system_status`, {
            headers: { 'Authorization': `Basic ${auth}` }
        });
        return response.data;
    }
    
    /**
     * Sync inventory from external platform
     * @param {string} storeId - Store ID
     */
    static async syncInventory(storeId) {
        try {
            this.assertFeatureAvailable();
            // Get store integration
            const integration = await prisma.storeIntegration.findFirst({
                where: { storeId, status: 'connected' }
            });
            
            if (!integration) {
                return { success: false, message: 'No integration connected' };
            }
            
            let products = [];
            
            switch (integration.platform) {
                case 'shopify':
                    products = await this.syncShopifyProducts(integration);
                    break;
                case 'woocommerce':
                    products = await this.syncWooCommerceProducts(integration);
                    break;
            }
            
            // Update local products with external inventory
            for (const extProduct of products) {
                await prisma.product.updateMany({
                    where: {
                        storeId,
                        externalId: extProduct.externalId
                    },
                    data: {
                        stock: extProduct.inventory,
                        lastSync: new Date()
                    }
                });
            }
            
            // Update last sync time
            await prisma.storeIntegration.update({
                where: { id: integration.id },
                data: { lastSync: new Date() }
            });
            
            return {
                success: true,
                synced: products.length,
                timestamp: new Date()
            };
            
        } catch (error) {
            logger.error('Inventory sync error:', error);
            return { success: false, message: error.message };
        }
    }
    
    /**
     * Sync products from Shopify
     */
    static async syncShopifyProducts(integration) {
        this.assertFeatureAvailable();
        const { storeUrl, accessToken } = JSON.parse(integration.credentials);
        const response = await axios.get(`https://${storeUrl}/admin/api/2023-10/products.json`, {
            headers: { 'X-Shopify-Access-Token': accessToken }
        });
        return response.data.products.map(p => ({
            externalId: p.id.toString(),
            inventory: p.variants[0]?.inventory_quantity || 0
        }));
    }
    
    /**
     * Sync products from WooCommerce
     */
    static async syncWooCommerceProducts(integration) {
        this.assertFeatureAvailable();
        const { storeUrl, apiKey, apiSecret } = JSON.parse(integration.credentials);
        const auth = Buffer.from(`${apiKey}:${apiSecret}`).toString('base64');
        const response = await axios.get(`https://${storeUrl}/wp-json/wc/v3/products`, {
            headers: { 'Authorization': `Basic ${auth}` }
        });
        return response.data.map(p => ({
            externalId: p.id.toString(),
            inventory: p.stock_quantity || 0
        }));
    }
    
    /**
     * Push local inventory to external platform
     * @param {string} storeId - Store ID
     * @param {string} productId - Product ID (optional, syncs all if not provided)
     */
    static async pushInventory(storeId, productId = null) {
        try {
            this.assertFeatureAvailable();
            const integration = await prisma.storeIntegration.findFirst({
                where: { storeId, status: 'connected' }
            });
            
            if (!integration) {
                return { success: false, message: 'No integration connected' };
            }
            
            // Get products to sync
            const where = { storeId };
            if (productId) {
                where.id = productId;
            }
            
            const products = await prisma.product.findMany({ where });
            
            let synced = 0;
            
            for (const product of products) {
                switch (integration.platform) {
                    case 'shopify':
                        await this.pushToShopify(integration, product);
                        synced++;
                        break;
                    case 'woocommerce':
                        await this.pushToWooCommerce(integration, product);
                        synced++;
                        break;
                }
            }
            
            return {
                success: true,
                synced,
                timestamp: new Date()
            };
            
        } catch (error) {
            logger.error('Push inventory error:', error);
            return { success: false, message: error.message };
        }
    }
    
    /**
     * Push product to Shopify
     */
    static async pushToShopify(integration, product) {
        this.assertFeatureAvailable();
        const { storeUrl, accessToken } = JSON.parse(integration.credentials);
        if (!product.externalId) return;
        await axios.put(`https://${storeUrl}/admin/api/2023-10/variants/${product.externalId}.json`, {
            variant: { id: product.externalId, inventory_quantity: product.stock }
        }, {
            headers: { 'X-Shopify-Access-Token': accessToken }
        });
    }
    
    /**
     * Push product to WooCommerce
     */
    static async pushToWooCommerce(integration, product) {
        this.assertFeatureAvailable();
        const { storeUrl, apiKey, apiSecret } = JSON.parse(integration.credentials);
        if (!product.externalId) return;
        const auth = Buffer.from(`${apiKey}:${apiSecret}`).toString('base64');
        await axios.put(`https://${storeUrl}/wp-json/wc/v3/products/${product.externalId}`, {
            stock_quantity: product.stock
        }, {
            headers: { 'Authorization': `Basic ${auth}` }
        });
    }
    
    /**
     * Get sync status
     * @param {string} storeId - Store ID
     */
    static async getSyncStatus(storeId) {
        const integration = await prisma.storeIntegration.findFirst({
            where: { storeId }
        });
        
        if (!integration) {
            return {
                connected: false,
                platform: null,
                lastSync: null
            };
        }
        
        return {
            connected: true,
            platform: integration.platform,
            status: integration.status,
            lastSync: integration.lastSync,
            credentials: {
                storeUrl: JSON.parse(integration.credentials).storeUrl
            }
        };
    }
    
    /**
     * Disconnect integration
     * @param {string} storeId - Store ID
     */
    static async disconnect(storeId) {
        try {
            await prisma.storeIntegration.deleteMany({
                where: { storeId }
            });
            
            return { success: true };
        } catch (error) {
            logger.error('Disconnect error:', error);
            return { success: false, message: error.message };
        }
    }
}

module.exports = InventorySyncService;
