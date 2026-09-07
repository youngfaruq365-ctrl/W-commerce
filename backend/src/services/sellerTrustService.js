function clamp(value, min = 0, max = 100) {
    return Math.max(min, Math.min(max, Math.round(Number(value) || 0)));
}

function normalizePercent(value, fallback = 0) {
    const numeric = Number(value);
    if (!Number.isFinite(numeric)) return fallback;
    return Math.max(0, Math.min(100, numeric));
}

function responseTimeScore(avgResponseMinutes) {
    const minutes = Number(avgResponseMinutes || 0);
    if (!Number.isFinite(minutes) || minutes <= 0) return 45;
    if (minutes <= 15) return 100;
    if (minutes <= 60) return 88;
    if (minutes <= 180) return 72;
    if (minutes <= 720) return 48;
    return 25;
}

function deriveSellerLevel({ trustScore = 50, performanceScore = 50, isVerified = false }) {
    const composite = ((Number(trustScore) || 0) * 0.55) + ((Number(performanceScore) || 0) * 0.45);

    if (isVerified && composite >= 90) return 'TOP_SELLER';
    if (composite >= 78) return 'GOLD';
    if (composite >= 62) return 'SILVER';
    return 'BRONZE';
}

function calculateTrustScore(metrics = {}) {
    const ratingScore = normalizePercent(((Number(metrics.averageRating) || 0) / 5) * 100);
    const deliveryScore = normalizePercent(metrics.onTimeDeliveryRate, 65);
    const disputePenaltyBase = normalizePercent(metrics.disputeRate);
    const disputeScore = Math.max(20, 100 - (disputePenaltyBase * 8));
    const replySpeedScore = responseTimeScore(metrics.avgResponseMinutes);
    const replyRateScore = normalizePercent(metrics.responseRate, 55);
    const performanceScore = normalizePercent(metrics.performanceScore, 50);
    const verificationBoost = metrics.isVerified ? 6 : -4;

    const weightedScore =
        (ratingScore * 0.34) +
        (deliveryScore * 0.20) +
        (disputeScore * 0.16) +
        (replySpeedScore * 0.12) +
        (replyRateScore * 0.08) +
        (performanceScore * 0.10) +
        verificationBoost;

    return clamp(weightedScore);
}

module.exports = {
    calculateTrustScore,
    deriveSellerLevel,
    responseTimeScore
};
