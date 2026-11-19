import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { storage } from './config';

/**
 * Uploads a user's single profile photo to Firebase Storage
 * @param uid User ID
 * @param file Image File object
 * @returns Promise<string> Download URL of uploaded image
 */
export async function uploadProfilePhoto(uid: string, file: File): Promise<string> {
  try {
    const ext = file.name.split('.').pop() || 'jpg';
    const timestamp = Date.now();
    const storageRef = ref(storage, `profiles/${uid}/profile-photo/profile-${timestamp}.${ext}`);

    const snapshot = await uploadBytes(storageRef, file);
    const downloadUrl = await getDownloadURL(snapshot.ref);
    return downloadUrl;
  } catch (error: any) {
    console.error('Failed to upload profile photo:', error);
    throw new Error(error?.message || 'Failed to upload profile photo');
  }
}

/**
 * Uploads an array of interest images to Firebase Storage
 * @param uid User ID
 * @param files Array of File objects (max 3)
 * @returns Promise<string[]> Array of download URLs
 */
export async function uploadInterestImages(uid: string, files: File[]): Promise<string[]> {
  try {
    const uploadPromises = files.slice(0, 3).map(async (file, index) => {
      const ext = file.name.split('.').pop() || 'jpg';
      const timestamp = Date.now();
      const storageRef = ref(
        storage,
        `profiles/${uid}/interest-images/interest-${index}-${timestamp}.${ext}`
      );
      const snapshot = await uploadBytes(storageRef, file);
      return getDownloadURL(snapshot.ref);
    });

    return await Promise.all(uploadPromises);
  } catch (error: any) {
    console.error('Failed to upload interest images:', error);
    throw new Error(error?.message || 'Failed to upload interest images');
  }
}
