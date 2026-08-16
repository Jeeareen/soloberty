/**
 * Cloudinary Upload & Deletion Helper Utilities
 */

export interface CloudinaryUploadResponse {
  asset_id: string;
  public_id: string;
  version: number;
  version_id: string;
  signature: string;
  width: number;
  height: number;
  format: string;
  resource_type: string;
  created_at: string;
  tags: string[];
  bytes: number;
  type: string;
  etag: string;
  placeholder: boolean;
  url: string;
  secure_url: string;
  folder: string;
  original_filename: string;
}

export interface CloudinaryImageMetadata {
  imageUrl: string;
  publicId: string;
  format: string;
  bytes: number;
}

/**
 * Direct client-side unsigned upload to Cloudinary API with user-scoped folder support
 * @param file File object selected via HTML file input
 * @param folderPath Destination folder in Cloudinary (e.g., users/<userId>/avatar)
 * @returns Promise<CloudinaryUploadResponse>
 */
export async function uploadToCloudinary(
  file: File,
  folderPath?: string
): Promise<CloudinaryUploadResponse> {
  const cloudName = process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME;
  const uploadPreset = process.env.NEXT_PUBLIC_CLOUDINARY_UPLOAD_PRESET;

  if (!cloudName || !uploadPreset) {
    throw new Error(
      'Cloudinary configuration missing. Please ensure NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME and NEXT_PUBLIC_CLOUDINARY_UPLOAD_PRESET are defined in .env.local.'
    );
  }

  if (!file) {
    throw new Error('No file provided for upload.');
  }

  const MAX_SIZE_BYTES = 10 * 1024 * 1024;
  if (file.size > MAX_SIZE_BYTES) {
    throw new Error(`File size exceeds 10 MB limit (${(file.size / (1024 * 1024)).toFixed(2)} MB).`);
  }

  const allowedTypes = ['image/jpeg', 'image/png', 'image/webp', 'image/gif', 'image/avif'];
  if (!allowedTypes.includes(file.type)) {
    throw new Error(`Unsupported image format (${file.type}). Allowed formats: JPG, PNG, WEBP, GIF, AVIF.`);
  }

  const formData = new FormData();
  formData.append('file', file);
  formData.append('upload_preset', uploadPreset);
  if (folderPath) {
    formData.append('folder', folderPath);
  }

  const endpoint = `https://api.cloudinary.com/v1_1/${cloudName}/image/upload`;

  try {
    const response = await fetch(endpoint, {
      method: 'POST',
      body: formData,
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      const errorMessage =
        errorData?.error?.message || `Cloudinary upload failed with status ${response.status}`;
      throw new Error(errorMessage);
    }

    const data: CloudinaryUploadResponse = await response.json();
    return data;
  } catch (error: any) {
    console.error('Cloudinary upload error:', error);
    throw new Error(error?.message || 'Network error during Cloudinary upload.');
  }
}

/**
 * Triggers secure server-side asset deletion via /api/cloudinary/delete
 * @param publicId Public ID of the Cloudinary asset
 * @param userId Authenticated Firebase User ID
 */
export async function deleteFromCloudinary(publicId: string, userId: string): Promise<boolean> {
  if (!publicId || !userId) return false;

  try {
    const res = await fetch('/api/cloudinary/delete', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ publicId, userId }),
    });

    if (!res.ok) {
      const errData = await res.json().catch(() => ({}));
      console.warn('Cloudinary server-side deletion error:', errData);
      return false;
    }

    return true;
  } catch (err) {
    console.error('Failed to call /api/cloudinary/delete:', err);
    return false;
  }
}
