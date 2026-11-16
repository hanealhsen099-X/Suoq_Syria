import React, { useState, useMemo, useRef } from 'react';
import {
  X,
  Wallet,
  Coins,
  Crown,
  Sparkles,
  CheckCircle2,
  Clock,
  AlertCircle,
  Upload,
  Copy,
  Check,
  ShieldCheck,
  Star,
  ArrowRight,
  Loader2,
  QrCode,
  ZoomIn,
  History,
  BadgeCheck,
  Image as ImageIcon,
} from 'lucide-react';
import { uploadImageToSupabase } from '../lib/storage';
import {
  formatWalletPrice,
  getWalletCardEffectClass,
  isUserVerificationActive,
  canAcceptNewMerchantSubscription,
  type WalletMonetizationConfig,
  type WalletPointPackage,
  type MerchantSubscriptionPlan,
  type UserWalletRecord,
  type WalletPaymentRequest,
  type WalletCurrency,
} from '../lib/marketplace';

interface WalletModalProps {
  isOpen: boolean;
  onClose: () => void;
  config: WalletMonetizationConfig;
  userWallet: UserWalletRecord;
  allWallets: Record<string, UserWalletRecord>;
  paymentRequests: WalletPaymentRequest[];
  currentUserId: string | null;
  currentUserName: string;
  currentUserPhone: string;
  currentUserNationalId: string;
  initialTab?: 'overview' | 'packages' | 'plans';
  darkMode?: boolean;
  onRequireLogin: () => void;
  onSubmitPaymentRequest: (req: WalletPaymentRequest) => Promise<void>;
  onPurchaseMerchantPlanWithPoints: (
    plan: MerchantSubscriptionPlan
  ) => Promise<{ ok: boolean; error?: string }>;
}

type CheckoutTarget =
  | {
      kind: 'package_recharge';
      id: string;
      title: string;
      pointsToCredit: number;
      priceAmount: number;
      currency: WalletCurrency;
    }
  | {
      kind: 'merchant_plan';
      id: string;
      title: string;
      durationDays: number;
      priceAmount: number;
      currency: WalletCurrency;
    };

export default function WalletModal({
  isOpen,
  onClose,
  config,
  userWallet,
  allWallets,
  paymentRequests,
  currentUserId,
  currentUserName,
  currentUserPhone,
  currentUserNationalId,
  initialTab = 'overview',
  darkMode = false,
  onRequireLogin,
  onSubmitPaymentRequest,
  onPurchaseMerchantPlanWithPoints,
}: WalletModalProps) {
  const [activeTab, setActiveTab] = useState<'overview' | 'packages' | 'plans'>(initialTab);
  const [checkoutTarget, setCheckoutTarget] = useState<CheckoutTarget | null>(null);
  const [transferReference, setTransferReference] = useState('');
  const [userNote, setUserNote] = useState('');
  const [receiptUrl, setReceiptUrl] = useState('');
  const [isUploadingReceipt, setIsUploadingReceipt] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitSuccessMsg, setSubmitSuccessMsg] = useState<string | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [copiedKey, setCopiedKey] = useState<string | null>(null);
  const [zoomedQrUrl, setZoomedQrUrl] = useState<string | null>(null);
  const [activatingPlanId, setActivatingPlanId] = useState<string | null>(null);
  const receiptInputRef = useRef<HTMLInputElement | null>(null);

  React.useEffect(() => {
    if (isOpen) {
      setActiveTab(initialTab);
      setCheckoutTarget(null);
      setSubmitSuccessMsg(null);
      setErrorMsg(null);
    }
  }, [isOpen, initialTab]);

  const sortedPackages = useMemo(
    () =>
      [...(config.packages || [])]
        .filter((p) => p.visible !== false)
        .sort((a, b) => (a.order ?? 0) - (b.order ?? 0)),
    [config.packages]
  );

  const sortedPlans = useMemo(
    () =>
      [...(config.merchantPlans || [])]
        .filter((p) => p.visible !== false)
        .sort((a, b) => (a.order ?? 0) - (b.order ?? 0)),
    [config.merchantPlans]
  );

  const myRequests = useMemo(() => {
    if (!currentUserId) return [];
    return [...(paymentRequests || [])]
      .filter((r) => r.userId === currentUserId)
      .sort((a, b) => Date.parse(b.createdAt) - Date.parse(a.createdAt));
  }, [paymentRequests, currentUserId]);

  const verificationState = useMemo(
    () => isUserVerificationActive(userWallet, false),
    [userWallet]
  );

  const merchantQuota = useMemo(
    () =>
      canAcceptNewMerchantSubscription(
        allWallets,
        config.maxSubscribedMerchants || 0,
        currentUserId || ''
      ),
    [allWallets, config.maxSubscribedMerchants, currentUserId]
  );

  if (!isOpen) return null;

  const handleCopyAccount = async (val: string, key: string) => {
    if (!val) return;
    try {
      await navigator.clipboard.writeText(val);
      setCopiedKey(key);
      setTimeout(() => setCopiedKey(null), 2000);
    } catch {}
  };

  const handleUploadReceipt = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setErrorMsg(null);
    setIsUploadingReceipt(true);
    try {
      const maxWidth = config.paymentImageMaxWidth || 1000;
      const quality = config.paymentImageQuality || 0.72;
      const url = await uploadImageToSupabase(file, maxWidth, quality);
      setReceiptUrl(url);
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : 'تعذر رفع صورة الإشعار');
    } finally {
      setIsUploadingReceipt(false);
      if (receiptInputRef.current) receiptInputRef.current.value = '';
    }
  };

  const handleStartCheckoutPackage = (pkg: WalletPointPackage) => {
    if (!currentUserId) {
      onRequireLogin();
      return;
    }
    setErrorMsg(null);
    setSubmitSuccessMsg(null);
    setTransferReference('');
    setUserNote('');
    setReceiptUrl('');
    setCheckoutTarget({
      kind: 'package_recharge',
      id: pkg.id,
      title: pkg.title,
      pointsToCredit: (pkg.points || 0) + (pkg.bonusPoints || 0),
      priceAmount: pkg.price,
      currency: pkg.currency,
    });
  };

  const handleStartCheckoutPlan = (plan: MerchantSubscriptionPlan) => {
    if (!currentUserId) {
      onRequireLogin();
      return;
    }
    if (!merchantQuota.allowed) {
      setErrorMsg(
        `عذراً، اكتمل عدد مقاعد التجار الموثقين المتاحة حالياً (${merchantQuota.maxQuota} تاجر). سيتم إشعارك عند توفر مقاعد جديدة.`
      );
      return;
    }
    setErrorMsg(null);
    setSubmitSuccessMsg(null);
    setTransferReference('');
    setUserNote('');
    setReceiptUrl('');
    setCheckoutTarget({
      kind: 'merchant_plan',
      id: plan.id,
      title: plan.title,
      durationDays: plan.durationDays,
      priceAmount: plan.directPrice,
      currency: plan.currency,
    });
  };

  const handleSubmitShamCash = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentUserId || !checkoutTarget) return;
    if (!transferReference.trim() && !receiptUrl) {
      setErrorMsg('يرجى إدخال رقم عملية التحويل أو إرفاق صورة إشعار الدفع عبر شام كاش.');
      return;
    }

    setErrorMsg(null);
    setIsSubmitting(true);
    try {
      const req: WalletPaymentRequest = {
        id: `payreq_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
        userId: currentUserId,
        userName: currentUserName || 'مستخدم سوق سوريا',
        userPhone: currentUserPhone || undefined,
        userNationalId: currentUserNationalId || undefined,
        requestType: checkoutTarget.kind,
        targetId: checkoutTarget.id,
        targetTitle: checkoutTarget.title,
        pointsToCredit:
          checkoutTarget.kind === 'package_recharge' ? checkoutTarget.pointsToCredit : 0,
        durationDays:
          checkoutTarget.kind === 'merchant_plan' ? checkoutTarget.durationDays : undefined,
        priceAmount: checkoutTarget.priceAmount,
        currency: checkoutTarget.currency,
        transferReference: transferReference.trim() || undefined,
        receiptImageUrl: receiptUrl || undefined,
        userNote: userNote.trim() || undefined,
        status: 'pending',
        createdAt: new Date().toISOString(),
      };
      await onSubmitPaymentRequest(req);
      setSubmitSuccessMsg(
        config.shamCashPendingMessage ||
          'تم استلام طلب التحويل بنجاح، سيقوم فريق الإدارة بمراجعته وتفعيل الرصيد خلال دقائق.'
      );
      setCheckoutTarget(null);
      setActiveTab('overview');
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : 'حدث خطأ أثناء إرسال طلب التحويل');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleActivateWithPoints = async (plan: MerchantSubscriptionPlan) => {
    if (!currentUserId) {
      onRequireLogin();
      return;
    }
    setErrorMsg(null);
    setSubmitSuccessMsg(null);
    setActivatingPlanId(plan.id);
    try {
      const res = await onPurchaseMerchantPlanWithPoints(plan);
      if (!res.ok) {
        setErrorMsg(res.error || 'تعذر تفعيل الباقة بالنقاط');
      } else {
        setSubmitSuccessMsg(
          `تم تفعيل باقة «${plan.title}» وتوثيق حسابك لمدة ${plan.durationDays} يوم بنجاح!`
        );
        setActiveTab('overview');
      }
    } finally {
      setActivatingPlanId(null);
    }
  };

  const renderCardStyle = (item: {
    bgColor: string;
    gradientTo?: string;
    useGradient?: boolean;
    textColor: string;
    borderColor: string;
    effect: WalletPointPackage['effect'];
    glowColor?: string;
  }): React.CSSProperties => ({
    color: item.textColor || '#ffffff',
    borderColor: item.borderColor || 'rgba(255,255,255,0.2)',
    ...(item.useGradient && item.gradientTo
      ? { backgroundImage: `linear-gradient(135deg, ${item.bgColor}, ${item.gradientTo})` }
      : { backgroundColor: item.bgColor || '#059669' }),
    ...(item.effect === 'glow' || item.effect === 'metallic_gold'
      ? ({
          boxShadow: `0 6px 20px ${item.glowColor || 'rgba(245,158,11,0.45)'}`,
          '--souq-glow-color': item.glowColor || 'rgba(245,158,11,0.5)',
        } as React.CSSProperties)
      : {}),
  });

  const activeAccountNumber =
    checkoutTarget?.currency === 'USD'
      ? config.shamCashAccountNumberUsd || config.shamCashAccountNumberSyp
      : config.shamCashAccountNumberSyp || config.shamCashAccountNumberUsd;
  const activeQrUrl =
    checkoutTarget?.currency === 'USD'
      ? config.shamCashQrImageUrlUsd || config.shamCashQrImageUrlSyp
      : config.shamCashQrImageUrlSyp || config.shamCashQrImageUrlUsd;

  return (
    <div
      role="dialog"
      aria-modal="true"
      className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-end sm:items-center justify-center p-0 sm:p-4"
      onClick={onClose}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className={`w-full sm:max-w-lg rounded-t-3xl sm:rounded-3xl shadow-2xl border overflow-hidden flex flex-col max-h-[90vh] ${
          darkMode
            ? 'bg-slate-900 border-slate-800 text-slate-100'
            : 'bg-white border-slate-200 text-slate-900'
        }`}
      >
        {/* الترويسة */}
        <div
          className={`px-4 py-3.5 border-b flex items-center justify-between ${
            darkMode ? 'border-slate-800 bg-slate-900' : 'border-slate-100 bg-slate-50/70'
          }`}
        >
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-amber-500/15 text-amber-500 flex items-center justify-center">
              <Wallet className="w-5 h-5" />
            </div>
            <div className="text-right">
              <h2 className="font-black text-sm">
                {config.walletButtonLabel || 'محفظتي والنقاط'}
              </h2>
              <p className="text-[11px] text-slate-400">
                شحن النقاط وتوثيق التجار وتمييز الإعلانات بنجمة الصدارة
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-full text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-200/50 dark:hover:bg-slate-800 cursor-pointer"
            aria-label="إغلاق"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* شريط التبويب */}
        {!checkoutTarget && (
          <div
            className={`px-3 py-2 border-b grid grid-cols-3 gap-1.5 ${
              darkMode ? 'border-slate-800 bg-slate-950/40' : 'border-slate-100 bg-slate-50'
            }`}
          >
            <button
              type="button"
              onClick={() => setActiveTab('overview')}
              className={`py-2 px-2 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center justify-center gap-1 ${
                activeTab === 'overview'
                  ? 'bg-emerald-600 text-white shadow-xs'
                  : darkMode
                  ? 'text-slate-300 hover:bg-slate-800'
                  : 'text-slate-600 hover:bg-white'
              }`}
            >
              <Wallet className="w-3.5 h-3.5" />
              <span>رصيدي</span>
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('packages')}
              className={`py-2 px-2 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center justify-center gap-1 ${
                activeTab === 'packages'
                  ? 'bg-emerald-600 text-white shadow-xs'
                  : darkMode
                  ? 'text-slate-300 hover:bg-slate-800'
                  : 'text-slate-600 hover:bg-white'
              }`}
            >
              <Coins className="w-3.5 h-3.5" />
              <span>شحن النقاط</span>
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('plans')}
              className={`py-2 px-2 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center justify-center gap-1 ${
                activeTab === 'plans'
                  ? 'bg-emerald-600 text-white shadow-xs'
                  : darkMode
                  ? 'text-slate-300 hover:bg-slate-800'
                  : 'text-slate-600 hover:bg-white'
              }`}
            >
              <Crown className="w-3.5 h-3.5" />
              <span>باقات التجار</span>
            </button>
          </div>
        )}

        {/* المحتوى */}
        <div className="p-4 overflow-y-auto space-y-4 flex-1 text-right">
          {!config.enabled && (
            <div className="p-3 rounded-2xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 text-emerald-800 dark:text-emerald-300 text-xs leading-relaxed flex items-start gap-2">
              <Sparkles className="w-4 h-4 shrink-0 mt-0.5" />
              <span>
                جميع خدمات النشر والتصفح في سوق سوريا مجانية حالياً! يمكنك شحن رصيدك مسبقاً أو تجهيز محفظتك استعداداً لتفعيل المزايا المدفوعة.
              </span>
            </div>
          )}

          {submitSuccessMsg && (
            <div className="p-3 rounded-2xl bg-emerald-50 dark:bg-emerald-950/50 border border-emerald-200 dark:border-emerald-800 text-emerald-800 dark:text-emerald-300 text-xs font-semibold leading-relaxed flex items-start gap-2">
              <CheckCircle2 className="w-4 h-4 shrink-0 mt-0.5 text-emerald-600" />
              <span>{submitSuccessMsg}</span>
            </div>
          )}

          {errorMsg && (
            <div className="p-3 rounded-2xl bg-rose-50 dark:bg-rose-950/50 border border-rose-200 dark:border-rose-800 text-rose-700 dark:text-rose-300 text-xs font-semibold flex items-start gap-2">
              <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
              <span>{errorMsg}</span>
            </div>
          )}

          {/* واجهة الدفع عبر شام كاش */}
          {checkoutTarget ? (
            <form onSubmit={handleSubmitShamCash} className="space-y-3.5">
              <button
                type="button"
                onClick={() => setCheckoutTarget(null)}
                className="inline-flex items-center gap-1 text-xs font-bold text-slate-500 hover:text-slate-800 dark:hover:text-slate-200 cursor-pointer"
              >
                <ArrowRight className="w-4 h-4" />
                <span>العودة للباقات</span>
              </button>

              <div className="p-3.5 rounded-2xl border border-amber-200 dark:border-amber-800/70 bg-amber-50/70 dark:bg-amber-950/30 space-y-2">
                <div className="flex items-center justify-between gap-2">
                  <span className="text-xs font-black text-amber-900 dark:text-amber-300">
                    {checkoutTarget.title}
                  </span>
                  <span className="px-2.5 py-0.5 rounded-lg bg-amber-500 text-white text-xs font-black">
                    {formatWalletPrice(checkoutTarget.priceAmount, checkoutTarget.currency)}
                  </span>
                </div>
                <p className="text-[11px] text-amber-800 dark:text-amber-200 leading-relaxed">
                  {config.shamCashInstructionMessage}
                </p>
              </div>

              {/* بيانات شام كاش: الرقم + باركود QR */}
              <div
                className={`p-3.5 rounded-2xl border space-y-3 ${
                  darkMode ? 'bg-slate-800/60 border-slate-700' : 'bg-slate-50 border-slate-200'
                }`}
              >
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold flex items-center gap-1.5">
                    <QrCode className="w-4 h-4 text-emerald-600" />
                    <span>
                      {config.shamCashTitle || 'شام كاش'} (
                      {checkoutTarget.currency === 'USD' ? 'حساب الدولار $' : 'حساب الليرة السورية ل.س'})
                    </span>
                  </span>
                  {config.shamCashAccountName && (
                    <span className="text-[11px] text-slate-400 font-semibold">
                      {config.shamCashAccountName}
                    </span>
                  )}
                </div>

                {activeAccountNumber ? (
                  <div
                    className={`flex items-center justify-between gap-2 p-2.5 rounded-xl border ${
                      darkMode ? 'bg-slate-900 border-slate-700' : 'bg-white border-slate-200'
                    }`}
                  >
                    <span className="font-mono text-xs font-bold select-all truncate" dir="ltr">
                      {activeAccountNumber}
                    </span>
                    <button
                      type="button"
                      onClick={() => handleCopyAccount(activeAccountNumber, 'acct')}
                      className="px-2.5 py-1 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-[11px] font-bold flex items-center gap-1 shrink-0 cursor-pointer"
                    >
                      {copiedKey === 'acct' ? (
                        <>
                          <Check className="w-3.5 h-3.5" />
                          <span>تم النسخ</span>
                        </>
                      ) : (
                        <>
                          <Copy className="w-3.5 h-3.5" />
                          <span>نسخ الرقم</span>
                        </>
                      )}
                    </button>
                  </div>
                ) : (
                  <div className="text-[11px] text-amber-600 font-semibold">
                    لم يتم إضافة رقم محفظة شام كاش لهذا النوع من العملة بعد — يمكنك إرفاق صورة إشعار التحويل أو التواصل مع الدعم.
                  </div>
                )}

                {activeQrUrl && (
                  <div className="flex flex-col items-center gap-2 pt-1">
                    <button
                      type="button"
                      onClick={() => setZoomedQrUrl(activeQrUrl)}
                      className="relative group rounded-2xl overflow-hidden border border-slate-200 dark:border-slate-700 bg-white p-2 cursor-pointer"
                    >
                      <img
                        src={activeQrUrl}
                        alt="رمز QR شام كاش"
                        className="w-36 h-36 object-contain"
                      />
                      <span className="absolute bottom-1.5 left-1/2 -translate-x-1/2 px-2 py-0.5 rounded-md bg-black/75 text-white text-[10px] font-bold flex items-center gap-1 opacity-90">
                        <ZoomIn className="w-3 h-3" />
                        <span>تكبير الباركود</span>
                      </span>
                    </button>
                  </div>
                )}
              </div>

              <div>
                <label className="block text-xs font-bold mb-1">
                  رقم عملية التحويل في شام كاش
                </label>
                <input
                  type="text"
                  value={transferReference}
                  onChange={(e) => setTransferReference(e.target.value)}
                  placeholder="مثال: SC-948271"
                  className={`w-full px-3 py-2.5 rounded-xl border text-xs ${
                    darkMode
                      ? 'bg-slate-800 border-slate-700 text-white'
                      : 'bg-white border-slate-200 text-slate-900'
                  }`}
                />
              </div>

              <div>
                <label className="block text-xs font-bold mb-1">
                  صورة إشعار / إيصال التحويل (يُضغط تلقائياً)
                </label>
                <input
                  ref={receiptInputRef}
                  type="file"
                  accept="image/*"
                  onChange={handleUploadReceipt}
                  className="hidden"
                />
                {receiptUrl ? (
                  <div className="flex items-center gap-3 p-2.5 rounded-xl border border-emerald-200 dark:border-emerald-800 bg-emerald-50/50 dark:bg-emerald-950/30">
                    <img
                      src={receiptUrl}
                      alt="إيصال التحويل"
                      className="w-16 h-16 rounded-lg object-cover border border-slate-200"
                    />
                    <div className="flex-1 text-xs">
                      <span className="font-bold text-emerald-700 dark:text-emerald-400 block">
                        تم إرفاق صورة الإشعار وضغطها بنجاح ✓
                      </span>
                      <button
                        type="button"
                        onClick={() => receiptInputRef.current?.click()}
                        className="text-[11px] text-slate-500 underline mt-1 cursor-pointer"
                      >
                        تغيير الصورة
                      </button>
                    </div>
                  </div>
                ) : (
                  <button
                    type="button"
                    disabled={isUploadingReceipt}
                    onClick={() => receiptInputRef.current?.click()}
                    className={`w-full py-3.5 px-3 rounded-xl border-2 border-dashed flex items-center justify-center gap-2 text-xs font-bold cursor-pointer transition-colors ${
                      darkMode
                        ? 'border-slate-700 hover:border-emerald-500 text-slate-300'
                        : 'border-slate-300 hover:border-emerald-500 text-slate-600'
                    }`}
                  >
                    {isUploadingReceipt ? (
                      <>
                        <Loader2 className="w-4 h-4 animate-spin text-emerald-600" />
                        <span>جارٍ ضغط ورفع صورة الإيصال...</span>
                      </>
                    ) : (
                      <>
                        <Upload className="w-4 h-4 text-emerald-600" />
                        <span>إرفاق لقطة شاشة لإشعار التحويل</span>
                      </>
                    )}
                  </button>
                )}
              </div>

              <div>
                <label className="block text-xs font-bold mb-1">ملاحظة إضافية (اختياري)</label>
                <input
                  type="text"
                  value={userNote}
                  onChange={(e) => setUserNote(e.target.value)}
                  placeholder="أي تفاصيل تساعد الإدارة في مطابقة الحوالة..."
                  className={`w-full px-3 py-2 rounded-xl border text-xs ${
                    darkMode
                      ? 'bg-slate-800 border-slate-700 text-white'
                      : 'bg-white border-slate-200 text-slate-900'
                  }`}
                />
              </div>

              <div className="text-[11px] text-slate-400 flex items-center gap-1.5">
                <Clock className="w-3.5 h-3.5 text-amber-500 shrink-0" />
                <span>
                  الوقت المتوقع للمراجعة والتفعيل: حوالي {config.estimatedVerificationMinutes || 5} دقائق
                </span>
              </div>

              <button
                type="submit"
                disabled={isSubmitting || isUploadingReceipt}
                className="w-full py-3 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-black text-xs flex items-center justify-center gap-2 shadow-sm cursor-pointer disabled:opacity-60"
              >
                {isSubmitting ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span>جارٍ إرسال طلب التحويل...</span>
                  </>
                ) : (
                  <>
                    <CheckCircle2 className="w-4 h-4" />
                    <span>إرسال إشعار الدفع للمراجعة والتفعيل</span>
                  </>
                )}
              </button>
            </form>
          ) : activeTab === 'overview' ? (
            /* تبويب الرصيد والسجل */
            <div className="space-y-4">
              {!currentUserId ? (
                <div className="p-5 rounded-2xl border border-slate-200 dark:border-slate-800 text-center space-y-3">
                  <Coins className="w-10 h-10 text-amber-500 mx-auto" />
                  <h3 className="font-bold text-sm">سجّل دخولك لاستخدام المحفظة</h3>
                  <p className="text-xs text-slate-400">
                    احصل على نقاطك الترحيبية واشحن محفظتك أو فعّل اشتراك التاجر الموثق.
                  </p>
                  <button
                    type="button"
                    onClick={onRequireLogin}
                    className="px-5 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs cursor-pointer"
                  >
                    تسجيل الدخول / إنشاء حساب
                  </button>
                </div>
              ) : (
                <>
                  <div className="p-4 rounded-2xl bg-gradient-to-br from-emerald-600 to-teal-700 text-white shadow-md space-y-3">
                    <div className="flex items-center justify-between">
                      <div>
                        <span className="text-[11px] opacity-85 block">رصيد النقاط المتاح</span>
                        <div className="text-2xl font-black flex items-baseline gap-1.5">
                          <span>{userWallet.points}</span>
                          <span className="text-xs font-bold opacity-90">نقطة</span>
                        </div>
                      </div>
                      <div className="w-11 h-11 rounded-2xl bg-white/15 flex items-center justify-center">
                        <Coins className="w-6 h-6 text-amber-300" />
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-2 pt-2 border-t border-white/15 text-[11px]">
                      <div className="bg-black/15 rounded-xl px-2.5 py-2 flex items-center justify-between">
                        <span className="opacity-85 flex items-center gap-1">
                          <Star className="w-3.5 h-3.5 text-amber-300" />
                          <span>أرصدة النجمة</span>
                        </span>
                        <span className="font-black">{userWallet.starCreditsRemaining || 0}</span>
                      </div>
                      <div className="bg-black/15 rounded-xl px-2.5 py-2 flex items-center justify-between">
                        <span className="opacity-85 flex items-center gap-1">
                          <BadgeCheck className="w-3.5 h-3.5 text-amber-300" />
                          <span>التوثيق</span>
                        </span>
                        <span className="font-black">
                          {verificationState.active
                            ? verificationState.daysRemaining !== null
                              ? `${verificationState.daysRemaining} يوم`
                              : 'دائم'
                            : 'غير موثق'}
                        </span>
                      </div>
                    </div>

                    {userWallet.activePlanTitle && verificationState.active && (
                      <div className="text-[11px] bg-white/10 rounded-xl px-3 py-1.5 flex items-center justify-between">
                        <span>الباقة النشطة: {userWallet.activePlanTitle}</span>
                        {userWallet.verifiedUntil && (
                          <span>
                            ينتهي {new Date(userWallet.verifiedUntil).toLocaleDateString('ar-SY')}
                          </span>
                        )}
                      </div>
                    )}
                  </div>

                  {/* أزرار سريعة */}
                  <div className="grid grid-cols-2 gap-2">
                    <button
                      type="button"
                      onClick={() => setActiveTab('packages')}
                      className="py-2.5 px-3 rounded-xl bg-amber-500 hover:bg-amber-600 text-white font-bold text-xs flex items-center justify-center gap-1.5 cursor-pointer shadow-xs"
                    >
                      <Coins className="w-4 h-4" />
                      <span>شحن نقاط (شام كاش)</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => setActiveTab('plans')}
                      className="py-2.5 px-3 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs flex items-center justify-center gap-1.5 cursor-pointer shadow-xs"
                    >
                      <Crown className="w-4 h-4" />
                      <span>باقات التجار والتوثيق</span>
                    </button>
                  </div>

                  {/* طلبات شام كاش المرسلة */}
                  {myRequests.length > 0 && (
                    <div className="space-y-2">
                      <h4 className="text-xs font-bold flex items-center gap-1.5">
                        <Clock className="w-3.5 h-3.5 text-amber-500" />
                        <span>طلبات الدفع عبر شام كاش ({myRequests.length})</span>
                      </h4>
                      <div className="space-y-2">
                        {myRequests.slice(0, 6).map((req) => (
                          <div
                            key={req.id}
                            className={`p-3 rounded-xl border text-xs space-y-1 ${
                              darkMode
                                ? 'bg-slate-800/60 border-slate-700'
                                : 'bg-slate-50 border-slate-200'
                            }`}
                          >
                            <div className="flex items-center justify-between gap-2">
                              <span className="font-bold truncate">{req.targetTitle}</span>
                              <span
                                className={`px-2 py-0.5 rounded-full text-[10px] font-bold shrink-0 ${
                                  req.status === 'approved'
                                    ? 'bg-emerald-100 text-emerald-700'
                                    : req.status === 'rejected'
                                    ? 'bg-rose-100 text-rose-700'
                                    : 'bg-amber-100 text-amber-700'
                                }`}
                              >
                                {req.status === 'approved'
                                  ? 'معتمد ✓'
                                  : req.status === 'rejected'
                                  ? 'مرفوض'
                                  : 'قيد المراجعة'}
                              </span>
                            </div>
                            <div className="flex items-center justify-between text-[11px] text-slate-400">
                              <span>{formatWalletPrice(req.priceAmount, req.currency)}</span>
                              <span>{new Date(req.createdAt).toLocaleDateString('ar-SY')}</span>
                            </div>
                            {req.status === 'pending' && (
                              <p className="text-[11px] text-amber-600 dark:text-amber-400 leading-relaxed pt-0.5">
                                {config.shamCashPendingMessage}
                              </p>
                            )}
                            {req.status === 'rejected' && req.rejectionReason && (
                              <p className="text-[11px] text-rose-600 dark:text-rose-400 pt-0.5">
                                سبب الرفض: {req.rejectionReason}
                              </p>
                            )}
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* سجل الحركات */}
                  <div className="space-y-2">
                    <h4 className="text-xs font-bold flex items-center gap-1.5">
                      <History className="w-3.5 h-3.5 text-emerald-600" />
                      <span>سجل حركات المحفظة</span>
                    </h4>
                    {(!userWallet.transactions || userWallet.transactions.length === 0) ? (
                      <div className="text-center py-4 text-[11px] text-slate-400 border border-dashed border-slate-200 dark:border-slate-800 rounded-xl">
                        لا توجد حركات مسجلة في محفظتك بعد
                      </div>
                    ) : (
                      <div className="space-y-1.5">
                        {userWallet.transactions.slice(0, 12).map((tx) => (
                          <div
                            key={tx.id}
                            className={`px-3 py-2 rounded-xl border flex items-center justify-between gap-2 text-xs ${
                              darkMode
                                ? 'bg-slate-800/40 border-slate-800'
                                : 'bg-white border-slate-100'
                            }`}
                          >
                            <div className="min-w-0">
                              <div className="font-bold truncate">{tx.title}</div>
                              {tx.note && (
                                <div className="text-[10px] text-slate-400 truncate">{tx.note}</div>
                              )}
                            </div>
                            <span
                              className={`font-black shrink-0 ${
                                tx.amount > 0
                                  ? 'text-emerald-600'
                                  : tx.amount < 0
                                  ? 'text-rose-600'
                                  : 'text-slate-400'
                              }`}
                            >
                              {tx.amount > 0 ? `+${tx.amount}` : tx.amount}
                            </span>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </>
              )}
            </div>
          ) : activeTab === 'packages' ? (
            /* تبويب باقات شحن النقاط */
            <div className="space-y-3">
              {sortedPackages.length === 0 ? (
                <div className="py-10 text-center text-xs text-slate-400">
                  لا توجد باقات شحن متاحة حالياً من الإدارة.
                </div>
              ) : (
                sortedPackages.map((pkg) => (
                  <div
                    key={pkg.id}
                    style={renderCardStyle(pkg)}
                    className={`rounded-2xl p-4 border shadow-sm space-y-2.5 transition-transform ${getWalletCardEffectClass(
                      pkg.effect
                    )}`}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <div className="flex items-center gap-1.5 flex-wrap">
                          <h3 className="font-black text-sm">{pkg.title}</h3>
                          {pkg.badgeText && (
                            <span className="px-2 py-0.5 rounded-full bg-black/25 text-[10px] font-bold">
                              {pkg.badgeText}
                            </span>
                          )}
                        </div>
                        {pkg.subtitle && (
                          <p className="text-[11px] opacity-90 mt-0.5">{pkg.subtitle}</p>
                        )}
                      </div>
                      <div className="text-left shrink-0">
                        <span className="text-sm font-black block">
                          {formatWalletPrice(pkg.price, pkg.currency)}
                        </span>
                      </div>
                    </div>

                    <div className="flex items-center justify-between pt-2 border-t border-white/20">
                      <div className="flex items-center gap-2 text-xs font-black">
                        <Coins className="w-4 h-4" />
                        <span>{pkg.points} نقطة</span>
                        {pkg.bonusPoints && pkg.bonusPoints > 0 && (
                          <span className="px-2 py-0.5 rounded-full bg-white/20 text-[10px]">
                            + {pkg.bonusPoints} هدية
                          </span>
                        )}
                      </div>
                      <button
                        type="button"
                        onClick={() => handleStartCheckoutPackage(pkg)}
                        className="px-3.5 py-1.5 rounded-xl bg-white text-slate-900 hover:bg-slate-100 font-black text-xs shadow-xs cursor-pointer"
                      >
                        شحن عبر شام كاش
                      </button>
                    </div>
                  </div>
                ))
              )}
            </div>
          ) : (
            /* تبويب باقات التجار والتوثيق */
            <div className="space-y-3">
              {merchantQuota.maxQuota > 0 && (
                <div
                  className={`p-3 rounded-2xl border text-xs flex items-center justify-between ${
                    merchantQuota.allowed
                      ? darkMode
                        ? 'bg-slate-800/60 border-slate-700'
                        : 'bg-slate-50 border-slate-200'
                      : 'bg-rose-50 dark:bg-rose-950/40 border-rose-200 dark:border-rose-800 text-rose-700 dark:text-rose-300'
                  }`}
                >
                  <span className="font-bold flex items-center gap-1.5">
                    <ShieldCheck className="w-4 h-4 text-emerald-600" />
                    <span>مقاعد التجار الموثقين</span>
                  </span>
                  <span className="font-black">
                    {merchantQuota.activeCount} / {merchantQuota.maxQuota} تاجر
                  </span>
                </div>
              )}

              {sortedPlans.length === 0 ? (
                <div className="py-10 text-center text-xs text-slate-400">
                  لا توجد باقات تجار متاحة حالياً.
                </div>
              ) : (
                sortedPlans.map((plan) => {
                  const hasEnoughPoints =
                    plan.pointsCost > 0 && userWallet.points >= plan.pointsCost;
                  return (
                    <div
                      key={plan.id}
                      style={renderCardStyle(plan)}
                      className={`rounded-2xl p-4 border shadow-sm space-y-3 ${getWalletCardEffectClass(
                        plan.effect
                      )}`}
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div>
                          <div className="flex items-center gap-1.5 flex-wrap">
                            <Crown className="w-4 h-4 shrink-0" />
                            <h3 className="font-black text-sm">{plan.title}</h3>
                            {plan.badgeText && (
                              <span className="px-2 py-0.5 rounded-full bg-black/25 text-[10px] font-bold">
                                {plan.badgeText}
                              </span>
                            )}
                          </div>
                          <p className="text-[11px] opacity-90 mt-1">{plan.description}</p>
                        </div>
                        <span className="text-xs font-black bg-black/25 px-2.5 py-1 rounded-lg shrink-0">
                          {plan.durationDays} يوم
                        </span>
                      </div>

                      <div className="grid grid-cols-3 gap-1.5 text-[10px] font-bold bg-black/15 rounded-xl p-2 text-center">
                        <div>
                          <ImageIcon className="w-3.5 h-3.5 mx-auto mb-0.5 opacity-85" />
                          <span>حتى {plan.maxImagesPerAd} صور/إعلان</span>
                        </div>
                        <div>
                          <Sparkles className="w-3.5 h-3.5 mx-auto mb-0.5 opacity-85" />
                          <span>
                            {plan.maxDailyAds === 0
                              ? 'إعلانات يومية مفتوحة'
                              : `${plan.maxDailyAds} إعلانات/يوم`}
                          </span>
                        </div>
                        <div>
                          <Star className="w-3.5 h-3.5 mx-auto mb-0.5 text-amber-300" />
                          <span>{plan.includedStarBoosts} نجمة مجانية</span>
                        </div>
                      </div>

                      <div className="flex flex-wrap items-center gap-2 pt-1">
                        {plan.pointsCost > 0 && (
                          <button
                            type="button"
                            disabled={
                              !merchantQuota.allowed ||
                              activatingPlanId === plan.id ||
                              (Boolean(currentUserId) && !hasEnoughPoints)
                            }
                            onClick={() => handleActivateWithPoints(plan)}
                            className="flex-1 py-2 px-3 rounded-xl bg-white text-slate-900 hover:bg-slate-100 font-black text-xs cursor-pointer disabled:opacity-50 flex items-center justify-center gap-1"
                          >
                            {activatingPlanId === plan.id ? (
                              <Loader2 className="w-3.5 h-3.5 animate-spin" />
                            ) : (
                              <Coins className="w-3.5 h-3.5 text-amber-600" />
                            )}
                            <span>تفعيل بـ {plan.pointsCost} نقطة</span>
                          </button>
                        )}
                        <button
                          type="button"
                          disabled={!merchantQuota.allowed}
                          onClick={() => handleStartCheckoutPlan(plan)}
                          className="flex-1 py-2 px-3 rounded-xl bg-black/30 hover:bg-black/45 border border-white/25 text-white font-black text-xs cursor-pointer disabled:opacity-50"
                        >
                          دفع مباشر ({formatWalletPrice(plan.directPrice, plan.currency)})
                        </button>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          )}
        </div>
      </div>

      {/* تكبير باركود شام كاش */}
      {zoomedQrUrl && (
        <div
          className="fixed inset-0 z-[60] bg-black/85 flex items-center justify-center p-4"
          onClick={() => setZoomedQrUrl(null)}
        >
          <div
            className="bg-white rounded-3xl p-4 max-w-xs w-full text-center space-y-3"
            onClick={(e) => e.stopPropagation()}
          >
            <img src={zoomedQrUrl} alt="QR شام كاش" className="w-full rounded-xl object-contain" />
            <button
              type="button"
              onClick={() => setZoomedQrUrl(null)}
              className="w-full py-2 rounded-xl bg-slate-900 text-white text-xs font-bold cursor-pointer"
            >
              إغلاق
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
