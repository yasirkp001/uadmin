import { useState, useEffect } from 'react';
import { api, API_BASE_URL, getImageUrl } from './services/api';
import './App.css';

const playNotificationSound = () => {
  try {
    const AudioContext = window.AudioContext || window.webkitAudioContext;
    if (!AudioContext) return;
    const ctx = new AudioContext();
    
    const playTone = (freq, startTime, duration) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      
      osc.type = 'sine';
      osc.frequency.setValueAtTime(freq, startTime);
      
      gain.gain.setValueAtTime(0.08, startTime);
      gain.gain.exponentialRampToValueAtTime(0.001, startTime + duration);
      
      osc.connect(gain);
      gain.connect(ctx.destination);
      
      osc.start(startTime);
      osc.stop(startTime + duration);
    };

    const now = ctx.currentTime;
    // Chime: C5 followed by G5
    playTone(523.25, now, 0.15);
    playTone(783.99, now + 0.12, 0.35);
  } catch (e) {
    console.error('Audio playback failed:', e.message);
  }
};

const renderBarcode = (code) => {
  if (!code) return null;
  const bars = [];
  let x = 0;
  for (let i = 0; i < code.length; i++) {
    const charCode = code.charCodeAt(i);
    const w1 = (charCode % 3) + 1;
    const w2 = ((charCode >> 1) % 3) + 1;
    bars.push(<rect key={`b-${i}-1`} x={x} y="0" width={w1} height="30" fill="black" />);
    x += w1 + ((charCode >> 2) % 2) + 1;
    bars.push(<rect key={`b-${i}-2`} x={x} y="0" width={w2} height="30" fill="black" />);
    x += w2 + 2;
  }
  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-start', marginTop: '8px' }}>
      <svg width={x} height="30" style={{ overflow: 'visible' }}>
        {bars}
      </svg>
      <span style={{ fontSize: '8px', fontFamily: 'monospace', letterSpacing: '1px', marginTop: '3px', color: '#6b7280' }}>#{code}</span>
    </div>
  );
};

function App() {
  // Auth state
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [user, setUser] = useState(null);
  const [authLoading, setAuthLoading] = useState(true);
  const [loginEmail, setLoginEmail] = useState('');
  const [loginPassword, setLoginPassword] = useState('');
  const [loginError, setLoginError] = useState('');
  const [loginSubmitting, setLoginSubmitting] = useState(false);

  // Dashboard state
  const [activeTab, setActiveTab] = useState('overview');
  const [stats, setStats] = useState({ totalSales: 0, totalOrders: 0, totalUsers: 0, totalProducts: 0 });
  const [products, setProducts] = useState([]);
  const [orders, setOrders] = useState([]);
  const [users, setUsers] = useState([]);
  const [coupons, setCoupons] = useState([]);
  const [categories, setCategories] = useState([]);
  const [analyticsData, setAnalyticsData] = useState(null);
  const [dataLoading, setDataLoading] = useState(false);

  // Date range & filters state
  const [dateRange, setDateRange] = useState('7days');
  const [productStockFilter, setProductStockFilter] = useState('All');
  const [productCategoryFilter, setProductCategoryFilter] = useState('All');

  // Coupon state
  const [showCouponModal, setShowCouponModal] = useState(false);
  const [editingCoupon, setEditingCoupon] = useState(null);
  const [couponForm, setCouponForm] = useState({
    code: '',
    discount_type: 'percentage',
    discount_value: '',
    min_purchase: '',
    expiry_date: '',
    usage_limit: '',
    category: 'All'
  });

  // Product catalog search state
  const [productSearchQuery, setProductSearchQuery] = useState('');

  // Users tab search state
  const [userSearchQuery, setUserSearchQuery] = useState('');

  // Live customer carts state
  const [liveCarts, setLiveCarts] = useState([]);

  // Admin password change state
  const [passwordForm, setPasswordForm] = useState({ current: '', next: '', confirm: '' });
  const [passwordSaving, setPasswordSaving] = useState(false);

  // Internal order notes state
  const [orderNotesDraft, setOrderNotesDraft] = useState('');
  const [orderNotesSaving, setOrderNotesSaving] = useState(false);

  // Activity log state
  const [activityLog, setActivityLog] = useState([]);
  const [activityLoading, setActivityLoading] = useState(false);

  // Selected order details state
  const [selectedOrder, setSelectedOrder] = useState(null);

  // Order filters/sorting state
  const [orderSearchQuery, setOrderSearchQuery] = useState('');
  const [orderStatusFilter, setOrderStatusFilter] = useState('All');
  const [orderSortBy, setOrderSortBy] = useState('newest');

  // Inline stock updating state
  const [updatingStockId, setUpdatingStockId] = useState(null);

  // Support state
  const [supportTickets, setSupportTickets] = useState([]);
  const [selectedTicket, setSelectedTicket] = useState(null);
  const [ticketReplyText, setTicketReplyText] = useState('');
  const [replySubmitting, setReplySubmitting] = useState(false);

  // User details state
  const [selectedUser, setSelectedUser] = useState(null);
  const [selectedUserOrders, setSelectedUserOrders] = useState([]);
  const [userOrdersLoading, setUserOrdersLoading] = useState(false);

  // Shipment tracking state
  const [showTrackingModal, setShowTrackingModal] = useState(false);
  const [trackingOrderId, setTrackingOrderId] = useState('');
  const [trackingForm, setTrackingForm] = useState({ courier: 'DHL', tracking_number: '', estimated_delivery: '' });
  const [trackingSubmitting, setTrackingSubmitting] = useState(false);

  // Product modal & edit states
  const [showProductModal, setShowProductModal] = useState(false);
  const [editingProduct, setEditingProduct] = useState(null);
  const [uploadingImage, setUploadingImage] = useState(false);
  const [manualImageUrl, setManualImageUrl] = useState('');
  const [productForm, setProductForm] = useState({
    name: '',
    price: '',
    category: 'Shirts',
    image: '',
    images: [],
    stock: 50,
    description: '',
    details: '',
    care: ''
  });

  // Category Manager states
  const [newCategoryName, setNewCategoryName] = useState('');
  const [categorySubmitting, setCategorySubmitting] = useState(false);

  // Bulk Stock states
  const [bulkAction, setBulkAction] = useState('add');
  const [bulkAmount, setBulkAmount] = useState('');
  const [bulkCategory, setBulkCategory] = useState('All');
  const [bulkSubmitting, setBulkSubmitting] = useState(false);

  // Site settings state
  const [siteSettings, setSiteSettings] = useState({
    site_name: '',
    hero_title: '',
    hero_tagline: '',
    hero_image: '',
    announcement_banner: '',
    social_instagram: '',
    social_facebook: '',
    contact_email: '',
    contact_phone: '',
    maintenance_mode: 'false',
    star_color: '#fbbf24'
  });
  const [settingsSaving, setSettingsSaving] = useState(false);

  // Admin profile settings states
  const [profileForm, setProfileForm] = useState({
    name: '',
    phone: '',
    dp: ''
  });
  const [profileSaving, setProfileSaving] = useState(false);
  const [profileUploadLoading, setProfileUploadLoading] = useState(false);

  // State for user edit modal
  const [showEditUserModal, setShowEditUserModal] = useState(false);
  const [editingCustomer, setEditingCustomer] = useState(null);
  const [editUserForm, setEditUserForm] = useState({
    name: '',
    phone: '',
    dp: ''
  });
  const [editUserSaving, setEditUserSaving] = useState(false);
  const [editUserUploadLoading, setEditUserUploadLoading] = useState(false);

  // State for Add Admin Modal
  const [showAddAdminModal, setShowAddAdminModal] = useState(false);
  const [addAdminForm, setAddAdminForm] = useState({
    name: '',
    email: '',
    password: '',
    phone: '',
    dp: ''
  });
  const [addAdminSaving, setAddAdminSaving] = useState(false);
  const [addAdminUploadLoading, setAddAdminUploadLoading] = useState(false);

  // State for Add Customer Modal
  const [showAddCustomerModal, setShowAddCustomerModal] = useState(false);
  const [addCustomerForm, setAddCustomerForm] = useState({
    name: '',
    email: '',
    password: '',
    phone: '',
    dp: ''
  });
  const [addCustomerSaving, setAddCustomerSaving] = useState(false);
  const [addCustomerUploadLoading, setAddCustomerUploadLoading] = useState(false);

  // State for Site Settings Hero Image Upload
  const [heroImageUploadLoading, setHeroImageUploadLoading] = useState(false);

  // Premium Features: Media Library States
  const [mediaList, setMediaList] = useState([]);
  const [mediaLoading, setMediaLoading] = useState(false);
  const [mediaPickerMode, setMediaPickerMode] = useState(false);
  const [mediaPickerCallback, setMediaPickerCallback] = useState(null);
  const [mediaUploadLoading, setMediaUploadLoading] = useState(false);
  const [selectedMediaFiles, setSelectedMediaFiles] = useState([]);
  const [settingsSubTab, setSettingsSubTab] = useState('general');

  // Premium Features: Live Activity Ticker States
  const [liveActivities, setLiveActivities] = useState([
    { id: 'initial-1', type: 'system', name: 'Admin Dashboard', message: 'System initialized successfully.', time: new Date().toISOString(), color: '#10b981', icon: '⚡' }
  ]);
  const [isActivitySidebarOpen, setIsActivitySidebarOpen] = useState(false);

  // Premium Features: Size Guide Grid States
  const [guideFormSizes, setGuideFormSizes] = useState(['S', 'M', 'L', 'XL', 'XXL']);
  const [newSizeRowText, setNewSizeRowText] = useState('');
  const [draggedIndex, setDraggedIndex] = useState(null);

  // Premium Features: Hovered Category State for Doughnut Chart
  const [hoveredCategory, setHoveredCategory] = useState(null);
  const [hoveredPoint, setHoveredPoint] = useState(null);

  // Sync admin details to profile form state
  useEffect(() => {
    if (user) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setProfileForm({
        name: user.name || '',
        phone: user.phone || '',
        dp: user.dp || ''
      });
    }
  }, [user]);

  // Size Guides Management states
  const [sizeGuides, setSizeGuides] = useState([]);
  const [isEditingGuide, setIsEditingGuide] = useState(false);
  const [editingGuideId, setEditingGuideId] = useState(null);
  const [guideFormName, setGuideFormName] = useState('');
  const [guideFormCategory, setGuideFormCategory] = useState('');
  const [guideFormColumns, setGuideFormColumns] = useState('Chest (in), Length (in), Sleeve (in)');
  const [guideFormSlots, setGuideFormSlots] = useState({
    S: ['', '', ''],
    M: ['', '', ''],
    L: ['', '', ''],
    XL: ['', '', ''],
    XXL: ['', '', '']
  });

  // Real-time notifications state
  const [activeNotification, setActiveNotification] = useState(null);
  const [isDismissingNotification, setIsDismissingNotification] = useState(false);
  const [showLogoutConfirm, setShowLogoutConfirm] = useState(false);

  // Blog states
  const [posts, setPosts] = useState([]);
  const [showBlogModal, setShowBlogModal] = useState(false);
  const [editingPost, setEditingPost] = useState(null);
  const [blogForm, setBlogForm] = useState({ title: '', content: '', author: '' });
  const [blogSubmitting, setBlogSubmitting] = useState(false);

  // Reviews states
  const [reviews, setReviews] = useState([]);
  const [showReviewEditModal, setShowReviewEditModal] = useState(false);
  const [editingReview, setEditingReview] = useState(null);
  const [reviewForm, setReviewForm] = useState({ rating: 5, comment: '' });
  const [reviewSubmitting, setReviewSubmitting] = useState(false);

  // Global JS error logger for debugging client crashes
  useEffect(() => {
    const handleError = (event) => {
      alert(`JS Error: ${event.message}\nAt: ${event.filename}:${event.lineno}`);
    };
    window.addEventListener('error', handleError);
    return () => window.removeEventListener('error', handleError);
  }, []);

  // Verify auth on mount - keep session logged in on refresh
  useEffect(() => {
    const checkAuth = async () => {
      // Check if browser was closed for more than 1 minute
      const lastClose = localStorage.getItem('uclose_admin_last_close');
      if (lastClose) {
        const timeElapsed = Date.now() - parseInt(lastClose, 10);
        if (timeElapsed > 60000) {
          // 1 minute has passed since closing, clear token to require login
          localStorage.removeItem('uclose_admin_token');
          sessionStorage.removeItem('uclose_admin_token');
          localStorage.removeItem('uclose_admin_last_close');
        } else {
          // Reopened within 1 minute, keep session and clear last close timestamp
          localStorage.removeItem('uclose_admin_last_close');
        }
      }

      let token = localStorage.getItem('uclose_admin_token') || sessionStorage.getItem('uclose_admin_token');
      if (token && !localStorage.getItem('uclose_admin_token')) {
        // Upgrade from sessionStorage to localStorage if found there
        localStorage.setItem('uclose_admin_token', token);
      }
      
      if (!token) {
        setAuthLoading(false);
        return;
      }

      try {
        const data = await api.getMe();
        if (data.user && data.user.role === 'admin') {
          setUser(data.user);
          setIsAuthenticated(true);
        } else {
          // Token is invalid or not an admin
          localStorage.removeItem('uclose_admin_token');
          sessionStorage.removeItem('uclose_admin_token');
        }
      } catch (err) {
        console.error('Auth check failed:', err.message);
        // Only clear the token if the server explicitly returns a validation/client error (e.g. 401/403/400)
        // This prevents network timeouts or 500 server errors from logging out the user
        if (err.status === 401 || err.status === 403 || err.status === 400) {
          localStorage.removeItem('uclose_admin_token');
          sessionStorage.removeItem('uclose_admin_token');
        }
      } finally {
        setAuthLoading(false);
      }
    };

    checkAuth();
  }, []);

  // Connect to real-time purchase notification stream (SSE)
  useEffect(() => {
    if (!isAuthenticated) return;

    const token = localStorage.getItem('uclose_admin_token') || sessionStorage.getItem('uclose_admin_token');
    if (!token) return;

    console.log('[SSE] Connecting to order notifications stream...');
    const eventSource = new EventSource(`${API_BASE_URL}/api/admin/order-stream?token=${token}`);

    eventSource.addEventListener('new-order', (event) => {
      try {
        const orderData = JSON.parse(event.data);
        console.log('[SSE] Received new order event:', orderData);
        
        // Push to activities feed
        const activity = {
          id: `order-${Date.now()}`,
          type: 'new-order',
          idRef: orderData.id,
          name: 'New Order',
          message: `Order #${orderData.id} placed by ${orderData.customerName} for $${parseFloat(orderData.total || 0).toFixed(2)}`,
          time: new Date().toISOString(),
          color: '#3b82f6',
          icon: '🛒'
        };
        setLiveActivities(prev => [activity, ...prev]);

        // Play chime sound
        playNotificationSound();

        // Show toast
        setActiveNotification({
          type: 'new-order',
          id: orderData.id,
          customerName: orderData.customerName,
          total: orderData.total,
          itemsCount: orderData.itemsCount
        });
        setIsDismissingNotification(false);

        // Auto-refresh stats and orders to keep dashboard up to date
        loadDashboardData();
      } catch (err) {
        console.error('[SSE] Failed to parse new order event:', err.message);
      }
    });

    eventSource.addEventListener('user-registered', (event) => {
      try {
        const data = JSON.parse(event.data);
        console.log('[SSE] Received user registration event:', data);
        
        const activity = {
          id: `user-${Date.now()}`,
          type: 'user-registered',
          name: 'New User Registration',
          message: `${data.name} (${data.email}) registered as a customer.`,
          time: data.time || new Date().toISOString(),
          color: '#10b981',
          icon: '👤'
        };
        setLiveActivities(prev => [activity, ...prev]);

        playNotificationSound();

        setActiveNotification({
          type: 'user-registered',
          name: data.name,
          email: data.email
        });
        setIsDismissingNotification(false);
        loadDashboardData();
      } catch (err) {
        console.error('[SSE] Failed to parse user registration:', err.message);
      }
    });

    eventSource.addEventListener('ticket-created', (event) => {
      try {
        const data = JSON.parse(event.data);
        console.log('[SSE] Received ticket creation event:', data);
        
        const activity = {
          id: `ticket-${Date.now()}`,
          type: 'ticket-created',
          name: 'New Support Inquiry',
          message: `Ticket #${data.id} opened by ${data.name} (${data.email}).`,
          time: data.time || new Date().toISOString(),
          color: '#f59e0b',
          icon: '💬'
        };
        setLiveActivities(prev => [activity, ...prev]);

        playNotificationSound();

        setActiveNotification({
          type: 'ticket-created',
          id: data.id,
          name: data.name,
          email: data.email
        });
        setIsDismissingNotification(false);
        loadDashboardData();
      } catch (err) {
        console.error('[SSE] Failed to parse ticket creation:', err.message);
      }
    });

    eventSource.addEventListener('review-submitted', (event) => {
      try {
        const data = JSON.parse(event.data);
        console.log('[SSE] Received review event:', data);
        
        const activity = {
          id: `review-${Date.now()}`,
          type: 'review-submitted',
          name: 'New Product Review',
          message: `${data.name} rated product ${data.rating} stars.`,
          time: data.time || new Date().toISOString(),
          color: '#ec4899',
          icon: '⭐'
        };
        setLiveActivities(prev => [activity, ...prev]);

        playNotificationSound();

        setActiveNotification({
          type: 'review-submitted',
          id: data.id,
          name: data.name,
          rating: data.rating
        });
        setIsDismissingNotification(false);
        loadDashboardData();
      } catch (err) {
        console.error('[SSE] Failed to parse review submission:', err.message);
      }
    });

    eventSource.addEventListener('login', (event) => {
      try {
        const data = JSON.parse(event.data);
        console.log('[SSE] Received login event:', data);
        
        const activity = {
          id: `login-${Date.now()}`,
          type: 'login',
          name: data.role === 'admin' ? 'Admin Login' : 'User Login',
          message: `${data.name} (${data.email}) logged in.`,
          time: data.time || new Date().toISOString(),
          color: '#8b5cf6',
          icon: '🔑'
        };
        setLiveActivities(prev => [activity, ...prev]);

        playNotificationSound();

        setActiveNotification({
          type: 'login',
          name: data.name,
          email: data.email,
          role: data.role
        });
        setIsDismissingNotification(false);
        loadDashboardData();
      } catch (err) {
        console.error('[SSE] Failed to parse login event:', err.message);
      }
    });

    eventSource.addEventListener('logout', (event) => {
      try {
        const data = JSON.parse(event.data);
        console.log('[SSE] Received logout event:', data);
        
        const activity = {
          id: `logout-${Date.now()}`,
          type: 'logout',
          name: data.role === 'admin' ? 'Admin Logout' : 'User Logout',
          message: `${data.name} (${data.email}) logged out.`,
          time: data.time || new Date().toISOString(),
          color: '#ef4444',
          icon: '🚪'
        };
        setLiveActivities(prev => [activity, ...prev]);

        playNotificationSound();

        setActiveNotification({
          type: 'logout_event',
          name: data.name,
          email: data.email,
          role: data.role
        });
        setIsDismissingNotification(false);
        loadDashboardData();
      } catch (err) {
        console.error('[SSE] Failed to parse logout event:', err.message);
      }
    });

    eventSource.addEventListener('password-changed', (event) => {
      try {
        const data = JSON.parse(event.data);
        console.log('[SSE] Received password-changed event:', data);
        
        const activity = {
          id: `password-${Date.now()}`,
          type: 'password-changed',
          name: data.role === 'admin' ? 'Admin Password Changed' : 'User Password Changed',
          message: `${data.name} (${data.email}) changed their password.`,
          time: data.time || new Date().toISOString(),
          color: '#f43f5e',
          icon: '🔒'
        };
        setLiveActivities(prev => [activity, ...prev]);

        playNotificationSound();

        setActiveNotification({
          type: 'password-changed',
          name: data.name,
          email: data.email,
          role: data.role
        });
        setIsDismissingNotification(false);
        loadDashboardData();
      } catch (err) {
        console.error('[SSE] Failed to parse password-changed event:', err.message);
      }
    });

    eventSource.onerror = (err) => {
      console.error('[SSE] EventSource connection error:', err);
    };

    return () => {
      console.log('[SSE] Disconnecting event source...');
      eventSource.close();
    };
  }, [isAuthenticated]);

  const dismissNotification = () => {
    setIsDismissingNotification(true);
    setTimeout(() => {
      setActiveNotification(null);
      setIsDismissingNotification(false);
    }, 300);
  };

  const handleViewNotification = () => {
    if (!activeNotification) return;
    setIsDismissingNotification(true);
    setTimeout(() => {
      const type = activeNotification.type;
      const id = activeNotification.id;
      setActiveNotification(null);
      setIsDismissingNotification(false);
      
      if (type === 'new-order' || !type) {
        setActiveTab('orders');
        setOrderSearchQuery(id || '');
      } else if (type === 'user-registered') {
        setActiveTab('users');
      } else if (type === 'ticket-created') {
        setActiveTab('support');
      } else if (type === 'review-submitted') {
        setActiveTab('reviews');
      }
    }, 300);
  };

  // Save close timestamp on tab/browser close or refresh
  useEffect(() => {
    const handleUnload = () => {
      // Only set close timestamp if there is an active session
      if (localStorage.getItem('uclose_admin_token') || sessionStorage.getItem('uclose_admin_token')) {
        localStorage.setItem('uclose_admin_last_close', Date.now().toString());
      }
    };

    window.addEventListener('beforeunload', handleUnload);
    return () => {
      window.removeEventListener('beforeunload', handleUnload);
    };
  }, []);

  // Fetch the admin activity log (called when the Activity tab opens or refreshes)
  const refreshActivityLog = () => {
    setActivityLoading(true);
    api.getActivityLog()
      .then((data) => setActivityLog(Array.isArray(data) ? data : []))
      .catch((err) => console.error('Failed to load activity log:', err.message))
      .finally(() => setActivityLoading(false));
  };

  // Load Dashboard Data
  async function loadDashboardData() {
    setDataLoading(true);
    
    // Fetch stats
    try {
      const statsData = await api.getAdminStats();
      setStats(statsData || { totalSales: 0, totalOrders: 0, totalUsers: 0, totalProducts: 0 });
    } catch (err) {
      console.error('Failed to load admin stats:', err.message);
    }

    // Fetch products
    try {
      const productsData = await api.getProducts();
      setProducts(Array.isArray(productsData) ? productsData : []);
    } catch (err) {
      console.error('Failed to load products:', err.message);
    }

    // Fetch orders
    try {
      const ordersData = await api.getAdminOrders();
      setOrders(Array.isArray(ordersData) ? ordersData : []);
    } catch (err) {
      console.error('Failed to load admin orders:', err.message);
    }

    // Fetch users
    try {
      const usersData = await api.getAdminUsers();
      setUsers(Array.isArray(usersData) ? usersData : []);
    } catch (err) {
      console.error('Failed to load admin users:', err.message);
    }

    // Fetch coupons
    try {
      const couponsData = await api.getCoupons();
      setCoupons(Array.isArray(couponsData) ? couponsData : []);
    } catch (err) {
      console.error('Failed to load coupons:', err.message);
    }

    // Fetch categories
    try {
      const categoriesData = await api.getCategories();
      setCategories(Array.isArray(categoriesData) ? categoriesData : []);
    } catch (catErr) {
      console.error('Failed to load categories:', catErr.message);
    }

    // Fetch analytics
    try {
      const analytics = await api.getAdminAnalytics();
      setAnalyticsData(analytics);
    } catch (analyticsErr) {
      console.error('Failed to load analytics data:', analyticsErr.message);
    }
 
    // Fetch support tickets
    try {
      const supportData = await api.getSupportTickets();
      setSupportTickets(Array.isArray(supportData) ? supportData : []);
    } catch (supportErr) {
      console.error('Failed to load support tickets:', supportErr.message);
    }

    // Fetch settings
    try {
      const settingsData = await api.getSettings();
      setSiteSettings(settingsData || {
        site_name: '',
        hero_title: '',
        hero_tagline: '',
        hero_image: '',
        announcement_banner: '',
        social_instagram: '',
        social_facebook: '',
        contact_email: '',
        contact_phone: '',
        maintenance_mode: 'false'
      });
    } catch (settingsErr) {
      console.error('Failed to load site settings:', settingsErr.message);
    }

    // Fetch size guides
    try {
      const guides = await api.getSizeGuides();
      setSizeGuides(Array.isArray(guides) ? guides : []);
    } catch (guidesErr) {
      console.error('Failed to load size guides:', guidesErr.message);
    }

    // Fetch posts
    try {
      const postsData = await api.getPosts();
      setPosts(postsData.posts || []);
    } catch (postsErr) {
      console.error('Failed to load posts:', postsErr.message);
    }

    // Fetch reviews
    try {
      const reviewsData = await api.getReviews();
      setReviews(reviewsData || []);
    } catch (reviewsErr) {
      console.error('Failed to load reviews:', reviewsErr.message);
    }

    // Fetch live customer carts
    try {
      const cartsData = await api.getAdminCarts();
      setLiveCarts(Array.isArray(cartsData) ? cartsData : []);
    } catch (cartsErr) {
      console.error('Failed to load live carts:', cartsErr.message);
    }

    // Fetch admin activity log (for overview widget & activity tab)
    try {
      const activityData = await api.getActivityLog();
      setActivityLog(Array.isArray(activityData) ? activityData : []);
    } catch (activityErr) {
      console.error('Failed to load activity log:', activityErr.message);
    }

    // Fetch live activities
    try {
      const liveData = await api.getLiveActivities();
      setLiveActivities(Array.isArray(liveData) ? liveData : []);
    } catch (liveErr) {
      console.error('Failed to load live activities:', liveErr.message);
    }

    setDataLoading(false);
  }

  const handleSettingsSubmit = async (e) => {
    e.preventDefault();
    setSettingsSaving(true);
    try {
      await api.updateSettings(siteSettings);
      alert('Site settings updated successfully!');
    } catch (err) {
      alert('Failed to save settings: ' + err.message);
    } finally {
      setSettingsSaving(false);
    }
  };

  // Admin profile settings submission and upload
  const handleProfileSubmit = async (e) => {
    e.preventDefault();
    if (!profileForm.name.trim()) {
      alert('Name is required.');
      return;
    }
    setProfileSaving(true);
    try {
      await api.updateProfileDetails(
        profileForm.name.trim(),
        profileForm.phone.trim(),
        profileForm.dp.trim()
      );
      // Refresh local admin profile info
      const data = await api.getMe();
      if (data.user) {
        setUser(data.user);
      }
      alert('Profile details updated successfully!');
    } catch (err) {
      alert('Failed to update profile: ' + err.message);
    } finally {
      setProfileSaving(false);
    }
  };

  const handleAdminAvatarUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    setProfileUploadLoading(true);
    try {
      const data = await api.uploadImage(file);
      setProfileForm(prev => ({ ...prev, dp: data.imageUrl }));
    } catch (err) {
      alert('Failed to upload image: ' + err.message);
    } finally {
      setProfileUploadLoading(false);
    }
  };

  // Add Admin modal functions
  const openAddAdminModal = () => {
    setAddAdminForm({
      name: '',
      email: '',
      password: '',
      phone: '',
      dp: ''
    });
    setShowAddAdminModal(true);
  };

  const handleAddAdminSubmit = async (e) => {
    e.preventDefault();
    if (!addAdminForm.name.trim() || !addAdminForm.email.trim() || !addAdminForm.password.trim()) {
      alert('Name, email, and password are required.');
      return;
    }
    setAddAdminSaving(true);
    try {
      await api.createAdmin({
        name: addAdminForm.name.trim(),
        email: addAdminForm.email.trim(),
        password: addAdminForm.password,
        phone: addAdminForm.phone.trim(),
        dp: addAdminForm.dp.trim()
      });
      setShowAddAdminModal(false);
      // Refresh the users database listing
      const usersData = await api.getAdminUsers();
      setUsers(Array.isArray(usersData) ? usersData : []);
      alert('New administrator account created successfully!');
    } catch (err) {
      alert('Failed to create administrator: ' + err.message);
    } finally {
      setAddAdminSaving(false);
    }
  };

  const handleAddAdminAvatarUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    setAddAdminUploadLoading(true);
    try {
      const data = await api.uploadImage(file);
      setAddAdminForm(prev => ({ ...prev, dp: data.imageUrl }));
    } catch (err) {
      alert('Failed to upload image: ' + err.message);
    } finally {
      setAddAdminUploadLoading(false);
    }
  };

  // Add Customer modal functions
  const openAddCustomerModal = () => {
    setAddCustomerForm({
      name: '',
      email: '',
      password: '',
      phone: '',
      dp: ''
    });
    setShowAddCustomerModal(true);
  };

  const handleAddCustomerSubmit = async (e) => {
    e.preventDefault();
    if (!addCustomerForm.name.trim() || !addCustomerForm.email.trim() || !addCustomerForm.password.trim()) {
      alert('Name, email, and password are required.');
      return;
    }
    setAddCustomerSaving(true);
    try {
      await api.createCustomer({
        name: addCustomerForm.name.trim(),
        email: addCustomerForm.email.trim(),
        password: addCustomerForm.password,
        phone: addCustomerForm.phone.trim(),
        dp: addCustomerForm.dp.trim()
      });
      setShowAddCustomerModal(false);
      // Refresh the users database listing
      const usersData = await api.getAdminUsers();
      setUsers(Array.isArray(usersData) ? usersData : []);
      alert('New customer account created successfully!');
    } catch (err) {
      alert('Failed to create customer: ' + err.message);
    } finally {
      setAddCustomerSaving(false);
    }
  };

  const handleAddCustomerAvatarUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    setAddCustomerUploadLoading(true);
    try {
      const data = await api.uploadImage(file);
      setAddCustomerForm(prev => ({ ...prev, dp: data.imageUrl }));
    } catch (err) {
      alert('Failed to upload image: ' + err.message);
    } finally {
      setAddCustomerUploadLoading(false);
    }
  };

  // Customer account edit modal functions
  const openEditUserModal = (customer) => {
    setEditingCustomer(customer);
    setEditUserForm({
      name: customer.name || '',
      phone: customer.phone || '',
      dp: customer.dp || ''
    });
    setShowEditUserModal(true);
  };

  const handleEditUserSubmit = async (e) => {
    e.preventDefault();
    if (!editUserForm.name.trim()) {
      alert('Name is required.');
      return;
    }
    setEditUserSaving(true);
    try {
      await api.updateUser(editingCustomer.id, {
        name: editUserForm.name.trim(),
        phone: editUserForm.phone.trim(),
        dp: editUserForm.dp.trim()
      });
      setShowEditUserModal(false);
      // Refresh the customer database listing
      const usersData = await api.getAdminUsers();
      setUsers(Array.isArray(usersData) ? usersData : []);
      alert('User details updated successfully!');
    } catch (err) {
      alert('Failed to update user: ' + err.message);
    } finally {
      setEditUserSaving(false);
    }
  };

  const handleEditUserAvatarUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    setEditUserUploadLoading(true);
    try {
      const data = await api.uploadImage(file);
      setEditUserForm(prev => ({ ...prev, dp: data.imageUrl }));
    } catch (err) {
      alert('Failed to upload image: ' + err.message);
    } finally {
      setEditUserUploadLoading(false);
    }
  };

  // Hero Image file uploader
  const handleHeroImageUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    setHeroImageUploadLoading(true);
    try {
      const data = await api.uploadImage(file);
      setSiteSettings(prev => ({ ...prev, hero_image: data.imageUrl }));
    } catch (err) {
      alert('Failed to upload hero image: ' + err.message);
    } finally {
      setHeroImageUploadLoading(false);
    }
  };

  // Blog Handlers
  const handleStartCreatePost = () => {
    setEditingPost(null);
    setBlogForm({ title: '', content: '', author: user?.name || 'Admin' });
    setShowBlogModal(true);
  };

  const handleStartEditPost = (post) => {
    setEditingPost(post.id);
    setBlogForm({ title: post.title, content: post.content, author: post.author });
    setShowBlogModal(true);
  };

  const handleBlogSubmit = async (e) => {
    e.preventDefault();
    if (!blogForm.title.trim() || !blogForm.content.trim()) {
      alert('Title and Content are required!');
      return;
    }
    setBlogSubmitting(true);
    try {
      if (editingPost) {
        await api.updatePost(editingPost, blogForm);
        alert('Blog post updated successfully!');
      } else {
        await api.createPost(blogForm);
        alert('Blog post created successfully!');
      }
      setShowBlogModal(false);
      const postsRes = await api.getPosts();
      setPosts(postsRes.posts || []);
    } catch (err) {
      alert('Failed to save post: ' + err.message);
    } finally {
      setBlogSubmitting(false);
    }
  };

  const handleDeletePost = async (id) => {
    if (!window.confirm('Are you sure you want to delete this blog post?')) return;
    try {
      await api.deletePost(id);
      alert('Blog post deleted.');
      const postsRes = await api.getPosts();
      setPosts(postsRes.posts || []);
    } catch (err) {
      alert('Failed to delete post: ' + err.message);
    }
  };

  // Review Handlers
  const handleApproveReview = async (id) => {
    try {
      await api.approveReview(id);
      alert('Review approved successfully!');
      const reviewsData = await api.getReviews();
      setReviews(reviewsData || []);
    } catch (err) {
      alert('Failed to approve review: ' + err.message);
    }
  };

  const handleDeleteReview = async (id) => {
    if (!window.confirm('Are you sure you want to delete this review?')) return;
    try {
      await api.deleteReview(id);
      alert('Review deleted.');
      const reviewsData = await api.getReviews();
      setReviews(reviewsData || []);
    } catch (err) {
      alert('Failed to delete review: ' + err.message);
    }
  };

  const handleOpenEditReview = (review) => {
    setEditingReview(review);
    setReviewForm({ rating: review.rating, comment: review.comment });
    setShowReviewEditModal(true);
  };

  const handleUpdateReviewSubmit = async (e) => {
    e.preventDefault();
    if (!editingReview) return;
    setReviewSubmitting(true);
    try {
      await api.updateReview(editingReview.id, {
        rating: reviewForm.rating,
        comment: reviewForm.comment
      });
      alert('Review updated successfully!');
      setShowReviewEditModal(false);
      setEditingReview(null);
      const reviewsData = await api.getReviews();
      setReviews(reviewsData || []);
    } catch (err) {
      alert('Failed to update review: ' + err.message);
    } finally {
      setReviewSubmitting(false);
    }
  };

  // CSV Report Exports
  const exportOrdersToCSV = () => {
    if (orders.length === 0) {
      alert('No orders available to export.');
      return;
    }
    const headers = ['Order ID', 'Customer Name', 'Email', 'Phone', 'Date', 'Total Amount', 'Status', 'Address', 'Items Count'];
    const rows = orders.map(o => {
      const itemsCount = o.items ? o.items.reduce((sum, item) => sum + (item.quantity || 1), 0) : 0;
      return [
        o.id,
        o.shippingDetails?.name || '',
        o.shippingDetails?.email || '',
        o.shippingDetails?.phone || '',
        new Date(o.date).toLocaleDateString(),
        `$${parseFloat(o.total || 0).toFixed(2)}`,
        o.status,
        `"${(o.shippingDetails?.address || '').replace(/"/g, '""')}"`,
        itemsCount
      ];
    });

    const csvContent = [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', `sales_report_${new Date().toISOString().split('T')[0]}.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const exportCustomersToCSV = () => {
    if (users.length === 0) {
      alert('No customers available to export.');
      return;
    }
    const headers = ['Customer ID', 'Name', 'Email', 'Phone', 'Registered Date', 'Order Count', 'Lifetime Value', 'Status', 'Segment'];
    const rows = users.map(u => {
      let segment = 'New Customer';
      if (u.lifetime_value > 300 || u.order_count >= 3) {
        segment = 'VIP';
      } else if (u.order_count >= 1) {
        segment = 'Frequent Buyer';
      }
      return [
        u.id,
        u.name || '',
        u.email || '',
        u.phone || '',
        new Date(u.created_at).toLocaleDateString(),
        u.order_count || 0,
        `$${parseFloat(u.lifetime_value || 0).toFixed(2)}`,
        u.is_active === 0 ? 'Blocked' : 'Active',
        segment
      ];
    });

    const csvContent = [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', `customer_list_${new Date().toISOString().split('T')[0]}.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const exportProductsToCSV = () => {
    if (products.length === 0) {
      alert('No products available to export.');
      return;
    }
    const headers = ['Product ID', 'Name', 'Category', 'Price', 'Stock', 'Sizes', 'Description'];
    const rows = products.map(p => [
      p.id,
      `"${(p.name || '').replace(/"/g, '""')}"`,
      p.category || '',
      `$${parseFloat(p.price || 0).toFixed(2)}`,
      p.stock !== undefined ? p.stock : '',
      `"${Array.isArray(p.sizes) ? p.sizes.join(' / ') : (p.sizes || '')}"`,
      `"${(p.description || '').replace(/"/g, '""')}"`
    ]);

    const csvContent = [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', `product_catalog_${new Date().toISOString().split('T')[0]}.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Size Guides Management Actions
  const handleStartCreateGuide = () => {
    setIsEditingGuide(true);
    setEditingGuideId(null);
    setGuideFormName('');
    setGuideFormCategory(categories?.[0]?.name || '');
    setGuideFormColumns('Chest (in), Length (in), Sleeve (in)');
    setGuideFormSizes(['S', 'M', 'L', 'XL', 'XXL']);
    setGuideFormSlots({
      S: ['', '', ''],
      M: ['', '', ''],
      L: ['', '', ''],
      XL: ['', '', ''],
      XXL: ['', '', '']
    });
  };

  const handleStartEditGuide = (guide) => {
    setIsEditingGuide(true);
    setEditingGuideId(guide.id);
    setGuideFormName(guide.name);
    setGuideFormCategory(guide.category);
    setGuideFormColumns(guide.columns.join(', '));

    const sizes = guide.slots.map(s => s.size);
    setGuideFormSizes(sizes);

    const initialSlots = {};
    guide.slots.forEach(slot => {
      initialSlots[slot.size] = [...slot.measurements];
    });
    setGuideFormSlots(initialSlots);
  };

  const handleGuideSubmit = async (e) => {
    e.preventDefault();
    const columnsArray = guideFormColumns.split(',').map(c => c.trim()).filter(Boolean);
    if (!guideFormName.trim() || !guideFormCategory) {
      alert('Name and Category are required!');
      return;
    }

    const slotsArray = guideFormSizes.map(size => {
      const measurements = columnsArray.map((_, colIndex) => {
        const val = guideFormSlots[size]?.[colIndex];
        return val || '';
      });
      return { size, measurements };
    });

    const payload = {
      name: guideFormName.trim(),
      category: guideFormCategory,
      columns: columnsArray,
      slots: slotsArray
    };

    try {
      if (editingGuideId) {
        await api.updateSizeGuide(editingGuideId, payload);
        alert('Size guide updated successfully!');
      } else {
        await api.createSizeGuide(payload);
        alert('Size guide created successfully!');
      }
      setIsEditingGuide(false);
      const updated = await api.getSizeGuides();
      setSizeGuides(updated);
    } catch (err) {
      alert('Failed to save size guide: ' + err.message);
    }
  };

  const handleDeleteGuide = async (id) => {
    if (!window.confirm('Are you sure you want to delete this size guide?')) return;
    try {
      await api.deleteSizeGuide(id);
      const updated = await api.getSizeGuides();
      setSizeGuides(updated);
      alert('Size guide deleted.');
    } catch (err) {
      alert('Failed to delete size guide: ' + err.message);
    }
  };

  const handleSlotChange = (size, colIndex, value) => {
    setGuideFormSlots(prev => {
      const copy = { ...prev };
      if (!copy[size]) copy[size] = [];
      copy[size] = [...copy[size]];
      copy[size][colIndex] = value;
      return copy;
    });
  };

  const handleAddSizeRow = () => {
    if (!newSizeRowText.trim()) return;
    const newSize = newSizeRowText.trim();
    if (guideFormSizes.includes(newSize)) {
      alert('Size already exists!');
      return;
    }
    setGuideFormSizes([...guideFormSizes, newSize]);
    setGuideFormSlots(prev => ({
      ...prev,
      [newSize]: Array(guideFormColumns.split(',').length).fill('')
    }));
    setNewSizeRowText('');
  };

  const handleRemoveSizeRow = (size) => {
    setGuideFormSizes(guideFormSizes.filter(s => s !== size));
    setGuideFormSlots(prev => {
      const copy = { ...prev };
      delete copy[size];
      return copy;
    });
  };

  const handleLoadTemplate = (type) => {
    if (type === 'tops') {
      setGuideFormColumns('Chest (in), Length (in), Sleeve (in)');
      setGuideFormSizes(['XS', 'S', 'M', 'L', 'XL', 'XXL']);
      setGuideFormSlots({
        XS: ['34-36', '27', '32'],
        S: ['36-38', '28', '33'],
        M: ['38-40', '29', '34'],
        L: ['40-42', '30', '35'],
        XL: ['42-44', '31', '36'],
        XXL: ['44-46', '32', '37']
      });
    } else if (type === 'bottoms') {
      setGuideFormColumns('Waist (in), Inseam (in), Hip (in)');
      setGuideFormSizes(['XS', 'S', 'M', 'L', 'XL', 'XXL']);
      setGuideFormSlots({
        XS: ['26-28', '30', '34-36'],
        S: ['28-30', '30', '36-38'],
        M: ['30-32', '31', '38-40'],
        L: ['32-34', '31', '40-42'],
        XL: ['34-36', '32', '42-44'],
        XXL: ['36-38', '32', '44-46']
      });
    } else if (type === 'shoes') {
      setGuideFormColumns('Foot Length (cm), US Size, EU Size, UK Size');
      setGuideFormSizes(['Size 39', 'Size 40', 'Size 41', 'Size 42', 'Size 43', 'Size 44']);
      setGuideFormSlots({
        'Size 39': ['24.5', '6.5', '39', '5.5'],
        'Size 40': ['25.0', '7.0', '40', '6.0'],
        'Size 41': ['25.5', '8.0', '41', '7.0'],
        'Size 42': ['26.0', '8.5', '42', '7.5'],
        'Size 43': ['26.5', '9.5', '43', '8.5'],
        'Size 44': ['27.0', '10.0', '44', '9.0']
      });
    }
  };

  const handleDragStart = (e, index) => {
    setDraggedIndex(index);
    e.dataTransfer.effectAllowed = 'move';
  };

  const handleDragOver = (e) => {
    e.preventDefault();
  };

  const handleDrop = (e, index) => {
    e.preventDefault();
    if (draggedIndex === null || draggedIndex === index) return;
    const sizes = [...guideFormSizes];
    const item = sizes[draggedIndex];
    sizes.splice(draggedIndex, 1);
    sizes.splice(index, 0, item);
    setGuideFormSizes(sizes);
    setDraggedIndex(null);
  };

  // Media Library Handlers
  const loadMediaItems = async () => {
    setMediaLoading(true);
    try {
      const media = await api.getMedia();
      setMediaList(Array.isArray(media) ? media : []);
    } catch (err) {
      console.error('Failed to load media items:', err.message);
    } finally {
      setMediaLoading(false);
    }
  };

  const handleOpenMediaPicker = (callback) => {
    setMediaPickerCallback(() => callback);
    setMediaPickerMode(true);
    loadMediaItems();
  };

  const handleSelectMediaItem = (item) => {
    if (mediaPickerCallback) {
      const imageUrl = `/uploads/${item.filename}`;
      mediaPickerCallback(imageUrl);
    }
    setMediaPickerMode(false);
    setMediaPickerCallback(null);
  };

  const handleMediaUpload = async (e) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;
    setMediaUploadLoading(true);
    try {
      for (let i = 0; i < files.length; i++) {
        await api.uploadImage(files[i]);
      }
      alert('Images uploaded successfully!');
      loadMediaItems();
    } catch (err) {
      alert('Upload failed: ' + err.message);
    } finally {
      setMediaUploadLoading(false);
    }
  };

  const handleCopyUrl = (filename) => {
    const url = getImageUrl(`/uploads/${filename}`);
    navigator.clipboard.writeText(url);
    alert('URL copied to clipboard: ' + url);
  };

  const handleToggleMediaSelect = (filename) => {
    setSelectedMediaFiles(prev => 
      prev.includes(filename) ? prev.filter(f => f !== filename) : [...prev, filename]
    );
  };

  const handleBulkDeleteMedia = async () => {
    if (selectedMediaFiles.length === 0) return;
    if (!window.confirm(`Are you sure you want to delete ${selectedMediaFiles.length} files?`)) return;
    
    setMediaLoading(true);
    try {
      for (const filename of selectedMediaFiles) {
        await api.deleteMedia(filename);
      }
      alert('Selected files deleted successfully.');
      setSelectedMediaFiles([]);
      loadMediaItems();
    } catch (err) {
      alert('Delete failed: ' + err.message);
    } finally {
      setMediaLoading(false);
    }
  };

  // Group orders by date for the past 7 days to calculate daily sales trends
  const getSalesChartData = () => {
    const last7Days = [];
    for (let i = 6; i >= 0; i--) {
      const d = new Date();
      d.setDate(d.getDate() - i);
      const dateStr = d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
      const key = d.toISOString().split('T')[0];
      last7Days.push({ dateStr, key, sales: 0, count: 0 });
    }

    orders.forEach(order => {
      if (order.status === 'Cancelled') return;
      if (!order.date) return;
      const orderKey = order.date.split('T')[0].split(' ')[0];
      const dayBucket = last7Days.find(d => d.key === orderKey);
      if (dayBucket) {
        dayBucket.sales += parseFloat(order.total || 0);
        dayBucket.count += 1;
      }
    });

    return last7Days;
  };

  // Dynamic dashboard stats based on the selected dateRange
  const getFilteredStats = () => {
    let filteredOrders = [...orders];
    const now = new Date();
    
    if (dateRange === 'today') {
      const todayStr = now.toISOString().split('T')[0];
      filteredOrders = orders.filter(o => o.date && o.date.split('T')[0].split(' ')[0] === todayStr);
    } else if (dateRange === '7days') {
      const cutOff = new Date();
      cutOff.setDate(cutOff.getDate() - 7);
      filteredOrders = orders.filter(o => o.date && new Date(o.date) >= cutOff);
    } else if (dateRange === '30days') {
      const cutOff = new Date();
      cutOff.setDate(cutOff.getDate() - 30);
      filteredOrders = orders.filter(o => o.date && new Date(o.date) >= cutOff);
    } else if (dateRange === 'ytd') {
      const cutOff = new Date(now.getFullYear(), 0, 1);
      filteredOrders = orders.filter(o => o.date && new Date(o.date) >= cutOff);
    }

    const totalSales = filteredOrders.reduce((sum, o) => o.status !== 'Cancelled' ? sum + parseFloat(o.total || 0) : sum, 0);
    const totalOrders = filteredOrders.length;
    
    return {
      totalSales,
      totalOrders,
      totalProducts: stats.totalProducts,
      totalUsers: stats.totalUsers
    };
  };

  // Group sales dynamically by categories
  const getCategorySalesData = () => {
    const categories = {
      'Shirts': 0,
      'Outerwear': 0,
      'Knitwear': 0,
      'Bottoms': 0,
      'Accessories': 0
    };

    orders.forEach(order => {
      if (order.status === 'Cancelled') return;
      if (Array.isArray(order.items)) {
        order.items.forEach(item => {
          const prod = products.find(p => p.id === (item.id || item.productId || item.product_id));
          const cat = prod ? prod.category : 'Shirts';
          if (categories[cat] !== undefined) {
            categories[cat] += parseFloat(item.price || 0) * (item.quantity || 1);
          }
        });
      }
    });

    return Object.entries(categories).map(([name, sales]) => ({ name, sales }));
  };

  // Quick-change inline stock
  const handleInlineStockChange = async (productId, currentStock, change) => {
    const newStock = Math.max(0, currentStock + change);
    setUpdatingStockId(productId);
    try {
      const prod = products.find(p => p.id === productId);
      if (!prod) return;

      let detailsArray = [];
      if (prod.details) {
        try {
          detailsArray = typeof prod.details === 'string' ? JSON.parse(prod.details) : prod.details;
        } catch {
          detailsArray = [prod.details];
        }
      }

      const productImages = prod.images
        ? (typeof prod.images === 'string' ? JSON.parse(prod.images) : prod.images)
        : [prod.image];

      const payload = {
        name: prod.name,
        price: prod.price,
        category: prod.category,
        image: prod.image,
        images: productImages,
        description: prod.description || '',
        details: detailsArray,
        care: prod.care || '',
        stock: newStock
      };

      await api.updateProduct(productId, payload);
      loadDashboardData();
    } catch (err) {
      alert('Failed to update stock: ' + err.message);
    } finally {
      setUpdatingStockId(null);
    }
  };

  // Filter products catalog list
  const getFilteredProducts = () => {
    let result = [...products];

    if (productSearchQuery.trim()) {
      const q = productSearchQuery.trim().toLowerCase();
      result = result.filter(p =>
        (p.name || '').toLowerCase().includes(q) ||
        (p.category || '').toLowerCase().includes(q) ||
        String(p.id) === q
      );
    }

    if (productCategoryFilter !== 'All') {
      result = result.filter(p => p.category === productCategoryFilter);
    }

    if (productStockFilter === 'OutOfStock') {
      result = result.filter(p => p.stock === 0);
    } else if (productStockFilter === 'LowStock') {
      result = result.filter(p => p.stock !== undefined && p.stock > 0 && p.stock < 10);
    } else if (productStockFilter === 'InStock') {
      result = result.filter(p => p.stock !== undefined && p.stock >= 10);
    }

    return result;
  };

  // Coupon submissions (create or update)
  const handleCouponSubmit = async (e) => {
    e.preventDefault();
    try {
      const payload = {
        code: couponForm.code,
        discount_type: couponForm.discount_type,
        discount_value: parseFloat(couponForm.discount_value),
        min_purchase: parseFloat(couponForm.min_purchase || 0),
        expiry_date: couponForm.expiry_date || null,
        usage_limit: couponForm.usage_limit ? parseInt(couponForm.usage_limit, 10) : null,
        category: couponForm.category !== 'All' ? couponForm.category : null
      };
      if (editingCoupon) {
        await api.updateCoupon(editingCoupon.id, payload);
      } else {
        await api.createCoupon({ ...payload, active: 1 });
      }
      setShowCouponModal(false);
      setEditingCoupon(null);
      setCouponForm({
        code: '',
        discount_type: 'percentage',
        discount_value: '',
        min_purchase: '',
        expiry_date: '',
        usage_limit: '',
        category: 'All'
      });
      loadDashboardData();
    } catch (err) {
      alert('Failed to save coupon: ' + err.message);
    }
  };

  const openEditCouponModal = (coupon) => {
    setEditingCoupon(coupon);
    setCouponForm({
      code: coupon.code || '',
      discount_type: coupon.discount_type || 'percentage',
      discount_value: coupon.discount_value !== undefined ? String(coupon.discount_value) : '',
      min_purchase: coupon.min_purchase ? String(coupon.min_purchase) : '',
      expiry_date: coupon.expiry_date ? coupon.expiry_date.split('T')[0] : '',
      usage_limit: coupon.usage_limit ? String(coupon.usage_limit) : '',
      category: coupon.category || 'All'
    });
    setShowCouponModal(true);
  };

  const closeCouponModal = () => {
    setShowCouponModal(false);
    setEditingCoupon(null);
  };

  const handleToggleCouponActive = async (coupon) => {
    try {
      const res = await api.updateCoupon(coupon.id, { active: coupon.active ? 0 : 1 });
      setCoupons(coupons.map(c => c.id === coupon.id ? { ...c, active: res.coupon?.active ?? (coupon.active ? 0 : 1) } : c));
    } catch (err) {
      alert('Failed to update coupon status: ' + err.message);
    }
  };

  const handleDeleteCoupon = async (id) => {
    if (!window.confirm('Are you sure you want to delete this coupon?')) return;
    try {
      await api.deleteCoupon(id);
      loadDashboardData();
    } catch (err) {
      alert('Failed to delete coupon: ' + err.message);
    }
  };

  // Change own admin password
  const handleChangePassword = async (e) => {
    e.preventDefault();
    if (passwordForm.next.length < 6) {
      alert('New password must be at least 6 characters long.');
      return;
    }
    if (passwordForm.next !== passwordForm.confirm) {
      alert('New password and confirmation do not match.');
      return;
    }
    setPasswordSaving(true);
    try {
      await api.changePassword(passwordForm.current, passwordForm.next);
      setPasswordForm({ current: '', next: '', confirm: '' });
      alert('Password changed successfully.');
    } catch (err) {
      alert('Failed to change password: ' + err.message);
    } finally {
      setPasswordSaving(false);
    }
  };

  // Save internal admin notes on the currently open order
  const handleSaveOrderNotes = async () => {
    if (!selectedOrder) return;
    setOrderNotesSaving(true);
    try {
      await api.updateOrderNotes(selectedOrder.id, orderNotesDraft);
      setOrders(orders.map(o => o.id === selectedOrder.id ? { ...o, adminNotes: orderNotesDraft } : o));
      setSelectedOrder({ ...selectedOrder, adminNotes: orderNotesDraft });
    } catch (err) {
      alert('Failed to save order notes: ' + err.message);
    } finally {
      setOrderNotesSaving(false);
    }
  };

  const handleToggleUserStatus = async (userId) => {
    try {
      const res = await api.toggleUserStatus(userId);
      setUsers(users.map(u => u.id === userId ? { ...u, is_active: res.is_active } : u));
    } catch (err) {
      alert(err.message || 'Failed to toggle user status');
    }
  };

  const handleViewUserHistory = async (user) => {
    setSelectedUser(user);
    setUserOrdersLoading(true);
    try {
      const ordersData = await api.getUserOrders(user.id);
      setSelectedUserOrders(ordersData);
    } catch (err) {
      console.error('Failed to load user order history:', err.message);
      setSelectedUserOrders([]);
    } finally {
      setUserOrdersLoading(false);
    }
  };

  const handleOpenTrackingModal = (order) => {
    setTrackingOrderId(order.id);
    setTrackingForm({
      courier: order.courier || 'DHL',
      tracking_number: order.trackingNumber || '',
      estimated_delivery: order.estimatedDelivery || ''
    });
    setShowTrackingModal(true);
  };

  const handleSubmitTracking = async (e) => {
    e.preventDefault();
    setTrackingSubmitting(true);
    try {
      await api.updateOrderTracking(trackingOrderId, trackingForm);
      
      // Auto-update status to 'Shipped' if it wasn't already Shipped or Delivered
      const order = orders.find(o => o.id === trackingOrderId);
      if (order && order.status !== 'Shipped' && order.status !== 'Delivered') {
        await api.updateOrderStatus(trackingOrderId, 'Shipped');
      }

      const ordersData = await api.getAdminOrders();
      setOrders(ordersData);
      setShowTrackingModal(false);
    } catch (err) {
      alert(err.message || 'Failed to update tracking details');
    } finally {
      setTrackingSubmitting(false);
    }
  };

  const handleSubmitTicketReply = async (e) => {
    e.preventDefault();
    if (!ticketReplyText.trim()) return;
    setReplySubmitting(true);
    try {
      await api.replyToSupportTicket(selectedTicket.id, ticketReplyText);
      setSupportTickets(supportTickets.map(t => t.id === selectedTicket.id ? { ...t, reply: ticketReplyText, status: 'Resolved' } : t));
      setSelectedTicket(null);
      setTicketReplyText('');
    } catch (err) {
      alert(err.message || 'Failed to submit reply');
    } finally {
      setReplySubmitting(false);
    }
  };

  // Filter and sort customer orders based on search queries and status filters
  const getFilteredOrders = () => {
    let result = [...orders];

    if (orderSearchQuery.trim()) {
      const query = orderSearchQuery.toLowerCase();
      result = result.filter(o => 
        o.id.toLowerCase().includes(query) ||
        (o.shippingDetails?.name && o.shippingDetails.name.toLowerCase().includes(query)) ||
        (o.shippingDetails?.email && o.shippingDetails.email.toLowerCase().includes(query))
      );
    }

    if (orderStatusFilter !== 'All') {
      result = result.filter(o => o.status === orderStatusFilter);
    }

    result.sort((a, b) => {
      if (orderSortBy === 'newest') {
        return new Date(b.date) - new Date(a.date);
      } else if (orderSortBy === 'oldest') {
        return new Date(a.date) - new Date(b.date);
      } else if (orderSortBy === 'value-desc') {
        return parseFloat(b.total || 0) - parseFloat(a.total || 0);
      } else if (orderSortBy === 'value-asc') {
        return parseFloat(a.total || 0) - parseFloat(b.total || 0);
      }
      return 0;
    });

    return result;
  };

  // Load data when authentication becomes true
  useEffect(() => {
    if (isAuthenticated) {
      loadDashboardData();
    }
  }, [isAuthenticated]);

  // Handle Login
  const handleLoginSubmit = async (e) => {
    e.preventDefault();
    setLoginError('');
    setLoginSubmitting(true);

    try {
      const data = await api.login(loginEmail, loginPassword);
      if (data.token && data.user) {
        if (data.user.role === 'admin') {
          localStorage.setItem('uclose_admin_token', data.token);
          setUser(data.user);
          setIsAuthenticated(true);

          // Trigger welcome notification popup
          setActiveNotification({
            type: 'welcome',
            adminName: data.user.name || 'Admin'
          });
          setIsDismissingNotification(false);
          playNotificationSound();

          // Auto dismiss welcome notification after 4 seconds
          setTimeout(() => {
            setIsDismissingNotification(true);
            setTimeout(() => {
              setActiveNotification(prev => prev && prev.type === 'welcome' ? null : prev);
              setIsDismissingNotification(false);
            }, 300);
          }, 4000);
        } else {
          setLoginError('Access Denied: This portal is reserved for administrators only.');
        }
      } else {
        setLoginError('Invalid credentials or missing user info.');
      }
    } catch (err) {
      setLoginError(err.message || 'Login failed. Please try again.');
    } finally {
      setLoginSubmitting(false);
    }
  };

  // Handle Logout
  const handleLogout = () => {
    setShowLogoutConfirm(true);
  };

  const performLogout = async () => {
    try {
      await api.logout();
    } catch (err) {
      console.error('Failed to notify backend of logout:', err.message);
    }
    localStorage.removeItem('uclose_admin_token');
    localStorage.removeItem('uclose_admin_last_close');
    setUser(null);
    setIsAuthenticated(false);
    setActiveTab('overview');
    setShowLogoutConfirm(false);

    // Trigger logout notification popup
    setActiveNotification({
      type: 'logout'
    });
    setIsDismissingNotification(false);
    playNotificationSound();

    // Auto dismiss logout notification after 4 seconds
    setTimeout(() => {
      setIsDismissingNotification(true);
      setTimeout(() => {
        setActiveNotification(prev => prev && prev.type === 'logout' ? null : prev);
        setIsDismissingNotification(false);
      }, 300);
    }, 4000);
  };

  // Handle Order Status Update
  const handleStatusUpdate = async (orderId, newStatus) => {
    if (newStatus === 'Shipped') {
      const order = orders.find(o => o.id === orderId);
      if (order) {
        handleOpenTrackingModal(order);
        return;
      }
    }
    try {
      await api.updateOrderStatus(orderId, newStatus);
      // Reload stats and orders
      loadDashboardData();
    } catch (err) {
      alert('Failed to update status: ' + err.message);
    }
  };

  const handleImageUpload = async (e) => {
    const files = Array.from(e.target.files);
    if (files.length === 0) return;

    setUploadingImage(true);
    try {
      const uploadedUrls = [];
      for (const file of files) {
        const data = await api.uploadImage(file);
        uploadedUrls.push(data.imageUrl);
      }
      setProductForm(prev => {
        const newImages = [...(prev.images || []), ...uploadedUrls];
        return {
          ...prev,
          images: newImages,
          image: prev.image || newImages[0] || ''
        };
      });
    } catch (err) {
      alert('Failed to upload image: ' + err.message);
    } finally {
      setUploadingImage(false);
    }
  };

  const handleCategoryCreate = async (e) => {
    e.preventDefault();
    if (!newCategoryName.trim()) return;
    setCategorySubmitting(true);
    try {
      await api.createCategory(newCategoryName);
      setNewCategoryName('');
      loadDashboardData();
    } catch (err) {
      alert('Failed to create category: ' + err.message);
    } finally {
      setCategorySubmitting(false);
    }
  };

  const handleCategoryDelete = async (catId) => {
    if (!window.confirm('Are you sure you want to delete this category? Products currently in this category will remain, but the category itself will be deleted.')) return;
    try {
      await api.deleteCategory(catId);
      loadDashboardData();
    } catch (err) {
      alert('Failed to delete category: ' + err.message);
    }
  };

  const handleBulkInventorySubmit = async (e) => {
    e.preventDefault();
    const amountVal = parseInt(bulkAmount, 10);
    if (isNaN(amountVal)) {
      alert('Please enter a valid stock amount.');
      return;
    }
    setBulkSubmitting(true);
    try {
      await api.bulkUpdateInventory({
        action: bulkAction,
        amount: amountVal,
        category: bulkCategory === 'All' ? null : bulkCategory
      });
      setBulkAmount('');
      loadDashboardData();
    } catch (err) {
      alert('Failed to update inventory in bulk: ' + err.message);
    } finally {
      setBulkSubmitting(false);
    }
  };

  // Product CRUD Modal handlers
  const openAddModal = () => {
    setEditingProduct(null);
    setProductForm({
      name: '',
      price: '',
      category: categories?.[0]?.name || 'Shirts',
      image: '',
      images: [],
      stock: 50,
      description: '',
      details: '',
      care: '',
      sizes: 'S, M, L, XL, XXL'
    });
    setManualImageUrl('');
    setShowProductModal(true);
  };

  const openEditModal = (product) => {
    setEditingProduct(product);
    let detailsText = '';
    if (product.details) {
      try {
        const parsedDetails = typeof product.details === 'string' ? JSON.parse(product.details) : product.details;
        if (Array.isArray(parsedDetails)) {
          detailsText = parsedDetails.join('\n');
        }
      } catch {
        detailsText = product.details;
      }
    }

    const productImages = product.images
      ? (typeof product.images === 'string' ? JSON.parse(product.images) : product.images)
      : [product.image];

    let sizesText = 'S, M, L, XL, XXL';
    if (product.sizes) {
      sizesText = Array.isArray(product.sizes) ? product.sizes.join(', ') : product.sizes;
    }

    setProductForm({
      name: product.name,
      price: product.price,
      category: product.category,
      image: product.image,
      images: productImages,
      stock: product.stock !== undefined ? product.stock : 50,
      description: product.description || '',
      details: detailsText,
      care: product.care || '',
      sizes: sizesText
    });
    setManualImageUrl('');
    setShowProductModal(true);
  };

  const handleProductSubmit = async (e) => {
    e.preventDefault();
    const detailsArray = productForm.details.split('\n').filter(line => line.trim() !== '');
    const finalImages = productForm.images && productForm.images.length > 0 
      ? productForm.images 
      : (productForm.image ? [productForm.image] : []);
    
    if (finalImages.length === 0) {
      alert('Failed to save product: Please provide at least one product image.');
      return;
    }

    const sizesArray = productForm.sizes
      ? productForm.sizes.split(',').map(s => s.trim()).filter(Boolean)
      : ['S', 'M', 'L', 'XL', 'XXL'];

    const payload = {
      ...productForm,
      price: parseFloat(productForm.price),
      details: detailsArray,
      images: finalImages,
      image: finalImages[0], // Ensure image is set to the first image
      stock: parseInt(productForm.stock, 10) || 0,
      sizes: sizesArray
    };

    try {
      if (editingProduct) {
        await api.updateProduct(editingProduct.id, payload);
      } else {
        await api.createProduct(payload);
      }
      setShowProductModal(false);
      loadDashboardData();
    } catch (err) {
      alert('Failed to save product: ' + err.message);
    }
  };

  const handleDeleteProduct = async (productId) => {
    if (!window.confirm('Are you sure you want to delete this product?')) return;
    try {
      await api.deleteProduct(productId);
      loadDashboardData();
    } catch (err) {
      alert('Failed to delete product: ' + err.message);
    }
  };

  // Clone an existing product as a new catalog entry
  const handleDuplicateProduct = async (product) => {
    try {
      const images = product.images
        ? (typeof product.images === 'string' ? JSON.parse(product.images) : product.images)
        : [product.image];
      let details = [];
      if (product.details) {
        try {
          const parsed = typeof product.details === 'string' ? JSON.parse(product.details) : product.details;
          if (Array.isArray(parsed)) details = parsed;
        } catch {
          details = [];
        }
      }
      await api.createProduct({
        name: `${product.name} (Copy)`,
        price: product.price,
        category: product.category,
        image: product.image,
        images: Array.isArray(images) ? images : [product.image],
        description: product.description || '',
        details,
        care: product.care || '',
        stock: product.stock !== undefined ? product.stock : 50,
        sizes: Array.isArray(product.sizes) ? product.sizes : ['S', 'M', 'L', 'XL', 'XXL']
      });
      loadDashboardData();
    } catch (err) {
      alert('Failed to duplicate product: ' + err.message);
    }
  };

  // Permanently delete a customer account
  const handleDeleteUser = async (u) => {
    if (!window.confirm(`Permanently delete customer "${u.name}" (${u.email})? Their order history will be kept, but the account and cart will be removed. This cannot be undone.`)) return;
    try {
      await api.deleteUser(u.id);
      setUsers(users.filter(usr => usr.id !== u.id));
    } catch (err) {
      alert('Failed to delete customer: ' + err.message);
    }
  };

  // Loading indicator for verification check
  if (authLoading) {
    return (
      <div className="loading-container" style={{ minHeight: '100vh' }}>
        <div className="spinner"></div>
      </div>
    );
  }

  // Render Login Card if not authenticated
  if (!isAuthenticated) {
    return (
      <>
        <div className="auth-container">
        <div className="bg-glow-1"></div>
        <div className="bg-glow-2"></div>
        <div className="auth-card">
          <div className="auth-logo">Uclose.</div>
          <div className="auth-subtitle">Admin Portal</div>

          {loginError && <div className="error-message">{loginError}</div>}

          <form onSubmit={handleLoginSubmit} className="auth-form">
            <div className="form-group">
              <label className="form-label">Email Address</label>
              <input
                required
                type="email"
                className="form-input"
                placeholder="admin@uclose.com"
                value={loginEmail}
                onChange={(e) => setLoginEmail(e.target.value)}
              />
            </div>
            <div className="form-group">
              <label className="form-label">Password</label>
              <input
                required
                type="password"
                className="form-input"
                placeholder="••••••••"
                value={loginPassword}
                onChange={(e) => setLoginPassword(e.target.value)}
              />
            </div>
            <button type="submit" disabled={loginSubmitting} className="auth-btn">
              {loginSubmitting ? 'Authenticating...' : 'Sign In'}
            </button>
          </form>
        </div>
      </div>
      {/* Toast Notification popup for logout */}
      {activeNotification && activeNotification.type === 'logout' && (
        <div className={`order-notification-toast ${isDismissingNotification ? 'dismissing' : ''}`}>
          <div className="notification-header">
            <span className="notification-badge" style={{ backgroundColor: '#3b82f6' }}>Logged Out</span>
            <button onClick={dismissNotification} className="notification-close-btn">&times;</button>
          </div>
          <h4 className="notification-title">Logged Out</h4>
          <div className="notification-body">
            Successfully logged out.
          </div>
          <div className="notification-actions">
            <button onClick={dismissNotification} className="notification-btn-view" style={{ backgroundColor: '#3b82f6' }}>OK</button>
          </div>
        </div>
      )}
      </>
    );
  }

  return (
    <div className="admin-app">
      <div className="bg-glow-1"></div>
      <div className="bg-glow-2"></div>

      {/* Header */}
      <header className="dashboard-header">
        <div className="header-brand">
          <div className="brand-logo">Uclose.</div>
          <div className="brand-badge">Admin Panel</div>
        </div>
        <div className="header-user">
          <img
            src={getImageUrl(user?.dp) || `https://api.dicebear.com/7.x/initials/svg?seed=${encodeURIComponent(user?.name || 'Admin')}`}
            alt="Admin Avatar"
            style={{
              width: '32px',
              height: '32px',
              borderRadius: '50%',
              objectFit: 'cover',
              border: '1px solid var(--border-color)',
              background: '#f3f4f6'
            }}
            onError={(e) => {
              e.target.src = `https://api.dicebear.com/7.x/initials/svg?seed=${encodeURIComponent(user?.name || 'Admin')}`;
            }}
          />
          <div className="user-info">
            <div className="user-email" style={{ fontWeight: 'bold' }}>{user?.name || 'Admin'}</div>
            <div className="user-role">{user?.email}</div>
          </div>
          <button 
            onClick={() => setIsActivitySidebarOpen(!isActivitySidebarOpen)} 
            className="secondary-btn" 
            style={{ 
              position: 'relative', 
              padding: '8px', 
              display: 'flex', 
              alignItems: 'center', 
              justifyContent: 'center',
              border: '1px solid var(--border-color)',
              background: 'var(--bg-secondary)',
              cursor: 'pointer',
              marginRight: '12px',
              borderRadius: '4px',
              height: '36px',
              width: '36px'
            }}
            title="Activity Feed"
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9" />
              <path d="M13.73 21a2 2 0 0 1-3.46 0" />
            </svg>
            {liveActivities.length > 0 && (
              <span style={{
                position: 'absolute',
                top: '-4px',
                right: '-4px',
                background: '#ff4d4f',
                color: '#fff',
                borderRadius: '50%',
                fontSize: '8px',
                fontWeight: 'bold',
                padding: '2px 5px',
                lineHeight: 1
              }}>
                {liveActivities.length}
              </span>
            )}
          </button>
          <button onClick={handleLogout} className="logout-btn">
            Log Out
          </button>
        </div>
      </header>

      {/* Main Workspace Layout */}
      <div className="dashboard-layout">
        
        {/* Sidebar Navigation */}
        <nav className="sidebar">
          <button
            onClick={() => setActiveTab('overview')}
            className={`sidebar-btn ${activeTab === 'overview' ? 'active' : ''}`}
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <rect x="3" y="3" width="7" height="9" rx="1" />
              <rect x="14" y="3" width="7" height="5" rx="1" />
              <rect x="14" y="12" width="7" height="9" rx="1" />
              <rect x="3" y="16" width="7" height="5" rx="1" />
            </svg>
            Overview Stats
          </button>
          <button
            onClick={() => setActiveTab('analytics')}
            className={`sidebar-btn ${activeTab === 'analytics' ? 'active' : ''}`}
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <line x1="18" y1="20" x2="18" y2="10" />
              <line x1="12" y1="20" x2="12" y2="4" />
              <line x1="6" y1="20" x2="6" y2="14" />
            </svg>
            Analytics Reports
          </button>
          <button
            onClick={() => setActiveTab('products')}
            className={`sidebar-btn ${activeTab === 'products' ? 'active' : ''}`}
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M6 2L3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4z" />
              <line x1="3" y1="6" x2="21" y2="6" />
              <path d="M16 10a4 4 0 0 1-8 0" />
            </svg>
            Products Catalog
          </button>
          <button
            onClick={() => setActiveTab('orders')}
            className={`sidebar-btn ${activeTab === 'orders' ? 'active' : ''}`}
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <circle cx="9" cy="21" r="1" />
              <circle cx="20" cy="21" r="1" />
              <path d="M1 1h4l2.68 13.39a2 2 0 0 0 2 1.61h9.72a2 2 0 0 0 2-1.61L23 6H6" />
            </svg>
            Customer Orders
          </button>
          <button
            onClick={() => setActiveTab('users')}
            className={`sidebar-btn ${activeTab === 'users' ? 'active' : ''}`}
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
              <circle cx="9" cy="7" r="4" />
              <path d="M23 21v-2a4 4 0 0 0-3-3.87" />
              <path d="M16 3.13a4 4 0 0 1 0 7.75" />
            </svg>
            User Accounts
          </button>
          <button
            onClick={() => setActiveTab('carts')}
            className={`sidebar-btn ${activeTab === 'carts' ? 'active' : ''}`}
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <circle cx="9" cy="21" r="1" />
              <circle cx="20" cy="21" r="1" />
              <path d="M1 1h4l2.68 13.39a2 2 0 0 0 2 1.61h9.72a2 2 0 0 0 2-1.61L23 6H6" />
            </svg>
            Live Carts
          </button>
          <button
            onClick={() => setActiveTab('coupons')}
            className={`sidebar-btn ${activeTab === 'coupons' ? 'active' : ''}`}
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M20.59 13.41l-7.17 7.17a2 2 0 0 1-2.83 0L2 12V2h10l8.59 8.59a2 2 0 0 1 0 2.82z" />
              <line x1="7" y1="7" x2="7.01" y2="7" strokeWidth="2" strokeLinecap="round" />
            </svg>
            Promo Coupons
          </button>
          <button
            onClick={() => setActiveTab('support')}
            className={`sidebar-btn ${activeTab === 'support' ? 'active' : ''}`}
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
            </svg>
            Support Inbox
          </button>
          <button
            onClick={() => setActiveTab('size_guides')}
            className={`sidebar-btn ${activeTab === 'size_guides' ? 'active' : ''}`}
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <rect x="3" y="3" width="18" height="18" rx="2" />
              <line x1="9" y1="3" x2="9" y2="21" />
              <line x1="15" y1="3" x2="15" y2="21" />
              <line x1="3" y1="9" x2="21" y2="9" />
              <line x1="3" y1="15" x2="21" y2="15" />
            </svg>
            Size Guides
          </button>
          <button
            onClick={() => setActiveTab('blog')}
            className={`sidebar-btn ${activeTab === 'blog' ? 'active' : ''}`}
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20" />
              <path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z" />
            </svg>
            Blog Posts
          </button>
          <button
            onClick={() => setActiveTab('reviews')}
            className={`sidebar-btn ${activeTab === 'reviews' ? 'active' : ''}`}
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />
            </svg>
            Product Reviews
          </button>
          <button
            onClick={() => { setActiveTab('activity'); refreshActivityLog(); }}
            className={`sidebar-btn ${activeTab === 'activity' ? 'active' : ''}`}
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <circle cx="12" cy="12" r="10" />
              <polyline points="12 6 12 12 16 14" />
            </svg>
            Activity Log
          </button>
          <button
            onClick={() => setActiveTab('settings')}
            className={`sidebar-btn ${activeTab === 'settings' ? 'active' : ''}`}
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <circle cx="12" cy="12" r="3" />
              <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z" />
            </svg>
            Site Settings
          </button>
          <button
            onClick={() => setActiveTab('profile')}
            className={`sidebar-btn ${activeTab === 'profile' ? 'active' : ''}`}
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
              <circle cx="12" cy="7" r="4" />
            </svg>
            Admin Profile
          </button>
        </nav>

        {/* Workspace Panels */}
        <main className="workspace">
          {dataLoading && (
            <div className="loading-container">
              <div className="spinner"></div>
            </div>
          )}

          {!dataLoading && (
            <>
              {/* Tab: Overview */}
              {activeTab === 'overview' && (() => {
                const lowStockItemsCount = products.filter(p => p.stock !== undefined && p.stock < 10).length;
                const chartData = getSalesChartData();
                const maxSales = Math.max(...chartData.map(d => d.sales), 100);
                
                const chartWidth = 500;
                const chartHeight = 130;
                const points = chartData.map((d, i) => {
                  const x = 25 + (i * (chartWidth - 50)) / 6;
                  const y = chartHeight - (d.sales / maxSales) * (chartHeight - 40) - 20;
                  return { x, y, ...d };
                });

                const getLinePath = (pts) => {
                  if (pts.length === 0) return '';
                  let path = `M ${pts[0].x} ${pts[0].y}`;
                  for (let i = 0; i < pts.length - 1; i++) {
                    const p0 = pts[i];
                    const p1 = pts[i + 1];
                    const cpX1 = p0.x + (p1.x - p0.x) / 2;
                    const cpY1 = p0.y;
                    const cpX2 = p0.x + (p1.x - p0.x) / 2;
                    const cpY2 = p1.y;
                    path += ` C ${cpX1} ${cpY1}, ${cpX2} ${cpY2}, ${p1.x} ${p1.y}`;
                  }
                  return path;
                };

                const linePath = getLinePath(points);
                const areaPath = points.length > 0 
                  ? `${linePath} L ${points[points.length - 1].x} ${chartHeight} L ${points[0].x} ${chartHeight} Z`
                  : '';

                return (
                  <div>
                    <div className="section-title-wrapper" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <div>
                        <h1 className="section-title">Performance Summary</h1>
                        <p className="section-subtitle">Real-time store metrics & summary</p>
                      </div>

                      {/* Date Range Selector */}
                      <div style={{ display: 'flex', gap: '8px', background: 'var(--bg-secondary)', border: '1px solid var(--border-color)', padding: '4px' }}>
                        {[
                          { id: 'today', label: 'Today' },
                          { id: '7days', label: '7 Days' },
                          { id: '30days', label: '30 Days' },
                          { id: 'ytd', label: 'YTD' }
                        ].map(rng => (
                          <button
                            key={rng.id}
                            onClick={() => setDateRange(rng.id)}
                            className="secondary-btn"
                            style={{
                              padding: '6px 12px',
                              fontSize: '10px',
                              border: 'none',
                              background: dateRange === rng.id ? 'var(--text-primary)' : 'transparent',
                              color: dateRange === rng.id ? '#fff' : 'var(--text-secondary)',
                              cursor: 'pointer'
                            }}
                          >
                            {rng.label}
                          </button>
                        ))}
                      </div>
                    </div>

                    {/* Low Stock Alert Notification */}
                    {lowStockItemsCount > 0 && (
                      <div className="error-message" style={{ background: '#fef2f2', borderColor: '#ef4444', color: '#ef4444', display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '24px', borderRadius: '0px' }}>
                        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                          <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" />
                          <line x1="12" y1="9" x2="12" y2="13" />
                          <line x1="12" y1="17" x2="12.01" y2="17" />
                        </svg>
                        <span><strong>Inventory Alert:</strong> {lowStockItemsCount} items are running low on stock (less than 10 units remaining).</span>
                      </div>
                    )}

                    {/* Stats Grid using filtered stats */}
                    {(() => {
                      const fStats = getFilteredStats();
                      return (
                        <div className="stats-grid">
                          <div className="stat-card">
                            <div className="stat-label">Total Sales ({dateRange.toUpperCase()})</div>
                            <div className="stat-value">${fStats.totalSales.toFixed(2)}</div>
                          </div>
                          <div className="stat-card">
                            <div className="stat-label">Total Orders ({dateRange.toUpperCase()})</div>
                            <div className="stat-value">{fStats.totalOrders}</div>
                          </div>
                          <div className="stat-card">
                            <div className="stat-label">Products in Catalog</div>
                            <div className="stat-value">{fStats.totalProducts || 0}</div>
                          </div>
                          <div className="stat-card">
                            <div className="stat-label">Registered Customers</div>
                            <div className="stat-value">{fStats.totalUsers || 0}</div>
                          </div>
                        </div>
                      );
                    })()}

                    {/* Charts Grid */}
                    <div className="dashboard-charts-grid">
                      
                      {/* Sales Trend SVG Chart */}
                      <div className="welcome-banner" style={{ margin: 0, padding: '24px', position: 'relative' }}>
                        <h2 className="welcome-title" style={{ fontSize: '16px', marginBottom: '4px' }}>Daily Sales Trend (Last 7 Days)</h2>
                        <p className="welcome-desc" style={{ marginBottom: '24px', fontSize: '12px' }}>Visual overview of recent checkout transactions</p>
                        
                        <div className="chart-container" style={{ position: 'relative', height: '180px', width: '100%' }}>
                          {hoveredPoint && (
                            <div style={{
                              position: 'absolute',
                              left: `${((hoveredPoint.x) / 500) * 100}%`,
                              top: `${hoveredPoint.y - 45}px`,
                              transform: 'translateX(-50%)',
                              background: 'rgba(0,0,0,0.85)',
                              backdropFilter: 'blur(8px)',
                              color: '#fff',
                              padding: '6px 10px',
                              borderRadius: '4px',
                              fontSize: '10px',
                              pointerEvents: 'none',
                              zIndex: 10,
                              border: '1px solid rgba(255,255,255,0.2)',
                              boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
                              whiteSpace: 'nowrap'
                            }}>
                              <div style={{ fontWeight: 'bold' }}>{hoveredPoint.date}</div>
                              <div>Sales: <span style={{ color: '#10b981', fontWeight: 'bold' }}>${hoveredPoint.sales.toFixed(2)}</span></div>
                              <div>Orders: <strong>{hoveredPoint.count}</strong></div>
                            </div>
                          )}

                          <svg width="100%" height="100%" viewBox="0 0 500 150" style={{ overflow: 'visible' }}>
                            <defs>
                              <linearGradient id="neon-glow-grad" x1="0" y1="0" x2="0" y2="1">
                                <stop offset="0%" stopColor="#10b981" stopOpacity="0.25" />
                                <stop offset="100%" stopColor="#10b981" stopOpacity="0.0" />
                              </linearGradient>
                              <filter id="neon-glow-glow" x="-20%" y="-20%" width="140%" height="140%">
                                <feGaussianBlur stdDeviation="3" result="blur" />
                                <feMerge>
                                  <feMergeNode in="blur" />
                                  <feMergeNode in="SourceGraphic" />
                                </feMerge>
                              </filter>
                            </defs>

                            {/* Horizontal Grid lines */}
                            {[0, 0.25, 0.5, 0.75, 1].map((ratio, idx) => (
                              <line
                                key={idx}
                                x1="0"
                                y1={chartHeight - ratio * (chartHeight - 40) - 20}
                                x2="500"
                                y2={chartHeight - ratio * (chartHeight - 40) - 20}
                                stroke="var(--border-color)"
                                strokeWidth="0.5"
                                strokeDasharray="4 4"
                              />
                            ))}

                            {/* Area Gradient Fill */}
                            {areaPath && (
                              <path
                                d={areaPath}
                                fill="url(#neon-glow-grad)"
                              />
                            )}

                            {/* Glowing Neon Line */}
                            {linePath && (
                              <path
                                d={linePath}
                                fill="transparent"
                                stroke="#10b981"
                                strokeWidth="2.5"
                                filter="url(#neon-glow-glow)"
                              />
                            )}

                            {/* Circle Nodes & Hover Interactions */}
                            {points.map((p, idx) => (
                              <g key={idx}>
                                <circle
                                  cx={p.x}
                                  cy={p.y}
                                  r="4"
                                  fill="#10b981"
                                  stroke="#fff"
                                  strokeWidth="2"
                                  style={{ filter: 'drop-shadow(0px 0px 4px #10b981)' }}
                                />
                                <circle
                                  cx={p.x}
                                  cy={p.y}
                                  r="15"
                                  fill="transparent"
                                  style={{ cursor: 'pointer' }}
                                  onMouseEnter={() => setHoveredPoint({ x: p.x, y: p.y, date: p.dateStr, sales: p.sales, count: p.count })}
                                  onMouseLeave={() => setHoveredPoint(null)}
                                />
                              </g>
                            ))}

                            {/* X Axis Date Strings */}
                            {points.map((p, idx) => (
                              <text
                                key={idx}
                                x={p.x}
                                y="142"
                                textAnchor="middle"
                                fill="var(--text-secondary)"
                                fontSize="8"
                                fontWeight="700"
                                letterSpacing="0.5"
                                style={{ textTransform: 'uppercase' }}
                              >
                                {p.dateStr.split(' ')[1] ? p.dateStr : p.dateStr.split('-').slice(1).join('/')}
                              </text>
                            ))}
                          </svg>
                        </div>
                      </div>

                      {/* Donut Chart: Sales by Category */}
                      <div className="welcome-banner" style={{ margin: 0, padding: '24px', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
                        <h2 className="welcome-title" style={{ width: '100%', textAlign: 'left', fontSize: '16px', marginBottom: '4px' }}>Category Share</h2>
                        <p className="welcome-desc" style={{ width: '100%', textAlign: 'left', fontSize: '12px', marginBottom: '16px' }}>Share of sales by category</p>
                        
                        {(() => {
                          const categorySales = getCategorySalesData();
                          const totalCatSales = categorySales.reduce((sum, c) => sum + c.sales, 0);
                          let currentOffset = 0;
                          const donutElements = categorySales.map((c, idx) => {
                            if (totalCatSales === 0) return null;
                            const percentage = c.sales / totalCatSales;
                            const dashArray = `${percentage * 251.2} 251.2`;
                            const dashOffset = -currentOffset;
                            currentOffset += percentage * 251.2;

                            const colors = [
                              '#000000', // Shirts (black)
                              '#4b5563', // Outerwear (gray-600)
                              '#9ca3af', // Knitwear (gray-400)
                              '#d1d5db', // Bottoms (gray-300)
                              '#e5e7eb'  // Accessories (gray-200)
                            ];

                            return {
                              name: c.name,
                              sales: c.sales,
                              color: colors[idx % colors.length],
                              dashArray,
                              dashOffset
                            };
                          }).filter(Boolean);

                          if (totalCatSales === 0) {
                            return <p style={{ fontSize: '11px', color: 'var(--text-muted)' }}>No sales recorded yet.</p>;
                          }

                          return (
                            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', width: '100%' }}>
                              <div style={{ position: 'relative', width: '100px', height: '100px', marginBottom: '16px' }}>
                                <svg width="100%" height="100%" viewBox="0 0 100 100" style={{ transform: 'rotate(-90deg)', overflow: 'visible' }}>
                                  {donutElements.map((d, idx) => {
                                    const percent = d.sales / totalCatSales;
                                    return (
                                      <circle
                                        key={idx}
                                        cx="50"
                                        cy="50"
                                        r="40"
                                        fill="transparent"
                                        stroke={d.color}
                                        strokeWidth="8"
                                        strokeDasharray={d.dashArray}
                                        strokeDashoffset={d.dashOffset}
                                        style={{ transition: 'stroke-width 0.2s', cursor: 'pointer' }}
                                        onMouseEnter={(e) => {
                                          e.target.setAttribute('stroke-width', '11');
                                          setHoveredCategory({ name: d.name, percentage: percent, sales: d.sales });
                                        }}
                                        onMouseLeave={(e) => {
                                          e.target.setAttribute('stroke-width', '8');
                                          setHoveredCategory(null);
                                        }}
                                      />
                                    );
                                  })}
                                  <circle cx="50" cy="50" r="32" fill="var(--bg-secondary)" />
                                </svg>
                                <div style={{ position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%, -50%)', textAlign: 'center', pointerEvents: 'none', width: '60px' }}>
                                  {hoveredCategory ? (
                                    <>
                                      <div style={{ fontSize: '7px', fontWeight: 'bold', color: 'var(--text-muted)', textTransform: 'uppercase', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                                        {hoveredCategory.name}
                                      </div>
                                      <div style={{ fontSize: '11px', fontWeight: 'bold', letterSpacing: '-0.5px' }}>
                                        ${hoveredCategory.sales.toFixed(0)}
                                      </div>
                                      <div style={{ fontSize: '8px', color: '#10b981', fontWeight: 'bold' }}>
                                        {(hoveredCategory.percentage * 100).toFixed(1)}%
                                      </div>
                                    </>
                                  ) : (
                                    <>
                                      <div style={{ fontSize: '7px', fontWeight: 'bold', color: 'var(--text-muted)', textTransform: 'uppercase' }}>Total</div>
                                      <div style={{ fontSize: '11px', fontWeight: 'bold', letterSpacing: '-0.5px' }}>${totalCatSales.toFixed(0)}</div>
                                    </>
                                  )}
                                </div>
                              </div>
                              
                              <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: '6px', width: '100%', fontSize: '10px' }}>
                                {donutElements.map((d, idx) => {
                                  const isHovered = hoveredCategory && hoveredCategory.name === d.name;
                                  return (
                                    <div key={idx} style={{ display: 'flex', alignItems: 'center', gap: '6px', opacity: hoveredCategory && !isHovered ? 0.45 : 1, transition: 'opacity 0.2s' }}>
                                      <span style={{ width: '8px', height: '8px', background: d.color, display: 'inline-block' }}></span>
                                      <span style={{ color: 'var(--text-secondary)', fontWeight: isHovered ? '900' : 'bold' }}>{d.name}</span>
                                      <span style={{ marginLeft: 'auto', fontWeight: 'bold' }}>${d.sales.toFixed(0)}</span>
                                    </div>
                                  );
                                })}
                              </div>
                            </div>
                          );
                        })()}
                      </div>
                    </div>

                    {/* Recent Admin Activity */}
                    {activityLog.length > 0 && (
                      <div style={{ background: '#fff', border: '1px solid var(--border-color)', borderRadius: '8px', padding: '24px', marginBottom: '24px' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
                          <h3 style={{ margin: 0, fontSize: '14px', fontWeight: '700', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Recent Admin Activity</h3>
                          <button onClick={() => { setActiveTab('activity'); refreshActivityLog(); }} className="secondary-btn" style={{ padding: '6px 14px', fontSize: '11px', margin: 0 }}>
                            View All
                          </button>
                        </div>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                          {activityLog.slice(0, 5).map((entry) => (
                            <div key={entry.id} style={{ display: 'flex', alignItems: 'center', gap: '12px', paddingBottom: '12px', borderBottom: '1px solid var(--bg-secondary)' }}>
                              <span className="category-tag" style={{ flexShrink: 0 }}>{entry.action}</span>
                              <span style={{ fontSize: '12px', color: 'var(--text-secondary)', flex: 1 }}>{entry.detail}</span>
                              <span style={{ fontSize: '11px', color: 'var(--text-muted)', flexShrink: 0 }}>
                                {new Date(entry.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                              </span>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    <div className="welcome-banner">
                      <h2 className="welcome-title">Welcome to the Administrator Hub</h2>
                      <p className="welcome-desc">
                        Manage product listings, fulfill buyer orders, and audit registered user databases. Add new products or track status logs using the quick action keys below.
                      </p>
                      <div className="welcome-actions">
                        <button onClick={openAddModal} className="primary-btn">
                          + Add Product
                        </button>
                        <button onClick={() => setActiveTab('orders')} className="secondary-btn">
                          Manage Orders
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })()}

              {/* Tab: Analytics Reports */}
              {activeTab === 'analytics' && (() => {
                const summary = analyticsData?.summary || {
                  totalRevenue: 0,
                  refundedRevenue: 0,
                  cancelledRevenue: 0,
                  netRevenue: 0,
                  totalOrders: 0,
                  successfulOrders: 0,
                  averageOrderValue: 0
                };
                
                const salesTrend = analyticsData?.salesTrend || [];
                const leaderboard = analyticsData?.leaderboard || [];

                // Chart aggregation
                const maxSalesVal = Math.max(...salesTrend.map(d => d.sales), 100);
                const chartWidth = 600;
                const chartHeight = 150;
                const points = salesTrend.map((d, i) => {
                  const x = salesTrend.length > 1 ? (i / (salesTrend.length - 1)) * chartWidth : 0;
                  const y = chartHeight - (d.sales / maxSalesVal) * (chartHeight - 30);
                  return { x, y, ...d };
                });
                
                const linePath = points.map((p, i) => `${i === 0 ? 'M' : 'L'} ${p.x} ${p.y}`).join(' ');
                const areaPath = points.length > 0
                  ? `${linePath} L ${points[points.length - 1].x} ${chartHeight} L ${points[0].x} ${chartHeight} Z`
                  : '';

                const tickIndices = points.length > 1
                  ? [0, Math.floor(points.length / 3), Math.floor(2 * points.length / 3), points.length - 1]
                  : [0];

                return (
                  <div>
                    <div className="section-title-wrapper" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <div>
                        <h1 className="section-title">Analytics Reports</h1>
                        <p className="section-subtitle">Aggregated sales performance & insights</p>
                      </div>
                      <button onClick={exportOrdersToCSV} className="secondary-btn" style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                          <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                          <polyline points="7 10 12 15 17 10" />
                          <line x1="12" y1="15" x2="12" y2="3" />
                        </svg>
                        Export Orders (CSV)
                      </button>
                    </div>

                    {/* Stats Grid */}
                    <div className="stats-grid" style={{ marginBottom: '32px' }}>
                      <div className="stat-card">
                        <div className="stat-label">Net Sales Revenue</div>
                        <div className="stat-value">${summary.netRevenue.toFixed(2)}</div>
                        <div style={{ fontSize: '10px', color: 'var(--text-muted)', marginTop: '4px' }}>Excludes returns & refunds</div>
                      </div>
                      <div className="stat-card">
                        <div className="stat-label">Average Order Value (AOV)</div>
                        <div className="stat-value">${summary.averageOrderValue.toFixed(2)}</div>
                        <div style={{ fontSize: '10px', color: 'var(--text-muted)', marginTop: '4px' }}>Average revenue per transaction</div>
                      </div>
                      <div className="stat-card">
                        <div className="stat-label">Refunds & Returns</div>
                        <div className="stat-value" style={{ color: '#dc2626' }}>${summary.refundedRevenue.toFixed(2)}</div>
                        <div style={{ fontSize: '10px', color: 'var(--text-muted)', marginTop: '4px' }}>Processed returned products value</div>
                      </div>
                      <div className="stat-card">
                        <div className="stat-label">Successful Orders</div>
                        <div className="stat-value">{summary.successfulOrders}</div>
                        <div style={{ fontSize: '10px', color: 'var(--text-muted)', marginTop: '4px' }}>Out of {summary.totalOrders} total checkouts</div>
                      </div>
                    </div>

                    {/* Charts & Leaderboard Row */}
                    <div className="analytics-charts-grid">
                      
                      {/* Trend Area Chart Card */}
                      <div className="welcome-banner" style={{ margin: 0, padding: '24px' }}>
                        <h2 className="welcome-title" style={{ fontSize: '16px', marginBottom: '4px' }}>Sales Revenue Trend (30 Days)</h2>
                        <p className="welcome-desc" style={{ marginBottom: '24px', fontSize: '12px' }}>Aggregated daily checkouts graph</p>
                        
                        {salesTrend.length === 0 ? (
                          <div style={{ height: '180px', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text-secondary)', fontSize: '12px', border: '1px dashed var(--border-color)' }}>
                            No sales data collected yet.
                          </div>
                        ) : (
                          <div className="chart-container" style={{ position: 'relative', height: '185px', width: '100%', paddingRight: '20px' }}>
                            <svg width="100%" height="180" viewBox="0 0 600 180" style={{ overflow: 'visible' }}>
                              {/* Horizontal Grid lines */}
                              {[0, 0.25, 0.5, 0.75, 1].map((ratio, idx) => (
                                <line
                                  key={idx}
                                  x1="0"
                                  y1={chartHeight - ratio * (chartHeight - 30)}
                                  x2="600"
                                  y2={chartHeight - ratio * (chartHeight - 30)}
                                  stroke="var(--border-color)"
                                  strokeWidth="0.5"
                                  strokeDasharray="4 4"
                                />
                              ))}
                              
                              {/* Area fill */}
                              {areaPath && (
                                <path
                                  d={areaPath}
                                  fill="rgba(0, 0, 0, 0.04)"
                                />
                              )}

                              {/* Trend Line */}
                              {linePath && (
                                <path
                                  d={linePath}
                                  fill="transparent"
                                  stroke="var(--text-primary)"
                                  strokeWidth="2"
                                />
                              )}

                              {/* Interactive circles and tooltips */}
                              {points.map((p, idx) => (
                                <g key={idx}>
                                  <circle
                                    cx={p.x}
                                    cy={p.y}
                                    r="3"
                                    fill="var(--text-primary)"
                                    style={{ cursor: 'pointer', transition: 'r 0.1s' }}
                                    onMouseEnter={(e) => {
                                      e.target.setAttribute('r', '6');
                                      e.target.parentNode.querySelector('.chart-tooltip').style.opacity = 1;
                                    }}
                                    onMouseLeave={(e) => {
                                      e.target.setAttribute('r', '3');
                                      e.target.parentNode.querySelector('.chart-tooltip').style.opacity = 0;
                                    }}
                                  />
                                  <text
                                    x={p.x}
                                    y={p.y - 12}
                                    textAnchor="middle"
                                    fill="var(--text-primary)"
                                    fontSize="8"
                                    fontWeight="700"
                                    className="chart-tooltip"
                                    style={{ opacity: 0, transition: 'opacity 0.2s', pointerEvents: 'none', background: '#fff' }}
                                  >
                                    ${p.sales.toFixed(0)}
                                  </text>
                                </g>
                              ))}

                              {/* Horizontal axis labels */}
                              {points.length > 0 && tickIndices.map((tIdx) => {
                                const p = points[tIdx];
                                if (!p) return null;
                                return (
                                  <g key={tIdx}>
                                    <line
                                      x1={p.x}
                                      y1={chartHeight}
                                      x2={p.x}
                                      y2={chartHeight + 4}
                                      stroke="var(--text-secondary)"
                                      strokeWidth="1"
                                    />
                                    <text
                                      x={p.x}
                                      y={chartHeight + 16}
                                      textAnchor="middle"
                                      fill="var(--text-secondary)"
                                      fontSize="8"
                                      fontWeight="700"
                                      letterSpacing="0.5"
                                      style={{ textTransform: 'uppercase' }}
                                    >
                                      {p.dateStr.split('-').slice(1).join('/')}
                                    </text>
                                  </g>
                                );
                              })}
                            </svg>
                          </div>
                        )}
                      </div>

                      {/* Best Sellers Leaderboard Card */}
                      <div className="welcome-banner" style={{ margin: 0, padding: '24px' }}>
                        <h2 className="welcome-title" style={{ fontSize: '16px', marginBottom: '4px' }}>Top-Selling Products</h2>
                        <p className="welcome-desc" style={{ marginBottom: '24px', fontSize: '12px' }}>Most popular inventory listings</p>

                        {leaderboard.length === 0 ? (
                          <div style={{ height: '180px', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text-secondary)', fontSize: '12px', border: '1px dashed var(--border-color)' }}>
                            No sales recorded.
                          </div>
                        ) : (
                          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                            {leaderboard.map((item, index) => (
                              <div key={item.id} style={{ display: 'flex', alignItems: 'center', gap: '12px', paddingBottom: '12px', borderBottom: index < leaderboard.length - 1 ? '1px solid var(--border-color)' : 'none' }}>
                                <div style={{ fontSize: '12px', fontWeight: 'bold', minWidth: '16px', color: 'var(--text-secondary)' }}>#{index + 1}</div>
                                {item.image && <img src={getImageUrl(item.image)} alt={item.name} style={{ width: '32px', height: '40px', objectFit: 'cover' }} />}
                                <div style={{ flex: 1, minWidth: 0 }}>
                                  <div style={{ fontSize: '12px', fontWeight: 'bold', textTransform: 'uppercase', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{item.name}</div>
                                  <div style={{ fontSize: '10px', color: 'var(--text-muted)' }}>{item.qty} units sold</div>
                                </div>
                                <div style={{ textAlign: 'right', fontWeight: '700', fontSize: '13px' }}>
                                  ${item.revenue.toFixed(2)}
                                </div>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>

                    </div>
                  </div>
                );
              })()}

                   {/* Tab: Products */}
              {activeTab === 'products' && (() => {
                const filteredProducts = getFilteredProducts();
                return (
                  <div>
                    <div className="section-title-wrapper">
                      <div>
                        <h1 className="section-title">Products Catalog</h1>
                        <p className="section-subtitle">Manage store products & collections</p>
                      </div>
                      <div style={{ display: 'flex', gap: '12px' }}>
                        <button onClick={exportProductsToCSV} className="secondary-btn" style={{ margin: 0 }}>
                          Export Products (CSV)
                        </button>
                        <button onClick={openAddModal} className="primary-btn">
                          + Add Product
                        </button>
                      </div>
                    </div>

                    <div className="products-catalog-grid">
                      {/* Left Column: Products List */}
                      <div>
                        {/* Inventory Filters */}
                        <div className="filter-bar">
                          <div style={{ flex: 1, minWidth: '180px' }}>
                            <label className="form-label" style={{ marginBottom: '6px', display: 'block' }}>Search Products</label>
                            <input
                              type="text"
                              className="form-input"
                              style={{ padding: '8px 12px' }}
                              placeholder="Search by name, category or ID..."
                              value={productSearchQuery}
                              onChange={(e) => setProductSearchQuery(e.target.value)}
                            />
                          </div>
                          <div>
                            <label className="form-label" style={{ marginBottom: '6px', display: 'block' }}>Category Filter</label>
                            <select
                              className="form-input"
                              style={{ padding: '8px 12px', cursor: 'pointer' }}
                              value={productCategoryFilter}
                              onChange={(e) => setProductCategoryFilter(e.target.value)}
                            >
                              <option value="All">All Categories</option>
                              {(categories || []).map(cat => (
                                <option key={cat.id} value={cat.name}>{cat.name}</option>
                              ))}
                            </select>
                          </div>
                          <div>
                            <label className="form-label" style={{ marginBottom: '6px', display: 'block' }}>Stock Level Filter</label>
                            <select
                              className="form-input"
                              style={{ padding: '8px 12px', cursor: 'pointer' }}
                              value={productStockFilter}
                              onChange={(e) => setProductStockFilter(e.target.value)}
                            >
                              <option value="All">All Stock Levels</option>
                              <option value="InStock">In Stock (&gt;= 10)</option>
                              <option value="LowStock">Low Stock (&lt; 10)</option>
                              <option value="OutOfStock">Out of Stock (0)</option>
                            </select>
                          </div>
                        </div>

                        <div className="table-container">
                          <table className="admin-table">
                            <thead>
                              <tr>
                                <th>Image</th>
                                <th>Product Name</th>
                                <th>Category</th>
                                <th>Price</th>
                                <th>Inventory (Adjust Inline)</th>
                                <th style={{ textAlign: 'right' }}>Actions</th>
                              </tr>
                            </thead>
                            <tbody>
                              {filteredProducts.map((p) => (
                                <tr key={p.id}>
                                  <td>
                                    <img src={getImageUrl(p.image)} alt={p.name} className="product-thumb" />
                                  </td>
                                  <td>
                                    <div className="product-name">{p.name}</div>
                                  </td>
                                  <td>
                                    <span className="category-tag">{p.category}</span>
                                  </td>
                                  <td>
                                    <div className="price-text">${parseFloat(p.price || 0).toFixed(2)}</div>
                                  </td>
                                  <td>
                                    {p.stock !== undefined ? (
                                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                        <button
                                          disabled={updatingStockId === p.id}
                                          onClick={() => handleInlineStockChange(p.id, p.stock, -1)}
                                          className="secondary-btn"
                                          style={{ padding: '2px 8px', fontSize: '10px', minWidth: '24px', border: '1px solid var(--border-color)', margin: 0 }}
                                        >
                                          -
                                        </button>
                                        <span style={{ fontWeight: '700', minWidth: '24px', textAlign: 'center', color: p.stock < 10 ? '#ef4444' : 'inherit' }}>
                                          {p.stock}
                                        </span>
                                        <button
                                          disabled={updatingStockId === p.id}
                                          onClick={() => handleInlineStockChange(p.id, p.stock, 1)}
                                          className="secondary-btn"
                                          style={{ padding: '2px 8px', fontSize: '10px', minWidth: '24px', border: '1px solid var(--border-color)', margin: 0 }}
                                        >
                                          +
                                        </button>
                                        {updatingStockId === p.id && <div className="spinner" style={{ width: '12px', height: '12px', border: '2px solid transparent', borderTopColor: 'var(--text-primary)', borderRadius: '50%', animation: 'spin 0.6s linear infinite' }}></div>}
                                        {p.stock < 10 && (
                                          <span className="status-badge" style={{ background: '#fef2f2', color: '#ef4444', border: '1px solid #fee2e2', padding: '2px 6px', fontSize: '8px', marginLeft: '8px' }}>
                                            {p.stock === 0 ? 'OUT' : 'LOW'}
                                          </span>
                                        )}
                                      </div>
                                    ) : (
                                      <span className="status-badge">N/A</span>
                                    )}
                                  </td>
                                  <td>
                                    <div className="actions-cell">
                                      <a 
                                        href={`http://localhost:5173/product/${p.id}`} 
                                        target="_blank" 
                                        rel="noopener noreferrer" 
                                        className="action-link"
                                        style={{ textDecoration: 'none' }}
                                      >
                                        View on Site
                                      </a>
                                      <button onClick={() => openEditModal(p)} className="action-link">
                                        Edit
                                      </button>
                                      <button onClick={() => handleDuplicateProduct(p)} className="action-link">
                                        Duplicate
                                      </button>
                                      <button onClick={() => handleDeleteProduct(p.id)} className="action-link delete">
                                        Delete
                                      </button>
                                    </div>
                                  </td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                      </div>

                      {/* Right Column: Category and Bulk Stock management */}
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '32px' }}>
                        {/* Dynamic Category Manager Card */}
                        <div className="welcome-banner" style={{ margin: 0, padding: '24px', background: 'var(--bg-secondary)', border: '1px solid var(--border-color)', borderRadius: '0' }}>
                          <h2 className="welcome-title" style={{ fontSize: '14px', marginBottom: '4px' }}>Category Manager</h2>
                          <p className="welcome-desc" style={{ marginBottom: '16px', fontSize: '11px' }}>Create and remove store categories</p>
                          
                          <form onSubmit={handleCategoryCreate} style={{ display: 'flex', gap: '8px', marginBottom: '16px' }}>
                            <input
                              type="text"
                              required
                              placeholder="New category..."
                              className="form-input"
                              style={{ flex: 1, padding: '8px 12px', fontSize: '12px' }}
                              value={newCategoryName}
                              onChange={(e) => setNewCategoryName(e.target.value)}
                            />
                            <button
                              type="submit"
                              disabled={categorySubmitting}
                              className="primary-btn"
                              style={{ padding: '8px 16px', fontSize: '11px', margin: 0 }}
                            >
                              {categorySubmitting ? '...' : 'Add'}
                            </button>
                          </form>

                          <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', maxHeight: '180px', overflowY: 'auto', border: '1px solid var(--border-color)', padding: '8px' }}>
                            {(categories || []).map((cat) => (
                              <div key={cat.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '12px', padding: '4px 0' }}>
                                <span style={{ fontWeight: '600' }}>{cat.name}</span>
                                <button
                                  onClick={() => handleCategoryDelete(cat.id)}
                                  style={{ background: 'transparent', border: 'none', color: '#dc2626', cursor: 'pointer', padding: '0 4px', fontSize: '11px' }}
                                >
                                  Delete
                                </button>
                              </div>
                            ))}
                            {(!categories || categories.length === 0) && (
                              <p style={{ fontStyle: 'italic', fontSize: '11px', color: 'var(--text-muted)', textAlign: 'center', margin: '8px 0' }}>No categories found.</p>
                            )}
                          </div>
                        </div>

                        {/* Bulk Inventory Manager Card */}
                        <div className="welcome-banner" style={{ margin: 0, padding: '24px', background: 'var(--bg-secondary)', border: '1px solid var(--border-color)', borderRadius: '0' }}>
                          <h2 className="welcome-title" style={{ fontSize: '14px', marginBottom: '4px' }}>Bulk Stock Adjust</h2>
                          <p className="welcome-desc" style={{ marginBottom: '16px', fontSize: '11px' }}>Update stock levels by category</p>
                          
                          <form onSubmit={handleBulkInventorySubmit} style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                            <div>
                              <label className="form-label" style={{ fontSize: '10px', marginBottom: '4px', display: 'block' }}>Action</label>
                              <select
                                className="form-input"
                                style={{ width: '100%', padding: '8px 12px', fontSize: '12px' }}
                                value={bulkAction}
                                onChange={(e) => setBulkAction(e.target.value)}
                              >
                                <option value="add">Add to stock (can be negative)</option>
                                <option value="set">Set exact stock</option>
                              </select>
                            </div>
                            <div>
                              <label className="form-label" style={{ fontSize: '10px', marginBottom: '4px', display: 'block' }}>Category</label>
                              <select
                                className="form-input"
                                style={{ width: '100%', padding: '8px 12px', fontSize: '12px' }}
                                value={bulkCategory}
                                onChange={(e) => setBulkCategory(e.target.value)}
                              >
                                <option value="All">All Categories</option>
                                {(categories || []).map((cat) => (
                                  <option key={cat.id} value={cat.name}>{cat.name}</option>
                                ))}
                              </select>
                            </div>
                            <div>
                              <label className="form-label" style={{ fontSize: '10px', marginBottom: '4px', display: 'block' }}>Stock Value</label>
                              <input
                                type="number"
                                required
                                placeholder="e.g. 10 or -5"
                                className="form-input"
                                style={{ width: '100%', padding: '8px 12px', fontSize: '12px' }}
                                value={bulkAmount}
                                onChange={(e) => setBulkAmount(e.target.value)}
                              />
                            </div>
                            <button
                              type="submit"
                              disabled={bulkSubmitting}
                              className="primary-btn"
                              style={{ width: '100%', padding: '10px', fontSize: '11px', margin: 0, marginTop: '4px' }}
                            >
                              {bulkSubmitting ? 'Applying...' : 'Apply Stock Update'}
                            </button>
                          </form>
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })()}

              {/* Tab: Orders */}
              {activeTab === 'orders' && (() => {
                const filteredOrders = getFilteredOrders();
                return (
                  <div>
                    <div className="section-title-wrapper">
                      <div>
                        <h1 className="section-title">Customer Orders</h1>
                        <p className="section-subtitle">Monitor orders status & tracking logs</p>
                      </div>
                    </div>

                    {/* Filters Toolbar */}
                    <div className="filter-bar" style={{ display: 'flex', flexWrap: 'wrap', gap: '16px', marginBottom: '24px', padding: '16px', background: 'var(--bg-secondary)', border: '1px solid var(--border-color)' }}>
                      <div style={{ flex: '1', minWidth: '200px' }}>
                        <label className="form-label" style={{ marginBottom: '6px', display: 'block' }}>Search Orders</label>
                        <input
                          type="text"
                          className="form-input"
                          placeholder="Search by ID, buyer name, or email..."
                          style={{ width: '100%', padding: '10px 14px' }}
                          value={orderSearchQuery}
                          onChange={(e) => setOrderSearchQuery(e.target.value)}
                        />
                      </div>
                      <div style={{ minWidth: '150px' }}>
                        <label className="form-label" style={{ marginBottom: '6px', display: 'block' }}>Filter Status</label>
                        <select
                          className="form-input"
                          style={{ width: '100%', padding: '10px 14px', cursor: 'pointer' }}
                          value={orderStatusFilter}
                          onChange={(e) => setOrderStatusFilter(e.target.value)}
                        >
                          {['All', 'Pending', 'Confirmed', 'Shipped', 'Delivered', 'Cancelled'].map(st => (
                            <option key={st} value={st}>{st}</option>
                          ))}
                        </select>
                      </div>
                      <div style={{ minWidth: '150px' }}>
                        <label className="form-label" style={{ marginBottom: '6px', display: 'block' }}>Sort By</label>
                        <select
                          className="form-input"
                          style={{ width: '100%', padding: '10px 14px', cursor: 'pointer' }}
                          value={orderSortBy}
                          onChange={(e) => setOrderSortBy(e.target.value)}
                        >
                          <option value="newest">Newest First</option>
                          <option value="oldest">Oldest First</option>
                          <option value="value-desc">Highest Value</option>
                          <option value="value-asc">Lowest Value</option>
                        </select>
                      </div>
                    </div>

                    {filteredOrders.length === 0 ? (
                      <div className="welcome-banner" style={{ textAlign: 'center', padding: '60px' }}>
                        <p className="welcome-desc" style={{ margin: '0 auto' }}>No matching customer orders found.</p>
                      </div>
                    ) : (
                      <div className="orders-list">
                        {filteredOrders.map((order) => (
                          <div key={order.id} className="order-card">
                            <div className="order-header">
                              <div className="order-meta-left">
                                <div className="order-id">ORDER ID: #{order.id}</div>
                                <div className="order-customer">
                                  Customer: <span>{order.shippingDetails?.name} ({order.shippingDetails?.email})</span>
                                </div>
                              </div>
                              <div className="order-meta-right">
                                <span className={`status-badge status-${order.status.replace(/\s+/g, '')}`}>{order.status}</span>
                                <select
                                  value={order.status}
                                  onChange={(e) => handleStatusUpdate(order.id, e.target.value)}
                                  className="status-select"
                                >
                                  {['Pending', 'Confirmed', 'Shipped', 'Delivered', 'Return Requested', 'Returned', 'Refunded', 'Cancelled'].map((st) => (
                                    <option key={st} value={st}>{st}</option>
                                  ))}
                                </select>
                              </div>
                            </div>

                            <div className="order-details-grid">
                              <div>
                                <div className="details-col-title">Delivery Details</div>
                                <div className="details-col-val">
                                  <strong>Address:</strong> {order.shippingDetails?.address}
                                  <br />
                                  <strong>Phone:</strong> {order.shippingDetails?.phone}
                                </div>
                              </div>
                              <div>
                                <div className="details-col-title">Payment Summary</div>
                                <div className="details-col-val">
                                  <strong style={{ fontSize: '16px', color: '#000' }}>
                                    ${parseFloat(order.total || 0).toFixed(2)}
                                  </strong>
                                  <br />
                                  <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>Via Credit Card checkout</span>
                                </div>
                              </div>
                              <div>
                                <div className="details-col-title">Items Included</div>
                                <div className="details-col-val">
                                  <ul className="order-items-list">
                                    {order.items?.map((item, idx) => (
                                      <li key={idx} className="order-item-row">
                                        <a
                                          href={`http://localhost:5173/product/${item.id || item.productId || item.product_id}`}
                                          target="_blank"
                                          rel="noopener noreferrer"
                                          className="order-item-name"
                                          style={{ textDecoration: 'none', color: 'inherit', transition: 'color 0.2s' }}
                                          onMouseEnter={(e) => e.target.style.color = 'var(--accent)'}
                                          onMouseLeave={(e) => e.target.style.color = 'inherit'}
                                        >
                                          {item.name} ({item.size || 'M'})
                                        </a>
                                        <span className="order-item-qty">x{item.quantity}</span>
                                      </li>
                                    ))}
                                  </ul>
                                </div>
                              </div>
                            </div>
                            
                            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px', marginTop: '16px', borderTop: '1px solid var(--border-color)', paddingTop: '12px' }}>
                              {order.trackingNumber && (
                                <div style={{ marginRight: 'auto', display: 'flex', alignItems: 'center', gap: '6px', fontSize: '11px', color: 'var(--text-secondary)' }}>
                                  <span style={{ fontWeight: 'bold' }}>{order.courier}:</span>
                                  <span style={{ fontFamily: 'var(--mono)' }}>{order.trackingNumber}</span>
                                </div>
                              )}
                              <button onClick={() => handleOpenTrackingModal(order)} className="secondary-btn" style={{ padding: '6px 12px', fontSize: '10px' }}>
                                Update Tracking
                              </button>
                              <button onClick={() => { setSelectedOrder(order); setOrderNotesDraft(order.adminNotes || ''); }} className="secondary-btn" style={{ padding: '6px 12px', fontSize: '10px' }}>
                                View Full Invoice & Items
                              </button>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                );
              })()}

              {/* Tab: Users */}
              {activeTab === 'users' && (
                <div>
                  <div className="section-title-wrapper" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <div>
                      <h1 className="section-title">User Accounts</h1>
                      <p className="section-subtitle">Audit registered buyers & administrators</p>
                    </div>
                    <div style={{ display: 'flex', gap: '12px' }}>
                      <button onClick={exportCustomersToCSV} className="secondary-btn" style={{ display: 'flex', alignItems: 'center', gap: '6px', margin: 0 }}>
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                          <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                          <polyline points="7 10 12 15 17 10" />
                          <line x1="12" y1="15" x2="12" y2="3" />
                        </svg>
                        Export Customers (CSV)
                      </button>
                      <button onClick={openAddCustomerModal} className="primary-btn" style={{ display: 'flex', alignItems: 'center', gap: '6px', margin: 0 }}>
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                          <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" />
                          <circle cx="9" cy="7" r="4" />
                          <line x1="19" y1="8" x2="19" y2="14" />
                          <line x1="16" y1="11" x2="22" y2="11" />
                        </svg>
                        + Add Customer
                      </button>
                      <button onClick={openAddAdminModal} className="primary-btn" style={{ display: 'flex', alignItems: 'center', gap: '6px', margin: 0 }}>
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                          <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" />
                          <circle cx="9" cy="7" r="4" />
                          <line x1="19" y1="8" x2="19" y2="14" />
                          <line x1="16" y1="11" x2="22" y2="11" />
                        </svg>
                        + Add Administrator
                      </button>
                    </div>
                  </div>

                  <div className="filter-bar" style={{ marginBottom: '16px' }}>
                    <div style={{ flex: 1, minWidth: '220px' }}>
                      <label className="form-label" style={{ marginBottom: '6px', display: 'block' }}>Search Users</label>
                      <input
                        type="text"
                        className="form-input"
                        style={{ padding: '8px 12px' }}
                        placeholder="Search by name, email or phone..."
                        value={userSearchQuery}
                        onChange={(e) => setUserSearchQuery(e.target.value)}
                      />
                    </div>
                  </div>

                  <div className="table-container">
                    <table className="admin-table">
                      <thead>
                        <tr>
                          <th>ID</th>
                          <th>Name</th>
                          <th>Email</th>
                          <th>Total Orders</th>
                          <th>Total Spent</th>
                          <th>Status</th>
                          <th style={{ textAlign: 'right' }}>Actions</th>
                        </tr>
                      </thead>
                      <tbody>
                        {users.filter((u) => {
                          if (!userSearchQuery.trim()) return true;
                          const q = userSearchQuery.trim().toLowerCase();
                          return (u.name || '').toLowerCase().includes(q) ||
                            (u.email || '').toLowerCase().includes(q) ||
                            (u.phone || '').toLowerCase().includes(q);
                        }).map((u) => (
                          <tr key={u.id}>
                            <td style={{ fontFamily: 'var(--mono)', fontSize: '12px', color: 'var(--text-muted)' }}>
                              #{u.id}
                            </td>
                            <td>
                              <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                                <img
                                  src={getImageUrl(u.dp) || `https://api.dicebear.com/7.x/initials/svg?seed=${encodeURIComponent(u.name || 'User')}`}
                                  alt={u.name}
                                  style={{
                                    width: '32px',
                                    height: '32px',
                                    borderRadius: '50%',
                                    objectFit: 'cover',
                                    border: '1px solid var(--border-color)',
                                    background: '#f3f4f6',
                                    flexShrink: 0
                                  }}
                                  onError={(e) => {
                                    e.target.src = `https://api.dicebear.com/7.x/initials/svg?seed=${encodeURIComponent(u.name || 'User')}`;
                                  }}
                                />
                                <div>
                                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                    <div style={{ fontWeight: '600' }}>{u.name || 'N/A'}</div>
                                    {(() => {
                                      if (u.role === 'admin') {
                                        return (
                                          <span style={{ fontSize: '9px', fontWeight: 'bold', background: '#fee2e2', color: '#dc2626', border: '1px solid #fecaca', padding: '1px 6px', borderRadius: '4px' }}>
                                            Admin
                                          </span>
                                        );
                                      } else if (u.lifetime_value > 300 || u.order_count >= 3) {
                                        return (
                                          <span style={{ fontSize: '9px', fontWeight: 'bold', background: '#faf5ff', color: '#6b21a8', border: '1px solid #e9d5ff', padding: '1px 6px', borderRadius: '4px' }}>
                                            VIP
                                          </span>
                                        );
                                      } else if (u.order_count >= 1) {
                                        return (
                                          <span style={{ fontSize: '9px', fontWeight: 'bold', background: '#eff6ff', color: '#1d4ed8', border: '1px solid #bfdbfe', padding: '1px 6px', borderRadius: '4px' }}>
                                            Frequent Buyer
                                          </span>
                                        );
                                      } else {
                                        return (
                                          <span style={{ fontSize: '9px', fontWeight: 'bold', background: '#f3f4f6', color: '#374151', border: '1px solid #e5e7eb', padding: '1px 6px', borderRadius: '4px' }}>
                                            New Customer
                                          </span>
                                        );
                                      }
                                    })()}
                                  </div>
                                </div>
                              </div>
                            </td>
                            <td>
                              <div style={{ color: 'var(--text-secondary)' }}>{u.email}</div>
                            </td>
                            <td>
                              <div style={{ fontWeight: '700' }}>{u.role === 'admin' ? '—' : (u.order_count || 0)}</div>
                            </td>
                            <td>
                              <div style={{ fontWeight: '700' }}>{u.role === 'admin' ? '—' : `$${parseFloat(u.lifetime_value || 0).toFixed(2)}`}</div>
                            </td>
                            <td>
                              {u.is_active !== 0 ? (
                                <span className="status-badge" style={{ background: '#f0fdf4', color: '#15803d', border: '1px solid #dcfce7' }}>
                                  Active
                                </span>
                              ) : (
                                <span className="status-badge" style={{ background: '#fef2f2', color: '#b91c1c', border: '1px solid #fee2e2' }}>
                                  Blocked
                                </span>
                              )}
                            </td>
                            <td>
                              <div className="actions-cell" style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end' }}>
                                <button onClick={() => openEditUserModal(u)} className="action-link">
                                  Edit
                                </button>
                                {u.role !== 'admin' && (
                                  <button onClick={() => handleViewUserHistory(u)} className="action-link">
                                    Orders
                                  </button>
                                )}
                                {u.id !== user?.id && (
                                  <button onClick={() => handleToggleUserStatus(u.id)} className="action-link" style={{ color: u.is_active !== 0 ? '#b91c1c' : '#15803d' }}>
                                    {u.is_active !== 0 ? 'Block' : 'Unblock'}
                                  </button>
                                )}
                                {u.role !== 'admin' && (
                                  <button onClick={() => handleDeleteUser(u)} className="action-link delete">
                                    Delete
                                  </button>
                                )}
                              </div>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}

              {/* Tab: Live Customer Carts */}
              {activeTab === 'carts' && (
                <div>
                  <div className="section-title-wrapper">
                    <div>
                      <h1 className="section-title">Live Customer Carts</h1>
                      <p className="section-subtitle">Items customers have added but not yet checked out — potential revenue</p>
                    </div>
                    <button onClick={loadDashboardData} className="secondary-btn">
                      Refresh
                    </button>
                  </div>

                  {/* Potential revenue summary */}
                  <div className="stats-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '16px', marginBottom: '24px' }}>
                    <div className="stat-card" style={{ background: '#fff', border: '1px solid var(--border-color)', borderRadius: '8px', padding: '20px' }}>
                      <div style={{ fontSize: '10px', fontWeight: '700', textTransform: 'uppercase', letterSpacing: '1px', color: 'var(--text-muted)' }}>Active Carts</div>
                      <div style={{ fontSize: '24px', fontWeight: '800', marginTop: '6px' }}>{liveCarts.length}</div>
                    </div>
                    <div className="stat-card" style={{ background: '#fff', border: '1px solid var(--border-color)', borderRadius: '8px', padding: '20px' }}>
                      <div style={{ fontSize: '10px', fontWeight: '700', textTransform: 'uppercase', letterSpacing: '1px', color: 'var(--text-muted)' }}>Items in Carts</div>
                      <div style={{ fontSize: '24px', fontWeight: '800', marginTop: '6px' }}>{liveCarts.reduce((sum, c) => sum + c.item_count, 0)}</div>
                    </div>
                    <div className="stat-card" style={{ background: '#fff', border: '1px solid var(--border-color)', borderRadius: '8px', padding: '20px' }}>
                      <div style={{ fontSize: '10px', fontWeight: '700', textTransform: 'uppercase', letterSpacing: '1px', color: 'var(--text-muted)' }}>Potential Revenue</div>
                      <div style={{ fontSize: '24px', fontWeight: '800', marginTop: '6px', color: '#15803d' }}>${liveCarts.reduce((sum, c) => sum + c.total_value, 0).toFixed(2)}</div>
                    </div>
                  </div>

                  <div className="table-container">
                    <table className="admin-table">
                      <thead>
                        <tr>
                          <th>Customer</th>
                          <th>Cart Contents</th>
                          <th>Items</th>
                          <th>Cart Value</th>
                        </tr>
                      </thead>
                      <tbody>
                        {liveCarts.map((cart) => (
                          <tr key={cart.user_id}>
                            <td>
                              <div style={{ fontWeight: '600' }}>{cart.name}</div>
                              <div style={{ fontSize: '11px', color: 'var(--text-secondary)' }}>{cart.email}</div>
                            </td>
                            <td>
                              <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                                {cart.items.map((item, idx) => (
                                  <div key={idx} style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                    {item.image && <img src={getImageUrl(item.image)} alt="" style={{ width: '24px', height: '30px', objectFit: 'cover', borderRadius: '2px' }} />}
                                    <span style={{ fontSize: '12px' }}>
                                      {item.name} <span style={{ color: 'var(--text-muted)' }}>(Size {item.size} × {item.quantity})</span>
                                    </span>
                                  </div>
                                ))}
                              </div>
                            </td>
                            <td>
                              <div style={{ fontWeight: '700' }}>{cart.item_count}</div>
                            </td>
                            <td>
                              <div style={{ fontWeight: '700' }}>${cart.total_value.toFixed(2)}</div>
                            </td>
                          </tr>
                        ))}
                        {liveCarts.length === 0 && (
                          <tr>
                            <td colSpan="4" style={{ fontStyle: 'italic', textAlign: 'center', padding: '24px', color: 'var(--text-muted)' }}>
                              No customers have items in their carts right now.
                            </td>
                          </tr>
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}

              {/* Tab: Coupons */}
              {activeTab === 'coupons' && (
                <div>
                  <div className="section-title-wrapper">
                    <div>
                      <h1 className="section-title">Promo Coupons</h1>
                      <p className="section-subtitle">Manage promotional offers & checkout discounts</p>
                    </div>
                    <button
                      onClick={() => {
                        setEditingCoupon(null);
                        setCouponForm({
                          code: '',
                          discount_type: 'percentage',
                          discount_value: '',
                          min_purchase: '',
                          expiry_date: '',
                          usage_limit: '',
                          category: 'All'
                        });
                        setShowCouponModal(true);
                      }}
                      className="primary-btn"
                    >
                      + Create Coupon
                    </button>
                  </div>

                  <div className="table-container">
                    <table className="admin-table">
                      <thead>
                        <tr>
                          <th>Coupon Code</th>
                          <th>Discount</th>
                          <th>Min Purchase</th>
                          <th>Category</th>
                          <th>Limits / Used</th>
                          <th>Expiry Date</th>
                          <th>Status</th>
                          <th style={{ textAlign: 'right' }}>Actions</th>
                        </tr>
                      </thead>
                      <tbody>
                        {coupons.map((c) => (
                          <tr key={c.id}>
                            <td>
                              <span style={{ fontFamily: 'var(--mono)', fontWeight: 'bold', letterSpacing: '1px', background: '#000', color: '#fff', padding: '4px 8px', fontSize: '11px' }}>
                                {c.code}
                              </span>
                            </td>
                            <td>
                              <div style={{ fontWeight: '700' }}>
                                {c.discount_type === 'percentage' ? `${c.discount_value}%` : `$${c.discount_value}`}
                              </div>
                              <span className="category-tag" style={{ fontSize: '8px', padding: '2px 4px' }}>{c.discount_type}</span>
                            </td>
                            <td>
                              <div style={{ color: 'var(--text-secondary)' }}>
                                ${parseFloat(c.min_purchase || 0).toFixed(2)}
                              </div>
                            </td>
                            <td>
                              <div style={{ fontWeight: '600', fontSize: '12px' }}>
                                {c.category || 'All'}
                              </div>
                            </td>
                            <td>
                              <div style={{ fontSize: '12px', fontWeight: 'bold' }}>
                                Used: {c.used_count || 0} / {c.usage_limit || '∞'}
                              </div>
                            </td>
                            <td>
                              <div style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>
                                {c.expiry_date ? new Date(c.expiry_date).toLocaleDateString() : 'No Expiry'}
                              </div>
                            </td>
                            <td>
                              {c.active ? (
                                <span className="status-badge" style={{ background: '#f0fdf4', color: '#15803d', border: '1px solid #dcfce7' }}>
                                  Active
                                </span>
                              ) : (
                                <span className="status-badge" style={{ background: '#f3f4f6', color: '#4b5563', border: '1px solid #e5e7eb' }}>
                                  Inactive
                                </span>
                              )}
                            </td>
                            <td>
                              <div className="actions-cell">
                                <button onClick={() => openEditCouponModal(c)} className="action-link">
                                  Edit
                                </button>
                                <button
                                  onClick={() => handleToggleCouponActive(c)}
                                  className="action-link"
                                  style={{ color: c.active ? '#b45309' : '#15803d' }}
                                >
                                  {c.active ? 'Deactivate' : 'Activate'}
                                </button>
                                <button onClick={() => handleDeleteCoupon(c.id)} className="action-link delete">
                                  Delete
                                </button>
                              </div>
                            </td>
                          </tr>
                        ))}
                        {coupons.length === 0 && (
                          <tr>
                            <td colSpan="8" style={{ fontStyle: 'italic', textAlign: 'center', padding: '24px', color: 'var(--text-muted)' }}>
                              No promotional coupons registered.
                            </td>
                          </tr>
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}

              {/* Tab: Support Inbox */}
              {activeTab === 'support' && (
                <div>
                  <div className="section-title-wrapper">
                    <div>
                      <h1 className="section-title">Support Inbox</h1>
                      <p className="section-subtitle">Manage customer inquiries and contact submissions</p>
                    </div>
                  </div>

                  <div className="table-container">
                    <table className="admin-table">
                      <thead>
                        <tr>
                          <th>Date</th>
                          <th>Customer</th>
                          <th>Email</th>
                          <th>Message</th>
                          <th>Status</th>
                          <th style={{ textAlign: 'right' }}>Actions</th>
                        </tr>
                      </thead>
                      <tbody>
                        {supportTickets.map((t) => (
                          <tr key={t.id}>
                            <td style={{ color: 'var(--text-muted)', fontSize: '13px' }}>
                              {new Date(t.created_at).toLocaleDateString()}
                            </td>
                            <td>
                              <div style={{ fontWeight: '600' }}>{t.name}</div>
                            </td>
                            <td>
                              <div style={{ color: 'var(--text-secondary)' }}>{t.email}</div>
                            </td>
                            <td style={{ maxWidth: '300px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                              <span style={{ color: 'var(--text-secondary)', fontSize: '13px' }}>{t.message}</span>
                            </td>
                            <td>
                              {t.status === 'Open' ? (
                                <span className="status-badge" style={{ background: '#fef3c7', color: '#b45309', border: '1px solid #fde68a' }}>
                                  Open
                                </span>
                              ) : (
                                <span className="status-badge" style={{ background: '#f0fdf4', color: '#15803d', border: '1px solid #dcfce7' }}>
                                  Resolved
                                </span>
                              )}
                            </td>
                            <td>
                              <div className="actions-cell">
                                <button onClick={() => { setSelectedTicket(t); setTicketReplyText(t.reply || ''); }} className="action-link">
                                  {t.status === 'Open' ? 'Reply' : 'View Response'}
                                </button>
                              </div>
                            </td>
                          </tr>
                        ))}
                        {supportTickets.length === 0 && (
                          <tr>
                            <td colSpan="6" style={{ fontStyle: 'italic', textAlign: 'center', padding: '24px', color: 'var(--text-muted)' }}>
                              No support tickets received yet.
                            </td>
                          </tr>
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}

              {/* Tab: Size Guides Management */}
              {activeTab === 'size_guides' && (
                <div>
                  <div className="section-title-wrapper" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
                    <div>
                      <h1 className="section-title">Size Guides</h1>
                      <p className="section-subtitle">Manage size charts and measurement guides for categories</p>
                    </div>
                    {!isEditingGuide && (
                      <button onClick={handleStartCreateGuide} className="primary-btn" style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                          <line x1="12" y1="5" x2="12" y2="19" />
                          <line x1="5" y1="12" x2="19" y2="12" />
                        </svg>
                        Create Size Guide
                      </button>
                    )}
                  </div>

                  {isEditingGuide ? (
                    <div className="card" style={{ padding: '32px', background: '#fff', border: '1px solid #e5e7eb', borderRadius: '8px' }}>
                      <h2 style={{ fontSize: '18px', fontWeight: 'bold', marginBottom: '24px' }}>
                        {editingGuideId ? 'Edit Size Guide' : 'Create Size Guide'}
                      </h2>
                      <form onSubmit={handleGuideSubmit}>
                        <div className="grid-2col">
                          <div className="form-group">
                            <label className="form-label">Size Guide Name</label>
                            <input
                              required
                              type="text"
                              className="form-input"
                              placeholder="e.g. Shirts Standard Guide"
                              value={guideFormName}
                              onChange={(e) => setGuideFormName(e.target.value)}
                            />
                          </div>
                          <div className="form-group">
                            <label className="form-label">Category</label>
                            <select
                              required
                              className="form-input"
                              style={{ width: '100%', height: '44px', background: '#fff', border: '1px solid #e5e7eb', borderRadius: '4px', padding: '0 12px' }}
                              value={guideFormCategory}
                              onChange={(e) => setGuideFormCategory(e.target.value)}
                            >
                              {(categories || []).map(cat => (
                                <option key={cat.id} value={cat.name}>{cat.name}</option>
                              ))}
                            </select>
                          </div>
                        </div>

                        <div className="form-group" style={{ marginBottom: '24px' }}>
                          <label className="form-label">Measurements Columns (comma-separated)</label>
                          <input
                            required
                            type="text"
                            className="form-input"
                            placeholder="e.g. Chest (in), Length (in), Sleeve (in)"
                            value={guideFormColumns}
                            onChange={(e) => setGuideFormColumns(e.target.value)}
                          />
                          <p style={{ fontSize: '11px', color: 'var(--text-muted)', marginTop: '6px' }}>
                            Editing this field will dynamically generate columns in the grid below.
                          </p>
                        </div>

                        <div style={{ marginBottom: '24px' }}>
                          <span className="form-label" style={{ marginBottom: '8px', display: 'block' }}>Load Standard Size Template</span>
                          <div style={{ display: 'flex', gap: '10px' }}>
                            <button type="button" onClick={() => handleLoadTemplate('tops')} className="secondary-btn" style={{ padding: '8px 16px', fontSize: '11px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                              👕 Clothing Tops
                            </button>
                            <button type="button" onClick={() => handleLoadTemplate('bottoms')} className="secondary-btn" style={{ padding: '8px 16px', fontSize: '11px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                              👖 Clothing Bottoms
                            </button>
                            <button type="button" onClick={() => handleLoadTemplate('shoes')} className="secondary-btn" style={{ padding: '8px 16px', fontSize: '11px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                              👟 Shoes / Footwear
                            </button>
                          </div>
                        </div>

                        <div className="form-group" style={{ marginBottom: '32px' }}>
                          <label className="form-label" style={{ marginBottom: '12px', display: 'block' }}>Size Measurements Grid</label>
                          <div className="table-container" style={{ border: '1px solid #e5e7eb', borderRadius: '4px' }}>
                            <table className="admin-table">
                              <thead>
                                <tr>
                                  <th style={{ width: '40px' }}></th>
                                  <th style={{ width: '100px' }}>Size</th>
                                  {guideFormColumns.split(',').map((c) => c.trim()).filter(Boolean).map((col, idx) => (
                                    <th key={idx}>{col}</th>
                                  ))}
                                  <th style={{ width: '60px', textAlign: 'right' }}>Action</th>
                                </tr>
                              </thead>
                              <tbody>
                                {guideFormSizes.map((size, index) => {
                                  const cols = guideFormColumns.split(',').map(c => c.trim()).filter(Boolean);
                                  return (
                                    <tr 
                                      key={size}
                                      draggable
                                      onDragStart={(e) => handleDragStart(e, index)}
                                      onDragOver={(e) => handleDragOver(e, index)}
                                      onDrop={(e) => handleDrop(e, index)}
                                      style={{ cursor: 'grab' }}
                                    >
                                      <td style={{ color: 'var(--text-muted)', fontSize: '14px', cursor: 'grab', width: '40px', paddingRight: '0', textAlign: 'center' }}>⠿</td>
                                      <td style={{ fontWeight: 'bold', fontSize: '13px' }}>{size}</td>
                                      {cols.map((_, colIndex) => (
                                        <td key={colIndex} style={{ padding: '4px' }}>
                                          <input
                                            required
                                            type="text"
                                            className="form-input"
                                            style={{ 
                                              padding: '8px 12px', 
                                              fontSize: '13px', 
                                              height: '36px',
                                              border: '1px solid transparent',
                                              background: 'transparent',
                                              margin: 0
                                            }}
                                            onFocus={(e) => { e.target.style.border = '1px solid var(--border-color)'; e.target.style.background = '#fff'; }}
                                            onBlur={(e) => { e.target.style.border = '1px solid transparent'; e.target.style.background = 'transparent'; }}
                                            placeholder="e.g. 38-40"
                                            value={guideFormSlots[size]?.[colIndex] || ''}
                                            onChange={(e) => handleSlotChange(size, colIndex, e.target.value)}
                                          />
                                        </td>
                                      ))}
                                      <td style={{ textAlign: 'right' }}>
                                        <button 
                                          type="button" 
                                          onClick={() => handleRemoveSizeRow(size)}
                                          style={{ background: 'transparent', border: 'none', color: '#ff4d4f', fontSize: '16px', cursor: 'pointer', padding: '0 8px' }}
                                        >
                                          &times;
                                        </button>
                                      </td>
                                    </tr>
                                  );
                                })}
                              </tbody>
                            </table>
                          </div>

                          {/* Row Adder */}
                          <div style={{ display: 'flex', gap: '8px', marginTop: '12px', alignItems: 'center' }}>
                            <input
                              type="text"
                              className="form-input"
                              style={{ width: '150px', height: '36px', padding: '0 10px', fontSize: '12px' }}
                              placeholder="New Size, e.g. XXL"
                              value={newSizeRowText}
                              onChange={(e) => setNewSizeRowText(e.target.value)}
                            />
                            <button 
                              type="button" 
                              onClick={handleAddSizeRow} 
                              className="secondary-btn"
                              style={{ height: '36px', padding: '0 16px', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 'bold' }}
                            >
                              + Add Row
                            </button>
                          </div>
                        </div>

                        <div style={{ display: 'flex', gap: '12px', justifyContent: 'flex-end' }}>
                          <button type="button" onClick={() => setIsEditingGuide(false)} className="secondary-btn">
                            Cancel
                          </button>
                          <button type="submit" className="primary-btn">
                            {editingGuideId ? 'Update Guide' : 'Save Size Guide'}
                          </button>
                        </div>
                      </form>
                    </div>
                  ) : (
                    <div className="table-container">
                      <table className="admin-table">
                        <thead>
                          <tr>
                            <th>Name</th>
                            <th>Category</th>
                            <th>Columns</th>
                            <th>Sizes Preview</th>
                            <th style={{ textAlign: 'right' }}>Actions</th>
                          </tr>
                        </thead>
                        <tbody>
                          {sizeGuides.map((guide) => (
                            <tr key={guide.id}>
                              <td>
                                <div style={{ fontWeight: '600' }}>{guide.name}</div>
                              </td>
                              <td>
                                <span className="status-badge" style={{ background: '#eff6ff', color: '#1d4ed8', border: '1px solid #dbeafe' }}>
                                  {guide.category}
                                </span>
                              </td>
                              <td>
                                <div style={{ fontSize: '13px', color: 'var(--text-secondary)' }}>
                                  {guide.columns.join(', ')}
                                </div>
                              </td>
                              <td style={{ maxWidth: '300px' }}>
                                <div style={{ fontSize: '12px', display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
                                  {guide.slots.slice(0, 3).map((slot, idx) => (
                                    <span key={idx} style={{ background: '#f3f4f6', padding: '2px 6px', borderRadius: '4px', color: '#374151' }}>
                                      {slot.size}: {slot.measurements[0] || '-'}
                                    </span>
                                  ))}
                                  {guide.slots.length > 3 && <span>...</span>}
                                </div>
                              </td>
                              <td>
                                <div className="actions-cell">
                                  <button onClick={() => handleStartEditGuide(guide)} className="action-link">
                                    Edit
                                  </button>
                                  <button onClick={() => handleDeleteGuide(guide.id)} className="action-link delete">
                                    Delete
                                  </button>
                                </div>
                              </td>
                            </tr>
                          ))}
                          {sizeGuides.length === 0 && (
                            <tr>
                              <td colSpan="5" style={{ fontStyle: 'italic', textAlign: 'center', padding: '24px', color: 'var(--text-muted)' }}>
                                No size guides created yet.
                              </td>
                            </tr>
                          )}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>
              )}

              {/* Tab: Blog Posts Management */}
              {activeTab === 'blog' && (
                <div>
                  <div className="section-title-wrapper" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
                    <div>
                      <h1 className="section-title">Blog & Announcements</h1>
                      <p className="section-subtitle">Manage store news, blog articles, and front-page stories</p>
                    </div>
                    <button onClick={handleStartCreatePost} className="primary-btn" style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <line x1="12" y1="5" x2="12" y2="19" />
                        <line x1="5" y1="12" x2="19" y2="12" />
                      </svg>
                      Write New Post
                    </button>
                  </div>

                  <div className="table-container">
                    <table className="admin-table">
                      <thead>
                        <tr>
                          <th>Date</th>
                          <th>Title</th>
                          <th>Author</th>
                          <th>Content Snippet</th>
                          <th style={{ textAlign: 'right' }}>Actions</th>
                        </tr>
                      </thead>
                      <tbody>
                        {posts.map((post) => (
                          <tr key={post.id}>
                            <td style={{ color: 'var(--text-muted)', fontSize: '13px' }}>
                              {new Date(post.created_at).toLocaleDateString()}
                            </td>
                            <td>
                              <div style={{ fontWeight: '600' }}>{post.title}</div>
                            </td>
                            <td>
                              <span className="status-badge" style={{ background: '#f3f4f6', color: '#1f2937', border: '1px solid #e5e7eb' }}>
                                {post.author}
                              </span>
                            </td>
                            <td style={{ maxWidth: '300px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                              <span style={{ color: 'var(--text-secondary)', fontSize: '13px' }}>{post.content}</span>
                            </td>
                            <td>
                              <div className="actions-cell">
                                <button onClick={() => handleStartEditPost(post)} className="action-link">
                                  Edit
                                </button>
                                <button onClick={() => handleDeletePost(post.id)} className="action-link delete">
                                  Delete
                                </button>
                              </div>
                            </td>
                          </tr>
                        ))}
                        {posts.length === 0 && (
                          <tr>
                            <td colSpan="5" style={{ fontStyle: 'italic', textAlign: 'center', padding: '24px', color: 'var(--text-muted)' }}>
                              No blog posts created yet.
                            </td>
                          </tr>
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}

              {/* Tab: Product Reviews Moderation */}
              {activeTab === 'reviews' && (
                <div>
                  <div className="section-title-wrapper" style={{ marginBottom: '24px' }}>
                    <div>
                      <h1 className="section-title">Product Reviews</h1>
                      <p className="section-subtitle">Approve or moderate customer ratings and product comments</p>
                    </div>
                  </div>

                  <div className="table-container">
                    <table className="admin-table">
                      <thead>
                        <tr>
                          <th>Date</th>
                          <th>Product ID</th>
                          <th>Customer</th>
                          <th>Rating</th>
                          <th>Comment</th>
                          <th>Status</th>
                          <th style={{ textAlign: 'right' }}>Actions</th>
                        </tr>
                      </thead>
                      <tbody>
                        {reviews.map((rev) => (
                          <tr key={rev.id}>
                            <td style={{ color: 'var(--text-muted)', fontSize: '13px' }}>
                              {new Date(rev.created_at).toLocaleDateString()}
                            </td>
                            <td>
                              <span className="status-badge" style={{ background: '#eff6ff', color: '#1d4ed8' }}>
                                Prod #{rev.product_id}
                              </span>
                            </td>
                            <td>
                              <div style={{ fontWeight: '600' }}>{rev.name}</div>
                              <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>{rev.email}</div>
                            </td>
                            <td>
                              <div style={{ color: '#fbbf24', fontSize: '14px', fontWeight: 'bold' }}>
                                {'★'.repeat(rev.rating)}{'☆'.repeat(5 - rev.rating)}
                              </div>
                            </td>
                            <td style={{ maxWidth: '250px', whiteSpace: 'normal', wordBreak: 'break-word' }}>
                              <span style={{ color: 'var(--text-secondary)', fontSize: '13px' }}>{rev.comment}</span>
                            </td>
                            <td>
                              {rev.approved ? (
                                <span className="status-badge status-delivered">Approved</span>
                              ) : (
                                <span className="status-badge status-shipped">Pending</span>
                              )}
                            </td>
                            <td>
                              <div className="actions-cell">
                                {!rev.approved && (
                                  <button onClick={() => handleApproveReview(rev.id)} className="action-link" style={{ color: '#16a34a' }}>
                                    Approve
                                  </button>
                                )}
                                <button onClick={() => handleOpenEditReview(rev)} className="action-link" style={{ color: '#3b82f6' }}>
                                  Edit
                                </button>
                                <button onClick={() => handleDeleteReview(rev.id)} className="action-link delete">
                                  Delete
                                </button>
                              </div>
                            </td>
                          </tr>
                        ))}
                        {reviews.length === 0 && (
                          <tr>
                            <td colSpan="7" style={{ fontStyle: 'italic', textAlign: 'center', padding: '24px', color: 'var(--text-muted)' }}>
                              No product reviews submitted yet.
                            </td>
                          </tr>
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}

              {/* Tab: Admin Activity Log */}
              {activeTab === 'activity' && (
                <div>
                  <div className="section-title-wrapper">
                    <div>
                      <h1 className="section-title">Activity Log</h1>
                      <p className="section-subtitle">Audit trail of recent admin actions across the store</p>
                    </div>
                    <button onClick={refreshActivityLog} className="secondary-btn">
                      Refresh
                    </button>
                  </div>

                  {activityLoading ? (
                    <div className="loading-container">
                      <div className="spinner"></div>
                    </div>
                  ) : (
                    <div className="table-container">
                      <table className="admin-table">
                        <thead>
                          <tr>
                            <th>Time</th>
                            <th>Admin</th>
                            <th>Action</th>
                            <th>Details</th>
                          </tr>
                        </thead>
                        <tbody>
                          {activityLog.map((entry) => (
                            <tr key={entry.id}>
                              <td>
                                <div style={{ fontSize: '12px', fontWeight: '600' }}>{new Date(entry.created_at).toLocaleTimeString()}</div>
                                <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>{new Date(entry.created_at).toLocaleDateString()}</div>
                              </td>
                              <td>
                                <div style={{ fontWeight: '600', fontSize: '13px' }}>{entry.actor_name}</div>
                              </td>
                              <td>
                                <span className="category-tag">{entry.action}</span>
                              </td>
                              <td>
                                <div style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>{entry.detail}</div>
                              </td>
                            </tr>
                          ))}
                          {activityLog.length === 0 && (
                            <tr>
                              <td colSpan="4" style={{ fontStyle: 'italic', textAlign: 'center', padding: '24px', color: 'var(--text-muted)' }}>
                                No admin activity recorded yet. Actions like product edits, order updates and coupon changes will appear here.
                              </td>
                            </tr>
                          )}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>
              )}

              {/* Tab: Site Settings Panel */}
              {activeTab === 'settings' && (
                <div>
                  <div className="section-title-wrapper" style={{ marginBottom: '24px' }}>
                    <div>
                      <h1 className="section-title">Site Settings & Advanced Controls</h1>
                      <p className="section-subtitle">Manage brand details, homepage hero section, contact information, and store status</p>
                    </div>
                  </div>

                  <div style={{ display: 'flex', gap: '16px', marginBottom: '24px', borderBottom: '1px solid #e5e7eb', paddingBottom: '8px' }}>
                    <button 
                      type="button" 
                      onClick={() => setSettingsSubTab('general')} 
                      style={{
                        background: 'none',
                        border: 'none',
                        borderBottom: settingsSubTab === 'general' ? '2px solid var(--text-primary)' : '2px solid transparent',
                        padding: '8px 16px',
                        cursor: 'pointer',
                        fontWeight: 'bold',
                        color: settingsSubTab === 'general' ? 'var(--text-primary)' : 'var(--text-muted)'
                      }}
                    >
                      General Settings
                    </button>
                    <button 
                      type="button" 
                      onClick={() => { setSettingsSubTab('media'); loadMediaItems(); }} 
                      style={{
                        background: 'none',
                        border: 'none',
                        borderBottom: settingsSubTab === 'media' ? '2px solid var(--text-primary)' : '2px solid transparent',
                        padding: '8px 16px',
                        cursor: 'pointer',
                        fontWeight: 'bold',
                        color: settingsSubTab === 'media' ? 'var(--text-primary)' : 'var(--text-muted)'
                      }}
                    >
                      Media Library
                    </button>
                  </div>

                  {settingsSubTab === 'general' ? (
                    <form onSubmit={handleSettingsSubmit} className="card" style={{ padding: '32px', background: '#fff', border: '1px solid #e5e7eb', borderRadius: '8px' }}>
                    <h2 style={{ fontSize: '16px', fontWeight: 'bold', marginBottom: '20px', borderBottom: '1px solid #f3f4f6', paddingBottom: '10px' }}>General Branding</h2>
                    
                    <div className="grid-3col">
                      <div className="form-group">
                        <label className="form-label">Store Name</label>
                        <input
                          required
                          type="text"
                          className="form-input"
                          value={siteSettings.site_name}
                          onChange={(e) => setSiteSettings({ ...siteSettings, site_name: e.target.value })}
                        />
                      </div>
                      <div className="form-group">
                        <label className="form-label">Header Announcement Banner</label>
                        <input
                          type="text"
                          className="form-input"
                          value={siteSettings.announcement_banner}
                          placeholder="e.g. Free worldwide shipping over $150"
                          onChange={(e) => setSiteSettings({ ...siteSettings, announcement_banner: e.target.value })}
                        />
                      </div>
                      <div className="form-group">
                        <label className="form-label">Branding Star Color</label>
                        <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
                          <input
                            type="color"
                            style={{
                              width: '40px',
                              height: '38px',
                              padding: '0',
                              border: '1px solid #d1d5db',
                              borderRadius: '4px',
                              cursor: 'pointer',
                              backgroundColor: 'transparent'
                            }}
                            value={siteSettings.star_color || '#fbbf24'}
                            onChange={(e) => setSiteSettings({ ...siteSettings, star_color: e.target.value })}
                          />
                          <input
                            type="text"
                            className="form-input"
                            style={{ flex: 1, fontFamily: 'monospace' }}
                            placeholder="#fbbf24"
                            value={siteSettings.star_color || '#fbbf24'}
                            onChange={(e) => setSiteSettings({ ...siteSettings, star_color: e.target.value })}
                          />
                        </div>
                      </div>
                    </div>

                    <h2 style={{ fontSize: '16px', fontWeight: 'bold', marginBottom: '20px', marginTop: '32px', borderBottom: '1px solid #f3f4f6', paddingBottom: '10px' }}>Homepage Hero Section</h2>
                    <div className="form-group" style={{ marginBottom: '20px' }}>
                      <label className="form-label">Hero Banner Image URL</label>
                      <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
                        <input
                          required
                          type="text"
                          className="form-input"
                          style={{ flex: 1 }}
                          value={siteSettings.hero_image}
                          onChange={(e) => setSiteSettings({ ...siteSettings, hero_image: e.target.value })}
                        />
                        <button
                          type="button"
                          className="secondary-btn"
                          style={{ height: '44px', fontWeight: 'bold', margin: 0, padding: '10px 16px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                          onClick={() => handleOpenMediaPicker((selectedUrl) => {
                            setSiteSettings(prev => ({ ...prev, hero_image: selectedUrl }));
                          })}
                        >
                          Choose from Library
                        </button>
                        <div style={{ position: 'relative' }}>
                          <input
                            type="file"
                            accept="image/*"
                            id="hero-image-file"
                            style={{ display: 'none' }}
                            onChange={handleHeroImageUpload}
                          />
                          <label
                            htmlFor="hero-image-file"
                            className="secondary-btn"
                            style={{
                              margin: 0,
                              padding: '10px 16px',
                              height: '44px',
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              cursor: 'pointer',
                              fontWeight: 'bold',
                              border: '1px solid var(--border-color)',
                              background: 'var(--bg-secondary)'
                            }}
                          >
                            {heroImageUploadLoading ? 'Uploading...' : 'Upload File'}
                          </label>
                        </div>
                      </div>
                    </div>

                    <div className="grid-2col">
                      <div className="form-group">
                        <label className="form-label">Hero Title Banner</label>
                        <input
                          required
                          type="text"
                          className="form-input"
                          value={siteSettings.hero_title}
                          onChange={(e) => setSiteSettings({ ...siteSettings, hero_title: e.target.value })}
                        />
                      </div>
                      <div className="form-group">
                        <label className="form-label">Hero Tagline</label>
                        <textarea
                          required
                          className="form-input"
                          style={{ height: '80px', padding: '10px 12px' }}
                          value={siteSettings.hero_tagline}
                          onChange={(e) => setSiteSettings({ ...siteSettings, hero_tagline: e.target.value })}
                        />
                      </div>
                    </div>

                    <h2 style={{ fontSize: '16px', fontWeight: 'bold', marginBottom: '20px', marginTop: '32px', borderBottom: '1px solid #f3f4f6', paddingBottom: '10px' }}>Contact Details & Social Media Links</h2>
                    
                    <div className="grid-2col">
                      <div className="form-group">
                        <label className="form-label">Support Email Address</label>
                        <input
                          required
                          type="email"
                          className="form-input"
                          placeholder="support@uclose.com"
                          value={siteSettings.contact_email}
                          onChange={(e) => setSiteSettings({ ...siteSettings, contact_email: e.target.value })}
                        />
                      </div>
                      <div className="form-group">
                        <label className="form-label">Support Phone Number</label>
                        <input
                          required
                          type="text"
                          className="form-input"
                          placeholder="+1 (555) 019-2834"
                          value={siteSettings.contact_phone}
                          onChange={(e) => setSiteSettings({ ...siteSettings, contact_phone: e.target.value })}
                        />
                      </div>
                    </div>

                    <div className="grid-2col">
                      <div className="form-group">
                        <label className="form-label">Instagram Profile Link</label>
                        <input
                          type="text"
                          className="form-input"
                          placeholder="https://instagram.com/uclose"
                          value={siteSettings.social_instagram}
                          onChange={(e) => setSiteSettings({ ...siteSettings, social_instagram: e.target.value })}
                        />
                      </div>
                      <div className="form-group">
                        <label className="form-label">Facebook Profile Link</label>
                        <input
                          type="text"
                          className="form-input"
                          placeholder="https://facebook.com/uclose"
                          value={siteSettings.social_facebook}
                          onChange={(e) => setSiteSettings({ ...siteSettings, social_facebook: e.target.value })}
                        />
                      </div>
                    </div>

                    <h2 style={{ fontSize: '16px', fontWeight: 'bold', marginBottom: '20px', marginTop: '32px', borderBottom: '1px solid #f3f4f6', paddingBottom: '10px', color: '#b91c1c' }}>System Controls</h2>
                    
                    <div className="form-group" style={{ marginBottom: '32px', display: 'flex', alignItems: 'center', gap: '12px', background: '#fef2f2', padding: '16px', borderRadius: '4px', border: '1px solid #fee2e2' }}>
                      <input
                        type="checkbox"
                        id="maintenance_mode"
                        style={{ width: '20px', height: '20px', cursor: 'pointer' }}
                        checked={siteSettings.maintenance_mode === 'true' || siteSettings.maintenance_mode === '1'}
                        onChange={(e) => setSiteSettings({ ...siteSettings, maintenance_mode: e.target.checked ? 'true' : 'false' })}
                      />
                      <div>
                        <label htmlFor="maintenance_mode" style={{ fontWeight: 'bold', color: '#991b1b', cursor: 'pointer', display: 'block', fontSize: '14px' }}>
                          Enable Store Maintenance Mode
                        </label>
                        <span style={{ fontSize: '11px', color: '#b91c1c' }}>
                          If enabled, customer-facing pages are blocked and display a splash maintenance page. Admin panel access is preserved.
                        </span>
                      </div>
                    </div>

                    <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
                      <button type="submit" disabled={settingsSaving} className="primary-btn" style={{ minWidth: '150px' }}>
                        {settingsSaving ? 'Saving Settings...' : 'Save Site Settings'}
                      </button>
                    </div>
                  </form>
                  ) : (
                    <div className="card" style={{ padding: '32px', background: '#fff', border: '1px solid #e5e7eb', borderRadius: '8px' }}>
                      <style>{`
                        .media-card:hover .media-actions-overlay {
                          opacity: 1 !important;
                        }
                        .media-card:hover .media-thumb {
                          transform: scale(1.04);
                        }
                      `}</style>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px', flexWrap: 'wrap', gap: '16px' }}>
                        <div>
                          <h2 style={{ fontSize: '16px', fontWeight: 'bold', margin: 0 }}>Media Library & Assets</h2>
                          <p style={{ fontSize: '11px', color: 'var(--text-muted)', margin: '4px 0 0 0' }}>Upload, preview, copy URLs, or delete your brand and product images.</p>
                        </div>
                        
                        <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
                          {selectedMediaFiles.length > 0 && (
                            <button 
                              type="button" 
                              onClick={handleBulkDeleteMedia} 
                              className="secondary-btn"
                              style={{ borderColor: '#ff4d4f', color: '#ff4d4f', fontWeight: 'bold' }}
                            >
                              Delete Selected ({selectedMediaFiles.length})
                            </button>
                          )}
                          <input
                            type="file"
                            accept="image/*"
                            id="settings-media-upload"
                            style={{ display: 'none' }}
                            onChange={handleMediaUpload}
                            multiple
                          />
                          <label
                            htmlFor="settings-media-upload"
                            className="primary-btn"
                            style={{ cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '8px', margin: 0 }}
                          >
                            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                              <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                              <polyline points="17 8 12 3 7 8" />
                              <line x1="12" y1="3" x2="12" y2="15" />
                            </svg>
                            {mediaUploadLoading ? 'Uploading...' : 'Upload Files'}
                          </label>
                        </div>
                      </div>

                      {mediaLoading ? (
                        <div className="loading-container">
                          <div className="spinner"></div>
                        </div>
                      ) : (
                        <>
                          <div style={{
                            display: 'grid',
                            gridTemplateColumns: 'repeat(auto-fill, minmax(160px, 1fr))',
                            gap: '20px'
                          }}>
                            {mediaList.map((item, idx) => {
                              const isSelected = selectedMediaFiles.includes(item.filename);
                              const fileUrl = getImageUrl(`/uploads/${item.filename}`);
                              return (
                                <div 
                                  key={idx}
                                  style={{
                                    position: 'relative',
                                    background: 'rgba(255, 255, 255, 0.4)',
                                    backdropFilter: 'blur(10px)',
                                    border: isSelected ? '2px solid var(--text-primary)' : '1px solid var(--border-color)',
                                    padding: '8px',
                                    display: 'flex',
                                    flexDirection: 'column',
                                    gap: '8px',
                                    transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
                                    boxShadow: isSelected ? '0 12px 24px rgba(0,0,0,0.08)' : '0 4px 12px rgba(0,0,0,0.02)'
                                  }}
                                  className="media-card"
                                >
                                  <div style={{ position: 'relative', aspectRatio: '1', overflow: 'hidden', background: '#f9fafb', borderRadius: '4px' }}>
                                    <img 
                                      src={fileUrl} 
                                      alt={item.filename}
                                      style={{ width: '100%', height: '100%', objectFit: 'cover', transition: 'transform 0.3s' }}
                                      className="media-thumb"
                                    />
                                    
                                    {/* Selection Checkbox */}
                                    <div style={{ position: 'absolute', top: '8px', left: '8px', zIndex: 10 }}>
                                      <input 
                                        type="checkbox" 
                                        checked={isSelected}
                                        onChange={() => handleToggleMediaSelect(item.filename)}
                                        style={{ width: '18px', height: '18px', cursor: 'pointer', accentColor: '#000' }}
                                      />
                                    </div>

                                    {/* Action Buttons overlay */}
                                    <div 
                                      style={{ 
                                        position: 'absolute', 
                                        top: 0, left: 0, right: 0, bottom: 0, 
                                        background: 'rgba(0,0,0,0.45)', 
                                        display: 'flex', 
                                        alignItems: 'center', 
                                        justifyContent: 'center', 
                                        gap: '8px',
                                        opacity: 0,
                                        transition: 'opacity 0.2s'
                                      }}
                                      className="media-actions-overlay"
                                    >
                                      <button 
                                        type="button"
                                        onClick={() => handleCopyUrl(item.filename)}
                                        className="primary-btn"
                                        style={{ padding: '6px 12px', fontSize: '10px', background: '#fff', color: '#000', border: 'none' }}
                                      >
                                        Copy Link
                                      </button>
                                      <button 
                                        type="button"
                                        onClick={() => {
                                          if (window.confirm('Delete this image?')) {
                                            api.deleteMedia(item.filename).then(() => {
                                              alert('File deleted.');
                                              loadMediaItems();
                                            }).catch(err => alert(err.message));
                                          }
                                        }}
                                        className="primary-btn"
                                        style={{ padding: '6px 12px', fontSize: '10px', background: '#ff4d4f', color: '#fff', border: 'none' }}
                                      >
                                        Delete
                                      </button>
                                    </div>
                                  </div>
                                  <div style={{ display: 'flex', flexDirection: 'column', gap: '2px', padding: '0 4px' }}>
                                    <div style={{ fontSize: '11px', fontWeight: 'bold', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                                      {item.filename}
                                    </div>
                                    <div style={{ fontSize: '9px', color: 'var(--text-muted)' }}>
                                      {(item.size / 1024).toFixed(1)} KB • {new Date(item.created).toLocaleDateString()}
                                    </div>
                                  </div>
                                </div>
                              );
                            })}
                          </div>
                          {mediaList.length === 0 && (
                            <div style={{ textAlign: 'center', color: 'var(--text-muted)', fontSize: '13px', padding: '60px 0', border: '1px dashed var(--border-color)' }}>
                              No media files uploaded yet. Select files to upload.
                            </div>
                          )}
                        </>
                      )}
                    </div>
                  )}
                </div>
              )}

              {/* Tab: Admin Profile settings */}
              {activeTab === 'profile' && (
                <div>
                  <div className="section-title-wrapper" style={{ marginBottom: '24px' }}>
                    <div>
                      <h1 className="section-title">Admin Profile Settings</h1>
                      <p className="section-subtitle">Update your personal account details and upload a display picture</p>
                    </div>
                  </div>

                  <form onSubmit={handleProfileSubmit} className="card" style={{ padding: '32px', background: '#fff', border: '1px solid #e5e7eb', borderRadius: '8px', maxWidth: '600px' }}>
                    {/* Avatar Preview & Upload Area */}
                    <div style={{ display: 'flex', alignItems: 'center', gap: '24px', marginBottom: '32px', padding: '20px', background: 'var(--bg-secondary)', border: '1px solid var(--border-color)', borderRadius: '4px' }}>
                      <div style={{ position: 'relative', width: '80px', height: '80px', borderRadius: '50%', overflow: 'hidden', border: '2px solid var(--border-color)', flexShrink: 0 }}>
                        <img
                          src={getImageUrl(profileForm.dp) || `https://api.dicebear.com/7.x/initials/svg?seed=${encodeURIComponent(profileForm.name || 'Admin')}`}
                          alt="Admin Avatar"
                          style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                          onError={(e) => {
                            e.target.src = `https://api.dicebear.com/7.x/initials/svg?seed=${encodeURIComponent(profileForm.name || 'Admin')}`;
                          }}
                        />
                      </div>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                        <h4 style={{ margin: 0, fontWeight: 'bold', fontSize: '14px' }}>Profile Picture / Avatar</h4>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                          <input
                            type="file"
                            accept="image/*"
                            id="admin-avatar-file"
                            style={{ display: 'none' }}
                            onChange={handleAdminAvatarUpload}
                          />
                          <label
                            htmlFor="admin-avatar-file"
                            className="secondary-btn"
                            style={{
                              margin: 0,
                              padding: '8px 16px',
                              cursor: 'pointer',
                              fontWeight: 'bold',
                              border: '1px solid var(--border-color)',
                              background: '#fff'
                            }}
                          >
                            {profileUploadLoading ? 'Uploading...' : 'Choose Image File'}
                          </label>
                          {profileForm.dp && (
                            <button
                              type="button"
                              onClick={() => setProfileForm(prev => ({ ...prev, dp: '' }))}
                              style={{ background: 'transparent', border: 'none', color: '#dc2626', fontSize: '11px', cursor: 'pointer', fontWeight: 'bold' }}
                            >
                              Reset
                            </button>
                          )}
                        </div>
                        <span style={{ fontSize: '10px', color: 'var(--text-muted)' }}>Supported formats: JPG, PNG, GIF, WEBP. Max 5MB.</span>
                      </div>
                    </div>

                    <div className="form-group" style={{ marginBottom: '20px' }}>
                      <label className="form-label">Full Name</label>
                      <input
                        required
                        type="text"
                        className="form-input"
                        placeholder="Admin Name"
                        value={profileForm.name}
                        onChange={(e) => setProfileForm({ ...profileForm, name: e.target.value })}
                        disabled={profileSaving}
                      />
                    </div>

                    <div className="form-group" style={{ marginBottom: '20px' }}>
                      <label className="form-label">Phone Number</label>
                      <input
                        type="tel"
                        className="form-input"
                        placeholder="+91 98765 43210"
                        value={profileForm.phone}
                        onChange={(e) => setProfileForm({ ...profileForm, phone: e.target.value })}
                        disabled={profileSaving}
                      />
                    </div>

                    <div className="form-group" style={{ marginBottom: '20px', opacity: 0.7 }}>
                      <label className="form-label">Email Address (Read-only)</label>
                      <input
                        type="email"
                        className="form-input"
                        value={user?.email || ''}
                        readOnly
                        style={{ cursor: 'not-allowed', background: 'var(--bg-secondary)' }}
                      />
                    </div>

                    <div className="form-group" style={{ marginBottom: '32px' }}>
                      <label className="form-label">Profile Picture URL (Optional)</label>
                      <input
                        type="text"
                        className="form-input"
                        placeholder="https://example.com/avatar.png"
                        value={profileForm.dp}
                        onChange={(e) => setProfileForm({ ...profileForm, dp: e.target.value })}
                        disabled={profileSaving}
                      />
                    </div>

                    <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
                      <button type="submit" disabled={profileSaving || profileUploadLoading} className="primary-btn" style={{ minWidth: '150px' }}>
                        {profileSaving ? 'Saving Profile...' : 'Save Profile Details'}
                      </button>
                    </div>
                  </form>

                  {/* Security: Change Password */}
                  <form onSubmit={handleChangePassword} className="card" style={{ padding: '32px', background: '#fff', border: '1px solid #e5e7eb', borderRadius: '8px', maxWidth: '600px', marginTop: '24px' }}>
                    <h3 style={{ margin: '0 0 4px 0', fontSize: '16px', fontWeight: '700' }}>Change Password</h3>
                    <p style={{ margin: '0 0 24px 0', fontSize: '12px', color: 'var(--text-secondary)' }}>Update the password you use to sign in to the admin panel.</p>

                    <div className="form-group" style={{ marginBottom: '20px' }}>
                      <label className="form-label">Current Password</label>
                      <input
                        required
                        type="password"
                        className="form-input"
                        placeholder="Enter your current password"
                        autoComplete="current-password"
                        value={passwordForm.current}
                        onChange={(e) => setPasswordForm({ ...passwordForm, current: e.target.value })}
                        disabled={passwordSaving}
                      />
                    </div>

                    <div className="form-group" style={{ marginBottom: '20px' }}>
                      <label className="form-label">New Password (min 6 characters)</label>
                      <input
                        required
                        type="password"
                        minLength={6}
                        className="form-input"
                        placeholder="Enter a new password"
                        autoComplete="new-password"
                        value={passwordForm.next}
                        onChange={(e) => setPasswordForm({ ...passwordForm, next: e.target.value })}
                        disabled={passwordSaving}
                      />
                    </div>

                    <div className="form-group" style={{ marginBottom: '32px' }}>
                      <label className="form-label">Confirm New Password</label>
                      <input
                        required
                        type="password"
                        minLength={6}
                        className="form-input"
                        placeholder="Re-enter the new password"
                        autoComplete="new-password"
                        value={passwordForm.confirm}
                        onChange={(e) => setPasswordForm({ ...passwordForm, confirm: e.target.value })}
                        disabled={passwordSaving}
                      />
                    </div>

                    <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
                      <button type="submit" disabled={passwordSaving} className="primary-btn" style={{ minWidth: '150px' }}>
                        {passwordSaving ? 'Updating...' : 'Update Password'}
                      </button>
                    </div>
                  </form>
                </div>
              )}
            </>
          )}
        </main>
      </div>

      {/* Footer */}
      <footer className="admin-footer hide-print" style={{ padding: '32px 48px' }}>
        <div className="footer-container" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '16px' }}>
          <div className="footer-brand-section">
            <h2 className="footer-logo" style={{ fontSize: '24px', margin: 0, letterSpacing: '-1px' }}>
              Uclose Co.
            </h2>
          </div>
          <div className="footer-bottom" style={{ border: 'none', paddingTop: 0, marginTop: 0 }}>
            <p className="copyright" style={{ margin: 0 }}>© 2026 Uclose Co. Crafted in India.</p>
          </div>
        </div>
      </footer>

      {/* Modal: Add/Edit Product */}
      {showProductModal && (
        <div className="modal-overlay">
          <div className="modal-card">
            <div className="modal-header">
              <h2 className="modal-title">{editingProduct ? 'Edit Product' : 'Add New Product'}</h2>
              <button onClick={() => setShowProductModal(false)} className="modal-close">
                &times;
              </button>
            </div>
            <div className="modal-body">
              <form onSubmit={handleProductSubmit}>
                <div className="grid-2col">
                  <div className="form-group">
                    <label className="form-label">Product Name</label>
                    <input
                      required
                      type="text"
                      className="form-input"
                      placeholder="e.g. Minimalist Linen Shirt"
                      value={productForm.name}
                      onChange={(e) => setProductForm({ ...productForm, name: e.target.value })}
                    />
                  </div>
                  <div className="form-group">
                    <label className="form-label">Price (USD)</label>
                    <input
                      required
                      type="number"
                      step="0.01"
                      className="form-input"
                      placeholder="e.g. 79.99"
                      value={productForm.price}
                      onChange={(e) => setProductForm({ ...productForm, price: e.target.value })}
                    />
                  </div>
                </div>

                <div className="grid-2col">
                  <div className="form-group">
                    <label className="form-label">Category</label>
                    <select
                      className="form-input"
                      value={productForm.category}
                      onChange={(e) => setProductForm({ ...productForm, category: e.target.value })}
                      style={{ cursor: 'pointer' }}
                    >
                      {(categories || []).map((cat) => (
                        <option key={cat.id} value={cat.name}>{cat.name}</option>
                      ))}
                    </select>
                  </div>
                  <div className="form-group">
                    <label className="form-label">Stock Level (Inventory Count)</label>
                    <input
                      required
                      type="number"
                      min="0"
                      className="form-input"
                      placeholder="e.g. 50"
                      value={productForm.stock}
                      onChange={(e) => setProductForm({ ...productForm, stock: parseInt(e.target.value) || 0 })}
                    />
                  </div>
                </div>

                {/* Multiple Image Upload Section */}
                <div className="form-group" style={{ marginBottom: '20px' }}>
                  <label className="form-label">Product Images (Multiple)</label>
                  <div style={{ display: 'flex', gap: '12px', alignItems: 'center', marginBottom: '12px' }}>
                    <input
                      type="file"
                      accept="image/*"
                      multiple
                      onChange={handleImageUpload}
                      className="form-input"
                      style={{ flex: 1, padding: '10px' }}
                    />
                    {uploadingImage && <div className="spinner" style={{ width: '20px', height: '20px' }}></div>}
                  </div>
                  
                  <div style={{ display: 'flex', gap: '8px', marginBottom: '16px' }}>
                    <input
                      type="url"
                      className="form-input"
                      placeholder="Or paste manual image URL..."
                      style={{ flex: 1 }}
                      value={manualImageUrl}
                      onChange={(e) => setManualImageUrl(e.target.value)}
                    />
                    <button
                      type="button"
                      className="secondary-btn"
                      style={{ padding: '10px 16px', fontWeight: 'bold' }}
                      onClick={() => {
                        handleOpenMediaPicker((selectedUrl) => {
                          setProductForm(prev => {
                            const newImages = [...(prev.images || []), selectedUrl];
                            return {
                              ...prev,
                              images: newImages,
                              image: prev.image || newImages[0] || ''
                            };
                          });
                        });
                      }}
                    >
                      Choose from Library
                    </button>
                    <button
                      type="button"
                      className="secondary-btn"
                      style={{ padding: '10px 16px' }}
                      onClick={() => {
                        if (!manualImageUrl) return;
                        setProductForm(prev => {
                          const newImages = [...(prev.images || []), manualImageUrl];
                          return {
                            ...prev,
                            images: newImages,
                            image: prev.image || newImages[0] || ''
                          };
                        });
                        setManualImageUrl('');
                      }}
                    >
                      Add URL
                    </button>
                  </div>

                  {productForm.images && productForm.images.length > 0 && (
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(80px, 1fr))', gap: '12px', background: 'var(--bg-tertiary)', border: '1px solid var(--border-color)', padding: '12px' }}>
                      {productForm.images.map((imgUrl, idx) => {
                        const isPrimary = productForm.image === imgUrl;
                        return (
                          <div 
                            key={idx} 
                            style={{ position: 'relative', aspectRatio: '1', border: isPrimary ? '2px solid var(--text-primary)' : '1px solid var(--border-color)', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#fff', cursor: 'pointer' }}
                            onClick={() => setProductForm(prev => ({ ...prev, image: imgUrl }))}
                          >
                            <img src={getImageUrl(imgUrl)} alt="Thumbnail" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                            {isPrimary && (
                              <div style={{ position: 'absolute', bottom: '0', left: '0', right: '0', background: 'var(--text-primary)', color: '#fff', fontSize: '8px', fontWeight: 'bold', textTransform: 'uppercase', textAlign: 'center', padding: '2px 0' }}>
                                Primary
                              </div>
                            )}
                            <button
                              type="button"
                              style={{ position: 'absolute', top: '2px', right: '2px', width: '16px', height: '16px', background: 'rgba(239, 68, 68, 0.9)', color: '#fff', border: 'none', borderRadius: '50%', fontSize: '10px', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', zIndex: 10 }}
                              onClick={(e) => {
                                e.stopPropagation();
                                setProductForm(prev => {
                                  const filtered = prev.images.filter(img => img !== imgUrl);
                                  let nextPrimary = prev.image;
                                  if (isPrimary) {
                                    nextPrimary = filtered[0] || '';
                                  }
                                  return {
                                    ...prev,
                                    images: filtered,
                                    image: nextPrimary
                                  };
                                });
                              }}
                            >
                              &times;
                            </button>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>

                <div className="form-group" style={{ marginBottom: '20px' }}>
                  <label className="form-label">Description</label>
                  <textarea
                    rows="3"
                    className="form-input"
                    placeholder="Describe product details, fit, material etc."
                    value={productForm.description}
                    onChange={(e) => setProductForm({ ...productForm, description: e.target.value })}
                  />
                </div>

                <div className="form-group" style={{ marginBottom: '20px' }}>
                  <label className="form-label">Product Features (One per line)</label>
                  <textarea
                    rows="3"
                    className="form-input"
                    placeholder="100% Organic Cotton&#10;Mother-of-pearl buttons&#10;Relaxed fit"
                    value={productForm.details}
                    onChange={(e) => setProductForm({ ...productForm, details: e.target.value })}
                  />
                </div>

                <div className="form-group" style={{ marginBottom: '20px' }}>
                  <label className="form-label">Available Sizes (comma-separated)</label>
                  <input
                    type="text"
                    className="form-input"
                    placeholder="e.g. S, M, L, XL, XXL"
                    value={productForm.sizes}
                    onChange={(e) => setProductForm({ ...productForm, sizes: e.target.value })}
                  />
                  <p style={{ fontSize: '11px', color: 'var(--text-muted)', marginTop: '4px' }}>
                    Comma-separated sizes (e.g. S, M, L, XL, XXL). Defaults to standard sizes if blank.
                  </p>
                </div>

                <div className="form-group" style={{ marginBottom: '20px' }}>
                  <label className="form-label">Care Instructions</label>
                  <input
                    type="text"
                    className="form-input"
                    placeholder="e.g. Machine wash cold, hang dry"
                    value={productForm.care}
                    onChange={(e) => setProductForm({ ...productForm, care: e.target.value })}
                  />
                </div>

                <div className="modal-footer">
                  <button type="button" onClick={() => setShowProductModal(false)} className="secondary-btn">
                    Cancel
                  </button>
                  <button type="submit" className="primary-btn">
                    {editingProduct ? 'Save Changes' : 'Create Product'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}
      {/* Modal: Order Details Invoice */}
      {selectedOrder && (
        <div className="modal-overlay print-modal-overlay">
          <div className="modal-card print-invoice-card" style={{ maxWidth: '640px' }}>
            <div className="modal-header hide-print">
              <h2 className="modal-title">Invoice Details</h2>
              <button onClick={() => setSelectedOrder(null)} className="modal-close">
                &times;
              </button>
            </div>
            
            <div className="modal-body print-invoice-body" style={{ padding: '36px' }}>
              {/* Invoice Brand header */}
              <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '2px solid #000', paddingBottom: '24px', marginBottom: '24px' }}>
                <div>
                  <h1 style={{ fontSize: '28px', fontWeight: '800', letterSpacing: '-1.5px', textTransform: 'uppercase', margin: 0 }}>Uclose.</h1>
                  <span style={{ fontSize: '9px', fontWeight: '700', letterSpacing: '2px', textTransform: 'uppercase', color: 'var(--text-muted)' }}>Store Invoice Receipt</span>
                </div>
                <div style={{ textAlign: 'right' }}>
                  <div style={{ fontWeight: '700', fontSize: '12px' }}>ORDER ID: #{selectedOrder.id}</div>
                  <div style={{ fontSize: '11px', color: 'var(--text-secondary)', marginTop: '4px' }}>Date: {new Date(selectedOrder.date).toLocaleDateString()}</div>
                  <div style={{ marginTop: '8px' }}>
                    <span className={`status-badge status-${selectedOrder.status}`} style={{ fontSize: '9px' }}>{selectedOrder.status}</span>
                  </div>
                </div>
              </div>

              {/* Billing vs Shipping details grid */}
              <div className="grid-2col" style={{ marginBottom: '32px', fontSize: '12px' }}>
                <div>
                  <div style={{ fontSize: '9px', fontWeight: '700', textTransform: 'uppercase', letterSpacing: '1px', color: 'var(--text-muted)', marginBottom: '6px' }}>Bill To (Buyer)</div>
                  <div style={{ fontWeight: '600' }}>{selectedOrder.shippingDetails?.name}</div>
                  <div style={{ color: 'var(--text-secondary)' }}>{selectedOrder.shippingDetails?.email}</div>
                  <div style={{ color: 'var(--text-secondary)' }}>{selectedOrder.shippingDetails?.phone}</div>
                </div>
                <div>
                  <div style={{ fontSize: '9px', fontWeight: '700', textTransform: 'uppercase', letterSpacing: '1px', color: 'var(--text-muted)', marginBottom: '6px' }}>Ship To Address</div>
                  <div style={{ color: 'var(--text-secondary)', lineHeight: '1.4' }}>{selectedOrder.shippingDetails?.address}</div>
                </div>
              </div>

              {/* Invoice Items list */}
              <div style={{ marginBottom: '32px' }}>
                <div style={{ fontSize: '9px', fontWeight: '700', textTransform: 'uppercase', letterSpacing: '1px', color: 'var(--text-muted)', borderBottom: '1px solid var(--border-color)', paddingBottom: '8px', marginBottom: '12px' }}>Purchased Items</div>
                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px' }}>
                  <thead>
                    <tr style={{ borderBottom: '1px solid var(--border-color)', fontSize: '10px', textTransform: 'uppercase', color: 'var(--text-muted)' }}>
                      <th style={{ textAlign: 'left', paddingBottom: '8px' }}>Item</th>
                      <th style={{ textAlign: 'center', paddingBottom: '8px' }}>Qty</th>
                      <th style={{ textAlign: 'right', paddingBottom: '8px' }}>Price</th>
                    </tr>
                  </thead>
                  <tbody>
                    {selectedOrder.items?.map((item, idx) => (
                      <tr key={idx} style={{ borderBottom: '1px solid #f9fafb' }}>
                        <td style={{ padding: '10px 0', display: 'flex', alignItems: 'center', gap: '8px' }}>
                          {item.image && <img src={getImageUrl(item.image)} alt="" className="hide-print" style={{ width: '28px', height: '34px', objectFit: 'cover' }} />}
                          <div>
                            <div style={{ fontWeight: '700', fontSize: '11px', textTransform: 'uppercase' }}>{item.name}</div>
                            <span style={{ fontSize: '9px', color: 'var(--text-muted)' }}>Size: {item.size || 'M'}</span>
                          </div>
                        </td>
                        <td style={{ padding: '10px 0', textAlign: 'center', color: 'var(--text-secondary)' }}>x{item.quantity}</td>
                        <td style={{ padding: '10px 0', textAlign: 'right', fontWeight: '700' }}>${(item.price * item.quantity).toFixed(2)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Total Invoice amount block */}
              {(() => {
                const subtotal = selectedOrder.items?.reduce((sum, item) => sum + (item.price * item.quantity), 0) || 0;
                const discount = selectedOrder.discount || 0;
                const promoCode = selectedOrder.promoCode;
                const totalPaid = parseFloat(selectedOrder.total || 0);
                const tax = (subtotal - discount) * 0.10; // 10% tax included in grand total
                const calculatedShipping = Math.max(0, totalPaid - (subtotal - discount));

                return (
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', borderTop: '2px solid #000', paddingTop: '16px', marginTop: '24px' }}>
                    {/* Barcode on the bottom left of invoice */}
                    <div>
                      {renderBarcode(selectedOrder.id)}
                    </div>

                    <div style={{ textAlign: 'right', width: '220px' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '11px', color: 'var(--text-secondary)', marginBottom: '6px' }}>
                        <span>Subtotal</span>
                        <span>${subtotal.toFixed(2)}</span>
                      </div>
                      {discount > 0 && (
                        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '11px', color: '#dc2626', marginBottom: '6px' }}>
                          <span>Discount {promoCode ? `(${promoCode})` : ''}</span>
                          <span>- ${discount.toFixed(2)}</span>
                        </div>
                      )}
                      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '11px', color: 'var(--text-secondary)', marginBottom: '6px' }}>
                        <span>Estimated Tax (10% VAT Incl.)</span>
                        <span>${tax.toFixed(2)}</span>
                      </div>
                      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '11px', color: 'var(--text-secondary)', marginBottom: '8px' }}>
                        <span>Shipping</span>
                        <span>{calculatedShipping > 0 ? `$${calculatedShipping.toFixed(2)}` : 'Free'}</span>
                      </div>
                      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '15px', fontWeight: '800', borderTop: '1px solid var(--border-color)', paddingTop: '8px', marginTop: '8px', color: '#000' }}>
                        <span>Grand Total</span>
                        <span>${totalPaid.toFixed(2)}</span>
                      </div>
                    </div>
                  </div>
                );
              })()}
            </div>

            {/* Internal admin notes (not printed, never shown to customer) */}
            <div className="hide-print" style={{ padding: '0 36px 24px' }}>
              <div style={{ fontSize: '9px', fontWeight: '700', textTransform: 'uppercase', letterSpacing: '1px', color: 'var(--text-muted)', borderBottom: '1px solid var(--border-color)', paddingBottom: '8px', marginBottom: '12px' }}>
                Internal Notes (Admin Only)
              </div>
              <textarea
                className="form-input"
                style={{ width: '100%', height: '80px', padding: '10px 12px', resize: 'vertical', fontSize: '12px' }}
                placeholder="Add private notes about this order (e.g. customer called, special packaging request)..."
                value={orderNotesDraft}
                onChange={(e) => setOrderNotesDraft(e.target.value)}
              />
              <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '8px' }}>
                <button
                  onClick={handleSaveOrderNotes}
                  disabled={orderNotesSaving || orderNotesDraft === (selectedOrder.adminNotes || '')}
                  className="secondary-btn"
                  style={{ padding: '6px 16px', fontSize: '11px' }}
                >
                  {orderNotesSaving ? 'Saving...' : 'Save Notes'}
                </button>
              </div>
            </div>

            <div className="modal-footer hide-print">
              <button onClick={() => window.print()} className="primary-btn">
                Print Invoice
              </button>
              <button onClick={() => setSelectedOrder(null)} className="secondary-btn">
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal: Write / Edit Blog Post */}
      {showBlogModal && (
        <div className="modal-overlay">
          <div className="modal-card" style={{ maxWidth: '600px' }}>
            <div className="modal-header">
              <h2 className="modal-title">{editingPost ? 'Edit Blog Post' : 'Write New Blog Post'}</h2>
              <button onClick={() => setShowBlogModal(false)} className="modal-close">
                &times;
              </button>
            </div>
            <div className="modal-body">
              <form onSubmit={handleBlogSubmit}>
                <div className="form-group" style={{ marginBottom: '16px' }}>
                  <label className="form-label">Post Title</label>
                  <input
                    required
                    type="text"
                    className="form-input"
                    placeholder="e.g. Summer Style Guide 2026"
                    value={blogForm.title}
                    onChange={(e) => setBlogForm({ ...blogForm, title: e.target.value })}
                  />
                </div>
                <div className="form-group" style={{ marginBottom: '16px' }}>
                  <label className="form-label">Author Name</label>
                  <input
                    required
                    type="text"
                    className="form-input"
                    placeholder="e.g. John Doe"
                    value={blogForm.author}
                    onChange={(e) => setBlogForm({ ...blogForm, author: e.target.value })}
                  />
                </div>
                <div className="form-group" style={{ marginBottom: '24px' }}>
                  <label className="form-label">Post Content</label>
                  <textarea
                    required
                    className="form-input"
                    style={{ height: '200px', padding: '10px 12px', resize: 'vertical' }}
                    placeholder="Write your announcement or blog post here..."
                    value={blogForm.content}
                    onChange={(e) => setBlogForm({ ...blogForm, content: e.target.value })}
                  />
                </div>
                <div style={{ display: 'flex', gap: '12px', justifyContent: 'flex-end' }}>
                  <button type="button" onClick={() => setShowBlogModal(false)} className="secondary-btn">
                    Cancel
                  </button>
                  <button type="submit" disabled={blogSubmitting} className="primary-btn">
                    {blogSubmitting ? 'Saving...' : 'Publish Post'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}

      {/* Modal: Create Coupon */}
      {showCouponModal && (
        <div className="modal-overlay">
          <div className="modal-card" style={{ maxWidth: '400px' }}>
            <div className="modal-header">
              <h2 className="modal-title">{editingCoupon ? `Edit Coupon: ${editingCoupon.code}` : 'Create Promo Coupon'}</h2>
              <button onClick={closeCouponModal} className="modal-close">
                &times;
              </button>
            </div>
            <div className="modal-body">
              <form onSubmit={handleCouponSubmit}>
                <div className="form-group" style={{ marginBottom: '16px' }}>
                  <label className="form-label">Coupon Code (Uppercase)</label>
                  <input
                    required
                    type="text"
                    className="form-input"
                    placeholder="e.g. SUMMER15"
                    style={{ textTransform: 'uppercase' }}
                    value={couponForm.code}
                    onChange={(e) => setCouponForm({ ...couponForm, code: e.target.value.toUpperCase() })}
                  />
                </div>
                <div className="form-group" style={{ marginBottom: '16px' }}>
                  <label className="form-label">Discount Type</label>
                  <select
                    className="form-input"
                    value={couponForm.discount_type}
                    onChange={(e) => setCouponForm({ ...couponForm, discount_type: e.target.value })}
                  >
                    <option value="percentage">Percentage (%)</option>
                    <option value="flat">Flat Amount ($)</option>
                  </select>
                </div>
                <div className="form-group" style={{ marginBottom: '16px' }}>
                  <label className="form-label">Discount Value</label>
                  <input
                    required
                    type="number"
                    min="1"
                    step="0.01"
                    className="form-input"
                    placeholder="e.g. 10 or 50.00"
                    value={couponForm.discount_value}
                    onChange={(e) => setCouponForm({ ...couponForm, discount_value: e.target.value })}
                  />
                </div>
                <div className="form-group" style={{ marginBottom: '16px' }}>
                  <label className="form-label">Minimum Purchase Required ($)</label>
                  <input
                    type="number"
                    min="0"
                    step="1"
                    className="form-input"
                    placeholder="e.g. 100"
                    value={couponForm.min_purchase}
                    onChange={(e) => setCouponForm({ ...couponForm, min_purchase: e.target.value })}
                  />
                </div>

                <div className="form-group" style={{ marginBottom: '16px' }}>
                  <label className="form-label">Category Restriction</label>
                  <select
                    className="form-input"
                    value={couponForm.category}
                    onChange={(e) => setCouponForm({ ...couponForm, category: e.target.value })}
                  >
                    <option value="All">All Categories</option>
                    {(categories || []).map((cat) => (
                      <option key={cat.id} value={cat.name}>{cat.name}</option>
                    ))}
                  </select>
                </div>

                <div className="form-group" style={{ marginBottom: '16px' }}>
                  <label className="form-label">Usage Limit (Max checkouts)</label>
                  <input
                    type="number"
                    min="1"
                    className="form-input"
                    placeholder="e.g. 100 (leave empty for unlimited)"
                    value={couponForm.usage_limit}
                    onChange={(e) => setCouponForm({ ...couponForm, usage_limit: e.target.value })}
                  />
                </div>

                <div className="form-group" style={{ marginBottom: '24px' }}>
                  <label className="form-label">Expiration Date</label>
                  <input
                    type="date"
                    className="form-input"
                    value={couponForm.expiry_date}
                    onChange={(e) => setCouponForm({ ...couponForm, expiry_date: e.target.value })}
                  />
                </div>
                
                <div className="modal-footer" style={{ padding: 0, border: 'none', marginTop: '24px' }}>
                  <button type="button" onClick={closeCouponModal} className="secondary-btn">
                    Cancel
                  </button>
                  <button type="submit" className="primary-btn">
                    {editingCoupon ? 'Save Changes' : 'Create Coupon'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}

      {/* Modal: Customer Order History */}
      {selectedUser && (
        <div className="modal-overlay">
          <div className="modal-card" style={{ maxWidth: '600px' }}>
            <div className="modal-header">
              <h2 className="modal-title">Purchase History: {selectedUser.name}</h2>
              <button onClick={() => { setSelectedUser(null); setSelectedUserOrders([]); }} className="modal-close">
                &times;
              </button>
            </div>
            <div className="modal-body">
              {userOrdersLoading ? (
                <div style={{ display: 'flex', justifyContent: 'center', padding: '24px' }}>
                  <div className="spinner"></div>
                </div>
              ) : (
                <div className="table-container" style={{ margin: 0, maxHeight: '350px', overflowY: 'auto' }}>
                  <table className="admin-table">
                    <thead>
                      <tr>
                        <th>Order ID</th>
                        <th>Date</th>
                        <th>Amount</th>
                        <th>Status</th>
                      </tr>
                    </thead>
                    <tbody>
                      {selectedUserOrders.map((o) => (
                        <tr key={o.id}>
                          <td style={{ fontFamily: 'var(--mono)', fontSize: '12px' }}>{o.id}</td>
                          <td style={{ fontSize: '13px', color: 'var(--text-muted)' }}>
                            {new Date(o.created_at).toLocaleDateString()}
                          </td>
                          <td style={{ fontWeight: '700' }}>${parseFloat(o.total_amount).toFixed(2)}</td>
                          <td>
                            <span className={`status-badge ${o.status.toLowerCase()}`}>
                              {o.status}
                            </span>
                          </td>
                        </tr>
                      ))}
                      {selectedUserOrders.length === 0 && (
                        <tr>
                          <td colSpan="4" style={{ fontStyle: 'italic', textAlign: 'center', padding: '24px', color: 'var(--text-muted)' }}>
                            No orders recorded for this user.
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              )}
              <div className="modal-footer" style={{ border: 'none', padding: '16px 0 0 0', marginTop: '24px' }}>
                <button onClick={() => { setSelectedUser(null); setSelectedUserOrders([]); }} className="secondary-btn">
                  Close
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Modal: Update Order Shipment Tracking */}
      {showTrackingModal && (
        <div className="modal-overlay">
          <div className="modal-card" style={{ maxWidth: '400px' }}>
            <div className="modal-header">
              <h2 className="modal-title">Shipment Tracking: Order #{trackingOrderId}</h2>
              <button onClick={() => setShowTrackingModal(false)} className="modal-close">
                &times;
              </button>
            </div>
            <div className="modal-body">
              <form onSubmit={handleSubmitTracking}>
                <div className="form-group">
                  <label className="form-label">Courier Service</label>
                  <select
                    value={trackingForm.courier}
                    onChange={(e) => setTrackingForm({ ...trackingForm, courier: e.target.value })}
                    className="status-select"
                    style={{ width: '100%', padding: '10px' }}
                  >
                    {['DHL', 'FedEx', 'UPS', 'Delhivery', 'BlueDart', 'Standard Delivery'].map((c) => (
                      <option key={c} value={c}>{c}</option>
                    ))}
                  </select>
                </div>
                <div className="form-group">
                  <label className="form-label">Tracking Number</label>
                  <input
                    type="text"
                    required
                    value={trackingForm.tracking_number}
                    onChange={(e) => setTrackingForm({ ...trackingForm, tracking_number: e.target.value })}
                    placeholder="e.g. 1Z999AA10123456784"
                    style={{ width: '100%', padding: '10px', border: '1px solid var(--border-color)', outline: 'none' }}
                  />
                </div>
                <div className="form-group">
                  <label className="form-label">Estimated Delivery Date</label>
                  <input
                    type="text"
                    value={trackingForm.estimated_delivery}
                    onChange={(e) => setTrackingForm({ ...trackingForm, estimated_delivery: e.target.value })}
                    placeholder="e.g. June 15, 2026 or 3-5 Business Days"
                    style={{ width: '100%', padding: '10px', border: '1px solid var(--border-color)', outline: 'none' }}
                  />
                </div>
                <div className="modal-footer" style={{ border: 'none', padding: '16px 0 0 0', marginTop: '24px' }}>
                  <button type="button" onClick={() => setShowTrackingModal(false)} className="secondary-btn">
                    Cancel
                  </button>
                  <button type="submit" disabled={trackingSubmitting} className="primary-btn">
                    {trackingSubmitting ? 'Saving...' : 'Save Tracking'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}

      {/* Modal: Support Ticket Reply */}
      {selectedTicket && (
        <div className="modal-overlay">
          <div className="modal-card" style={{ maxWidth: '500px' }}>
            <div className="modal-header">
              <h2 className="modal-title">
                {selectedTicket.status === 'Open' ? 'Reply to Support Ticket' : 'Support Ticket Details'}
              </h2>
              <button onClick={() => { setSelectedTicket(null); setTicketReplyText(''); }} className="modal-close">
                &times;
              </button>
            </div>
            <div className="modal-body">
              <div style={{ marginBottom: '20px', padding: '16px', background: '#f9fafb', border: '1px solid var(--border-color)' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px', fontSize: '11px', textTransform: 'uppercase', fontWeight: 700, color: 'var(--text-muted)' }}>
                  <span>From: {selectedTicket.name} ({selectedTicket.email})</span>
                  <span>{new Date(selectedTicket.created_at).toLocaleDateString()}</span>
                </div>
                <p style={{ margin: 0, fontSize: '14px', lineHeight: '1.6', color: '#000' }}>
                  "{selectedTicket.message}"
                </p>
              </div>

              {selectedTicket.status === 'Resolved' ? (
                <div>
                  <h4 style={{ fontSize: '11px', textTransform: 'uppercase', fontWeight: 700, margin: '0 0 8px 0', color: 'var(--text-muted)' }}>
                    Staff Response Sent
                  </h4>
                  <div style={{ borderLeft: '2px solid #000', paddingLeft: '16px', fontStyle: 'italic', color: '#374151', fontSize: '14px', lineHeight: '1.6' }}>
                    {selectedTicket.reply.split('\n').map((line, i) => <p key={i} style={{ margin: '0 0 8px 0' }}>{line}</p>)}
                  </div>
                  <div className="modal-footer" style={{ border: 'none', padding: '16px 0 0 0', marginTop: '24px' }}>
                    <button onClick={() => { setSelectedTicket(null); setTicketReplyText(''); }} className="secondary-btn">
                      Close Window
                    </button>
                  </div>
                </div>
              ) : (
                <form onSubmit={handleSubmitTicketReply}>
                  <div className="form-group">
                    <label className="form-label" style={{ fontSize: '10px', textTransform: 'uppercase', fontWeight: 700 }}>
                      Type Reply
                    </label>
                    <textarea
                      required
                      value={ticketReplyText}
                      onChange={(e) => setTicketReplyText(e.target.value)}
                      placeholder="Write your reply here. An email will be sent automatically to the customer."
                      rows="5"
                      style={{
                        width: '100%',
                        padding: '12px',
                        border: '1px solid var(--border-color)',
                        outline: 'none',
                        fontSize: '14px',
                        fontFamily: 'inherit',
                        resize: 'none'
                      }}
                    ></textarea>
                  </div>
                  <div className="modal-footer" style={{ border: 'none', padding: '16px 0 0 0', marginTop: '24px' }}>
                    <button type="button" onClick={() => { setSelectedTicket(null); setTicketReplyText(''); }} className="secondary-btn">
                      Cancel
                    </button>
                    <button type="submit" disabled={replySubmitting} className="primary-btn">
                      {replySubmitting ? 'Sending Reply...' : 'Send Reply'}
                    </button>
                  </div>
                </form>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Modal: Admin Logout Confirmation */}
      {showLogoutConfirm && (
        <div className="modal-overlay">
          <div className="modal-card" style={{ maxWidth: '400px' }}>
            <div className="modal-header">
              <h2 className="modal-title">Logout</h2>
              <button onClick={() => setShowLogoutConfirm(false)} className="modal-close">
                &times;
              </button>
            </div>
            <div className="modal-body" style={{ padding: '24px' }}>
              <p style={{ color: 'var(--text-secondary)', fontSize: '14px', lineHeight: '1.5', marginBottom: '24px' }}>
                Are you sure you want to logout?
              </p>
              <div className="modal-footer" style={{ border: 'none', padding: 0, marginTop: 0 }}>
                <button 
                  onClick={() => setShowLogoutConfirm(false)} 
                  className="secondary-btn" 
                  style={{ marginRight: '12px' }}
                >
                  Cancel
                </button>
                <button 
                  onClick={performLogout} 
                  className="primary-btn" 
                  style={{ backgroundColor: 'var(--danger)', border: 'none' }}
                >
                  Log Out
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Modal: Edit Review */}
      {showReviewEditModal && editingReview && (
        <div className="modal-overlay">
          <div className="modal-card" style={{ maxWidth: '500px' }}>
            <div className="modal-header">
              <h2 className="modal-title">Edit Product Review</h2>
              <button onClick={() => setShowReviewEditModal(false)} className="modal-close">
                &times;
              </button>
            </div>
            <div className="modal-body">
              <form onSubmit={handleUpdateReviewSubmit}>
                <div style={{ marginBottom: '16px', fontSize: '13px', color: 'var(--text-muted)' }}>
                  Editing review by <strong>{editingReview.name}</strong> ({editingReview.email}) for Product #{editingReview.product_id}.
                </div>

                <div className="form-group" style={{ marginBottom: '16px' }}>
                  <label className="form-label">Rating (1 to 5 Stars)</label>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                    <div style={{ display: 'flex', gap: '8px', fontSize: '20px', cursor: 'pointer' }}>
                      {[1, 2, 3, 4, 5].map((star) => (
                        <span
                          key={star}
                          onClick={() => setReviewForm({ ...reviewForm, rating: star })}
                          style={{ 
                            color: star <= reviewForm.rating ? (
                                reviewForm.rating === 1 ? '#ef4444' :
                                reviewForm.rating === 2 ? '#f97316' :
                                reviewForm.rating === 3 ? '#eab308' :
                                reviewForm.rating === 4 ? '#22c55e' :
                                reviewForm.rating === 5 ? '#10b981' : '#fbbf24'
                            ) : '#d1d5db',
                            transition: 'color 0.2s ease'
                          }}
                        >
                          ★
                        </span>
                      ))}
                    </div>
                    <span style={{ 
                      fontSize: '12px', 
                      fontWeight: 'bold', 
                      textTransform: 'uppercase', 
                      letterSpacing: '0.05em',
                      transition: 'color 0.3s ease',
                      color: 
                        reviewForm.rating === 1 ? '#ef4444' :
                        reviewForm.rating === 2 ? '#f97316' :
                        reviewForm.rating === 3 ? '#eab308' :
                        reviewForm.rating === 4 ? '#22c55e' :
                        reviewForm.rating === 5 ? '#10b981' : '#9ca3af'
                    }}>
                      {reviewForm.rating === 1 && 'Very Dissatisfied'}
                      {reviewForm.rating === 2 && 'Dissatisfied'}
                      {reviewForm.rating === 3 && 'Neutral'}
                      {reviewForm.rating === 4 && 'Satisfied'}
                      {reviewForm.rating === 5 && 'Very Satisfied'}
                    </span>
                  </div>
                </div>

                <div className="form-group" style={{ marginBottom: '24px' }}>
                  <label className="form-label">Review Comment</label>
                  <textarea
                    required
                    className="form-input"
                    style={{ height: '120px', padding: '10px 12px', resize: 'vertical' }}
                    value={reviewForm.comment}
                    onChange={(e) => setReviewForm({ ...reviewForm, comment: e.target.value })}
                  />
                </div>

                <div style={{ display: 'flex', gap: '12px', justifyContent: 'flex-end' }}>
                  <button type="button" onClick={() => setShowReviewEditModal(false)} className="secondary-btn">
                    Cancel
                  </button>
                  <button type="submit" disabled={reviewSubmitting} className="primary-btn">
                    {reviewSubmitting ? 'Saving...' : 'Save Changes'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}

      {/* Modal: Edit User Details */}
      {showEditUserModal && editingCustomer && (
        <div className="modal-overlay">
          <div className="modal-card" style={{ maxWidth: '500px' }}>
            <div className="modal-header">
              <h2 className="modal-title">Edit User Profile</h2>
              <button onClick={() => setShowEditUserModal(false)} className="modal-close">
                &times;
              </button>
            </div>
            <div className="modal-body">
              <form onSubmit={handleEditUserSubmit}>
                {/* Avatar Uploader */}
                <div style={{ display: 'flex', alignItems: 'center', gap: '20px', marginBottom: '24px', padding: '16px', background: 'var(--bg-secondary)', border: '1px solid var(--border-color)', borderRadius: '4px' }}>
                  <div style={{ width: '64px', height: '64px', borderRadius: '50%', overflow: 'hidden', border: '1px solid var(--border-color)', flexShrink: 0 }}>
                    <img
                      src={getImageUrl(editUserForm.dp) || `https://api.dicebear.com/7.x/initials/svg?seed=${encodeURIComponent(editUserForm.name || 'User')}`}
                      alt="User Avatar"
                      style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                      onError={(e) => {
                        e.target.src = `https://api.dicebear.com/7.x/initials/svg?seed=${encodeURIComponent(editUserForm.name || 'User')}`;
                      }}
                    />
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                    <span style={{ fontWeight: 'bold', fontSize: '13px' }}>Profile Image File</span>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <input
                        type="file"
                        accept="image/*"
                        id="user-edit-avatar-file"
                        style={{ display: 'none' }}
                        onChange={handleEditUserAvatarUpload}
                      />
                      <label
                        htmlFor="user-edit-avatar-file"
                        className="secondary-btn"
                        style={{
                          margin: 0,
                          padding: '6px 12px',
                          fontSize: '11px',
                          cursor: 'pointer',
                          fontWeight: 'bold',
                          border: '1px solid var(--border-color)',
                          background: '#fff'
                        }}
                      >
                        {editUserUploadLoading ? 'Uploading...' : 'Upload Image File'}
                      </label>
                    </div>
                  </div>
                </div>

                <div className="form-group" style={{ marginBottom: '16px' }}>
                  <label className="form-label">Full Name</label>
                  <input
                    required
                    type="text"
                    className="form-input"
                    value={editUserForm.name}
                    onChange={(e) => setEditUserForm({ ...editUserForm, name: e.target.value })}
                    disabled={editUserSaving}
                  />
                </div>

                <div className="form-group" style={{ marginBottom: '16px' }}>
                  <label className="form-label">Phone Number</label>
                  <input
                    type="tel"
                    className="form-input"
                    placeholder="e.g. +91 98765 43210"
                    value={editUserForm.phone}
                    onChange={(e) => setEditUserForm({ ...editUserForm, phone: e.target.value })}
                    disabled={editUserSaving}
                  />
                </div>

                <div className="form-group" style={{ marginBottom: '16px', opacity: 0.7 }}>
                  <label className="form-label">Email Address (Read-only)</label>
                  <input
                    type="email"
                    className="form-input"
                    value={editingCustomer.email}
                    readOnly
                    style={{ cursor: 'not-allowed', background: 'var(--bg-secondary)' }}
                  />
                </div>

                <div className="form-group" style={{ marginBottom: '24px' }}>
                  <label className="form-label">Profile Picture URL (Optional)</label>
                  <input
                    type="text"
                    className="form-input"
                    placeholder="https://example.com/image.png"
                    value={editUserForm.dp}
                    onChange={(e) => setEditUserForm({ ...editUserForm, dp: e.target.value })}
                    disabled={editUserSaving}
                  />
                </div>

                <div style={{ display: 'flex', gap: '12px', justifyContent: 'flex-end' }}>
                  <button type="button" onClick={() => setShowEditUserModal(false)} className="secondary-btn">
                    Cancel
                  </button>
                  <button type="submit" disabled={editUserSaving || editUserUploadLoading} className="primary-btn">
                    {editUserSaving ? 'Saving...' : 'Save Changes'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}

      {/* Modal: Add Administrator Details */}
      {showAddAdminModal && (
        <div className="modal-overlay">
          <div className="modal-card" style={{ maxWidth: '500px' }}>
            <div className="modal-header">
              <h2 className="modal-title">Add Administrator</h2>
              <button onClick={() => setShowAddAdminModal(false)} className="modal-close">
                &times;
              </button>
            </div>
            <div className="modal-body" style={{ padding: '24px' }}>
              <form onSubmit={handleAddAdminSubmit}>
                {/* Avatar Uploader */}
                <div style={{ display: 'flex', alignItems: 'center', gap: '20px', marginBottom: '24px', padding: '16px', background: 'var(--bg-secondary)', border: '1px solid var(--border-color)', borderRadius: '4px' }}>
                  <div style={{ width: '64px', height: '64px', borderRadius: '50%', overflow: 'hidden', border: '1px solid var(--border-color)', flexShrink: 0 }}>
                    <img
                      src={getImageUrl(addAdminForm.dp) || `https://api.dicebear.com/7.x/initials/svg?seed=${encodeURIComponent(addAdminForm.name || 'Admin')}`}
                      alt="Admin Avatar"
                      style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                      onError={(e) => {
                        e.target.src = `https://api.dicebear.com/7.x/initials/svg?seed=${encodeURIComponent(addAdminForm.name || 'Admin')}`;
                      }}
                    />
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                    <span style={{ fontWeight: 'bold', fontSize: '13px' }}>Profile Image File</span>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <input
                        type="file"
                        accept="image/*"
                        id="admin-add-avatar-file"
                        style={{ display: 'none' }}
                        onChange={handleAddAdminAvatarUpload}
                      />
                      <label
                        htmlFor="admin-add-avatar-file"
                        className="secondary-btn"
                        style={{
                          margin: 0,
                          padding: '6px 12px',
                          fontSize: '11px',
                          cursor: 'pointer',
                          fontWeight: 'bold',
                          border: '1px solid var(--border-color)',
                          background: '#fff'
                        }}
                      >
                        {addAdminUploadLoading ? 'Uploading...' : 'Upload Image File'}
                      </label>
                    </div>
                  </div>
                </div>

                <div className="form-group" style={{ marginBottom: '16px' }}>
                  <label className="form-label">Full Name</label>
                  <input
                    required
                    type="text"
                    className="form-input"
                    placeholder="e.g. John Doe"
                    value={addAdminForm.name}
                    onChange={(e) => setAddAdminForm({ ...addAdminForm, name: e.target.value })}
                    disabled={addAdminSaving}
                  />
                </div>

                <div className="form-group" style={{ marginBottom: '16px' }}>
                  <label className="form-label">Email Address / Gmail</label>
                  <input
                    required
                    type="email"
                    className="form-input"
                    placeholder="e.g. admin.new@gmail.com"
                    value={addAdminForm.email}
                    onChange={(e) => setAddAdminForm({ ...addAdminForm, email: e.target.value })}
                    disabled={addAdminSaving}
                  />
                </div>

                <div className="form-group" style={{ marginBottom: '16px' }}>
                  <label className="form-label">Temporary Password</label>
                  <input
                    required
                    type="password"
                    className="form-input"
                    placeholder="••••••••"
                    value={addAdminForm.password}
                    onChange={(e) => setAddAdminForm({ ...addAdminForm, password: e.target.value })}
                    disabled={addAdminSaving}
                  />
                </div>

                <div className="form-group" style={{ marginBottom: '16px' }}>
                  <label className="form-label">Phone Number (Optional)</label>
                  <input
                    type="tel"
                    className="form-input"
                    placeholder="e.g. +91 98765 43210"
                    value={addAdminForm.phone}
                    onChange={(e) => setAddAdminForm({ ...addAdminForm, phone: e.target.value })}
                    disabled={addAdminSaving}
                  />
                </div>

                <div className="form-group" style={{ marginBottom: '24px' }}>
                  <label className="form-label">Profile Picture URL (Optional)</label>
                  <input
                    type="text"
                    className="form-input"
                    placeholder="https://example.com/image.png"
                    value={addAdminForm.dp}
                    onChange={(e) => setAddAdminForm({ ...addAdminForm, dp: e.target.value })}
                    disabled={addAdminSaving}
                  />
                </div>

                <div style={{ display: 'flex', gap: '12px', justifyContent: 'flex-end' }}>
                  <button type="button" onClick={() => setShowAddAdminModal(false)} className="secondary-btn">
                    Cancel
                  </button>
                  <button type="submit" disabled={addAdminSaving || addAdminUploadLoading} className="primary-btn">
                    {addAdminSaving ? 'Saving...' : 'Add Administrator'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}

      {/* Modal: Add Customer Details */}
      {showAddCustomerModal && (
        <div className="modal-overlay">
          <div className="modal-card" style={{ maxWidth: '500px' }}>
            <div className="modal-header">
              <h2 className="modal-title">Add Customer</h2>
              <button onClick={() => setShowAddCustomerModal(false)} className="modal-close">
                &times;
              </button>
            </div>
            <div className="modal-body" style={{ padding: '24px' }}>
              <form onSubmit={handleAddCustomerSubmit}>
                {/* Avatar Uploader */}
                <div style={{ display: 'flex', alignItems: 'center', gap: '20px', marginBottom: '24px', padding: '16px', background: 'var(--bg-secondary)', border: '1px solid var(--border-color)', borderRadius: '4px' }}>
                  <div style={{ width: '64px', height: '64px', borderRadius: '50%', overflow: 'hidden', border: '1px solid var(--border-color)', flexShrink: 0 }}>
                    <img
                      src={getImageUrl(addCustomerForm.dp) || `https://api.dicebear.com/7.x/initials/svg?seed=${encodeURIComponent(addCustomerForm.name || 'User')}`}
                      alt="Customer Avatar"
                      style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                      onError={(e) => {
                        e.target.src = `https://api.dicebear.com/7.x/initials/svg?seed=${encodeURIComponent(addCustomerForm.name || 'User')}`;
                      }}
                    />
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                    <span style={{ fontWeight: 'bold', fontSize: '13px' }}>Profile Image File</span>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <input
                        type="file"
                        accept="image/*"
                        id="customer-add-avatar-file"
                        style={{ display: 'none' }}
                        onChange={handleAddCustomerAvatarUpload}
                      />
                      <label
                        htmlFor="customer-add-avatar-file"
                        className="secondary-btn"
                        style={{
                          margin: 0,
                          padding: '6px 12px',
                          fontSize: '11px',
                          cursor: 'pointer',
                          fontWeight: 'bold',
                          border: '1px solid var(--border-color)',
                          background: '#fff'
                        }}
                      >
                        {addCustomerUploadLoading ? 'Uploading...' : 'Upload Image File'}
                      </label>
                    </div>
                  </div>
                </div>

                <div className="form-group" style={{ marginBottom: '16px' }}>
                  <label className="form-label">Full Name</label>
                  <input
                    required
                    type="text"
                    className="form-input"
                    placeholder="e.g. Jane Smith"
                    value={addCustomerForm.name}
                    onChange={(e) => setAddCustomerForm({ ...addCustomerForm, name: e.target.value })}
                    disabled={addCustomerSaving}
                  />
                </div>

                <div className="form-group" style={{ marginBottom: '16px' }}>
                  <label className="form-label">Email Address / Gmail</label>
                  <input
                    required
                    type="email"
                    className="form-input"
                    placeholder="e.g. customer@gmail.com"
                    value={addCustomerForm.email}
                    onChange={(e) => setAddCustomerForm({ ...addCustomerForm, email: e.target.value })}
                    disabled={addCustomerSaving}
                  />
                </div>

                <div className="form-group" style={{ marginBottom: '16px' }}>
                  <label className="form-label">Temporary Password</label>
                  <input
                    required
                    type="password"
                    className="form-input"
                    placeholder="••••••••"
                    value={addCustomerForm.password}
                    onChange={(e) => setAddCustomerForm({ ...addCustomerForm, password: e.target.value })}
                    disabled={addCustomerSaving}
                  />
                </div>

                <div className="form-group" style={{ marginBottom: '16px' }}>
                  <label className="form-label">Phone Number (Optional)</label>
                  <input
                    type="tel"
                    className="form-input"
                    placeholder="e.g. +91 98765 43210"
                    value={addCustomerForm.phone}
                    onChange={(e) => setAddCustomerForm({ ...addCustomerForm, phone: e.target.value })}
                    disabled={addCustomerSaving}
                  />
                </div>

                <div className="form-group" style={{ marginBottom: '24px' }}>
                  <label className="form-label">Profile Picture URL (Optional)</label>
                  <input
                    type="text"
                    className="form-input"
                    placeholder="https://example.com/image.png"
                    value={addCustomerForm.dp}
                    onChange={(e) => setAddCustomerForm({ ...addCustomerForm, dp: e.target.value })}
                    disabled={addCustomerSaving}
                  />
                </div>

                <div style={{ display: 'flex', gap: '12px', justifyContent: 'flex-end' }}>
                  <button type="button" onClick={() => setShowAddCustomerModal(false)} className="secondary-btn">
                    Cancel
                  </button>
                  <button type="submit" disabled={addCustomerSaving || addCustomerUploadLoading} className="primary-btn">
                    {addCustomerSaving ? 'Saving...' : 'Add Customer'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}

      {/* Toast Notification popup */}
      {isAuthenticated && activeNotification && (
        <div className={`order-notification-toast ${isDismissingNotification ? 'dismissing' : ''}`}>
          {activeNotification.type === 'welcome' ? (
            <>
              <div className="notification-header">
                <span className="notification-badge" style={{ backgroundColor: '#10b981' }}>Welcome</span>
                <button onClick={dismissNotification} className="notification-close-btn">&times;</button>
              </div>
              <h4 className="notification-title">Welcome</h4>
              <div className="notification-body">
                Welcome back, <strong>{activeNotification.adminName}</strong>.
              </div>
              <div className="notification-actions">
                <button onClick={dismissNotification} className="notification-btn-view" style={{ backgroundColor: '#10b981' }}>Continue</button>
              </div>
            </>
          ) : activeNotification.type === 'logout' ? (
            <>
              <div className="notification-header">
                <span className="notification-badge" style={{ backgroundColor: '#3b82f6' }}>Logged Out</span>
                <button onClick={dismissNotification} className="notification-close-btn">&times;</button>
              </div>
              <h4 className="notification-title">Logged Out</h4>
              <div className="notification-body">
                Successfully logged out.
              </div>
              <div className="notification-actions">
                <button onClick={dismissNotification} className="notification-btn-view" style={{ backgroundColor: '#3b82f6' }}>OK</button>
              </div>
            </>
          ) : activeNotification.type === 'login' ? (
            <>
              <div className="notification-header">
                <span className="notification-badge" style={{ backgroundColor: '#8b5cf6' }}>Session Alert</span>
                <button onClick={dismissNotification} className="notification-close-btn">&times;</button>
              </div>
              <h4 className="notification-title">{activeNotification.role === 'admin' ? 'Admin Login' : 'User Login'}</h4>
              <div className="notification-body">
                <strong>{activeNotification.name}</strong> ({activeNotification.email}) logged in.
              </div>
              <div className="notification-actions">
                <button onClick={() => { setActiveTab(activeNotification.role === 'admin' ? 'overview' : 'users'); dismissNotification(); }} className="notification-btn-view" style={{ backgroundColor: '#8b5cf6' }}>View</button>
                <button onClick={dismissNotification} className="notification-btn-dismiss">Dismiss</button>
              </div>
            </>
          ) : activeNotification.type === 'logout_event' ? (
            <>
              <div className="notification-header">
                <span className="notification-badge" style={{ backgroundColor: '#ef4444' }}>Session Alert</span>
                <button onClick={dismissNotification} className="notification-close-btn">&times;</button>
              </div>
              <h4 className="notification-title">{activeNotification.role === 'admin' ? 'Admin Logout' : 'User Logout'}</h4>
              <div className="notification-body">
                <strong>{activeNotification.name}</strong> ({activeNotification.email}) logged out.
              </div>
              <div className="notification-actions">
                <button onClick={dismissNotification} className="notification-btn-view" style={{ backgroundColor: '#ef4444' }}>OK</button>
              </div>
            </>
          ) : activeNotification.type === 'password-changed' ? (
            <>
              <div className="notification-header">
                <span className="notification-badge" style={{ backgroundColor: '#f43f5e' }}>Security Alert</span>
                <button onClick={dismissNotification} className="notification-close-btn">&times;</button>
              </div>
              <h4 className="notification-title">Password Changed!</h4>
              <div className="notification-body">
                <strong>{activeNotification.name}</strong> ({activeNotification.email}) updated their password.
              </div>
              <div className="notification-actions">
                <button onClick={dismissNotification} className="notification-btn-view" style={{ backgroundColor: '#f43f5e' }}>OK</button>
              </div>
            </>
          ) : activeNotification.type === 'user-registered' ? (
            <>
              <div className="notification-header">
                <span className="notification-badge" style={{ backgroundColor: '#10b981' }}>New Customer</span>
                <button onClick={dismissNotification} className="notification-close-btn">&times;</button>
              </div>
              <h4 className="notification-title">Customer Registered!</h4>
              <div className="notification-body">
                <strong>{activeNotification.name}</strong> ({activeNotification.email}) has registered.
              </div>
              <div className="notification-actions">
                <button onClick={handleViewNotification} className="notification-btn-view" style={{ backgroundColor: '#10b981' }}>View Customers</button>
                <button onClick={dismissNotification} className="notification-btn-dismiss">Dismiss</button>
              </div>
            </>
          ) : activeNotification.type === 'ticket-created' ? (
            <>
              <div className="notification-header">
                <span className="notification-badge" style={{ backgroundColor: '#f59e0b' }}>Support Alert</span>
                <button onClick={dismissNotification} className="notification-close-btn">&times;</button>
              </div>
              <h4 className="notification-title">New Support Ticket!</h4>
              <div className="notification-body">
                Inquiry from <strong>{activeNotification.name}</strong> ({activeNotification.email}).
              </div>
              <div className="notification-actions">
                <button onClick={handleViewNotification} className="notification-btn-view" style={{ backgroundColor: '#f59e0b' }}>View Tickets</button>
                <button onClick={dismissNotification} className="notification-btn-dismiss">Dismiss</button>
              </div>
            </>
          ) : activeNotification.type === 'review-submitted' ? (
            <>
              <div className="notification-header">
                <span className="notification-badge" style={{ backgroundColor: '#ec4899' }}>New Review</span>
                <button onClick={dismissNotification} className="notification-close-btn">&times;</button>
              </div>
              <h4 className="notification-title">Product Review Received!</h4>
              <div className="notification-body">
                <strong>{activeNotification.name}</strong> left a <strong>{activeNotification.rating}-star</strong> review.
              </div>
              <div className="notification-actions">
                <button onClick={handleViewNotification} className="notification-btn-view" style={{ backgroundColor: '#ec4899' }}>View Reviews</button>
                <button onClick={dismissNotification} className="notification-btn-dismiss">Dismiss</button>
              </div>
            </>
          ) : (
            <>
              <div className="notification-header">
                <span className="notification-badge" style={{ backgroundColor: '#3b82f6' }}>Order Alert</span>
                <button onClick={dismissNotification} className="notification-close-btn">&times;</button>
              </div>
              <h4 className="notification-title">New Order Confirmed!</h4>
              <div className="notification-body">
                <strong>{activeNotification.customerName}</strong> placed order <strong>#{activeNotification.id}</strong> for <strong>${parseFloat(activeNotification.total || 0).toFixed(2)}</strong>.
              </div>
              <div className="notification-actions">
                <button onClick={handleViewNotification} className="notification-btn-view" style={{ backgroundColor: '#3b82f6' }}>View Order</button>
                <button onClick={dismissNotification} className="notification-btn-dismiss">Dismiss</button>
              </div>
            </>
          )}
        </div>
      )}

      {/* Media Picker Modal */}
      {mediaPickerMode && (
        <div className="modal-overlay" style={{ zIndex: 1100 }}>
          <div className="modal-card" style={{ maxWidth: '800px', width: '90%' }}>
            <div className="modal-header">
              <h2 className="modal-title">Select Asset from Library</h2>
              <button 
                onClick={() => { setMediaPickerMode(false); setMediaPickerCallback(null); }} 
                className="modal-close"
              >
                &times;
              </button>
            </div>
            <div className="modal-body">
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
                <p style={{ fontSize: '12px', color: 'var(--text-muted)', margin: 0 }}>Click an image card to select and auto-fill the URL.</p>
                <div>
                  <input
                    type="file"
                    accept="image/*"
                    id="picker-media-upload"
                    style={{ display: 'none' }}
                    onChange={handleMediaUpload}
                    multiple
                  />
                  <label
                    htmlFor="picker-media-upload"
                    className="primary-btn"
                    style={{ cursor: 'pointer', display: 'inline-block', margin: 0 }}
                  >
                    {mediaUploadLoading ? 'Uploading...' : 'Upload New'}
                  </label>
                </div>
              </div>

              {mediaLoading ? (
                <div className="loading-container">
                  <div className="spinner"></div>
                </div>
              ) : (
                <div style={{ 
                  display: 'grid', 
                  gridTemplateColumns: 'repeat(auto-fill, minmax(130px, 1fr))', 
                  gap: '16px',
                  maxHeight: '350px',
                  overflowY: 'auto',
                  padding: '4px'
                }}>
                  {mediaList.map((item, idx) => (
                    <div 
                      key={idx}
                      onClick={() => handleSelectMediaItem(item)}
                      style={{
                        position: 'relative',
                        aspectRatio: '1',
                        border: '1px solid var(--border-color)',
                        background: '#fff',
                        cursor: 'pointer',
                        overflow: 'hidden',
                        borderRadius: '4px',
                        transition: 'transform 0.2s'
                      }}
                      onMouseEnter={(e) => e.currentTarget.style.transform = 'scale(1.03)'}
                      onMouseLeave={(e) => e.currentTarget.style.transform = 'scale(1)'}
                    >
                      <img 
                        src={getImageUrl(`/uploads/${item.filename}`)} 
                        alt={item.filename}
                        style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                      />
                      <div style={{
                        position: 'absolute',
                        bottom: 0,
                        left: 0,
                        right: 0,
                        background: 'rgba(0,0,0,0.6)',
                        color: '#fff',
                        fontSize: '9px',
                        padding: '4px 6px',
                        whiteSpace: 'nowrap',
                        overflow: 'hidden',
                        textOverflow: 'ellipsis'
                      }}>
                        {item.filename}
                      </div>
                    </div>
                  ))}
                  {mediaList.length === 0 && (
                    <div style={{ gridColumn: '1/-1', textAlign: 'center', color: 'var(--text-muted)', fontSize: '12px', padding: '40px 0' }}>
                      No media files found. Upload some assets first!
                    </div>
                  )}
                </div>
              )}
            </div>
            <div className="modal-footer">
              <button 
                onClick={() => { setMediaPickerMode(false); setMediaPickerCallback(null); }} 
                className="secondary-btn"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Dynamic Sliding Activity Feed Sidebar */}
      <div style={{
        position: 'fixed',
        top: 0,
        right: 0,
        width: '360px',
        height: '100vh',
        background: 'rgba(255, 255, 255, 0.82)',
        backdropFilter: 'blur(20px) saturate(180%)',
        WebkitBackdropFilter: 'blur(20px) saturate(180%)',
        borderLeft: '1px solid var(--border-color)',
        boxShadow: '-10px 0 30px rgba(0,0,0,0.06)',
        transform: isActivitySidebarOpen ? 'translateX(0)' : 'translateX(100%)',
        transition: 'transform 0.4s cubic-bezier(0.16, 1, 0.3, 1)',
        zIndex: 999,
        display: 'flex',
        flexDirection: 'column',
        padding: '24px',
        boxSizing: 'border-box'
      }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px', borderBottom: '1px solid var(--border-color)', paddingBottom: '12px' }}>
          <div>
            <h3 style={{ fontSize: '14px', fontWeight: '800', textTransform: 'uppercase', letterSpacing: '-0.3px', margin: 0, color: 'var(--text-primary)' }}>Live Activity Feed</h3>
            <span style={{ fontSize: '10px', color: 'var(--text-muted)' }}>Real-time event stream ticker</span>
          </div>
          <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
            <button 
              onClick={() => setLiveActivities([])} 
              style={{ background: 'transparent', border: 'none', color: '#ff4d4f', fontSize: '9px', fontWeight: 'bold', textTransform: 'uppercase', cursor: 'pointer', letterSpacing: '0.5px', padding: 0 }}
            >
              Clear Feed
            </button>
            <button 
              onClick={() => setIsActivitySidebarOpen(false)} 
              style={{ background: 'transparent', border: 'none', fontSize: '20px', cursor: 'pointer', color: 'var(--text-secondary)', padding: 0, lineHeight: 1 }}
            >
              &times;
            </button>
          </div>
        </div>

        <div style={{ flex: 1, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '10px', paddingRight: '4px' }}>
          {liveActivities.map((act) => {
            const actTime = (() => {
              try {
                return new Date(act.time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
              } catch {
                return '';
              }
            })();
            return (
              <div 
                key={act.id} 
                onClick={() => {
                  if (act.type === 'new-order') {
                    setActiveTab('orders');
                    setOrderSearchQuery(act.idRef || '');
                  } else if (act.type === 'user-registered') {
                    setActiveTab('users');
                  } else if (act.type === 'ticket-created') {
                    setActiveTab('support');
                  } else if (act.type === 'review-submitted') {
                    setActiveTab('reviews');
                  }
                  setIsActivitySidebarOpen(false);
                }}
                style={{ 
                  background: 'rgba(255, 255, 255, 0.45)', 
                  border: '1px solid rgba(0, 0, 0, 0.05)', 
                  padding: '10px', 
                  display: 'flex', 
                  gap: '10px',
                  alignItems: 'flex-start',
                  cursor: 'pointer',
                  borderRadius: '4px',
                  transition: 'background 0.2s'
                }}
                onMouseEnter={(e) => e.currentTarget.style.background = 'rgba(255, 255, 255, 0.8)'}
                onMouseLeave={(e) => e.currentTarget.style.background = 'rgba(255, 255, 255, 0.45)'}
              >
                <div style={{ 
                  width: '28px', 
                  height: '28px', 
                  background: act.color, 
                  color: '#fff', 
                  borderRadius: '50%', 
                  display: 'flex', 
                  alignItems: 'center', 
                  justifyContent: 'center',
                  fontSize: '12px',
                  flexShrink: 0
                }}>
                  {act.icon}
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1px' }}>
                    <span style={{ fontSize: '10px', fontWeight: 'bold', textTransform: 'uppercase', color: 'var(--text-primary)' }}>{act.name}</span>
                    <span style={{ fontSize: '8px', color: 'var(--text-muted)' }}>{actTime}</span>
                  </div>
                  <div style={{ fontSize: '10.5px', color: 'var(--text-secondary)', lineHeight: '1.3' }}>{act.message}</div>
                </div>
              </div>
            );
          })}
          {liveActivities.length === 0 && (
            <div style={{ textAlign: 'center', color: 'var(--text-muted)', fontSize: '11px', padding: '40px 0', fontStyle: 'italic' }}>
              No activities logged yet.
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default App;
