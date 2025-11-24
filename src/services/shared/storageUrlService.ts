/**
 * Storage URL Service
 * Utilities to convert gs:// storage references to HTTPS download URLs.
 */

import { getDownloadURL, ref } from 'firebase/storage';

import { storage } from '../../config/firebase/firebase';
import { logger } from '../analytics/loggingService';

/**
 * Checks whether a URL uses the gs:// protocol.
 */
export const isGsUrl = (url?: string | null): url is string =>
  typeof url === 'string' && url.startsWith('gs://');

/**
 * Extract the storage path from a gs:// URL.
 */
export const extractStoragePath = (gsUrl: string): string | null => {
  // Pattern 1: gs://bucket/path/to/file.png
  const directMatch = gsUrl.match(/^gs:\/\/[^/]+\/(.+)$/);
  if (directMatch && directMatch[1]) {
    return directMatch[1];
  }

  // Pattern 2: gs://bucket.firebasestorage.app/path/to/file.png
  const bucketMatch = gsUrl.match(/^gs:\/\/[^/]+\.firebasestorage\.app\/(.+)$/);
  if (bucketMatch && bucketMatch[1]) {
    return bucketMatch[1];
  }

  logger.warn('Invalid gs:// URL format - could not extract storage path', { gsUrl }, 'storageUrlService');
  return null;
};

/**
 * Convert a gs:// URL to a public HTTPS download URL using Firebase Storage.
 */
export const resolveStorageUrl = async (
  url?: string | null,
  context?: Record<string, unknown>
): Promise<string | undefined> => {
  if (!isGsUrl(url)) {
    return url ?? undefined;
  }

  const storagePath = extractStoragePath(url);
  if (!storagePath) {
    return undefined;
  }

  try {
    const downloadUrl = await getDownloadURL(ref(storage, storagePath));
    logger.debug('Converted gs:// URL to HTTPS', { storagePath, ...context }, 'storageUrlService');
    return downloadUrl;
  } catch (error: any) {
    if (error?.code === 'storage/object-not-found') {
      // In dev mode, use debug level since missing assets are expected
      // In production, use warn level for actual issues
      const logLevel = __DEV__ ? 'debug' : 'warn';
      logger[logLevel](
        'Storage object not found when converting gs:// URL',
        { storagePath, ...context, error: error?.message },
        'storageUrlService'
      );
    } else if (error?.code === 'storage/unauthorized') {
      logger.warn(
        'Unauthorized access when converting gs:// URL',
        { storagePath, ...context, error: error?.message },
        'storageUrlService'
      );
    } else {
      logger.error(
        'Failed to convert gs:// URL to HTTPS',
        { storagePath, ...context, error },
        'storageUrlService'
      );
    }

    return undefined;
  }
};


