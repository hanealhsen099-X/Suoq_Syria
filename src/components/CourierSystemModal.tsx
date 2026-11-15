import React, { useMemo, useState } from 'react';
import {
  X,
  Truck,
  MapPin,
  Phone,
  MessageCircle,
  AlertTriangle,
  ShieldAlert,
  Camera,
  CheckCircle2,
  Clock,
  Send,
  Inbox,
  Loader2,
  Car,
  CreditCard,
} from 'lucide-react';
import {
  CourierApplicationItem,
  CourierDeliveryRequest,
  CourierServiceConfig,
  ProductItem,
  canApplyAsCourierInProvince,
  filterActiveCouriers,
  formatDirectCallUrl,
  formatWhatsappUrl,
  validateCourierApplicationInput,
} from '../lib/marketplace';
import { uploadImageToSupabase } from '../lib/storage';

export type CourierModalMode = 'directory' | 'apply' | 'inbox';

interface CourierSystemModalProps {
  isOpen: boolean;
  mode: CourierModalMode;
  onClose: () => void;
  config: CourierServiceConfig;
  provinces: string[];
  applications: CourierApplicationItem[];
  requests: CourierDeliveryRequest[];
  currentUserId: string | null;
  currentUserName: string;
  currentUserNationalId?: string;
  currentUserPhone?: string;
  currentUserProvince?: string;
  targetProduct?: ProductItem | null;
  myApplication?: CourierApplicationItem | null;
  whatsappLaunchMode?: 'app' | 'web';
  onRequireLogin: () => void;
  onSubmitApplication: (app: CourierApplicationItem) => Promise<void>;
  onSubmitDeliveryRequest: (req: CourierDeliveryRequest) => Promise<void>;
  onUpdateRequestStatus: (reqId: string, status: CourierDeliveryRequest['status']) => Promise<void>;
}

export default function CourierSystemModal({
  isOpen,
  mode,
  onClose,
  config,
  provinces,
  applications,
  requests,
  currentUserId,
  currentUserName,
  currentUserNationalId = '',
  currentUserPhone = '',
  currentUserProvince = '',
  targetProduct,
  myApplication,
  whatsappLaunchMode = 'app',
  onRequireLogin,
  onSubmitApplication,
  onSubmitDeliveryRequest,
  onUpdateRequestStatus,
}: CourierSystemModalProps) {
  const [activeMode, setActiveMode] = useState<CourierModalMode>(mode);
  React.useEffect(() => {
    setActiveMode(mode);
  }, [mode, isOpen]);

  // فلاتر دليل المناديب النشطين
  const [filterProvince, setFilterProvince] = useState<string>(targetProduct?.province || 'الكل');
  const [filterSizeId, setFilterSizeId] = useState<string>('all');
  const [selectedCourier, setSelectedCourier] = useState<CourierApplicationItem | null>(null);

  // حقول نافذة طلب مندوب للمشتري
  const [requesterName, setRequesterName] = useState(currentUserName);
  const [requesterPhone, setRequesterPhone] = useState(currentUserPhone);
  const [pickupProvince, setPickupProvince] = useState(targetProduct?.province || provinces[0] || 'دمشق');
  const [dropoffProvince, setDropoffProvince] = useState(currentUserProvince || provinces[0] || 'دمشق');
  const [detailedAddress, setDetailedAddress] = useState('');
  const [itemDescription, setItemDescription] = useState(targetProduct?.title || '');
  const [feePayer, setFeePayer] = useState<'buyer' | 'seller' | 'split'>('buyer');
  const [feeAgreementMode, setFeeAgreementMode] = useState<'direct_negotiation' | 'proposed_amount'>('direct_negotiation');
  const [proposedFeeAmount, setProposedFeeAmount] = useState('');
  const [requestSubmitting, setRequestSubmitting] = useState(false);
  const [requestError, setRequestError] = useState<string | null>(null);
  const [requestSuccessMsg, setRequestSuccessMsg] = useState<string | null>(null);

  React.useEffect(() => {
    if (isOpen) {
      setFilterProvince(targetProduct?.province || 'الكل');
      setPickupProvince(targetProduct?.province || provinces[0] || 'دمشق');
      setDropoffProvince(currentUserProvince || provinces[0] || 'دمشق');
      setItemDescription(targetProduct?.title || '');
      setRequesterName(currentUserName || '');
      setRequesterPhone(currentUserPhone || '');
      setSelectedCourier(null);
      setRequestError(null);
      setRequestSuccessMsg(null);
    }
  }, [isOpen, targetProduct, currentUserName, currentUserPhone, currentUserProvince, provinces]);

  // حقول التوظيف كمندوب (3 صور هوية وسيلفي + صورة مركبة اختيارية مضغوطة)
  const [applyProvince, setApplyProvince] = useState(currentUserProvince || provinces[0] || 'دمشق');
  const [applyFullName, setApplyFullName] = useState(currentUserName || '');
  const [applyNationalId, setApplyNationalId] = useState(currentUserNationalId || '');
  const [applyPhone, setApplyPhone] = useState(currentUserPhone || '');
  const [applyArea, setApplyArea] = useState('');
  const [applyVehicleSizeId, setApplyVehicleSizeId] = useState(config.vehicleSizes[0]?.id || 'medium');
  const [applyVehicleName, setApplyVehicleName] = useState('');
  const [applyAcceptedPayNote, setApplyAcceptedPayNote] = useState('نقداً عند الاستلام أو حوالة الهرم');
  const [vehiclePhotoUrl, setVehiclePhotoUrl] = useState('');
  const [idFrontPhotoUrl, setIdFrontPhotoUrl] = useState('');
  const [idBackPhotoUrl, setIdBackPhotoUrl] = useState('');
  const [selfieWithIdPhotoUrl, setSelfieWithIdPhotoUrl] = useState('');
  const [uploadingSlot, setUploadingSlot] = useState<string | null>(null);
  const [applyError, setApplyError] = useState<string | null>(null);
  const [applySubmitting, setApplySubmitting] = useState(false);

  const provinceQuotaCheck = useMemo(
    () => canApplyAsCourierInProvince(applications, config, applyProvince),
    [applications, config, applyProvince]
  );

  const activeCouriers = useMemo(
    () =>
      filterActiveCouriers(applications, {
        province: filterProvince,
        vehicleSizeId: filterSizeId,
      }),
    [applications, filterProvince, filterSizeId]
  );

  const myIncomingRequests = useMemo(
    () =>
      requests.filter(
        (r) =>
          (myApplication && r.courierId === myApplication.id) ||
          (currentUserId && r.courierUserId === currentUserId)
      ),
    [requests, myApplication, currentUserId]
  );

  if (!isOpen) return null;

  const handleCompressAndUpload = async (
    slot: 'vehicle' | 'id_front' | 'id_back' | 'selfie',
    file?: File | null
  ) => {
    if (!file) return;
    setUploadingSlot(slot);
    setApplyError(null);
    try {
      const url = await uploadImageToSupabase(
        file,
        config.imageMaxWidth || 1000,
        config.imageQuality || 0.72
      );
      if (slot === 'vehicle') setVehiclePhotoUrl(url);
      if (slot === 'id_front') setIdFrontPhotoUrl(url);
      if (slot === 'id_back') setIdBackPhotoUrl(url);
      if (slot === 'selfie') setSelfieWithIdPhotoUrl(url);
    } catch {
      setApplyError('تعذر ضغط ورفع الصورة، يرجى المحاولة بصورة أخرى.');
    } finally {
      setUploadingSlot(null);
    }
  };

  const handleApplySubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentUserId) {
      onRequireLogin();
      return;
    }
    if (!provinceQuotaCheck.allowed) {
      setApplyError(provinceQuotaCheck.message || config.provinceFullMessage);
      return;
    }
    const validation = validateCourierApplicationInput(
      {
        fullName: applyFullName,
        nationalId: applyNationalId,
        phone: applyPhone,
        province: applyProvince,
        vehicleSizeId: applyVehicleSizeId,
        vehicleNameModel: applyVehicleName,
        vehiclePhotoUrl,
        idFrontPhotoUrl,
        idBackPhotoUrl,
        selfieWithIdPhotoUrl,
      },
      config
    );
    if (!validation.valid) {
      setApplyError(validation.error || 'يرجى استكمال كافة الحقول المطلوبة');
      return;
    }

    setApplySubmitting(true);
    setApplyError(null);
    try {
      const newApp: CourierApplicationItem = {
        id: `cour_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
        userId: currentUserId,
        fullName: applyFullName.trim(),
        nationalId: applyNationalId.replace(/[^0-9]/g, ''),
        phone: applyPhone.trim(),
        province: applyProvince,
        areaDetails: applyArea.trim() || undefined,
        vehicleSizeId: applyVehicleSizeId,
        vehicleNameModel: applyVehicleName.trim(),
        vehiclePhotoUrl: vehiclePhotoUrl || undefined,
        idFrontPhotoUrl,
        idBackPhotoUrl,
        selfieWithIdPhotoUrl,
        acceptedPaymentNote: applyAcceptedPayNote.trim() || undefined,
        status: 'pending', // ينتظر موافقة الإدارة دائماً
        isOnline: false,
        createdAt: new Date().toISOString(),
      };
      await onSubmitApplication(newApp);
    } finally {
      setApplySubmitting(false);
    }
  };

  const handleSendDeliveryRequest = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedCourier) return;
    if (!requesterName.trim() || !requesterPhone.trim() || !detailedAddress.trim()) {
      setRequestError('يرجى كتابة الاسم ورقم الهاتف والعنوان التفصيلي بوضوح.');
      return;
    }
    setRequestSubmitting(true);
    setRequestError(null);
    try {
      const req: CourierDeliveryRequest = {
        id: `creq_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
        courierId: selectedCourier.id,
        courierUserId: selectedCourier.userId,
        courierName: selectedCourier.fullName,
        requesterUserId: currentUserId,
        requesterName: requesterName.trim(),
        requesterPhone: requesterPhone.trim(),
        productId: targetProduct?.id || null,
        productTitle: targetProduct?.title || null,
        pickupProvince,
        dropoffProvince,
        detailedAddress: detailedAddress.trim(),
        itemDescription: itemDescription.trim() || targetProduct?.title || 'قطعة / طلب توصيل',
        vehicleSizeId: selectedCourier.vehicleSizeId,
        feePayer,
        feeAgreementMode,
        proposedFeeAmount:
          feeAgreementMode === 'proposed_amount' ? proposedFeeAmount.trim() : undefined,
        status: 'new',
        createdAt: new Date().toISOString(),
      };
      await onSubmitDeliveryRequest(req);
      setRequestSuccessMsg(`تم إرسال طلبك بنجاح إلى المندوب (${selectedCourier.fullName})!`);
      setSelectedCourier(null);
      setDetailedAddress('');
    } catch {
      setRequestError('حدث خطأ أثناء إرسال الطلب، يرجى المحاولة مجدداً.');
    } finally {
      setRequestSubmitting(false);
    }
  };

  const getVehicleLabel = (id: string) =>
    config.vehicleSizes.find((v) => v.id === id)?.label || id;

  return (
    <div
      dir="rtl"
      className="fixed inset-0 z-50 bg-black/65 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4"
      onClick={onClose}
    >
      <div
        className="w-full max-w-2xl max-h-[90vh] bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-2xl overflow-hidden flex flex-col text-right"
        onClick={(e) => e.stopPropagation()}
      >
        {/* ترويسة النافذة */}
        <div className="px-4 py-3.5 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between bg-slate-50 dark:bg-slate-950/60">
          <div className="flex items-center gap-2">
            <div className="w-9 h-9 rounded-xl bg-emerald-600/15 text-emerald-600 dark:text-emerald-400 flex items-center justify-center">
              <Truck className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-sm font-black text-slate-900 dark:text-white">
                {activeMode === 'directory'
                  ? config.directoryButtonLabel || 'اطلب مندوب'
                  : activeMode === 'apply'
                  ? config.applyButtonLabel || 'انضم كمندوب'
                  : config.incomingRequestsButtonLabel || 'طلبات المستخدمين'}
              </h3>
              <p className="text-[11px] text-slate-500 dark:text-slate-400">
                توصيل القطع والبضائع بين المحافظات عبر مناديب معتمدين
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            aria-label="إغلاق"
            className="p-1.5 rounded-xl text-slate-400 hover:text-slate-700 dark:hover:text-white hover:bg-slate-200/60 dark:hover:bg-slate-800 cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* شريط التبديل السريع */}
        <div className="px-4 py-2 border-b border-slate-100 dark:border-slate-800 flex items-center gap-2 overflow-x-auto bg-white dark:bg-slate-900">
          <button
            type="button"
            onClick={() => setActiveMode('directory')}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold whitespace-nowrap cursor-pointer ${
              activeMode === 'directory'
                ? 'bg-emerald-600 text-white'
                : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300'
            }`}
          >
            {config.directoryButtonLabel || 'دليل المناديب النشطين'}
          </button>
          <button
            type="button"
            onClick={() => setActiveMode('apply')}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold whitespace-nowrap cursor-pointer ${
              activeMode === 'apply'
                ? 'bg-emerald-600 text-white'
                : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300'
            }`}
          >
            {config.applyButtonLabel || 'طلب توظيف كمندوب'}
          </button>
          {myApplication?.status === 'approved' && (
            <button
              type="button"
              onClick={() => setActiveMode('inbox')}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold whitespace-nowrap cursor-pointer flex items-center gap-1.5 ${
                activeMode === 'inbox'
                  ? 'bg-emerald-600 text-white'
                  : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300'
              }`}
            >
              <Inbox className="w-3.5 h-3.5" />
              <span>{config.incomingRequestsButtonLabel || 'طلبات المستخدمين'}</span>
              {myIncomingRequests.filter((r) => r.status === 'new').length > 0 && (
                <span className="px-1.5 py-0.2 rounded-full bg-amber-400 text-slate-950 text-[10px] font-black">
                  {myIncomingRequests.filter((r) => r.status === 'new').length}
                </span>
              )}
            </button>
          )}
        </div>

        {/* جسم النافذة */}
        <div className="p-4 overflow-y-auto space-y-4 flex-1">
          {/* رسالة إخلاء المسؤولية عن الأجرة دائماً */}
          <div className="rounded-xl bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800/60 p-3 text-[11px] font-semibold text-amber-800 dark:text-amber-300 flex items-start gap-2">
            <ShieldAlert className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
            <span>{config.feeDisclaimerText}</span>
          </div>

          {/* 1. دليل المناديب النشطين + نافذة الطلب */}
          {activeMode === 'directory' && (
            <div className="space-y-4">
              {requestSuccessMsg && (
                <div className="rounded-xl bg-emerald-50 dark:bg-emerald-950/50 border border-emerald-200 dark:border-emerald-800 p-3 text-xs font-bold text-emerald-700 dark:text-emerald-300 flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 shrink-0" />
                  <span>{requestSuccessMsg}</span>
                </div>
              )}

              {selectedCourier ? (
                <form onSubmit={handleSendDeliveryRequest} className="space-y-3 bg-slate-50 dark:bg-slate-950/60 border border-slate-200 dark:border-slate-800 rounded-2xl p-4">
                  <div className="flex items-center justify-between">
                    <h4 className="text-xs font-black text-slate-900 dark:text-white">
                      إرسال طلب توصيل إلى: {selectedCourier.fullName} ({selectedCourier.vehicleNameModel})
                    </h4>
                    <button
                      type="button"
                      onClick={() => setSelectedCourier(null)}
                      className="text-xs text-slate-500 hover:text-slate-800 dark:hover:text-white underline cursor-pointer"
                    >
                      تغيير المندوب
                    </button>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                    <div>
                      <label className="block font-bold text-slate-600 dark:text-slate-300 mb-1">اسمك الكامل:</label>
                      <input
                        type="text"
                        required
                        value={requesterName}
                        onChange={(e) => setRequesterName(e.target.value)}
                        className="w-full rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 px-3 py-2 text-slate-900 dark:text-white"
                      />
                    </div>
                    <div>
                      <label className="block font-bold text-slate-600 dark:text-slate-300 mb-1">رقم هاتفك / واتساب:</label>
                      <input
                        type="text"
                        required
                        value={requesterPhone}
                        onChange={(e) => setRequesterPhone(e.target.value)}
                        placeholder="09xxxxxxxx"
                        className="w-full rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 px-3 py-2 text-slate-900 dark:text-white"
                      />
                    </div>
                    <div>
                      <label className="block font-bold text-slate-600 dark:text-slate-300 mb-1">محافظة الاستلام (البائع/القطعة):</label>
                      <select
                        value={pickupProvince}
                        onChange={(e) => setPickupProvince(e.target.value)}
                        className="w-full rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 px-3 py-2 text-slate-900 dark:text-white"
                      >
                        {provinces.map((p) => (
                          <option key={p} value={p}>{p}</option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <label className="block font-bold text-slate-600 dark:text-slate-300 mb-1">محافظة التوصيل (موقعك):</label>
                      <select
                        value={dropoffProvince}
                        onChange={(e) => setDropoffProvince(e.target.value)}
                        className="w-full rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 px-3 py-2 text-slate-900 dark:text-white"
                      >
                        {provinces.map((p) => (
                          <option key={p} value={p}>{p}</option>
                        ))}
                      </select>
                    </div>
                  </div>

                  <div className="text-xs">
                    <label className="block font-bold text-slate-600 dark:text-slate-300 mb-1">
                      عنوانك بالتفصيل (بلهجتك وبوصف دقيق ليسهل الوصول إليك):
                    </label>
                    <textarea
                      rows={2}
                      required
                      value={detailedAddress}
                      onChange={(e) => setDetailedAddress(e.target.value)}
                      placeholder="مثال: حي الوعر - شارع السد - مقابل فرن كذا، البناء الثاني..."
                      className="w-full rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 px-3 py-2 text-slate-900 dark:text-white"
                    />
                  </div>

                  <div className="text-xs">
                    <label className="block font-bold text-slate-600 dark:text-slate-300 mb-1">وصف القطعة أو الإعلان:</label>
                    <input
                      type="text"
                      value={itemDescription}
                      onChange={(e) => setItemDescription(e.target.value)}
                      placeholder="مثال: شاشة تلفاز 43 بوصة / طرد قطع غيار..."
                      className="w-full rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 px-3 py-2 text-slate-900 dark:text-white"
                    />
                  </div>

                  {/* خيارات الأجرة المباشرة */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs pt-1">
                    <div>
                      <label className="block font-bold text-slate-600 dark:text-slate-300 mb-1">من يدفع أجرة المندوب؟</label>
                      <select
                        value={feePayer}
                        onChange={(e) => setFeePayer(e.target.value as 'buyer' | 'seller' | 'split')}
                        className="w-full rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 px-3 py-2 text-slate-900 dark:text-white"
                      >
                        <option value="buyer">المشتري (عند الاستلام)</option>
                        <option value="seller">البائع (عند التسليم)</option>
                        <option value="split">بالاتفاق بين البائع والمشتري</option>
                      </select>
                    </div>
                    <div>
                      <label className="block font-bold text-slate-600 dark:text-slate-300 mb-1">طريقة الاتفاق على الأجرة:</label>
                      <select
                        value={feeAgreementMode}
                        onChange={(e) =>
                          setFeeAgreementMode(e.target.value as 'direct_negotiation' | 'proposed_amount')
                        }
                        className="w-full rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 px-3 py-2 text-slate-900 dark:text-white"
                      >
                        <option value="direct_negotiation">بالاتفاق المباشر عبر واتساب/الهاتف</option>
                        <option value="proposed_amount">تحديد أجرة مقترحة من المشتري</option>
                      </select>
                    </div>
                  </div>

                  {feeAgreementMode === 'proposed_amount' && (
                    <div className="text-xs">
                      <input
                        type="text"
                        value={proposedFeeAmount}
                        onChange={(e) => setProposedFeeAmount(e.target.value)}
                        placeholder="أدخل الأجرة المقترحة (مثال: 150,000 ل.س أو 12$)"
                        className="w-full rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 px-3 py-2 text-slate-900 dark:text-white"
                      />
                    </div>
                  )}

                  {/* تهيئة بوابة الدفع المستقبلية — لا تظهر نشطة إلا إذا فُعّلت من الإدارة */}
                  {config.paymentPrep?.enabled && (
                    <div className="rounded-xl bg-indigo-50 dark:bg-indigo-950/40 border border-indigo-200 dark:border-indigo-800 p-3 text-xs text-indigo-800 dark:text-indigo-200 flex items-center gap-2">
                      <CreditCard className="w-4 h-4 shrink-0" />
                      <span>{config.paymentPrep.futureNoticeText}</span>
                    </div>
                  )}

                  {requestError && (
                    <div className="text-xs text-rose-600 font-bold">{requestError}</div>
                  )}

                  <button
                    type="submit"
                    disabled={requestSubmitting}
                    className="w-full py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-black flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
                  >
                    <Send className="w-4 h-4" />
                    <span>{requestSubmitting ? 'جاري إرسال الطلب...' : 'تأكيد وإرسال طلب المندوب'}</span>
                  </button>
                </form>
              ) : (
                <>
                  {/* فلاتر البحث للمشتري */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 text-xs">
                    <select
                      value={filterProvince}
                      onChange={(e) => setFilterProvince(e.target.value)}
                      className="rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 px-3 py-2 font-bold text-slate-800 dark:text-slate-100"
                    >
                      <option value="الكل">كل المحافظات</option>
                      {provinces.map((p) => (
                        <option key={p} value={p}>{p}</option>
                      ))}
                    </select>

                    <select
                      value={filterSizeId}
                      onChange={(e) => setFilterSizeId(e.target.value)}
                      className="rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 px-3 py-2 font-bold text-slate-800 dark:text-slate-100"
                    >
                      <option value="all">كل أحجام المركبات</option>
                      {config.vehicleSizes.map((sz) => (
                        <option key={sz.id} value={sz.id}>{sz.label}</option>
                      ))}
                    </select>
                  </div>

                  {/* قائمة عمودية للمناديب النشطين فقط */}
                  {activeCouriers.length === 0 ? (
                    <div className="text-center py-10 text-xs text-slate-500 dark:text-slate-400 bg-slate-50 dark:bg-slate-950/50 rounded-2xl border border-slate-200/70 dark:border-slate-800">
                      لا يوجد مناديب نشطون متاحون حالياً ضمن الفلتر المحدد.
                    </div>
                  ) : (
                    <div className="space-y-3">
                      {activeCouriers.map((courier) => (
                        <div
                          key={courier.id}
                          className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950/60 p-3.5 flex flex-col sm:flex-row sm:items-center justify-between gap-3"
                        >
                          <div className="flex items-start gap-3">
                            {courier.vehiclePhotoUrl ? (
                              <img
                                src={courier.vehiclePhotoUrl}
                                alt={courier.vehicleNameModel}
                                className="w-16 h-16 rounded-xl object-cover border border-slate-200 dark:border-slate-700 shrink-0"
                              />
                            ) : (
                              <div className="w-14 h-14 rounded-xl bg-emerald-50 dark:bg-emerald-950/60 border border-emerald-200 dark:border-emerald-800 flex items-center justify-center text-emerald-600 shrink-0">
                                <Car className="w-6 h-6" />
                              </div>
                            )}
                            <div className="space-y-1 text-xs">
                              <div className="flex items-center gap-2 flex-wrap">
                                <span className="font-black text-slate-900 dark:text-white text-sm">
                                  {courier.fullName}
                                </span>
                                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-emerald-50 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-300 text-[10px] font-black">
                                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                                  متاح الآن
                                </span>
                              </div>
                              <div className="text-slate-600 dark:text-slate-300 flex items-center gap-1.5">
                                <MapPin className="w-3.5 h-3.5 text-slate-400" />
                                <span>{courier.province}{courier.areaDetails ? ` • ${courier.areaDetails}` : ''}</span>
                              </div>
                              <div className="text-slate-700 dark:text-slate-200 font-bold">
                                {getVehicleLabel(courier.vehicleSizeId)} — {courier.vehicleNameModel}
                              </div>
                              {courier.acceptedPaymentNote && (
                                <div className="text-[11px] text-slate-500">{courier.acceptedPaymentNote}</div>
                              )}
                            </div>
                          </div>

                          <button
                            type="button"
                            onClick={() => setSelectedCourier(courier)}
                            className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-black shrink-0 cursor-pointer"
                          >
                            اطلب هذا المندوب
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
                </>
              )}
            </div>
          )}

          {/* 2. نموذج التوظيف للمندوب (3 صور هوية وسيلفي + صورة مركبة اختيارية مضغوطة + كوتا المحافظة) */}
          {activeMode === 'apply' && (
            <div className="space-y-4">
              {myApplication ? (
                <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950/60 p-5 text-center space-y-2">
                  <div className="w-12 h-12 rounded-full bg-amber-100 dark:bg-amber-950 text-amber-600 flex items-center justify-center mx-auto">
                    {myApplication.status === 'approved' ? (
                      <CheckCircle2 className="w-6 h-6 text-emerald-600" />
                    ) : (
                      <Clock className="w-6 h-6" />
                    )}
                  </div>
                  <h4 className="font-black text-sm text-slate-900 dark:text-white">
                    {myApplication.status === 'approved'
                      ? 'تم اعتماد حسابك كمندوب بنجاح'
                      : myApplication.status === 'pending'
                      ? 'طلب التوظيف قيد المراجعة لدى الإدارة'
                      : myApplication.status === 'suspended'
                      ? 'تم تعليق حساب المندوب مؤقتاً'
                      : 'تم رفض طلب التوظيف'}
                  </h4>
                  <p className="text-xs text-slate-500 dark:text-slate-400">
                    {myApplication.status === 'pending'
                      ? 'سيظهر حسابك كمندوب بمجرد مراجعة الصور والموافقة عليه من الإدارة.'
                      : myApplication.rejectionReason || `المحافظة: ${myApplication.province} • المركبة: ${myApplication.vehicleNameModel}`}
                  </p>
                </div>
              ) : (
                <form onSubmit={handleApplySubmit} className="space-y-3.5 text-xs">
                  <div>
                    <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">اختر المحافظة التي ستعمل بها:</label>
                    <select
                      value={applyProvince}
                      onChange={(e) => setApplyProvince(e.target.value)}
                      className="w-full rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 px-3 py-2 font-bold text-slate-900 dark:text-white"
                    >
                      {provinces.map((p) => (
                        <option key={p} value={p}>{p}</option>
                      ))}
                    </select>
                  </div>

                  {!provinceQuotaCheck.allowed ? (
                    <div className="rounded-2xl bg-rose-50 dark:bg-rose-950/50 border border-rose-300 dark:border-rose-800 p-4 text-rose-700 dark:text-rose-300 font-bold flex items-start gap-2.5">
                      <AlertTriangle className="w-5 h-5 shrink-0 text-rose-600" />
                      <div className="space-y-1">
                        <div>{provinceQuotaCheck.message}</div>
                        <div className="text-[11px] opacity-80">
                          العدد الحالي في {applyProvince}: {provinceQuotaCheck.approvedCount} / {provinceQuotaCheck.maxQuota}
                        </div>
                      </div>
                    </div>
                  ) : (
                    <>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        <div>
                          <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">الاسم الثلاثي الكامل:</label>
                          <input
                            type="text"
                            required
                            value={applyFullName}
                            onChange={(e) => setApplyFullName(e.target.value)}
                            className="w-full rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 px-3 py-2 text-slate-900 dark:text-white"
                          />
                        </div>
                        <div>
                          <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">الرقم الوطني (11 رقماً):</label>
                          <input
                            type="text"
                            required
                            maxLength={11}
                            value={applyNationalId}
                            onChange={(e) => setApplyNationalId(e.target.value)}
                            placeholder="01234567890"
                            className="w-full rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 px-3 py-2 text-slate-900 dark:text-white"
                          />
                        </div>
                        <div>
                          <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">رقم الهاتف / واتساب:</label>
                          <input
                            type="text"
                            required
                            value={applyPhone}
                            onChange={(e) => setApplyPhone(e.target.value)}
                            placeholder="09xxxxxxxx"
                            className="w-full rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 px-3 py-2 text-slate-900 dark:text-white"
                          />
                        </div>
                        <div>
                          <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">المنطقة / الحي (اختياري):</label>
                          <input
                            type="text"
                            value={applyArea}
                            onChange={(e) => setApplyArea(e.target.value)}
                            placeholder="مثال: وسط المدينة / القصور"
                            className="w-full rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 px-3 py-2 text-slate-900 dark:text-white"
                          />
                        </div>
                        <div>
                          <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">حجم وفئة المركبة:</label>
                          <select
                            value={applyVehicleSizeId}
                            onChange={(e) => setApplyVehicleSizeId(e.target.value)}
                            className="w-full rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 px-3 py-2 text-slate-900 dark:text-white"
                          >
                            {config.vehicleSizes.map((sz) => (
                              <option key={sz.id} value={sz.id}>{sz.label}</option>
                            ))}
                          </select>
                        </div>
                        <div>
                          <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">اسم ونوع السيارة / الدراجة:</label>
                          <input
                            type="text"
                            required
                            value={applyVehicleName}
                            onChange={(e) => setApplyVehicleName(e.target.value)}
                            placeholder="مثال: كيا ريو 2012 أو دراجة بارت"
                            className="w-full rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 px-3 py-2 text-slate-900 dark:text-white"
                          />
                        </div>
                      </div>

                      <div>
                        <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">طريقة استلام الأجرة المفضلة لديك من العملاء:</label>
                        <input
                          type="text"
                          value={applyAcceptedPayNote}
                          onChange={(e) => setApplyAcceptedPayNote(e.target.value)}
                          className="w-full rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 px-3 py-2 text-slate-900 dark:text-white"
                        />
                      </div>

                      {/* رسالة الملاحظة الحمراء قبل رفع صور الهوية الـ 3 */}
                      <div className="rounded-xl bg-rose-50 dark:bg-rose-950/50 border-2 border-rose-400 dark:border-rose-700 p-3 text-xs font-black text-rose-700 dark:text-rose-300 flex items-start gap-2">
                        <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
                        <span>{config.photoClarityWarningText}</span>
                      </div>

                      {/* الصور الـ 3 للهوية والسيلفي + صورة المركبة الاختيارية */}
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        {[
                          { key: 'id_front' as const, label: '1. صورة الوجه الأمامي للهوية *', url: idFrontPhotoUrl, required: true },
                          { key: 'id_back' as const, label: '2. صورة الوجه الخلفي للهوية *', url: idBackPhotoUrl, required: true },
                          { key: 'selfie' as const, label: '3. صورة سيلفي واضحة وأنت تحمل الهوية بجانب وجهك *', url: selfieWithIdPhotoUrl, required: true },
                          {
                            key: 'vehicle' as const,
                            label: config.vehiclePhotoOptional ? '4. صورة المركبة (اختياري — تضغط تلقائياً)' : '4. صورة المركبة *',
                            url: vehiclePhotoUrl,
                            required: !config.vehiclePhotoOptional,
                          },
                        ].map((slot) => (
                          <label
                            key={slot.key}
                            className="flex flex-col justify-between p-3 rounded-xl border border-dashed border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-950/60 cursor-pointer hover:border-emerald-500 transition"
                          >
                            <span className="font-bold text-slate-700 dark:text-slate-200 mb-2 flex items-center gap-1.5">
                              <Camera className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                              <span>{slot.label}</span>
                            </span>
                            {uploadingSlot === slot.key ? (
                              <span className="text-[11px] text-emerald-600 flex items-center gap-1">
                                <Loader2 className="w-3.5 h-3.5 animate-spin" />
                                جاري ضغط الصورة ورفعها...
                              </span>
                            ) : slot.url ? (
                              <div className="flex items-center gap-2">
                                <img src={slot.url} alt={slot.label} className="w-12 h-12 rounded-lg object-cover border" />
                                <span className="text-[11px] text-emerald-600 font-bold">تم الرفع بالضغط بنجاح ✓</span>
                              </div>
                            ) : (
                              <span className="text-[11px] text-slate-400">اضغط لاختيار الصورة...</span>
                            )}
                            <input
                              type="file"
                              accept="image/*"
                              className="hidden"
                              onChange={(e) => void handleCompressAndUpload(slot.key, e.target.files?.[0])}
                            />
                          </label>
                        ))}
                      </div>

                      {applyError && (
                        <div className="rounded-xl bg-rose-50 dark:bg-rose-950/50 border border-rose-200 p-2.5 text-rose-600 font-bold">
                          {applyError}
                        </div>
                      )}

                      <button
                        type="submit"
                        disabled={applySubmitting || Boolean(uploadingSlot)}
                        className="w-full py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-black text-xs cursor-pointer disabled:opacity-50"
                      >
                        {applySubmitting ? 'جاري إرسال طلب التوظيف...' : 'إرسال طلب التوظيف وانتظار موافقة الإدارة'}
                      </button>
                    </>
                  )}
                </form>
              )}
            </div>
          )}

          {/* 3. صندوق «طلبات المستخدمين» للمندوب المعتمد */}
          {activeMode === 'inbox' && (
            <div className="space-y-3">
              {myIncomingRequests.length === 0 ? (
                <div className="text-center py-10 text-xs text-slate-500">
                  لا توجد طلبات توصيل واردة حالياً. تأكد من تفعيل حالة «متاح الآن» لتظهر للمشترين.
                </div>
              ) : (
                myIncomingRequests.map((req) => (
                  <div
                    key={req.id}
                    className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950/60 p-3.5 space-y-2 text-xs"
                  >
                    <div className="flex items-center justify-between gap-2">
                      <span className="font-black text-slate-900 dark:text-white">{req.requesterName}</span>
                      <span className="px-2 py-0.5 rounded-full text-[10px] font-black bg-emerald-500/15 text-emerald-700 dark:text-emerald-300">
                        {req.status === 'new'
                          ? 'طلب جديد'
                          : req.status === 'accepted'
                          ? 'تم القبول'
                          : req.status === 'completed'
                          ? 'مكتمل'
                          : 'معتذر عنه'}
                      </span>
                    </div>
                    <div className="text-slate-600 dark:text-slate-300">
                      القطعة: <strong>{req.productTitle || req.itemDescription}</strong>
                    </div>
                    <div className="text-slate-600 dark:text-slate-300">
                      المسار: <strong>{req.pickupProvince}</strong> ← <strong>{req.dropoffProvince}</strong>
                    </div>
                    <div className="text-slate-700 dark:text-slate-200 bg-white dark:bg-slate-900 p-2 rounded-lg border border-slate-200 dark:border-slate-800">
                      العنوان التفصيلي: {req.detailedAddress}
                    </div>
                    <div className="text-slate-500">
                      الأجرة:{' '}
                      {req.feePayer === 'buyer'
                        ? 'على المشتري'
                        : req.feePayer === 'seller'
                        ? 'على البائع'
                        : 'بالاتفاق'}{' '}
                      {req.proposedFeeAmount ? `(${req.proposedFeeAmount})` : '(بالاتفاق المباشر)'}
                    </div>

                    <div className="flex flex-wrap items-center gap-2 pt-1">
                      <a
                        href={formatWhatsappUrl(req.requesterPhone, whatsappLaunchMode)}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="px-3 py-1.5 rounded-lg bg-emerald-600 text-white font-bold flex items-center gap-1"
                      >
                        <MessageCircle className="w-3.5 h-3.5" />
                        <span>واتساب</span>
                      </a>
                      <a
                        href={formatDirectCallUrl(req.requesterPhone)}
                        className="px-3 py-1.5 rounded-lg bg-slate-200 dark:bg-slate-800 text-slate-800 dark:text-white font-bold flex items-center gap-1"
                      >
                        <Phone className="w-3.5 h-3.5" />
                        <span>اتصال</span>
                      </a>
                      {req.status === 'new' && (
                        <>
                          <button
                            type="button"
                            onClick={() => void onUpdateRequestStatus(req.id, 'accepted')}
                            className="px-3 py-1.5 rounded-lg bg-indigo-600 text-white font-bold cursor-pointer"
                          >
                            قبول الطلب
                          </button>
                          <button
                            type="button"
                            onClick={() => void onUpdateRequestStatus(req.id, 'declined')}
                            className="px-3 py-1.5 rounded-lg bg-rose-600 text-white font-bold cursor-pointer"
                          >
                            اعتذار
                          </button>
                        </>
                      )}
                      {req.status === 'accepted' && (
                        <button
                          type="button"
                          onClick={() => void onUpdateRequestStatus(req.id, 'completed')}
                          className="px-3 py-1.5 rounded-lg bg-emerald-700 text-white font-bold cursor-pointer"
                        >
                          تم التوصيل بنجاح
                        </button>
                      )}
                    </div>
                  </div>
                ))
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
