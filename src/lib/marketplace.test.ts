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
