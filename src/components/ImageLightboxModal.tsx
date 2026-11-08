import React, { useState, useEffect } from 'react';
import { X, ChevronLeft, ChevronRight, ZoomIn, ZoomOut } from 'lucide-react';

interface ImageLightboxModalProps {
  images: string[];
  initialIndex?: number;
  isOpen: boolean;
  onClose: () => void;
  title?: string;
}

export default function ImageLightboxModal({
  images,
  initialIndex = 0,
  isOpen,
  onClose,
  title,
}: ImageLightboxModalProps) {
  const [currentIndex, setCurrentIndex] = useState(initialIndex);
  const [isZoomed, setIsZoomed] = useState(false);

  useEffect(() => {
    setCurrentIndex(initialIndex);
    setIsZoomed(false);
  }, [initialIndex, isOpen]);

  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
      if (e.key === 'ArrowRight') handleNext();
      if (e.key === 'ArrowLeft') handlePrev();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, currentIndex, images.length]);

  if (!isOpen || images.length === 0) return null;

  const currentImage = images[currentIndex] || images[0];

  const handleNext = () => {
    setIsZoomed(false);
    setCurrentIndex((prev) => (prev + 1) % images.length);
  };

  const handlePrev = () => {
    setIsZoomed(false);
    setCurrentIndex((prev) => (prev - 1 + images.length) % images.length);
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      className="fixed inset-0 z-50 bg-black/90 backdrop-blur-md flex flex-col justify-between select-none animate-in fade-in duration-200"
      onClick={onClose}
    >
      {/* الشريط العلوي */}
      <div
        className="w-full flex items-center justify-between px-4 py-3 bg-gradient-to-b from-black/80 to-transparent z-10"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center gap-3 text-white">
          <span className="text-sm font-bold bg-white/20 px-2.5 py-1 rounded-full text-white">
            {currentIndex + 1} / {images.length}
          </span>
          {title && <span className="text-xs text-slate-200 truncate max-w-[200px] sm:max-w-md">{title}</span>}
        </div>

        <div className="flex items-center gap-2">
          {/* زر التكبير / التصغير */}
          <button
            type="button"
            onClick={() => setIsZoomed(!isZoomed)}
            className="p-2 rounded-full bg-white/10 hover:bg-white/20 text-white transition-colors cursor-pointer"
            title={isZoomed ? 'تصغير' : 'تكبير'}
            aria-label="تكبير أو تصغير"
          >
            {isZoomed ? <ZoomOut className="w-5 h-5" /> : <ZoomIn className="w-5 h-5" />}
          </button>

          {/* زر الإغلاق */}
          <button
            type="button"
            onClick={onClose}
            className="p-2 rounded-full bg-white/10 hover:bg-white/20 text-white transition-colors cursor-pointer"
            aria-label="إغلاق المعاينة"
          >
            <X className="w-5 h-5" />
          </button>
        </div>
      </div>

      {/* منطقة عرض الصورة الرئيسية */}
      <div
        className="flex-1 flex items-center justify-center relative p-2 overflow-hidden"
        onClick={(e) => {
          if (e.target === e.currentTarget) onClose();
        }}
      >
        {/* زر الصورة السابقة */}
        {images.length > 1 && (
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              handlePrev();
            }}
            className="absolute right-3 top-1/2 -translate-y-1/2 z-10 p-2.5 rounded-full bg-black/60 hover:bg-black/80 text-white transition-all cursor-pointer shadow-lg"
            aria-label="الصورة السابقة"
          >
            <ChevronRight className="w-6 h-6" />
          </button>
        )}

        {/* الصورة */}
        <div className="max-w-full max-h-[75vh] flex items-center justify-center transition-transform duration-200">
          <img
            src={currentImage}
            alt={title || `صورة ${currentIndex + 1}`}
            onClick={(e) => {
              e.stopPropagation();
              setIsZoomed(!isZoomed);
            }}
            className={`max-w-full max-h-[75vh] object-contain rounded-lg shadow-2xl transition-all duration-200 cursor-zoom-in ${
              isZoomed ? 'scale-150 cursor-zoom-out' : 'scale-100'
            }`}
          />
        </div>

        {/* زر الصورة التالية */}
        {images.length > 1 && (
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              handleNext();
            }}
            className="absolute left-3 top-1/2 -translate-y-1/2 z-10 p-2.5 rounded-full bg-black/60 hover:bg-black/80 text-white transition-all cursor-pointer shadow-lg"
            aria-label="الصورة التالية"
          >
            <ChevronLeft className="w-6 h-6" />
          </button>
        )}
      </div>

      {/* الشريط السفلي: مصغرات الصور (Thumbnails) */}
      {images.length > 1 && (
        <div
          className="w-full py-3 px-4 bg-gradient-to-t from-black/80 to-transparent flex items-center justify-center gap-2.5 z-10"
          onClick={(e) => e.stopPropagation()}
        >
          {images.map((img, idx) => (
            <button
              key={idx}
              type="button"
              onClick={() => {
                setIsZoomed(false);
                setCurrentIndex(idx);
              }}
              className={`w-14 h-14 rounded-lg overflow-hidden border-2 transition-all cursor-pointer shrink-0 ${
                currentIndex === idx
                  ? 'border-emerald-500 scale-105 shadow-md'
                  : 'border-white/30 opacity-60 hover:opacity-100'
              }`}
            >
              <img src={img} alt={`مصغر ${idx + 1}`} className="w-full h-full object-cover" />
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
