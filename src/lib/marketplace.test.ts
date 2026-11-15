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
  type CourierApplicationItem,
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

