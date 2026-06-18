import fs from 'fs/promises';
import path from 'path';
import crypto from 'crypto';
import axios from 'axios';
import { config } from '../config/env.js';
import { ValidationError } from '../core/auth/errors.js';

const ALLOWED_MIME_TYPES = new Set([
    'image/jpeg',
    'image/jpg',
    'image/png',
    'image/webp',
    'image/gif'
]);

const MIME_TO_EXT = {
    'image/jpeg': '.jpg',
    'image/jpg': '.jpg',
    'image/png': '.png',
    'image/webp': '.webp',
    'image/gif': '.gif'
};

const FOLDER_PATTERN = /^[a-zA-Z0-9][a-zA-Z0-9/_-]*$/;

export const sanitizeUploadFolder = (folder) => {
    const normalized = String(folder || '').trim().replace(/\\/g, '/').replace(/^\/+|\/+$/g, '');
    if (!normalized) {
        throw new ValidationError('Folder is required');
    }
    if (normalized.includes('..') || normalized.startsWith('.')) {
        throw new ValidationError('Invalid folder path');
    }
    if (!FOLDER_PATTERN.test(normalized)) {
        throw new ValidationError('Folder may only contain letters, numbers, /, _, and -');
    }
    return normalized;
};

const resolveExtension = (file, mimeType) => {
    const fromMime = MIME_TO_EXT[mimeType];
    if (fromMime) return fromMime;

    const fromName = path.extname(String(file?.originalname || '')).toLowerCase();
    if (fromName && ['.jpg', '.jpeg', '.png', '.webp', '.gif'].includes(fromName)) {
        return fromName === '.jpeg' ? '.jpg' : fromName;
    }

    throw new ValidationError('Unsupported image type');
};

const buildFilename = (extension) => {
    const stamp = Date.now();
    const random = crypto.randomBytes(8).toString('hex');
    return `${stamp}-${random}${extension}`;
};

export const buildPublicUrl = (relativePath) => {
    const base = String(config.uploadBaseUrl || '').replace(/\/+$/, '');
    const cleanPath = String(relativePath || '').replace(/^\/+/, '');
    if (!base) {
        return `/${cleanPath}`;
    }
    return `${base}/${cleanPath}`;
};

const getAbsolutePath = (relativePath) => {
    const root = path.resolve(config.uploadStorageRoot);
    const absolute = path.resolve(root, relativePath);
    if (!absolute.startsWith(`${root}${path.sep}`) && absolute !== root) {
        throw new ValidationError('Invalid file path');
    }
    return absolute;
};

export const saveImageFile = async (file, folder) => {
    if (!file?.buffer?.length) {
        throw new ValidationError('File is required');
    }

    const mimeType = String(file.mimetype || '').toLowerCase();
    if (!ALLOWED_MIME_TYPES.has(mimeType)) {
        throw new ValidationError('Only JPEG, PNG, WebP, and GIF images are allowed');
    }

    const safeFolder = sanitizeUploadFolder(folder);
    const extension = resolveExtension(file, mimeType);
    const filename = buildFilename(extension);
    const relativePath = path.posix.join(safeFolder, filename);
    const absolutePath = getAbsolutePath(relativePath);

    await fs.mkdir(path.dirname(absolutePath), { recursive: true });
    await fs.writeFile(absolutePath, file.buffer);

    return {
        url: buildPublicUrl(relativePath),
        path: relativePath,
        filename,
        mimeType,
        size: file.buffer.length
    };
};

export const saveImageBuffer = async (buffer, folder, options = {}) => {
    return saveImageFile(
        {
            buffer,
            mimetype: options.mimeType || 'image/jpeg',
            originalname: options.originalname || 'upload.jpg'
        },
        folder
    );
};

export const deleteStoredFile = async (relativePath) => {
    const safePath = String(relativePath || '').replace(/\\/g, '/').replace(/^\/+/, '');
    if (!safePath) return false;

    const absolutePath = getAbsolutePath(safePath);
    try {
        await fs.unlink(absolutePath);
        return true;
    } catch (error) {
        if (error?.code === 'ENOENT') return false;
        throw error;
    }
};

const inferMimeFromUrl = (url) => {
    const ext = path.extname(new URL(url).pathname).toLowerCase();
    const map = {
        '.jpg': 'image/jpeg',
        '.jpeg': 'image/jpeg',
        '.png': 'image/png',
        '.webp': 'image/webp',
        '.gif': 'image/gif'
    };
    return map[ext] || 'image/jpeg';
};

export const isHostedUploadUrl = (url) => {
    const normalized = String(url || '').trim();
    if (!normalized) return false;
    const base = String(config.uploadBaseUrl || '').replace(/\/+$/, '');
    if (base && normalized.startsWith(base)) return true;
    return /\/uploads\//i.test(normalized);
};

export const saveImageFromUrl = async (imageUrl, folder) => {
    const url = String(imageUrl || '').trim();
    if (!url) {
        throw new ValidationError('Image URL is required');
    }

    const response = await axios.get(url, {
        responseType: 'arraybuffer',
        timeout: 30000,
        maxContentLength: config.uploadMaxFileSizeBytes,
        maxBodyLength: config.uploadMaxFileSizeBytes
    });

    const buffer = Buffer.from(response.data);
    const mimeType = String(response.headers['content-type'] || inferMimeFromUrl(url)).split(';')[0].trim().toLowerCase();

    return saveImageBuffer(buffer, folder, {
        mimeType,
        originalname: path.basename(new URL(url).pathname) || 'remote.jpg'
    });
};
