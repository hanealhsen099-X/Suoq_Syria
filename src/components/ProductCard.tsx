import React from 'react';
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
} from 'lucide-react';
import {
  ProductItem,
  parseProductImages,
  formatPriceWithCurrency,
  formatWhatsappUrl,
  formatDirectCallUrl,
  formatTimeAgo,
} from '../lib/marketplace';

interface ProductCardProps {
  item: ProductItem;
  isFavorite: boolean;
  onToggleFavorite: (id: string) => void;
  onOpenLightbox: (images: string[], index: number, title: string) => void;
  onShare: (item: ProductItem) => void;
  fontScale?: number;
  isFeatured?: boolean; // خاصية تمييز الإعلان القادمة من الإدارة
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

  return (
    <article
      className={`rounded-2xl bg-white dark:bg-slate-900 border ${
        isFeatured
          ? 'border-amber-400 ring-2 ring-amber-400/20 dark:border-amber-500/80 shadow-md'
          : 'border-slate-200/90 dark:border-slate-800 shadow-2xs'
      } text-right overflow-hidden transition-all duration-200 hover:shadow-xs flex flex-col justify-between h-full relative`}
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
                {item.seller_name || 'بائع موثق'}
              </span>
              <span title="حساب موثق بالرقم الوطني" className="inline-flex">
                <ShieldCheck className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400 shrink-0" />
              </span>
            </div>
            <span
              style={{ fontSize: `${0.625 * scale}rem` }}
              className="text-slate-400 font-medium"
            >
              سوق سوريا
            </span>
          </div>
        </div>

        {/* شارة إعلان مميز VIP إن وجد */}
        {isFeatured && (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-gradient-to-r from-amber-400 to-amber-500 text-slate-950 font-black text-[10px] shadow-xs">
            <Star className="w-3 h-3 fill-slate-950 text-slate-950" />
            <span>مميز VIP</span>
          </span>
        )}

        {/* في اليسار: المحافظة وتوقيت النشر */}
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
            className="flex items-center gap-1 text-slate-400 font-medium mt-0.5"
          >
            <Clock className="w-3 h-3 text-slate-400" />
            <span>{formatTimeAgo(item.created_at)}</span>
          </span>
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
    </article>
  );
}
