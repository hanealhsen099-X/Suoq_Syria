import React, { useState } from 'react';
import {
  X,
  LogIn,
  UserPlus,
  Loader2,
  CheckCircle2,
  AlertCircle,
  Eye,
  EyeOff,
  KeyRound,
  ArrowRight,
  ShieldCheck,
} from 'lucide-react';
import { supabase } from '../lib/supabase';
import { isValidSyrianNationalId } from '../lib/marketplace';

const SYRIAN_PROVINCES = [
  'دمشق',
  'ريف دمشق',
  'حلب',
  'حمص',
  'حماة',
  'اللاذقية',
  'طرطوس',
  'إدلب',
  'درعا',
  'السويداء',
  'القنيطرة',
  'دير الزور',
  'الرقة',
  'الحسكة',
];

interface FieldConfigItem {
  id: string;
  name: string;
  label: string;
  visible: boolean;
  required: boolean;
  type?: string;
  options?: string[];
  placeholder?: string;
  isCustom?: boolean;
}

interface AuthModalProps {
  isOpen: boolean;
  onClose: () => void;
  initialMode?: 'login' | 'signup' | 'forgot_password';
  reasonMessage?: string | null;
  onSuccess?: () => void;
  darkMode?: boolean;
  botProtectionMode?: 'none' | 'cloudflare_turnstile' | 'math_challenge' | string;
  provincesData?: string[];
  provinces?: string[];
  fieldsConfig?: {
    signupFields?: FieldConfigItem[];
    postProductFields?: FieldConfigItem[];
  } | null;
}

// دالة لترجمة كافة أخطاء المصادقة من الإنجليزية إلى لغة عربية ودية وواضحة
const translateAuthError = (errMessage: string): string => {
  if (!errMessage) return 'حدث خطأ في عملية تسجيل الدخول';
  const lower = errMessage.toLowerCase();

  if (
    lower.includes('email logins are disabled') ||
    lower.includes('provider is disabled') ||
    lower.includes('logins are disabled')
  ) {
    return 'تسجيل الدخول بالبريد الإلكتروني معطل حالياً في إعدادات السحابة. يرجى تفعيله من لوحة Supabase (Authentication -> Providers -> Email -> Enable).';
  }
  if (
    lower.includes('invalid login credentials') ||
    lower.includes('invalid credentials') ||
    lower.includes('invalid username or password')
  ) {
    return 'البريد الإلكتروني أو كلمة المرور غير صحيحة، يرجى التأكد وإعادة المحاولة.';
  }
  if (lower.includes('email not confirmed')) {
    return 'يرجى تأكيد بريدك الإلكتروني من خلال الرابط المرسل إلى بريدك أولاً.';
  }
  if (
    lower.includes('user already registered') ||
    lower.includes('already exists') ||
    lower.includes('unique constraint')
  ) {
    return 'هذا البريد الإلكتروني مسجل مسبقاً، يمكنك تسجيل الدخول به مباشرة أو استعادة كلمة المرور.';
  }
  if (lower.includes('password should be at least')) {
    return 'يجب ألا تقل كلمة المرور عن 6 خانات أو أحرف.';
  }
  if (lower.includes('rate limit') || lower.includes('too many requests')) {
    return 'تم إرسال عدة محاولات متتالية، يرجى الانتظار دقيقة واحدة ثم المحاولة مجدداً.';
  }

  return errMessage;
};

export default function AuthModal({
  isOpen,
  onClose,
  initialMode = 'login',
  reasonMessage = null,
  onSuccess,
  darkMode = false,
  botProtectionMode = 'none',
  provincesData = [],
  provinces = [],
  fieldsConfig = null,
}: AuthModalProps) {
  const isDark =
    darkMode || (typeof document !== 'undefined' && document.documentElement.classList.contains('dark'));
  const effectiveProvinces = provinces && provinces.length > 0 ? provinces : provincesData;
  const provincesList =
    effectiveProvinces && effectiveProvinces.length > 0 ? effectiveProvinces : SYRIAN_PROVINCES;

  const [authMode, setAuthMode] = useState<'login' | 'signup' | 'forgot_password'>(initialMode);
  const [authEmail, setAuthEmail] = useState('');
  const [authPassword, setAuthPassword] = useState('');
  const [signupConfirmPassword, setSignupConfirmPassword] = useState('');

  // إظهار / إخفاء كلمة المرور بأيقونة العين
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  // حقول إنشاء الحساب الجديد
  const [signupFirstName, setSignupFirstName] = useState('');
  const [signupFatherName, setSignupFatherName] = useState('');
  const [signupLastName, setSignupLastName] = useState('');
  const [signupBirthDate, setSignupBirthDate] = useState('');
  const [signupProvince, setSignupProvince] = useState('');
  const [signupAddress, setSignupAddress] = useState('');
  const [signupNationalId, setSignupNationalId] = useState('');

  // قيم الحقول المخصصة التي يضيفها المدير من لوحة الإدارة
  const [customFieldValues, setCustomFieldValues] = useState<Record<string, string>>({});

  // حقول استعادة كلمة المرور
  const [recoveryEmail, setRecoveryEmail] = useState('');
  const [recoveryNationalId, setRecoveryNationalId] = useState('');
  const [recoverySuccess, setRecoverySuccess] = useState(false);

  // نظام التحقق من إنسان
  const isBypassed = botProtectionMode === 'none';
  const [isCaptchaVerified, setIsCaptchaVerified] = useState(isBypassed);
  const [isCaptchaChecking, setIsCaptchaChecking] = useState(false);
  const [mathAnswer, setMathAnswer] = useState('');

  React.useEffect(() => {
    if (botProtectionMode === 'none') {
      setIsCaptchaVerified(true);
    } else {
      setIsCaptchaVerified(false);
    }
  }, [botProtectionMode, isOpen]);

  // حالة شاشة الدخول التلقائي مع مؤقت 5 ثوانٍ
  const [isAutoLoggingIn, setIsAutoLoggingIn] = useState(false);
  const [countdown, setCountdown] = useState(5);

  // استرجاع البريد وكلمة السر المحفوظة لتعبئتها تلقائياً
  React.useEffect(() => {
    try {
      const saved = localStorage.getItem('souq_syria_saved_credentials');
      if (saved) {
        const parsed = JSON.parse(saved);
        if (parsed.email && !authEmail) setAuthEmail(parsed.email);
        if (parsed.password && !authPassword) setAuthPassword(parsed.password);
      }
    } catch {}
  }, []);

  // مؤقت العد التنازلي التلقائي (5 ثوانٍ)
  React.useEffect(() => {
    let timer: NodeJS.Timeout;
    if (isAutoLoggingIn && countdown > 0) {
      timer = setTimeout(() => {
        setCountdown((prev) => prev - 1);
      }, 1000);
    } else if (isAutoLoggingIn && countdown === 0) {
      onSuccess?.();
      onClose();
    }
    return () => clearTimeout(timer);
  }, [isAutoLoggingIn, countdown, onClose, onSuccess]);

  const [authError, setAuthError] = useState<string | null>(null);
  const [authSuccessMsg, setAuthSuccessMsg] = useState<string | null>(null);
  const [authSubmitting, setAuthSubmitting] = useState(false);

  if (!isOpen) return null;

  // فحص إعدادات الحقول القادمة من الإدارة
  const signupFieldsList = fieldsConfig?.signupFields;
  const isFieldVisible = (fieldName: string, defaultVisible = true) => {
    if (!signupFieldsList || signupFieldsList.length === 0) return defaultVisible;
    const f = signupFieldsList.find((item) => item.name === fieldName || item.id === fieldName);
    return f ? f.visible !== false : defaultVisible;
  };
  const isFieldRequired = (fieldName: string, defaultRequired = true) => {
    if (!signupFieldsList || signupFieldsList.length === 0) return defaultRequired;
    const f = signupFieldsList.find((item) => item.name === fieldName || item.id === fieldName);
    return f ? Boolean(f.required) : defaultRequired;
  };
  const customFieldsToRender = (signupFieldsList || []).filter(
    (f) =>
      f.isCustom &&
      f.visible !== false &&
      ![
        'full_name',
        'father_name',
        'mother_name',
        'birth_place_date',
        'province',
        'address',
        'national_id',
      ].includes(f.name)
  );

  const handleVerifyCaptcha = () => {
    if (isCaptchaVerified || isCaptchaChecking) return;
    setIsCaptchaChecking(true);
    setTimeout(() => {
      setIsCaptchaChecking(false);
      setIsCaptchaVerified(true);
    }, 600);
  };

  // معالجة استعادة كلمة المرور عبر مطابقة البريد والرقم الوطني
  const handleForgotPasswordSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setAuthError(null);
    setAuthSuccessMsg(null);

    const cleanEmail = recoveryEmail.trim().toLowerCase();
    const cleanId = recoveryNationalId.trim();

    if (!cleanEmail) {
      setAuthError('يرجى إدخال البريد الإلكتروني الخاص بحسابك');
      return;
    }
    if (!cleanId || cleanId.length !== 11) {
      setAuthError('الرقم الوطني السوري يجب أن يتكون من 11 رقماً بدقة');
      return;
    }

    setAuthSubmitting(true);
    try {
      // 1. التحقق من مطابقة البريد والرقم الوطني في جدول profiles
      const { data: profileMatch, error: matchError } = await supabase
        .from('profiles')
        .select('id, email, national_id, full_name')
        .eq('email', cleanEmail)
        .eq('national_id', cleanId)
        .maybeSingle();

      if (matchError || !profileMatch) {
        throw new Error(
          'بيانات الاستعادة غير متطابقة! لم يتم العثور على حساب مسجل يجمع هذا البريد الإلكتروني مع هذا الرقم الوطني معاً. تأكد من إدخال نفس الرقم الوطني المسجل عند إنشاء الحساب.'
        );
      }

      // 2. إرسال رابط إعادة تعيين كلمة المرور رسمياً إلى بريد المستخدم
      const { error: resetError } = await supabase.auth.resetPasswordForEmail(cleanEmail, {
        redirectTo: window.location.origin,
      });

      if (resetError) {
        throw resetError;
      }

      setRecoverySuccess(true);
      setAuthSuccessMsg(
        `تم التحقق من مطابقة هويتك ورقمك الوطني بنجاح للمستخدم (${profileMatch.full_name || 'سوق سوريا'})! تم إرسال رابط تعيين كلمة مرور جديدة إلى بريدك الإلكتروني (${cleanEmail}). تفقد صندوق الوارد أو البريد غير الهام (Spam).`
      );
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'فشلت عملية استعادة الحساب';
      setAuthError(translateAuthError(msg));
    } finally {
      setAuthSubmitting(false);
    }
  };

  const handleAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    setAuthError(null);
    setAuthSuccessMsg(null);

    if (!isCaptchaVerified) {
      setAuthError('يرجى إكمال التحقق الأمني أولاً');
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

        // حفظ بيانات الدخول لتعبئتها تلقائياً
        try {
          localStorage.setItem(
            'souq_syria_saved_credentials',
            JSON.stringify({
              email: authEmail.trim(),
              password: authPassword,
            })
          );
        } catch {}

        setAuthSuccessMsg('تم تسجيل الدخول بنجاح!');
        setTimeout(() => {
          onSuccess?.();
          onClose();
        }, 700);
      } else {
        // التحقق الديناميكي من حقول التسجيل المفعلة من لوحة الإدارة
        if (isFieldVisible('full_name') && isFieldRequired('full_name')) {
          if (!signupFirstName.trim()) throw new Error('يرجى إدخال الاسم الأول');
          if (!signupLastName.trim()) throw new Error('يرجى إدخال الكنية');
        }

        if (isFieldVisible('father_name') && isFieldRequired('father_name')) {
          if (!signupFatherName.trim()) throw new Error('يرجى إدخال اسم الأب');
        }

        if (isFieldVisible('birth_place_date') && isFieldRequired('birth_place_date')) {
          if (!signupBirthDate.trim()) throw new Error('يرجى تحديد تاريخ الميلاد');
        }

        if (isFieldVisible('province') && isFieldRequired('province')) {
          if (!signupProvince) throw new Error('يرجى اختيار المحافظة');
        }

        if (isFieldVisible('address') && isFieldRequired('address')) {
          if (!signupAddress.trim()) throw new Error('يرجى إدخال العنوان بالتفصيل');
        }

        if (isFieldVisible('national_id') && isFieldRequired('national_id')) {
          if (!signupNationalId.trim()) throw new Error('يرجى إدخال الرقم الوطني');
          if (!isValidSyrianNationalId(signupNationalId.trim())) {
            throw new Error('الرقم الوطني السوري يجب أن يتكون من 11 رقماً بدقة');
          }
        }

        // فحص الحقول المخصصة الإلزامية
        for (const cf of customFieldsToRender) {
          if (cf.required && !customFieldValues[cf.name]?.trim()) {
            throw new Error(`يرجى إدخال الحقل الإلزامي: ${cf.label}`);
          }
        }

        if (authPassword.length < 6) {
          throw new Error('كلمة المرور يجب ألا تقل عن 6 خانات أو أحرف');
        }
        if (authPassword !== signupConfirmPassword) {
          throw new Error('كلمة المرور وتأكيد كلمة المرور غير متطابقين، يرجى التأكد');
        }

        const constructedFullName = [signupFirstName.trim(), signupFatherName.trim(), signupLastName.trim()]
          .filter(Boolean)
          .join(' ');

        const { error, data } = await supabase.auth.signUp({
          email: authEmail.trim(),
          password: authPassword,
          options: {
            data: {
              first_name: signupFirstName.trim(),
              father_name: signupFatherName.trim(),
              last_name: signupLastName.trim(),
              full_name: constructedFullName || authEmail.split('@')[0],
              birth_date: signupBirthDate.trim(),
              birth_place_date: signupBirthDate.trim(),
              province: signupProvince,
              address: signupAddress.trim(),
              national_id: signupNationalId.trim(),
              custom_fields: customFieldValues,
            },
          },
        });
        if (error) throw error;

        if (data.user) {
          try {
            await supabase.from('profiles').upsert({
              id: data.user.id,
              email: authEmail.trim(),
              full_name: constructedFullName || authEmail.split('@')[0],
              father_name: signupFatherName.trim(),
              birth_place_date: signupBirthDate.trim(),
              province: signupProvince,
              address: signupAddress.trim(),
              national_id: signupNationalId.trim(),
            });
          } catch {}
        }

        try {
          localStorage.setItem(
            'souq_syria_saved_credentials',
            JSON.stringify({
              email: authEmail.trim(),
              password: authPassword,
            })
          );
        } catch {}

        let activeSession = !!data.session;
        if (!activeSession) {
          try {
            const { data: signInData } = await supabase.auth.signInWithPassword({
              email: authEmail.trim(),
              password: authPassword,
            });
            if (signInData?.session) {
              activeSession = true;
            }
          } catch {}
        }

        if (activeSession) {
          setIsAutoLoggingIn(true);
          setCountdown(5);
        } else {
          setAuthMode('login');
          setAuthSuccessMsg(
            'تم إنشاء الحساب بنجاح! تم وضع بريدك الإلكتروني وكلمة المرور تلقائياً. اضغط الآن على زر "تسجيل الدخول".'
          );
        }
      }
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'حدث خطأ في عملية تسجيل الدخول';
      setAuthError(translateAuthError(message));
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
              {authMode === 'login'
                ? 'تسجيل الدخول إلى حسابك'
                : authMode === 'signup'
                ? 'إنشاء حساب جديد في سوق سوريا'
                : 'استعادة كلمة المرور عبر الهوية'}
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

        {/* جسم النافذة: إما شاشة العد التنازلي التلقائي (5 ثوانٍ) أو نموذج الدخول/التسجيل */}
        {isAutoLoggingIn ? (
          <div className="p-6 text-center space-y-5 animate-in fade-in zoom-in-95">
            <div className="w-16 h-16 rounded-2xl bg-emerald-100 dark:bg-emerald-950/70 text-emerald-600 dark:text-emerald-400 flex items-center justify-center mx-auto shadow-inner ring-4 ring-emerald-500/20">
              <CheckCircle2 className="w-10 h-10 animate-bounce" />
            </div>

            <div className="space-y-1.5">
              <h3 className="text-base font-black text-slate-900 dark:text-white">
                تم إنشاء حسابك بنجاح!
              </h3>
              <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed font-medium">
                أهلاً بك في سوق سوريا! جاري تسجيل دخولك تلقائياً والبدء بالتصفح...
              </p>
            </div>

            <div className="space-y-2.5 bg-slate-50 dark:bg-slate-800/60 p-3.5 rounded-xl border border-slate-200/80 dark:border-slate-700/60">
              <div className="flex items-center justify-between text-xs font-bold text-slate-700 dark:text-slate-200">
                <span className="flex items-center gap-1.5">
                  <Loader2 className="w-3.5 h-3.5 text-emerald-600 animate-spin" />
                  <span>جاري تسجيل الدخول...</span>
                </span>
                <span className="px-2 py-0.5 rounded-lg bg-emerald-600 text-white text-xs font-black">
                  {countdown} ثوانٍ
                </span>
              </div>
              <div className="w-full bg-slate-200 dark:bg-slate-700 h-2.5 rounded-full overflow-hidden">
                <div
                  className="bg-emerald-500 h-full transition-all duration-1000 ease-linear rounded-full"
                  style={{ width: `${Math.max(10, ((5 - countdown) / 5) * 100)}%` }}
                />
              </div>
            </div>

            <button
              type="button"
              onClick={() => {
                onSuccess?.();
                onClose();
              }}
              className="w-full py-2.5 px-4 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs transition-all shadow-md active:scale-98 cursor-pointer flex items-center justify-center gap-2"
            >
              <span>ابدأ التصفح الآن دون انتظار</span>
            </button>
          </div>
        ) : authMode === 'forgot_password' ? (
          /* واجهة استعادة كلمة المرور عبر الرقم الوطني والبريد */
          <div className="p-5 overflow-y-auto space-y-4">
            <div className="p-3 bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-900/60 rounded-xl text-xs text-amber-800 dark:text-amber-300 flex items-start gap-2">
              <KeyRound className="w-4 h-4 shrink-0 mt-0.5 text-amber-600" />
              <div className="space-y-1">
                <span className="font-bold block">استعادة كلمة المرور المعتمدة بالهوية السورية:</span>
                <p className="text-[11px] leading-relaxed text-amber-700 dark:text-amber-400">
                  لأمان حسابك، أدخل بريدك الإلكتروني مع الرقم الوطني (11 رقماً) الذي أدخلته عند إنشاء الحساب. إذا تطابقت البيانات سيتم إرسال رابط تعيين كلمة السر إلى بريدك فوراً.
                </p>
              </div>
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

            {!recoverySuccess ? (
              <form onSubmit={handleForgotPasswordSubmit} className="space-y-3">
                <div>
                  <label
                    className={`block text-xs font-bold mb-1 ${
                      isDark ? 'text-slate-300' : 'text-slate-700'
                    }`}
                  >
                    البريد الإلكتروني المسجل *
                  </label>
                  <input
                    type="email"
                    required
                    dir="ltr"
                    value={recoveryEmail}
                    onChange={(e) => setRecoveryEmail(e.target.value)}
                    placeholder="name@example.com"
                    className={`w-full px-3.5 py-2.5 rounded-xl border text-sm text-right focus:outline-none focus:ring-2 focus:ring-emerald-500 ${
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
                    الرقم الوطني السوري المسجل للحساب * (11 رقماً)
                  </label>
                  <input
                    type="text"
                    required
                    dir="ltr"
                    maxLength={11}
                    value={recoveryNationalId}
                    onChange={(e) => setRecoveryNationalId(e.target.value)}
                    placeholder="01010123456"
                    className={`w-full px-3.5 py-2.5 rounded-xl border text-sm text-right focus:outline-none focus:ring-2 focus:ring-emerald-500 ${
                      isDark
                        ? 'bg-slate-800 border-slate-700 text-white placeholder:text-slate-500'
                        : 'bg-white border-slate-200 text-slate-900 placeholder:text-slate-400'
                    }`}
                  />
                </div>

                <button
                  type="submit"
                  disabled={authSubmitting}
                  className="w-full py-2.5 bg-amber-600 hover:bg-amber-700 text-white font-bold rounded-xl text-xs transition-all shadow-md cursor-pointer flex items-center justify-center gap-2 disabled:opacity-50 mt-2"
                >
                  {authSubmitting ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <>
                      <KeyRound className="w-4 h-4" />
                      <span>التحقق من الهوية وإرسال كلمة السر</span>
                    </>
                  )}
                </button>
              </form>
            ) : null}

            <div className="pt-2 text-center border-t border-slate-100 dark:border-slate-800">
              <button
                type="button"
                onClick={() => {
                  setAuthMode('login');
                  setAuthError(null);
                  setAuthSuccessMsg(null);
                }}
                className="text-xs text-emerald-600 dark:text-emerald-400 hover:underline font-bold inline-flex items-center gap-1 cursor-pointer"
              >
                <ArrowRight className="w-3.5 h-3.5" />
                <span>العودة إلى تسجيل الدخول</span>
              </button>
            </div>
          </div>
        ) : (
          <div className="p-5 overflow-y-auto space-y-4">
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

            {/* التبديل بين تسجيل الدخول وحساب جديد */}
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
              {/* في وضع إنشاء الحساب: الحقول الديناميكية الخاضعة للوحة الإدارة */}
              {authMode === 'signup' && (
                <div className="space-y-3 pt-1">
                  {/* حقل الاسم والكنية */}
                  {isFieldVisible('full_name') && (
                    <div className="grid grid-cols-2 gap-2.5">
                      <div>
                        <label
                          className={`block text-xs font-bold mb-1 ${
                            isDark ? 'text-slate-300' : 'text-slate-700'
                          }`}
                        >
                          الاسم {isFieldRequired('full_name') ? '*' : '(اختياري)'}
                        </label>
                        <input
                          type="text"
                          required={isFieldRequired('full_name')}
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
                          الكنية {isFieldRequired('full_name') ? '*' : '(اختياري)'}
                        </label>
                        <input
                          type="text"
                          required={isFieldRequired('full_name')}
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
                  )}

                  {/* اسم الأب */}
                  {isFieldVisible('father_name') && (
                    <div>
                      <label
                        className={`block text-xs font-bold mb-1 ${
                          isDark ? 'text-slate-300' : 'text-slate-700'
                        }`}
                      >
                        اسم الأب {isFieldRequired('father_name') ? '*' : '(اختياري)'}
                      </label>
                      <input
                        type="text"
                        required={isFieldRequired('father_name')}
                        value={signupFatherName}
                        onChange={(e) => setSignupFatherName(e.target.value)}
                        placeholder="مثال: أحمد"
                        className={`w-full px-3.5 py-2 rounded-xl border text-xs focus:outline-none focus:ring-2 focus:ring-emerald-500 ${
                          isDark
                            ? 'bg-slate-800 border-slate-700 text-white placeholder:text-slate-500'
                            : 'bg-white border-slate-200 text-slate-900 placeholder:text-slate-400'
                        }`}
                      />
                    </div>
                  )}

                  {/* تاريخ الميلاد */}
                  {isFieldVisible('birth_place_date') && (
                    <div>
                      <label
                        className={`block text-xs font-bold mb-1 ${
                          isDark ? 'text-slate-300' : 'text-slate-700'
                        }`}
                      >
                        تاريخ الميلاد {isFieldRequired('birth_place_date') ? '*' : '(اختياري)'}
                      </label>
                      <input
                        type="date"
                        required={isFieldRequired('birth_place_date')}
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
                  )}

                  {/* المحافظة */}
                  {isFieldVisible('province') && (
                    <div>
                      <label
                        className={`block text-xs font-bold mb-1 ${
                          isDark ? 'text-slate-300' : 'text-slate-700'
                        }`}
                      >
                        المحافظة {isFieldRequired('province') ? '*' : '(اختياري)'}
                      </label>
                      <select
                        required={isFieldRequired('province')}
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
                        {provincesList.map((prov) => (
                          <option
                            key={prov}
                            value={prov}
                            className={isDark ? 'bg-slate-800 text-white' : 'bg-white text-slate-900'}
                          >
                            {prov}
                          </option>
                        ))}
                      </select>
                    </div>
                  )}

                  {/* العنوان */}
                  {isFieldVisible('address') && (
                    <div>
                      <label
                        className={`block text-xs font-bold mb-1 ${
                          isDark ? 'text-slate-300' : 'text-slate-700'
                        }`}
                      >
                        العنوان بالتفصيل {isFieldRequired('address') ? '*' : '(اختياري)'}
                      </label>
                      <input
                        type="text"
                        required={isFieldRequired('address')}
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
                  )}

                  {/* الرقم الوطني السوري */}
                  {isFieldVisible('national_id') && (
                    <div>
                      <div className="flex items-center justify-between mb-1">
                        <label
                          className={`block text-xs font-bold ${
                            isDark ? 'text-slate-300' : 'text-slate-700'
                          }`}
                        >
                          الرقم الوطني {isFieldRequired('national_id') ? '*' : '(اختياري)'}
                        </label>
                        <span className="text-[10px] text-amber-500 font-bold flex items-center gap-1">
                          <ShieldCheck className="w-3 h-3" />
                          <span>يمنحك التوثيق الذهبي واستعادة الحساب</span>
                        </span>
                      </div>
                      <input
                        type="text"
                        required={isFieldRequired('national_id')}
                        dir="ltr"
                        maxLength={11}
                        value={signupNationalId}
                        onChange={(e) => setSignupNationalId(e.target.value)}
                        placeholder="01010123456 (11 رقماً)"
                        className={`w-full px-3.5 py-2 rounded-xl border text-xs text-right focus:outline-none focus:ring-2 focus:ring-emerald-500 ${
                          isDark
                            ? 'bg-slate-800 border-slate-700 text-white placeholder:text-slate-500'
                            : 'bg-white border-slate-200 text-slate-900 placeholder:text-slate-400'
                        }`}
                      />
                    </div>
                  )}

                  {/* أي حقول مخصصة أضافها المدير من لوحة الإدارة */}
                  {customFieldsToRender.map((cf) => (
                    <div key={cf.id || cf.name}>
                      <label
                        className={`block text-xs font-bold mb-1 ${
                          isDark ? 'text-slate-300' : 'text-slate-700'
                        }`}
                      >
                        {cf.label} {cf.required ? '*' : '(اختياري)'}
                      </label>
                      {cf.type === 'select' && cf.options && cf.options.length > 0 ? (
                        <select
                          required={cf.required}
                          value={customFieldValues[cf.name] || ''}
                          onChange={(e) =>
                            setCustomFieldValues((prev) => ({ ...prev, [cf.name]: e.target.value }))
                          }
                          className={`w-full px-3.5 py-2 rounded-xl border text-xs ${
                            isDark ? 'bg-slate-800 border-slate-700 text-white' : 'bg-white border-slate-200'
                          }`}
                        >
                          <option value="">-- اختر --</option>
                          {cf.options.map((opt) => (
                            <option key={opt} value={opt}>
                              {opt}
                            </option>
                          ))}
                        </select>
                      ) : cf.type === 'textarea' ? (
                        <textarea
                          rows={2}
                          required={cf.required}
                          placeholder={cf.placeholder || ''}
                          value={customFieldValues[cf.name] || ''}
                          onChange={(e) =>
                            setCustomFieldValues((prev) => ({ ...prev, [cf.name]: e.target.value }))
                          }
                          className={`w-full px-3.5 py-2 rounded-xl border text-xs resize-none ${
                            isDark ? 'bg-slate-800 border-slate-700 text-white' : 'bg-white border-slate-200'
                          }`}
                        />
                      ) : (
                        <input
                          type={cf.type === 'number' ? 'number' : cf.type === 'date' ? 'date' : 'text'}
                          required={cf.required}
                          placeholder={cf.placeholder || ''}
                          value={customFieldValues[cf.name] || ''}
                          onChange={(e) =>
                            setCustomFieldValues((prev) => ({ ...prev, [cf.name]: e.target.value }))
                          }
                          className={`w-full px-3.5 py-2 rounded-xl border text-xs ${
                            isDark ? 'bg-slate-800 border-slate-700 text-white' : 'bg-white border-slate-200'
                          }`}
                        />
                      )}
                    </div>
                  ))}
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

              {/* كلمة المرور مع أيقونة العين وخيار نسيت كلمة المرور */}
              <div>
                <div className="flex items-center justify-between mb-1">
                  <label
                    className={`block text-xs font-bold ${
                      isDark ? 'text-slate-300' : 'text-slate-700'
                    }`}
                  >
                    {authMode === 'login' ? 'كلمة المرور *' : 'إنشاء كلمة مرور للحساب *'}
                  </label>

                  {authMode === 'login' ? (
                    <button
                      type="button"
                      onClick={() => {
                        setAuthMode('forgot_password');
                        setRecoveryEmail(authEmail);
                        setAuthError(null);
                        setAuthSuccessMsg(null);
                      }}
                      className="text-[11px] text-emerald-600 dark:text-emerald-400 hover:underline font-bold cursor-pointer"
                    >
                      هل نسيت كلمة المرور؟
                    </button>
                  ) : (
                    <span className="text-[10px] text-slate-400">خاصة بتطبيق سوق سوريا</span>
                  )}
                </div>

                <div className="relative">
                  <input
                    type={showPassword ? 'text' : 'password'}
                    required
                    dir="ltr"
                    minLength={6}
                    value={authPassword}
                    onChange={(e) => setAuthPassword(e.target.value)}
                    placeholder={authMode === 'login' ? '••••••••' : 'أنشئ كلمة مرور (6 خانات أو أكثر)'}
                    className={`w-full pr-3.5 pl-10 py-2.5 rounded-xl border text-sm text-right focus:outline-none focus:ring-2 focus:ring-emerald-500 ${
                      isDark
                        ? 'bg-slate-800 border-slate-700 text-white placeholder:text-slate-500'
                        : 'bg-white border-slate-200 text-slate-900 placeholder:text-slate-400'
                    }`}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 cursor-pointer p-0.5"
                    title={showPassword ? 'إخفاء كلمة المرور' : 'إظهار كلمة المرور'}
                  >
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              {/* تأكيد كلمة المرور في وضع إنشاء الحساب مع أيقونة العين */}
              {authMode === 'signup' && (
                <div>
                  <label
                    className={`block text-xs font-bold mb-1 ${
                      isDark ? 'text-slate-300' : 'text-slate-700'
                    }`}
                  >
                    تأكيد كلمة المرور *
                  </label>
                  <div className="relative">
                    <input
                      type={showConfirmPassword ? 'text' : 'password'}
                      required
                      dir="ltr"
                      minLength={6}
                      value={signupConfirmPassword}
                      onChange={(e) => setSignupConfirmPassword(e.target.value)}
                      placeholder="أعد إدخال كلمة المرور للتأكيد"
                      className={`w-full pr-3.5 pl-10 py-2.5 rounded-xl border text-sm text-right focus:outline-none focus:ring-2 focus:ring-emerald-500 ${
                        isDark
                          ? 'bg-slate-800 border-slate-700 text-white placeholder:text-slate-500'
                          : 'bg-white border-slate-200 text-slate-900 placeholder:text-slate-400'
                      }`}
                    />
                    <button
                      type="button"
                      onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                      className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 cursor-pointer p-0.5"
                      title={showConfirmPassword ? 'إخفاء كلمة المرور' : 'إظهار كلمة المرور'}
                    >
                      {showConfirmPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                </div>
              )}

              {/* نظام الكابتشا إذا كان مفعلاً من الإدارة فقط (بدون أي رسالة زائدة عند التعطيل) */}
              {botProtectionMode === 'math_challenge' ? (
                <div
                  className={`p-3 rounded-xl border space-y-2 ${
                    isDark ? 'border-slate-700 bg-slate-800/60' : 'border-slate-200 bg-slate-50/70'
                  }`}
                >
                  <div className="flex items-center justify-between text-xs">
                    <span className={`font-semibold ${isDark ? 'text-slate-200' : 'text-slate-700'}`}>
                      تحقق أمني سريع: كم حاصل 4 + 3 ؟
                    </span>
                    {isCaptchaVerified && (
                      <span className="text-[10px] font-bold text-emerald-600 flex items-center gap-1">
                        <CheckCircle2 className="w-3 h-3" /> صحيح
                      </span>
                    )}
                  </div>
                  <div className="flex items-center gap-2">
                    <input
                      type="number"
                      placeholder="اكتب الناتج (7)"
                      value={mathAnswer}
                      onChange={(e) => {
                        const val = e.target.value;
                        setMathAnswer(val);
                        if (val.trim() === '7') {
                          setIsCaptchaVerified(true);
                        } else {
                          setIsCaptchaVerified(false);
                        }
                      }}
                      className={`w-full px-3 py-1.5 rounded-lg border text-xs text-center font-bold ${
                        isDark ? 'bg-slate-900 border-slate-700 text-white' : 'bg-white border-slate-300 text-slate-800'
                      }`}
                    />
                  </div>
                </div>
              ) : botProtectionMode === 'cloudflare_turnstile' ? (
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
                </div>
              ) : null}

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
        )}
      </div>
    </div>
  );
}
