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
  showFontSizeSetting?: boolean;
  showSortSetting?: boolean;
  showMyProductsCountBadge?: boolean;
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
  showFontSizeSetting: true,
  showSortSetting: true,
  showMyProductsCountBadge: true,
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
  if (!isVerified) return undefined;
  const assignedTierId = sellerId ? userTiers?.[sellerId] : undefined;
  if (assignedTierId) {
    const matchedTier = (verificationTiers || []).find((t) => t.id === assignedTierId);
    if (matchedTier) {
      return matchedTier.badge;
    }
  }
  return defaultVerifiedBadge;
}

// ======================================================
// منظومة المناديب والتوصيل السحابية (Courier & Delivery)
// ======================================================

export interface CourierVehicleSizeOption {
  id: string;
  label: string;
  capacityHint: string;
}

export interface CourierPaymentGatewayPrep {
  id: string;
  name: string;
  enabled: boolean;
  accountHint?: string;
}

export interface CourierPaymentPrepConfig {
  enabled: boolean;
  mode: 'direct_only' | 'cash_on_delivery_fee' | 'escrow_wallet' | 'commission_prepaid';
  commissionPercent: number;
  futureNoticeText: string;
  supportedGateways: CourierPaymentGatewayPrep[];
}

export interface CourierServiceConfig {
  enabled: boolean;
  directoryButtonLabel: string;
  directoryButtonPosition: 'header_left' | 'header_right' | 'floating' | 'hidden';
  showDirectoryButtonInHeader: boolean;
  showProductCardRequestButton: boolean;
  productCardButtonLabel: string;
  applyButtonLabel: string;
  applyButtonPosition: 'header_right' | 'header_left' | 'account_top' | 'hidden';
  showApplyButtonInHeader: boolean;
  incomingRequestsButtonLabel: string;
  defaultMaxCouriersPerProvince: number;
  provinceQuotas: Record<string, number>;
  provinceFullMessage: string;
  imageMaxWidth: 800 | 1000 | 1200 | 1600;
  imageQuality: number;
  vehiclePhotoOptional: boolean;
  photoClarityWarningText: string;
  feeDisclaimerText: string;
  vehicleSizes: CourierVehicleSizeOption[];
  paymentPrep: CourierPaymentPrepConfig;
}

export const DEFAULT_COURIER_CONFIG: CourierServiceConfig = {
  enabled: false,
  directoryButtonLabel: 'اطلب مندوب',
  directoryButtonPosition: 'header_left',
  showDirectoryButtonInHeader: true,
  showProductCardRequestButton: true,
  productCardButtonLabel: 'اطلب مندوب للقطعة',
  applyButtonLabel: 'انضم كمندوب',
  applyButtonPosition: 'account_top',
  showApplyButtonInHeader: true,
  incomingRequestsButtonLabel: 'طلبات المستخدمين',
  defaultMaxCouriersPerProvince: 50,
  provinceQuotas: {},
  provinceFullMessage:
    'عذراً، تم اكتمال العدد المطلوب للمناديب في هذه المحافظة حالياً. يمكنك المحاولة لاحقاً عند فتح شواغر جديدة أو اختيار محافظة أخرى.',
  imageMaxWidth: 1000,
  imageQuality: 0.72,
  vehiclePhotoOptional: true,
  photoClarityWarningText:
    'تنبيه هام جداً: يرجى تصوير الهوية الشخصية (الوجه الأمامي والخلفي) وصورة السيلفي وأنت تحمل الهوية بجانب وجهك في مكان مضاء وبوضوح تام دون أي تشويش أو انعكاس؛ أي صورة غير واضحة ستؤدي إلى رفض الطلب مباشرة.',
  feeDisclaimerText:
    'ملاحظة رسمية: التطبيق وسيط تقني للربط فقط — أجرة التوصيل ليست على التطبيق ولا يدفع التطبيق رواتب للمناديب، بل يتم الاتفاق عليها ودفعها مباشرة بين العميل (الشاري أو البائع) والمندوب ولا يتحمل التطبيق أي مسؤولية مالية.',
  vehicleSizes: [
    { id: 'small', label: 'دراجة نارية / قطع صغيرة', capacityHint: 'طرود خفيفة وهواتف وإكسسوارات' },
    { id: 'medium', label: 'سيارة سياحية / قطع متوسطة', capacityHint: 'أجهزة منزلية صغيرة وشاشات' },
    { id: 'van', label: 'فان / سوزوكي مغلق', capacityHint: 'غسالات، برادات، ألواح شمسية وأثاث متوسط' },
    { id: 'pickup', label: 'بيك أب / شاحنة خفيفة', capacityHint: 'أثاث ومعدات كبيرة ومواد بناء' },
    { id: 'truck', label: 'شاحنة نقل ثقيل', capacityHint: 'نقل تجاري وآليات ثقيلة بين المحافظات' },
  ],
  paymentPrep: {
    enabled: false,
    mode: 'direct_only',
    commissionPercent: 0,
    futureNoticeText:
      'منظومة الدفع الإلكتروني قيد التجهيز المسبق ومعطلة حالياً — التسوية المالية تتم مباشرة بين العميل والمندوب.',
    supportedGateways: [],
  },
};

export type CourierApplicationStatus = 'pending' | 'approved' | 'rejected' | 'suspended';

export interface CourierApplicationItem {
  id: string;
  userId: string;
  fullName: string;
  nationalId: string;
  phone: string;
  province: string;
  areaDetails?: string;
  vehicleSizeId: string;
  vehicleNameModel: string;
  vehiclePhotoUrl?: string;
  idFrontPhotoUrl: string;
  idBackPhotoUrl: string;
  selfieWithIdPhotoUrl: string;
  acceptedPaymentNote?: string;
  feeNote?: string;
  status: CourierApplicationStatus;
  rejectionReason?: string;
  isOnline: boolean;
  createdAt: string;
  reviewedAt?: string;
}

export interface CourierDeliveryRequest {
  id: string;
  courierId: string;
  courierUserId: string;
  courierName: string;
  requesterUserId?: string | null;
  requesterName: string;
  requesterPhone: string;
  productId?: string | null;
  productTitle?: string | null;
  pickupProvince: string;
  dropoffProvince: string;
  detailedAddress: string;
  itemDescription: string;
  vehicleSizeId: string;
  feePayer: 'buyer' | 'seller' | 'split';
  feeAgreementMode: 'direct_negotiation' | 'proposed_amount';
  proposedFeeAmount?: string;
  paymentPreparedRef?: string;
  status: 'new' | 'accepted' | 'declined' | 'completed';
  createdAt: string;
  updatedAt?: string;
}

export function getProvinceCourierQuota(
  config: CourierServiceConfig,
  province: string
): number {
  if (province && config.provinceQuotas && typeof config.provinceQuotas[province] === 'number') {
    return Math.max(0, Math.floor(config.provinceQuotas[province]));
  }
  return Math.max(0, Math.floor(config.defaultMaxCouriersPerProvince ?? 50));
}

export function getApprovedCouriersCountForProvince(
  applications: CourierApplicationItem[],
  province: string
): number {
  if (!province) return 0;
  return (applications || []).filter(
    (app) => app.status === 'approved' && app.province === province
  ).length;
}

export function canApplyAsCourierInProvince(
  applications: CourierApplicationItem[],
  config: CourierServiceConfig,
  province: string
): {
  allowed: boolean;
  approvedCount: number;
  maxQuota: number;
  message?: string;
} {
  const maxQuota = getProvinceCourierQuota(config, province);
  const approvedCount = getApprovedCouriersCountForProvince(applications, province);
  if (maxQuota === 0 || approvedCount >= maxQuota) {
    return {
      allowed: false,
      approvedCount,
      maxQuota,
      message:
        config.provinceFullMessage ||
        'عذراً، تم اكتمال العدد المطلوب للمناديب في هذه المحافظة حالياً.',
    };
  }
  return {
    allowed: true,
    approvedCount,
    maxQuota,
  };
}

export function filterActiveCouriers(
  applications: CourierApplicationItem[],
  filters: {
    province?: string;
    vehicleSizeId?: string;
    searchQuery?: string;
  } = {}
): CourierApplicationItem[] {
  const query = (filters.searchQuery || '').trim().toLowerCase();
  return (applications || []).filter((app) => {
    if (app.status !== 'approved' || !app.isOnline) return false;
    if (filters.province && filters.province !== 'الكل' && app.province !== filters.province) {
      return false;
    }
    if (filters.vehicleSizeId && filters.vehicleSizeId !== 'all' && app.vehicleSizeId !== filters.vehicleSizeId) {
      return false;
    }
    if (query) {
      const hay = `${app.fullName} ${app.province} ${app.areaDetails || ''} ${app.vehicleNameModel}`.toLowerCase();
      if (!hay.includes(query)) return false;
    }
    return true;
  });
}

export function validateCourierApplicationInput(
  input: {
    fullName: string;
    nationalId: string;
    phone: string;
    province: string;
    vehicleSizeId: string;
    vehicleNameModel: string;
    vehiclePhotoUrl?: string;
    idFrontPhotoUrl: string;
    idBackPhotoUrl: string;
    selfieWithIdPhotoUrl: string;
  },
  config: CourierServiceConfig
): { valid: boolean; error?: string } {
  if (!input.fullName || input.fullName.trim().length < 3) {
    return { valid: false, error: 'يرجى إدخال الاسم الكامل بشكل صحيح.' };
  }
  if (!isValidSyrianNationalId(input.nationalId || '')) {
    return { valid: false, error: 'يجب إدخال الرقم الوطني السوري الصحيح (11 رقماً).' };
  }
  const cleanPhone = (input.phone || '').replace(/[^0-9+]/g, '');
  if (cleanPhone.length < 9) {
    return { valid: false, error: 'يرجى إدخال رقم هاتف / واتساب صحيح للتواصل.' };
  }
  if (!input.province || !input.province.trim()) {
    return { valid: false, error: 'يرجى اختيار المحافظة التي تعمل بها.' };
  }
  if (!input.vehicleSizeId || !input.vehicleNameModel || input.vehicleNameModel.trim().length < 2) {
    return { valid: false, error: 'يرجى تحديد حجم المركبة وكتابة اسمها/نوعها.' };
  }
  if (!config.vehiclePhotoOptional && !input.vehiclePhotoUrl?.trim()) {
    return { valid: false, error: 'يرجى إرفاق صورة المركبة.' };
  }
  if (!input.idFrontPhotoUrl?.trim() || !input.idBackPhotoUrl?.trim()) {
    return {
      valid: false,
      error: 'يرجى إرفاق صورتي الهوية الشخصية (الوجه الأمامي والوجه الخلفي) بوضوح.',
    };
  }
  if (!input.selfieWithIdPhotoUrl?.trim()) {
    return {
      valid: false,
      error: 'يرجى إرفاق صورة سيلفي واحدة واضحة وأنت تحمل الهوية بجانب وجهك.',
    };
  }
  return { valid: true };
}

// ======================================================
// منظومة المحفظة والنقاط وشام كاش واشتراكات التجار والنجوم
// ======================================================

export type WalletCurrency = 'SYP' | 'USD';

export interface WalletPointPackage {
  id: string;
  title: string;
  subtitle?: string;
  points: number;
  bonusPoints?: number;
  price: number;
  currency: WalletCurrency;
  badgeText?: string;
  bgColor: string;
  gradientTo?: string;
  useGradient?: boolean;
  textColor: string;
  borderColor: string;
  effect: BadgeEffectType;
  glowColor?: string;
  visible: boolean;
  order: number;
}

export interface MerchantSubscriptionPlan {
  id: string;
  title: string;
  description: string;
  durationDays: number;
  pointsCost: number;
  directPrice: number;
  currency: WalletCurrency;
  tierId?: string;
  maxImagesPerAd: number;
  maxDailyAds: number;
  includedStarBoosts: number;
  starBoostDurationDays: number;
  badgeText?: string;
  bgColor: string;
  gradientTo?: string;
  useGradient?: boolean;
  textColor: string;
  borderColor: string;
  effect: BadgeEffectType;
  glowColor?: string;
  visible: boolean;
  order: number;
}

export interface StarFeaturePlan {
  id: string;
  title: string;
  durationDays: number;
  pointsCost: number;
  priority: number;
  badgeText?: string;
  visible: boolean;
  order: number;
}

export interface WalletMonetizationConfig {
  enabled: boolean;
  showWalletButtonInHeader: boolean;
  walletButtonLabel: string;
  walletButtonPosition: 'left' | 'right';
  welcomeBonusEnabled: boolean;
  welcomeBonusPoints: number;
  welcomeBonusMessage: string;
  maxSubscribedMerchants: number;
  enforceFreeUserLimits: boolean;
  freeMaxImagesPerAd: number;
  freeMaxDailyAds: number;
  extraImagePointCost: number;
  extraDailyAdPointCost: number;
  expiryReminderEnabled: boolean;
  expiryReminderDays: number;
  expiryReminderTitle: string;
  expiryReminderMessage: string;
  shamCashTitle: string;
  shamCashAccountName: string;
  shamCashAccountNumberSyp: string;
  shamCashQrImageUrlSyp: string;
  shamCashAccountNumberUsd: string;
  shamCashQrImageUrlUsd: string;
  shamCashInstructionMessage: string;
  shamCashPendingMessage: string;
  estimatedVerificationMinutes: number;
  paymentImageMaxWidth: 800 | 1000 | 1200;
  paymentImageQuality: number;
  packages: WalletPointPackage[];
  merchantPlans: MerchantSubscriptionPlan[];
  starFeaturePlans: StarFeaturePlan[];
}

export type WalletTransactionType =
  | 'welcome_bonus'
  | 'recharge'
  | 'admin_adjust'
  | 'plan_purchase'
  | 'star_boost'
  | 'extra_image'
  | 'extra_ad';

export interface WalletTransaction {
  id: string;
  type: WalletTransactionType;
  amount: number;
  title: string;
  note?: string;
  createdAt: string;
}

export interface UserWalletRecord {
  userId: string;
  points: number;
  welcomeBonusClaimed?: boolean;
  welcomeNationalId?: string;
  activePlanId?: string;
  activePlanTitle?: string;
  verifiedUntil?: string | null;
  tierId?: string;
  maxImagesPerAd?: number;
  maxDailyAds?: number;
  starCreditsRemaining?: number;
  updatedAt: string;
  transactions: WalletTransaction[];
}

export type PaymentRequestStatus = 'pending' | 'approved' | 'rejected';

export interface WalletPaymentRequest {
  id: string;
  userId: string;
  userName: string;
  userPhone?: string;
  userNationalId?: string;
  requestType: 'package_recharge' | 'merchant_plan';
  targetId: string;
  targetTitle: string;
  pointsToCredit: number;
  durationDays?: number;
  priceAmount: number;
  currency: WalletCurrency;
  transferReference?: string;
  receiptImageUrl?: string;
  userNote?: string;
  status: PaymentRequestStatus;
  rejectionReason?: string;
  createdAt: string;
  reviewedAt?: string;
}

export const DEFAULT_WALLET_CONFIG: WalletMonetizationConfig = {
  enabled: false,
  showWalletButtonInHeader: false,
  walletButtonLabel: 'محفظتي',
  walletButtonPosition: 'left',
  welcomeBonusEnabled: true,
  welcomeBonusPoints: 15,
  welcomeBonusMessage:
    'هدية ترحيبية بمناسبة انضمامك إلى سوق سوريا! يمكنك استخدامها لتجربة تمييز إعلانك أو إضافة صور إضافية.',
  maxSubscribedMerchants: 100,
  enforceFreeUserLimits: true,
  freeMaxImagesPerAd: 1,
  freeMaxDailyAds: 1,
  extraImagePointCost: 5,
  extraDailyAdPointCost: 15,
  expiryReminderEnabled: true,
  expiryReminderDays: 3,
  expiryReminderTitle: 'تذكير بقرب انتهاء اشتراكك وتوثيق حسابك',
  expiryReminderMessage:
    'يتبقى أقل من 3 أيام على انتهاء باقة التوثيق الخاصة بك في سوق سوريا. يمكنك التجديد بسهولة من قسم محفظتي.',
  shamCashTitle: 'الدفع عبر شام كاش (ShamCash)',
  shamCashAccountName: 'سوق سوريا',
  shamCashAccountNumberSyp: '',
  shamCashQrImageUrlSyp: '',
  shamCashAccountNumberUsd: '',
  shamCashQrImageUrlUsd: '',
  shamCashInstructionMessage:
    'يرجى تحويل قيمة الباقة المختارة عبر تطبيق شام كاش إلى حساب سوق سوريا الموضّح أدناه، ثم إرفاق صورة إشعار التحويل ورقم العملية لإتمام الشحن.',
  shamCashPendingMessage:
    'تم استلام طلب التحويل بنجاح! يقوم فريق الإدارة حالياً بمطابقة الحوالة — عادةً يستغرق التفعيل حتى 5 دقائق. يمكنك متابعة تصفح التطبيق وسيُضاف الرصيد لمحفظتك تلقائياً فور التأكيد.',
  estimatedVerificationMinutes: 5,
  paymentImageMaxWidth: 1000,
  paymentImageQuality: 0.72,
  packages: [],
  merchantPlans: [],
  starFeaturePlans: [
    {
      id: 'star_3d',
      title: 'نجمة الصدارة 3 أيام',
      durationDays: 3,
      pointsCost: 20,
      priority: 65,
      badgeText: '⭐ 3 أيام',
      visible: true,
      order: 1,
    },
    {
      id: 'star_7d',
      title: 'نجمة الصدارة أسبوع كامل',
      durationDays: 7,
      pointsCost: 40,
      priority: 85,
      badgeText: '⭐ أسبوع',
      visible: true,
      order: 2,
    },
    {
      id: 'star_30d',
      title: 'نجمة الصدارة شهر كامل',
      durationDays: 30,
      pointsCost: 120,
      priority: 100,
      badgeText: '⭐ شهر كامل',
      visible: true,
      order: 3,
    },
  ],
};

export function ensureUserWalletRecord(
  wallets: Record<string, UserWalletRecord>,
  userId: string,
  nowIso: string = new Date().toISOString()
): UserWalletRecord {
  const existing = wallets?.[userId];
  if (existing) {
    return {
      ...existing,
      points: Number.isFinite(existing.points) ? existing.points : 0,
      starCreditsRemaining: Number.isFinite(existing.starCreditsRemaining)
        ? existing.starCreditsRemaining
        : 0,
      transactions: Array.isArray(existing.transactions) ? existing.transactions : [],
    };
  }
  return {
    userId,
    points: 0,
    starCreditsRemaining: 0,
    updatedAt: nowIso,
    transactions: [],
  };
}

export function isUserVerificationActive(
  wallet: Pick<UserWalletRecord, 'verifiedUntil'> | undefined,
  baseIsVerified: boolean,
  nowMs: number = Date.now()
): { active: boolean; daysRemaining: number | null; expired: boolean } {
  if (wallet?.verifiedUntil) {
    const expMs = Date.parse(wallet.verifiedUntil);
    if (Number.isFinite(expMs)) {
      if (expMs <= nowMs) {
        return { active: false, daysRemaining: 0, expired: true };
      }
      const daysRemaining = Math.ceil((expMs - nowMs) / (24 * 60 * 60 * 1000));
      return { active: true, daysRemaining, expired: false };
    }
  }
  return {
    active: Boolean(baseIsVerified),
    daysRemaining: null,
    expired: false,
  };
}

export function countActiveSubscribedMerchants(
  wallets: Record<string, UserWalletRecord>,
  nowMs: number = Date.now()
): number {
  let count = 0;
  for (const w of Object.values(wallets || {})) {
    if (!w || !w.verifiedUntil) continue;
    const expMs = Date.parse(w.verifiedUntil);
    if (Number.isFinite(expMs) && expMs > nowMs && w.activePlanId) {
      count += 1;
    }
  }
  return count;
}

export function canAcceptNewMerchantSubscription(
  wallets: Record<string, UserWalletRecord>,
  maxSubscribedMerchants: number,
  userId: string,
  nowMs: number = Date.now()
): { allowed: boolean; activeCount: number; maxQuota: number } {
  if (!maxSubscribedMerchants || maxSubscribedMerchants <= 0) {
    return {
      allowed: true,
      activeCount: countActiveSubscribedMerchants(wallets, nowMs),
      maxQuota: 0,
    };
  }
  const existing = wallets?.[userId];
  const alreadyActive = isUserVerificationActive(existing, false, nowMs).active && Boolean(existing?.activePlanId);
  const activeCount = countActiveSubscribedMerchants(wallets, nowMs);
  if (alreadyActive) {
    return { allowed: true, activeCount, maxQuota: maxSubscribedMerchants };
  }
  return {
    allowed: activeCount < maxSubscribedMerchants,
    activeCount,
    maxQuota: maxSubscribedMerchants,
  };
}

export function applyWelcomeBonusIfEligible(
  wallets: Record<string, UserWalletRecord>,
  userId: string,
  nationalId: string | undefined,
  config: Pick<WalletMonetizationConfig, 'enabled' | 'welcomeBonusEnabled' | 'welcomeBonusPoints' | 'welcomeBonusMessage'>,
  nowMs: number = Date.now()
): { updated: Record<string, UserWalletRecord>; granted: boolean; pointsGranted: number } {
  if (!userId || !config.welcomeBonusEnabled || config.welcomeBonusPoints <= 0) {
    return { updated: wallets, granted: false, pointsGranted: 0 };
  }

  const current = ensureUserWalletRecord(wallets, userId, new Date(nowMs).toISOString());
  if (current.welcomeBonusClaimed) {
    return { updated: wallets, granted: false, pointsGranted: 0 };
  }

  const cleanNationalId = (nationalId || '').trim();
  if (cleanNationalId) {
    const nationalIdAlreadyClaimed = Object.values(wallets || {}).some(
      (w) => w.welcomeBonusClaimed && w.welcomeNationalId === cleanNationalId
    );
    if (nationalIdAlreadyClaimed) {
      return { updated: wallets, granted: false, pointsGranted: 0 };
    }
  }

  const nowIso = new Date(nowMs).toISOString();
  const tx: WalletTransaction = {
    id: `tx_welcome_${nowMs}`,
    type: 'welcome_bonus',
    amount: config.welcomeBonusPoints,
    title: 'نقاط هدية ترحيبية عند التسجيل',
    note: config.welcomeBonusMessage,
    createdAt: nowIso,
  };

  const nextWallet: UserWalletRecord = {
    ...current,
    points: current.points + config.welcomeBonusPoints,
    welcomeBonusClaimed: true,
    welcomeNationalId: cleanNationalId || undefined,
    updatedAt: nowIso,
    transactions: [tx, ...current.transactions].slice(0, 60),
  };

  return {
    updated: { ...wallets, [userId]: nextWallet },
    granted: true,
    pointsGranted: config.welcomeBonusPoints,
  };
}

export function creditWalletPoints(
  wallets: Record<string, UserWalletRecord>,
  userId: string,
  pointsDelta: number,
  type: WalletTransaction['type'],
  title: string,
  note?: string,
  nowMs: number = Date.now()
): Record<string, UserWalletRecord> {
  const nowIso = new Date(nowMs).toISOString();
  const current = ensureUserWalletRecord(wallets, userId, nowIso);
  const nextPoints = Math.max(0, current.points + pointsDelta);
  const tx: WalletTransaction = {
    id: `tx_${nowMs}_${Math.random().toString(36).slice(2, 6)}`,
    type,
    amount: pointsDelta,
    title,
    note,
    createdAt: nowIso,
  };
  return {
    ...wallets,
    [userId]: {
      ...current,
      points: nextPoints,
      updatedAt: nowIso,
      transactions: [tx, ...current.transactions].slice(0, 60),
    },
  };
}

export function spendWalletPoints(
  wallets: Record<string, UserWalletRecord>,
  userId: string,
  cost: number,
  type: WalletTransaction['type'],
  title: string,
  note?: string,
  nowMs: number = Date.now()
): { ok: boolean; updated: Record<string, UserWalletRecord>; error?: string } {
  const current = ensureUserWalletRecord(wallets, userId, new Date(nowMs).toISOString());
  if (cost < 0 || !Number.isFinite(cost)) {
    return { ok: false, updated: wallets, error: 'قيمة النقاط غير صالحة' };
  }
  if (current.points < cost) {
    return {
      ok: false,
      updated: wallets,
      error: `رصيدك الحالي (${current.points} نقطة) غير كافٍ، المطلوب ${cost} نقطة.`,
    };
  }
  const next = creditWalletPoints(wallets, userId, -cost, type, title, note, nowMs);
  return { ok: true, updated: next };
}

export function activateMerchantPlanForWallet(
  wallets: Record<string, UserWalletRecord>,
  userId: string,
  plan: Pick<
    MerchantSubscriptionPlan,
    | 'id'
    | 'title'
    | 'durationDays'
    | 'tierId'
    | 'maxImagesPerAd'
    | 'maxDailyAds'
    | 'includedStarBoosts'
  >,
  pointsCharged: number = 0,
  txType: WalletTransaction['type'] = 'plan_purchase',
  nowMs: number = Date.now()
): { ok: boolean; updated: Record<string, UserWalletRecord>; verifiedUntil: string; error?: string } {
  const current = ensureUserWalletRecord(wallets, userId, new Date(nowMs).toISOString());
  if (pointsCharged > 0 && current.points < pointsCharged) {
    return {
      ok: false,
      updated: wallets,
      verifiedUntil: current.verifiedUntil || '',
      error: `رصيدك الحالي (${current.points} نقطة) لا يكفي لتفعيل «${plan.title}» (${pointsCharged} نقطة).`,
    };
  }

  const existingExpMs = current.verifiedUntil ? Date.parse(current.verifiedUntil) : NaN;
  const baseStartMs = Number.isFinite(existingExpMs) && existingExpMs > nowMs ? existingExpMs : nowMs;
  const nextExpIso = new Date(
    baseStartMs + Math.max(1, plan.durationDays) * 24 * 60 * 60 * 1000
  ).toISOString();
  const nowIso = new Date(nowMs).toISOString();

  const tx: WalletTransaction = {
    id: `tx_plan_${nowMs}_${Math.random().toString(36).slice(2, 6)}`,
    type: txType,
    amount: pointsCharged > 0 ? -pointsCharged : 0,
    title: `تفعيل ${plan.title} (${plan.durationDays} يوم)`,
    note: `صالح حتى ${new Date(nextExpIso).toLocaleDateString('ar-SY')}`,
    createdAt: nowIso,
  };

  return {
    ok: true,
    verifiedUntil: nextExpIso,
    updated: {
      ...wallets,
      [userId]: {
        ...current,
        points: Math.max(0, current.points - pointsCharged),
        activePlanId: plan.id,
        activePlanTitle: plan.title,
        verifiedUntil: nextExpIso,
        tierId: plan.tierId || current.tierId || 'golden_store',
        maxImagesPerAd: plan.maxImagesPerAd,
        maxDailyAds: plan.maxDailyAds,
        starCreditsRemaining: (current.starCreditsRemaining || 0) + (plan.includedStarBoosts || 0),
        updatedAt: nowIso,
        transactions: [tx, ...current.transactions].slice(0, 60),
      },
    },
  };
}

export function getUserPostingEntitlement(params: {
  walletConfig: WalletMonetizationConfig;
  marketRules: MarketRulesConfig;
  wallet?: UserWalletRecord;
  isVerified: boolean;
  products: Array<{ user_id?: string | null; created_at?: string | null }>;
  userId: string;
  nowMs?: number;
}): {
  isPaidMode: boolean;
  isSubscribedOrVerified: boolean;
  maxImagesAllowed: number;
  maxDailyAdsAllowed: number;
  usedAdsToday: number;
  canPostNewAd: boolean;
  extraImagePointCost: number;
  extraDailyAdPointCost: number;
} {
  const {
    walletConfig,
    marketRules,
    wallet,
    isVerified,
    products,
    userId,
    nowMs = Date.now(),
  } = params;

  const baseMaxImages = Math.max(1, marketRules.maxImagesPerAd || 3);
  const baseMaxDaily = marketRules.maxDailyAdsPerUser || 0;
  const usedToday = countUserAdsLast24h(products, userId, nowMs);

  if (!walletConfig.enabled) {
    return {
      isPaidMode: false,
      isSubscribedOrVerified: isVerified,
      maxImagesAllowed: baseMaxImages,
      maxDailyAdsAllowed: baseMaxDaily,
      usedAdsToday: usedToday,
      canPostNewAd: baseMaxDaily === 0 || usedToday < baseMaxDaily,
      extraImagePointCost: 0,
      extraDailyAdPointCost: 0,
    };
  }

  const verState = isUserVerificationActive(wallet, isVerified, nowMs);
  if (verState.active) {
    const planMaxImg = Math.max(baseMaxImages, wallet?.maxImagesPerAd || 5);
    const planMaxDaily = wallet?.maxDailyAds ?? 0;
    return {
      isPaidMode: true,
      isSubscribedOrVerified: true,
      maxImagesAllowed: planMaxImg,
      maxDailyAdsAllowed: planMaxDaily,
      usedAdsToday: usedToday,
      canPostNewAd: planMaxDaily === 0 || usedToday < planMaxDaily,
      extraImagePointCost: walletConfig.extraImagePointCost || 0,
      extraDailyAdPointCost: walletConfig.extraDailyAdPointCost || 0,
    };
  }

  if (!walletConfig.enforceFreeUserLimits) {
    return {
      isPaidMode: true,
      isSubscribedOrVerified: false,
      maxImagesAllowed: baseMaxImages,
      maxDailyAdsAllowed: baseMaxDaily,
      usedAdsToday: usedToday,
      canPostNewAd: baseMaxDaily === 0 || usedToday < baseMaxDaily,
      extraImagePointCost: walletConfig.extraImagePointCost || 0,
      extraDailyAdPointCost: walletConfig.extraDailyAdPointCost || 0,
    };
  }

  const freeMaxImages = Math.max(1, walletConfig.freeMaxImagesPerAd || 1);
  const freeMaxDaily = Math.max(0, walletConfig.freeMaxDailyAds ?? 1);

  return {
    isPaidMode: true,
    isSubscribedOrVerified: false,
    maxImagesAllowed: freeMaxImages,
    maxDailyAdsAllowed: freeMaxDaily,
    usedAdsToday: usedToday,
    canPostNewAd: freeMaxDaily === 0 || usedToday < freeMaxDaily,
    extraImagePointCost: Math.max(0, walletConfig.extraImagePointCost || 0),
    extraDailyAdPointCost: Math.max(0, walletConfig.extraDailyAdPointCost || 0),
  };
}

export function buildExpiryInAppNotification(
  wallet: UserWalletRecord | undefined,
  config: Pick<
    WalletMonetizationConfig,
    'expiryReminderEnabled' | 'expiryReminderDays' | 'expiryReminderTitle' | 'expiryReminderMessage'
  >,
  nowMs: number = Date.now()
): { id: string; title: string; message: string; created_at: string; is_read: boolean } | null {
  if (!config.expiryReminderEnabled || !wallet?.verifiedUntil) return null;
  const verState = isUserVerificationActive(wallet, false, nowMs);
  if (!verState.active || verState.daysRemaining === null) return null;
  const threshold = Math.max(1, config.expiryReminderDays || 3);
  if (verState.daysRemaining > threshold) return null;

  const expDateStr = new Date(wallet.verifiedUntil).toLocaleDateString('ar-SY');
  return {
    id: `wallet_expiry_${wallet.userId}_${wallet.verifiedUntil.slice(0, 10)}`,
    title: config.expiryReminderTitle || 'تنبيه قرب انتهاء التوثيق',
    message: `${config.expiryReminderMessage} (المتبقي: ${verState.daysRemaining} يوم — ينتهي بتاريخ ${expDateStr})`,
    created_at: new Date(nowMs).toISOString(),
    is_read: false,
  };
}

export function formatWalletPrice(amount: number, currency: WalletCurrency): string {
  const num = Number.isFinite(amount) ? amount : 0;
  const formatted = num.toLocaleString('en-US');
  return currency === 'USD' ? `${formatted} $` : `${formatted} ل.س`;
}

export function getWalletCardEffectClass(effect?: BadgeEffectType): string {
  if (effect === 'shimmer') return 'souq-badge-shimmer';
  if (effect === 'glow') return 'souq-badge-glow';
  if (effect === 'metallic_gold') return 'souq-badge-metallic';
  return '';
}

export interface BannedUserCloudRecord {
  userId: string;
  isBanned: boolean;
  bannedUntil: string | null;
  banReason: string | null;
  updatedAt: string;
}

export interface EffectiveBanState {
  isBanned: boolean;
  bannedUntil: string | null;
  banReason: string | null;
  expired: boolean;
}

export function resolveEffectiveBanState(
  profile?: {
    is_banned?: boolean | null;
    banned_until?: string | null;
    ban_reason?: string | null;
  } | null,
  cloudBan?: BannedUserCloudRecord | null,
  nowMs: number = Date.now()
): EffectiveBanState {
  let activeIsBanned = false;
  let bannedUntil: string | null = null;
  let banReason: string | null = null;

  if (cloudBan) {
    activeIsBanned = Boolean(cloudBan.isBanned);
    bannedUntil = cloudBan.bannedUntil || null;
    banReason = cloudBan.banReason || null;
  } else if (profile) {
    activeIsBanned = Boolean(profile.is_banned);
    bannedUntil = profile.banned_until || null;
    banReason = profile.ban_reason || null;
  }

  if (!activeIsBanned) {
    return { isBanned: false, bannedUntil: null, banReason: null, expired: false };
  }

  if (bannedUntil) {
    const expMs = Date.parse(bannedUntil);
    if (Number.isFinite(expMs) && expMs <= nowMs) {
      return { isBanned: false, bannedUntil: null, banReason: null, expired: true };
    }
  }

  return {
    isBanned: true,
    bannedUntil,
    banReason: banReason || 'مخالفة شروط الاستخدام',
    expired: false,
  };
}

export function formatRemainingBanTime(
  bannedUntil?: string | null,
  nowMs: number = Date.now()
): string {
  if (!bannedUntil) return 'حظر دائم حتى إشعار آخر';
  const expMs = Date.parse(bannedUntil);
  if (!Number.isFinite(expMs)) return 'حظر مؤقت';
  const diffSec = Math.max(0, Math.floor((expMs - nowMs) / 1000));
  if (diffSec === 0) return 'انتهت مدة الحظر';

  const days = Math.floor(diffSec / 86400);
  const hours = Math.floor((diffSec % 86400) / 3600);
  const mins = Math.floor((diffSec % 3600) / 60);
  const secs = diffSec % 60;

  const parts: string[] = [];
  if (days > 0) parts.push(`${days} يوم`);
  if (hours > 0) parts.push(`${hours} ساعة`);
  if (mins > 0) parts.push(`${mins} دقيقة`);
  if (days === 0) parts.push(`${secs} ثانية`);
  return parts.join(' و ');
}

export function resolveEffectiveUserTier(
  userId: string | null | undefined,
  isVerified: boolean,
  userTiers: Record<string, string>,
  wallet?: Pick<UserWalletRecord, 'tierId'> | null
): string | undefined {
  if (!userId || !isVerified) return undefined;
  return userTiers?.[userId] || wallet?.tierId || undefined;
}


