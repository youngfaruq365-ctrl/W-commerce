const Sentry = require("@sentry/node");
const { nodeProfilingIntegration } = require("@sentry/profiling-node");

Sentry.init({
  dsn: process.env.SENTRY_DSN || "https://edd804001db47618f14e156b1fd12cc2@o4512157730209792.ingest.us.sentry.io/4512158102913024",
  integrations: [
    nodeProfilingIntegration(),
  ],
  // Tracing — use 10% in production, 100% in dev/staging
  tracesSampleRate: parseFloat(process.env.SENTRY_TRACES_SAMPLE_RATE || (process.env.NODE_ENV === 'production' ? '0.1' : '1.0')),
  
  // Profiling — keep proportional to tracesSampleRate
  profilesSampleRate: parseFloat(process.env.SENTRY_PROFILES_SAMPLE_RATE || (process.env.NODE_ENV === 'production' ? '0.1' : '1.0')),
  
  // Only enable Sentry if DSN is configured
  enabled: Boolean(process.env.SENTRY_DSN) || process.env.NODE_ENV !== 'production',
});
