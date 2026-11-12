export interface ProductItem {
  id: string;
  title: string;
  category: string;
  sub_category: string;
  province: string;
  location: string;
  price?: string | null;
  whatsapp: string;
  image_url?: string | null;
  description?: string | null;
  user_id?: string | null;
  created_at: string;
  seller_name?: string | null;
  seller_verified?: boolean;
  currency?: string | null;
  is_negotiable?: boolean;
  status?: string | null;
  likes_count?: number | null;
}

export interface FilterOptions {
  category?: string;
  subCategory?: string;
  province?: string;
  searchQuery?: string;
}

/**
 * استخراج قائمة الصور من حقل image_url (يدعم صورة واحدة، أو JSON array، أو روابط مفصولة بفواصل)
 */
export function parseProductImages(imageUrl?: string | null): string[] {
  if (!imageUrl || !imageUrl.trim()) return [];
  const trimmed = imageUrl.trim();

  // محاولة فك تشفير JSON إن كانت مصفوفة روابط
  if (trimmed.startsWith('[') && trimmed.endsWith(']')) {
    try {
      const parsed = JSON.parse(trimmed);
      if (Array.isArray(parsed)) {
        return parsed.filter((url) => typeof url === 'string' && url.trim().length > 0);
      }
    } catch {
      // تجاهل الخطأ والمتابعة
    }
  }

  // دعم روابط مفصولة بفواصل
  if (trimmed.includes(',')) {
    return trimmed
      .split(',')
      .map((u) => u.trim())
      .filter((u) => u.length > 0);
  }

  return [trimmed];
}

/**
 * تحويل مصفوفة روابط الصور (حتى 3 صور) إلى نص لتخزينه في عمود image_url
 */
export function serializeProductImages(images: string[]): string {
  const cleaned = images.filter((img) => img && img.trim().length > 0).slice(0, 3);
  if (cleaned.length === 0) return '';
  if (cleaned.length === 1) return cleaned[0];
  return JSON.stringify(cleaned);
}

function normalizeCategoryName(name: string): string {
  return (name || '')
    .toLowerCase()
    .replace(/[أإآ]/g, 'ا')
    .replace(/ة/g, 'ه')
    .replace(/[\s\-_/\\,]+/g, '')
    .trim();
}

function categoriesMatch(catA?: string | null, catB?: string | null): boolean {
  if (!catA || !catB) return false;
  if (catA === catB) return true;
  const a = normalizeCategoryName(catA);
  const b = normalizeCategoryName(catB);
  if (a === b) return true;
  // التعامل مع المسميات المترادفة مثل "المنزل والأثاث" و "أثاث ومفروشات"
  const isFurnitureA = a.includes('اثاث') || a.includes('مفروشات') || a.includes('منزل');
  const isFurnitureB = b.includes('اثاث') || b.includes('مفروشات') || b.includes('منزل');
  if (isFurnitureA && isFurnitureB) return true;

  return a.includes(b) || b.includes(a);
}

/**
 * فلترة الإعلانات حسب القسم والقسم الفرعي والمحافظة والبحث النصي
 */
export function filterProducts(items: ProductItem[], options: FilterOptions): ProductItem[] {
  return items.filter((item) => {
    // فلتر القسم
    if (options.category && options.category !== 'الكل') {
      if (!categoriesMatch(item.category, options.category)) {
        return false;
      }
    }

    // فلتر القسم الفرعي
    if (options.subCategory && options.subCategory !== 'الكل') {
      const subA = normalizeCategoryName(item.sub_category || '');
      const subB = normalizeCategoryName(options.subCategory);
      if (item.sub_category !== options.subCategory && subA !== subB && !subA.includes(subB) && !subB.includes(subA)) {
        return false;
      }
    }

    // فلتر المحافظة
    if (options.province && options.province !== 'الكل' && item.province !== options.province) {
      return false;
    }

    // فلتر البحث النصي (في العنوان والوصف والموقع)
    if (options.searchQuery && options.searchQuery.trim() !== '') {
      const q = options.searchQuery.toLowerCase().trim();
      const inTitle = item.title?.toLowerCase().includes(q) ?? false;
      const inDesc = item.description?.toLowerCase().includes(q) ?? false;
      const inLocation = item.location?.toLowerCase().includes(q) ?? false;
      const inProvince = item.province?.toLowerCase().includes(q) ?? false;
      if (!inTitle && !inDesc && !inLocation && !inProvince) {
        return false;
      }
    }

    return true;
  });
}

/**
 * تنسيق رقم الواتساب لفتح المحادثة المباشرة
 * يدعم الأرقام السورية بصيغة 09XXXXXXXX أو 9639XXXXXXXX
 */
export function formatWhatsappUrl(phone: string): string {
  let cleaned = phone.replace(/[^0-9]/g, '');
  if (cleaned.startsWith('09') && cleaned.length === 10) {
    cleaned = '963' + cleaned.substring(1);
  } else if (cleaned.startsWith('00963')) {
    cleaned = cleaned.substring(2);
  }
  return `https://wa.me/${cleaned}`;
}

/**
 * رابط الاتصال الهاتفي الخلوي المباشر
 */
export function formatDirectCallUrl(phone: string): string {
  const cleaned = phone.replace(/[^0-9+]/g, '');
  return `tel:${cleaned}`;
}

/**
 * التحقق من صحة الرقم الوطني السوري (11 رقم)
 */
export function isValidSyrianNationalId(id: string): boolean {
  const cleaned = id.replace(/[^0-9]/g, '');
  return cleaned.length === 11;
}

/**
 * تنسيق السعر بالليرة السورية أو الدولار أو قابل للتفاوض
 */
export function formatPriceWithCurrency(
  price?: string | null,
  currency: string = 'SYP',
  isNegotiable: boolean = false
): string {
  if (isNegotiable && (!price || price.trim() === '')) {
    return 'السعر قابل للتفاوض';
  }

  if (!price || price.trim() === '') return '';

  const raw = price.trim();
  // إذا كان السعر يحتوي أصلاً على كلمة تفاوض
  if (raw.includes('تفاوض')) {
    return raw;
  }

  const num = parseInt(raw.replace(/[^0-9]/g, ''), 10);
  if (isNaN(num)) return raw;

  const formattedNum = num.toLocaleString('ar-SY');
  const unit = currency === 'USD' || raw.includes('$') ? '$' : 'ل.س';
  const suffix = isNegotiable ? ' (قابل للتفاوض)' : '';

  return `${formattedNum} ${unit}${suffix}`;
}

/**
 * حساب الوقت المنقضي منذ النشر بصيغة عربية ودودة (منذ دقائق، ساعات، أيام)
 */
export function formatTimeAgo(dateString?: string): string {
  if (!dateString) return 'حديثاً';
  const now = new Date();
  const date = new Date(dateString);
  const diffMs = now.getTime() - date.getTime();
  const diffSec = Math.floor(diffMs / 1000);
  const diffMin = Math.floor(diffSec / 60);
  const diffHours = Math.floor(diffMin / 60);
  const diffDays = Math.floor(diffHours / 24);

  if (diffMin < 1) return 'الآن';
  if (diffMin < 60) return `منذ ${diffMin} دقيقة`;
  if (diffHours < 24) return `منذ ${diffHours} ساعة`;
  if (diffDays === 1) return 'أمس';
  if (diffDays < 7) return `منذ ${diffDays} أيام`;
  return date.toLocaleDateString('ar-SY');
}
