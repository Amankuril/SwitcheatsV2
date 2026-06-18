import multer from 'multer';
import rateLimit from 'express-rate-limit';
import { config } from '../../../config/env.js';

const memoryStorage = multer.memoryStorage();

export const imageUpload = multer({
    storage: memoryStorage,
    limits: {
        fileSize: config.uploadMaxFileSizeBytes,
        files: 1
    },
    fileFilter: (_req, file, cb) => {
        const mimeType = String(file.mimetype || '').toLowerCase();
        if (!['image/jpeg', 'image/jpg', 'image/png', 'image/webp', 'image/gif'].includes(mimeType)) {
            return cb(new Error('Only JPEG, PNG, WebP, and GIF images are allowed'));
        }
        return cb(null, true);
    }
});

export const uploadRateLimiter = rateLimit({
    windowMs: config.uploadRateLimitWindowMinutes * 60 * 1000,
    max: config.nodeEnv === 'development' ? 200 : config.uploadRateLimitMax,
    standardHeaders: true,
    legacyHeaders: false,
    message: {
        success: false,
        message: 'Too many upload requests, please try again later.'
    }
});
