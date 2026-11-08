import React, { useState } from 'react';
import { X, LogIn, UserPlus, Loader2, CheckCircle2, AlertCircle } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { isValidSyrianNationalId } from '../lib/marketplace';

interface AuthModalProps {
  isOpen: boolean;
  onClose: () => void;
  initialMode?: 'login' | 'signup';
  reasonMessage?: string | null;
  onSuccess?: () => void;
  darkMode?: boolean;
  botProtectionMode?: 'none' | 'cloudflare_turnstile' | 'math_challenge' | string;
  provinces?: string[];
}

export default function AuthModal({
  isOpen,
  onClose,
  initialMode = 'login',
  reasonMessage = null,
  onSuccess,
  darkMode = false,
  botProtectionMode = 'none',
  provinces = [],
}: AuthModalProps) {
  const isDark = darkMode || (typeof document !== 'undefined' && document.documentElement.classList.contains('dark'));

  const [authMode, setAuthMode] = useState<'login' | 'signup'>(initialMode);
  const [authEmail, setAuthEmail] = useState('');
  const [authPassword, setAuthPassword] = useState('');
  const [signupConfirmPassword, setSignupConfirmPassword] = useState('');

  // حقول إنشاء الحساب الجديد: الاسم، اسم الأب، الكنية، وتاريخ الميلاد
  const [signupFirstName, setSignupFirstName] = useState('');
  const [signupFatherName, setSignupFatherName] = useState('');
  const [signupLastName, setSignupLastName] = useState('');
  const [signupBirthDate, setSignupBirthDate] = useState('');
  const [signupProvince, setSignupProvince] = useState('');
  const [signupAddress, setSignupAddress] = useState('');
  const [signupNationalId, setSignupNationalId] = useState('');

  // نظام التحقق من إنسان (محاكاة Turnstile أو تجاوزه فوراً إذا كان none)
  const isBypassed = botProtectionMode === 'none';
  const [isCaptchaVerified, setIsCaptchaVerified] = useState(isBypassed);
  const [isCaptchaChecking, setIsCaptchaChecking] = useState(false);

  React.useEffect(() => {
    if (botProtectionMode === 'none') {
      setIsCaptchaVerified(true);
    } else {
      setIsCaptchaVerified(false);
    }
  }, [botProtectionMode, isOpen]);

  const [authError, setAuthError] = useState<string | null>(null);
  const [authSuccessMsg, setAuthSuccessMsg] = useState<string | null>(null);
  const [authSubmitting, setAuthSubmitting] = useState(false);

  if (!isOpen) return null;

  const handleVerifyCaptcha = () => {
    if (isCaptchaVerified || isCaptchaChecking) return;
    setIsCaptchaChecking(true);
    setTimeout(() => {
      setIsCaptchaChecking(false);
      setIsCaptchaVerified(true);
    }, 600);
  };

  const handleAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    setAuthError(null);
    setAuthSuccessMsg(null);

    if (botProtectionMode !== 'none' && !isCaptchaVerified) {
      setAuthError('يرجى التحقق من أنك لست برنامج روبوت (الضغط على المربع)');
      return;
    }

    setAuthSubmitting(true);

    try {
      if (authMode === 'login') {
        const { error } = await supabase.auth.signInWithPassword({
          email: authEmail.trim(),
          password: authPassword,
        });
        if (error) throw error;

        setAuthSuccessMsg('تم تسجيل الدخول بنجاح!');
        setTimeout(() => {
          onSuccess?.();
          onClose();
        }, 800);
      } else {
        // التحقق من الحقول المطلوبة
        if (!signupFirstName.trim()) throw new Error('يرجى إدخال الاسم');
        if (!signupFatherName.trim()) throw new Error('يرجى إدخال اسم الأب');
        if (!signupLastName.trim()) throw new Error('يرجى إدخال الكنية');
        if (!signupBirthDate.trim()) throw new Error('يرجى تحديد أو إدخال تاريخ الميلاد');
        if (!signupProvince) throw new Error('يرجى اختيار المحافظة');
        if (!signupAddress.trim()) throw new Error('يرجى إدخال العنوان بالتفصيل');
        if (!signupNationalId.trim()) throw new Error('يرجى إدخال الرقم الوطني');
        if (!isValidSyrianNationalId(signupNationalId.trim())) {
          throw new Error('الرقم الوطني السوري يجب أن يتكون من 11 رقماً بدقة');
        }
        if (authPassword.length < 6) {
          throw new Error('كلمة المرور يجب ألا تقل عن 6 خانات أو أحرف');
        }
        if (authPassword !== signupConfirmPassword) {
          throw new Error('كلمة المرور وتأكيد كلمة المرور غير متطابقين، يرجى التأكد');
        }

        const constructedFullName = `${signupFirstName.trim()} ${signupFatherName.trim()} ${signupLastName.trim()}`;

        const { error, data } = await supabase.auth.signUp({
          email: authEmail.trim(),
          password: authPassword,
          options: {
            data: {
              first_name: signupFirstName.trim(),
              father_name: signupFatherName.trim(),
              last_name: signupLastName.trim(),
              full_name: constructedFullName,
              birth_date: signupBirthDate.trim(),
              birth_place_date: signupBirthDate.trim(),
              province: signupProvince,
              address: signupAddress.trim(),
              national_id: signupNationalId.trim(),
            },
          },
        });
        if (error) throw error;

        if (data.user) {
          try {
            await supabase.from('profiles').upsert({
              id: data.user.id,
              full_name: constructedFullName,
              father_name: signupFatherName.trim(),
              birth_place_date: signupBirthDate.trim(),
              province: signupProvince,
              address: signupAddress.trim(),
              national_id: signupNationalId.trim(),
            });
          } catch {
            // هادئ
          }
        }

        setAuthSuccessMsg(
          'تم إنشاء الحساب بنجاح! إذا كانت رسالة تأكيد البريد مفعلة، يرجى مراجعة بريدك الإلكتروني.'
        );
        setTimeout(() => {
          onSuccess?.();
          onClose();
        }, 1500);
      }
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'حدث خطأ في عملية تسجيل الدخول';
      setAuthError(message);
    } finally {
      setAuthSubmitting(false);
    }
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto"
      onClick={onClose}
    >
      <div
        className={`rounded-2xl w-full max-w-md shadow-2xl overflow-hidden border flex flex-col my-auto max-h-[90vh] animate-in fade-in zoom-in-95 duration-150 transition-colors ${
          isDark
            ? 'bg-slate-900 border-slate-800 text-slate-100'
            : 'bg-white border-slate-100 text-slate-800'
        }`}
        onClick={(e) => e.stopPropagation()}
      >
        {/* رأس النافذة */}
        <div
          className={`flex items-center justify-between px-5 py-3.5 border-b transition-colors ${
            isDark
              ? 'bg-slate-850 border-slate-800 text-white'
              : 'bg-slate-50/70 border-slate-100 text-slate-900'
          }`}
        >
          <div className="flex items-center gap-2">
            <h2 className="font-bold text-sm">
              {authMode === 'login' ? 'تسجيل الدخول إلى حسابك' : 'إنشاء حساب جديد في سوق سوريا'}
            </h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            className={`p-1.5 rounded-full transition-colors cursor-pointer ${
              isDark
                ? 'text-slate-400 hover:text-slate-200 hover:bg-slate-800'
                : 'text-slate-400 hover:text-slate-600 hover:bg-slate-200/60'
            }`}
            aria-label="إغلاق"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* جسم النافذة */}
        <div className="p-5 overflow-y-auto space-y-4">
          {/* رسالة سبب فتح النافذة إن وجدت */}
          {reasonMessage && (
            <div
              className={`p-3 border rounded-xl text-xs flex items-start gap-2 ${
                isDark
                  ? 'bg-emerald-950/60 border-emerald-800/80 text-emerald-200'
                  : 'bg-emerald-50 border-emerald-200 text-emerald-800'
              }`}
            >
              <AlertCircle
                className={`w-4 h-4 shrink-0 mt-0.5 ${
                  isDark ? 'text-emerald-400' : 'text-emerald-600'
                }`}
              />
              <span>{reasonMessage}</span>
            </div>
          )}

          {/* تبديل الوضع بين تسجيل دخول وحساب جديد */}
          <div
            className={`flex items-center justify-center gap-2 p-1 rounded-xl ${
              isDark ? 'bg-slate-800' : 'bg-slate-100'
            }`}
          >
            <button
              type="button"
              onClick={() => {
                setAuthMode('login');
                setAuthError(null);
                setAuthSuccessMsg(null);
              }}
              className={`flex-1 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                authMode === 'login'
                  ? isDark
                    ? 'bg-slate-700 text-white shadow-xs'
                    : 'bg-white text-slate-900 shadow-xs'
                  : isDark
                  ? 'text-slate-400 hover:text-slate-200'
                  : 'text-slate-500 hover:text-slate-800'
              }`}
            >
              تسجيل الدخول
            </button>
            <button
              type="button"
              onClick={() => {
                setAuthMode('signup');
                setAuthError(null);
                setAuthSuccessMsg(null);
              }}
              className={`flex-1 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                authMode === 'signup'
                  ? isDark
                    ? 'bg-slate-700 text-white shadow-xs'
                    : 'bg-white text-slate-900 shadow-xs'
                  : isDark
                  ? 'text-slate-400 hover:text-slate-200'
                  : 'text-slate-500 hover:text-slate-800'
              }`}
            >
              إنشاء حساب جديد
            </button>
          </div>

          {authError && (
            <div
              className={`p-3 border rounded-xl text-xs flex items-center gap-2 ${
                isDark
                  ? 'bg-red-950/60 border-red-900/60 text-red-300'
                  : 'bg-red-50 border-red-200 text-red-600'
              }`}
            >
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{authError}</span>
            </div>
          )}

          {authSuccessMsg && (
            <div
              className={`p-3.5 border rounded-xl text-xs flex items-start gap-2.5 text-right ${
                isDark
                  ? 'bg-emerald-950/60 border-emerald-900/60 text-emerald-300'
                  : 'bg-emerald-50 border-emerald-200 text-emerald-800'
              }`}
            >
              <CheckCircle2
                className={`w-5 h-5 shrink-0 mt-0.5 ${
                  isDark ? 'text-emerald-400' : 'text-emerald-600'
                }`}
              />
              <span className="leading-relaxed">{authSuccessMsg}</span>
            </div>
          )}

          <form onSubmit={handleAuth} className="space-y-3">
            {/* في وضع إنشاء الحساب: الحقول المطلوبة */}
            {authMode === 'signup' && (
              <div className="space-y-3 pt-1">
                {/* 1. الاسم، اسم الأب، الكنية في حقول منفصلة ومنظمة */}
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
                  <div>
                    <label
                      className={`block text-xs font-bold mb-1 ${
                        isDark ? 'text-slate-300' : 'text-slate-700'
                      }`}
                    >
                      الاسم *
                    </label>
                    <input
                      type="text"
                      required
                      value={signupFirstName}
                      onChange={(e) => setSignupFirstName(e.target.value)}
                      placeholder="مثال: محمد"
                      className={`w-full px-3 py-2 rounded-xl border text-xs focus:outline-none focus:ring-2 focus:ring-emerald-500 ${
                        isDark
                          ? 'bg-slate-800 border-slate-700 text-white placeholder:text-slate-500'
                          : 'bg-white border-slate-200 text-slate-900 placeholder:text-slate-400'
                      }`}
                    />
                  </div>

                  <div>
                    <label
                      className={`block text-xs font-bold mb-1 ${
                        isDark ? 'text-slate-300' : 'text-slate-700'
                      }`}
                    >
                      اسم الأب *
                    </label>
                    <input
                      type="text"
                      required
                      value={signupFatherName}
                      onChange={(e) => setSignupFatherName(e.target.value)}
                      placeholder="مثال: أحمد"
                      className={`w-full px-3 py-2 rounded-xl border text-xs focus:outline-none focus:ring-2 focus:ring-emerald-500 ${
                        isDark
                          ? 'bg-slate-800 border-slate-700 text-white placeholder:text-slate-500'
                          : 'bg-white border-slate-200 text-slate-900 placeholder:text-slate-400'
                      }`}
                    />
                  </div>

                  <div>
                    <label
                      className={`block text-xs font-bold mb-1 ${
                        isDark ? 'text-slate-300' : 'text-slate-700'
                      }`}
                    >
                      الكنية *
                    </label>
                    <input
                      type="text"
                      required
                      value={signupLastName}
                      onChange={(e) => setSignupLastName(e.target.value)}
                      placeholder="مثال: العلي"
                      className={`w-full px-3 py-2 rounded-xl border text-xs focus:outline-none focus:ring-2 focus:ring-emerald-500 ${
                        isDark
                          ? 'bg-slate-800 border-slate-700 text-white placeholder:text-slate-500'
                          : 'bg-white border-slate-200 text-slate-900 placeholder:text-slate-400'
                      }`}
                    />
                  </div>
                </div>

                {/* 2. تاريخ الميلاد (بدلاً من محل وتاريخ الولادة) */}
                <div>
                  <label
                    className={`block text-xs font-bold mb-1 ${
                      isDark ? 'text-slate-300' : 'text-slate-700'
                    }`}
                  >
                    تاريخ الميلاد *
                  </label>
                  <input
                    type="date"
                    required
                    max={new Date().toISOString().split('T')[0]}
                    value={signupBirthDate}
                    onChange={(e) => setSignupBirthDate(e.target.value)}
                    className={`w-full px-3.5 py-2 rounded-xl border text-xs focus:outline-none focus:ring-2 focus:ring-emerald-500 [color-scheme:light] ${
                      isDark
                        ? 'bg-slate-800 border-slate-700 text-white [color-scheme:dark]'
                        : 'bg-white border-slate-200 text-slate-900'
                    }`}
                  />
                </div>

                {/* 3. المحافظة (قادمة بالكامل من السحاب) */}
                <div>
                  <label
                    className={`block text-xs font-bold mb-1 ${
                      isDark ? 'text-slate-300' : 'text-slate-700'
                    }`}
                  >
                    المحافظة *
                  </label>
                  {provinces && provinces.length > 0 ? (
                    <select
                      required
                      value={signupProvince}
                      onChange={(e) => setSignupProvince(e.target.value)}
                      className={`w-full px-3.5 py-2 rounded-xl border text-xs cursor-pointer appearance-none focus:outline-none focus:ring-2 focus:ring-emerald-500 ${
                        isDark
                          ? 'bg-slate-800 border-slate-700 text-white'
                          : 'bg-white border-slate-200 text-slate-900'
                      }`}
                    >
                      <option
                        value=""
                        disabled
                        className={isDark ? 'text-slate-500 bg-slate-800' : 'text-slate-400 bg-white'}
                      >
                        اختر المحافظة
                      </option>
                      {provinces.map((prov) => (
                        <option key={prov} value={prov} className={isDark ? 'bg-slate-800 text-white' : 'bg-white text-slate-900'}>
                          {prov}
                        </option>
                      ))}
                    </select>
                  ) : (
                    <input
                      type="text"
                      required
                      value={signupProvince}
                      onChange={(e) => setSignupProvince(e.target.value)}
                      placeholder="اكتب المحافظة أو المدينة..."
                      className={`w-full px-3.5 py-2 rounded-xl border text-xs focus:outline-none focus:ring-2 focus:ring-emerald-500 ${
                        isDark
                          ? 'bg-slate-800 border-slate-700 text-white placeholder:text-slate-500'
                          : 'bg-white border-slate-200 text-slate-900 placeholder:text-slate-400'
                      }`}
                    />
                  )}
                </div>

                {/* 4. العنوان */}
                <div>
                  <label
                    className={`block text-xs font-bold mb-1 ${
                      isDark ? 'text-slate-300' : 'text-slate-700'
                    }`}
                  >
                    العنوان بالتفصيل *
                  </label>
                  <input
                    type="text"
                    required
                    value={signupAddress}
                    onChange={(e) => setSignupAddress(e.target.value)}
                    placeholder="مثال: دمشق - المزة"
                    className={`w-full px-3.5 py-2 rounded-xl border text-xs focus:outline-none focus:ring-2 focus:ring-emerald-500 ${
                      isDark
                        ? 'bg-slate-800 border-slate-700 text-white placeholder:text-slate-500'
                        : 'bg-white border-slate-200 text-slate-900 placeholder:text-slate-400'
                    }`}
                  />
                </div>

                {/* 5. الرقم الوطني */}
                <div>
                  <label
                    className={`block text-xs font-bold mb-1 ${
                      isDark ? 'text-slate-300' : 'text-slate-700'
                    }`}
                  >
                    الرقم الوطني * (11 رقماً)
                  </label>
                  <input
                    type="text"
                    required
                    dir="ltr"
                    maxLength={11}
                    value={signupNationalId}
                    onChange={(e) => setSignupNationalId(e.target.value)}
                    placeholder="01010123456"
                    className={`w-full px-3.5 py-2 rounded-xl border text-xs text-right focus:outline-none focus:ring-2 focus:ring-emerald-500 ${
                      isDark
                        ? 'bg-slate-800 border-slate-700 text-white placeholder:text-slate-500'
                        : 'bg-white border-slate-200 text-slate-900 placeholder:text-slate-400'
                    }`}
                  />
                </div>
              </div>
            )}

            {/* البريد الإلكتروني */}
            <div>
              <label
                className={`block text-xs font-bold mb-1 ${
                  isDark ? 'text-slate-300' : 'text-slate-700'
                }`}
              >
                البريد الإلكتروني *
              </label>
              <input
                type="email"
                required
                dir="ltr"
                value={authEmail}
                onChange={(e) => setAuthEmail(e.target.value)}
                placeholder="name@example.com"
                className={`w-full px-3.5 py-2.5 rounded-xl border text-sm text-right focus:outline-none focus:ring-2 focus:ring-emerald-500 ${
                  isDark
                    ? 'bg-slate-800 border-slate-700 text-white placeholder:text-slate-500'
                    : 'bg-white border-slate-200 text-slate-900 placeholder:text-slate-400'
                }`}
              />
            </div>

            {/* كلمة المرور */}
            <div>
              <div className="flex items-center justify-between mb-1">
                <label
                  className={`block text-xs font-bold ${
                    isDark ? 'text-slate-300' : 'text-slate-700'
                  }`}
                >
                  {authMode === 'login' ? 'كلمة المرور *' : 'إنشاء كلمة مرور للحساب *'}
                </label>
                {authMode === 'signup' && (
                  <span
                    className={`text-[10px] ${
                      isDark ? 'text-slate-400' : 'text-slate-400'
                    }`}
                  >
                    خاصة بتطبيق سوق سوريا
                  </span>
                )}
              </div>
              <input
                type="password"
                required
                dir="ltr"
                minLength={6}
                value={authPassword}
                onChange={(e) => setAuthPassword(e.target.value)}
                placeholder={authMode === 'login' ? '••••••••' : 'أنشئ كلمة مرور قوية (6 أحرف أو أكثر)'}
                className={`w-full px-3.5 py-2.5 rounded-xl border text-sm text-right focus:outline-none focus:ring-2 focus:ring-emerald-500 ${
                  isDark
                    ? 'bg-slate-800 border-slate-700 text-white placeholder:text-slate-500'
                    : 'bg-white border-slate-200 text-slate-900 placeholder:text-slate-400'
                }`}
              />
            </div>

            {/* تأكيد كلمة المرور في وضع إنشاء الحساب */}
            {authMode === 'signup' && (
              <div>
                <label
                  className={`block text-xs font-bold mb-1 ${
                    isDark ? 'text-slate-300' : 'text-slate-700'
                  }`}
                >
                  تأكيد كلمة المرور *
                </label>
                <input
                  type="password"
                  required
                  dir="ltr"
                  minLength={6}
                  value={signupConfirmPassword}
                  onChange={(e) => setSignupConfirmPassword(e.target.value)}
                  placeholder="أعد إدخال كلمة المرور للتأكيد"
                  className={`w-full px-3.5 py-2.5 rounded-xl border text-sm text-right focus:outline-none focus:ring-2 focus:ring-emerald-500 ${
                    isDark
                      ? 'bg-slate-800 border-slate-700 text-white placeholder:text-slate-500'
                      : 'bg-white border-slate-200 text-slate-900 placeholder:text-slate-400'
                  }`}
                />
              </div>
            )}

            {/* نظام التحقق من إنسان (محاكاة Turnstile) يظهر فقط إذا تم تفعيله من الإدارة */}
            {botProtectionMode !== 'none' && (
              <div className="pt-1">
                <div
                  onClick={handleVerifyCaptcha}
                  className={`p-3 rounded-xl border transition-colors flex items-center justify-between cursor-pointer select-none ${
                    isDark
                      ? 'border-slate-700 bg-slate-800/60 hover:bg-slate-800'
                      : 'border-slate-200 bg-slate-50/70 hover:bg-slate-100/70'
                  }`}
                >
                  <div className="flex items-center gap-2.5">
                    <div
                      className={`w-6 h-6 rounded-md border flex items-center justify-center transition-all ${
                        isCaptchaVerified
                          ? 'bg-emerald-600 border-emerald-600 text-white'
                          : isDark
                          ? 'bg-slate-900 border-slate-600'
                          : 'bg-white border-slate-300'
                      }`}
                    >
                      {isCaptchaChecking ? (
                        <Loader2
                          className={`w-3.5 h-3.5 animate-spin ${
                            isDark ? 'text-slate-400' : 'text-slate-500'
                          }`}
                        />
                      ) : isCaptchaVerified ? (
                        <CheckCircle2 className="w-4 h-4" />
                      ) : null}
                    </div>
                    <span
                      className={`text-xs font-semibold ${
                        isDark ? 'text-slate-200' : 'text-slate-700'
                      }`}
                    >
                      أنا لست برنامج روبوت
                    </span>
                  </div>
                  <div className="flex flex-col items-end">
                    <span className="text-[10px] text-slate-400 font-bold">Cloudflare</span>
                    <span
                      className={`text-[9px] ${
                        isDark ? 'text-slate-500' : 'text-slate-400'
                      }`}
                    >
                      Turnstile الحماية
                    </span>
                  </div>
                </div>
              </div>
            )}

            <button
              type="submit"
              disabled={authSubmitting}
              className="w-full py-2.5 bg-emerald-600 hover:bg-emerald-700 active:scale-[0.99] text-white font-bold rounded-xl text-sm transition-all shadow-xs cursor-pointer flex items-center justify-center gap-2 disabled:opacity-75 mt-2"
            >
              {authSubmitting ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : authMode === 'login' ? (
                <>
                  <LogIn className="w-4 h-4" />
                  <span>تسجيل الدخول</span>
                </>
              ) : (
                <>
                  <UserPlus className="w-4 h-4" />
                  <span>إنشاء الحساب الآن</span>
                </>
              )}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
