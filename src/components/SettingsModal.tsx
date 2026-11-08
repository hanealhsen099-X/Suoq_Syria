/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import {
  Settings,
  X,
  Moon,
  Sun,
  Type,
  Trash2,
  ExternalLink,
  ArrowUpDown,
  Share2,
  CheckCircle2,
  HelpCircle,
  Check,
  MapPin,
  Clock,
  ShieldCheck,
} from 'lucide-react';

export type SortOrderOption = 'newest' | 'oldest' | 'price_asc' | 'price_desc';

interface SettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  darkMode: boolean;
  onToggleDarkMode: () => void;
  sortOrder: SortOrderOption;
  onChangeSortOrder: (order: SortOrderOption) => void;
  postFontScale: number;
  onChangePostFontScale: (scale: number) => void;
  onSelectSuggestion?: (suggestionTitle: string) => void;
  proposals?: NewSettingProposal[];
}

export interface NewSettingProposal {
  id: string;
  title: string;
  tag: string;
  icon?: React.ReactNode;
  description: string;
  benefits?: string;
}

export default function SettingsModal({
  isOpen,
  onClose,
  darkMode,
  onToggleDarkMode,
  sortOrder,
  onChangeSortOrder,
  postFontScale,
  onChangePostFontScale,
  onSelectSuggestion,
  proposals = [],
}: SettingsModalProps) {
  const [selectedSuggestions, setSelectedSuggestions] = useState<string[]>([]);
  const [copiedNotice, setCopiedNotice] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleToggleSuggestion = (item: NewSettingProposal) => {
    setSelectedSuggestions((prev) =>
      prev.includes(item.id) ? prev.filter((id) => id !== item.id) : [...prev, item.id]
    );
    onSelectSuggestion?.(item.title);
    setCopiedNotice(`تم اختيار: "${item.title}"`);
    setTimeout(() => setCopiedNotice(null), 2500);
  };

  const previewScale = (postFontScale || 100) / 100;

  const sortOptionsList: { value: SortOrderOption; label: string; desc: string }[] = [
    {
      value: 'newest',
      label: 'الأحدث أولاً (حسب تاريخ النشر)',
      desc: 'عرض أحدث الإعلانات المضافة مؤخراً في البداية',
    },
    {
      value: 'oldest',
      label: 'الأقدم أولاً',
      desc: 'عرض الإعلانات الأقدم تاريخاً',
    },
    {
      value: 'price_asc',
      label: 'الأقل سعراً أولاً',
      desc: 'ترتيب تصاعدي من أرخص المنتجات إلى أعلاها',
    },
    {
      value: 'price_desc',
      label: 'الأعلى سعراً أولاً',
      desc: 'ترتيب تنازلي من أعلى المنتجات سعراً إلى أقلها',
    },
  ];

  return (
    <div
      role="dialog"
      aria-modal="true"
      className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto"
      onClick={onClose}
    >
      <div
        className={`w-full max-w-md rounded-2xl shadow-2xl overflow-hidden border flex flex-col my-auto max-h-[90vh] animate-in fade-in zoom-in-95 duration-150 transition-colors ${
          darkMode
            ? 'bg-slate-900 border-slate-800 text-slate-100'
            : 'bg-white border-slate-100 text-slate-900'
        }`}
        onClick={(e) => e.stopPropagation()}
      >
        {/* رأس النافذة */}
        <div
          className={`flex items-center justify-between px-5 py-3.5 border-b transition-colors ${
            darkMode
              ? 'bg-slate-900/90 border-slate-800'
              : 'bg-slate-50/80 border-slate-100'
          }`}
        >
          <div className="flex items-center gap-2.5">
            <div
              className={`w-8 h-8 rounded-xl flex items-center justify-center ${
                darkMode ? 'bg-slate-800 text-emerald-400' : 'bg-slate-100 text-slate-700'
              }`}
            >
              <Settings className="w-4 h-4" />
            </div>
            <div>
              <h2 className="font-bold text-sm">إعدادات التطبيق</h2>
              <span
                className={`text-[10px] font-medium block ${
                  darkMode ? 'text-slate-400' : 'text-slate-500'
                }`}
              >
                تخصيص المظهر، خط المنشورات، وترتيب العرض
              </span>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className={`p-1.5 rounded-full transition-colors cursor-pointer ${
              darkMode
                ? 'hover:bg-slate-800 text-slate-400 hover:text-white'
                : 'hover:bg-slate-200 text-slate-400 hover:text-slate-600'
            }`}
            aria-label="إغلاق"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* محتوى الإعدادات */}
        <div className="p-4 overflow-y-auto space-y-4 text-right">
          
          {/* ============================================================ */}
          {/* 1. مفتاح الوضع الداكن */}
          {/* ============================================================ */}
          <div
            className={`p-3.5 rounded-xl border transition-all flex items-center justify-between ${
              darkMode
                ? 'bg-slate-800/80 border-slate-700'
                : 'bg-slate-50 border-slate-200'
            }`}
          >
            <div className="flex items-center gap-3">
              <div
                className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${
                  darkMode
                    ? 'bg-indigo-950 text-indigo-400 border border-indigo-800'
                    : 'bg-indigo-50 text-indigo-600 border border-indigo-100'
                }`}
              >
                {darkMode ? <Moon className="w-5 h-5" /> : <Sun className="w-5 h-5" />}
              </div>
              <div>
                <h3 className="font-bold text-xs leading-tight">
                  الوضع الداكن (Dark Mode)
                </h3>
                <p
                  className={`text-[11px] mt-0.5 leading-relaxed ${
                    darkMode ? 'text-slate-400' : 'text-slate-500'
                  }`}
                >
                  {darkMode
                    ? 'الوضع الداكن مفعّل حالياً (مريح للعينين).'
                    : 'الوضع الفاتح مفعّل حالياً. اضغط للتبديل للوضع الليلي.'}
                </p>
              </div>
            </div>

            {/* زر التبديل (Toggle Switch) */}
            <button
              type="button"
              onClick={onToggleDarkMode}
              className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
                darkMode ? 'bg-emerald-600' : 'bg-slate-300'
              }`}
              role="switch"
              aria-checked={darkMode}
              aria-label="تبديل الوضع الداكن"
            >
              <span
                className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow-md ring-0 transition duration-200 ease-in-out ${
                  darkMode ? '-translate-x-5' : 'translate-x-0'
                }`}
              />
            </button>
          </div>

          {/* ============================================================ */}
          {/* 2. تكبير خط نصوص المنشورات فقط مع شريط سحب ومعاينة فورية */}
          {/* ============================================================ */}
          <div
            className={`p-3.5 rounded-xl border space-y-3 transition-all ${
              darkMode
                ? 'bg-slate-800/80 border-slate-700'
                : 'bg-slate-50 border-slate-200'
            }`}
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div
                  className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 ${
                    darkMode
                      ? 'bg-purple-950 text-purple-400 border border-purple-800'
                      : 'bg-purple-50 text-purple-600 border border-purple-100'
                  }`}
                >
                  <Type className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="font-bold text-xs leading-tight">
                    تكبير خط نصوص المنشورات
                  </h3>
                  <span
                    className={`text-[10px] block mt-0.5 ${
                      darkMode ? 'text-slate-400' : 'text-slate-500'
                    }`}
                  >
                    ينطبق على نصوص المنشورات المعروضة
                  </span>
                </div>
              </div>

              <span className="px-2 py-0.5 rounded-lg bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 font-bold text-xs">
                {postFontScale}%
              </span>
            </div>

            {/* شريط التحكم بتكبير الخط */}
            <div className="space-y-1.5 pt-1">
              <input
                type="range"
                min="100"
                max="145"
                step="15"
                value={postFontScale}
                onChange={(e) => onChangePostFontScale(Number(e.target.value))}
                className="w-full accent-emerald-600 cursor-pointer h-2 bg-slate-200 dark:bg-slate-700 rounded-lg appearance-none"
                aria-label="تغيير حجم خط المنشورات"
              />
              <div className="flex justify-between text-[10px] text-slate-400 font-medium px-1">
                <span>عادي (100%)</span>
                <span>متوسط (115%)</span>
                <span>كبير (130%)</span>
                <span>كبير جداً (145%)</span>
              </div>
            </div>

            {/* صندوق المعاينة الفورية لخط نصوص الإعلانات */}
            <div
              className={`p-3 rounded-xl border space-y-1.5 transition-all text-right ${
                darkMode
                  ? 'bg-slate-900 border-slate-750'
                  : 'bg-white border-slate-200 shadow-2xs'
              }`}
            >
              <div className="flex items-center justify-between pb-1 border-b border-slate-100 dark:border-slate-800">
                <span className="text-[10px] font-bold text-emerald-600 dark:text-emerald-400 flex items-center gap-1">
                  <CheckCircle2 className="w-3 h-3" />
                  معاينة فورية لحجم خط المنشور:
                </span>
                <span className="text-[10px] text-slate-400">حجم الخط: {postFontScale}%</span>
              </div>

              {/* ترويسة البائع في المعاينة */}
              <div className="flex items-center justify-between pt-0.5">
                <div className="flex items-center gap-1.5">
                  <div className="w-5 h-5 rounded-full bg-emerald-100 text-emerald-800 flex items-center justify-center font-bold text-[9px]">
                    س
                  </div>
                  <span
                    style={{ fontSize: `${0.75 * previewScale}rem` }}
                    className="font-bold text-slate-900 dark:text-slate-100 flex items-center gap-1"
                  >
                    سامر الأحمد
                    <ShieldCheck className="w-3 h-3 text-emerald-500 inline" />
                  </span>
                </div>
                <div className="flex items-center gap-1.5 text-slate-400">
                  <span
                    style={{ fontSize: `${0.6875 * previewScale}rem` }}
                    className="flex items-center gap-0.5 text-slate-600 dark:text-slate-300 font-semibold"
                  >
                    <MapPin className="w-2.5 h-2.5 text-slate-400" />
                    دمشق
                  </span>
                  <span
                    style={{ fontSize: `${0.625 * previewScale}rem` }}
                    className="flex items-center gap-0.5 text-slate-400"
                  >
                    <Clock className="w-2.5 h-2.5" />
                    منذ ساعتين
                  </span>
                </div>
              </div>

              {/* عنوان وسعر المنشور في المعاينة */}
              <div className="flex items-center justify-between gap-2 pt-1">
                <h4
                  style={{ fontSize: `${0.875 * previewScale}rem` }}
                  className="font-bold text-slate-900 dark:text-slate-100 truncate flex-1"
                >
                  شقة مفروشة للإيجار في كفرسوسة طابق ثاني
                </h4>
                <span
                  style={{ fontSize: `${0.75 * previewScale}rem` }}
                  className="font-bold text-emerald-700 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/70 border border-emerald-100 dark:border-emerald-800 px-2 py-0.5 rounded-lg whitespace-nowrap"
                >
                  150,000 ل.س
                </span>
              </div>

              {/* وصف المنشور في المعاينة */}
              <p
                style={{ fontSize: `${0.75 * previewScale}rem` }}
                className="text-slate-600 dark:text-slate-300 leading-relaxed"
              >
                إطلالة ممتازة، طاقة شمسية كاملة، إنترنت سريع، قريبة من الخدمات والمواصلات.
              </p>

              {/* منطقة وتصنيف المنشور في المعاينة */}
              <div
                style={{ fontSize: `${0.6875 * previewScale}rem` }}
                className="text-slate-500 font-medium"
              >
                <span>المنطقة: </span>
                <span className="text-slate-700 dark:text-slate-200 font-semibold">كفرسوسة - ساحة الشام</span>
                <span className="text-slate-300 dark:text-slate-600 mx-1.5">•</span>
                <span className="text-slate-500 dark:text-slate-400">شقق للإيجار</span>
              </div>
            </div>
          </div>

          {/* ============================================================ */}
          {/* 3. فرز الإعلانات أو المنشورات حسب التاريخ أو السعر */}
          {/* ============================================================ */}
          <div
            className={`p-3.5 rounded-xl border space-y-2.5 transition-all ${
              darkMode
                ? 'bg-slate-800/80 border-slate-700'
                : 'bg-slate-50 border-slate-200'
            }`}
          >
            <div className="flex items-center gap-2.5">
              <div
                className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 ${
                  darkMode
                    ? 'bg-blue-950 text-blue-400 border border-blue-800'
                    : 'bg-blue-50 text-blue-600 border border-blue-100'
                }`}
              >
                <ArrowUpDown className="w-4 h-4" />
              </div>
              <div>
                <h3 className="font-bold text-xs leading-tight">
                  فرز الإعلانات والمنشورات
                </h3>
                <span
                  className={`text-[10px] block mt-0.5 ${
                    darkMode ? 'text-slate-400' : 'text-slate-500'
                  }`}
                >
                  حدد الترتيب المفضل لديك لعرض الإعلانات في الصفحة
                </span>
              </div>
            </div>

            {/* قائمة خيارات الفرز */}
            <div className="space-y-1.5 pt-1">
              {sortOptionsList.map((opt) => {
                const isSelected = sortOrder === opt.value;
                return (
                  <button
                    key={opt.value}
                    type="button"
                    onClick={() => onChangeSortOrder(opt.value)}
                    className={`w-full p-2.5 rounded-xl border text-right flex items-center justify-between transition-all cursor-pointer ${
                      isSelected
                        ? darkMode
                          ? 'bg-emerald-950/60 border-emerald-600 text-emerald-300 font-bold shadow-xs'
                          : 'bg-emerald-50 border-emerald-500 text-emerald-800 font-bold shadow-xs'
                        : darkMode
                        ? 'bg-slate-900/60 border-slate-750 text-slate-300 hover:border-slate-600'
                        : 'bg-white border-slate-200 text-slate-700 hover:border-slate-300'
                    }`}
                  >
                    <div>
                      <span className="text-xs block">{opt.label}</span>
                      <span
                        className={`text-[10px] font-normal block mt-0.5 ${
                          isSelected
                            ? darkMode
                              ? 'text-emerald-400'
                              : 'text-emerald-700'
                            : 'text-slate-400'
                        }`}
                      >
                        {opt.desc}
                      </span>
                    </div>

                    <div
                      className={`w-4 h-4 rounded-full border flex items-center justify-center shrink-0 ${
                        isSelected
                          ? 'border-emerald-600 bg-emerald-600 text-white'
                          : 'border-slate-300 dark:border-slate-600'
                      }`}
                    >
                      {isSelected && <Check className="w-3 h-3 stroke-[3]" />}
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          {/* تنبيه عند الضغط على مقترح */}
          {copiedNotice && (
            <div className="p-2.5 bg-slate-950 text-white rounded-xl text-xs font-semibold flex items-center justify-between animate-in fade-in border border-slate-800">
              <span className="flex items-center gap-1.5">
                <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                <span>{copiedNotice}</span>
              </span>
              <span className="text-[10px] text-slate-400">قل لي وسأضيفه فوراً</span>
            </div>
          )}

          {/* ============================================================ */}
          {/* 4. مقترحات إعدادات إضافية (تأتي من السحاب فقط إن وجدت) */}
          {/* ============================================================ */}
          {proposals && proposals.length > 0 && (
            <div className="space-y-2 pt-2">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-slate-500 dark:text-slate-400">
                  مقترحات إضافية
                </span>
                <span className="text-[10px] text-slate-400">
                  انقر على أي مقترح لتحديده
                </span>
              </div>

              <div className="space-y-2.5">
                {proposals.map((item) => {
                  const isSelected = selectedSuggestions.includes(item.id);
                  return (
                    <div
                      key={item.id}
                      onClick={() => handleToggleSuggestion(item)}
                      className={`p-3 rounded-xl border transition-all cursor-pointer ${
                        isSelected
                          ? darkMode
                            ? 'bg-emerald-950/40 border-emerald-500 ring-1 ring-emerald-500'
                            : 'bg-emerald-50/70 border-emerald-400 ring-1 ring-emerald-400'
                          : darkMode
                          ? 'bg-slate-800/40 border-slate-800 hover:border-slate-700'
                          : 'bg-white border-slate-200/80 hover:border-slate-300'
                      }`}
                    >
                      <div className="flex items-start justify-between gap-2 mb-1.5">
                        <div className="flex items-center gap-2">
                          {item.icon && (
                            <div
                              className={`w-7 h-7 rounded-lg flex items-center justify-center shrink-0 ${
                                darkMode ? 'bg-slate-850' : 'bg-slate-100'
                              }`}
                            >
                              {item.icon}
                            </div>
                          )}
                          <div>
                            <h4 className="font-bold text-xs leading-tight">
                              {item.title}
                            </h4>
                            {item.tag && (
                              <span className="text-[10px] text-emerald-600 dark:text-emerald-400 font-semibold">
                                {item.tag}
                              </span>
                            )}
                          </div>
                        </div>

                        <div
                          className={`w-4 h-4 rounded-full border flex items-center justify-center shrink-0 mt-0.5 ${
                            isSelected
                              ? 'border-emerald-600 bg-emerald-600 text-white'
                              : 'border-slate-300 dark:border-slate-600'
                          }`}
                        >
                          {isSelected && <Check className="w-2.5 h-2.5 stroke-[3]" />}
                        </div>
                      </div>

                      <p
                        className={`text-[11px] leading-relaxed mb-2 ${
                          darkMode ? 'text-slate-300' : 'text-slate-600'
                        }`}
                      >
                        {item.description}
                      </p>

                      {item.benefits && (
                        <div
                          className={`text-[10px] p-2 rounded-lg border leading-normal ${
                            darkMode
                              ? 'bg-slate-900/60 border-slate-800 text-slate-400'
                              : 'bg-slate-50 border-slate-100 text-slate-500'
                          }`}
                        >
                          💡 <span className="font-medium">{item.benefits}</span>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>

        {/* ذيل النافذة */}
        <div
          className={`p-3.5 border-t flex items-center justify-between transition-colors ${
            darkMode
              ? 'bg-slate-900/90 border-slate-800'
              : 'bg-slate-50/70 border-slate-100'
          }`}
        >
          <span
            className={`text-[11px] font-medium ${
              darkMode ? 'text-slate-400' : 'text-slate-500'
            }`}
          >
            حجم الخط: {postFontScale}% • الفرز: {
              sortOrder === 'newest' ? 'الأحدث' : sortOrder === 'oldest' ? 'الأقدم' : sortOrder === 'price_asc' ? 'الأقل سعراً' : 'الأعلى سعراً'
            }
          </span>
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-1.5 bg-emerald-600 hover:bg-emerald-700 active:scale-95 text-white text-xs font-bold rounded-xl transition-all cursor-pointer shadow-xs"
          >
            تم / إغلاق
          </button>
        </div>
      </div>
    </div>
  );
}
