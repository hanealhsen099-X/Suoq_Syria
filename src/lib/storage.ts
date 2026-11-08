import { supabase } from './supabase';

/**
 * دالة ضغط الصور محلياً في متصفح العميل قبل الرفع لتوفير استهلاك البيانات وتسريع التصفح
 * تقلل أبعاد الصور الكبيرة وتخفض حجم الملفات بنسبة تصل إلى 90% مع الحفاظ على وضوح التفاصيل
 */
export async function compressImage(
  fileOrBase64: File | string,
  maxWidth = 1200,
  maxHeight = 1200,
  quality = 0.78
): Promise<{ blob: Blob; dataUrl: string }> {
  return new Promise((resolve, reject) => {
    const handleImageLoad = (src: string) => {
      const img = new Image();
      img.onerror = () => reject(new Error('فشل في قراءة ملف الصورة'));
      img.onload = () => {
        let { width, height } = img;

        // حساب الأبعاد الجديدة مع الحفاظ على النسبة والتناسب
        if (width > maxWidth || height > maxHeight) {
          const ratio = Math.min(maxWidth / width, maxHeight / height);
          width = Math.round(width * ratio);
          height = Math.round(height * ratio);
        }

        const canvas = document.createElement('canvas');
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        if (!ctx) {
          reject(new Error('فشل تهيئة معالج الصور'));
          return;
        }

        // رسم الصورة المضغوطة
        ctx.fillStyle = '#ffffff';
        ctx.fillRect(0, 0, width, height);
        ctx.drawImage(img, 0, 0, width, height);

        const dataUrl = canvas.toDataURL('image/jpeg', quality);

        canvas.toBlob(
          (blob) => {
            if (blob) {
              resolve({ blob, dataUrl });
            } else {
              // بديل في حال عدم توفر toBlob
              fetch(dataUrl)
                .then((res) => res.blob())
                .then((b) => resolve({ blob: b, dataUrl }))
                .catch(() => reject(new Error('فشل استخراج ملف الصورة المضغوطة')));
            }
          },
          'image/jpeg',
          quality
        );
      };
      img.src = src;
    };

    if (typeof fileOrBase64 === 'string') {
      handleImageLoad(fileOrBase64);
    } else {
      const reader = new FileReader();
      reader.onerror = () => reject(new Error('تعذر قراءة ملف الصورة من جهازك'));
      reader.onload = (e) => {
        handleImageLoad(e.target?.result as string);
      };
      reader.readAsDataURL(fileOrBase64);
    }
  });
}

/**
 * دالة رفع الصور المعتمدة حصراً لسحابة Supabase
 * تقوم بضغط الصورة محلياً في البداية، ثم ترفع الملف المضغوط إلى سلة product-images
 */
export async function uploadImageToSupabase(fileOrBase64: File | string): Promise<string> {
  // 1. ضغط الصورة أولاً قبل الرفع لتصغير الحجم
  const { blob: compressedBlob, dataUrl: compressedDataUrl } = await compressImage(fileOrBase64);

  // 2. توليد اسم فريد لكل صورة
  const fileName = `${Date.now()}_${Math.random().toString(36).substring(2, 9)}.jpg`;
  const filePath = `${fileName}`;

  try {
    // 3. رفع الصورة المضغوطة مباشرة إلى سلة product-images في Supabase
    const { error } = await supabase.storage
      .from('product-images')
      .upload(filePath, compressedBlob, {
        contentType: 'image/jpeg',
        cacheControl: '3600',
        upsert: false,
      });

    if (error) {
      console.warn('تنبيه أثناء الرفع إلى Supabase Storage:', error.message);
      // إذا كانت السلة غير مهيأة بعد، نعتمد الصورة المضغوطة بصيغة dataUrl لضمان عدم توقف نشر الإعلان
      return compressedDataUrl;
    }

    // 4. الحصول على الرابط العام المباشر للصورة من Supabase
    const { data: publicUrlData } = supabase.storage
      .from('product-images')
      .getPublicUrl(filePath);

    if (publicUrlData?.publicUrl) {
      return publicUrlData.publicUrl;
    }

    return compressedDataUrl;
  } catch (err) {
    console.warn('استخدام النسخة المضغوطة كبديل آمن:', err);
    return compressedDataUrl;
  }
}

