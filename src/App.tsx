/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useRef, useEffect, useMemo } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  Home,
  Plus,
  User,
  Bell,
  Settings,
  Package,
  Eye,
  Share2,
  X,
  ArrowRight,
  PlusCircle,
  Camera,
  Image as ImageIcon,
  MapPin,
  Trash2,
  MessageCircle,
  LogOut,
  LogIn,
  UserPlus,
  Loader2,
  CheckCircle2,
  AlertCircle,
  Clock,
  Search,
  ShieldAlert,
  RefreshCw,
  Coins,
  TrendingUp,
  Sparkles,
  Wrench,
  PhoneCall,
  Send,
  Facebook,
  ShieldCheck,
  Gift,
  Star,
  Heart,
  ShoppingBag,
  Tag,
  ExternalLink,
  Info,
  Megaphone,
  Flame,
  Award,
  Globe,
  Phone,
  ChevronLeft,
  ChevronRight,
  Pencil,
  Truck,
  Inbox,
  Wallet,
  Crown,
} from 'lucide-react';
import { supabase } from './lib/supabase';
import { uploadImageToSupabase, compressImage } from './lib/storage';
import {
  filterProducts,
  serializeProductImages,
  parseProductImages,
  formatPriceWithCurrency,
  formatTimeAgo,
  formatWhatsappUrl,
  formatDirectCallUrl,
  DEFAULT_MARKET_RULES,
  DEFAULT_COURIER_CONFIG,
  DEFAULT_WALLET_CONFIG,
  filterCustomFieldsByCategory,
  encodeCustomSpecsIntoDescription,
  extractCustomSpecsFromDescription,
  checkBannedKeywords,
  isAdExpired,
  filterWidgetsByContext,
  filterActiveBanners,
  getActiveFeaturedMap,
  resolveSellerVerificationBadge,
  sortMarketplaceProducts,
  ensureUserWalletRecord,
  isUserVerificationActive,
  canAcceptNewMerchantSubscription,
  applyWelcomeBonusIfEligible,
  spendWalletPoints,
  activateMerchantPlanForWallet,
  getUserPostingEntitlement,
  buildExpiryInAppNotification,
  resolveEffectiveBanState,
  formatRemainingBanTime,
  resolveEffectiveUserTier,
  type BannedUserCloudRecord,
  type ProductItem,
  type MarketRulesConfig,
  type PromotionalBannerSlide,
  type FeaturedPromotionItem,
  type VerificationTier,
  type EngagementStatsMap,
  type CloudFieldItem,
  type CourierServiceConfig,
  type CourierApplicationItem,
  type CourierDeliveryRequest,
  type WalletMonetizationConfig,
  type UserWalletRecord,
  type WalletPaymentRequest,
  type MerchantSubscriptionPlan,
  type StarFeaturePlan,
} from './lib/marketplace';
import AuthModal from './components/AuthModal';
import ProductCard, {
  type CloudCardConfig,
  type BadgeAppearanceConfig,
} from './components/ProductCard';
import ImageLightboxModal from './components/ImageLightboxModal';
import SettingsModal, { type SortOrderOption } from './components/SettingsModal';
import CourierSystemModal, { type CourierModalMode } from './components/CourierSystemModal';
import WalletModal from './components/WalletModal';
import type { User as SupabaseUser } from '@supabase/supabase-js';

interface AdminNotification {
  id: string;
  title: string;
  message: string;
  created_at?: string;
  date?: string;
  is_read?: boolean;
}

// هيكلية الأقسام والأقسام الفرعية التابعة لكل قسم
interface CategoryDefinition {
  id: string;
  name: string;
  subCategories: string[];
}

export default function App() {
  const [activeTab, setActiveTab] = useState<string>('home');
  const [showSettingsModal, setShowSettingsModal] = useState(false);

  interface NavItemConfig {
    id: string;
    key: string;
    label: string;
    iconName: string;
    is_visible: boolean;
    order: number;
    badgeText?: string | null;
    is_primary_action?: boolean;
    actionUrl?: string | null;
    customPageTitle?: string | null;
    customPageContent?: string | null;
    customTitle?: string | null;
    customDescription?: string | null;
    customButtonText?: string | null;
    customButtonUrl?: string | null;
    activeColor?: string | null;
    features?: Record<string, boolean>;
  }
  interface CloudThemeConfig {
    primaryColor?: string;
    primaryHoverColor?: string;
    backgroundColor?: string;
    darkBackgroundColor?: string;
    headerBgColor?: string;
    headerTextColor?: string;
    bottomNavBgColor?: string;
    bottomNavTextColor?: string;
    cardBgColor?: string;
    borderRadius?: 'none' | 'md' | 'xl' | '2xl';
    gridColumns?: 1 | 2 | 3 | 4;
    forcedTheme?: 'auto' | 'light' | 'dark';
    customCss?: string;
    verifiedBadge?: BadgeAppearanceConfig;
    featuredBadge?: BadgeAppearanceConfig;
    verificationTiers?: VerificationTier[];
  }
  interface CloudUIConfig {
    appNameAr?: string;
    appNameEn?: string;
    appLogoUrl?: string;
    headerLayout?: {
      showHeader?: boolean;
      showBottomNav?: boolean;
      loginBtnPosition?: 'right' | 'left' | 'hidden';
      notificationsBtnPosition?: 'left' | 'right' | 'hidden';
      settingsBtnPosition?: 'left' | 'right' | 'hidden';
      brandPosition?: 'center' | 'right' | 'left';
      showSearchBar?: boolean;
      showProvinceFilter?: boolean;
      showCategoriesBar?: boolean;
      showSubCategoriesBar?: boolean;
    };
    cardConfig?: CloudCardConfig;
    texts?: Record<string, string>;
  }

  // شريط التنقل يأتي بالكامل من السحاب (يبدأ فارغاً)
  const [navItems, setNavItems] = useState<NavItemConfig[]>([]);

  // جلب التخصيص من سوبابيس لحظياً
  useEffect(() => {
    const fetchNavConfig = async () => {
      try {
        const { data } = await supabase
          .from('app_navigation_config')
          .select('*')
          .order('display_order', { ascending: true });

        if (data && data.length > 0) {
          const mapped = data.map((d: any) => ({
            id: d.id,
            key: d.key,
            label: d.label,
            iconName: d.icon_name,
            is_visible: d.is_visible,
            order: d.display_order,
            badgeText: d.badge_text,
            is_primary_action: d.is_primary_action,
            features: d.features || undefined,
          }));
          setNavItems(mapped);
        }
      } catch (e) {
        // الاعتماد على الترتيب الافتراضي
      }
    };

    fetchNavConfig();

    // الاستماع لأي تحديث لحظي لجدول التخصيص
    const channel = supabase
      .channel('realtime_app_navigation_config')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'app_navigation_config' },
        () => {
          fetchNavConfig();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  // 1. مصفوفة الأقسام قادمة حصراً من السحاب
  const [categoriesData, setCategoriesData] = useState<CategoryDefinition[]>([]);

  // 2. قائمة المحافظات قادمة حصراً من السحاب (__APP_CONFIG_PROVINCES__)
  const [provincesData, setProvincesData] = useState<string[]>([]);

  // 3. مقترحات الإعدادات قادمة من السحاب (__APP_CONFIG_SETTINGS_PROPOSALS__)
  const [settingsProposals, setSettingsProposals] = useState<any[]>([]);
  const [hasCloudProposals, setHasCloudProposals] = useState(false);

  // أسعار الصرف والذهب الحية القادمة من السحابة (__APP_CONFIG_RATES__)
  const [marketRates, setMarketRates] = useState<any>(null);

  // نص وحالة الملاحظة الإدارية (تأتي حصراً من السحاب)
  const [adminNotice, setAdminNotice] = useState<{ active: boolean; text: string }>({
    active: false,
    text: '',
  });

  // قنوات وأرقام الدعم الفني (تأتي حصراً من السحاب بدون أي أرقام افتراضية ثابتة)
  const [supportConfig, setSupportConfig] = useState<{
    whatsapp?: { enabled: boolean; label: string; value: string; defaultMessage?: string };
    telegram?: { enabled: boolean; label: string; value: string };
    facebook?: { enabled: boolean; label: string; value: string };
  } | null>(null);

  // وضع الصيانة العام (يتحكم به تطبيق الإدارة من السحابة حصراً)
  const [maintenanceConfig, setMaintenanceConfig] = useState<{
    enabled: boolean;
    title?: string;
    message?: string;
    estimatedReturnTime?: string;
  }>({
    enabled: false,
  });

  // رسالة الإذاعة العامة اللحظية (Flash Broadcast)
  const [broadcastConfig, setBroadcastConfig] = useState<{
    id: string;
    active: boolean;
    title: string;
    message: string;
    type?: 'urgent' | 'warning' | 'promo' | 'info';
  } | null>(null);

  const [dismissedBroadcastId, setDismissedBroadcastId] = useState<string>(() => {
    try {
      return sessionStorage.getItem('souq_dismissed_broadcast_id') || '';
    } catch {
      return '';
    }
  });

  // معرفات الإعلانات المميزة VIP والجدولة الزمنية لها
  const [featuredProductIds, setFeaturedProductIds] = useState<string[]>([]);
  const [featuredMeta, setFeaturedMeta] = useState<FeaturedPromotionItem[]>([]);

  // قواعد السوق والوسائط والفلترة الذكية من السحابة
  const [marketRules, setMarketRules] = useState<MarketRulesConfig>(DEFAULT_MARKET_RULES);
  // سلايدر البانرات الإعلانية المصوّرة
  const [promotionalBanners, setPromotionalBanners] = useState<PromotionalBannerSlide[]>([]);
  const [carouselIndex, setCarouselIndex] = useState(0);
  // رتب التوثيق المخصصة لكل مستخدم
  const [userTiers, setUserTiers] = useState<Record<string, string>>({});
  // طريقة فتح واتساب المفضلة (App / Web)
  const [whatsappLaunchMode, setWhatsappLaunchMode] = useState<'app' | 'web'>(() => {
    try {
      return localStorage.getItem('souq_syria_whatsapp_mode') === 'web' ? 'web' : 'app';
    } catch {
      return 'app';
    }
  });
  // وضع تعديل إعلان حالي
  const [editingProduct, setEditingProduct] = useState<ProductItem | null>(null);

  // وضع حماية الروبوت (none افتراضياً أو يتم سحبه من الإدارة)
  const [botProtectionMode, setBotProtectionMode] = useState<string>('none');

  // دالة فتح قنوات الدعم مع إخفاء الرقم الفعلي والتحويل التلقائي
  const uiText = (key: string, fallback: string) => {
    const val = uiConfig?.texts?.[key];
    return val && val.trim().length > 0 ? val : fallback;
  };

  const renderCloudIcon = (iconName?: string, className = 'w-4 h-4 shrink-0') => {
    if (!iconName) return null;
    const name = iconName.toLowerCase();
    if (name.includes('whatsapp') || name.includes('message')) return <MessageCircle className={className} />;
    if (name.includes('phone') || name.includes('call')) return <Phone className={className} />;
    if (name.includes('send') || name.includes('telegram')) return <Send className={className} />;
    if (name.includes('sparkle')) return <Sparkles className={className} />;
    if (name.includes('star')) return <Star className={className} />;
    if (name.includes('bell')) return <Bell className={className} />;
    if (name.includes('gift')) return <Gift className={className} />;
    if (name.includes('shield')) return <ShieldCheck className={className} />;
    if (name.includes('link') || name.includes('external')) return <ExternalLink className={className} />;
    if (name.includes('info')) return <Info className={className} />;
    if (name.includes('heart')) return <Heart className={className} />;
    if (name.includes('bag') || name.includes('shop')) return <ShoppingBag className={className} />;
    if (name.includes('tag')) return <Tag className={className} />;
    if (name.includes('coin')) return <Coins className={className} />;
    if (name.includes('plus')) return <Plus className={className} />;
    if (name.includes('user')) return <User className={className} />;
    if (name.includes('setting')) return <Settings className={className} />;
    if (name.includes('home')) return <Home className={className} />;
    if (name.includes('search')) return <Search className={className} />;
    if (name.includes('map')) return <MapPin className={className} />;
    if (name.includes('megaphone')) return <Megaphone className={className} />;
    if (name.includes('flame')) return <Flame className={className} />;
    if (name.includes('award')) return <Award className={className} />;
    if (name.includes('globe')) return <Globe className={className} />;
    if (name.includes('alert')) return <AlertCircle className={className} />;
    return <Sparkles className={className} />;
  };

  const handleWidgetClick = (widget: CustomCloudWidget) => {
    if (widget.actionType === 'create_ad') {
      if (!currentUser) {
        setAuthModalReason('يرجى تسجيل الدخول أو إنشاء حساب جديد لتتمكن من نشر إعلانك في سوق سوريا');
        setAuthModalInitialMode('login');
        setShowAuthModal(true);
      } else {
        setShowCreateScreen(true);
      }
      return;
    }
    if (widget.actionType === 'login') {
      setAuthModalReason(null);
      setAuthModalInitialMode('login');
      setShowAuthModal(true);
      return;
    }
    if (widget.actionType === 'settings') {
      setShowSettingsModal(true);
      return;
    }
    if (widget.actionType === 'notifications') {
      setShowNotifications(true);
      return;
    }
    if (widget.actionType === 'modal') {
      setActiveCloudModal({
        title: widget.modalTitle || widget.label,
        content: widget.modalContent || widget.actionValue || '',
      });
      return;
    }
    if (!widget.actionValue) return;
    if (widget.actionType === 'url') {
      let url = widget.actionValue.trim();
      if (!url.startsWith('http')) url = 'https://' + url;
      window.open(url, '_blank');
    } else if (widget.actionType === 'whatsapp') {
      window.open(formatWhatsappUrl(widget.actionValue, whatsappLaunchMode), '_blank');
    } else if (widget.actionType === 'call') {
      window.open(formatDirectCallUrl(widget.actionValue), '_self');
    } else if (widget.actionType === 'tab') {
      setActiveTab(widget.actionValue);
    } else if (widget.actionType === 'alert') {
      setToastMessage(widget.actionValue);
      setTimeout(() => setToastMessage(null), 3500);
    }
  };

  const handleUpdateWhatsappMode = (mode: 'app' | 'web') => {
    setWhatsappLaunchMode(mode);
    try {
      localStorage.setItem('souq_syria_whatsapp_mode', mode);
    } catch {}
  };

  const handleClearAppCache = () => {
    try {
      sessionStorage.removeItem('souq_dismissed_broadcast_id');
      localStorage.removeItem('souq_syria_sort_order');
      localStorage.removeItem('souq_syria_post_font_scale');
    } catch {}
    setDismissedBroadcastId('');
    setSearchQuery('');
    setFilterProvince('الكل');
    setActiveCategoryName('الكل');
    setActiveSubCategory('الكل');
    setSortOrder(marketRules.defaultSortOrder || 'newest');
    setPostFontScale(marketRules.defaultFontScale || 100);
    fetchCloudConfig();
    fetchProducts();
  };

  const handleBannerAction = (banner: PromotionalBannerSlide) => {
    if (banner.actionType === 'create_ad') {
      if (!currentUser) {
        setAuthModalReason('يرجى تسجيل الدخول أو إنشاء حساب جديد لتتمكن من نشر إعلانك في سوق سوريا');
        setAuthModalInitialMode('login');
        setShowAuthModal(true);
      } else {
        setEditingProduct(null);
        setShowCreateScreen(true);
      }
      return;
    }
    if (banner.actionType === 'category' && banner.actionValue) {
      setActiveTab('home');
      setActiveCategoryName(banner.actionValue);
      setActiveSubCategory('الكل');
      return;
    }
    if (banner.actionType === 'tab' && banner.actionValue) {
      setActiveTab(banner.actionValue);
      return;
    }
    if (banner.actionType === 'whatsapp' && banner.actionValue) {
      window.open(formatWhatsappUrl(banner.actionValue, whatsappLaunchMode), '_blank');
      return;
    }
    if (banner.actionType === 'url' && banner.actionValue) {
      let url = banner.actionValue.trim();
      if (!url.startsWith('http')) url = 'https://' + url;
      window.open(url, '_blank');
    }
  };

  const handleOpenSupport = (channel: 'whatsapp' | 'telegram' | 'facebook') => {
    if (!supportConfig) return;
    if (channel === 'whatsapp' && supportConfig.whatsapp?.value) {
      const cleanPhone = supportConfig.whatsapp.value.replace(/[^0-9]/g, '');
      const msg = encodeURIComponent(
        supportConfig.whatsapp.defaultMessage || 'مرحباً، أحتاج مساعدة في تطبيق سوق سوريا'
      );
      window.open(`https://wa.me/${cleanPhone}?text=${msg}`, '_blank');
    } else if (channel === 'telegram' && supportConfig.telegram?.value) {
      let url = supportConfig.telegram.value.trim();
      if (url.startsWith('@')) url = `https://t.me/${url.substring(1)}`;
      else if (!url.startsWith('http')) url = `https://${url}`;
      window.open(url, '_blank');
    } else if (channel === 'facebook' && supportConfig.facebook?.value) {
      let url = supportConfig.facebook.value.trim();
      if (!url.startsWith('http')) url = `https://${url}`;
      window.open(url, '_blank');
    }
  };

  // قراءة الأقسام النشطة فقط من السحابة
  const categories = categoriesData.filter((c: any) => c.is_active !== false);

  // سحب الإعدادات الشاملة لحظياً من السحابة
  const fetchCloudConfig = () => {
    supabase
      .from('products')
      .select('title, description, created_at')
      .or('title.like.__APP_CONFIG_%,title.eq.APP_CONFIG_FIELDS')
      .order('created_at', { ascending: false })
      .then(({ data }) => {
        if (data && data.length > 0) {
          const seen = new Set<string>();
          data.forEach((row) => {
            if (seen.has(row.title)) return;
            seen.add(row.title);
            try {
              if (row.title === '__APP_CONFIG_CATEGORIES__' && row.description) {
                const cloudCats = JSON.parse(row.description);
                if (Array.isArray(cloudCats) && cloudCats.length > 0) {
                  setCategoriesData(cloudCats);
                  const firstActive = cloudCats.find((c: any) => c.is_active !== false);
                  if (firstActive && firstActive.name) {
                    setActiveCategoryName((prev) => {
                      if (prev === 'الكل') return 'الكل';
                      const stillActive = cloudCats.some((c: any) => c.name === prev && c.is_active !== false);
                      return stillActive ? prev : 'الكل';
                    });
                    setProductCategory((prev) => {
                      const stillActive = cloudCats.some((c: any) => c.name === prev && c.is_active !== false);
                      return stillActive ? prev : firstActive.name;
                    });
                  }
                }
              }
              if (row.title === '__APP_CONFIG_PROVINCES__' && row.description) {
                const cloudProvs = JSON.parse(row.description);
                if (Array.isArray(cloudProvs)) {
                  setProvincesData(cloudProvs);
                  setSelectedProvince((prev) => (prev ? prev : (cloudProvs[0] || '')));
                }
              }
              if (row.title === '__APP_CONFIG_SETTINGS_PROPOSALS__' && row.description) {
                const cloudProps = JSON.parse(row.description);
                if (Array.isArray(cloudProps)) {
                  setSettingsProposals(cloudProps);
                  setHasCloudProposals(true);
                }
              }
              if (row.title === '__APP_CONFIG_RATES__' && row.description) {
                const cloudRates = JSON.parse(row.description);
                if (cloudRates && cloudRates.usd) {
                  setMarketRates(cloudRates);
                }
              }
              if (row.title === '__APP_CONFIG_THEME__' && row.description) {
                try {
                  const cloudTheme = JSON.parse(row.description);
                  if (cloudTheme && typeof cloudTheme === 'object') {
                    setThemeConfig(cloudTheme);
                    if (cloudTheme.forcedTheme === 'dark') {
                      setDarkMode(true);
                    } else if (cloudTheme.forcedTheme === 'light') {
                      setDarkMode(false);
                    }
                  }
                } catch {}
              }
              if (row.title === '__APP_CONFIG_UI_CONFIG__' && row.description) {
                try {
                  const cloudUi = JSON.parse(row.description);
                  if (cloudUi && typeof cloudUi === 'object') {
                    setUiConfig(cloudUi);
                    if (cloudUi.appNameAr) {
                      document.title = cloudUi.appNameAr;
                    }
                  }
                } catch {}
              }
              if ((row.title === '__APP_CONFIG_CUSTOM_UI__' || row.title === '__APP_CONFIG_WIDGETS__' || row.title === 'APP_CONFIG_CUSTOM_UI') && row.description) {
                try {
                  const cloudWidgets = JSON.parse(row.description);
                  if (Array.isArray(cloudWidgets)) {
                    setCustomWidgets(cloudWidgets);
                  }
                } catch {}
              }
              if (row.title === '__APP_CONFIG_NOTICE__' && row.description) {
                const cloudNotice = JSON.parse(row.description);
                if (cloudNotice) {
                  const rawText = typeof cloudNotice === 'string' ? cloudNotice : cloudNotice.text || '';
                  const cleanText = rawText.trim();
                  const isActive = typeof cloudNotice === 'object' && 'active' in cloudNotice
                    ? Boolean(cloudNotice.active && cleanText)
                    : Boolean(cleanText);
                  setAdminNotice({
                    active: isActive,
                    text: cleanText,
                  });
                }
              }
              if (row.title === '__APP_CONFIG_MAINTENANCE__' && row.description) {
                const cloudMaint = JSON.parse(row.description);
                if (cloudMaint && typeof cloudMaint.enabled === 'boolean') {
                  setMaintenanceConfig(cloudMaint);
                }
              }
              if (row.title === '__APP_CONFIG_SUPPORT__' && row.description) {
                const cloudSup = JSON.parse(row.description);
                if (cloudSup && cloudSup.whatsapp) {
                  setSupportConfig(cloudSup);
                }
              }
              if (row.title === '__APP_CONFIG_BROADCAST__' && row.description) {
                const cloudBc = JSON.parse(row.description);
                if (cloudBc && cloudBc.title) {
                  setBroadcastConfig(cloudBc);
                }
              }
              if (row.title === '__APP_CONFIG_FEATURED__' && row.description) {
                const cloudFeat = JSON.parse(row.description);
                if (Array.isArray(cloudFeat)) {
                  setFeaturedProductIds(cloudFeat);
                }
              }
              if (row.title === '__APP_CONFIG_NAV_ITEMS__' && row.description) {
                const cloudNav = JSON.parse(row.description);
                if (Array.isArray(cloudNav) && cloudNav.length > 0) {
                  setNavItems(cloudNav);
                }
              }
              if ((row.title === '__APP_CONFIG_FIELDS__' || row.title === 'APP_CONFIG_FIELDS') && row.description) {
                try {
                  const cloudFields = JSON.parse(row.description);
                  if (cloudFields) {
                    setFieldsConfig(cloudFields);
                  }
                } catch {}
              }
              if (row.title === '__APP_CONFIG_VERIFIED_USERS__' && row.description) {
                try {
                  const vIds = JSON.parse(row.description);
                  if (Array.isArray(vIds)) {
                    setVerifiedUserIds(vIds);
                    setVerifiedCloudLoaded(true);
                  }
                } catch {}
              }
              if (row.title === '__APP_CONFIG_BANNED_USERS__' && row.description) {
                try {
                  const cloudBanned = JSON.parse(row.description);
                  if (cloudBanned && typeof cloudBanned === 'object' && !Array.isArray(cloudBanned)) {
                    setBannedUsersMap(cloudBanned as Record<string, BannedUserCloudRecord>);
                  }
                } catch {}
              }
              if (row.title === '__APP_CONFIG_PRIVACY_POLICY__' && row.description) {
                try {
                  const pol = JSON.parse(row.description);
                  if (pol && pol.text) {
                    setPrivacyPolicyConfig(pol);
                  }
                } catch {}
              }
              if (row.title === '__APP_CONFIG_NOTICE__' && row.description) {
                try {
                  const notObj = JSON.parse(row.description);
                  if (notObj && notObj.privacyPolicyText) {
                    setPrivacyPolicyConfig((prev) => ({
                      text: notObj.privacyPolicyText,
                      version: notObj.privacyPolicyVersion || prev.version,
                    }));
                  }
                } catch {}
              }
              if (row.title === '__APP_CONFIG_BOT_PROTECTION__' && row.description) {
                const cloudBot = JSON.parse(row.description);
                if (cloudBot && cloudBot.mode) {
                  setBotProtectionMode(cloudBot.mode);
                } else if (typeof cloudBot === 'string') {
                  setBotProtectionMode(cloudBot);
                }
              }
              if (row.title === '__APP_CONFIG_MARKET_RULES__' && row.description) {
                const cloudRules = JSON.parse(row.description) as Partial<MarketRulesConfig>;
                if (cloudRules && typeof cloudRules === 'object') {
                  const merged = { ...DEFAULT_MARKET_RULES, ...cloudRules };
                  setMarketRules(merged);
                  try {
                    if (!localStorage.getItem('souq_syria_sort_order') && merged.defaultSortOrder) {
                      setSortOrder(merged.defaultSortOrder);
                    }
                    if (!localStorage.getItem('souq_syria_post_font_scale') && merged.defaultFontScale) {
                      setPostFontScale(merged.defaultFontScale);
                    }
                  } catch {}
                  if (merged.allowedCurrencies && merged.allowedCurrencies.length > 0) {
                    setProductCurrency((prev) =>
                      merged.allowedCurrencies.includes(prev) ? prev : merged.allowedCurrencies[0]
                    );
                  }
                }
              }
              if (row.title === '__APP_CONFIG_BANNERS__' && row.description) {
                const cloudBanners = JSON.parse(row.description);
                if (Array.isArray(cloudBanners)) {
                  setPromotionalBanners(cloudBanners);
                }
              }
              if (row.title === '__APP_CONFIG_FEATURED_META__' && row.description) {
                const cloudFeaturedMeta = JSON.parse(row.description);
                if (Array.isArray(cloudFeaturedMeta)) {
                  setFeaturedMeta(cloudFeaturedMeta);
                }
              }
              if (row.title === '__APP_CONFIG_USER_TIERS__' && row.description) {
                const cloudUserTiers = JSON.parse(row.description);
                if (cloudUserTiers && typeof cloudUserTiers === 'object' && !Array.isArray(cloudUserTiers)) {
                  setUserTiers(cloudUserTiers);
                }
              }
              if (row.title === '__APP_CONFIG_COURIER_CONFIG__' && row.description) {
                const cloudCourier = JSON.parse(row.description);
                if (cloudCourier && typeof cloudCourier === 'object') {
                  setCourierConfig({
                    ...DEFAULT_COURIER_CONFIG,
                    ...cloudCourier,
                    paymentPrep: {
                      ...DEFAULT_COURIER_CONFIG.paymentPrep,
                      ...(cloudCourier.paymentPrep || {}),
                    },
                  });
                }
              }
              if (row.title === '__APP_CONFIG_COURIER_APPLICATIONS__' && row.description) {
                const cloudCourierApps = JSON.parse(row.description);
                if (Array.isArray(cloudCourierApps)) {
                  setCourierApplications(cloudCourierApps);
                }
              }
              if (row.title === '__APP_CONFIG_COURIER_REQUESTS__' && row.description) {
                const cloudCourierReqs = JSON.parse(row.description);
                if (Array.isArray(cloudCourierReqs)) {
                  setCourierRequests(cloudCourierReqs);
                }
              }
              if (row.title === '__APP_CONFIG_WALLET_CONFIG__' && row.description) {
                const cloudWalletCfg = JSON.parse(row.description);
                if (cloudWalletCfg && typeof cloudWalletCfg === 'object') {
                  setWalletConfig({
                    ...DEFAULT_WALLET_CONFIG,
                    ...cloudWalletCfg,
                  });
                }
              }
              if (row.title === '__APP_CONFIG_USER_WALLETS__' && row.description) {
                const cloudWallets = JSON.parse(row.description);
                if (cloudWallets && typeof cloudWallets === 'object' && !Array.isArray(cloudWallets)) {
                  setUserWallets(cloudWallets as Record<string, UserWalletRecord>);
                }
              }
              if (row.title === '__APP_CONFIG_PAYMENT_REQUESTS__' && row.description) {
                const cloudPayReqs = JSON.parse(row.description);
                if (Array.isArray(cloudPayReqs)) {
                  setPaymentRequests(cloudPayReqs as WalletPaymentRequest[]);
                }
              }
            } catch (e) {}
          });
          if (!seen.has('__APP_CONFIG_BANNED_USERS__')) {
            setBannedUsersMap({});
          }
        }
        setWalletCloudLoaded(true);
      });
  };

  const fetchCloudConfigRef = useRef(fetchCloudConfig);
  fetchCloudConfigRef.current = fetchCloudConfig;
  const fetchProductsRef = useRef<() => Promise<void> | void>(() => {});
  const fetchNotificationsRef = useRef<() => Promise<void> | void>(() => {});
  const fetchCurrentUserProfileRef = useRef<() => Promise<void> | void>(() => {});
  const currentUserIdRef = useRef<string | null>(null);

  useEffect(() => {
    fetchCloudConfigRef.current();
    const channel = supabase
      .channel('cloud_configs_sync')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'products' },
        (payload) => {
          const title = (payload.new as any)?.title || (payload.old as any)?.title;
          if (!title) {
            // قد تغيب قيمة title في أحداث DELETE إذا لم يُفعّل REPLICA IDENTITY FULL
            fetchCloudConfigRef.current();
            fetchProductsRef.current();
          } else if (
            String(title).startsWith('__APP_CONFIG_') ||
            String(title) === 'APP_CONFIG_FIELDS'
          ) {
            fetchCloudConfigRef.current();
          } else {
            fetchProductsRef.current();
          }
        }
      )
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'profiles' },
        (payload) => {
          const updatedProfile = (payload.new || payload.old) as any;
          if (updatedProfile?.id) {
            if (payload.eventType !== 'DELETE') {
              setProfileVerifiedMap((prev) => ({
                ...prev,
                [updatedProfile.id]: Boolean(updatedProfile.is_verified),
              }));
              setCurrentUserProfile((prev) =>
                prev && prev.id === updatedProfile.id ? { ...prev, ...updatedProfile } : prev
              );
            }
            if (updatedProfile.id === currentUserIdRef.current) {
              fetchCurrentUserProfileRef.current();
            }
          }
        }
      )
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'notifications' },
        () => {
          fetchNotificationsRef.current();
        }
      )
      .subscribe();

    const syncAllFromCloud = () => {
      if (document.visibilityState === 'hidden') return;
      fetchCloudConfigRef.current();
      fetchProductsRef.current();
      fetchNotificationsRef.current();
      if (currentUserIdRef.current) {
        fetchCurrentUserProfileRef.current();
      }
    };

    const onVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        syncAllFromCloud();
      }
    };

    window.addEventListener('focus', syncAllFromCloud);
    document.addEventListener('visibilitychange', onVisibilityChange);
    const fallbackPollId = window.setInterval(syncAllFromCloud, 12000);

    return () => {
      window.removeEventListener('focus', syncAllFromCloud);
      document.removeEventListener('visibilitychange', onVisibilityChange);
      window.clearInterval(fallbackPollId);
      supabase.removeChannel(channel);
    };
  }, []);

  useEffect(() => {
    if (promotionalBanners.length <= 1) return;
    const timer = setInterval(() => {
      setCarouselIndex((prev) => prev + 1);
    }, 6000);
    return () => clearInterval(timer);
  }, [promotionalBanners.length]);

  useEffect(() => {
    const onPageHide = () => {
      flushEngagementStats();
    };
    window.addEventListener('pagehide', onPageHide);
    return () => window.removeEventListener('pagehide', onPageHide);
  }, []);

  // إعداد الوضع الداكن (Dark Mode) مع حفظه في التخزين المحلي
  const [darkMode, setDarkMode] = useState<boolean>(() => {
    try {
      return localStorage.getItem('souq_syria_dark_mode') === 'true';
    } catch {
      return false;
    }
  });

  useEffect(() => {
    if (darkMode) {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
    try {
      localStorage.setItem('souq_syria_dark_mode', darkMode ? 'true' : 'false');
    } catch {
      // هادئ
    }
  }, [darkMode]);

  const toggleDarkMode = () => {
    setDarkMode((prev) => !prev);
  };

  // حالة تكبير خط نصوص المنشورات فقط (تأتي من المستخدمين وسحاب Supabase)
  const [postFontScale, setPostFontScale] = useState<number>(() => {
    try {
      const saved = localStorage.getItem('souq_syria_post_font_scale');
      return saved ? Number(saved) : 100;
    } catch {
      return 100;
    }
  });

  const handleUpdatePostFontScale = (scale: number) => {
    setPostFontScale(scale);
    try {
      localStorage.setItem('souq_syria_post_font_scale', scale.toString());
    } catch {
      // هادئ
    }
  };

  // حالة فرز الإعلانات والمنشورات
  const [sortOrder, setSortOrder] = useState<SortOrderOption>(() => {
    try {
      const saved = localStorage.getItem('souq_syria_sort_order');
      return (saved as SortOrderOption) || 'newest';
    } catch {
      return 'newest';
    }
  });

  const handleUpdateSortOrder = (order: SortOrderOption) => {
    setSortOrder(order);
    try {
      localStorage.setItem('souq_syria_sort_order', order);
    } catch {
      // هادئ
    }
  };

  // تأكيد أمان إضافي كجزء أساسي من التطبيق قبل حذف أي إعلان
  const [productToDelete, setProductToDelete] = useState<ProductItem | null>(null);
  const [isDeletingProduct, setIsDeletingProduct] = useState(false);

  // ميزة سحب الصفحة للأسفل لتحديث الصفحة الحالية (Pull-To-Refresh)
  const [pullDistance, setPullDistance] = useState(0);
  const [isPulling, setIsPulling] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const touchStartYRef = useRef(0);

  // القسم الرئيسي والفرعي النشط (الافتراضي: الكل لعرض جميع إعلانات الأقسام)
  const [activeCategoryName, setActiveCategoryName] = useState<string>('الكل');
  const [activeSubCategory, setActiveSubCategory] = useState<string>('الكل');
  // فلتر البحث والمحافظة في الواجهة الرئيسية
  const [searchQuery, setSearchQuery] = useState('');
  const [filterProvince, setFilterProvince] = useState<string>('الكل');

  // المستخدم والمصادقة مع Supabase
  const [currentUser, setCurrentUser] = useState<SupabaseUser | null>(null);
  // قائمة معرفات المستخدمين الموثقين وحالة الحظر اللحظي من الإدارة
  const [verifiedUserIds, setVerifiedUserIds] = useState<string[]>([]);
  const [verifiedCloudLoaded, setVerifiedCloudLoaded] = useState(false);
  const [bannedUsersMap, setBannedUsersMap] = useState<Record<string, BannedUserCloudRecord>>({});
  const [nowTick, setNowTick] = useState<number>(() => Date.now());

  // إعدادات الحقول الديناميكية القادمة من الإدارة
  interface CustomCloudWidget {
    id: string;
    type?: 'button' | 'badge' | 'floating_button' | 'banner' | 'text' | 'card';
    label: string;
    subLabel?: string;
    icon?: string;
    position?:
      | 'top_right'
      | 'top_left'
      | 'bottom_right'
      | 'bottom_left'
      | 'bottom_center'
      | 'top_banner'
      | 'header_right'
      | 'header_left'
      | 'above_feed'
      | 'below_feed'
      | 'account_top'
      | 'account_bottom';
    actionType?: 'url' | 'whatsapp' | 'call' | 'tab' | 'create_ad' | 'login' | 'settings' | 'notifications' | 'alert' | 'modal';
    actionValue?: string;
    modalTitle?: string;
    modalContent?: string;
    bgColor?: string;
    textColor?: string;
    borderColor?: string;
    badge?: string;
  targetProvinces?: string[];
    targetCategories?: string[];
    targetAudience?: 'all' | 'guests' | 'logged_in';
    startAt?: string;
    endAt?: string;
    visible?: boolean;
  }
  const [customWidgets, setCustomWidgets] = useState<CustomCloudWidget[]>([]);
  const [customProductValues, setCustomProductValues] = useState<Record<string, string>>({});
  const [themeConfig, setThemeConfig] = useState<CloudThemeConfig>({});
  const [uiConfig, setUiConfig] = useState<CloudUIConfig>({});
  const [profileVerifiedMap, setProfileVerifiedMap] = useState<Record<string, boolean>>({});
  const [activeCloudModal, setActiveCloudModal] = useState<{ title: string; content: string } | null>(null);
  const [fieldsConfig, setFieldsConfig] = useState<{
    signupFields?: any[];
    postProductFields?: CloudFieldItem[];
  } | null>(null);

  // منظومة المناديب والتوصيل بين المحافظات (تستقبل بالكامل من السحابة)
  const [courierConfig, setCourierConfig] = useState<CourierServiceConfig>(DEFAULT_COURIER_CONFIG);
  const [courierApplications, setCourierApplications] = useState<CourierApplicationItem[]>([]);
  const [courierRequests, setCourierRequests] = useState<CourierDeliveryRequest[]>([]);
  const [courierModalOpen, setCourierModalOpen] = useState(false);
  const [courierModalMode, setCourierModalMode] = useState<CourierModalMode>('directory');
  const [courierTargetProduct, setCourierTargetProduct] = useState<ProductItem | null>(null);

  // منظومة المحفظة والنقاط واشتراكات التجار ونجوم الصدارة (من السحابة)
  const [walletConfig, setWalletConfig] = useState<WalletMonetizationConfig>(DEFAULT_WALLET_CONFIG);
  const [userWallets, setUserWallets] = useState<Record<string, UserWalletRecord>>({});
  const [paymentRequests, setPaymentRequests] = useState<WalletPaymentRequest[]>([]);
  const [walletCloudLoaded, setWalletCloudLoaded] = useState(false);
  const [walletModalOpen, setWalletModalOpen] = useState(false);
  const [walletModalTab, setWalletModalTab] = useState<'overview' | 'packages' | 'plans'>('overview');
  const [starBoostProduct, setStarBoostProduct] = useState<ProductItem | null>(null);
  const [isApplyingStarBoost, setIsApplyingStarBoost] = useState(false);
  const [sessionUnlockedExtraImages, setSessionUnlockedExtraImages] = useState(0);
  const [sessionUnlockedExtraPost, setSessionUnlockedExtraPost] = useState(false);

  // سياسة الخصوصية الديناميكية المعتمدة من الإدارة
  const [privacyPolicyConfig, setPrivacyPolicyConfig] = useState<{
    text: string;
    version: string;
  }>({
    text: "شروط الاستخدام وسياسة الخصوصية لتطبيق سوق سوريا:\n1. الالتزام بالمصداقية في وصف المنتجات والسلع والأسعار بالليرة السورية أو العملات المعتمدة.\n2. يمنع منعاً باتاً ترويج أي سلع محظورة قانونياً أو أسلحة أو معاملات غير مشروعة داخل الجمهورية العربية السورية.\n3. توثيق الحساب بالرقم الوطني السوري يمنح صاحب الإعلان شارة التوثيق الذهبية وثقة عالية لدى المشترين.\n4. يحق لإدارة سوق سوريا إيقاف أو حظر أي حساب ينتهك شروط النشر أو ترد بحقه بلاغات احتيال لحماية المجتمع.",
    version: "1.0",
  });

  const postFieldsList = fieldsConfig?.postProductFields;
  const isPostFieldVisible = (fieldId: string, def = true) => {
    if (!postFieldsList || postFieldsList.length === 0) return def;
    const f = postFieldsList.find((item) => item.id === fieldId || item.name === fieldId);
    return f ? f.visible !== false : def;
  };
  const isPostFieldRequired = (fieldId: string, def = true) => {
    if (!postFieldsList || postFieldsList.length === 0) return def;
    const f = postFieldsList.find((item) => item.id === fieldId || item.name === fieldId);
    return f ? Boolean(f.required) : def;
  };
  const customPostFields = (postFieldsList || []).filter(
    (f) =>
      f.isCustom &&
      f.visible !== false &&
      ![
        "title",
        "category",
        "sub_category",
        "price",
        "is_negotiable",
        "whatsapp",
        "province",
        "location",
        "images",
        "description",
      ].includes(f.name)
  );
  const visibleSpecLabels = useMemo(() => {
    const labels = (postFieldsList || [])
      .filter((f) => f.isCustom && f.showInCard !== false && f.label)
      .map((f) => f.label);
    return labels.length > 0 ? labels : undefined;
  }, [postFieldsList]);


  const [currentUserProfile, setCurrentUserProfile] = useState<{
    id: string;
    full_name?: string | null;
    father_name?: string | null;
    national_id?: string | null;
    province?: string | null;
    address?: string | null;
    is_verified?: boolean;
    is_banned?: boolean;
    banned_until?: string | null;
    ban_reason?: string | null;
  } | null>(null);
  const [showTermsModal, setShowTermsModal] = useState(false);
  const [authLoading, setAuthLoading] = useState(true);

  // حالة النافذة العائمة للمصادقة (تسجيل الدخول / إنشاء حساب)
  const [showAuthModal, setShowAuthModal] = useState(false);
  const [authModalReason, setAuthModalReason] = useState<string | null>(null);
  const [authModalInitialMode, setAuthModalInitialMode] = useState<'login' | 'signup'>('login');


  // الإشعارات من Supabase
  const [notifications, setNotifications] = useState<AdminNotification[]>([]);
  const [showNotifications, setShowNotifications] = useState(false);

  // قائمة المنتجات الحقيقية من Supabase
  const [products, setProducts] = useState<ProductItem[]>([]);
  const [loadingProducts, setLoadingProducts] = useState(true);

  // حالة منبثقة زر الزائد
  const [showPlusMenu, setShowPlusMenu] = useState(false);

  // حالة واجهة النشر
  const [showCreateScreen, setShowCreateScreen] = useState(false);

  // الحقول المطلوبة لواجهة نشر المنتج (يدعم حتى 3 صور وعملات متعددة)
  interface UploadedImageItem {
    file?: File;
    preview: string;
  }
  const [productImages, setProductImages] = useState<UploadedImageItem[]>([]);
  const [productCurrency, setProductCurrency] = useState<'SYP' | 'USD'>('SYP');
  const [productIsNegotiable, setProductIsNegotiable] = useState(false);

  const [productName, setProductName] = useState('');
  const [productCategory, setProductCategory] = useState<string>('');
  const [productSubCategory, setProductSubCategory] = useState<string>(''); // إلزامي
  const [selectedProvince, setSelectedProvince] = useState('');
  const [productAddress, setProductAddress] = useState('');
  const [productPrice, setProductPrice] = useState('');
  const [productWhatsapp, setProductWhatsapp] = useState(''); // رقم واتساب إلزامي
  const [productDescription, setProductDescription] = useState('');

  const visibleCategoryCustomFields = useMemo(
    () => filterCustomFieldsByCategory(customPostFields, productCategory),
    [customPostFields, productCategory]
  );

  // نظام المفضلة (القلب التفاعلي)
  const [favoriteProductIds, setFavoriteProductIds] = useState<string[]>(() => {
    try {
      const saved = localStorage.getItem('souq_syria_favs');
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });

  const toggleFavorite = (id: string) => {
    setFavoriteProductIds((prev) => {
      const next = prev.includes(id) ? prev.filter((p) => p !== id) : [...prev, id];
      try {
        localStorage.setItem('souq_syria_favs', JSON.stringify(next));
      } catch {
        // هادئ
      }
      return next;
    });
  };

  // حالة نافذة المعاينة والتكبير للصور (Image Lightbox)
  const [lightboxImages, setLightboxImages] = useState<string[]>([]);
  const [lightboxIndex, setLightboxIndex] = useState(0);
  const [lightboxOpen, setLightboxOpen] = useState(false);
  const [lightboxTitle, setLightboxTitle] = useState('');

  const handleOpenLightbox = (images: string[], index: number, title: string) => {
    setLightboxImages(images);
    setLightboxIndex(index);
    setLightboxTitle(title);
    setLightboxOpen(true);
  };

  // إشعار نسخ الرابط والمشاركة
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const handleShareProduct = async (product: ProductItem) => {
    const shareText = `${product.title}\nالمحافظة: ${product.province} (${product.location})\nتواصل واتساب: ${product.whatsapp}`;
    if (navigator.share) {
      try {
        await navigator.share({
          title: product.title,
          text: shareText,
          url: window.location.href,
        });
        return;
      } catch {
        // تم الإلغاء من قبل المستخدم أو غير مدعوم
      }
    }

    try {
      await navigator.clipboard.writeText(`${shareText}\n${window.location.origin}`);
      setToastMessage('تم نسخ تفاصيل ورابط الإعلان للمشاركة بنجاح!');
    } catch {
      setToastMessage('تم تجهيز الرابط للمشاركة!');
    }
    setTimeout(() => setToastMessage(null), 2500);
  };

  // حالة الرفع والنشر
  const [isPublishing, setIsPublishing] = useState(false);
  const [publishStep, setPublishStep] = useState<string>('');
  const [publishError, setPublishError] = useState<string | null>(null);
  const [publishSuccess, setPublishSuccess] = useState(false);

  const fileInputRef = useRef<HTMLInputElement | null>(null);

  // الاستماع للجلسة الحالية في Supabase
  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setCurrentUser(session?.user ?? null);
      setAuthLoading(false);
    });

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      setCurrentUser(session?.user ?? null);
    });

    return () => subscription.unsubscribe();
  }, []);

  // جلب المنتجات والإشعارات من Supabase مع ربط أسماء البائعين
  const fetchProducts = async () => {
    try {
      setLoadingProducts(true);
      // الجديد (أضفنا شرط المقبولة فقط واستبعاد ملفات النظام):
      const { data, error } = await supabase
        .from('products')
        .select('*')
        .eq('status', 'approved')
        .neq('category', '__SYSTEM_CONFIG__')
        .order('created_at', { ascending: false });

      let combinedData: any[] = data || [];

      // جلب إعلانات المستخدم الخاصة به (بما فيها المعلقة قيد المراجعة) لتظهر له في "منتجاتي"
      if (currentUser?.id) {
        try {
          const { data: myData } = await supabase
            .from('products')
            .select('*')
            .eq('user_id', currentUser.id)
            .neq('category', '__SYSTEM_CONFIG__')
            .order('created_at', { ascending: false });

          if (myData && myData.length > 0) {
            const seenIds = new Set(combinedData.map((p) => p.id));
            const newMine = myData.filter((p) => !seenIds.has(p.id));
            combinedData = [...newMine, ...combinedData];
          }
        } catch {
          // هادئ
        }
      }

      if (!error && combinedData) {
        // جلب أسماء وحالة توثيق البائعين من profiles
        const userIds = Array.from(new Set(combinedData.map((p) => p.user_id).filter(Boolean)));
        let profileMap: Record<string, string> = {};
        let verifiedMap: Record<string, boolean> = {};
        if (userIds.length > 0) {
          try {
            const { data: profs } = await supabase
              .from('profiles')
              .select('id, full_name, is_verified')
              .in('id', userIds);
            if (profs) {
              profs.forEach((pr: any) => {
                if (pr.full_name) profileMap[pr.id] = pr.full_name;
                verifiedMap[pr.id] = Boolean(pr.is_verified);
              });
              setProfileVerifiedMap((prev) => ({ ...prev, ...verifiedMap }));
            }
          } catch {
            // هادئ
          }
        }

        const enriched = combinedData.map((item) => ({
          ...item,
          seller_name: item.user_id ? profileMap[item.user_id] || 'معلن في سوق سوريا' : 'معلن في سوق سوريا',
          seller_verified: item.user_id
            ? Boolean(verifiedMap[item.user_id] || verifiedUserIds.includes(item.user_id))
            : Boolean(item.seller_verified),
        }));
        setProducts(enriched as ProductItem[]);
      }
    } catch {
      // التعامل الهادئ عند عدم وجود جدول حتى ينشئه المستخدم
    } finally {
      setLoadingProducts(false);
    }
  };

  const fetchNotifications = async () => {
    try {
      const { data, error } = await supabase
        .from('notifications')
        .select('*')
        .order('created_at', { ascending: false });

      if (!error && data) {
        setNotifications(data as AdminNotification[]);
      }
    } catch {
      // هادئ
    }
  };

  const fetchCurrentUserProfile = async () => {
    if (!currentUser?.id) {
      setCurrentUserProfile(null);
      return;
    }
    try {
      const { data } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', currentUser.id)
        .maybeSingle();
      if (data) {
        setCurrentUserProfile(data as any);
        setProfileVerifiedMap((prev) => ({
          ...prev,
          [currentUser.id]: Boolean((data as any).is_verified),
        }));
      }
    } catch {
      // هادئ
    }
  };

  fetchProductsRef.current = fetchProducts;
  fetchNotificationsRef.current = fetchNotifications;
  fetchCurrentUserProfileRef.current = fetchCurrentUserProfile;
  currentUserIdRef.current = currentUser?.id ?? null;

  useEffect(() => {
    fetchProducts();
    fetchNotifications();
    fetchCurrentUserProfile();
  }, [currentUser?.id]);

  // اشتقاق حالة الحظر الفعلي اللحظي + مؤقت فك الحظر التلقائي عند انتهاء المدة
  const currentBanState = useMemo(() => {
    if (!currentUser?.id) {
      return { isBanned: false, bannedUntil: null, banReason: null, expired: false };
    }
    return resolveEffectiveBanState(currentUserProfile, bannedUsersMap[currentUser.id], nowTick);
  }, [currentUser?.id, currentUserProfile, bannedUsersMap, nowTick]);

  const isCurrentUserBanned = currentBanState.isBanned;

  useEffect(() => {
    if (!isCurrentUserBanned) return;
    const tickId = window.setInterval(() => {
      setNowTick(Date.now());
    }, 1000);
    return () => window.clearInterval(tickId);
  }, [isCurrentUserBanned]);

  const wasBannedRef = useRef(false);
  useEffect(() => {
    if (isCurrentUserBanned) {
      wasBannedRef.current = true;
      return;
    }
    if (wasBannedRef.current) {
      wasBannedRef.current = false;
      if (currentUser?.id) {
        const msg = currentBanState.expired
          ? 'انتهت مدة الحظر وعاد حسابك للعمل بشكل طبيعي ✓'
          : 'تم رفع الحظر عن حسابك من الإدارة وعاد حسابك للعمل ✓';
        setToastMessage(msg);
        setTimeout(() => setToastMessage(null), 4500);
        fetchCurrentUserProfileRef.current();
        fetchCloudConfigRef.current();
      }
    }
  }, [isCurrentUserBanned, currentBanState.expired, currentUser?.id]);

  const handleSignOut = async () => {
    await supabase.auth.signOut();
  };

  // تتبع التفاعل الحقيقي (المشاهدات، نقرات الواتساب، نقرات الاتصال) ومزامنته بالسحابة
  const pendingEngagementRef = useRef<Record<string, { views: number; whatsappClicks: number; callClicks: number }>>({});
  const viewedSessionIdsRef = useRef<Set<string>>(new Set());
  const engagementFlushTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const flushEngagementStats = async () => {
    const batch = pendingEngagementRef.current;
    const keys = Object.keys(batch);
    if (keys.length === 0) return;
    pendingEngagementRef.current = {};

    try {
      const { data: existingRow } = await supabase
        .from('products')
        .select('id, description')
        .eq('title', '__APP_CONFIG_ENGAGEMENT_STATS__')
        .maybeSingle();

      let currentStats: EngagementStatsMap = {};
      if (existingRow?.description) {
        try {
          const parsed = JSON.parse(existingRow.description);
          if (parsed && typeof parsed === 'object' && !Array.isArray(parsed)) {
            currentStats = parsed as EngagementStatsMap;
          }
        } catch {}
      }

      const nowIso = new Date().toISOString();
      for (const productId of keys) {
        const delta = batch[productId];
        const prev = currentStats[productId] || {
          views: 0,
          whatsappClicks: 0,
          callClicks: 0,
          updatedAt: nowIso,
        };
        currentStats[productId] = {
          views: (prev.views || 0) + (delta.views || 0),
          whatsappClicks: (prev.whatsappClicks || 0) + (delta.whatsappClicks || 0),
          callClicks: (prev.callClicks || 0) + (delta.callClicks || 0),
          updatedAt: nowIso,
        };
      }

      const serialized = JSON.stringify(currentStats);
      if (existingRow?.id) {
        await supabase
          .from('products')
          .update({ description: serialized })
          .eq('id', existingRow.id);
      } else {
        await supabase.from('products').insert([
          {
            title: '__APP_CONFIG_ENGAGEMENT_STATS__',
            category: '__SYSTEM_CONFIG__',
            sub_category: 'engagement_stats',
            province: 'دمشق',
            location: 'system',
            whatsapp: '0000000000',
            status: 'approved',
            description: serialized,
          },
        ]);
      }
    } catch {
      // مزامنة صامتة لتفادي إزعاج المستخدم
    }
  };

  const trackEngagementEvent = React.useCallback(
    (productId: string, event: 'view' | 'whatsapp' | 'call') => {
      if (!productId) return;
      if (event === 'view') {
        if (viewedSessionIdsRef.current.has(productId)) return;
        viewedSessionIdsRef.current.add(productId);
      }

      const entry = pendingEngagementRef.current[productId] || {
        views: 0,
        whatsappClicks: 0,
        callClicks: 0,
      };
      if (event === 'view') entry.views += 1;
      if (event === 'whatsapp') entry.whatsappClicks += 1;
      if (event === 'call') entry.callClicks += 1;
      pendingEngagementRef.current[productId] = entry;

      if (engagementFlushTimerRef.current) {
        clearTimeout(engagementFlushTimerRef.current);
      }
      engagementFlushTimerRef.current = setTimeout(() => {
        flushEngagementStats();
      }, 3500);
    },
    []
  );

  // اشتقاق حساب المندوب والطلبات الواردة للمستخدم الحالي
  const myCourierApp = useMemo(() => {
    if (!currentUser?.id) return null;
    return courierApplications.find((a) => a.userId === currentUser.id) || null;
  }, [courierApplications, currentUser?.id]);

  const myUnreadCourierRequestsCount = useMemo(() => {
    if (!myCourierApp || myCourierApp.status !== 'approved' || !currentUser?.id) return 0;
    return courierRequests.filter(
      (r) =>
        (r.courierId === myCourierApp.id || r.courierUserId === currentUser.id) &&
        r.status === 'new'
    ).length;
  }, [courierRequests, myCourierApp, currentUser?.id]);

  const openCourierModal = (mode: CourierModalMode, product?: ProductItem | null) => {
    setCourierTargetProduct(product || null);
    setCourierModalMode(mode);
    setCourierModalOpen(true);
  };

  const upsertCourierArrayCloudRecord = async <T,>(
    configKey: '__APP_CONFIG_COURIER_APPLICATIONS__' | '__APP_CONFIG_COURIER_REQUESTS__',
    subCategory: string,
    mergeFn: (latest: T[]) => T[]
  ): Promise<T[]> => {
    const { data: existingRows, error: fetchErr } = await supabase
      .from('products')
      .select('id, description, created_at')
      .eq('title', configKey)
      .order('created_at', { ascending: false })
      .limit(1);

    if (fetchErr) throw fetchErr;
    const latestRow = existingRows && existingRows.length > 0 ? existingRows[0] : null;

    let currentList: T[] = [];
    if (latestRow?.description) {
      try {
        const parsed = JSON.parse(latestRow.description);
        if (Array.isArray(parsed)) currentList = parsed as T[];
      } catch {}
    }

    const updatedList = mergeFn(currentList);
    const serialized = JSON.stringify(updatedList);

    if (latestRow?.id) {
      const { error: updErr } = await supabase
        .from('products')
        .update({ description: serialized })
        .eq('id', latestRow.id);
      if (updErr) throw updErr;
    } else {
      const { error: insErr } = await supabase.from('products').insert([
        {
          title: configKey,
          category: '__SYSTEM_CONFIG__',
          sub_category: subCategory,
          province: 'دمشق',
          location: 'system',
          whatsapp: '0000000000',
          status: 'approved',
          description: serialized,
        },
      ]);
      if (insErr) throw insErr;
    }

    return updatedList;
  };

  const handleSubmitCourierApplication = async (newApp: CourierApplicationItem) => {
    if (isCurrentUserBanned) {
      throw new Error('حسابك محظور حالياً ولا يمكنك إرسال طلبات');
    }
    const nextApps = await upsertCourierArrayCloudRecord<CourierApplicationItem>(
      '__APP_CONFIG_COURIER_APPLICATIONS__',
      'courier_applications',
      (latest) => [newApp, ...latest.filter((item) => item.userId !== newApp.userId)]
    );
    setCourierApplications(nextApps);
    setCourierModalOpen(false);
    setToastMessage('تم إرسال طلب الانضمام كمندوب وهو قيد المراجعة والاعتماد من الإدارة');
    setTimeout(() => setToastMessage(null), 4000);
  };

  const handleToggleCourierOnline = async () => {
    if (isCurrentUserBanned || !myCourierApp || myCourierApp.status !== 'approved') return;
    const nextOnline = !myCourierApp.isOnline;
    const nextApps = await upsertCourierArrayCloudRecord<CourierApplicationItem>(
      '__APP_CONFIG_COURIER_APPLICATIONS__',
      'courier_applications',
      (latest) =>
        latest.map((item) =>
          item.id === myCourierApp.id || item.userId === myCourierApp.userId
            ? { ...item, isOnline: nextOnline }
            : item
        )
    );
    setCourierApplications(nextApps);
    setToastMessage(
      nextOnline
        ? 'تم تفعيل وضع الاستعداد — اسمك ظاهر الآن للعملاء لطلب التوصيل'
        : 'تم إيقاف وضع الاستعداد مؤقتاً — لن تستقبل طلبات جديدة حتى تعاود التفعيل'
    );
    setTimeout(() => setToastMessage(null), 3500);
  };

  const handleSubmitCourierRequest = async (req: CourierDeliveryRequest) => {
    if (isCurrentUserBanned) {
      throw new Error('حسابك محظور حالياً ولا يمكنك إرسال طلبات');
    }
    const nextReqs = await upsertCourierArrayCloudRecord<CourierDeliveryRequest>(
      '__APP_CONFIG_COURIER_REQUESTS__',
      'courier_requests',
      (latest) => [req, ...latest]
    );
    setCourierRequests(nextReqs);
    setToastMessage(`تم إرسال طلب التوصيل إلى المندوب (${req.courierName}) بنجاح`);
    setTimeout(() => setToastMessage(null), 4000);
  };

  const handleUpdateCourierRequestStatus = async (
    reqId: string,
    nextStatus: CourierDeliveryRequest['status']
  ) => {
    const nextReqs = await upsertCourierArrayCloudRecord<CourierDeliveryRequest>(
      '__APP_CONFIG_COURIER_REQUESTS__',
      'courier_requests',
      (latest) =>
        latest.map((item) =>
          item.id === reqId ? { ...item, status: nextStatus, updatedAt: new Date().toISOString() } : item
        )
    );
    setCourierRequests(nextReqs);
    setToastMessage('تم تحديث حالة طلب التوصيل بنجاح');
    setTimeout(() => setToastMessage(null), 2500);
  };

  // حفظ وتحديث مستندات سحابة المحفظة والطلبات والتمييز بصيغة قراءة-تعديل-حفظ آمنة
  const upsertCloudJsonConfig = async <T,>(
    configKey:
      | '__APP_CONFIG_USER_WALLETS__'
      | '__APP_CONFIG_PAYMENT_REQUESTS__'
      | '__APP_CONFIG_FEATURED__'
      | '__APP_CONFIG_FEATURED_META__',
    subCategory: string,
    defaultValue: T,
    mergeFn: (latest: T) => T
  ): Promise<T> => {
    const { data: existingRows, error: fetchErr } = await supabase
      .from('products')
      .select('id, description, created_at')
      .eq('title', configKey)
      .order('created_at', { ascending: false })
      .limit(1);

    if (fetchErr) throw fetchErr;
    const latestRow = existingRows && existingRows.length > 0 ? existingRows[0] : null;

    let currentVal: T = defaultValue;
    if (latestRow?.description) {
      try {
        currentVal = JSON.parse(latestRow.description) as T;
      } catch {}
    }

    const updatedVal = mergeFn(currentVal);
    const serialized = JSON.stringify(updatedVal);

    if (latestRow?.id) {
      const { error: updErr } = await supabase
        .from('products')
        .update({ description: serialized })
        .eq('id', latestRow.id);
      if (updErr) throw updErr;
    } else {
      const { error: insErr } = await supabase.from('products').insert([
        {
          title: configKey,
          category: '__SYSTEM_CONFIG__',
          sub_category: subCategory,
          province: 'دمشق',
          location: 'system',
          whatsapp: '0000000000',
          status: 'approved',
          description: serialized,
        },
      ]);
      if (insErr) throw insErr;
    }

    return updatedVal;
  };

  const currentUserWallet = useMemo(
    () => (currentUser?.id ? ensureUserWalletRecord(userWallets, currentUser.id) : ensureUserWalletRecord({}, 'guest')),
    [userWallets, currentUser?.id]
  );

  // منح نقاط الهدية الترحيبية لمرة واحدة للمستخدمين الجدد (مع التحقق من الرقم الوطني لمنع التكرار)
  const welcomeCheckedRef = useRef<string | null>(null);
  useEffect(() => {
    if (!walletCloudLoaded || !currentUser?.id) return;
    if (!walletConfig.welcomeBonusEnabled || walletConfig.welcomeBonusPoints <= 0) return;
    if (welcomeCheckedRef.current === currentUser.id) return;

    const existingWallet = userWallets[currentUser.id];
    if (existingWallet?.welcomeBonusClaimed) {
      welcomeCheckedRef.current = currentUser.id;
      return;
    }

    const nationalId =
      currentUserProfile?.national_id || currentUser.user_metadata?.national_id || undefined;
    const bonusCheck = applyWelcomeBonusIfEligible(
      userWallets,
      currentUser.id,
      nationalId,
      walletConfig
    );

    if (!bonusCheck.granted) {
      welcomeCheckedRef.current = currentUser.id;
      return;
    }

    welcomeCheckedRef.current = currentUser.id;
    upsertCloudJsonConfig<Record<string, UserWalletRecord>>(
      '__APP_CONFIG_USER_WALLETS__',
      'user_wallets',
      {},
      (latest) => applyWelcomeBonusIfEligible(latest, currentUser.id, nationalId, walletConfig).updated
    )
      .then((saved) => {
        setUserWallets(saved);
        if (walletConfig.showWalletButtonInHeader || walletConfig.enabled) {
          setToastMessage(`🎉 تمت إضافة ${bonusCheck.pointsGranted} نقطة هدية ترحيبية إلى محفظتك!`);
          setTimeout(() => setToastMessage(null), 4000);
        }
      })
      .catch(() => {});
  }, [
    walletCloudLoaded,
    currentUser?.id,
    currentUserProfile?.national_id,
    walletConfig.welcomeBonusEnabled,
    walletConfig.welcomeBonusPoints,
  ]);

  const handleSubmitWalletPaymentRequest = async (req: WalletPaymentRequest) => {
    if (isCurrentUserBanned) {
      throw new Error('حسابك محظور حالياً ولا يمكنك إرسال طلبات');
    }
    const nextReqs = await upsertCloudJsonConfig<WalletPaymentRequest[]>(
      '__APP_CONFIG_PAYMENT_REQUESTS__',
      'payment_requests',
      [],
      (latest) => [req, ...(Array.isArray(latest) ? latest : [])]
    );
    setPaymentRequests(nextReqs);
    setToastMessage('تم إرسال طلب التحويل عبر شام كاش بنجاح وبانتظار تأكيد الإدارة');
    setTimeout(() => setToastMessage(null), 4000);
  };

  const handlePurchaseMerchantPlanWithPoints = async (
    plan: MerchantSubscriptionPlan
  ): Promise<{ ok: boolean; error?: string }> => {
    if (isCurrentUserBanned) {
      return { ok: false, error: 'حسابك محظور حالياً ولا يمكنك الاشتراك' };
    }
    if (!currentUser?.id) {
      return { ok: false, error: 'يرجى تسجيل الدخول أولاً' };
    }
    const quota = canAcceptNewMerchantSubscription(
      userWallets,
      walletConfig.maxSubscribedMerchants || 0,
      currentUser.id
    );
    if (!quota.allowed) {
      return {
        ok: false,
        error: `عذراً، اكتمل الحد الأقصى للتجار المشتركين حالياً (${quota.maxQuota} تاجر).`,
      };
    }

    let resultError: string | undefined;
    let activated = false;
    const savedWallets = await upsertCloudJsonConfig<Record<string, UserWalletRecord>>(
      '__APP_CONFIG_USER_WALLETS__',
      'user_wallets',
      {},
      (latest) => {
        const res = activateMerchantPlanForWallet(
          latest || {},
          currentUser.id,
          plan,
          plan.pointsCost,
          'plan_purchase'
        );
        if (!res.ok) {
          resultError = res.error;
          return latest;
        }
        activated = true;
        return res.updated;
      }
    );

    if (!activated) {
      return { ok: false, error: resultError || 'رصيد النقاط غير كافٍ' };
    }

    setUserWallets(savedWallets);
    setToastMessage(`تم تفعيل باقة «${plan.title}» وتوثيق حسابك لمدة ${plan.durationDays} يوم!`);
    setTimeout(() => setToastMessage(null), 4000);
    return { ok: true };
  };

  const handleApplyStarBoostToProduct = async (product: ProductItem, plan: StarFeaturePlan) => {
    if (isCurrentUserBanned || !currentUser?.id || isApplyingStarBoost) return;
    setIsApplyingStarBoost(true);
    try {
      const currentWallet = ensureUserWalletRecord(userWallets, currentUser.id);
      const useFreeCredit = (currentWallet.starCreditsRemaining || 0) > 0;
      if (!useFreeCredit && currentWallet.points < plan.pointsCost) {
        setToastMessage(
          `رصيدك (${currentWallet.points} نقطة) غير كافٍ لتمييز الإعلان (${plan.pointsCost} نقطة).`
        );
        setTimeout(() => setToastMessage(null), 3500);
        return;
      }

      const nextWallets = await upsertCloudJsonConfig<Record<string, UserWalletRecord>>(
        '__APP_CONFIG_USER_WALLETS__',
        'user_wallets',
        {},
        (latest) => {
          const w = ensureUserWalletRecord(latest || {}, currentUser.id);
          if ((w.starCreditsRemaining || 0) > 0) {
            const nowIso = new Date().toISOString();
            return {
              ...latest,
              [currentUser.id]: {
                ...w,
                starCreditsRemaining: Math.max(0, (w.starCreditsRemaining || 0) - 1),
                updatedAt: nowIso,
                transactions: [
                  {
                    id: `tx_star_credit_${Date.now()}`,
                    type: 'star_boost' as const,
                    amount: 0,
                    title: `استخدام رصيد نجمة مجاني (${plan.title})`,
                    note: `إعلان: ${product.title}`,
                    createdAt: nowIso,
                  },
                  ...w.transactions,
                ].slice(0, 60),
              },
            };
          }
          const spendRes = spendWalletPoints(
            latest || {},
            currentUser.id,
            plan.pointsCost,
            'star_boost',
            `تمييز إعلان بنجمة (${plan.title})`,
            product.title
          );
          return spendRes.ok ? spendRes.updated : latest;
        }
      );

      const expiresAtIso = new Date(
        Date.now() + Math.max(1, plan.durationDays) * 24 * 60 * 60 * 1000
      ).toISOString();

      const nextFeaturedIds = await upsertCloudJsonConfig<string[]>(
        '__APP_CONFIG_FEATURED__',
        'featured_ids',
        [],
        (latest) => Array.from(new Set([...(Array.isArray(latest) ? latest : []), product.id]))
      );

      const nextFeaturedMeta = await upsertCloudJsonConfig<FeaturedPromotionItem[]>(
        '__APP_CONFIG_FEATURED_META__',
        'featured_meta',
        [],
        (latest) => {
          const list = Array.isArray(latest) ? latest.filter((x) => x.productId !== product.id) : [];
          return [
            {
              productId: product.id,
              priority: plan.priority || 80,
              expiresAt: expiresAtIso,
              note: plan.badgeText || plan.title,
            },
            ...list,
          ];
        }
      );

      setUserWallets(nextWallets);
      setFeaturedProductIds(nextFeaturedIds);
      setFeaturedMeta(nextFeaturedMeta);
      setStarBoostProduct(null);
      setToastMessage(`⭐ تم تمييز إعلانك وتثبيته في الصدارة لمدة ${plan.durationDays} يوم!`);
      setTimeout(() => setToastMessage(null), 4000);
    } catch {
      setToastMessage('تعذر تمييز الإعلان حالياً، حاول مرة أخرى');
      setTimeout(() => setToastMessage(null), 3000);
    } finally {
      setIsApplyingStarBoost(false);
    }
  };

  const handleUnlockExtraImageSlot = async () => {
    if (!currentUser?.id) return;
    const cost = Math.max(1, walletConfig.extraImagePointCost || 5);
    if (currentUserWallet.points < cost) {
      setToastMessage(`تحتاج إلى ${cost} نقطة لفتح صورة إضافية — يمكنك شحن المحفظة أولاً`);
      setTimeout(() => setToastMessage(null), 3000);
      setWalletModalTab('packages');
      setWalletModalOpen(true);
      return;
    }
    const nextWallets = await upsertCloudJsonConfig<Record<string, UserWalletRecord>>(
      '__APP_CONFIG_USER_WALLETS__',
      'user_wallets',
      {},
      (latest) =>
        spendWalletPoints(
          latest || {},
          currentUser.id,
          cost,
          'extra_image',
          'إضافة صورة إضافية للإعلان'
        ).updated
    );
    setUserWallets(nextWallets);
    setSessionUnlockedExtraImages((prev) => prev + 1);
    setToastMessage(`تم خصم ${cost} نقطة وإتاحة إضافة صورة جديدة ✓`);
    setTimeout(() => setToastMessage(null), 2500);
  };

  const handleUnlockExtraDailyAd = async () => {
    if (!currentUser?.id) return;
    const cost = Math.max(1, walletConfig.extraDailyAdPointCost || 15);
    if (currentUserWallet.points < cost) {
      setToastMessage(`تحتاج إلى ${cost} نقطة لنشر إعلان إضافي اليوم — اشحن محفظتك أولاً`);
      setTimeout(() => setToastMessage(null), 3000);
      setWalletModalTab('packages');
      setWalletModalOpen(true);
      return;
    }
    const nextWallets = await upsertCloudJsonConfig<Record<string, UserWalletRecord>>(
      '__APP_CONFIG_USER_WALLETS__',
      'user_wallets',
      {},
      (latest) =>
        spendWalletPoints(
          latest || {},
          currentUser.id,
          cost,
          'extra_ad',
          'فتح إعلان يومي إضافي'
        ).updated
    );
    setUserWallets(nextWallets);
    setSessionUnlockedExtraPost(true);
    setPublishError(null);
    setToastMessage(`تم خصم ${cost} نقطة — يمكنك الآن متابعة نشر إعلانك!`);
    setTimeout(() => setToastMessage(null), 3000);
  };

  // بدء تعديل إعلان قائم وتعبئة حقوله الحالية
  const handleStartEditProduct = (item: ProductItem) => {
    if (!marketRules.allowUserEditAd) {
      setToastMessage('تعديل الإعلانات غير متاح حالياً بقرار من الإدارة');
      setTimeout(() => setToastMessage(null), 2500);
      return;
    }
    const { cleanDescription, specs } = extractCustomSpecsFromDescription(item.description);
    setEditingProduct(item);
    setProductName(item.title || '');
    setProductCategory(item.category || '');
    setProductSubCategory(item.sub_category || '');
    setSelectedProvince(item.province || '');
    setProductAddress(item.location || '');
    setProductWhatsapp(item.whatsapp || '');

    const rawPrice = item.price || '';
    const isNeg = rawPrice.includes('تفاوض');
    const isUsd = rawPrice.includes('$');
    const numericDigits = rawPrice.replace(/[^\d]/g, '');
    setProductPrice(numericDigits);
    setProductCurrency(isUsd && marketRules.allowedCurrencies.includes('USD') ? 'USD' : (marketRules.allowedCurrencies[0] || 'SYP'));
    setProductIsNegotiable(isNeg);
    setProductDescription(cleanDescription);

    const existingImages = parseProductImages(item.image_url).map((url) => ({ preview: url }));
    setProductImages(existingImages.slice(0, marketRules.maxImagesPerAd || 3));

    const prefilledSpecs: Record<string, string> = {};
    for (const cf of customPostFields) {
      if (specs[cf.label]) {
        prefilledSpecs[cf.name] = specs[cf.label];
      } else if (specs[cf.name]) {
        prefilledSpecs[cf.name] = specs[cf.name];
      }
    }
    setCustomProductValues(prefilledSpecs);
    setPublishError(null);
    setPublishSuccess(false);
    setShowCreateScreen(true);
  };

  // اشتقاق صلاحيات النشر وحدود الصور وفق خطة المستخدم أو الباقة المجانية
  const currentUserVerificationState = useMemo(() => {
    const baseVerified = Boolean(
      currentUser?.id &&
        (verifiedCloudLoaded
          ? verifiedUserIds.includes(currentUser.id)
          : currentUserProfile?.is_verified || profileVerifiedMap[currentUser.id])
    );
    return isUserVerificationActive(
      currentUser?.id ? userWallets[currentUser.id] : undefined,
      baseVerified,
      nowTick
    );
  }, [
    currentUser?.id,
    verifiedCloudLoaded,
    verifiedUserIds,
    currentUserProfile?.is_verified,
    profileVerifiedMap,
    userWallets,
    nowTick,
  ]);

  const isCurrentUserVerified = currentUserVerificationState.active;

  const postingEntitlement = useMemo(
    () =>
      getUserPostingEntitlement({
        walletConfig,
        marketRules,
        wallet: currentUser?.id ? userWallets[currentUser.id] : undefined,
        isVerified: isCurrentUserVerified,
        products,
        userId: currentUser?.id || '',
      }),
    [walletConfig, marketRules, userWallets, currentUser?.id, isCurrentUserVerified, products]
  );

  const effectiveMaxImagesPerAd = Math.max(
    1,
    postingEntitlement.maxImagesAllowed + sessionUnlockedExtraImages
  );
  const effectiveCanPostNewAd = postingEntitlement.canPostNewAd || sessionUnlockedExtraPost;

  // اختيار وإرفاق صور المنتج وفق الحد الأقصى ودقة الضغط القادمة من السحابة
  const handleMultiImageChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    if (files.length === 0) return;
    const maxImgs = effectiveMaxImagesPerAd;
    const remainingSlots = maxImgs - productImages.length;
    if (remainingSlots <= 0) return;
    const allowedFiles = files.slice(0, remainingSlots);
    const maxDim = marketRules.imageMaxWidth || 1200;
    const quality = marketRules.imageQuality || 0.78;

    const newItems: UploadedImageItem[] = [];
    for (const file of allowedFiles) {
      try {
        const { dataUrl } = await compressImage(file, maxDim, maxDim, quality);
        newItems.push({ file, preview: dataUrl });
      } catch {
        const reader = new FileReader();
        reader.onloadend = () => {
          setProductImages((prev) =>
            [...prev, { file, preview: reader.result as string }].slice(0, maxImgs)
          );
        };
        reader.readAsDataURL(file);
      }
    }

    if (newItems.length > 0) {
      setProductImages((prev) => [...prev, ...newItems].slice(0, maxImgs));
    }
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const removeImageAtIndex = (index: number) => {
    setProductImages((prev) => prev.filter((_, i) => i !== index));
  };

  const handlePublishSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setPublishError(null);
    if (isCurrentUserBanned) {
      setPublishError(
        `حسابك محظور حالياً ولا يمكنك النشر (${currentBanState.banReason || 'مخالفة الشروط'})`
      );
      return;
    }

    // التحقق من الحد اليومي للنشر للمستخدم عند إنشاء إعلان جديد
    if (!editingProduct && currentUser?.id && !effectiveCanPostNewAd) {
      setPublishError(
        `بلغت الحد اليومي المتاح (${postingEntitlement.maxDailyAdsAllowed} إعلان). يمكنك فتح إعلان إضافي بالنقاط أو الترقية لباقة التاجر.`
      );
      return;
    }

    // التحقق الديناميكي الذكي من الحقول الإلزامية حسب إعدادات السحابة
    if (isPostFieldVisible('title', true) && isPostFieldRequired('title', true) && !productName.trim()) {
      setPublishError('يرجى كتابة اسم المنتج أو عنوان الإعلان');
      return;
    }
    if (isPostFieldVisible('category', true) && isPostFieldRequired('category', true) && !productCategory) {
      setPublishError('يرجى تحديد القسم الرئيسي');
      return;
    }
    if (isPostFieldVisible('category', true) && isPostFieldRequired('category', true) && !productSubCategory) {
      setPublishError('يرجى اختيار القسم الفرعي (إلزامي)');
      return;
    }
    if (isPostFieldVisible('province', true) && isPostFieldRequired('province', true) && !selectedProvince) {
      setPublishError('يرجى اختيار المحافظة');
      return;
    }
    if (isPostFieldVisible('location', true) && isPostFieldRequired('location', true) && !productAddress.trim()) {
      setPublishError('يرجى كتابة العنوان والمنطقة بالتفصيل');
      return;
    }
    if (isPostFieldVisible('whatsapp', true) && isPostFieldRequired('whatsapp', true) && !productWhatsapp.trim()) {
      setPublishError('يرجى إدخال رقم الواتساب للتواصل (إلزامي)');
      return;
    }
    if (isPostFieldVisible('price', true) && isPostFieldRequired('price', false) && !productPrice.trim() && !productIsNegotiable) {
      setPublishError('يرجى إدخال السعر أو تفعيل خيار السعر قابل للتفاوض');
      return;
    }
    if (isPostFieldVisible('images', true) && isPostFieldRequired('images', false) && productImages.length === 0) {
      setPublishError('يرجى إرفاق صورة واحدة على الأقل للإعلان');
      return;
    }
    for (const cf of visibleCategoryCustomFields) {
      if (cf.required && !customProductValues[cf.name]?.trim()) {
        setPublishError(`يرجى إدخال الحقل الإلزامي: ${cf.label}`);
        return;
      }
    }

    // فحص الكلمات المحظورة من السحابة
    const specsByLabel: Record<string, string> = {};
    for (const cf of visibleCategoryCustomFields) {
      const val = customProductValues[cf.name]?.trim();
      if (val) specsByLabel[cf.label] = val;
    }
    const keywordCheck = checkBannedKeywords(
      [productName, productDescription, productAddress, ...Object.values(specsByLabel)],
      marketRules.bannedKeywords || []
    );
    if (keywordCheck.matched && marketRules.bannedKeywordAction === 'block') {
      setPublishError(
        `يحتوي الإعلان على كلمات مخالفة لسياسة السوق: (${keywordCheck.matchedWords.join('، ')})`
      );
      return;
    }

    setIsPublishing(true);
    setPublishStep('جارٍ معالجة الصورة...');

    try {
      let finalImageUrl = '';
      const maxImgs = effectiveMaxImagesPerAd;
      const maxDim = marketRules.imageMaxWidth || 1200;
      const quality = marketRules.imageQuality || 0.78;

      // 1. رفع الصور الجديدة مع الإبقاء على الروابط المحفوظة مسبقاً عند التعديل
      if (productImages.length > 0) {
        setPublishStep(`جارٍ تجهيز ${productImages.length} صور...`);
        const uploadedUrls: string[] = [];
        for (let i = 0; i < productImages.length; i++) {
          const imgItem = productImages[i];
          if (!imgItem.file && imgItem.preview && imgItem.preview.startsWith('http')) {
            uploadedUrls.push(imgItem.preview);
          } else {
            setPublishStep(`جارٍ ضغط ورفع الصورة (${i + 1} من ${productImages.length})...`);
            const uploadedUrl = await uploadImageToSupabase(imgItem.file || imgItem.preview, maxDim, quality);
            uploadedUrls.push(uploadedUrl);
          }
        }
        finalImageUrl = serializeProductImages(uploadedUrls, maxImgs);
      }

      // 2. تنسيق السعر بالعملة المختارة وقابلية التفاوض
      const formattedPrice = formatPriceWithCurrency(
        productPrice.trim(),
        productCurrency,
        productIsNegotiable
      );

      // 3. دمج تفاصيل الوصف مع المواصفات المخصصة للقسم
      const encodedDescription = encodeCustomSpecsIntoDescription(productDescription, specsByLabel);

      setPublishStep(editingProduct ? 'جارٍ حفظ التعديلات...' : 'جارٍ حفظ الإعلان...');

      if (editingProduct) {
        const nextStatus =
          keywordCheck.matched || marketRules.reReviewOnEdit
            ? 'pending'
            : editingProduct.status || 'approved';

        const updatedPayload = {
          title: productName.trim(),
          category: productCategory,
          sub_category: productSubCategory,
          province: selectedProvince,
          location: productAddress.trim(),
          price: formattedPrice || null,
          whatsapp: productWhatsapp.trim(),
          image_url: finalImageUrl || null,
          description: encodedDescription || null,
          status: nextStatus,
        };

        const { data, error } = await supabase
          .from('products')
          .update(updatedPayload)
          .eq('id', editingProduct.id)
          .select();

        if (error) throw error;

        if (data && data[0]) {
          setProducts((prev) =>
            prev.map((p) =>
              p.id === editingProduct.id
                ? ({
                    ...p,
                    ...data[0],
                    seller_name: p.seller_name,
                    seller_verified: isCurrentUserVerified,
                  } as ProductItem)
                : p
            )
          );
        } else {
          fetchProducts();
        }
      } else {
        const newProductRecord = {
          title: productName.trim(),
          category: productCategory,
          sub_category: productSubCategory,
          province: selectedProvince,
          location: productAddress.trim(),
          price: formattedPrice || null,
          whatsapp: productWhatsapp.trim(),
          image_url: finalImageUrl || null,
          description: encodedDescription || null,
          user_id: currentUser?.id || null,
          status: 'pending',
        };

        const { data, error } = await supabase
          .from('products')
          .insert([newProductRecord])
          .select();

        if (error) throw error;

        if (data && data[0]) {
          const enrichedNew = {
            ...data[0],
            seller_name: currentUserProfile?.full_name || currentUser?.user_metadata?.full_name || 'أنت (المعلن)',
            seller_verified: isCurrentUserVerified,
          };
          setProducts((prev) => [enrichedNew as ProductItem, ...prev]);
        } else {
          fetchProducts();
        }
      }

      setPublishSuccess(true);
      setTimeout(() => {
        setPublishSuccess(false);
        setIsPublishing(false);
        setEditingProduct(null);
        setSessionUnlockedExtraImages(0);
        setSessionUnlockedExtraPost(false);
        setProductName('');
        setProductSubCategory('');
        setSelectedProvince('');
        setProductAddress('');
        setProductPrice('');
        setProductCurrency(marketRules.allowedCurrencies[0] || 'SYP');
        setProductIsNegotiable(false);
        setProductWhatsapp('');
        setProductDescription('');
        setCustomProductValues({});
        setProductImages([]);
        setShowCreateScreen(false);
        setActiveTab('home');
        setActiveCategoryName('الكل');
        setActiveSubCategory('الكل');
      }, 1200);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'حدث خطأ أثناء حفظ الإعلان';
      setPublishError(message);
      setIsPublishing(false);
    }
  };

  // دمج رتب التوثيق من الإدارة مع رتب باقات التجار النشطة مع أولوية لرتبة الإدارة وإخفاء الرتبة لغير الموثقين
  const effectiveUserTiers = useMemo(() => {
    const merged: Record<string, string> = {};
    const candidateUids = new Set([...Object.keys(userTiers), ...Object.keys(userWallets)]);
    for (const uid of candidateUids) {
      const wallet = userWallets[uid];
      const baseVerified = verifiedCloudLoaded
        ? verifiedUserIds.includes(uid)
        : Boolean(
            profileVerifiedMap[uid] ||
              (currentUser?.id === uid && currentUserProfile?.is_verified)
          );
      const verActive = isUserVerificationActive(wallet, baseVerified, nowTick).active;
      const resolvedTier = resolveEffectiveUserTier(uid, verActive, userTiers, wallet);
      if (resolvedTier) {
        merged[uid] = resolvedTier;
      }
    }
    return merged;
  }, [
    userTiers,
    userWallets,
    verifiedCloudLoaded,
    verifiedUserIds,
    profileVerifiedMap,
    currentUser?.id,
    currentUserProfile?.is_verified,
    nowTick,
  ]);

  // دمج شارة التوثيق لحظياً مع مراعاة إلغاء التوثيق وانتهاء مدة التوثيق الزمنية
  const productsWithVerification = useMemo(() => {
    return products.map((item) => {
      const baseVerified = item.user_id
        ? verifiedCloudLoaded
          ? verifiedUserIds.includes(item.user_id)
          : Boolean(profileVerifiedMap[item.user_id] ?? item.seller_verified)
        : Boolean(item.seller_verified);
      const verState = isUserVerificationActive(
        item.user_id ? userWallets[item.user_id] : undefined,
        baseVerified,
        nowTick
      );
      return {
        ...item,
        seller_verified: verState.active,
      };
    });
  }, [
    products,
    verifiedCloudLoaded,
    verifiedUserIds,
    profileVerifiedMap,
    userWallets,
    nowTick,
  ]);

  // خريطة الإعلانات المميزة VIP النشطة حالياً (مع استبعاد المنتهية صلاحيتها وترتيب الأولوية)
  const activeFeaturedMap = useMemo(
    () => getActiveFeaturedMap(featuredProductIds, featuredMeta),
    [featuredProductIds, featuredMeta]
  );

  // تصفية المنتجات في الرئيسية (المعتمدة وغير منتهية الصلاحية، وإعلانات المستخدم الحالي قيد المراجعة)
  const approvedProducts = productsWithVerification.filter(
    (p) =>
      (p.status === 'approved' || (currentUser && p.user_id === currentUser.id)) &&
      p.category !== '__SYSTEM_CONFIG__' &&
      !isAdExpired(p.created_at, marketRules.adExpiryDays)
  );
  const filteredCategoryItems = filterProducts(approvedProducts, {
    category: activeCategoryName,
    subCategory: activeSubCategory,
    province: filterProvince,
    searchQuery: searchQuery,
  });

  // فرز الإعلانات والمنشورات حسب الأولوية المميزة واختيار الترتيب
  const currentCategoryItems = useMemo(
    () => sortMarketplaceProducts(filteredCategoryItems, sortOrder, activeFeaturedMap),
    [filteredCategoryItems, sortOrder, activeFeaturedMap]
  );

  // إعلانات المستخدم المسجل حالياً
  const myProducts = productsWithVerification.filter((i) => currentUser && i.user_id === currentUser.id);

  // تأكيد أمان إضافي كجزء أساسي من التطبيق قبل تنفيذ حذف الإعلان
  const handleConfirmDeleteProduct = async () => {
    if (isCurrentUserBanned || !productToDelete) return;
    setIsDeletingProduct(true);
    try {
      const { error } = await supabase.from('products').delete().eq('id', productToDelete.id);
      if (!error) {
        setProducts((prev) => prev.filter((p) => p.id !== productToDelete.id));
        setToastMessage('تم حذف الإعلان نهائياً بنجاح');
        setTimeout(() => setToastMessage(null), 2500);
      }
    } catch {
      // هادئ
    } finally {
      setIsDeletingProduct(false);
      setProductToDelete(null);
    }
  };

  // ميزة سحب الصفحة للأسفل لتحديث الصفحة الحالية (Pull-to-refresh) عبر كامل التطبيق
  useEffect(() => {
    let startY = 0;
    let isTracking = false;

    const onTouchStart = (e: TouchEvent) => {
      if (window.scrollY <= 0) {
        startY = e.touches[0].clientY;
        isTracking = true;
      }
    };

    const onTouchMove = (e: TouchEvent) => {
      if (!isTracking || isRefreshing) return;
      if (window.scrollY > 0) {
        setPullDistance(0);
        isTracking = false;
        return;
      }
      const currentY = e.touches[0].clientY;
      const delta = currentY - startY;
      if (delta > 0) {
        const dist = Math.min(delta * 0.45, 80);
        setPullDistance(dist);
      } else {
        setPullDistance(0);
      }
    };

    const onTouchEnd = async () => {
      if (!isTracking) return;
      isTracking = false;
      setPullDistance((currentDist) => {
        if (currentDist >= 55) {
          setIsRefreshing(true);
          Promise.all([
            fetchProducts(),
            fetchNotifications(),
            fetchCloudConfig(),
          ]).finally(() => {
            setToastMessage('تم تحديث الصفحة الحالية بنجاح ✓');
            setTimeout(() => setToastMessage(null), 2000);
            setTimeout(() => {
              setIsRefreshing(false);
              setPullDistance(0);
            }, 500);
          });
          return 60;
        }
        return 0;
      });
    };

    window.addEventListener('touchstart', onTouchStart, { passive: true });
    window.addEventListener('touchmove', onTouchMove, { passive: true });
    window.addEventListener('touchend', onTouchEnd);

    return () => {
      window.removeEventListener('touchstart', onTouchStart);
      window.removeEventListener('touchmove', onTouchMove);
      window.removeEventListener('touchend', onTouchEnd);
    };
  }, [isRefreshing]);

  // دعم السحب بالفأرة على الحاسوب للتجربة والتصفح السريع
  const handleTouchStart = (e: React.MouseEvent) => {
    if (window.scrollY <= 0) {
      touchStartYRef.current = e.clientY;
      setIsPulling(true);
    }
  };

  const handleTouchMove = (e: React.MouseEvent) => {
    if (!isPulling || isRefreshing) return;
    if (window.scrollY > 0) {
      setPullDistance(0);
      setIsPulling(false);
      return;
    }
    const deltaY = e.clientY - touchStartYRef.current;
    if (deltaY > 0) {
      const distance = Math.min(deltaY * 0.45, 80);
      setPullDistance(distance);
    } else {
      setPullDistance(0);
    }
  };

  const handleTouchEnd = async () => {
    if (!isPulling) return;
    setIsPulling(false);
    if (pullDistance >= 55 && !isRefreshing) {
      setIsRefreshing(true);
      setPullDistance(60);
      try {
        await Promise.all([
          fetchProducts(),
          fetchNotifications(),
          fetchCloudConfig(),
        ]);
        setToastMessage('تم تحديث الصفحة الحالية بنجاح ✓');
        setTimeout(() => setToastMessage(null), 2000);
      } catch {
        // هادئ
      } finally {
        setTimeout(() => {
          setIsRefreshing(false);
          setPullDistance(0);
        }, 500);
      }
    } else {
      setPullDistance(0);
    }
  };

  // دمج تنبيه قرب انتهاء الاشتراك/التوثيق (قبل 3 أيام) ونتائج طلبات شام كاش بصمت داخل جرس الإشعارات
  const mergedNotifications = useMemo(() => {
    const extra: AdminNotification[] = [];
    if (currentUser?.id) {
      const expiryAlert = buildExpiryInAppNotification(currentUserWallet, walletConfig);
      if (expiryAlert) {
        extra.push(expiryAlert);
      }
      const userReqs = paymentRequests
        .filter((r) => r.userId === currentUser.id && (r.status === 'approved' || r.status === 'rejected'))
        .slice(0, 5);
      for (const req of userReqs) {
        extra.push({
          id: `payreq_notif_${req.id}_${req.status}`,
          title:
            req.status === 'approved'
              ? `تم اعتماد طلب ${req.targetTitle} ✓`
              : `تحديث حول طلب ${req.targetTitle}`,
          message:
            req.status === 'approved'
              ? req.requestType === 'package_recharge'
                ? `تمت إضافة ${req.pointsToCredit} نقطة إلى محفظتك بنجاح.`
                : `تم تفعيل باقة التاجر وتوثيق حسابك بنجاح.`
              : `تم رفض الطلب${req.rejectionReason ? `: ${req.rejectionReason}` : '.'}`,
          created_at: req.reviewedAt || req.createdAt,
          is_read: false,
        });
      }
    }
    return [...extra, ...notifications];
  }, [notifications, currentUser?.id, currentUserWallet, walletConfig, paymentRequests]);

  const unreadCount = mergedNotifications.filter((n) => !n.is_read).length;

  const handleSelectCategory = (catName: string) => {
    setActiveCategoryName(catName);
    setActiveSubCategory('الكل');
  };

  const currentCategoryData = categories.find((c) => c.name === activeCategoryName);
  const activeCreateCategoryData = categories.find((c) => c.name === productCategory);

  // ==========================================
  // شاشة الحظر الكامل والحجب عن التطبيق لحين انتهاء المدة أو فك الحظر من الإدارة
  // ==========================================
  if (isCurrentUserBanned && !maintenanceConfig.enabled) {
    return (
      <div
        dir="rtl"
        className="fixed inset-0 z-50 bg-slate-950 text-white flex flex-col items-center justify-center p-6 text-center overflow-y-auto"
      >
        <div className="w-full max-w-md rounded-3xl bg-slate-900/95 border border-rose-800/70 shadow-2xl p-6 space-y-5">
          <div className="w-20 h-20 mx-auto rounded-3xl bg-rose-500/15 border border-rose-500/40 text-rose-400 flex items-center justify-center shadow-lg shadow-rose-950/50">
            <ShieldAlert className="w-10 h-10" />
          </div>

          <div className="space-y-1.5">
            <h2 className="text-xl font-black text-rose-300">
              تم حظر حسابك عن استخدام التطبيق
            </h2>
            <p className="text-xs text-slate-300 leading-relaxed">
              لا يمكنك تصفح الإعلانات أو النشر أو إرسال أو استقبال أي طلبات خلال فترة الحظر.
            </p>
          </div>

          <div className="p-4 rounded-2xl bg-rose-950/50 border border-rose-900/80 text-right space-y-2 text-xs">
            <div>
              <span className="text-rose-400 font-bold block text-[11px]">سبب الحظر:</span>
              <p className="font-bold text-white mt-0.5 leading-relaxed">
                {currentBanState.banReason || 'مخالفة سياسة الاستخدام وشروط التطبيق'}
              </p>
            </div>

            <div className="pt-2 border-t border-rose-900/60 flex items-center justify-between gap-2">
              <span className="text-rose-300 font-bold flex items-center gap-1.5">
                <Clock className="w-4 h-4 shrink-0" />
                <span>المدة المتبقية:</span>
              </span>
              <span className="font-black text-amber-300 tabular-nums">
                {formatRemainingBanTime(currentBanState.bannedUntil, nowTick)}
              </span>
            </div>

            {currentBanState.bannedUntil && (
              <div className="text-[11px] text-slate-300 flex items-center justify-between gap-2">
                <span>موعد فك الحظر التلقائي:</span>
                <span className="font-bold text-slate-100">
                  {new Date(currentBanState.bannedUntil).toLocaleString('ar-SY')}
                </span>
              </div>
            )}
          </div>

          <p className="text-[11px] text-slate-400 leading-relaxed">
            سيُرفع الحظر ويعود حسابك للعمل تلقائياً فور انتهاء المدة المحددة أو فور إلغائه من الإدارة.
          </p>

          <div className="flex flex-col gap-2.5 pt-1">
            <button
              type="button"
              onClick={() => {
                setNowTick(Date.now());
                fetchCloudConfigRef.current();
                fetchCurrentUserProfileRef.current();
              }}
              className="w-full py-2.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-black text-xs transition-all cursor-pointer flex items-center justify-center gap-2"
            >
              <RefreshCw className="w-4 h-4" />
              <span>فحص حالة الحساب الآن</span>
            </button>

            {supportConfig?.whatsapp?.enabled && (
              <button
                type="button"
                onClick={() => handleOpenSupport('whatsapp')}
                className="w-full py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-200 font-bold text-xs transition-all cursor-pointer flex items-center justify-center gap-2"
              >
                <MessageCircle className="w-4 h-4 text-emerald-400" />
                <span>{supportConfig.whatsapp.label || 'تواصل مع الإدارة عبر واتساب'}</span>
              </button>
            )}

            <button
              type="button"
              onClick={handleSignOut}
              className="w-full py-2.5 rounded-xl bg-rose-950/70 hover:bg-rose-900 border border-rose-800 text-rose-200 font-bold text-xs transition-all cursor-pointer flex items-center justify-center gap-2"
            >
              <LogOut className="w-4 h-4" />
              <span>تسجيل الخروج</span>
            </button>
          </div>
        </div>
      </div>
    );
  }

  // ==========================================
  // واجهة نشر الإعلان
  // ==========================================
  if (showCreateScreen) {
    return (
      <motion.div
        initial={{ opacity: 0, y: 25 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.26, ease: [0.16, 1, 0.3, 1] }}
        onMouseDown={handleTouchStart}
        onMouseMove={handleTouchMove}
        onMouseUp={handleTouchEnd}
        className={`min-h-screen ${darkMode ? 'dark bg-slate-950 text-slate-100' : 'bg-slate-50 text-slate-800'} flex flex-col justify-between select-none relative`}
      >
        {/* شريط السحب لتحديث الصفحة الحالية (Pull-to-refresh) */}
        {(pullDistance > 0 || isRefreshing) && (
          <div
            style={{
              transform: `translateY(${isRefreshing ? 12 : Math.max(pullDistance - 50, 8)}px)`,
              opacity: isRefreshing ? 1 : Math.min(pullDistance / 40, 1),
            }}
            className="fixed top-0 left-1/2 -translate-x-1/2 z-50 pointer-events-none transition-transform duration-100 ease-out"
          >
            <div className="flex items-center gap-2 px-4 py-1.5 rounded-full shadow-lg border backdrop-blur-md bg-white/95 border-slate-200 text-slate-800">
              <RefreshCw
                className={`w-4 h-4 text-emerald-500 ${isRefreshing ? 'animate-spin' : ''}`}
                style={!isRefreshing ? { transform: `rotate(${pullDistance * 5}deg)` } : undefined}
              />
              <span className="text-xs font-bold">
                {isRefreshing
                  ? 'جاري تحديث الصفحة...'
                  : pullDistance >= 55
                  ? 'أفلت للتحديث الآن'
                  : 'اسحب للأسفل لتحديث الصفحة'}
              </span>
            </div>
          </div>
        )}

        {/* شريط أعلى واجهة النشر */}
        <header className="sticky top-0 z-30 bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800 px-4 py-3 shadow-xs">
          <div className="max-w-3xl mx-auto w-full flex items-center justify-between">
            <button
              type="button"
              disabled={isPublishing}
              onClick={() => {
                setShowCreateScreen(false);
                setEditingProduct(null);
                setPublishError(null);
                setSessionUnlockedExtraImages(0);
                setSessionUnlockedExtraPost(false);
              }}
              className="flex items-center gap-1.5 text-sm font-semibold text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white transition-colors cursor-pointer p-1"
            >
              <ArrowRight className="w-5 h-5" />
              <span>رجوع</span>
            </button>
            <h2 className="text-base font-bold text-slate-900 dark:text-slate-100">
              {editingProduct ? 'تعديل الإعلان' : 'نشر إعلان جديد'}
            </h2>
            <div className="w-12"></div>
          </div>
        </header>

        {/* نموذج واجهة نشر المنتج المتجاوب */}
        <main className="flex-1 max-w-3xl mx-auto w-full px-4 py-5 overflow-y-auto">
          {!currentUser ? (
            <div className="bg-white rounded-2xl p-6 border border-slate-200 shadow-sm text-center flex flex-col items-center justify-center my-8 space-y-4">
              <div className="w-16 h-16 rounded-full bg-emerald-100 text-emerald-700 flex items-center justify-center">
                <LogIn className="w-8 h-8" />
              </div>
              <div>
                <h3 className="text-base font-bold text-slate-900">تسجيل الدخول مطلوب للنشر</h3>
                <p className="text-xs text-slate-500 mt-1 max-w-xs leading-relaxed mx-auto">
                  لتتمكن من نشر إعلانك في سوق سوريا والتمكن من إدارته وحذفه في أي وقت، يرجى تسجيل الدخول أو إنشاء حساب جديد.
                </p>
              </div>
              <div className="w-full space-y-2 pt-2">
                <button
                  type="button"
                  onClick={() => {
                    setAuthModalReason('سجّل الدخول للمتابعة إلى واجهة نشر إعلانك');
                    setAuthModalInitialMode('login');
                    setShowAuthModal(true);
                  }}
                  className="w-full py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-xl text-xs transition-colors cursor-pointer flex items-center justify-center gap-2"
                >
                  <LogIn className="w-4 h-4" />
                  <span>تسجيل الدخول</span>
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setAuthModalReason('أنشئ حساباً جديداً لنشر إعلانك في سوق سوريا');
                    setAuthModalInitialMode('signup');
                    setShowAuthModal(true);
                  }}
                  className="w-full py-2.5 bg-white hover:bg-slate-50 text-slate-700 font-bold rounded-xl text-xs transition-colors border border-slate-200 cursor-pointer flex items-center justify-center gap-2"
                >
                  <UserPlus className="w-4 h-4" />
                  <span>إنشاء حساب جديد</span>
                </button>
              </div>
            </div>
          ) : publishSuccess ? (
            <div className="bg-white rounded-2xl p-8 border border-emerald-100 shadow-sm text-center flex flex-col items-center justify-center my-12">
              <CheckCircle2 className="w-16 h-16 text-emerald-500 mb-3 animate-bounce" />
              <h3 className="text-lg font-bold text-slate-900 mb-1">تم نشر الإعلان بنجاح!</h3>
              <p className="text-xs text-slate-500">جاري توجيهك إلى صفحة الإعلانات...</p>
            </div>
          ) : (
            <form onSubmit={handlePublishSubmit} className="bg-white dark:bg-slate-900 rounded-2xl p-5 border border-slate-200 dark:border-slate-800 shadow-xs space-y-4">
              {publishError && (
                <div className="p-3 bg-red-50 dark:bg-red-950/50 border border-red-200 dark:border-red-900 rounded-xl text-xs text-red-600 dark:text-red-400 flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 shrink-0" />
                  <span>{publishError}</span>
                </div>
              )}

              {/* تنبيه وحد الإعلانات اليومي عند تفعيل نظام الدفع */}
              {!editingProduct && walletConfig.enabled && !effectiveCanPostNewAd && (
                <div className="p-3.5 rounded-2xl bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800 text-amber-900 dark:text-amber-200 text-xs space-y-2.5">
                  <div className="flex items-start gap-2 font-bold">
                    <Coins className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
                    <span>
                      لقد وصلت إلى الحد المجاني اليومي ({postingEntitlement.maxDailyAdsAllowed} إعلان). رصيدك الحالي: {currentUserWallet.points} نقطة.
                    </span>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {postingEntitlement.extraDailyAdPointCost > 0 && (
                      <button
                        type="button"
                        onClick={handleUnlockExtraDailyAd}
                        className="px-3 py-1.5 rounded-xl bg-amber-500 hover:bg-amber-600 text-white font-bold text-[11px] cursor-pointer"
                      >
                        فتح إعلان إضافي بـ {postingEntitlement.extraDailyAdPointCost} نقطة
                      </button>
                    )}
                    <button
                      type="button"
                      onClick={() => {
                        setWalletModalTab('plans');
                        setWalletModalOpen(true);
                      }}
                      className="px-3 py-1.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-[11px] cursor-pointer"
                    >
                      ترقية لباقة التاجر الموثق
                    </button>
                  </div>
                </div>
              )}

              {/* 1. صور المنتج أو الإعلان */}
              {isPostFieldVisible('images', true) && (
                <div>
                  <div className="flex items-center justify-between mb-1.5">
                    <label className="block text-xs font-bold text-slate-700 dark:text-slate-200">
                      صور المنتج أو الإعلان (حتى {effectiveMaxImagesPerAd} صور كحد أقصى) {isPostFieldRequired('images', false) && <span className="text-rose-500">*</span>}
                    </label>
                    <span className="text-[11px] text-slate-500 font-medium">
                      {productImages.length} من {effectiveMaxImagesPerAd} صور
                    </span>
                  </div>

                  <input
                    type="file"
                    ref={fileInputRef}
                    onChange={handleMultiImageChange}
                    accept="image/*"
                    multiple
                    className="hidden"
                    id="product-images-upload"
                  />

                  {productImages.length > 0 ? (
                    <div className="space-y-2">
                      <div className="grid grid-cols-3 gap-2">
                        {productImages.map((img, idx) => (
                          <div
                            key={idx}
                            className="relative rounded-xl overflow-hidden border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 aspect-square group shadow-2xs"
                          >
                            <img
                              src={img.preview}
                              alt={`صورة ${idx + 1}`}
                              className="w-full h-full object-cover"
                            />
                            <span className="absolute top-1.5 right-1.5 px-1.5 py-0.5 rounded-md bg-black/60 text-white text-[10px] font-bold">
                              صورة {idx + 1}
                            </span>
                            <button
                              type="button"
                              onClick={() => removeImageAtIndex(idx)}
                              className="absolute bottom-1.5 left-1.5 p-1 rounded-lg bg-red-600/90 text-white hover:bg-red-700 transition-colors shadow-xs cursor-pointer"
                              title="حذف هذه الصورة"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        ))}

                        {productImages.length < effectiveMaxImagesPerAd && (
                          <button
                            type="button"
                            onClick={() => fileInputRef.current?.click()}
                            className="rounded-xl border-2 border-dashed border-slate-300 dark:border-slate-700 hover:border-emerald-500 flex flex-col items-center justify-center gap-1 bg-slate-50/50 dark:bg-slate-800/50 hover:bg-emerald-50/20 text-slate-500 hover:text-emerald-700 transition-all aspect-square cursor-pointer p-2"
                          >
                            <Plus className="w-5 h-5" />
                            <span className="text-[10px] font-bold">إضافة صورة</span>
                            <span className="text-[9px] text-slate-400">({effectiveMaxImagesPerAd - productImages.length} متبقية)</span>
                          </button>
                        )}
                      </div>

                      {walletConfig.enabled &&
                        productImages.length >= effectiveMaxImagesPerAd &&
                        postingEntitlement.extraImagePointCost > 0 && (
                          <div className="p-2.5 rounded-xl bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800 flex items-center justify-between gap-2 text-xs">
                            <span className="text-amber-800 dark:text-amber-200 font-semibold">
                              هل تحتاج صورة إضافية؟ (رصيدك: {currentUserWallet.points} نقطة)
                            </span>
                            <button
                              type="button"
                              onClick={handleUnlockExtraImageSlot}
                              className="px-3 py-1 rounded-lg bg-amber-500 hover:bg-amber-600 text-white text-[11px] font-bold shrink-0 cursor-pointer"
                            >
                              +1 صورة بـ {postingEntitlement.extraImagePointCost} نقطة
                            </button>
                          </div>
                        )}

                      <p className="text-[11px] text-slate-400 leading-normal">
                        * تظهر الصور للمشاهدين مجمّعة في بطاقة واحدة كمنشورات التواصل، مع إمكانية النقر والتكبير.
                      </p>
                    </div>
                  ) : (
                    <button
                      type="button"
                      onClick={() => fileInputRef.current?.click()}
                      className="w-full border-2 border-dashed border-slate-300 dark:border-slate-700 hover:border-emerald-500 rounded-xl p-5 flex flex-col items-center justify-center gap-2 bg-slate-50/50 dark:bg-slate-800/50 hover:bg-emerald-50/20 transition-all cursor-pointer text-slate-500 hover:text-emerald-700"
                    >
                      <div className="w-10 h-10 rounded-full bg-white dark:bg-slate-800 shadow-xs flex items-center justify-center text-slate-400">
                        <ImageIcon className="w-5 h-5" />
                      </div>
                      <span className="text-xs font-bold">اضغط لإرفاق صور للمنتج (حتى {effectiveMaxImagesPerAd} صور)</span>
                      <span className="text-[10px] text-slate-400">PNG, JPG (يتم ضغطها تلقائياً قبل الرفع)</span>
                    </button>
                  )}
                </div>
              )}

              {/* 2. اسم المنتج أو عنوان الإعلان */}
              {isPostFieldVisible('title', true) && (
                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-200 mb-1.5">
                    اسم المنتج أو الإعلان {isPostFieldRequired('title', true) && <span className="text-rose-500">*</span>}
                  </label>
                  <input
                    type="text"
                    required={isPostFieldRequired('title', true)}
                    value={productName}
                    onChange={(e) => setProductName(e.target.value)}
                    placeholder="أدخل اسم المنتج أو الإعلان..."
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-emerald-500 text-sm"
                  />
                </div>
              )}

              {/* اختيار القسم الرئيسي والفرعي */}
              {isPostFieldVisible('category', true) && (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                  <div>
                    <label className="block text-xs font-bold text-slate-700 dark:text-slate-200 mb-1.5">
                      القسم الرئيسي {isPostFieldRequired('category', true) && <span className="text-rose-500">*</span>}
                    </label>
                    {categories.length === 0 ? (
                      <div className="p-3 rounded-xl bg-slate-100 dark:bg-slate-800 text-xs text-slate-500 dark:text-slate-400 font-medium text-right">
                        لا توجد أقسام
                      </div>
                    ) : (
                      <select
                        required={isPostFieldRequired('category', true)}
                        value={productCategory}
                        onChange={(e) => {
                          setProductCategory(e.target.value);
                          setProductSubCategory('');
                        }}
                        className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 focus:outline-none focus:ring-2 focus:ring-emerald-500 text-sm cursor-pointer appearance-none text-slate-800 dark:text-slate-100"
                      >
                        <option value="" disabled>-- اختر القسم --</option>
                        {categories.map((cat) => (
                          <option key={cat.id || cat.name} value={cat.name}>
                            {cat.name}
                          </option>
                        ))}
                      </select>
                    )}
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-700 dark:text-slate-200 mb-1.5">
                      القسم الفرعي {isPostFieldRequired('category', true) && <span className="text-rose-500">*</span>}
                    </label>
                    {activeCreateCategoryData?.subCategories && activeCreateCategoryData.subCategories.length > 0 ? (
                      <select
                        required={isPostFieldRequired('category', true)}
                        value={productSubCategory}
                        onChange={(e) => setProductSubCategory(e.target.value)}
                        className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 focus:outline-none focus:ring-2 focus:ring-emerald-500 text-sm cursor-pointer appearance-none text-slate-800 dark:text-slate-100"
                      >
                        <option value="">-- اختر القسم الفرعي --</option>
                        {activeCreateCategoryData.subCategories.map((sub) => (
                          <option key={sub} value={sub}>
                            {sub}
                          </option>
                        ))}
                      </select>
                    ) : (
                      <input
                        type="text"
                        required={isPostFieldRequired('category', true)}
                        value={productSubCategory}
                        onChange={(e) => setProductSubCategory(e.target.value)}
                        placeholder="اكتب القسم الفرعي..."
                        className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 focus:outline-none focus:ring-2 focus:ring-emerald-500 text-sm text-slate-800 dark:text-slate-100"
                      />
                    )}
                  </div>
                </div>
              )}

              {/* المحافظة والعنوان */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                {isPostFieldVisible('province', true) && (
                  <div>
                    <label className="block text-xs font-bold text-slate-700 dark:text-slate-200 mb-1.5">
                      المحافظة {isPostFieldRequired('province', true) && <span className="text-rose-500">*</span>}
                    </label>
                    <div className="relative">
                      {provincesData.length > 0 ? (
                        <select
                          required={isPostFieldRequired('province', true)}
                          value={selectedProvince}
                          onChange={(e) => setSelectedProvince(e.target.value)}
                          className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 focus:outline-none focus:ring-2 focus:ring-emerald-500 text-sm cursor-pointer appearance-none text-slate-800 dark:text-slate-100"
                        >
                          <option value="" disabled>اختر المحافظة</option>
                          {provincesData.map((prov) => (
                            <option key={prov} value={prov}>
                              {prov}
                            </option>
                          ))}
                        </select>
                      ) : (
                        <input
                          type="text"
                          required={isPostFieldRequired('province', true)}
                          value={selectedProvince}
                          onChange={(e) => setSelectedProvince(e.target.value)}
                          placeholder="اكتب اسم المحافظة أو المدينة..."
                          className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 focus:outline-none focus:ring-2 focus:ring-emerald-500 text-sm text-slate-800 dark:text-slate-100"
                        />
                      )}
                      <div className="absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none text-slate-400">
                        <MapPin className="w-4 h-4" />
                      </div>
                    </div>
                  </div>
                )}

                {isPostFieldVisible('location', true) && (
                  <div>
                    <label className="block text-xs font-bold text-slate-700 dark:text-slate-200 mb-1.5">
                      العنوان والمنطقة {isPostFieldRequired('location', true) && <span className="text-rose-500">*</span>}
                    </label>
                    <input
                      type="text"
                      required={isPostFieldRequired('location', true)}
                      value={productAddress}
                      onChange={(e) => setProductAddress(e.target.value)}
                      placeholder="مثال: دمشق - المزة... إلخ"
                      className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 focus:outline-none focus:ring-2 focus:ring-emerald-500 text-sm text-slate-800 dark:text-slate-100"
                    />
                  </div>
                )}
              </div>

              {/* رقم الواتساب للتواصل */}
              {isPostFieldVisible('whatsapp', true) && (
                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-200 mb-1.5">
                    رقم الواتساب للتواصل {isPostFieldRequired('whatsapp', true) && <span className="text-rose-500">* (إلزامي)</span>}
                  </label>
                  <div className="relative">
                    <input
                      type="tel"
                      required={isPostFieldRequired('whatsapp', true)}
                      dir="ltr"
                      value={productWhatsapp}
                      onChange={(e) => setProductWhatsapp(e.target.value)}
                      placeholder="مثال: 0912345678 أو 9639..."
                      className="w-full pl-10 pr-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-emerald-500 text-sm text-right"
                    />
                    <div className="absolute left-3.5 top-1/2 -translate-y-1/2 text-emerald-600">
                      <MessageCircle className="w-4 h-4" />
                    </div>
                  </div>
                </div>
              )}

              {/* السعر والعملة وقابلية التفاوض */}
              {(isPostFieldVisible('price', true) || isPostFieldVisible('is_negotiable', true)) && (
                <div className="space-y-2">
                  {isPostFieldVisible('price', true) && (
                    <>
                      <label className="block text-xs font-bold text-slate-700 dark:text-slate-200">
                        السعر والعملة {isPostFieldRequired('price', false) && <span className="text-rose-500">*</span>}
                      </label>
                      <div className="flex gap-2">
                        <div className="relative flex-1">
                          <input
                            type="text"
                            required={isPostFieldRequired('price', false)}
                            value={productPrice}
                            onChange={(e) => setProductPrice(e.target.value)}
                            placeholder="أدخل المبلغ..."
                            className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-emerald-500 text-sm"
                          />
                        </div>
                        <div className="flex bg-slate-100 dark:bg-slate-800 p-1 rounded-xl border border-slate-200 dark:border-slate-700 shrink-0">
                          {(marketRules.allowedCurrencies?.length ? marketRules.allowedCurrencies : ['SYP', 'USD']).includes('SYP') && (
                            <button
                              type="button"
                              onClick={() => setProductCurrency('SYP')}
                              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                                productCurrency === 'SYP'
                                  ? 'bg-white dark:bg-slate-700 text-emerald-700 dark:text-emerald-400 shadow-2xs'
                                  : 'text-slate-500 hover:text-slate-700 dark:text-slate-400'
                              }`}
                            >
                              ل.س (سوري)
                            </button>
                          )}
                          {(marketRules.allowedCurrencies?.length ? marketRules.allowedCurrencies : ['SYP', 'USD']).includes('USD') && (
                            <button
                              type="button"
                              onClick={() => setProductCurrency('USD')}
                              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                                productCurrency === 'USD'
                                  ? 'bg-white dark:bg-slate-700 text-emerald-700 dark:text-emerald-400 shadow-2xs'
                                  : 'text-slate-500 hover:text-slate-700 dark:text-slate-400'
                              }`}
                            >
                              $ (دولار)
                            </button>
                          )}
                        </div>
                      </div>
                    </>
                  )}

                  {isPostFieldVisible('is_negotiable', true) && (
                    <label className="flex items-center gap-2 cursor-pointer pt-0.5 select-none">
                      <input
                        type="checkbox"
                        checked={productIsNegotiable}
                        onChange={(e) => setProductIsNegotiable(e.target.checked)}
                        className="w-4 h-4 rounded text-emerald-600 focus:ring-emerald-500 border-slate-300 cursor-pointer"
                      />
                      <span className="text-xs font-medium text-slate-700 dark:text-slate-300">
                        السعر قابل للتفاوض والمفاصلة
                      </span>
                    </label>
                  )}
                </div>
              )}

              {/* تفاصيل إضافية */}
              {isPostFieldVisible('description', true) && (
                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-200 mb-1.5">
                    تفاصيل إضافية عن المنتج {isPostFieldRequired('description', false) && <span className="text-rose-500">*</span>}
                  </label>
                  <textarea
                    rows={3}
                    required={isPostFieldRequired('description', false)}
                    value={productDescription}
                    onChange={(e) => setProductDescription(e.target.value)}
                    placeholder="أدخل أي مواصفات أو تفاصيل للمشتري..."
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-emerald-500 text-sm resize-none"
                  />
                </div>
              )}

              {/* الحقول المخصصة الإضافية حسب القسم المختار */}
              {visibleCategoryCustomFields.length > 0 && (
                <div className="space-y-3.5 pt-2 border-t border-slate-100 dark:border-slate-800">
                  <h4 className="text-xs font-bold text-slate-700 dark:text-slate-200">
                    مواصفات وحقول {productCategory ? `قسم ${productCategory}` : 'إضافية'}
                  </h4>
                  {visibleCategoryCustomFields.map((cf) => (
                    <div key={cf.id || cf.name}>
                      <label className="block text-xs font-bold text-slate-700 dark:text-slate-200 mb-1.5">
                        {cf.label} {cf.required && <span className="text-rose-500">*</span>}
                      </label>
                      {cf.type === 'textarea' ? (
                        <textarea
                          rows={2}
                          required={cf.required}
                          value={customProductValues[cf.name] || ''}
                          onChange={(e) => setCustomProductValues((prev) => ({ ...prev, [cf.name]: e.target.value }))}
                          placeholder={cf.placeholder || `أدخل ${cf.label}...`}
                          className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-emerald-500 text-sm resize-none"
                        />
                      ) : cf.type === 'select' && cf.options && cf.options.length > 0 ? (
                        <select
                          required={cf.required}
                          value={customProductValues[cf.name] || ''}
                          onChange={(e) => setCustomProductValues((prev) => ({ ...prev, [cf.name]: e.target.value }))}
                          className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-emerald-500 text-sm cursor-pointer"
                        >
                          <option value="">-- اختر {cf.label} --</option>
                          {cf.options.map((opt: string) => (
                            <option key={opt} value={opt}>
                              {opt}
                            </option>
                          ))}
                        </select>
                      ) : (
                        <input
                          type={cf.type === 'number' ? 'number' : cf.type === 'date' ? 'date' : 'text'}
                          required={cf.required}
                          value={customProductValues[cf.name] || ''}
                          onChange={(e) => setCustomProductValues((prev) => ({ ...prev, [cf.name]: e.target.value }))}
                          placeholder={cf.placeholder || `أدخل ${cf.label}...`}
                          className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-emerald-500 text-sm"
                        />
                      )}
                    </div>
                  ))}
                </div>
              )}

              {/* زر النشر أو حفظ التعديل مع مؤشر التحميل */}
              <div className="pt-2">
                <button
                  type="submit"
                  disabled={isPublishing}
                  className="w-full py-3 bg-emerald-600 hover:bg-emerald-700 active:scale-[0.99] text-white font-bold rounded-xl text-sm transition-all shadow-md cursor-pointer flex items-center justify-center gap-2 disabled:opacity-75 disabled:cursor-wait"
                >
                  {isPublishing ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      <span>{publishStep || 'جارٍ الحفظ...'}</span>
                    </>
                  ) : (
                    <>
                      <CheckCircle2 className="w-4 h-4" />
                      <span>{editingProduct ? 'حفظ التعديلات' : 'نشر الإعلان الآن'}</span>
                    </>
                  )}
                </button>
              </div>
            </form>
          )}
        </main>
      </motion.div>
    );
  }

  // ==========================================
  // الواجهة الرئيسية
  // ==========================================
  const targetingContext = {
    province: filterProvince,
    category: activeCategoryName,
    isLoggedIn: Boolean(currentUser),
  };
  const visibleContextWidgets = filterWidgetsByContext(customWidgets, targetingContext);
  const inlineWidgetsByPos = (pos: string) =>
    visibleContextWidgets.filter((w) => w.position === pos);
  const activeBanners = filterActiveBanners(promotionalBanners, targetingContext);
  const currentBanner =
    activeBanners.length > 0 ? activeBanners[carouselIndex % activeBanners.length] : null;

  const cloudPrimary = themeConfig.primaryColor;
  const cloudPageBg = darkMode ? themeConfig.darkBackgroundColor : themeConfig.backgroundColor;
  const gridColsClass =
    themeConfig.gridColumns === 1
      ? 'grid-cols-1'
      : themeConfig.gridColumns === 2
      ? 'grid-cols-1 sm:grid-cols-2'
      : themeConfig.gridColumns === 3
      ? 'grid-cols-1 md:grid-cols-2 lg:grid-cols-3'
      : 'grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4';

  const headerCfg = uiConfig.headerLayout || {};
  const loginPos = headerCfg.loginBtnPosition || 'right';
  const notifPos = headerCfg.notificationsBtnPosition || 'left';
  const brandPos = headerCfg.brandPosition || 'center';
  const myProductsNavCfg = navItems.find((n) => n.key === 'my_products');
  const showMyProductsCountBadge =
    marketRules.showMyProductsCountBadge !== false &&
    myProductsNavCfg?.features?.show_ads_count_badge !== false;

  const renderLoginBtn = () =>
    !currentUser ? (
      <button
        type="button"
        onClick={() => {
          setAuthModalReason(null);
          setAuthModalInitialMode('login');
          setShowAuthModal(true);
        }}
        className="flex items-center gap-1 px-2.5 py-1 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-[11px] font-bold transition-all shadow-xs active:scale-95 cursor-pointer shrink-0"
        aria-label={uiText('loginBtn', 'تسجيل دخول')}
      >
        <LogIn className="w-3 h-3" />
        <span>{uiText('loginBtn', 'تسجيل دخول')}</span>
      </button>
    ) : (
      <button
        type="button"
        onClick={() => setActiveTab('me')}
        className={`flex items-center gap-1.5 px-2.5 py-1 rounded-xl ${darkMode ? 'bg-emerald-950/60 text-emerald-300 border-emerald-800' : 'bg-emerald-50 text-emerald-800 border-emerald-100'} text-[11px] font-bold transition-colors cursor-pointer border`}
      >
        <span className="w-2 h-2 rounded-full bg-emerald-500" />
        <span className="max-w-[75px] truncate">
          {currentUserProfile?.full_name?.split(' ')[0] || currentUser.user_metadata?.full_name?.split(' ')[0] || 'حسابي'}
        </span>
        {isCurrentUserVerified && (
          <CheckCircle2
            style={
              themeConfig.verifiedBadge?.iconColor
                ? { color: '#ffffff', fill: themeConfig.verifiedBadge.iconColor }
                : undefined
            }
            className={`w-3.5 h-3.5 shrink-0 ${
              themeConfig.verifiedBadge?.iconColor ? '' : 'text-white fill-amber-500'
            }`}
          />
        )}
      </button>
    );

  const renderNotifBtn = () => (
    <button
      type="button"
      onClick={() => {
        if (!currentUser) {
          setAuthModalReason('يرجى تسجيل الدخول أو إنشاء حساب جديد للاطلاع على الإشعارات والتنبيهات المخصصة لك');
          setAuthModalInitialMode('login');
          setShowAuthModal(true);
        } else {
          setShowNotifications(true);
        }
      }}
      className={`relative p-2 rounded-full ${darkMode ? 'text-slate-300 hover:text-white hover:bg-slate-800' : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'} transition-colors cursor-pointer`}
      aria-label="الإشعارات"
      title="الإشعارات"
    >
      <Bell className="w-5 h-5" />
      {unreadCount > 0 && (
        <span className="absolute top-1.5 right-1.5 w-2.5 h-2.5 bg-red-500 rounded-full ring-2 ring-white" />
      )}
    </button>
  );

  const renderWalletBtn = () =>
    walletConfig.showWalletButtonInHeader ? (
      <button
        type="button"
        onClick={() => {
          setWalletModalTab('overview');
          setWalletModalOpen(true);
        }}
        className="flex items-center gap-1 px-2.5 py-1 rounded-xl bg-amber-500 hover:bg-amber-600 text-white text-[11px] font-bold transition-all shadow-xs active:scale-95 cursor-pointer shrink-0"
        aria-label={walletConfig.walletButtonLabel || 'محفظتي'}
        title={walletConfig.walletButtonLabel || 'محفظتي'}
      >
        <Wallet className="w-3.5 h-3.5" />
        <span>{walletConfig.walletButtonLabel || 'محفظتي'}</span>
        {currentUser && (
          <span className="px-1.5 py-0.2 rounded-md bg-black/20 text-[10px] font-black">
            {currentUserWallet.points}
          </span>
        )}
      </button>
    ) : null;

  const vBadgeCfg =
    resolveSellerVerificationBadge(
      currentUser?.id,
      isCurrentUserVerified,
      effectiveUserTiers,
      themeConfig.verificationTiers || [],
      themeConfig.verifiedBadge
    ) || themeConfig.verifiedBadge;
  const vBadgeEffectClass =
    vBadgeCfg?.effect === 'shimmer'
      ? 'souq-badge-shimmer'
      : vBadgeCfg?.effect === 'glow'
      ? 'souq-badge-glow'
      : vBadgeCfg?.effect === 'metallic_gold'
      ? 'souq-badge-metallic'
      : '';
  const vBadgeInlineStyle: React.CSSProperties | undefined = vBadgeCfg
    ? ({
        ...(vBadgeCfg.textColor ? { color: vBadgeCfg.textColor } : {}),
        ...(vBadgeCfg.borderColor ? { borderColor: vBadgeCfg.borderColor } : {}),
        ...(vBadgeCfg.useGradient && vBadgeCfg.bgColor && vBadgeCfg.gradientTo
          ? { backgroundImage: `linear-gradient(135deg, ${vBadgeCfg.bgColor}, ${vBadgeCfg.gradientTo})` }
          : vBadgeCfg.bgColor
          ? { backgroundColor: vBadgeCfg.bgColor }
          : {}),
        ...(vBadgeCfg.effect === 'glow' || vBadgeCfg.effect === 'metallic_gold'
          ? {
              boxShadow: `0 0 12px ${vBadgeCfg.glowColor || 'rgba(245, 158, 11, 0.55)'}`,
              '--souq-glow-color': vBadgeCfg.glowColor || 'rgba(245, 158, 11, 0.55)',
            }
          : {}),
      } as React.CSSProperties)
    : undefined;

  return (
    <div
      onMouseDown={handleTouchStart}
      onMouseMove={handleTouchMove}
      onMouseUp={handleTouchEnd}
      style={cloudPageBg ? { backgroundColor: cloudPageBg } : undefined}
      className={`min-h-screen ${darkMode ? 'dark bg-slate-950 text-slate-100' : 'bg-slate-50 text-slate-800'} flex flex-col justify-between select-none transition-colors duration-150 relative`}
    >
      <style id="souq-cloud-theme">{`
        @keyframes souqShimmerMove {
          0% { transform: translateX(120%) skewX(-20deg); }
          100% { transform: translateX(-160%) skewX(-20deg); }
        }
        @keyframes souqGlowPulse {
          0%, 100% { filter: brightness(1); box-shadow: 0 0 8px var(--souq-glow-color, rgba(245, 158, 11, 0.55)); }
          50% { filter: brightness(1.08); box-shadow: 0 0 16px var(--souq-glow-color, rgba(245, 158, 11, 0.75)); }
        }
        .souq-badge-shimmer, .souq-badge-metallic {
          position: relative;
          overflow: hidden;
        }
        .souq-badge-shimmer::after, .souq-badge-metallic::after {
          content: '';
          position: absolute;
          inset: 0;
          width: 55%;
          background: linear-gradient(90deg, transparent, rgba(255,255,255,0.6), transparent);
          animation: souqShimmerMove 2.4s infinite ease-in-out;
          pointer-events: none;
        }
        .souq-badge-glow, .souq-badge-metallic {
          animation: souqGlowPulse 2.2s infinite ease-in-out;
        }
        ${cloudPrimary ? `
          .bg-emerald-600 { background-color: ${cloudPrimary} !important; }
          .hover\\:bg-emerald-700:hover { background-color: ${themeConfig.primaryHoverColor || cloudPrimary} !important; filter: brightness(0.92); }
          .text-emerald-600, .text-emerald-700 { color: ${cloudPrimary} !important; }
          .border-emerald-500, .border-emerald-600 { border-color: ${cloudPrimary} !important; }
        ` : ''}
        ${themeConfig.borderRadius ? `
          .rounded-2xl { border-radius: ${themeConfig.borderRadius === 'none' ? '0px' : themeConfig.borderRadius === 'md' ? '0.375rem' : themeConfig.borderRadius === 'xl' ? '0.75rem' : '1rem'} !important; }
          .rounded-xl { border-radius: ${themeConfig.borderRadius === 'none' ? '0px' : themeConfig.borderRadius === 'md' ? '0.25rem' : themeConfig.borderRadius === 'xl' ? '0.5rem' : '0.75rem'} !important; }
        ` : ''}
        ${themeConfig.customCss || ''}
      `}</style>
      {/* شريط السحب لتحديث الصفحة الحالية (Pull-to-refresh) */}
      {(pullDistance > 0 || isRefreshing) && (
        <div
          style={{
            transform: `translateY(${isRefreshing ? 12 : Math.max(pullDistance - 50, 8)}px)`,
            opacity: isRefreshing ? 1 : Math.min(pullDistance / 40, 1),
          }}
          className="fixed top-0 left-1/2 -translate-x-1/2 z-50 pointer-events-none transition-transform duration-100 ease-out"
        >
          <div
            className={`flex items-center gap-2 px-4 py-1.5 rounded-full shadow-lg border backdrop-blur-md ${
              darkMode
                ? 'bg-slate-900/95 border-slate-700 text-slate-100'
                : 'bg-white/95 border-slate-200 text-slate-800'
            }`}
          >
            <RefreshCw
              className={`w-4 h-4 text-emerald-500 ${isRefreshing ? 'animate-spin' : ''}`}
              style={!isRefreshing ? { transform: `rotate(${pullDistance * 5}deg)` } : undefined}
            />
            <span className="text-xs font-bold">
              {isRefreshing
                ? 'جاري تحديث الصفحة...'
                : pullDistance >= 55
                ? 'أفلت للتحديث الآن'
                : 'اسحب للأسفل لتحديث الصفحة'}
            </span>
          </div>
        </div>
      )}

      {/* رسالة الإذاعة العامة اللحظية (Flash Broadcast) إذا كانت مفعلة ولم تُغلق */}
      {broadcastConfig?.active && broadcastConfig.id !== dismissedBroadcastId && (
        <aside
          aria-label="إذاعة عامة"
          className={`w-full py-2.5 px-4 shadow-sm shrink-0 flex items-center justify-between gap-3 text-right animate-in fade-in ${
            broadcastConfig.type === 'urgent'
              ? 'bg-rose-600 text-white'
              : broadcastConfig.type === 'warning'
              ? 'bg-amber-600 text-white'
              : broadcastConfig.type === 'promo'
              ? 'bg-emerald-600 text-white'
              : 'bg-indigo-600 text-white'
          }`}
        >
          <div className="max-w-7xl mx-auto w-full px-2 sm:px-4 flex items-center justify-between gap-2">
            <div className="flex items-center gap-2 flex-1 min-w-0">
              <Sparkles className="w-4 h-4 shrink-0 text-white/90" />
              <div className="flex flex-col min-w-0 text-right">
                <span className="text-xs font-bold leading-tight">{broadcastConfig.title}</span>
                <span className="text-[11px] text-white/90 leading-tight truncate">{broadcastConfig.message}</span>
              </div>
            </div>

            <button
              type="button"
              onClick={() => {
                setDismissedBroadcastId(broadcastConfig.id);
                try {
                  sessionStorage.setItem('souq_dismissed_broadcast_id', broadcastConfig.id);
                } catch {}
              }}
              className="px-2.5 py-1 rounded-lg bg-black/20 hover:bg-black/30 text-white text-[10px] font-bold shrink-0 cursor-pointer"
            >
              إغلاق
            </button>
          </div>
        </aside>
      )}

      {/* أعلى الشاشة: تخطيط ديناميكي بالكامل قابل للتحكم من السحابة */}
      {headerCfg.showHeader !== false && (
      <header
        style={{
          ...(themeConfig.headerBgColor ? { backgroundColor: themeConfig.headerBgColor } : {}),
          ...(themeConfig.headerTextColor ? { color: themeConfig.headerTextColor } : {}),
        }}
        className={`sticky top-0 z-30 ${darkMode ? 'bg-slate-900/95 border-slate-800' : 'bg-white border-slate-200'} border-b px-4 py-2.5 shadow-xs transition-colors duration-150`}
      >
        <div className="max-w-7xl mx-auto w-full px-2 sm:px-4 relative flex items-center justify-between min-h-[38px]">
          {/* يمين الترويسة */}
          <div className="flex items-center gap-1.5 z-10">
            {loginPos === 'right' && renderLoginBtn()}
            {notifPos === 'right' && renderNotifBtn()}
            {walletConfig.walletButtonPosition === 'right' && renderWalletBtn()}
            {brandPos === 'right' && (
              <div className="flex items-center gap-2">
                {uiConfig.appLogoUrl && <img src={uiConfig.appLogoUrl} alt="" className="w-7 h-7 rounded-lg object-cover" />}
                <div className="flex flex-col text-right">
                  <h1 className="text-base sm:text-lg font-bold leading-tight">{uiConfig.appNameAr || 'سوق سوريا'}</h1>
                  {uiConfig.appNameEn !== '' && <span className="text-[9px] font-black tracking-widest uppercase opacity-70">{uiConfig.appNameEn || 'Souq Syria'}</span>}
                </div>
              </div>
            )}
            {courierConfig.enabled &&
              courierConfig.showDirectoryButtonInHeader &&
              courierConfig.directoryButtonPosition === 'header_right' && (
                <button
                  type="button"
                  onClick={() => openCourierModal('directory', null)}
                  className="px-2.5 py-1 rounded-lg bg-sky-600 hover:bg-sky-700 text-white text-[11px] font-bold flex items-center gap-1 shadow-xs cursor-pointer transition-colors"
                >
                  <Truck className="w-3.5 h-3.5" />
                  <span className="hidden sm:inline">{courierConfig.directoryButtonLabel || 'اطلب مندوب'}</span>
                </button>
              )}
            {courierConfig.enabled &&
              courierConfig.showApplyButtonInHeader &&
              courierConfig.applyButtonPosition === 'header_right' &&
              (myCourierApp?.status === 'approved' ? (
                <button
                  type="button"
                  onClick={() => openCourierModal('inbox', null)}
                  className="relative px-2.5 py-1 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white text-[11px] font-bold flex items-center gap-1 shadow-xs cursor-pointer transition-colors"
                >
                  <Inbox className="w-3.5 h-3.5" />
                  <span className="hidden sm:inline">{courierConfig.incomingRequestsButtonLabel || 'طلبات المستخدمين'}</span>
                  {myUnreadCourierRequestsCount > 0 && (
                    <span className="px-1.5 py-0.2 rounded-full bg-rose-500 text-white text-[9px] font-black">
                      {myUnreadCourierRequestsCount}
                    </span>
                  )}
                </button>
              ) : (
                <button
                  type="button"
                  onClick={() => openCourierModal('apply', null)}
                  className="px-2.5 py-1 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-[11px] font-bold flex items-center gap-1 shadow-xs cursor-pointer transition-colors"
                >
                  <Truck className="w-3.5 h-3.5" />
                  <span className="hidden sm:inline">{courierConfig.applyButtonLabel || 'انضم كمندوب'}</span>
                </button>
              ))}
            {inlineWidgetsByPos('header_right').map((w) => (
              <button
                key={w.id}
                type="button"
                onClick={() => handleWidgetClick(w)}
                style={{ backgroundColor: w.bgColor || '#059669', color: w.textColor || '#ffffff' }}
                className="px-2.5 py-1 rounded-lg text-[11px] font-bold flex items-center gap-1 shadow-xs cursor-pointer"
              >
                {renderCloudIcon(w.icon, 'w-3 h-3')}
                <span>{w.label}</span>
              </button>
            ))}
          </div>

          {/* وسط الترويسة */}
          {brandPos === 'center' && (
            <div className="absolute left-1/2 -translate-x-1/2 flex items-center gap-2 pointer-events-none">
              {uiConfig.appLogoUrl && <img src={uiConfig.appLogoUrl} alt="" className="w-7 h-7 rounded-lg object-cover" />}
              <div className="flex flex-col items-center">
                <h1 className={`text-lg sm:text-xl font-bold tracking-tight leading-tight ${darkMode ? 'text-white' : 'text-slate-900'}`}>
                  {uiConfig.appNameAr || 'سوق سوريا'}
                </h1>
                {uiConfig.appNameEn !== '' && (
                  <span
                    className="text-[9px] sm:text-[10px] font-black tracking-widest uppercase text-black"
                    style={{
                      textShadow:
                        '1px 1px 0 #ffffff, -1px -1px 0 #ffffff, 1px -1px 0 #ffffff, -1px 1px 0 #ffffff, 0 1px 0 #ffffff, 0 -1px 0 #ffffff, 1px 0 0 #ffffff, -1px 0 0 #ffffff',
                    }}
                  >
                    {uiConfig.appNameEn || 'Souq Syria'}
                  </span>
                )}
              </div>
            </div>
          )}

          {/* يسار الترويسة */}
          <div className="flex items-center gap-1 z-10">
            {courierConfig.enabled &&
              courierConfig.showDirectoryButtonInHeader &&
              courierConfig.directoryButtonPosition === 'header_left' && (
                <button
                  type="button"
                  onClick={() => openCourierModal('directory', null)}
                  className="px-2.5 py-1 rounded-lg bg-sky-600 hover:bg-sky-700 text-white text-[11px] font-bold flex items-center gap-1 shadow-xs cursor-pointer transition-colors"
                >
                  <Truck className="w-3.5 h-3.5" />
                  <span className="hidden sm:inline">{courierConfig.directoryButtonLabel || 'اطلب مندوب'}</span>
                </button>
              )}
            {courierConfig.enabled &&
              courierConfig.showApplyButtonInHeader &&
              courierConfig.applyButtonPosition === 'header_left' &&
              (myCourierApp?.status === 'approved' ? (
                <button
                  type="button"
                  onClick={() => openCourierModal('inbox', null)}
                  className="relative px-2.5 py-1 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white text-[11px] font-bold flex items-center gap-1 shadow-xs cursor-pointer transition-colors"
                >
                  <Inbox className="w-3.5 h-3.5" />
                  <span className="hidden sm:inline">{courierConfig.incomingRequestsButtonLabel || 'طلبات المستخدمين'}</span>
                  {myUnreadCourierRequestsCount > 0 && (
                    <span className="px-1.5 py-0.2 rounded-full bg-rose-500 text-white text-[9px] font-black">
                      {myUnreadCourierRequestsCount}
                    </span>
                  )}
                </button>
              ) : (
                <button
                  type="button"
                  onClick={() => openCourierModal('apply', null)}
                  className="px-2.5 py-1 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-[11px] font-bold flex items-center gap-1 shadow-xs cursor-pointer transition-colors"
                >
                  <Truck className="w-3.5 h-3.5" />
                  <span className="hidden sm:inline">{courierConfig.applyButtonLabel || 'انضم كمندوب'}</span>
                </button>
              ))}
            {inlineWidgetsByPos('header_left').map((w) => (
              <button
                key={w.id}
                type="button"
                onClick={() => handleWidgetClick(w)}
                style={{ backgroundColor: w.bgColor || '#059669', color: w.textColor || '#ffffff' }}
                className="px-2.5 py-1 rounded-lg text-[11px] font-bold flex items-center gap-1 shadow-xs cursor-pointer"
              >
                {renderCloudIcon(w.icon, 'w-3 h-3')}
                <span>{w.label}</span>
              </button>
            ))}
            {brandPos === 'left' && (
              <div className="flex items-center gap-2">
                {uiConfig.appLogoUrl && <img src={uiConfig.appLogoUrl} alt="" className="w-7 h-7 rounded-lg object-cover" />}
                <span className="text-base font-bold">{uiConfig.appNameAr || 'سوق سوريا'}</span>
              </div>
            )}
            {walletConfig.walletButtonPosition !== 'right' && renderWalletBtn()}
            {loginPos === 'left' && renderLoginBtn()}
            {notifPos === 'left' && renderNotifBtn()}
          </div>
        </div>
      </header>
      )}

      {/* بنرات أعلى الصفحة القادمة من السحابة */}
      {inlineWidgetsByPos('top_banner').map((widget) => (
        <div
          key={widget.id}
          onClick={() => handleWidgetClick(widget)}
          style={{ backgroundColor: widget.bgColor || '#059669', color: widget.textColor || '#ffffff' }}
          className="w-full py-2 px-4 text-center text-xs font-bold shadow-xs cursor-pointer flex items-center justify-center gap-2 select-none shrink-0"
        >
          {renderCloudIcon(widget.icon)}
          <span>{widget.label}</span>
          {widget.badge && (
            <span className="px-1.5 py-0.5 rounded-full bg-white/20 text-[10px]">
              {widget.badge}
            </span>
          )}
        </div>
      ))}

      {/* شريط الملاحظة الإدارية القابل للتحكم من السحابة والإدارة: يظهر فقط إذا أرسلت الإدارة ملاحظة غير فارغة */}
      {adminNotice?.active && Boolean(adminNotice?.text && adminNotice.text.trim().length > 0) && (
        <aside
          aria-label="تنبيه إداري"
          className="w-full bg-red-50/95 dark:bg-red-950/70 border-b border-red-200/90 dark:border-red-900/60 py-2 px-3 transition-colors shrink-0 animate-in fade-in"
        >
          <div className="max-w-7xl mx-auto w-full px-2 sm:px-4 flex items-center justify-center gap-2 text-red-600 dark:text-red-400">
            <AlertCircle className="w-4 h-4 shrink-0 text-red-500 self-center" />
            <div className="flex flex-col text-center leading-tight">
              <span className="text-[11px] sm:text-xs font-semibold">
                {adminNotice.text.trim()}
              </span>
            </div>
          </div>
        </aside>
      )}

      {/* شريط الأقسام والمصنفات في الرئيسية تحت الهيدر مباشرة */}
      {activeTab === 'home' && (
        <div className={`${darkMode ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-200'} border-b sticky top-[53px] z-20 shadow-2xs transition-colors duration-150`}>
          <div className="max-w-7xl mx-auto w-full">
            {/* شريط البحث وفلترة المحافظة */}
            {(headerCfg.showSearchBar !== false || headerCfg.showProvinceFilter !== false) && (
            <div className="px-4 pt-2.5 pb-1 flex items-center gap-2 max-w-xl">
              {headerCfg.showSearchBar !== false && (
              <div className="relative flex-1">
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder={uiText('searchPlaceholder', 'ابحث عن اسم منتج أو منطقة...')}
                  className={`w-full pl-8 pr-8 py-1.5 rounded-xl ${
                    darkMode
                      ? 'bg-slate-800 text-slate-100 border-slate-700 placeholder:text-slate-500 focus:bg-slate-800'
                      : 'bg-slate-100 text-slate-800 border-slate-200 placeholder:text-slate-400 focus:bg-white'
                  } border focus:outline-none focus:ring-2 focus:ring-emerald-500 text-xs transition-all`}
                />
                <Search className="w-3.5 h-3.5 absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400" />
                {searchQuery && (
                  <button
                    type="button"
                    onClick={() => setSearchQuery('')}
                    className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 p-0.5 cursor-pointer"
                    aria-label="مسح البحث"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>

              )}
              {headerCfg.showProvinceFilter !== false && (
              <select
                value={filterProvince}
                onChange={(e) => setFilterProvince(e.target.value)}
                className={`px-2.5 py-1.5 rounded-xl border ${
                  darkMode
                    ? 'border-slate-700 bg-slate-800 text-slate-200'
                    : 'border-slate-200 bg-slate-100 text-slate-700'
                } text-[11px] font-semibold cursor-pointer focus:outline-none focus:ring-2 focus:ring-emerald-500`}
                aria-label="تصفية حسب المحافظة"
              >
                <option value="الكل">{uiText('allProvinces', 'كل المحافظات')}</option>
                {provincesData.map((prov) => (
                  <option key={prov} value={prov}>
                    {prov}
                  </option>
                ))}
              </select>
              )}
            </div>
            )}

            {/* 1. الشريط الرئيسي للأقسام */}
            {headerCfg.showCategoriesBar !== false && (
            <div className="px-4 py-2 flex items-center gap-2 overflow-x-auto no-scrollbar scroll-smooth">
              {/* زر الكل يوضع أولاً قبل تكرار الأقسام */}
              <button
                type="button"
                onClick={() => {
                  setActiveCategoryName('الكل');
                  setActiveSubCategory('الكل');
                }}
                className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer whitespace-nowrap shrink-0 ${
                  activeCategoryName === 'الكل'
                    ? 'bg-emerald-600 text-white shadow-xs'
                    : darkMode
                    ? 'bg-slate-800 text-slate-300 hover:bg-slate-700'
                    : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                }`}
              >
                الكل
              </button>

              {/* ثم يليه مصفوفة الأقسام الحالية كما هي */}
              {categories.map((cat) => {
                const isSelected = activeCategoryName === cat.name;
                return (
                  <button
                    key={cat.id || cat.name}
                    type="button"
                    onClick={() => handleSelectCategory(cat.name)}
                    className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all duration-150 cursor-pointer whitespace-nowrap shrink-0 ${
                      isSelected
                        ? 'bg-emerald-600 text-white shadow-xs scale-[1.02]'
                        : darkMode
                        ? 'bg-slate-800 text-slate-300 hover:bg-slate-750 hover:text-white'
                        : 'bg-slate-100 text-slate-600 hover:bg-slate-200 hover:text-slate-900'
                    }`}
                  >
                    {cat.name}
                  </button>
                );
              })}
            </div>

            )}
            {/* 2. الأقسام الفرعية التابعة للقسم المختار */}
            {headerCfg.showSubCategoriesBar !== false && currentCategoryData && currentCategoryData.subCategories.length > 0 && (
              <div className={`px-4 pb-2 pt-1 flex items-center gap-1.5 overflow-x-auto no-scrollbar scroll-smooth ${darkMode ? 'bg-slate-900/80 border-slate-800' : 'bg-slate-50/70 border-slate-100'} border-t`}>
                <button
                  type="button"
                  onClick={() => setActiveSubCategory('الكل')}
                  className={`px-2.5 py-1 rounded-lg text-[11px] font-semibold transition-all cursor-pointer whitespace-nowrap shrink-0 ${
                    activeSubCategory === 'الكل'
                      ? 'bg-slate-800 text-white shadow-2xs'
                      : darkMode
                      ? 'bg-slate-800/80 text-slate-300 border border-slate-700 hover:bg-slate-700'
                      : 'bg-white text-slate-500 border border-slate-200 hover:bg-slate-100'
                  }`}
                >
                  الكل
                </button>
                {currentCategoryData.subCategories.map((sub) => {
                  const isSubSelected = activeSubCategory === sub;
                  return (
                    <button
                      key={sub}
                      type="button"
                      onClick={() => setActiveSubCategory(sub)}
                      className={`px-2.5 py-1 rounded-lg text-[11px] font-semibold transition-all cursor-pointer whitespace-nowrap shrink-0 ${
                        isSubSelected
                          ? 'bg-slate-800 text-white shadow-2xs'
                          : darkMode
                          ? 'bg-slate-800/80 text-slate-300 border border-slate-700 hover:bg-slate-700 hover:text-white'
                          : 'bg-white text-slate-500 border border-slate-200 hover:bg-slate-100 hover:text-slate-700'
                      }`}
                    >
                      {sub}
                    </button>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      )}

      {/* المحتوى الرئيسي المتجاوب مع انتقال احترافي بين الأقسام */}
      <main className="flex-1 max-w-7xl mx-auto w-full px-3 sm:px-6 lg:px-8 py-4 sm:py-6 flex flex-col overflow-x-hidden">
        <AnimatePresence mode="wait" initial={false}>
          <motion.div
            key={activeTab}
            initial={{ opacity: 0, y: 14, scale: 0.99 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -12, scale: 0.99 }}
            transition={{ duration: 0.22, ease: [0.22, 1, 0.36, 1] }}
            className="flex-1 flex flex-col"
          >
            {activeTab === 'home' ? (
          <div className="flex-1 flex flex-col space-y-4">
            {/* سلايدر البانرات الإعلانية المصوّرة القادمة من السحابة */}
            {currentBanner && (
              <div
                style={{
                  backgroundColor: currentBanner.bgColor || '#059669',
                  color: currentBanner.textColor || '#ffffff',
                }}
                className="relative rounded-2xl overflow-hidden border border-slate-200/60 dark:border-slate-800 shadow-sm min-h-[120px] flex items-center"
              >
                {currentBanner.imageUrl && (
                  <>
                    <img
                      src={currentBanner.imageUrl}
                      alt={currentBanner.title}
                      referrerPolicy="no-referrer"
                      className="absolute inset-0 w-full h-full object-cover"
                    />
                    <div className="absolute inset-0 bg-gradient-to-l from-black/75 via-black/45 to-black/25 pointer-events-none" />
                  </>
                )}

                <button
                  type="button"
                  onClick={() => handleBannerAction(currentBanner)}
                  className="relative z-10 w-full p-4 sm:p-5 text-right flex flex-col gap-1.5 cursor-pointer"
                >
                  {currentBanner.badgeText && (
                    <span className="text-[11px] font-bold opacity-90">
                      {currentBanner.badgeText}
                    </span>
                  )}
                  <h3 className="text-sm sm:text-base font-black leading-snug">
                    {currentBanner.title}
                  </h3>
                  {currentBanner.subtitle && (
                    <p className="text-xs opacity-90 line-clamp-2 max-w-2xl">
                      {currentBanner.subtitle}
                    </p>
                  )}
                </button>

                {activeBanners.length > 1 && (
                  <div className="absolute left-3 bottom-3 z-20 flex items-center gap-1.5">
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        setCarouselIndex((prev) => (prev - 1 + activeBanners.length) % activeBanners.length);
                      }}
                      aria-label="البانر السابق"
                      className="p-1 rounded-lg bg-black/35 hover:bg-black/55 text-white cursor-pointer"
                    >
                      <ChevronRight className="w-4 h-4" />
                    </button>
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        setCarouselIndex((prev) => (prev + 1) % activeBanners.length);
                      }}
                      aria-label="البانر التالي"
                      className="p-1 rounded-lg bg-black/35 hover:bg-black/55 text-white cursor-pointer"
                    >
                      <ChevronLeft className="w-4 h-4" />
                    </button>
                  </div>
                )}
              </div>
            )}

            {/* عناصر وودجات أعلى قائمة الإعلانات من السحابة */}
            {inlineWidgetsByPos('above_feed').length > 0 && (
              <div className="flex flex-wrap items-center gap-2">
                {inlineWidgetsByPos('above_feed').map((w) => (
                  <button
                    key={w.id}
                    type="button"
                    onClick={() => handleWidgetClick(w)}
                    style={{
                      backgroundColor: w.bgColor || '#059669',
                      color: w.textColor || '#ffffff',
                      borderColor: w.borderColor || 'transparent',
                    }}
                    className="px-3.5 py-2 rounded-xl text-xs font-bold shadow-xs flex items-center gap-2 cursor-pointer border transition-transform active:scale-95"
                  >
                    {renderCloudIcon(w.icon)}
                    <span>{w.label}</span>
                    {w.badge && <span className="px-1.5 py-0.5 rounded-full bg-black/20 text-[10px]">{w.badge}</span>}
                  </button>
                ))}
              </div>
            )}

            {loadingProducts ? (
              <div className="flex-1 flex items-center justify-center py-20 text-slate-400">
                <Loader2 className="w-6 h-6 animate-spin text-emerald-600" />
              </div>
            ) : currentCategoryItems.length === 0 ? (
              <div className="flex-1 flex items-center justify-center py-20 text-center">
                <p className="text-sm font-medium text-slate-400">
                  {uiText('noProducts', 'لا توجد منشورات حالياً في هذا القسم')}
                </p>
              </div>
            ) : (
              <div className={`w-full grid ${gridColsClass} gap-4 sm:gap-5`}>
                {currentCategoryItems.map((item) => {
                  const sellerBadge =
                    resolveSellerVerificationBadge(
                      item.user_id,
                      Boolean(item.seller_verified),
                      effectiveUserTiers,
                      themeConfig.verificationTiers || [],
                      themeConfig.verifiedBadge
                    ) || themeConfig.verifiedBadge;
                  const canUserEdit = Boolean(
                    marketRules.allowUserEditAd && currentUser && item.user_id === currentUser.id
                  );

                  return (
                    <ProductCard
                      key={item.id}
                      item={item}
                      isFavorite={favoriteProductIds.includes(item.id)}
                      onToggleFavorite={toggleFavorite}
                      onOpenLightbox={handleOpenLightbox}
                      onShare={handleShareProduct}
                      fontScale={postFontScale}
                      isFeatured={activeFeaturedMap.has(item.id)}
                      cardConfig={{
                        ...uiConfig.cardConfig,
                        cardBgColor: uiConfig.cardConfig?.cardBgColor || themeConfig.cardBgColor,
                      }}
                      verifiedBadge={sellerBadge}
                      featuredBadge={themeConfig.featuredBadge}
                      hideContactForGuests={marketRules.hideContactForGuests}
                      isLoggedIn={Boolean(currentUser)}
                      onRequireLogin={() => {
                        setAuthModalReason('يرجى تسجيل الدخول لعرض رقم التواصل مع البائع');
                        setAuthModalInitialMode('login');
                        setShowAuthModal(true);
                      }}
                      whatsappLaunchMode={whatsappLaunchMode}
                      canEdit={canUserEdit}
                      onEdit={handleStartEditProduct}
                      onTrackEvent={trackEngagementEvent}
                      visibleSpecLabels={visibleSpecLabels}
                      showCourierRequestBtn={courierConfig.enabled && courierConfig.showProductCardRequestButton}
                      courierButtonLabel={courierConfig.productCardButtonLabel}
                      onRequestCourier={(prod) => openCourierModal('directory', prod)}
                      onNotify={(msg) => {
                        setToastMessage(msg);
                        setTimeout(() => setToastMessage(null), 2500);
                      }}
                    />
                  );
                })}
              </div>
            )}

            {/* عناصر وودجات أسفل قائمة الإعلانات من السحابة */}
            {inlineWidgetsByPos('below_feed').length > 0 && (
              <div className="flex flex-wrap items-center gap-2 pt-2">
                {inlineWidgetsByPos('below_feed').map((w) => (
                  <button
                    key={w.id}
                    type="button"
                    onClick={() => handleWidgetClick(w)}
                    style={{
                      backgroundColor: w.bgColor || '#059669',
                      color: w.textColor || '#ffffff',
                    }}
                    className="px-3.5 py-2 rounded-xl text-xs font-bold shadow-xs flex items-center gap-2 cursor-pointer transition-transform active:scale-95"
                  >
                    {renderCloudIcon(w.icon)}
                    <span>{w.label}</span>
                  </button>
                ))}
              </div>
            )}
          </div>
        ) : activeTab === 'rates' ? (
          <div className="flex-1 flex flex-col py-2 space-y-3.5">
            {/* بطاقة الترويسة */}
            <div className={`p-4 rounded-2xl border shadow-2xs flex items-center justify-between ${
              darkMode ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-200'
            }`}>
              <div className="flex items-center gap-3">
                <div className="w-11 h-11 rounded-2xl bg-amber-500/10 text-amber-600 dark:text-amber-400 flex items-center justify-center border border-amber-500/20">
                  <Coins className="w-6 h-6" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="font-bold text-sm text-slate-900 dark:text-slate-100">
                      أسعار صرف العملات والذهب
                    </h3>
                    <span className="px-2 py-0.5 rounded-full bg-emerald-100 dark:bg-emerald-950/80 text-emerald-800 dark:text-emerald-300 text-[10px] font-bold border border-emerald-200 dark:border-emerald-800 flex items-center gap-1">
                      <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                      مباشر
                    </span>
                  </div>
                  <span className="text-[10px] text-slate-400 block mt-0.5">
                    تُحدث دورياً من إدارة سوق سوريا
                  </span>
                </div>
              </div>
            </div>

            {!marketRates ? (
              <div className={`p-8 text-center space-y-3 rounded-2xl border ${
                darkMode ? 'bg-slate-900 border-slate-800 text-slate-300' : 'bg-white border-slate-200 text-slate-600'
              }`}>
                <div className="w-12 h-12 rounded-2xl bg-amber-500/10 text-amber-500 flex items-center justify-center mx-auto">
                  <Coins className="w-6 h-6" />
                </div>
                <h4 className="font-bold text-sm">لا توجد أسعار صرف متوفرة حالياً</h4>
                <p className="text-xs text-slate-400 max-w-xs mx-auto leading-relaxed">
                  سيتم عرض أسعار العملات والذهب فور تحديثها.
                </p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3.5">
                {/* 1. الدولار الأمريكي */}
                {marketRates.usd && (
                  <div className={`p-4 rounded-2xl border shadow-2xs space-y-3 ${
                    darkMode ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-200'
                  }`}>
                    <div className="flex items-center justify-between pb-2 border-b border-slate-100 dark:border-slate-800">
                      <div className="flex items-center gap-2.5">
                        <div className="w-8 h-8 rounded-xl bg-emerald-50 dark:bg-emerald-950 text-emerald-600 dark:text-emerald-400 flex items-center justify-center font-black text-xs border border-emerald-100 dark:border-emerald-800">
                          $
                        </div>
                        <div>
                          <h4 className="font-bold text-xs text-slate-900 dark:text-slate-100">دولار أمريكي</h4>
                          <span className="text-[10px] text-slate-400">USD / SYP</span>
                        </div>
                      </div>
                    </div>
                    <div className="grid grid-cols-2 gap-2">
                      <div className="p-3 rounded-xl border text-center space-y-1 bg-slate-50 dark:bg-slate-800/50 border-slate-100 dark:border-slate-750">
                        <span className="text-[10px] text-slate-400 block">شراء</span>
                        <span className="text-sm font-black text-emerald-600 dark:text-emerald-400 block">
                          {marketRates.usd.buy ? marketRates.usd.buy.toLocaleString('ar-SY') + ' ل.س' : 'غير متوفر'}
                        </span>
                      </div>
                      <div className="p-3 rounded-xl border text-center space-y-1 bg-slate-50 dark:bg-slate-800/50 border-slate-100 dark:border-slate-750">
                        <span className="text-[10px] text-slate-400 block">مبيع</span>
                        <span className="text-sm font-black text-slate-800 dark:text-slate-200 block">
                          {marketRates.usd.sell ? marketRates.usd.sell.toLocaleString('ar-SY') + ' ل.س' : 'غير متوفر'}
                        </span>
                      </div>
                    </div>
                  </div>
                )}

                {/* 2. اليورو الأوروبي */}
                {marketRates.eur && (
                  <div className={`p-4 rounded-2xl border shadow-2xs space-y-3 ${
                    darkMode ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-200'
                  }`}>
                    <div className="flex items-center justify-between pb-2 border-b border-slate-100 dark:border-slate-800">
                      <div className="flex items-center gap-2.5">
                        <div className="w-8 h-8 rounded-xl bg-blue-50 dark:bg-blue-950 text-blue-600 dark:text-blue-400 flex items-center justify-center font-black text-xs border border-blue-100 dark:border-blue-800">
                          €
                        </div>
                        <div>
                          <h4 className="font-bold text-xs text-slate-900 dark:text-slate-100">يورو أوروبي</h4>
                          <span className="text-[10px] text-slate-400">EUR / SYP</span>
                        </div>
                      </div>
                    </div>
                    <div className="grid grid-cols-2 gap-2">
                      <div className="p-3 rounded-xl border text-center space-y-1 bg-slate-50 dark:bg-slate-800/50 border-slate-100 dark:border-slate-750">
                        <span className="text-[10px] text-slate-400 block">شراء</span>
                        <span className="text-sm font-black text-blue-600 dark:text-blue-400 block">
                          {marketRates.eur.buy ? marketRates.eur.buy.toLocaleString('ar-SY') + ' ل.س' : 'غير متوفر'}
                        </span>
                      </div>
                      <div className="p-3 rounded-xl border text-center space-y-1 bg-slate-50 dark:bg-slate-800/50 border-slate-100 dark:border-slate-750">
                        <span className="text-[10px] text-slate-400 block">مبيع</span>
                        <span className="text-sm font-black text-slate-800 dark:text-slate-200 block">
                          {marketRates.eur.sell ? marketRates.eur.sell.toLocaleString('ar-SY') + ' ل.س' : 'غير متوفر'}
                        </span>
                      </div>
                    </div>
                  </div>
                )}

                {/* 3. أسعار الذهب والأونصة */}
                {(marketRates.gold21 || marketRates.gold18 || marketRates.goldOunce) && (
                  <div className={`p-4 rounded-2xl border shadow-2xs space-y-3 ${
                    darkMode ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-200'
                  }`}>
                    <div className="flex items-center justify-between pb-2 border-b border-slate-100 dark:border-slate-800">
                      <div className="flex items-center gap-2.5">
                        <div className="w-8 h-8 rounded-xl bg-amber-50 dark:bg-amber-950 text-amber-600 dark:text-amber-400 flex items-center justify-center font-black text-xs border border-amber-100 dark:border-amber-800">
                          Au
                        </div>
                        <div>
                          <h4 className="font-bold text-xs text-slate-900 dark:text-slate-100">أسعار الذهب</h4>
                          <span className="text-[10px] text-slate-400">GOLD / SYP</span>
                        </div>
                      </div>
                    </div>
                    <div className="grid grid-cols-3 gap-2">
                      <div className="p-2.5 rounded-xl border text-center space-y-1 bg-slate-50 dark:bg-slate-800/50 border-slate-100 dark:border-slate-750">
                        <span className="text-[10px] text-slate-400 block">عيار 21</span>
                        <span className="text-xs font-black text-amber-500 block">
                          {marketRates.gold21?.price ? marketRates.gold21.price.toLocaleString('ar-SY') : '---'}
                        </span>
                        <span className="text-[9px] text-slate-400">ل.س/غ</span>
                      </div>
                      <div className="p-2.5 rounded-xl border text-center space-y-1 bg-slate-50 dark:bg-slate-800/50 border-slate-100 dark:border-slate-750">
                        <span className="text-[10px] text-slate-400 block">عيار 18</span>
                        <span className="text-xs font-black text-amber-500 block">
                          {marketRates.gold18?.price ? marketRates.gold18.price.toLocaleString('ar-SY') : '---'}
                        </span>
                        <span className="text-[9px] text-slate-400">ل.س/غ</span>
                      </div>
                      <div className="p-2.5 rounded-xl border text-center space-y-1 bg-slate-50 dark:bg-slate-800/50 border-slate-100 dark:border-slate-750">
                        <span className="text-[10px] text-slate-400 block">الأونصة</span>
                        <span className="text-xs font-black text-slate-800 dark:text-white block">
                          {marketRates.goldOunce?.price ? '$' + marketRates.goldOunce.price.toLocaleString('en-US') : '---'}
                        </span>
                        <span className="text-[9px] text-slate-400">دولار</span>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        ) : activeTab === 'my_products' ? (
          /* ==========================================
             قسم "منتجاتي": خاص بالبائع لرؤية وإدارة كل ما نشره
             ========================================== */
          <div className="flex-1 flex flex-col py-2">
            {!currentUser ? (
              <div className="bg-white rounded-2xl p-6 border border-slate-200 shadow-2xs text-center space-y-4 my-auto">
                <div className="w-16 h-16 rounded-full bg-emerald-100 text-emerald-700 flex items-center justify-center mx-auto shadow-2xs">
                  <Package className="w-8 h-8" />
                </div>
                <div>
                  <h3 className="font-bold text-slate-900 text-base">قسم منتجاتي</h3>
                  <p className="text-xs text-slate-500 mt-1.5 leading-relaxed max-w-xs mx-auto">
                    هذا القسم مخصص لك كبائع لتتمكن من استعراض كافة المنتجات والإعلانات التي قمت بنشرها وإدارتها بسهولة.
                  </p>
                </div>
                <div className="pt-2 max-w-xs mx-auto w-full">
                  <button
                    type="button"
                    onClick={() => {
                      setAuthModalReason('سجّل الدخول لعرض وإدارة منتجاتك وإعلاناتك في سوق سوريا');
                      setAuthModalInitialMode('login');
                      setShowAuthModal(true);
                    }}
                    className="w-full py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs transition-all shadow-xs cursor-pointer"
                  >
                    تسجيل الدخول / إنشاء حساب
                  </button>
                </div>
              </div>
            ) : (
              <div className="space-y-4">
                {/* بطاقة الترويسة لمنتجاتي */}
                <div className="p-4 bg-white rounded-2xl border border-slate-200 shadow-2xs flex items-center justify-between">
                  <div className="flex items-center gap-2.5">
                    <div className="w-10 h-10 rounded-xl bg-emerald-50 text-emerald-700 flex items-center justify-center border border-emerald-100">
                      <Package className="w-5 h-5" />
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <h3 className="font-bold text-slate-900 text-sm">منتجاتي المنشورة</h3>
                        {showMyProductsCountBadge && (
                          <span className="px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 text-[10px] font-bold">
                            {myProducts.length} إعلان
                          </span>
                        )}
                      </div>
                      <span className="text-[10px] text-slate-400">
                        كافة الإعلانات النشطة على حسابك في سوق سوريا
                      </span>
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={() => setShowCreateScreen(true)}
                    className="flex items-center gap-1.5 px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold transition-all shadow-2xs cursor-pointer"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>نشر جديد</span>
                  </button>
                </div>

                {/* قائمة منتجات البائع */}
                {myProducts.length === 0 ? (
                  <div className="bg-white rounded-2xl p-8 border border-slate-200 text-center space-y-3">
                    <div className="w-12 h-12 rounded-full bg-slate-100 text-slate-400 flex items-center justify-center mx-auto">
                      <Package className="w-6 h-6" />
                    </div>
                    <div>
                      <h4 className="font-bold text-slate-800 text-sm">لم تنشر أي إعلانات بعد</h4>
                      <p className="text-xs text-slate-400 mt-1 max-w-xs mx-auto">
                        ابدأ الآن بنشر منتجك الأول مع صور وتفاصيل ليصل إلى آلاف المشترين في سوريا فوراً!
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={() => setShowCreateScreen(true)}
                      className="inline-flex items-center gap-1.5 px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold transition-all shadow-xs cursor-pointer"
                    >
                      <Plus className="w-4 h-4" />
                      <span>انشر أول منتج لك الآن</span>
                    </button>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3.5">
                    {myProducts.map((p) => {
                      const pImages = parseProductImages(p.image_url);
                      return (
                        <div
                          key={p.id}
                          className="bg-white rounded-2xl border border-slate-200 shadow-2xs overflow-hidden transition-all hover:border-slate-300"
                        >
                          <div className="p-3.5 flex gap-3">
                            {/* الصورة المصغرة أو المعاينة */}
                            {pImages.length > 0 ? (
                              <div
                                onClick={() => handleOpenLightbox(pImages, 0, p.title)}
                                className="w-20 h-20 rounded-xl overflow-hidden bg-slate-100 shrink-0 border border-slate-100 relative cursor-pointer group"
                              >
                                <img
                                  src={pImages[0]}
                                  alt={p.title}
                                  className="w-full h-full object-cover group-hover:scale-105 transition-transform"
                                />
                                {pImages.length > 1 && (
                                  <span className="absolute bottom-1 right-1 px-1 py-0.5 rounded bg-black/70 text-white text-[9px] font-bold">
                                    {pImages.length} صور
                                  </span>
                                )}
                              </div>
                            ) : (
                              <div className="w-20 h-20 rounded-xl bg-slate-100 text-slate-400 shrink-0 border border-slate-100 flex items-center justify-center">
                                <ImageIcon className="w-6 h-6" />
                              </div>
                            )}

                            {/* تفاصيل المنتج */}
                            <div className="flex-1 min-w-0 flex flex-col justify-between text-right">
                              <div>
                                <div className="flex items-start justify-between gap-1">
                                  <h4 className="font-bold text-xs text-slate-900 truncate">
                                    {p.title}
                                  </h4>
                                  {p.status === 'pending' ? (
                                    <span className="shrink-0 px-2 py-0.5 rounded-full bg-amber-50 border border-amber-200 text-amber-700 text-[10px] font-bold">
                                      قيد المراجعة
                                    </span>
                                  ) : p.status === 'rejected' ? (
                                    <span className="shrink-0 px-2 py-0.5 rounded-full bg-red-50 border border-red-200 text-red-700 text-[10px] font-bold">
                                      مرفوض
                                    </span>
                                  ) : (
                                    <span className="shrink-0 px-2 py-0.5 rounded-full bg-emerald-50 border border-emerald-200 text-emerald-700 text-[10px] font-bold">
                                      معتمد ✓
                                    </span>
                                  )}
                                </div>
                                <span className="text-[10px] text-slate-400 block mt-0.5">
                                  {p.category} • {p.sub_category}
                                </span>
                              </div>

                              <div className="flex items-center justify-between mt-2">
                                <span className="text-xs font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-lg border border-emerald-100/80">
                                  {formatPriceWithCurrency(p.price)}
                                </span>
                                <span className="text-[10px] text-slate-400 flex items-center gap-1">
                                  <Clock className="w-3 h-3" />
                                  <span>{formatTimeAgo(p.created_at)}</span>
                                </span>
                              </div>
                            </div>
                          </div>

                          {/* شريط الإجراءات لإعلان البائع */}
                          <div className="bg-slate-50/70 border-t border-slate-100 px-3.5 py-2 flex items-center justify-between flex-wrap gap-2 text-xs">
                            <div className="flex items-center gap-2 flex-wrap">
                              {pImages.length > 0 && (
                                <button
                                  type="button"
                                  onClick={() => handleOpenLightbox(pImages, 0, p.title)}
                                  className="flex items-center gap-1 text-[11px] font-semibold text-slate-600 hover:text-emerald-700 transition-colors cursor-pointer"
                                >
                                  <Eye className="w-3.5 h-3.5" />
                                  <span>معاينة</span>
                                </button>
                              )}
                              <button
                                type="button"
                                onClick={() => handleShareProduct(p)}
                                className="flex items-center gap-1 text-[11px] font-semibold text-slate-600 hover:text-emerald-700 transition-colors cursor-pointer"
                              >
                                <Share2 className="w-3.5 h-3.5" />
                                <span>مشاركة</span>
                              </button>
                              {marketRules.allowUserEditAd && (
                                <button
                                  type="button"
                                  onClick={() => handleStartEditProduct(p)}
                                  className="flex items-center gap-1 text-[11px] font-semibold text-emerald-700 hover:text-emerald-800 transition-colors cursor-pointer"
                                >
                                  <Pencil className="w-3.5 h-3.5" />
                                  <span>تعديل</span>
                                </button>
                              )}
                              {walletConfig.enabled && (
                                activeFeaturedMap.has(p.id) ? (
                                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-amber-100 text-amber-800 text-[10px] font-black">
                                    <Star className="w-3 h-3 fill-amber-500 text-amber-500" />
                                    <span>مميز بالصدارة</span>
                                  </span>
                                ) : (
                                  <button
                                    type="button"
                                    onClick={() => setStarBoostProduct(p)}
                                    className="inline-flex items-center gap-1 px-2 py-0.5 rounded-lg bg-amber-500 hover:bg-amber-600 text-white text-[11px] font-bold transition-colors cursor-pointer shadow-2xs"
                                  >
                                    <Star className="w-3 h-3" />
                                    <span>تمييز بنجمة</span>
                                  </button>
                                )
                              )}
                            </div>

                            <button
                              type="button"
                              onClick={() => setProductToDelete(p)}
                              className="flex items-center gap-1 text-[11px] font-bold text-red-600 hover:text-red-700 hover:bg-red-50 px-2 py-1 rounded-lg transition-colors cursor-pointer"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                              <span>حذف</span>
                            </button>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            )}
          </div>
        ) : activeTab !== 'me' && navItems.some((n) => n.key === activeTab && (n.customPageContent || n.customDescription || n.customPageTitle || n.customTitle)) ? (
          (() => {
            const customNav = navItems.find((n) => n.key === activeTab);
            const customTargetUrl = customNav?.actionUrl || customNav?.customButtonUrl;
            return (
              <div className="flex-1 flex flex-col py-4 space-y-4">
                <div className={`rounded-2xl p-5 border shadow-2xs space-y-3 ${darkMode ? 'bg-slate-900 border-slate-800 text-slate-100' : 'bg-white border-slate-200 text-slate-800'}`}>
                  <div className="flex items-center gap-2 border-b border-slate-100 dark:border-slate-800 pb-3">
                    {renderCloudIcon(customNav?.iconName, 'w-5 h-5 text-emerald-600')}
                    <h3 className="font-bold text-base">
                      {customNav?.customPageTitle || customNav?.customTitle || customNav?.label}
                    </h3>
                  </div>
                  <div className="text-xs leading-relaxed whitespace-pre-line">
                    {customNav?.customPageContent || customNav?.customDescription || ''}
                  </div>
                  {customTargetUrl && (
                    <div className="pt-2">
                      <a
                        href={customTargetUrl.startsWith('http') ? customTargetUrl : `https://${customTargetUrl}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold shadow-xs transition-colors"
                      >
                        <ExternalLink className="w-3.5 h-3.5" />
                        <span>{customNav?.customButtonText || 'فتح الرابط'}</span>
                      </a>
                    </div>
                  )}
                </div>
              </div>
            );
          })()
        ) : (
          /* ==========================================
             قسم "أنا": مصادقة حقيقية مع سحابة Supabase
             ========================================== */
          <div className="flex-1 flex flex-col py-4 space-y-4">
            {inlineWidgetsByPos('account_top').map((w) => (
              <button
                key={w.id}
                type="button"
                onClick={() => handleWidgetClick(w)}
                style={{ backgroundColor: w.bgColor || '#059669', color: w.textColor || '#ffffff' }}
                className="w-full py-2.5 px-4 rounded-xl text-xs font-bold shadow-xs flex items-center justify-between cursor-pointer"
              >
                <div className="flex items-center gap-2">
                  {renderCloudIcon(w.icon)}
                  <span>{w.label}</span>
                </div>
                {w.badge && <span className="px-2 py-0.5 rounded-full bg-black/20 text-[10px]">{w.badge}</span>}
              </button>
            ))}
            {/* زر إعدادات التطبيق: على اليمين بشكل أفقي وجزئي (متاح للجميع) */}
            <div className="flex items-center justify-start">
              <button
                type="button"
                onClick={() => setShowSettingsModal(true)}
                className={`inline-flex items-center gap-2 px-3.5 py-2 rounded-xl border text-xs font-bold shadow-2xs transition-colors cursor-pointer ${
                  darkMode
                    ? 'bg-slate-900 border-slate-800 text-slate-100 hover:bg-slate-800'
                    : 'bg-white border-slate-200 text-slate-800 hover:bg-slate-50'
                }`}
                aria-label="إعدادات التطبيق"
              >
                <Settings className="w-4 h-4 text-emerald-600" />
                <span>إعدادات التطبيق</span>
              </button>
            </div>
            {authLoading ? (
              <div className="flex-1 flex items-center justify-center py-20">
                <Loader2 className="w-6 h-6 animate-spin text-emerald-600" />
              </div>
            ) : currentUser ? (
              /* عندما يكون المستخدم مسجّل دخول فعلياً */
              <div className="space-y-4">
                <div className="bg-white rounded-2xl p-5 border border-slate-200 shadow-2xs text-center flex flex-col items-center">
                  <div className="w-16 h-16 rounded-full bg-emerald-100 text-emerald-700 flex items-center justify-center mb-2 font-bold text-xl">
                    {currentUser.user_metadata?.full_name?.charAt(0) || currentUser.email?.charAt(0).toUpperCase()}
                  </div>
                  <div className="flex items-center justify-center gap-1.5 flex-wrap">
                    <h3 className="font-bold text-slate-900 dark:text-slate-100 text-sm">
                      {currentUserProfile?.full_name || currentUser.user_metadata?.full_name || currentUser.email}
                    </h3>
                    {isCurrentUserVerified && (
                      <span
                        style={vBadgeInlineStyle}
                        className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full border font-black text-[10px] shadow-2xs ${
                          vBadgeInlineStyle
                            ? ''
                            : 'bg-amber-50 dark:bg-amber-950/70 border-amber-300 dark:border-amber-600/80 text-amber-700 dark:text-amber-400'
                        } ${vBadgeEffectClass}`}
                      >
                        <CheckCircle2
                          style={
                            vBadgeCfg?.iconColor
                              ? { color: '#ffffff', fill: vBadgeCfg.iconColor }
                              : undefined
                          }
                          className={`w-3.5 h-3.5 shrink-0 ${
                            vBadgeCfg?.iconColor ? '' : 'text-white fill-amber-500'
                          }`}
                        />
                        <span>{vBadgeCfg?.text ? `حساب ${vBadgeCfg.text}` : 'حساب موثق'}</span>
                      </span>
                    )}
                  </div>
                  <span className="text-[11px] text-slate-400 mt-0.5">
                    {currentUser.email}
                  </span>

                  {currentUser.user_metadata?.national_id && (
                    <div className="mt-3 pt-3 border-t border-slate-100 w-full grid grid-cols-2 gap-2 text-right text-xs">
                      <div className="p-2 rounded-lg bg-slate-50 border border-slate-100">
                        <span className="text-slate-400 text-[10px] block">الرقم الوطني</span>
                        <span className="font-bold text-slate-700">{currentUser.user_metadata.national_id}</span>
                      </div>
                      <div className="p-2 rounded-lg bg-slate-50 border border-slate-100">
                        <span className="text-slate-400 text-[10px] block">المحافظة</span>
                        <span className="font-bold text-slate-700">{currentUser.user_metadata.province || 'غير محدد'}</span>
                      </div>
                    </div>
                  )}

                  <button
                    type="button"
                    onClick={handleSignOut}
                    className="mt-4 flex items-center gap-1.5 text-xs text-red-600 hover:text-red-700 font-bold px-3 py-1.5 rounded-lg bg-red-50 border border-red-100 transition-colors cursor-pointer"
                  >
                    <LogOut className="w-3.5 h-3.5" />
                    <span>تسجيل الخروج</span>
                  </button>
                </div>

                {/* بطاقة محفظتي والنقاط واشتراكات التجار داخل قسم أنا */}
                {(walletConfig.enabled || walletConfig.showWalletButtonInHeader) && (
                  <div
                    className={`rounded-2xl p-4 border shadow-2xs space-y-3 ${
                      darkMode ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-200'
                    }`}
                  >
                    <div className="flex items-center justify-between gap-2">
                      <div className="flex items-center gap-2.5">
                        <div className="w-9 h-9 rounded-xl bg-amber-500/15 text-amber-600 flex items-center justify-center shrink-0">
                          <Wallet className="w-5 h-5" />
                        </div>
                        <div className="text-right">
                          <h4 className="font-bold text-xs text-slate-900 dark:text-slate-100">
                            {walletConfig.walletButtonLabel || 'محفظتي'} والباقات
                          </h4>
                          <p className="text-[11px] text-slate-400">
                            الرصيد: <strong className="text-amber-600">{currentUserWallet.points} نقطة</strong> • نجوم مجانية: <strong>{currentUserWallet.starCreditsRemaining || 0}</strong>
                          </p>
                        </div>
                      </div>
                      <button
                        type="button"
                        onClick={() => {
                          setWalletModalTab('overview');
                          setWalletModalOpen(true);
                        }}
                        className="px-3 py-1.5 rounded-xl bg-amber-500 hover:bg-amber-600 text-white font-bold text-xs cursor-pointer shrink-0 shadow-2xs"
                      >
                        فتح المحفظة
                      </button>
                    </div>
                  </div>
                )}

                {/* لوحة المندوب وتوصيل الطلبات بين المحافظات */}
                {courierConfig.enabled && (
                  <div className={`rounded-2xl p-4 border shadow-2xs space-y-3 ${darkMode ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-200'}`}>
                    <div className="flex items-center justify-between gap-2">
                      <div className="flex items-center gap-2.5">
                        <div className="w-9 h-9 rounded-xl bg-sky-500/10 text-sky-600 dark:text-sky-400 flex items-center justify-center shrink-0">
                          <Truck className="w-5 h-5" />
                        </div>
                        <div className="text-right">
                          <h4 className="font-bold text-xs text-slate-900 dark:text-slate-100">
                            خدمة المناديب والتوصيل بين المحافظات
                          </h4>
                          <p className="text-[10px] text-slate-400">
                            {myCourierApp?.status === 'approved'
                              ? `حساب مندوب معتمد • ${myCourierApp.province} (${myCourierApp.vehicleNameModel})`
                              : myCourierApp?.status === 'pending'
                              ? 'طلبك قيد المراجعة لدى الإدارة بانتظار الاعتماد'
                              : myCourierApp?.status === 'rejected'
                              ? 'تم رفض طلبك السابق — يمكنك التعديل وإعادة الإرسال'
                              : myCourierApp?.status === 'suspended'
                              ? 'حساب المندوب الخاص بك موقوف مؤقتاً من الإدارة'
                              : 'انضم كمندوب معتمد أو اطلب توصيل قطعة'}
                          </p>
                        </div>
                      </div>
                      {myCourierApp?.status === 'approved' && (
                        <button
                          type="button"
                          onClick={handleToggleCourierOnline}
                          className={`px-3 py-1.5 rounded-xl text-[11px] font-bold border transition-all cursor-pointer shrink-0 ${
                            myCourierApp.isOnline
                              ? 'bg-emerald-50 border-emerald-200 text-emerald-700'
                              : 'bg-slate-100 border-slate-200 text-slate-600'
                          }`}
                        >
                          {myCourierApp.isOnline ? 'متاح الآن' : 'غير متاح'}
                        </button>
                      )}
                    </div>

                    {myCourierApp?.status === 'approved' ? (
                      <div className="flex flex-wrap items-center gap-2">
                        <button
                          type="button"
                          onClick={() => openCourierModal('inbox', null)}
                          className="flex-1 py-2 px-3 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs flex items-center justify-center gap-1.5 cursor-pointer transition-colors"
                        >
                          <Inbox className="w-4 h-4" />
                          <span>{courierConfig.incomingRequestsButtonLabel || 'طلبات المستخدمين'}</span>
                          {myUnreadCourierRequestsCount > 0 && (
                            <span className="px-1.5 py-0.5 rounded-full bg-rose-500 text-white text-[10px] font-black">
                              {myUnreadCourierRequestsCount}
                            </span>
                          )}
                        </button>
                        <button
                          type="button"
                          onClick={() => openCourierModal('directory', null)}
                          className="py-2 px-3 rounded-xl bg-sky-50 hover:bg-sky-100 text-sky-700 border border-sky-200 font-bold text-xs cursor-pointer"
                        >
                          {courierConfig.directoryButtonLabel || 'اطلب مندوب'}
                        </button>
                      </div>
                    ) : myCourierApp?.status === 'pending' ? (
                      <div className="p-2.5 rounded-xl bg-amber-50 border border-amber-200 text-amber-800 text-[11px] font-semibold flex items-center gap-2">
                        <Clock className="w-4 h-4 shrink-0" />
                        <span>طلب التوظيف قيد المراجعة حالياً — ستظهر لوحة «{courierConfig.incomingRequestsButtonLabel || 'طلبات المستخدمين'}» فور موافقة الإدارة.</span>
                      </div>
                    ) : myCourierApp?.status === 'rejected' ? (
                      <div className="space-y-2">
                        {myCourierApp.rejectionReason && (
                          <div className="p-2.5 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-[11px] font-semibold">
                            سبب الرفض: {myCourierApp.rejectionReason}
                          </div>
                        )}
                        <button
                          type="button"
                          onClick={() => openCourierModal('apply', null)}
                          className="w-full py-2 px-3 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs cursor-pointer"
                        >
                          إعادة التقديم كمندوب
                        </button>
                      </div>
                    ) : myCourierApp?.status === 'suspended' ? (
                      <div className="p-2.5 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-[11px] font-semibold">
                        حساب المندوب موقوف مؤقتاً. تواصل مع الإدارة لمزيد من التفاصيل.
                      </div>
                    ) : (
                      courierConfig.applyButtonPosition !== 'hidden' && (
                        <button
                          type="button"
                          onClick={() => openCourierModal('apply', null)}
                          className="w-full py-2 px-3 rounded-xl bg-sky-600 hover:bg-sky-700 text-white font-bold text-xs flex items-center justify-center gap-1.5 cursor-pointer"
                        >
                          <Truck className="w-4 h-4" />
                          <span>{courierConfig.applyButtonLabel || 'انضم كمندوب'}</span>
                        </button>
                      )
                    )}
                  </div>
                )}
              </div>
            ) : (
              /* عندما لا يكون المستخدم مسجل الدخول في صفحة أنا */
              <div className="bg-white rounded-2xl p-6 border border-slate-200 shadow-2xs text-center space-y-4 my-auto">
                <div className="w-16 h-16 rounded-full bg-emerald-100 text-emerald-700 flex items-center justify-center mx-auto shadow-2xs">
                  <User className="w-8 h-8" />
                </div>
                <div>
                  <h3 className="font-bold text-slate-900 text-base">حسابك في سوق سوريا</h3>
                  <p className="text-xs text-slate-500 mt-1.5 leading-relaxed max-w-xs mx-auto">
                    سجّل الدخول إلى حسابك أو أنشئ حساباً جديداً لنشر الإعلانات وإدارتها وحذفها بكل سهولة وبأمان تام.
                  </p>
                </div>
                <div className="space-y-2 pt-2 max-w-xs mx-auto w-full">
                  <button
                    type="button"
                    onClick={() => {
                      setAuthModalReason(null);
                      setAuthModalInitialMode('login');
                      setShowAuthModal(true);
                    }}
                    className="w-full py-2.5 bg-emerald-600 hover:bg-emerald-700 active:scale-[0.99] text-white font-bold rounded-xl text-sm transition-all shadow-xs cursor-pointer flex items-center justify-center gap-2"
                  >
                    <LogIn className="w-4 h-4" />
                    <span>تسجيل الدخول</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      setAuthModalReason(null);
                      setAuthModalInitialMode('signup');
                      setShowAuthModal(true);
                    }}
                    className="w-full py-2.5 bg-white hover:bg-slate-50 text-slate-700 font-bold rounded-xl text-sm transition-all border border-slate-200 cursor-pointer flex items-center justify-center gap-2"
                  >
                    <UserPlus className="w-4 h-4" />
                    <span>إنشاء حساب جديد</span>
                  </button>
                </div>
              </div>
            )}

            {/* بطاقات قنوات وتواصل الدعم الفني المباشر (من السحاب حصراً) */}
            {Boolean(supportConfig && (supportConfig.whatsapp?.enabled || supportConfig.telegram?.enabled || supportConfig.facebook?.enabled)) && (
              <div className={`p-4 rounded-2xl border ${darkMode ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-200/90'} shadow-2xs space-y-3`}>
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 flex items-center justify-center shrink-0">
                    <PhoneCall className="w-4 h-4" />
                  </div>
                  <div className="flex flex-col text-right">
                    <span className="text-xs font-bold text-slate-900 dark:text-slate-100">
                      قنوات الدعم الفني والمساعدة
                    </span>
                    <span className="text-[10px] text-slate-400">
                      تواصل مباشر وسريع مع إدارة سوق سوريا
                    </span>
                  </div>
                </div>

                <div className="flex flex-col gap-2">
                  {supportConfig?.whatsapp?.enabled && (
                    <button
                      type="button"
                      onClick={() => handleOpenSupport('whatsapp')}
                      className="w-full py-2.5 px-3 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold transition-all shadow-2xs flex items-center justify-between cursor-pointer active:scale-[0.99]"
                    >
                      <div className="flex items-center gap-2">
                        <MessageCircle className="w-4 h-4" />
                        <span>{supportConfig.whatsapp.label || 'تواصل واتساب'}</span>
                      </div>
                      <span className="text-[10px] bg-emerald-700/70 px-2 py-0.5 rounded-full font-medium">
                        دردشة فورية
                      </span>
                    </button>
                  )}

                  {supportConfig?.telegram?.enabled && (
                    <button
                      type="button"
                      onClick={() => handleOpenSupport('telegram')}
                      className="w-full py-2.5 px-3 bg-sky-600 hover:bg-sky-700 text-white rounded-xl text-xs font-bold transition-all shadow-2xs flex items-center justify-between cursor-pointer active:scale-[0.99]"
                    >
                      <div className="flex items-center gap-2">
                        <Send className="w-4 h-4" />
                        <span>{supportConfig.telegram.label || 'دعم تليجرام'}</span>
                      </div>
                      <span className="text-[10px] bg-sky-700/70 px-2 py-0.5 rounded-full font-medium">
                        تليجرام
                      </span>
                    </button>
                  )}

                  {supportConfig?.facebook?.enabled && (
                    <button
                      type="button"
                      onClick={() => handleOpenSupport('facebook')}
                      className="w-full py-2.5 px-3 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold transition-all shadow-2xs flex items-center justify-between cursor-pointer active:scale-[0.99]"
                    >
                      <div className="flex items-center gap-2">
                        <Facebook className="w-4 h-4" />
                        <span>{supportConfig.facebook.label || 'صفحتنا على فيسبوك'}</span>
                      </div>
                      <span className="text-[10px] bg-blue-700/70 px-2 py-0.5 rounded-full font-medium">
                        فيسبوك
                      </span>
                    </button>
                  )}
                </div>
              </div>
            )}
            {inlineWidgetsByPos('account_bottom').map((w) => (
              <button
                key={w.id}
                type="button"
                onClick={() => handleWidgetClick(w)}
                style={{ backgroundColor: w.bgColor || '#059669', color: w.textColor || '#ffffff' }}
                className="w-full py-2.5 px-4 rounded-xl text-xs font-bold shadow-xs flex items-center justify-between cursor-pointer"
              >
                <div className="flex items-center gap-2">
                  {renderCloudIcon(w.icon)}
                  <span>{w.label}</span>
                </div>
                {w.badge && <span className="px-2 py-0.5 rounded-full bg-black/20 text-[10px]">{w.badge}</span>}
              </button>
            ))}
          </div>
        )}
      </motion.div>
    </AnimatePresence>
  </main>

      {/* أسفل الشاشة:
          - أسفل اليمين: قسم أو أيقونة الرئيسية
          - في الوسط: أيقونة زائد (+)
          - في اليسار: قسم أنا
      */}
      {/* شريط التنقل السفلي الديناميكي المقروء من السحابة حصراً */}
      {navItems.length > 0 && headerCfg.showBottomNav !== false && (
        <nav
          style={{
            ...(themeConfig.bottomNavBgColor ? { backgroundColor: themeConfig.bottomNavBgColor } : {}),
            ...(themeConfig.bottomNavTextColor ? { color: themeConfig.bottomNavTextColor } : {}),
          }}
          className={`sticky bottom-0 z-30 ${darkMode ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-200'} border-t px-2 sm:px-4 py-1.5 shadow-sm transition-colors duration-150`}
        >
          <div className="max-w-xl md:max-w-2xl mx-auto w-full flex items-center justify-around relative min-h-[48px]">
            {navItems
              .filter((item) => item.is_visible !== false)
              .sort((a, b) => a.order - b.order)
              .map((item) => {
                if (item.is_primary_action || item.key === 'add') {
                  return (
                    <div key={item.id || item.key} className="relative flex flex-col items-center justify-center -mt-4">
                      <motion.button
                        type="button"
                        whileHover={{ scale: 1.08 }}
                        whileTap={{ scale: 0.92 }}
                        transition={{ type: 'spring', stiffness: 450, damping: 20 }}
                        onClick={() => {
                          if (!currentUser) {
                            setAuthModalReason('يرجى تسجيل الدخول أو إنشاء حساب جديد لتتمكن من نشر إعلانك');
                            setAuthModalInitialMode('login');
                            setShowAuthModal(true);
                          } else {
                            setShowPlusMenu(true);
                          }
                        }}
                        className="w-12 h-12 rounded-full bg-emerald-600 text-white flex items-center justify-center shadow-md hover:bg-emerald-700 transition-all cursor-pointer ring-4 ring-white dark:ring-slate-900"
                        aria-label={item.label || 'إضافة إعلان جديد'}
                        title={item.label || 'إضافة إعلان جديد'}
                      >
                        <Plus className="w-6 h-6 stroke-[2.5]" />
                      </motion.button>
                      <span className={`text-[10px] mt-0.5 font-medium ${darkMode ? 'text-slate-400' : 'text-slate-500'}`}>
                        {item.label}
                      </span>
                    </div>
                  );
                }

                const isActive = activeTab === item.key;
                const badge =
                  item.badgeText ||
                  (item.key === 'my_products' && showMyProductsCountBadge && currentUser && myProducts.length > 0
                    ? myProducts.length
                    : null);

                const renderNavIcon = (iconName?: string, key?: string) => {
                  const name = (iconName || key || '').toLowerCase();
                  if (name.includes('home') || name.includes('رئيسي')) return <Home className="w-5 h-5" />;
                  if (name.includes('coin') || name.includes('rate') || name.includes('عمل') || name.includes('ذهب') || name.includes('trending')) return <Coins className="w-5 h-5" />;
                  if (name.includes('package') || name.includes('product') || name.includes('منتج')) return <Package className="w-5 h-5" />;
                  if (name.includes('user') || name.includes('me') || name.includes('أنا') || name.includes('حساب')) return <User className="w-5 h-5" />;
                  if (name.includes('plus') || name.includes('add') || name.includes('أضف')) return <PlusCircle className="w-5 h-5" />;
                  if (name.includes('bell') || name.includes('إشعار')) return <Bell className="w-5 h-5" />;
                  if (name.includes('setting') || name.includes('إعداد')) return <Settings className="w-5 h-5" />;
                  if (name.includes('search') || name.includes('بحث')) return <Search className="w-5 h-5" />;
                  if (iconName) return renderCloudIcon(iconName, 'w-5 h-5');
                  return <Home className="w-5 h-5" />;
                };

                return (
                  <motion.button
                    key={item.id || item.key}
                    type="button"
                    whileTap={{ scale: 0.92 }}
                    transition={{ type: 'spring', stiffness: 500, damping: 25 }}
                    onClick={() => {
                      const targetNavUrl = item.actionUrl || item.customButtonUrl;
                      if (targetNavUrl && !item.customPageContent && !item.customDescription && !item.customPageTitle && !item.customTitle) {
                        let url = targetNavUrl.trim();
                        if (!url.startsWith('http')) url = 'https://' + url;
                        window.open(url, '_blank');
                      } else if (item.key === 'add' || item.key === 'create') {
                        if (!currentUser) {
                          setAuthModalReason('يرجى تسجيل الدخول أو إنشاء حساب جديد لتتمكن من نشر إعلانك');
                          setAuthModalInitialMode('login');
                          setShowAuthModal(true);
                        } else {
                          setShowCreateScreen(true);
                        }
                      } else {
                        setActiveTab(item.key);
                      }
                    }}
                    className={`flex flex-col items-center justify-center gap-0.5 py-1 px-2.5 rounded-xl transition-colors cursor-pointer relative ${
                      isActive
                        ? 'text-emerald-600 dark:text-emerald-400 font-bold'
                        : darkMode
                        ? 'text-slate-400 hover:text-slate-200 font-medium'
                        : 'text-slate-500 hover:text-slate-800 font-medium'
                    }`}
                  >
                    <motion.div
                      animate={{ scale: isActive ? 1.12 : 1 }}
                      transition={{ type: 'spring', stiffness: 400, damping: 25 }}
                      className="relative"
                    >
                      {renderNavIcon(item.iconName, item.key)}
                      {badge && (
                        <span className="absolute -top-1 -right-2 px-1 min-w-[14px] h-3.5 bg-emerald-500 text-white text-[9px] font-bold rounded-full flex items-center justify-center">
                          {badge}
                        </span>
                      )}
                    </motion.div>
                    <span className="text-[10px] whitespace-nowrap">{item.label}</span>
                    {isActive && (
                      <motion.div
                        layoutId="activeTabIndicator"
                        className="absolute -bottom-1 w-5 h-1 rounded-full bg-emerald-600 dark:bg-emerald-400"
                        transition={{ type: 'spring', stiffness: 500, damping: 35 }}
                      />
                    )}
                  </motion.button>
                );
              })}
          </div>
        </nav>
      )}

      {/* منبثقة زر الزائد مع حركة انزلاق وانتقال احترافية */}
      <AnimatePresence>
        {showPlusMenu && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.15 }}
            role="dialog"
            aria-modal="true"
            className="fixed inset-0 z-50 bg-black/40 backdrop-blur-xs flex items-end sm:items-center justify-center p-4"
            onClick={() => setShowPlusMenu(false)}
          >
            <motion.div
              initial={{ opacity: 0, y: 30, scale: 0.95 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 25, scale: 0.95 }}
              transition={{ type: 'spring', damping: 25, stiffness: 350 }}
              className={`rounded-2xl w-full max-w-sm shadow-2xl overflow-hidden border flex flex-col p-4 ${
                darkMode ? 'bg-slate-900 border-slate-800 text-white' : 'bg-white border-slate-100 text-slate-900'
              }`}
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex items-center justify-between pb-3 mb-2 border-b border-slate-100 dark:border-slate-800">
                <h3 className="font-bold text-sm">خيارات الإضافة</h3>
                <button
                  type="button"
                  onClick={() => setShowPlusMenu(false)}
                  className="p-1 rounded-full text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
                  aria-label="إغلاق"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              <motion.button
                type="button"
                whileTap={{ scale: 0.98 }}
                onClick={() => {
                  setShowPlusMenu(false);
                  if (!currentUser) {
                    setAuthModalReason('يرجى تسجيل الدخول أو إنشاء حساب جديد لتتمكن من نشر إعلانك في سوق سوريا');
                    setAuthModalInitialMode('login');
                    setShowAuthModal(true);
                  } else {
                    setShowCreateScreen(true);
                  }
                }}
                className="flex items-center justify-between w-full p-3.5 rounded-xl bg-emerald-50 dark:bg-emerald-950/60 border border-emerald-100 dark:border-emerald-800 text-emerald-800 dark:text-emerald-300 hover:bg-emerald-100/70 dark:hover:bg-emerald-900/40 transition-all cursor-pointer font-bold text-sm"
              >
                <div className="flex items-center gap-2.5">
                  <PlusCircle className="w-5 h-5 text-emerald-600 dark:text-emerald-400" />
                  <span>نشر إعلان جديد</span>
                </div>
                <ArrowRight className="w-4 h-4 rotate-180 text-emerald-600 dark:text-emerald-400" />
              </motion.button>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* نافذة الإشعارات المتصلة بـ Supabase */}
      <AnimatePresence>
        {showNotifications && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.15 }}
            role="dialog"
            aria-modal="true"
            className="fixed inset-0 z-50 bg-black/40 backdrop-blur-xs flex items-center justify-center p-4"
            onClick={() => setShowNotifications(false)}
          >
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 15 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 15 }}
              transition={{ type: 'spring', damping: 25, stiffness: 350 }}
              className={`rounded-2xl w-full max-w-sm shadow-xl overflow-hidden border flex flex-col max-h-[80vh] ${
                darkMode ? 'bg-slate-900 border-slate-800 text-white' : 'bg-white border-slate-100 text-slate-800'
              }`}
              onClick={(e) => e.stopPropagation()}
            >
              <div className={`flex items-center justify-between px-4 py-3.5 border-b ${
                darkMode ? 'border-slate-800 bg-slate-900/90' : 'border-slate-100 bg-slate-50/70'
              }`}>
                <div className="flex items-center gap-2">
                  <Bell className="w-5 h-5 text-emerald-600" />
                  <h2 className="font-bold text-base">إشعارات الإدارة</h2>
                </div>
                <button
                  type="button"
                  onClick={() => setShowNotifications(false)}
                  className="p-1 rounded-full text-slate-400 hover:text-slate-600 hover:bg-slate-200/60 dark:hover:bg-slate-800 transition-colors cursor-pointer"
                  aria-label="إغلاق"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <div className="p-4 overflow-y-auto space-y-3">
                {mergedNotifications.length === 0 ? (
                  <div className="py-10 text-center text-slate-400 text-xs">
                    لا توجد إشعارات حالياً
                  </div>
                ) : (
                  mergedNotifications.map((item) => (
                    <div
                      key={item.id}
                      className={`p-3.5 rounded-xl border text-right flex flex-col gap-1.5 ${
                        darkMode ? 'bg-slate-800/60 border-slate-700/60' : 'bg-slate-50 border-slate-100'
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <span className="font-bold text-sm text-emerald-700 dark:text-emerald-400">
                          {item.title}
                        </span>
                        {item.created_at && (
                          <span className="text-[10px] text-slate-400 flex items-center gap-1">
                            <Clock className="w-3 h-3" />
                            <span>{new Date(item.created_at).toLocaleDateString('ar-SY')}</span>
                          </span>
                        )}
                      </div>
                      <p className={`text-xs leading-relaxed ${darkMode ? 'text-slate-300' : 'text-slate-600'}`}>
                        {item.message}
                      </p>
                    </div>
                  ))
                )}
              </div>

              <div className={`p-3 border-t flex justify-end ${
                darkMode ? 'border-slate-800 bg-slate-900/60' : 'border-slate-100 bg-slate-50/50'
              }`}>
                <button
                  type="button"
                  onClick={() => setShowNotifications(false)}
                  className="px-4 py-1.5 bg-slate-800 hover:bg-slate-900 text-white text-xs font-semibold rounded-lg transition-colors cursor-pointer"
                >
                  إغلاق
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* النافذة العائمة لتسجيل الدخول وإنشاء الحساب (المحافظات ديناميكية من السحاب) */}
      <AuthModal
        isOpen={showAuthModal}
        onClose={() => setShowAuthModal(false)}
        reasonMessage={authModalReason}
        initialMode={authModalInitialMode}
        darkMode={darkMode}
        botProtectionMode={botProtectionMode}
        provincesData={provincesData}
        fieldsConfig={fieldsConfig}
        onSuccess={() => {
          if (authModalReason?.includes('نشر')) {
            setShowCreateScreen(true);
          }
        }}
      />

      {/* نافذة تكبير وتصفح الصور المنبثقة بحجم الشاشة الكامل */}
      <ImageLightboxModal
        isOpen={lightboxOpen}
        onClose={() => setLightboxOpen(false)}
        images={lightboxImages}
        initialIndex={lightboxIndex}
        title={lightboxTitle}
      />

      {/* نافذة إعدادات التطبيق (المقترحات ديناميكية من السحاب مع إجراءات حقيقية) */}
      <SettingsModal
        isOpen={showSettingsModal}
        onClose={() => setShowSettingsModal(false)}
        darkMode={darkMode}
        onToggleDarkMode={toggleDarkMode}
        sortOrder={sortOrder}
        onChangeSortOrder={handleUpdateSortOrder}
        postFontScale={postFontScale}
        onChangePostFontScale={handleUpdatePostFontScale}
        proposals={settingsProposals}
        whatsappLaunchMode={whatsappLaunchMode}
        onChangeWhatsappMode={handleUpdateWhatsappMode}
        onClearCache={handleClearAppCache}
        myProducts={myProducts}
        showFontSizeSetting={marketRules.showFontSizeSetting !== false}
        showSortSetting={marketRules.showSortSetting !== false}
        hasCloudProposals={hasCloudProposals}
      />

      {/* نافذة منظومة المناديب والتوصيل بين المحافظات */}
      <CourierSystemModal
        isOpen={courierModalOpen}
        mode={courierModalMode}
        onClose={() => setCourierModalOpen(false)}
        config={courierConfig}
        provinces={provincesData}
        applications={courierApplications}
        requests={courierRequests}
        currentUserId={currentUser?.id || null}
        currentUserName={
          currentUserProfile?.full_name ||
          currentUser?.user_metadata?.full_name ||
          ''
        }
        currentUserNationalId={
          currentUserProfile?.national_id ||
          currentUser?.user_metadata?.national_id ||
          ''
        }
        currentUserPhone={
          currentUser?.user_metadata?.phone ||
          currentUser?.user_metadata?.whatsapp ||
          ''
        }
        currentUserProvince={
          currentUserProfile?.province ||
          currentUser?.user_metadata?.province ||
          ''
        }
        targetProduct={courierTargetProduct}
        myApplication={myCourierApp}
        whatsappLaunchMode={whatsappLaunchMode}
        onRequireLogin={() => {
          setCourierModalOpen(false);
          setAuthModalReason('يرجى تسجيل الدخول للمتابعة في خدمة المناديب');
          setAuthModalInitialMode('login');
          setShowAuthModal(true);
        }}
        onSubmitApplication={handleSubmitCourierApplication}
        onSubmitDeliveryRequest={handleSubmitCourierRequest}
        onUpdateRequestStatus={handleUpdateCourierRequestStatus}
      />

      {/* نافذة محفظتي والنقاط وشام كاش وباقات التجار */}
      <WalletModal
        isOpen={walletModalOpen}
        onClose={() => setWalletModalOpen(false)}
        config={walletConfig}
        userWallet={currentUserWallet}
        allWallets={userWallets}
        paymentRequests={paymentRequests}
        currentUserId={currentUser?.id || null}
        currentUserName={
          currentUserProfile?.full_name || currentUser?.user_metadata?.full_name || ''
        }
        currentUserPhone={
          currentUser?.user_metadata?.phone || currentUser?.user_metadata?.whatsapp || ''
        }
        currentUserNationalId={
          currentUserProfile?.national_id || currentUser?.user_metadata?.national_id || ''
        }
        initialTab={walletModalTab}
        darkMode={darkMode}
        onRequireLogin={() => {
          setWalletModalOpen(false);
          setAuthModalReason('يرجى تسجيل الدخول لاستخدام المحفظة والشحن عبر شام كاش');
          setAuthModalInitialMode('login');
          setShowAuthModal(true);
        }}
        onSubmitPaymentRequest={handleSubmitWalletPaymentRequest}
        onPurchaseMerchantPlanWithPoints={handlePurchaseMerchantPlanWithPoints}
      />

      {/* نافذة اختيار باقة نجمة الصدارة لتمييز إعلان */}
      {starBoostProduct && (
        <div
          role="dialog"
          aria-modal="true"
          onClick={() => !isApplyingStarBoost && setStarBoostProduct(null)}
          className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4"
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className={`w-full max-w-sm rounded-2xl shadow-2xl border p-5 space-y-3 text-right ${
              darkMode ? 'bg-slate-900 border-slate-800 text-slate-100' : 'bg-white border-slate-100 text-slate-900'
            }`}
          >
            <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-2.5">
              <div className="flex items-center gap-2">
                <Star className="w-5 h-5 text-amber-500 fill-amber-500" />
                <h3 className="font-bold text-sm">تمييز الإعلان بنجمة الصدارة</h3>
              </div>
              <button
                type="button"
                disabled={isApplyingStarBoost}
                onClick={() => setStarBoostProduct(null)}
                className="p-1 rounded-lg text-slate-400 hover:text-slate-600 cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="text-xs text-slate-500 dark:text-slate-400">
              الإعلان: <strong className="text-slate-800 dark:text-slate-200">{starBoostProduct.title}</strong>
            </div>

            <div className="p-2.5 rounded-xl bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800 text-[11px] flex items-center justify-between">
              <span>رصيدك: <strong>{currentUserWallet.points} نقطة</strong></span>
              <span>نجوم مجانية: <strong>{currentUserWallet.starCreditsRemaining || 0}</strong></span>
            </div>

            <div className="space-y-2">
              {(walletConfig.starFeaturePlans || [])
                .filter((s) => s.visible !== false)
                .sort((a, b) => (a.order ?? 0) - (b.order ?? 0))
                .map((sp) => {
                  const hasFreeCredit = (currentUserWallet.starCreditsRemaining || 0) > 0;
                  const canAfford = hasFreeCredit || currentUserWallet.points >= sp.pointsCost;
                  return (
                    <button
                      key={sp.id}
                      type="button"
                      disabled={isApplyingStarBoost || !canAfford}
                      onClick={() => handleApplyStarBoostToProduct(starBoostProduct, sp)}
                      className={`w-full p-3 rounded-xl border text-right flex items-center justify-between gap-2 transition-all cursor-pointer disabled:opacity-50 ${
                        darkMode
                          ? 'bg-slate-800/70 border-slate-700 hover:border-amber-500'
                          : 'bg-slate-50 border-slate-200 hover:border-amber-500'
                      }`}
                    >
                      <div>
                        <div className="font-bold text-xs flex items-center gap-1.5">
                          <Crown className="w-3.5 h-3.5 text-amber-500" />
                          <span>{sp.title}</span>
                        </div>
                        <span className="text-[10px] text-slate-400">
                          يبقى في الصدارة أعلى القائمة لمدة {sp.durationDays} يوم
                        </span>
                      </div>
                      <span className="px-2.5 py-1 rounded-lg bg-amber-500 text-white text-[11px] font-black shrink-0">
                        {hasFreeCredit ? 'مجاني (رصيد باقة)' : `${sp.pointsCost} نقطة`}
                      </span>
                    </button>
                  );
                })}
            </div>
          </div>
        </div>
      )}

      {/* تأكيد أمان إضافي كجزء أساسي من التطبيق قبل حذف أي إعلان */}
      {productToDelete && (
        <div
          role="dialog"
          aria-modal="true"
          className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4"
          onClick={() => {
            if (!isDeletingProduct) setProductToDelete(null);
          }}
        >
          <div
            className={`w-full max-w-sm rounded-2xl shadow-2xl overflow-hidden border p-5 space-y-4 animate-in fade-in zoom-in-95 duration-150 text-right ${
              darkMode ? 'bg-slate-900 border-slate-800 text-slate-100' : 'bg-white border-slate-100 text-slate-900'
            }`}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center gap-3">
              <div className="w-11 h-11 rounded-2xl bg-rose-50 dark:bg-rose-950/70 text-rose-600 dark:text-rose-400 flex items-center justify-center shrink-0 border border-rose-200 dark:border-rose-900/60">
                <ShieldAlert className="w-6 h-6" />
              </div>
              <div>
                <h3 className="font-bold text-sm text-slate-900 dark:text-slate-100">
                  تأكيد أمان حذف الإعلان
                </h3>
                <span className="text-[11px] text-slate-400 block mt-0.5">
                  إجراء أمني إلزامي لمنع الحذف بالخطأ
                </span>
              </div>
            </div>

            <div className={`p-3 rounded-xl border text-xs leading-relaxed space-y-1.5 ${
              darkMode ? 'bg-slate-800/60 border-slate-700/80' : 'bg-slate-50 border-slate-200/80'
            }`}>
              <div className="font-bold text-slate-800 dark:text-slate-200 flex items-center gap-1.5 truncate">
                <span>الإعلان:</span>
                <span className="text-emerald-600 dark:text-emerald-400 font-bold truncate">
                  "{productToDelete.title}"
                </span>
              </div>
              <p className="text-slate-500 dark:text-slate-400 text-[11px]">
                هل أنت متأكد تماماً من حذف هذا الإعلان نهائياً من حسابك في سوق سوريا؟ هذا الإجراء دائم ولا يمكن التراجع عنه أو استرجاع الصور بعد إتمام الحذف.
              </p>
            </div>

            <div className="flex items-center gap-2 pt-1">
              <button
                type="button"
                disabled={isDeletingProduct}
                onClick={handleConfirmDeleteProduct}
                className="flex-1 py-2.5 px-3 rounded-xl bg-rose-600 hover:bg-rose-700 active:scale-95 text-white font-bold text-xs flex items-center justify-center gap-1.5 transition-all shadow-xs cursor-pointer disabled:opacity-50"
              >
                {isDeletingProduct ? (
                  <>
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    <span>جاري الحذف...</span>
                  </>
                ) : (
                  <>
                    <Trash2 className="w-3.5 h-3.5" />
                    <span>تأكيد الحذف نهائياً</span>
                  </>
                )}
              </button>

              <button
                type="button"
                disabled={isDeletingProduct}
                onClick={() => setProductToDelete(null)}
                className={`py-2.5 px-4 rounded-xl font-bold text-xs transition-colors cursor-pointer border ${
                  darkMode
                    ? 'border-slate-700 text-slate-300 hover:bg-slate-800'
                    : 'border-slate-200 text-slate-600 hover:bg-slate-100'
                }`}
              >
                إلغاء
              </button>
            </div>
          </div>
        </div>
      )}

      {/* شاشة وضع الصيانة العام إذا تم تفعيله من لوحة الإدارة */}
      {maintenanceConfig.enabled && (
        <div className="fixed inset-0 z-50 bg-slate-950/95 backdrop-blur-md flex flex-col items-center justify-center p-6 text-center text-white select-text">
          <div className="w-20 h-20 rounded-3xl bg-amber-500/10 border border-amber-500/30 text-amber-400 flex items-center justify-center mb-5 shadow-lg shadow-amber-500/10 animate-bounce">
            <Wrench className="w-10 h-10" />
          </div>

          <h2 className="text-xl font-black text-white mb-2">
            {maintenanceConfig.title || 'سوق سوريا قيد الصيانة والتطوير'}
          </h2>

          <p className="text-sm text-slate-300 max-w-sm mb-4 leading-relaxed">
            {maintenanceConfig.message ||
              'نقوم حالياً بإجراء تحديثات وتحسينات على الخوادم لخدمتكم بشكل أفضل، سنعود قريباً جداً. شكراً لتفهمكم.'}
          </p>

          {maintenanceConfig.estimatedReturnTime && (
            <div className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-full bg-slate-900 border border-slate-800 text-xs text-amber-300 font-bold mb-6">
              <Clock className="w-3.5 h-3.5" />
              <span>الوقت المقدر: {maintenanceConfig.estimatedReturnTime}</span>
            </div>
          )}

          <div className="flex flex-col gap-2.5 w-full max-w-xs">
            <button
              type="button"
              onClick={() => fetchCloudConfig()}
              className="w-full py-2.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-black text-xs transition-all shadow-md cursor-pointer flex items-center justify-center gap-2"
            >
              <RefreshCw className="w-3.5 h-3.5" />
              <span>إعادة فحص الاتصال الآن</span>
            </button>

            {supportConfig?.whatsapp?.enabled && (
              <button
                type="button"
                onClick={() => handleOpenSupport('whatsapp')}
                className="w-full py-2.5 rounded-xl bg-slate-900 hover:bg-slate-850 border border-slate-800 text-slate-200 text-xs font-bold transition-all flex items-center justify-center gap-2 cursor-pointer"
              >
                <MessageCircle className="w-3.5 h-3.5 text-emerald-400" />
                <span>{supportConfig.whatsapp.label || 'تواصل مع الإدارة عبر واتساب'}</span>
              </button>
            )}
          </div>
        </div>
      )}

      {/* الأزرار والعناصر العائمة والبنرات القادمة من السحابة ديناميكياً */}
      {visibleContextWidgets
        .filter((w) =>
          ['top_right', 'top_left', 'bottom_right', 'bottom_left', 'bottom_center', undefined].includes(
            w.position
          )
        )
        .map((widget) => {
          const isBottomLeft = widget.position === 'bottom_left';
          const isBottomRight = widget.position === 'bottom_right';
          const isBottomCenter = widget.position === 'bottom_center';
          const isTopLeft = widget.position === 'top_left';

          const posClass = isBottomLeft
            ? 'bottom-20 left-4'
            : isBottomRight
            ? 'bottom-20 right-4'
            : isBottomCenter
            ? 'bottom-20 left-1/2 -translate-x-1/2'
            : isTopLeft
            ? 'top-16 left-4'
            : 'top-16 right-4';

          return (
            <motion.button
              key={widget.id}
              initial={{ scale: 0, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              type="button"
              onClick={() => handleWidgetClick(widget)}
              style={{
                backgroundColor: widget.bgColor || '#10b981',
                color: widget.textColor || '#ffffff',
                borderColor: widget.borderColor || 'rgba(255,255,255,0.2)',
              }}
              className={`fixed ${posClass} z-40 px-3.5 py-2.5 rounded-2xl shadow-xl flex items-center gap-2 text-xs font-bold cursor-pointer transition-all border backdrop-blur-xs select-none`}
            >
              {renderCloudIcon(widget.icon)}
              <span>{widget.label}</span>
              {widget.badge && (
                <span className="px-1.5 py-0.5 rounded-full bg-black/20 text-[10px]">
                  {widget.badge}
                </span>
              )}
            </motion.button>
          );
        })}

      {/* زر عائم لطلب مندوب توصيل عند اختيار الموضع العائم من الإدارة */}
      {courierConfig.enabled && courierConfig.directoryButtonPosition === 'floating' && (
        <motion.button
          initial={{ scale: 0, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
          type="button"
          onClick={() => openCourierModal('directory', null)}
          className="fixed bottom-24 right-4 z-40 px-3.5 py-2.5 rounded-2xl shadow-xl bg-sky-600 hover:bg-sky-700 text-white border border-sky-400/40 flex items-center gap-2 text-xs font-bold cursor-pointer select-none"
        >
          <Truck className="w-4 h-4 shrink-0" />
          <span>{courierConfig.directoryButtonLabel || 'اطلب مندوب'}</span>
        </motion.button>
      )}

      {/* نافذة منبثقة ديناميكية للودجات والأزرار السحابية (modal) */}
      {activeCloudModal && (
        <div
          role="dialog"
          aria-modal="true"
          onClick={() => setActiveCloudModal(null)}
          className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4"
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className={`w-full max-w-sm rounded-2xl shadow-2xl border p-5 space-y-3 text-right ${
              darkMode ? 'bg-slate-900 border-slate-800 text-slate-100' : 'bg-white border-slate-100 text-slate-900'
            }`}
          >
            <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-2.5">
              <h3 className="font-bold text-sm">{activeCloudModal.title}</h3>
              <button
                type="button"
                onClick={() => setActiveCloudModal(null)}
                className="p-1 rounded-lg text-slate-400 hover:text-slate-600 cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            <p className="text-xs leading-relaxed whitespace-pre-line text-slate-600 dark:text-slate-300">
              {activeCloudModal.content}
            </p>
            <button
              type="button"
              onClick={() => setActiveCloudModal(null)}
              className="w-full py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold cursor-pointer"
            >
              حسناً
            </button>
          </div>
        </div>
      )}

      {/* تنبيه منبثق عند نسخ الرابط أو المشاركة */}
      {toastMessage && (
        <div className="fixed bottom-20 left-1/2 -translate-x-1/2 z-50 bg-slate-900/95 text-white px-4 py-2.5 rounded-xl shadow-lg text-xs font-semibold flex items-center gap-2 border border-slate-700 animate-in fade-in slide-in-from-bottom-2 max-w-sm text-center">
          <span>{toastMessage}</span>
        </div>
      )}
    </div>
  );
}
