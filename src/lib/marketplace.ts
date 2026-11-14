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
 * تحويل مصفوفة روابط الصور (وفق الحد الأقصى من السحابة) إلى نص لتخزينه في عمود image_url
 */
export function serializeProductImages(images: string[], maxImages = 3): string {
  const limit = Math.max(1, maxImages);
  const cleaned = images.filter((img) => img && img.trim().length > 0).slice(0, limit);
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
 * تنسيق رقم الواتساب لفتح المحادثة المباشرة (يدعم التطبيق المباشر أو واتساب ويب)
 * يدعم الأرقام السورية بصيغة 09XXXXXXXX أو 9639XXXXXXXX
 */
export function formatWhatsappUrl(
  phone: string,
  launchMode: 'app' | 'web' = 'app'
): string {
  let cleaned = phone.replace(/[^0-9]/g, '');
  if (cleaned.startsWith('09') && cleaned.length === 10) {
    cleaned = '963' + cleaned.substring(1);
  } else if (cleaned.startsWith('00963')) {
    cleaned = cleaned.substring(2);
  }
  if (launchMode === 'web') {
    return `https://web.whatsapp.com/send?phone=${cleaned}`;
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

// ======================================================
// أنواع ودوال التحكم السحابي المتقدم (Deep Control Sync)
// ======================================================

export type BadgeEffectType = 'none' | 'shimmer' | 'glow' | 'metallic_gold';

export interface BadgeAppearanceConfig {
  text?: string;
  bgColor?: string;
  gradientTo?: string;
  useGradient?: boolean;
  textColor?: string;
  borderColor?: string;
  iconColor?: string;
  effect?: BadgeEffectType;
  glowColor?: string;
  cardBorderColor?: string;
  cardRingColor?: string;
}

export interface VerificationTier {
  id: string;
  name: string;
  description?: string;
  badge: BadgeAppearanceConfig;
}

export interface CloudFieldItem {
  id: string;
  name: string;
  label: string;
  visible: boolean;
  required: boolean;
  type?: 'text' | 'number' | 'textarea' | 'select' | 'image' | 'date';
  options?: string[];
  placeholder?: string;
  isCustom?: boolean;
  categories?: string[];
  showInCard?: boolean;
}

export interface MarketRulesConfig {
  maxImagesPerAd: number;
  imageMaxWidth: 800 | 1200 | 1600;
  imageQuality: number;
  allowedCurrencies: ('SYP' | 'USD')[];
  hideContactForGuests: boolean;
  maxDailyAdsPerUser: number;
  adExpiryDays: number;
  allowUserEditAd: boolean;
  reReviewOnEdit: boolean;
  bannedKeywords: string[];
  bannedKeywordAction: 'block' | 'pending_review';
  defaultSortOrder: 'newest' | 'oldest' | 'price_asc' | 'price_desc';
  defaultFontScale: 100 | 115 | 130 | 145;
}

export const DEFAULT_MARKET_RULES: MarketRulesConfig = {
  maxImagesPerAd: 3,
  imageMaxWidth: 1200,
  imageQuality: 0.78,
  allowedCurrencies: ['SYP', 'USD'],
  hideContactForGuests: false,
  maxDailyAdsPerUser: 0,
  adExpiryDays: 0,
  allowUserEditAd: true,
  reReviewOnEdit: true,
  bannedKeywords: ['تزوير', 'سلاح', 'مخدرات', 'شهادة مزورة', 'حساب مسروق'],
  bannedKeywordAction: 'block',
  defaultSortOrder: 'newest',
  defaultFontScale: 100,
};

export interface FeaturedPromotionItem {
  productId: string;
  expiresAt: string | null;
  priority: number;
  note?: string;
}

export type BannerActionType = 'url' | 'whatsapp' | 'tab' | 'create_ad' | 'category';

export interface PromotionalBannerSlide {
  id: string;
  title: string;
  subtitle?: string;
  imageUrl?: string;
  bgColor: string;
  textColor: string;
  badgeText?: string;
  actionType: BannerActionType;
  actionValue?: string;
  targetProvinces?: string[];
  targetCategories?: string[];
  targetAudience?: 'all' | 'guests' | 'logged_in';
  startAt?: string;
  endAt?: string;
  active: boolean;
  order: number;
}

export interface SettingsProposalConfigItem {
  id: string;
  title: string;
  description: string;
  badge: string;
  iconName: string;
  enabled: boolean;
  order: number;
}

export interface AdEngagementMetrics {
  views: number;
  whatsappClicks: number;
  callClicks: number;
  updatedAt: string;
}

export type EngagementStatsMap = Record<string, AdEngagementMetrics>;

export interface TargetingContext {
  province?: string;
  category?: string;
  isLoggedIn: boolean;
  nowMs?: number;
}

const SPECS_MARKER_REGEX = /\n?<!--SOUQ_SPECS:([\s\S]*?)-->\s*$/;

export function filterCustomFieldsByCategory(
  fields: CloudFieldItem[],
  selectedCategory: string
): CloudFieldItem[] {
  return fields.filter((field) => {
    if (field.visible === false) return false;
    if (!field.categories || field.categories.length === 0) return true;
    return field.categories.includes(selectedCategory);
  });
}

export function stripCustomSpecsMarker(description?: string | null): string {
  if (!description) return '';
  return description.replace(SPECS_MARKER_REGEX, '').trim();
}

export function encodeCustomSpecsIntoDescription(
  plainDescription: string,
  specs: Record<string, string>
): string {
  const cleanText = stripCustomSpecsMarker(plainDescription).trim();
  const nonEmptyEntries = Object.entries(specs)
    .map(([k, v]) => [k.trim(), String(v ?? '').trim()] as const)
    .filter(([k, v]) => k.length > 0 && v.length > 0);

  if (nonEmptyEntries.length === 0) {
    return cleanText;
  }

  const payload = JSON.stringify(Object.fromEntries(nonEmptyEntries));
  return cleanText ? `${cleanText}\n<!--SOUQ_SPECS:${payload}-->` : `<!--SOUQ_SPECS:${payload}-->`;
}

export function extractCustomSpecsFromDescription(description?: string | null): {
  cleanDescription: string;
  specs: Record<string, string>;
} {
  if (!description) {
    return { cleanDescription: '', specs: {} };
  }
  const match = description.match(SPECS_MARKER_REGEX);
  if (!match) {
    return { cleanDescription: description.trim(), specs: {} };
  }

  let specs: Record<string, string> = {};
  try {
    const parsed = JSON.parse(match[1]);
    if (parsed && typeof parsed === 'object' && !Array.isArray(parsed)) {
      specs = Object.fromEntries(
        Object.entries(parsed)
          .filter(([, val]) => typeof val === 'string' && val.trim().length > 0)
          .map(([k, val]) => [k, String(val).trim()])
      );
    }
  } catch {
    specs = {};
  }

  return {
    cleanDescription: description.replace(SPECS_MARKER_REGEX, '').trim(),
    specs,
  };
}

export function checkBannedKeywords(
  texts: Array<string | null | undefined>,
  bannedKeywords: string[]
): { matched: boolean; matchedWords: string[] } {
  const normalizedList = (bannedKeywords || [])
    .map((w) => w.trim().toLowerCase())
    .filter((w) => w.length > 0);

  if (normalizedList.length === 0) {
    return { matched: false, matchedWords: [] };
  }

  const combined = texts
    .filter((t): t is string => typeof t === 'string' && t.trim().length > 0)
    .join(' ')
    .toLowerCase();

  if (!combined) {
    return { matched: false, matchedWords: [] };
  }

  const found = normalizedList.filter((word) => combined.includes(word));
  return {
    matched: found.length > 0,
    matchedWords: Array.from(new Set(found)),
  };
}

export function isAdExpired(
  createdAt?: string | null,
  adExpiryDays = 0,
  nowMs: number = Date.now()
): boolean {
  if (!adExpiryDays || adExpiryDays <= 0 || !createdAt) return false;
  const createdTime = Date.parse(createdAt);
  if (!Number.isFinite(createdTime)) return false;
  return nowMs - createdTime > adExpiryDays * 24 * 60 * 60 * 1000;
}

export function countUserAdsLast24h(
  products: Array<{ user_id?: string | null; created_at?: string | null }>,
  userId: string,
  nowMs: number = Date.now()
): number {
  if (!userId) return 0;
  const cutoff = nowMs - 24 * 60 * 60 * 1000;
  return products.filter((p) => {
    if (p.user_id !== userId || !p.created_at) return false;
    const t = Date.parse(p.created_at);
    return Number.isFinite(t) && t >= cutoff && t <= nowMs;
  }).length;
}

export function canUserPostToday(
  products: Array<{ user_id?: string | null; created_at?: string | null }>,
  userId: string,
  maxDailyAdsPerUser = 0,
  nowMs: number = Date.now()
): { allowed: boolean; usedToday: number; limit: number } {
  if (!maxDailyAdsPerUser || maxDailyAdsPerUser <= 0) {
    return { allowed: true, usedToday: 0, limit: 0 };
  }
  const usedToday = countUserAdsLast24h(products, userId, nowMs);
  return {
    allowed: usedToday < maxDailyAdsPerUser,
    usedToday,
    limit: maxDailyAdsPerUser,
  };
}

function isWithinScheduleWindow(startAt?: string, endAt?: string, nowMs: number = Date.now()): boolean {
  if (startAt && startAt.trim()) {
    const startMs = Date.parse(startAt);
    if (Number.isFinite(startMs) && nowMs < startMs) return false;
  }
  if (endAt && endAt.trim()) {
    const endMs = Date.parse(endAt);
    if (Number.isFinite(endMs) && nowMs > endMs) return false;
  }
  return true;
}

export function matchesTargetingContext(
  item: {
    targetProvinces?: string[];
    targetCategories?: string[];
    targetAudience?: 'all' | 'guests' | 'logged_in';
    startAt?: string;
    endAt?: string;
  },
  ctx: TargetingContext
): boolean {
  const nowMs = ctx.nowMs ?? Date.now();
  if (!isWithinScheduleWindow(item.startAt, item.endAt, nowMs)) return false;

  if (item.targetAudience === 'guests' && ctx.isLoggedIn) return false;
  if (item.targetAudience === 'logged_in' && !ctx.isLoggedIn) return false;

  if (item.targetProvinces && item.targetProvinces.length > 0) {
    if (!ctx.province || ctx.province === 'الكل' || !item.targetProvinces.includes(ctx.province)) {
      return false;
    }
  }

  if (item.targetCategories && item.targetCategories.length > 0) {
    if (!ctx.category || ctx.category === 'الكل' || !item.targetCategories.includes(ctx.category)) {
      return false;
    }
  }

  return true;
}

export function filterWidgetsByContext<
  T extends {
    visible?: boolean;
    targetProvinces?: string[];
    targetCategories?: string[];
    targetAudience?: 'all' | 'guests' | 'logged_in';
    startAt?: string;
    endAt?: string;
  }
>(widgets: T[], ctx: TargetingContext): T[] {
  return widgets.filter((w) => w.visible !== false && matchesTargetingContext(w, ctx));
}

export function filterActiveBanners(
  banners: PromotionalBannerSlide[],
  ctx: TargetingContext
): PromotionalBannerSlide[] {
  return [...banners]
    .filter((b) => b.active && matchesTargetingContext(b, ctx))
    .sort((a, b) => (a.order ?? 0) - (b.order ?? 0));
}

export function getActiveFeaturedMap(
  featuredIds: string[],
  featuredMeta: FeaturedPromotionItem[],
  nowMs: number = Date.now()
): Map<string, { priority: number; expiresAt: string | null; note?: string }> {
  const metaMap = new Map<string, FeaturedPromotionItem>();
  for (const item of featuredMeta || []) {
    if (item && item.productId) {
      metaMap.set(item.productId, item);
    }
  }

  const activeMap = new Map<string, { priority: number; expiresAt: string | null; note?: string }>();
  const allIds = new Set<string>([...(featuredIds || []), ...Array.from(metaMap.keys())]);

  for (const productId of allIds) {
    const meta = metaMap.get(productId);
    const inLegacy = (featuredIds || []).includes(productId);
    if (!inLegacy && !meta) continue;
    if (meta?.expiresAt) {
      const expMs = Date.parse(meta.expiresAt);
      if (Number.isFinite(expMs) && expMs < nowMs) {
        continue;
      }
    }
    activeMap.set(productId, {
      priority: meta?.priority ?? 50,
      expiresAt: meta?.expiresAt ?? null,
      note: meta?.note,
    });
  }

  return activeMap;
}

function parseNumericPrice(price?: string | null): number {
  if (!price) return 0;
  const cleaned = price.replace(/[^\d.]/g, '');
  const num = parseFloat(cleaned);
  return Number.isFinite(num) ? num : 0;
}

export function sortMarketplaceProducts(
  products: ProductItem[],
  sortOrder: MarketRulesConfig['defaultSortOrder'],
  activeFeaturedMap: Map<string, { priority: number }>
): ProductItem[] {
  return [...products].sort((a, b) => {
    const aFeat = activeFeaturedMap.get(a.id);
    const bFeat = activeFeaturedMap.get(b.id);

    if (aFeat && !bFeat) return -1;
    if (!aFeat && bFeat) return 1;
    if (aFeat && bFeat && aFeat.priority !== bFeat.priority) {
      return bFeat.priority - aFeat.priority;
    }

    if (sortOrder === 'oldest') {
      return Date.parse(a.created_at) - Date.parse(b.created_at);
    }
    if (sortOrder === 'price_asc') {
      return parseNumericPrice(a.price) - parseNumericPrice(b.price);
    }
    if (sortOrder === 'price_desc') {
      return parseNumericPrice(b.price) - parseNumericPrice(a.price);
    }
    return Date.parse(b.created_at) - Date.parse(a.created_at);
  });
}

export function resolveSellerVerificationBadge(
  sellerId: string | null | undefined,
  isVerified: boolean,
  userTiers: Record<string, string>,
  verificationTiers: VerificationTier[],
  defaultVerifiedBadge?: BadgeAppearanceConfig
): BadgeAppearanceConfig | undefined {
  const assignedTierId = sellerId ? userTiers?.[sellerId] : undefined;
  if (assignedTierId) {
    const matchedTier = (verificationTiers || []).find((t) => t.id === assignedTierId);
    if (matchedTier) {
      return matchedTier.badge;
    }
  }
  if (!isVerified) return undefined;
  return defaultVerifiedBadge;
}

