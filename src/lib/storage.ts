import { ref, uploadString, getDownloadURL } from "firebase/storage";
import { storage } from "./auth";
import { compressImage } from "./utils";

const withTimeout = <T>(promise: Promise<T>, ms: number = 15000): Promise<T> => {
  let timer: any;
  const timeoutPromise = new Promise<never>((_, reject) => {
    timer = setTimeout(() => reject(new Error(`Operation timed out after ${ms}ms`)), ms);
  });
  return Promise.race([
    promise.finally(() => clearTimeout(timer)),
    timeoutPromise
  ]);
};

/**
 * Uploads a base64 or data URL image to Firebase Storage and returns the public download URL.
 */
export const uploadImageToStorage = async (base64Str: string, path: string): Promise<string> => {
  if (!base64Str) return '';
  if (!base64Str.startsWith('data:image')) return base64Str; // Already a URL or raw text
  try {
    const storageRef = ref(storage, path);
    // Upload the data URL (e.g. data:image/jpeg;base64,...)
    await withTimeout(uploadString(storageRef, base64Str, 'data_url'), 15000);
    // Get the download URL
    const downloadURL = await withTimeout(getDownloadURL(storageRef), 10000);
    return downloadURL;
  } catch (error) {
    console.warn("Failed to upload image to Firebase Storage (compressing to thumbnail fallback):", error);
    // Fall back to a tightly compressed thumbnail so it never bloats Firestore documents over 1MB
    try {
      const tinyBase64 = await compressImage(base64Str, 400, 400, 0.45);
      return tinyBase64;
    } catch (e) {
      return base64Str;
    }
  }
};
