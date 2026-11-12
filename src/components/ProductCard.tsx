import { useState } from 'react';
import {
  Heart,
  Share2,
  MessageCircle,
  Phone,
  MapPin,
  Clock,
  ShieldCheck,
  ZoomIn,
  User,
  Star,
  MoreVertical,
  Flag,
  Download,
  Copy,
  Check,
  CheckCircle2,
  X,
} from 'lucide-react';
import {
  ProductItem,
  parseProductImages,
  formatPriceWithCurrency,
  formatWhatsappUrl,
  formatDirectCallUrl,
  formatTimeAgo,
} from '../lib/marketplace';
import { supabase } from '../lib/supabase';

interface ProductCardProps {
  item: ProductItem;
  isFavorite: boolean;
  onToggleFavorite: (id: string) => void;
  onOpenLightbox: (images: string[], index: number, title: string) => void;
  onShare: (item: ProductItem) => void;
  fontScale?: number;
  isFeatured?: boolean;
}

export default function ProductCard({
  item,
  isFavorite,
  onToggleFavorite,
  onOpenLightbox,
  onShare,
  fontScale = 100,
  isFeatured = false,
}: ProductCardProps) {
  const images = parseProductImages(item.image_url);
  const scale = (fontScale || 100) / 100;

  // حالة قائمة الخيارات الثلاثية والنقاط
  const [showMenu, setShowMenu] = useState(false);
  const [showReportModal, setShowReportModal] = useState(false);
  const [reportReason, setReportReason] = useState('إعلان مضلل أو غير دقيق');
  const [reportDetails, setReportDetails] = useState('');
  const [isSubmittingReport, setIsSubmittingReport] = useState(false);
  const [reportSuccess, setReportSuccess] = useState(false);
  const [copiedLink, setCopiedLink] = useState(false);

  // إرسال البلاغ مباشرة لسحابة سوبابيس ليظهر في قسم البلاغات لدى الإدارة
  const handleSubmitReport = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmittingReport(true);
    try {
      await supabase.from('reports').insert({
        product_id: item.id,
        product_title: item.title,
        reporter_name: 'مستخدم التطبيق',
        reason: reportReason,
        details: reportDetails.trim() || null,
        status: 'pending',
      });
      setReportSuccess(true);
      setTimeout(() => {
        setShowReportModal(false);
        setReportSuccess(false);
        setReportDetails('');
      }, 2000);
    } catch {
      alert('حدث خطأ أثناء إرسال البلاغ، يرجى المحاولة لاحقاً');
    } finally {
      setIsSubmittingReport(false);
    }
  };

  // حفظ / تنزيل الصورة
  const handleSaveImage = () => {
    setShowMenu(false);
    if (images.length > 0) {
      const link = document.createElement('a');
      link.href = images[0];
      link.download = `souq_syria_${item.id}.jpg`;
      link.target = '_blank';
      link.rel = 'noopener noreferrer';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    } else {
      alert('لا توجد صورة لهذا الإعلان لحفظها');
    }
  };

  // نسخ تفاصيل الإعلان
  const handleCopyDetails = async () => {
    setShowMenu(false);
    const textToCopy = `${item.title}\nالسعر: ${item.price ? formatPriceWithCurrency(item.price) : 'حسب الاتفاق'}\nالمحافظة: ${item.province}\n${item.description || ''}`;
    try {
      await navigator.clipboard.writeText(textToCopy);
      setCopiedLink(true);
      setTimeout(() => setCopiedLink(false), 2500);
    } catch {
      // Fallback
    }
  };

  return (
    <article
      className={`rounded-2xl bg-white dark:bg-slate-900 border ${
        isFeatured
          ? 'border-amber-400 ring-2 ring-amber-400/20 dark:border-amber-500/80'
          : 'border-slate-200/90 dark:border-slate-800'
      } shadow-2xs text-right overflow-hidden transition-all duration-200 hover:shadow-xs flex flex-col relative`}
    >

      {/* 1. رأس الإعلان: معلومات البائع، المحافظة، والوقت */}
      <header className="p-3.5 pb-2.5 flex items-center justify-between border-b border-slate-100/80 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/40">
        {/* في اليمين: معلومات البائع وشارة التوثيق */}
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-full bg-emerald-100 dark:bg-emerald-950 text-emerald-800 dark:text-emerald-300 flex items-center justify-center font-bold text-xs shrink-0 ring-1 ring-emerald-200 dark:ring-emerald-800">
            {item.seller_name ? (
              item.seller_name.trim().charAt(0)
            ) : (
              <User className="w-4 h-4 text-emerald-700" />
            )}
          </div>
          <div className="flex flex-col text-right">
            <div className="flex items-center gap-1">
              <span
                style={{ fontSize: `${0.75 * scale}rem` }}
                className="font-bold text-slate-900 dark:text-slate-100 leading-tight"
              >
                {item.seller_name || 'مستخدم سوق سوريا'}
              </span>
              {item.seller_verified === true && (
                <span
                  title="حساب موثق رسمياً من الإدارة"
                  className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-md bg-amber-50 dark:bg-amber-950/70 border border-amber-300 dark:border-amber-600/80 text-amber-700 dark:text-amber-400 font-black text-[10px] shadow-2xs"
                >
                  <CheckCircle2 className="w-3 h-3 text-amber-500 fill-amber-400 shrink-0" />
                  <span>موثق</span>
                </span>
              )}
            </div>
            <span
              style={{ fontSize: `${0.625 * scale}rem` }}
              className="text-slate-400 font-medium"
            >
              سوق سوريا
            </span>
          </div>
        </div>

        {/* شارة إعلان مميز إن وجد */}
        {isFeatured && (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-gradient-to-r from-amber-400 to-amber-500 text-slate-950 font-black text-[10px] shadow-2xs">
            <Star className="w-2.5 h-2.5 fill-slate-950 text-slate-950" />
            <span>مميز VIP</span>
          </span>
        )}

        {/* في اليسار: المحافظة وتوقيت النشر وزر القائمة (3 نقاط) */}
        <div className="flex items-center gap-2">
          <div className="flex flex-col items-end text-left">
            <span
              style={{ fontSize: `${0.6875 * scale}rem` }}
              className="flex items-center gap-1 font-semibold text-slate-700 dark:text-slate-300"
            >
              <MapPin className="w-3 h-3 text-slate-400 shrink-0" />
              <span>{item.province}</span>
            </span>
            <span
              style={{ fontSize: `${0.625 * scale}rem` }}
              className="flex items-center gap-1 text-slate-400"
            >
              <Clock className="w-2.5 h-2.5 text-slate-400" />
              <span>{formatTimeAgo(item.created_at)}</span>
            </span>
          </div>

          {/* زر النقاط الثلاث ... مع القائمة المنبثقة */}
          <div className="relative">
            <button
              type="button"
              onClick={() => setShowMenu(!showMenu)}
              className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-200/60 dark:hover:bg-slate-700/60 transition-colors"
              title="خيارات إضافية"
              aria-label="خيارات المنشور"
            >
              <MoreVertical className="w-4 h-4" />
            </button>

            {showMenu && (
              <>
                <div
                  className="fixed inset-0 z-40"
                  onClick={() => setShowMenu(false)}
                />
                <div className="absolute left-0 top-8 z-50 w-44 rounded-xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 shadow-xl py-1 text-xs text-right animate-in fade-in-50 zoom-in-95">
                  <button
                    type="button"
                    onClick={() => {
                      setShowMenu(false);
                      setShowReportModal(true);
                    }}
                    className="w-full px-3 py-2 text-right flex items-center gap-2 text-rose-600 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/30 font-medium transition-colors"
                  >
                    <Flag className="w-3.5 h-3.5 shrink-0" />
                    <span>إبلاغ عن المنشور</span>
                  </button>

                  {images.length > 0 && (
                    <button
                      type="button"
                      onClick={handleSaveImage}
                      className="w-full px-3 py-2 text-right flex items-center gap-2 text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700/50 font-medium transition-colors"
                    >
                      <Download className="w-3.5 h-3.5 shrink-0" />
                      <span>حفظ أول صورة</span>
                    </button>
                  )}

                  <button
                    type="button"
                    onClick={handleCopyDetails}
                    className="w-full px-3 py-2 text-right flex items-center gap-2 text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700/50 font-medium transition-colors"
                  >
                    {copiedLink ? (
                      <Check className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                    ) : (
                      <Copy className="w-3.5 h-3.5 shrink-0" />
                    )}
                    <span>{copiedLink ? 'تم نسخ التفاصيل' : 'نسخ تفاصيل الإعلان'}</span>
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      </header>

      {/* 2. جسم الإعلان: العنوان، السعر، والوصف */}
      <div className="p-3.5 pb-2 space-y-2">
        <div className="flex items-start justify-between gap-2">
          <h3
            style={{ fontSize: `${0.875 * scale}rem` }}
            className="font-bold text-slate-900 dark:text-slate-100 leading-snug flex-1"
          >
            {item.title}
          </h3>
          {item.price && (
            <span
              style={{ fontSize: `${0.75 * scale}rem` }}
              className="font-bold text-emerald-700 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/70 border border-emerald-100 dark:border-emerald-800 px-2 py-0.5 rounded-lg whitespace-nowrap shrink-0"
            >
              {formatPriceWithCurrency(item.price)}
            </span>
          )}
        </div>

        {item.description && (
          <p
            style={{ fontSize: `${0.75 * scale}rem` }}
            className="text-slate-600 dark:text-slate-300 leading-relaxed line-clamp-2"
          >
            {item.description}
          </p>
        )}

        <div
          style={{ fontSize: `${0.6875 * scale}rem` }}
          className="text-slate-500 font-medium"
        >
          <span>المنطقة: </span>
          <span className="text-slate-700 dark:text-slate-200 font-semibold">{item.location}</span>
          <span className="text-slate-300 dark:text-slate-600 mx-1.5">•</span>
          <span className="text-slate-500 dark:text-slate-400">{item.sub_category}</span>
        </div>
      </div>

      {/* 3. صور الإعلان (حتى 3 صور تظهر مدمجة مثل فيسبوك مع إمكانية التكبير) */}
      {images.length > 0 && (
        <div className="px-3.5 pb-2">
          {images.length === 1 && (
            <div
              onClick={() => onOpenLightbox(images, 0, item.title)}
              className="relative w-full aspect-video rounded-xl overflow-hidden bg-slate-100 cursor-pointer group shadow-2xs border border-slate-100"
            >
              <img
                src={images[0]}
                alt={item.title}
                className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-102"
                loading="lazy"
              />
              <div className="absolute inset-0 bg-black/10 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center pointer-events-none">
                <span className="p-2 bg-black/60 text-white rounded-full">
                  <ZoomIn className="w-5 h-5" />
                </span>
              </div>
            </div>
          )}

          {images.length === 2 && (
            <div className="grid grid-cols-2 gap-1.5 aspect-video w-full rounded-xl overflow-hidden bg-slate-100 border border-slate-100 shadow-2xs">
              {images.map((imgUrl, index) => (
                <div
                  key={index}
                  onClick={() => onOpenLightbox(images, index, item.title)}
                  className="relative w-full h-full overflow-hidden cursor-pointer group"
                >
                  <img
                    src={imgUrl}
                    alt={`${item.title} - ${index + 1}`}
                    className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-103"
                    loading="lazy"
                  />
                  <div className="absolute inset-0 bg-black/15 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center pointer-events-none">
                    <ZoomIn className="w-4 h-4 text-white drop-shadow" />
                  </div>
                </div>
              ))}
            </div>
          )}

          {images.length === 3 && (
            <div className="grid grid-cols-3 gap-1.5 aspect-video w-full rounded-xl overflow-hidden bg-slate-100 border border-slate-100 shadow-2xs">
              {/* الصورة الأولى كبيرة تأخذ عمودين */}
              <div
                onClick={() => onOpenLightbox(images, 0, item.title)}
                className="col-span-2 relative h-full overflow-hidden cursor-pointer group"
              >
                <img
                  src={images[0]}
                  alt={`${item.title} - 1`}
                  className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-103"
                  loading="lazy"
                />
                <div className="absolute inset-0 bg-black/15 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center pointer-events-none">
                  <ZoomIn className="w-5 h-5 text-white drop-shadow" />
                </div>
              </div>

              {/* الصورتان الثانية والثالثة مكدستان على الجانب */}
              <div className="col-span-1 grid grid-rows-2 gap-1.5 h-full">
                {images.slice(1, 3).map((imgUrl, idx) => {
                  const actualIdx = idx + 1;
                  return (
                    <div
                      key={actualIdx}
                      onClick={() => onOpenLightbox(images, actualIdx, item.title)}
                      className="relative w-full h-full overflow-hidden cursor-pointer group"
                    >
                      <img
                        src={imgUrl}
                        alt={`${item.title} - ${actualIdx + 1}`}
                        className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-103"
                        loading="lazy"
                      />
                      <div className="absolute inset-0 bg-black/15 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center pointer-events-none">
                        <ZoomIn className="w-4 h-4 text-white drop-shadow" />
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      )}

      {/* 4. أزرار التواصل المباشر (واتساب + اتصال خلوي) */}
      <div className="px-3.5 py-2 flex items-center gap-2 border-t border-slate-100 bg-slate-50/40">
        {item.whatsapp && (
          <a
            href={formatWhatsappUrl(item.whatsapp)}
            target="_blank"
            rel="noopener noreferrer"
            className="flex-1 flex items-center justify-center gap-1.5 py-1.5 px-3 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs shadow-2xs transition-all active:scale-95"
          >
            <MessageCircle className="w-3.5 h-3.5" />
            <span>تواصل واتساب</span>
          </a>
        )}

        {item.whatsapp && (
          <a
            href={formatDirectCallUrl(item.whatsapp)}
            className="flex items-center justify-center gap-1.5 py-1.5 px-3 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 font-bold text-xs border border-slate-200 dark:border-slate-700 transition-all active:scale-95"
            title="اتصال هاتفي مباشر"
          >
            <Phone className="w-3.5 h-3.5" />
            <span>اتصال</span>
          </a>
        )}
      </div>

      {/* 5. الشريط التفاعلي أسفل الإعلان */}
      <footer className="px-3.5 py-2 flex items-center justify-between border-t border-slate-100 dark:border-slate-800 bg-white dark:bg-slate-900">
        {/* في اليمين: زر القلب التفاعلي مع انتقال سلس ولون أحمر */}
        <button
          type="button"
          onClick={() => onToggleFavorite(item.id)}
          className="flex items-center gap-1.5 py-1 px-2.5 rounded-xl hover:bg-red-50 dark:hover:bg-red-950/30 text-slate-500 dark:text-slate-400 transition-all cursor-pointer group active:scale-90"
          aria-label="إعجاب بالإعلان"
        >
          <Heart
            className={`w-5 h-5 transition-all duration-300 transform ${
              isFavorite
                ? 'fill-red-500 text-red-500 scale-110 drop-shadow-2xs animate-in zoom-in-110'
                : 'text-slate-400 group-hover:text-red-500 group-hover:scale-110'
            }`}
          />
          <span
            className={`text-xs font-bold transition-colors ${
              isFavorite ? 'text-red-500' : 'text-slate-500 dark:text-slate-400 group-hover:text-red-500'
            }`}
          >
            {isFavorite ? 'معجب به' : 'إعجاب'}
          </span>
          <span
            className={`text-[11px] font-bold px-1.5 py-0.2 rounded-md ${
              isFavorite
                ? 'bg-red-50 dark:bg-red-950/60 text-red-600 dark:text-red-400'
                : 'bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400 group-hover:text-red-500'
            }`}
          >
            {(item.likes_count || 0).toLocaleString('ar-SY')}
          </span>
        </button>

        {/* في اليسار: زر مشاركة المنشور */}
        <button
          type="button"
          onClick={() => onShare(item)}
          className="flex items-center gap-1.5 py-1 px-2.5 rounded-xl text-slate-500 dark:text-slate-400 hover:text-emerald-700 dark:hover:text-emerald-400 hover:bg-emerald-50 dark:hover:bg-emerald-950/30 transition-all cursor-pointer active:scale-95"
          aria-label="مشاركة المنشور"
        >
          <Share2 className="w-4 h-4 text-slate-400 group-hover:text-emerald-600 dark:group-hover:text-emerald-400 transition-colors" />
          <span className="text-xs font-bold">مشاركة المنشور</span>
        </button>
      </footer>

      {/* نافذة الإبلاغ عن المنشور (متصلة مباشرة بجدول reports في سوبابيس وقسم البلاغات والأمان في الإدارة) */}
      {showReportModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-in fade-in">
          <div
            className="w-full max-w-sm rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-2xl p-5 text-right space-y-4"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3">
              <div className="flex items-center gap-2 text-rose-600">
                <Flag className="w-5 h-5" />
                <h3 className="font-bold text-sm text-slate-900 dark:text-white">إبلاغ عن هذا الإعلان</h3>
              </div>
              <button
                type="button"
                onClick={() => setShowReportModal(false)}
                className="p-1 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {reportSuccess ? (
              <div className="py-6 text-center space-y-2">
                <div className="w-12 h-12 bg-emerald-100 dark:bg-emerald-950/60 text-emerald-600 rounded-full flex items-center justify-center mx-auto">
                  <Check className="w-6 h-6" />
                </div>
                <h4 className="font-bold text-slate-900 dark:text-white text-sm">تم إرسال بلاغك بنجاح</h4>
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  سيقوم فريق إدارة سوق سوريا بمراجعة المنشور فوراً واتخاذ الإجراء اللازم.
                </p>
              </div>
            ) : (
              <form onSubmit={handleSubmitReport} className="space-y-3.5">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                    سبب البلاغ:
                  </label>
                  <select
                    value={reportReason}
                    onChange={(e) => setReportReason(e.target.value)}
                    className="w-full text-xs rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 px-3 py-2 text-slate-800 dark:text-slate-200 focus:outline-hidden focus:ring-2 focus:ring-rose-500"
                  >
                    <option value="إعلان مضلل أو غير دقيق">إعلان مضلل أو غير دقيق</option>
                    <option value="احتيال أو نصب مالي">احتيال أو نصب مالي</option>
                    <option value="محتوى مسيء أو غير لائق">محتوى مسيء أو غير لائق</option>
                    <option value="سلعة ممنوعة قانونياً">سلعة ممنوعة قانونياً</option>
                    <option value="تكرار ونشر عشوائي (Spam)">تكرار ونشر عشوائي (Spam)</option>
                    <option value="سبب آخر">سبب آخر</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                    تفاصيل إضافية (اختياري):
                  </label>
                  <textarea
                    rows={3}
                    value={reportDetails}
                    onChange={(e) => setReportDetails(e.target.value)}
                    placeholder="اكتب توضيحاً مختصراً للإدارة..."
                    className="w-full text-xs rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 p-2.5 text-slate-800 dark:text-slate-200 focus:outline-hidden focus:ring-2 focus:ring-rose-500 resize-none"
                  />
                </div>

                <div className="flex items-center gap-2 pt-1">
                  <button
                    type="submit"
                    disabled={isSubmittingReport}
                    className="flex-1 py-2 px-3 rounded-xl bg-rose-600 hover:bg-rose-700 text-white font-bold text-xs transition-colors disabled:opacity-50"
                  >
                    {isSubmittingReport ? 'جاري الإرسال...' : 'إرسال البلاغ'}
                  </button>
                  <button
                    type="button"
                    onClick={() => setShowReportModal(false)}
                    className="py-2 px-3 rounded-xl border border-slate-300 dark:border-slate-700 text-slate-700 dark:text-slate-300 text-xs font-bold hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
                  >
                    إلغاء
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      )}
    </article>
  );
}
