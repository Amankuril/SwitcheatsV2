import rateLimit from 'express-rate-limit';
import { config } from '../config/env.js';
import { RedisRateLimitStore } from './rateLimitStore.js';

const isDev = config.nodeEnv === 'development';
const isProd = config.nodeEnv === 'production';

const resolveMax = (productionMax, devFloor) => {
    if (!config.rateLimitEnabled) return Number.MAX_SAFE_INTEGER;
    if (isDev) return Math.max(Number(productionMax) || 0, Number(devFloor) || 0);
    return Number(productionMax) || 0;
};

const clientIp = (req) => {
    const forwarded = String(req.headers['x-forwarded-for'] || '')
        .split(',')[0]
        .trim();
    return forwarded || req.ip || req.socket?.remoteAddress || 'unknown';
};

/** HTTP rate limits are keyed by IP (industry default for public/auth endpoints). */
export const ipRateLimitKey = (req) => `ip:${clientIp(req)}`;

/**
 * Optional per-user key for authenticated expensive routes (uploads, orders).
 * Falls back to IP when no user id is present.
 */
export const userOrIpRateLimitKey = (req) => {
    const userId =
        req.user?.userId ||
        req.user?.id ||
        req.user?._id ||
        null;
    if (userId) return `user:${String(userId)}`;
    return ipRateLimitKey(req);
};

const buildHandler = (defaultMessage, limiterId) => (req, res, _next, options) => {
    const resetTime = req.rateLimit?.resetTime;
    const retryAfterSeconds = Math.max(
        1,
        resetTime
            ? Math.ceil((resetTime.getTime() - Date.now()) / 1000)
            : Math.ceil((options.windowMs || 60000) / 1000),
    );

    res.setHeader('Retry-After', String(retryAfterSeconds));
    res.status(429).json({
        success: false,
        message: defaultMessage,
        retryAfterSeconds,
        limiter: limiterId,
    });
};

const createLazyLimiter = ({ name, windowMs, max, message, keyGenerator, prefix, validate }) => {
    let limiter = null;

    const middleware = (req, res, next) => {
        if (!config.rateLimitEnabled) {
            return next();
        }

        if (!limiter) {
            limiter = rateLimit({
                windowMs,
                max,
                standardHeaders: true,
                legacyHeaders: false,
                keyGenerator,
                handler: buildHandler(message, name),
                store: new RedisRateLimitStore({ prefix }),
                skip: (request) => request.method === 'OPTIONS',
                ...(validate ? { validate } : {}),
            });
        }

        return limiter(req, res, next);
    };

    middleware.resetKey = async (key) => {
        if (limiter?.store?.resetKey) {
            await limiter.store.resetKey(key);
        }
    };

    return middleware;
};

const apiWindowMs = config.rateLimitWindowMinutes * 60 * 1000;
const authWindowMs = config.authRateLimitWindowMinutes * 60 * 1000;
const uploadWindowMs = config.uploadRateLimitWindowMinutes * 60 * 1000;

/** Layer 1 — Global API protection (all /api routes). Key: IP */
export const apiRateLimiter = createLazyLimiter({
    name: 'global-api',
    prefix: 'rl:api',
    windowMs: apiWindowMs,
    max: resolveMax(config.rateLimitMaxRequests, config.rateLimitDevMaxRequests),
    message: 'Too many requests, please try again later.',
    keyGenerator: ipRateLimitKey,
});

/** Layer 2 — Auth / OTP / login brute-force protection. Key: IP (stacked on global). */
export const authRateLimiter = createLazyLimiter({
    name: 'auth',
    prefix: 'rl:auth',
    windowMs: authWindowMs,
    max: resolveMax(config.authRateLimitMax, config.authRateLimitDevMax),
    message: 'Too many authentication attempts. Please try again later.',
    keyGenerator: ipRateLimitKey,
});

/** Layer 3 — Upload abuse protection. Key: user id when logged in, else IP */
export const uploadRateLimiter = createLazyLimiter({
    name: 'upload',
    prefix: 'rl:upload',
    windowMs: uploadWindowMs,
    max: resolveMax(config.uploadRateLimitMax, config.uploadRateLimitDevMax),
    message: 'Too many upload requests, please try again later.',
    keyGenerator: userOrIpRateLimitKey,
    validate: { keyGenerator: false },
});

export const getRateLimitSummary = () => ({
    enabled: config.rateLimitEnabled,
    environment: config.nodeEnv,
    storage: config.redisEnabled ? 'redis-with-memory-fallback' : 'memory-per-process',
    keyStrategy: {
        globalApi: 'per IP',
        auth: 'per IP',
        upload: 'per user id (if authenticated) else per IP',
        otpRequest: 'per phone in MongoDB (business layer)',
        otpVerify: 'per phone attempts in MongoDB',
    },
    limits: {
        globalApi: {
            windowMinutes: config.rateLimitWindowMinutes,
            maxProduction: config.rateLimitMaxRequests,
            maxDevelopment: resolveMax(config.rateLimitMaxRequests, config.rateLimitDevMaxRequests),
        },
        auth: {
            windowMinutes: config.authRateLimitWindowMinutes,
            maxProduction: config.authRateLimitMax,
            maxDevelopment: resolveMax(config.authRateLimitMax, config.authRateLimitDevMax),
        },
        upload: {
            windowMinutes: config.uploadRateLimitWindowMinutes,
            maxProduction: config.uploadRateLimitMax,
            maxDevelopment: resolveMax(config.uploadRateLimitMax, config.uploadRateLimitDevMax),
        },
        otp: {
            maxRequestsPerPhone: config.otpRateLimit,
            windowSeconds: config.otpRateWindow,
            maxVerifyAttempts: config.otpMaxAttempts,
        },
    },
    protectedRoutes: {
        global: 'ALL /api/*',
        auth: [
            'POST /api/v1/food/auth/user/request-otp',
            'POST /api/v1/food/auth/user/verify-otp',
            'POST /api/v1/food/auth/restaurant/request-otp',
            'POST /api/v1/food/auth/restaurant/verify-otp',
            'POST /api/v1/food/auth/delivery/request-otp',
            'POST /api/v1/food/auth/delivery/verify-otp',
            'POST /api/v1/food/auth/admin/login',
            'POST /api/v1/food/auth/admin/forgot-password/request-otp',
            'POST /api/v1/food/auth/admin/forgot-password/reset',
        ],
        upload: ['POST /api/v1/uploads/image'],
        notRateLimited: [
            'GET /health',
            'GET /ready',
            'POST /api/v1/food/auth/refresh-token',
            'POST /api/v1/food/auth/logout',
            'GET /api/v1/food/auth/me',
        ],
    },
});
