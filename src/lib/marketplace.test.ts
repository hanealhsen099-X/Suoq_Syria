import test from 'node:test';
import assert from 'node:assert/strict';
import {
  filterProducts,
  formatWhatsappUrl,
  formatDirectCallUrl,
  isValidSyrianNationalId,
  formatPriceWithCurrency,
  parseProductImages,
  serializeProductImages,
  formatTimeAgo,
  canApplyAsCourierInProvince,
  filterActiveCouriers,
  validateCourierApplicationInput,
  DEFAULT_COURIER_CONFIG,
  DEFAULT_MARKET_RULES,
  DEFAULT_WALLET_CONFIG,
  applyWelcomeBonusIfEligible,
  activateMerchantPlanForWallet,
  isUserVerificationActive,
  canAcceptNewMerchantSubscription,
  getUserPostingEntitlement,
  spendWalletPoints,
  buildExpiryInAppNotification,
  type CourierApplicationItem,
  type UserWalletRecord,
  ProductItem,
} from './marketplace';

const sampleProducts: ProductItem[] = [
  {
    id: '1',
    title: 'شقة للبيع في المزة',
    category: 'عقارات',
    sub_category: 'شقق للبيع',
    province: 'دمشق',
    location: 'المزة فيلات غربية',
    price: '750000000',
    whatsapp: '0912345678',
    created_at: new Date().toISOString(),
  },
  {
    id: '2',
    title: 'سيارة هيونداي أفانتي',
    category: 'السيارات والمركبات',
    sub_category: 'سيارات للبيع',
    province: 'حلب',
    location: 'الشهباء',
    price: '180000000',
    whatsapp: '0987654321',
    created_at: new Date().toISOString(),
  },
  {
    id: '3',
    title: 'منظومة طاقة شمسية 5 كيلو',
    category: 'الطاقة البديلة وأنظمة الطاقة',
    sub_category: 'ألواح الطاقة الشمسية',
    province: 'حمص',
    location: 'الوعر',
    price: '45000000',
    whatsapp: '963955112233',
    created_at: new Date().toISOString(),
  },
];

test('filterProducts filters by category correctly', () => {
  const result = filterProducts(sampleProducts, { category: 'عقارات' });
  assert.equal(result.length, 1);
  assert.equal(result[0].id, '1');

  // عندما يكون القسم 'الكل' يجب إرجاع جميع العناصر من مختلف الأقسام
  const allResult = filterProducts(sampleProducts, { category: 'الكل' });
  assert.equal(allResult.length, 3);
});

test('filterProducts filters by province correctly', () => {
  const result = filterProducts(sampleProducts, { province: 'حلب' });
  assert.equal(result.length, 1);
  assert.equal(result[0].title, 'سيارة هيونداي أفانتي');
});

test('filterProducts filters by search query matching location or title', () => {
  const resultTitle = filterProducts(sampleProducts, { searchQuery: 'طاقة' });
  assert.equal(resultTitle.length, 1);
  assert.equal(resultTitle[0].id, '3');

  const resultLoc = filterProducts(sampleProducts, { searchQuery: 'الشهباء' });
  assert.equal(resultLoc.length, 1);
  assert.equal(resultLoc[0].id, '2');
});

test('formatWhatsappUrl properly converts Syrian 09XX numbers to international wa.me format', () => {
  assert.equal(formatWhatsappUrl('0912345678'), 'https://wa.me/963912345678');
  assert.equal(formatWhatsappUrl('963912345678'), 'https://wa.me/963912345678');
  assert.equal(formatWhatsappUrl('00963912345678'), 'https://wa.me/963912345678');
});

test('formatDirectCallUrl formats telephone link correctly', () => {
  assert.equal(formatDirectCallUrl('0933112233'), 'tel:0933112233');
  assert.equal(formatDirectCallUrl('+963 933 112 233'), 'tel:+963933112233');
});

test('isValidSyrianNationalId correctly validates 11-digit national ID', () => {
  assert.equal(isValidSyrianNationalId('01010123456'), true);
  assert.equal(isValidSyrianNationalId('12345'), false);
  assert.equal(isValidSyrianNationalId('010101234567'), false);
});

test('formatPriceWithCurrency supports SYP, USD, and negotiable options', () => {
  const syp = formatPriceWithCurrency('1000000', 'SYP', false);
  assert.ok(syp.includes('ل.س'));

  const usd = formatPriceWithCurrency('5000', 'USD', false);
  assert.ok(usd.includes('$'));

  const neg = formatPriceWithCurrency('', 'SYP', true);
  assert.equal(neg, 'السعر قابل للتفاوض');

  const negWithPrice = formatPriceWithCurrency('250000', 'SYP', true);
  assert.ok(negWithPrice.includes('قابل للتفاوض'));
});

test('parseProductImages and serializeProductImages handle up to 3 images properly', () => {
  const single = parseProductImages('https://svshuexeayatbegxnmcf.supabase.co/storage/v1/object/public/product-images/img1.jpg');
  assert.deepEqual(single, ['https://svshuexeayatbegxnmcf.supabase.co/storage/v1/object/public/product-images/img1.jpg']);

  const jsonArr = serializeProductImages([
    'https://svshuexeayatbegxnmcf.supabase.co/storage/v1/object/public/product-images/img1.jpg',
    'https://svshuexeayatbegxnmcf.supabase.co/storage/v1/object/public/product-images/img2.jpg',
    'https://svshuexeayatbegxnmcf.supabase.co/storage/v1/object/public/product-images/img3.jpg',
  ]);
  const parsed = parseProductImages(jsonArr);
  assert.equal(parsed.length, 3);
  assert.equal(parsed[1], 'https://svshuexeayatbegxnmcf.supabase.co/storage/v1/object/public/product-images/img2.jpg');

  // Max 3 images constraint
  const overflow = serializeProductImages(['1', '2', '3', '4']);
  assert.equal(parseProductImages(overflow).length, 3);
});

test('formatTimeAgo gives friendly Arabic duration', () => {
  const justNow = formatTimeAgo(new Date().toISOString());
  assert.equal(justNow, 'الآن');
});

const sampleCourierApps: CourierApplicationItem[] = [
  {
    id: 'c1',
    userId: 'u1',
    fullName: 'أحمد العلي',
    nationalId: '01010123456',
    phone: '0911111111',
    province: 'دير الزور',
    vehicleSizeId: 'medium',
    vehicleNameModel: 'كيا سيراتو',
    idFrontPhotoUrl: 'front1',
    idBackPhotoUrl: 'back1',
    selfieWithIdPhotoUrl: 'selfie1',
    status: 'approved',
    isOnline: true,
    createdAt: '2026-01-01T00:00:00Z',
  },
  {
    id: 'c2',
    userId: 'u2',
    fullName: 'سامي الحسن',
    nationalId: '02020223456',
    phone: '0922222222',
    province: 'دير الزور',
    vehicleSizeId: 'van',
    vehicleNameModel: 'سوزوكي فان',
    idFrontPhotoUrl: 'front2',
    idBackPhotoUrl: 'back2',
    selfieWithIdPhotoUrl: 'selfie2',
    status: 'approved',
    isOnline: false,
    createdAt: '2026-01-01T00:00:00Z',
  },
  {
    id: 'c3',
    userId: 'u3',
    fullName: 'رامي محمد',
    nationalId: '03030323456',
    phone: '0933333333',
    province: 'دير الزور',
    vehicleSizeId: 'small',
    vehicleNameModel: 'دراجة نارية',
    idFrontPhotoUrl: 'front3',
    idBackPhotoUrl: 'back3',
    selfieWithIdPhotoUrl: 'selfie3',
    status: 'pending',
    isOnline: true,
    createdAt: '2026-01-01T00:00:00Z',
  },
];

test('canApplyAsCourierInProvince enforces per-province quota across approved couriers', () => {
  const cfg = {
    ...DEFAULT_COURIER_CONFIG,
    provinceQuotas: { 'دير الزور': 2, 'حلب': 50 },
  };
  const deirCheck = canApplyAsCourierInProvince(sampleCourierApps, cfg, 'دير الزور');
  assert.equal(deirCheck.allowed, false);
  assert.equal(deirCheck.approvedCount, 2);
  assert.equal(deirCheck.maxQuota, 2);

  const aleppoCheck = canApplyAsCourierInProvince(sampleCourierApps, cfg, 'حلب');
  assert.equal(aleppoCheck.allowed, true);
  assert.equal(aleppoCheck.approvedCount, 0);
});

test('filterActiveCouriers returns only approved and online couriers matching province/size', () => {
  const onlineOnly = filterActiveCouriers(sampleCourierApps);
  assert.equal(onlineOnly.length, 1);
  assert.equal(onlineOnly[0].id, 'c1');

  const sizeMismatch = filterActiveCouriers(sampleCourierApps, { vehicleSizeId: 'truck' });
  assert.equal(sizeMismatch.length, 0);
});

test('validateCourierApplicationInput requires 3 ID photos and allows optional vehicle photo', () => {
  const validWithoutVehiclePhoto = validateCourierApplicationInput(
    {
      fullName: 'طارق صالح',
      nationalId: '04040412345',
      phone: '0944556677',
      province: 'حلب',
      vehicleSizeId: 'medium',
      vehicleNameModel: 'كيا ريو 2014',
      idFrontPhotoUrl: 'https://cdn.example/front.jpg',
      idBackPhotoUrl: 'https://cdn.example/back.jpg',
      selfieWithIdPhotoUrl: 'https://cdn.example/selfie.jpg',
    },
    DEFAULT_COURIER_CONFIG
  );
  assert.equal(validWithoutVehiclePhoto.valid, true);

  const missingSelfie = validateCourierApplicationInput(
    {
      fullName: 'طارق صالح',
      nationalId: '04040412345',
      phone: '0944556677',
      province: 'حلب',
      vehicleSizeId: 'medium',
      vehicleNameModel: 'كيا ريو 2014',
      idFrontPhotoUrl: 'https://cdn.example/front.jpg',
      idBackPhotoUrl: 'https://cdn.example/back.jpg',
      selfieWithIdPhotoUrl: '',
    },
    DEFAULT_COURIER_CONFIG
  );
  assert.equal(missingSelfie.valid, false);
});

test('applyWelcomeBonusIfEligible grants bonus once and prevents duplicate national IDs', () => {
  const now = Date.parse('2026-06-01T12:00:00Z');
  const first = applyWelcomeBonusIfEligible(
    {},
    'u1',
    '01010123456',
    DEFAULT_WALLET_CONFIG,
    now
  );
  assert.equal(first.granted, true);
  assert.equal(first.pointsGranted, 15);
  assert.equal(first.updated.u1.points, 15);

  const secondSameUser = applyWelcomeBonusIfEligible(
    first.updated,
    'u1',
    '01010123456',
    DEFAULT_WALLET_CONFIG,
    now + 1000
  );
  assert.equal(secondSameUser.granted, false);

  const duplicateNationalId = applyWelcomeBonusIfEligible(
    first.updated,
    'u2',
    '01010123456',
    DEFAULT_WALLET_CONFIG,
    now + 2000
  );
  assert.equal(duplicateNationalId.granted, false);
});

test('activateMerchantPlanForWallet sets timed verification and enforces merchant quota', () => {
  const now = Date.parse('2026-06-01T00:00:00Z');
  const wallets: Record<string, UserWalletRecord> = {
    u1: {
      userId: 'u1',
      points: 100,
      starCreditsRemaining: 0,
      updatedAt: new Date(now).toISOString(),
      transactions: [],
    },
  };

  const activation = activateMerchantPlanForWallet(
    wallets,
    'u1',
    {
      id: 'merchant_1m',
      title: 'تاجر موثق شهري',
      durationDays: 30,
      tierId: 'golden_store',
      maxImagesPerAd: 6,
      maxDailyAds: 10,
      includedStarBoosts: 2,
    },
    60,
    'plan_purchase',
    now
  );

  assert.equal(activation.ok, true);
  assert.equal(activation.updated.u1.points, 40);
  assert.equal(activation.updated.u1.starCreditsRemaining, 2);

  // Active before expiry, expired after 31 days
  assert.equal(isUserVerificationActive(activation.updated.u1, true, now + 5 * 86400000).active, true);
  assert.equal(isUserVerificationActive(activation.updated.u1, true, now + 31 * 86400000).active, false);

  // Quota check: max 1 merchant allows u1 renewal but blocks u2
  const renewCheck = canAcceptNewMerchantSubscription(activation.updated, 1, 'u1', now);
  assert.equal(renewCheck.allowed, true);
  const newUserCheck = canAcceptNewMerchantSubscription(activation.updated, 1, 'u2', now);
  assert.equal(newUserCheck.allowed, false);
});

test('getUserPostingEntitlement distinguishes free launch vs paid mode & point deductions', () => {
  const now = Date.parse('2026-06-01T12:00:00Z');
  const todayProducts = [{ user_id: 'free_user', created_at: new Date(now - 3600_000).toISOString() }];

  // Free launch mode (walletConfig.enabled === false)
  const freeLaunch = getUserPostingEntitlement({
    walletConfig: { ...DEFAULT_WALLET_CONFIG, enabled: false },
    marketRules: DEFAULT_MARKET_RULES,
    wallet: undefined,
    isVerified: false,
    products: todayProducts,
    userId: 'free_user',
    nowMs: now,
  });
  assert.equal(freeLaunch.isPaidMode, false);
  assert.equal(freeLaunch.canPostNewAd, true);

  // Paid mode enabled: free user hit 1 daily ad limit
  const paidFreeUser = getUserPostingEntitlement({
    walletConfig: { ...DEFAULT_WALLET_CONFIG, enabled: true, freeMaxImagesPerAd: 1, freeMaxDailyAds: 1 },
    marketRules: DEFAULT_MARKET_RULES,
    wallet: undefined,
    isVerified: false,
    products: todayProducts,
    userId: 'free_user',
    nowMs: now,
  });
  assert.equal(paidFreeUser.isPaidMode, true);
  assert.equal(paidFreeUser.maxImagesAllowed, 1);
  assert.equal(paidFreeUser.canPostNewAd, false);

  const spendOk = spendWalletPoints(
    {
      free_user: {
        userId: 'free_user',
        points: 20,
        updatedAt: new Date(now).toISOString(),
        transactions: [],
      },
    },
    'free_user',
    15,
    'extra_ad',
    'فتح إعلان إضافي'
  );
  assert.equal(spendOk.ok, true);
  assert.equal(spendOk.updated.free_user.points, 5);
});

test('buildExpiryInAppNotification emits quiet bell reminder within 3 days of expiry', () => {
  const now = Date.parse('2026-06-01T00:00:00Z');
  const wallet2DaysLeft: UserWalletRecord = {
    userId: 'u1',
    points: 0,
    verifiedUntil: new Date(now + 2 * 86400000).toISOString(),
    updatedAt: new Date(now).toISOString(),
    transactions: [],
  };
  const wallet10DaysLeft: UserWalletRecord = {
    ...wallet2DaysLeft,
    verifiedUntil: new Date(now + 10 * 86400000).toISOString(),
  };

  const notifSoon = buildExpiryInAppNotification(wallet2DaysLeft, DEFAULT_WALLET_CONFIG, now);
  assert.ok(notifSoon !== null);
  assert.ok(notifSoon.message.includes('2 يوم'));

  const notifLater = buildExpiryInAppNotification(wallet10DaysLeft, DEFAULT_WALLET_CONFIG, now);
  assert.equal(notifLater, null);
});


