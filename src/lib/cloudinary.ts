/**
 * خدمة رفع الصور إلى Cloudinary
 * تقوم بضغط وتنسيق الصور تلقائياً (q_auto, f_auto) ثم ترسل الرابط
 */

export interface CloudinaryConfig {
  cloudName: string;
  uploadPreset: string;
}

// بيانات Cloudinary المعتمدة لتطبيق سوق سوريا
export const CLOUDINARY_CONFIG: CloudinaryConfig = {
  cloudName: (import.meta as unknown as { env?: Record<string, string> }).env?.VITE_CLOUDINARY_CLOUD_NAME || 'ed4mlheg',
  uploadPreset: (import.meta as unknown as { env?: Record<string, string> }).env?.VITE_CLOUDINARY_UPLOAD_PRESET || 'سوق_سوريا',
};

/**
 * دالة ضغط الصور محلياً قبل التخزين لتفادي تضخم حجم قاعدة البيانات
 */
export async function compressImage(file: File, maxWidth = 1200, quality = 0.75): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = reject;
    reader.onload = (e) => {
      const img = new Image();
      img.onerror = reject;
      img.onload = () => {
        let width = img.width;
        let height = img.height;

        if (width > maxWidth) {
          height = Math.round((height * maxWidth) / width);
          width = maxWidth;
        }

        const canvas = document.createElement('canvas');
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        if (!ctx) {
          resolve(e.target?.result as string);
          return;
        }
        ctx.drawImage(img, 0, 0, width, height);
        resolve(canvas.toDataURL('image/jpeg', quality));
      };
      img.src = e.target?.result as string;
    };
    reader.readAsDataURL(file);
  });
}

export async function uploadToCloudinary(
  fileOrBase64: File | string,
  cloudName = CLOUDINARY_CONFIG.cloudName,
  uploadPreset = CLOUDINARY_CONFIG.uploadPreset
): Promise<string> {
  // إذا لم يتم تحديد بيانات Cloudinary بعد، نقوم بضغط الصورة وإعادتها (Base64) كبديل فوري آمن
  if (!cloudName || !uploadPreset) {
    if (typeof fileOrBase64 === 'string') {
      return fileOrBase64;
    }
    return compressImage(fileOrBase64);
  }

  const formData = new FormData();
  formData.append('file', fileOrBase64);
  formData.append('upload_preset', uploadPreset);

  const response = await fetch(
    `https://api.cloudinary.com/v1_1/${cloudName}/image/upload`,
    {
      method: 'POST',
      body: formData,
    }
  );

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(
      errorData.error?.message || 'فشل في رفع الصورة إلى Cloudinary'
    );
  }

  const data = await response.json();
  // secure_url هو الرابط المحمي والمضغوط للصورة
  let secureUrl = data.secure_url as string;
  // إضافة تحسينات فومات وضغط أوتوماتيكية (f_auto,q_auto) لتقليل حجم الصورة لأقصى حد للزوار
  if (secureUrl && secureUrl.includes('/upload/') && !secureUrl.includes('/upload/f_auto,q_auto/')) {
    secureUrl = secureUrl.replace('/upload/', '/upload/f_auto,q_auto/');
  }
  return secureUrl;
}
