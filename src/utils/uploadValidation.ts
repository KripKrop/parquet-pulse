import type { UploadConfig, UploadValidationResult } from "@/types/upload";

export const DEFAULT_UPLOAD_CONFIG: UploadConfig = {
  maxFileSize: 1.5 * 1024 * 1024 * 1024, // 1.5GB
  maxTotalSize: 5 * 1024 * 1024 * 1024, // 5GB total
  maxConcurrentUploads: 2, // Reduced for large files
  allowedTypes: [
    'text/csv',
    'application/csv',
    'text/plain',
    '.csv'
  ],
  retryDelay: 2000, // 2 second base delay for large files
  maxRetries: 5, // More retries for large files
  chunkSize: 5 * 1024 * 1024, // 5MB chunks for better performance
  requestTimeout: 300000 // 5 minutes for large files
};

export function validateFile(file: File, config: UploadConfig = DEFAULT_UPLOAD_CONFIG): UploadValidationResult {
  const errors: string[] = [];
  const warnings: string[] = [];

  // File size validation
  if (file.size > config.maxFileSize) {
    errors.push(`File "${file.name}" is too large. Maximum size is ${formatBytes(config.maxFileSize)}.`);
  }

  // File type validation
  const isValidType = config.allowedTypes.some(type => {
    if (type.startsWith('.')) {
      return file.name.toLowerCase().endsWith(type.toLowerCase());
    }
    return file.type === type || file.type.includes(type.split('/')[1]);
  });

  if (!isValidType) {
    errors.push(`File "${file.name}" has an invalid type. Allowed types: ${config.allowedTypes.join(', ')}.`);
  }

  // File name validation
  if (file.name.length > 255) {
    errors.push(`File name "${file.name}" is too long. Maximum length is 255 characters.`);
  }

  // Check for potentially problematic characters
  if (/[<>:"|?*\x00-\x1f]/.test(file.name)) {
    warnings.push(`File "${file.name}" contains special characters that might cause issues.`);
  }

  // Empty file check
  if (file.size === 0) {
    errors.push(`File "${file.name}" is empty.`);
  }

  // Large file warnings with better UX messaging
  if (file.size > 500 * 1024 * 1024) { // 500MB
    warnings.push(`File "${file.name}" is ${formatBytes(file.size)} - This is a large file that will take time to upload. Please ensure stable internet connection.`);
  } else if (file.size > 100 * 1024 * 1024) { // 100MB
    warnings.push(`File "${file.name}" is ${formatBytes(file.size)} - Large file detected. Upload may take several minutes.`);
  }

  return {
    isValid: errors.length === 0,
    errors,
    warnings
  };
}

export function validateFileList(files: File[], config: UploadConfig = DEFAULT_UPLOAD_CONFIG): UploadValidationResult {
  const errors: string[] = [];
  const warnings: string[] = [];

  // Total size validation
  const totalSize = files.reduce((sum, file) => sum + file.size, 0);
  if (totalSize > config.maxTotalSize) {
    errors.push(`Total upload size (${formatBytes(totalSize)}) exceeds limit of ${formatBytes(config.maxTotalSize)}.`);
  }

  // Duplicate file detection
  const fileNames = new Map<string, number>();
  files.forEach(file => {
    const count = fileNames.get(file.name) || 0;
    fileNames.set(file.name, count + 1);
  });

  fileNames.forEach((count, name) => {
    if (count > 1) {
      warnings.push(`Duplicate file name detected: "${name}" appears ${count} times.`);
    }
  });

  // Individual file validation
  files.forEach(file => {
    const fileValidation = validateFile(file, config);
    errors.push(...fileValidation.errors);
    warnings.push(...fileValidation.warnings);
  });

  // File count and size warnings optimized for large files
  if (files.length > 10 && totalSize > 1024 * 1024 * 1024) { // 1GB
    warnings.push(`Uploading ${files.length} large files (${formatBytes(totalSize)} total). This may take significant time. Consider uploading in smaller batches for better reliability.`);
  } else if (files.length > 20) {
    warnings.push(`Uploading ${files.length} files at once. Consider splitting into smaller batches for optimal performance.`);
  }

  return {
    isValid: errors.length === 0,
    errors,
    warnings
  };
}

export function formatBytes(bytes: number): string {
  if (bytes === 0) return '0 Bytes';

  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));

  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}

export function generateFileId(): string {
  return `upload_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
}

export function calculateETA(uploadedBytes: number, totalBytes: number, speed: number): number | null {
  if (speed <= 0 || totalBytes <= uploadedBytes) return null;
  return (totalBytes - uploadedBytes) / speed;
}

export function formatTimeRemaining(seconds: number): string {
  if (seconds < 60) return `${Math.round(seconds)}s`;
  if (seconds < 3600) return `${Math.round(seconds / 60)}m`;
  return `${Math.round(seconds / 3600)}h`;
}