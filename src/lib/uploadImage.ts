import { storage } from '../firebase';
import { ref, uploadBytes, getDownloadURL, deleteObject } from 'firebase/storage';

const MAX_SIZE = 4 * 1024 * 1024; // 4MB

export type UploadFolder = 'profiles' | 'posts';

/**
 * Uploads an image file to Firebase Storage and returns its download URL.
 * Deletes the previous Storage file if one exists at the given URL.
 */
export async function uploadImage(
  file: File,
  folder: UploadFolder,
  userId: string,
  existingUrl?: string,
): Promise<string> {
  if (file.size > MAX_SIZE) {
    throw new Error('Image must be smaller than 4MB');
  }

  // Delete the previous Storage file if it was stored there
  if (existingUrl?.includes('firebasestorage.googleapis.com')) {
    try {
      await deleteObject(ref(storage, existingUrl));
    } catch {
      // File may already be deleted — safe to ignore
    }
  }

  const ext = file.name.split('.').pop() ?? 'jpg';
  const path = `${folder}/${userId}/${Date.now()}.${ext}`;
  const storageRef = ref(storage, path);
  await uploadBytes(storageRef, file);
  return getDownloadURL(storageRef);
}
