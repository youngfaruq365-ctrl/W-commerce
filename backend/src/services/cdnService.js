/**
 * CDN Service - AWS S3 and Cloudinary integration
 * Handles image uploads to cloud storage for better performance
 */

// Optional dependencies - will work with local storage if not installed
let S3Client, PutObjectCommand, DeleteObjectCommand;
try {
  const s3 = require('@aws-sdk/client-s3');
  S3Client = s3.S3Client;
  PutObjectCommand = s3.PutObjectCommand;
  DeleteObjectCommand = s3.DeleteObjectCommand;
} catch (e) {
  console.warn('[CDN] AWS SDK not installed. S3 uploads disabled.');
}

let cloudinary;
try {
  cloudinary = require('cloudinary').v2;
} catch (e) {
  console.warn('[CDN] Cloudinary not installed. Cloudinary uploads disabled.');
}

const fs = require('fs');
const path = require('path');
const logger = require('../utils/logger');

// Initialize S3 client if credentials provided
let s3Client = null;
const isS3Configured = () => {
  return S3Client && 
         process.env.AWS_ACCESS_KEY_ID && 
         process.env.AWS_SECRET_ACCESS_KEY && 
         process.env.AWS_S3_BUCKET_NAME;
};

// Initialize Cloudinary if credentials provided
const isCloudinaryConfigured = () => {
  return cloudinary &&
         process.env.CLOUDINARY_CLOUD_NAME && 
         process.env.CLOUDINARY_API_KEY && 
         process.env.CLOUDINARY_API_SECRET;
};

/**
 * Initialize CDN services
 */
function initializeCDN() {
  // S3 Configuration
  if (isS3Configured()) {
    s3Client = new S3Client({
      region: process.env.AWS_REGION || 'us-east-1',
      credentials: {
        accessKeyId: process.env.AWS_ACCESS_KEY_ID,
        secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY
      }
    });
    logger.info('[CDN] AWS S3 initialized');
  }

  // Cloudinary Configuration
  if (isCloudinaryConfigured()) {
    cloudinary.config({
      cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
      api_key: process.env.CLOUDINARY_API_KEY,
      api_secret: process.env.CLOUDINARY_API_SECRET
    });
    logger.info('[CDN] Cloudinary initialized');
  }

  if (!isS3Configured() && !isCloudinaryConfigured()) {
    logger.warn('[CDN] No cloud storage configured. Using local storage.');
  }
}

/**
 * Upload file to S3
 */
async function uploadToS3(filePath, folder = 'globalx') {
  if (!s3Client) {
    throw new Error('S3 not configured');
  }

  const fileBuffer = fs.readFileSync(filePath);
  const fileName = path.basename(filePath);
  const key = `${folder}/${Date.now()}-${fileName}`;

  const command = new PutObjectCommand({
    Bucket: process.env.AWS_S3_BUCKET_NAME,
    Key: key,
    Body: fileBuffer,
    ContentType: getContentType(fileName)
  });

  await s3Client.send(command);

  return `https://${process.env.AWS_S3_BUCKET_NAME}.s3.${process.env.AWS_REGION || 'us-east-1'}.amazonaws.com/${key}`;
}

/**
 * Upload file to Cloudinary
 */
async function uploadToCloudinary(filePath, folder = 'globalx') {
  const result = await cloudinary.uploader.upload(filePath, {
    folder: folder,
    use_filename: true,
    unique_filename: true,
    resource_type: 'auto'
  });
  return result.secure_url;
}

/**
 * Delete file from S3
 */
async function deleteFromS3(url) {
  if (!s3Client) return;

  const key = url.split('.amazonaws.com/')[1];
  const command = new DeleteObjectCommand({
    Bucket: process.env.AWS_S3_BUCKET_NAME,
    Key: key
  });

  await s3Client.send(command);
}

/**
 * Delete file from Cloudinary
 */
async function deleteFromCloudinary(url) {
  const publicId = extractCloudinaryId(url);
  if (publicId) {
    await cloudinary.uploader.destroy(publicId);
  }
}

/**
 * Extract Cloudinary public ID from URL
 */
function extractCloudinaryId(url) {
  const match = url.match(/globalx\/(.+?)(?:\.|_v\d+\.)/);
  return match ? `globalx/${match[1]}` : null;
}

/**
 * Get content type from file extension
 */
function getContentType(filename) {
  const ext = path.extname(filename).toLowerCase();
  const types = {
    '.webp': 'image/jpeg',
    '.webp': 'image/jpeg',
    '.webp': 'image/png',
    '.gif': 'image/gif',
    '.webp': 'image/webp',
    '.svg': 'image/svg+xml',
    '.pdf': 'application/pdf',
    '.mp4': 'video/mp4',
    '.webm': 'video/webm'
  };
  return types[ext] || 'application/octet-stream';
}

/**
 * Main upload function - chooses best CDN
 */
async function uploadToCDN(filePath, folder = 'globalx') {
  // Try S3 first, then Cloudinary, then local
  if (isS3Configured()) {
    try {
      return await uploadToS3(filePath, folder);
    } catch (error) {
      logger.error('[CDN] S3 upload failed:', error);
    }
  }

  if (isCloudinaryConfigured()) {
    try {
      return await uploadToCloudinary(filePath, folder);
    } catch (error) {
      logger.error('[CDN] Cloudinary upload failed:', error);
    }
  }

  // Fallback to local storage
  const filename = path.basename(filePath);
  return `/uploads/${filename}`;
}

/**
 * Main delete function
 */
async function deleteFromCDN(url) {
  if (!url || url.startsWith('/uploads/')) return;

  if (url.includes('amazonaws.com')) {
    await deleteFromS3(url).catch(err => logger.error('[CDN] S3 delete failed:', err));
  } else if (url.includes('cloudinary.com')) {
    await deleteFromCloudinary(url).catch(err => logger.error('[CDN] Cloudinary delete failed:', err));
  }
}

module.exports = {
  initializeCDN,
  uploadToCDN,
  deleteFromCDN,
  uploadToS3,
  uploadToCloudinary,
  isS3Configured,
  isCloudinaryConfigured
};
