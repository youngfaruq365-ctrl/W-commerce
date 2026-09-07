/**
 * W-Commerce AnalyticsClient
 * ─────────────────────────────────────────────────────────────────────────
 * Safely fetches analytics data for the dashboard.
 */
import axios from 'axios';

// Ensure cookies are sent with requests
axios.defaults.withCredentials = true;

class AnalyticsClient {
  /**
   * Fetches the seller's core performance metrics (revenue, orders, customers)
   */
  static async getPerformanceMetrics() {
    try {
      const response = await axios.get('/api/v1/seller-analytics/performance');
      if (response.data && response.data.success) {
        return { success: true, data: response.data.metrics };
      }
      return { success: false, error: response.data?.message || 'Unknown error fetching metrics' };
    } catch (error) {
      console.error('Failed to fetch performance metrics:', error);
      return { success: false, error: error.response?.data?.message || error.message };
    }
  }

  /**
   * Fetches AI-generated insights for the seller based on performance
   */
  static async getInsights() {
    try {
      const response = await axios.get('/api/v1/seller-analytics/insights');
      if (response.data && response.data.success) {
        return { success: true, data: response.data.insights };
      }
      return { success: false, error: response.data?.message || 'Unknown error fetching insights' };
    } catch (error) {
      console.error('Failed to fetch insights:', error);
      return { success: false, error: error.response?.data?.message || error.message };
    }
  }

  static async getTopProducts() {
    try {
      const response = await axios.get('/api/v1/seller-analytics/top-products');
      if (response.data && response.data.success) {
        return { success: true, data: response.data.products };
      }
      return { success: false, error: response.data?.message || 'Unknown error' };
    } catch (error) {
      return { success: false, error: error.message };
    }
  }

  static async getSalesByPeriod(period = '7d') {
    try {
      const response = await axios.get(`/api/v1/seller-analytics/sales-by-period?period=${period}`);
      if (response.data && response.data.success) {
        return { success: true, data: response.data.sales };
      }
      return { success: false, error: response.data?.message || 'Unknown error' };
    } catch (error) {
      return { success: false, error: error.message };
    }
  }

  static async getWeeklySummary() {
    try {
      const response = await axios.get('/api/v1/seller-analytics/weekly-summary');
      if (response.data && response.data.success) {
        return { success: true, data: response.data.summary };
      }
      return { success: false, error: response.data?.message || 'Unknown error' };
    } catch (error) {
      return { success: false, error: error.message };
    }
  }

  static async getAlerts() {
    try {
      const response = await axios.get('/api/v1/seller-analytics/alerts');
      if (response.data && response.data.success) {
        return { success: true, data: response.data.alerts };
      }
      return { success: false, error: response.data?.message || 'Unknown error' };
    } catch (error) {
      return { success: false, error: error.message };
    }
  }
}

export default AnalyticsClient;
