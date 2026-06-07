import React, { useState, useEffect } from 'react';
import { api } from './services/api';
import './App.css';

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
  const [couponForm, setCouponForm] = useState({
    code: '',
    discount_type: 'percentage',
    discount_value: '',
    min_purchase: '',
    expiry_date: '',
    usage_limit: '',
    category: 'All'
  });

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
    announcement_banner: ''
  });
  const [settingsSaving, setSettingsSaving] = useState(false);

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

  // Load Dashboard Data
  const loadDashboardData = async () => {
    setDataLoading(true);
    try {
      const statsData = await api.getAdminStats();
      setStats(statsData);

      const productsData = await api.getProducts();
      setProducts(productsData);

      const ordersData = await api.getAdminOrders();
      setOrders(ordersData);

      const usersData = await api.getAdminUsers();
      setUsers(usersData);

      const couponsData = await api.getCoupons();
      setCoupons(couponsData);

      try {
        const categoriesData = await api.getCategories();
        setCategories(categoriesData);
      } catch (catErr) {
        console.error('Failed to load categories:', catErr.message);
      }

      try {
        const analytics = await api.getAdminAnalytics();
        setAnalyticsData(analytics);
      } catch (analyticsErr) {
        console.error('Failed to load analytics data:', analyticsErr.message);
      }
 
      try {
        const supportData = await api.getSupportTickets();
        setSupportTickets(supportData);
      } catch (supportErr) {
        console.error('Failed to load support tickets:', supportErr.message);
      }

      try {
        const settingsData = await api.getSettings();
        setSiteSettings(settingsData);
      } catch (settingsErr) {
        console.error('Failed to load site settings:', settingsErr.message);
      }

      try {
        const guides = await api.getSizeGuides();
        setSizeGuides(guides);
      } catch (guidesErr) {
        console.error('Failed to load size guides:', guidesErr.message);
      }
    } catch (err) {
      console.error('Failed to load admin dashboard data:', err.message);
    } finally {
      setDataLoading(false);
    }
  };

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

  // Size Guides Management Actions
  const handleStartCreateGuide = () => {
    setIsEditingGuide(true);
    setEditingGuideId(null);
    setGuideFormName('');
    setGuideFormCategory(categories[0]?.name || '');
    setGuideFormColumns('Chest (in), Length (in), Sleeve (in)');
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

    const initialSlots = { S: [], M: [], L: [], XL: [], XXL: [] };
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

    const slotsArray = ['S', 'M', 'L', 'XL', 'XXL'].map(size => {
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
        } catch (e) {
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

  // Coupon submissions
  const handleCouponSubmit = async (e) => {
    e.preventDefault();
    try {
      await api.createCoupon({
        code: couponForm.code,
        discount_type: couponForm.discount_type,
        discount_value: parseFloat(couponForm.discount_value),
        min_purchase: parseFloat(couponForm.min_purchase || 0),
        active: 1,
        expiry_date: couponForm.expiry_date || null,
        usage_limit: couponForm.usage_limit ? parseInt(couponForm.usage_limit, 10) : null,
        category: couponForm.category !== 'All' ? couponForm.category : null
      });
      setShowCouponModal(false);
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

  const handleDeleteCoupon = async (id) => {
    if (!window.confirm('Are you sure you want to delete this coupon?')) return;
    try {
      await api.deleteCoupon(id);
      loadDashboardData();
    } catch (err) {
      alert('Failed to delete coupon: ' + err.message);
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
    localStorage.removeItem('uclose_admin_token');
    localStorage.removeItem('uclose_admin_last_close');
    setUser(null);
    setIsAuthenticated(false);
    setActiveTab('overview');
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
        const absoluteUrl = `http://localhost:5000${data.imageUrl}`;
        uploadedUrls.push(absoluteUrl);
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
      category: categories[0]?.name || 'Shirts',
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
      } catch (e) {
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
    
    const sizesArray = productForm.sizes
      ? productForm.sizes.split(',').map(s => s.trim()).filter(Boolean)
      : ['S', 'M', 'L', 'XL', 'XXL'];

    const payload = {
      ...productForm,
      price: parseFloat(productForm.price),
      details: detailsArray,
      images: finalImages,
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
          <div className="user-info">
            <div className="user-email">{user?.email}</div>
            <div className="user-role">Administrator</div>
          </div>
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
                    <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: '32px', marginBottom: '32px' }}>
                      
                      {/* Sales Trend SVG Chart */}
                      <div className="welcome-banner" style={{ margin: 0, padding: '24px' }}>
                        <h2 className="welcome-title" style={{ fontSize: '16px', marginBottom: '4px' }}>Daily Sales Trend (Last 7 Days)</h2>
                        <p className="welcome-desc" style={{ marginBottom: '24px', fontSize: '12px' }}>Visual overview of recent checkout transactions</p>
                        <div className="chart-container" style={{ position: 'relative', height: '200px', width: '100%' }}>
                          <svg width="100%" height="180" style={{ overflow: 'visible' }}>
                            {/* Grid lines */}
                            {[0, 0.25, 0.5, 0.75, 1].map((ratio, idx) => (
                              <line
                                key={idx}
                                x1="0%"
                                y1={`${100 - ratio * 100}%`}
                                x2="100%"
                                y2={`${100 - ratio * 100}%`}
                                stroke="var(--border-color)"
                                strokeWidth="1"
                                strokeDasharray="4 4"
                              />
                            ))}
                            {/* Bars */}
                            {chartData.map((d, idx) => {
                              const barWidthPercent = 8;
                              const spacing = 100 / 7;
                              const xPos = idx * spacing + (spacing - barWidthPercent) / 2;
                              const barHeight = (d.sales / maxSales) * 140;
                              const yPos = 160 - barHeight;

                              return (
                                <g key={idx}>
                                  <text
                                    x={`${xPos + barWidthPercent / 2}%`}
                                    y={yPos - 12}
                                    textAnchor="middle"
                                    fill="var(--text-primary)"
                                    fontSize="10"
                                    fontWeight="700"
                                    className="chart-tooltip"
                                    style={{ opacity: 0, transition: 'opacity 0.2s', pointerEvents: 'none' }}
                                  >
                                    ${d.sales.toFixed(0)} ({d.count})
                                  </text>
                                  <rect
                                    x={`${xPos}%`}
                                    y={yPos}
                                    width={`${barWidthPercent}%`}
                                    height={barHeight}
                                    fill="var(--text-primary)"
                                    rx="0"
                                    style={{ cursor: 'pointer', transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)' }}
                                    onMouseEnter={(e) => {
                                      e.target.style.fill = 'var(--text-secondary)';
                                      e.target.parentNode.querySelector('.chart-tooltip').style.opacity = 1;
                                    }}
                                    onMouseLeave={(e) => {
                                      e.target.style.fill = 'var(--text-primary)';
                                      e.target.parentNode.querySelector('.chart-tooltip').style.opacity = 0;
                                    }}
                                  />
                                  <text
                                    x={`${xPos + barWidthPercent / 2}%`}
                                    y="176"
                                    textAnchor="middle"
                                    fill="var(--text-secondary)"
                                    fontSize="9"
                                    fontWeight="700"
                                    letterSpacing="0.5"
                                    textTransform="uppercase"
                                  >
                                    {d.dateStr}
                                  </text>
                                </g>
                              );
                            })}
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
                                  {donutElements.map((d, idx) => (
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
                                      onMouseEnter={(e) => e.target.setAttribute('stroke-width', '11')}
                                      onMouseLeave={(e) => e.target.setAttribute('stroke-width', '8')}
                                    />
                                  ))}
                                  <circle cx="50" cy="50" r="32" fill="var(--bg-secondary)" />
                                </svg>
                                <div style={{ position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%, -50%)', textAlign: 'center' }}>
                                  <div style={{ fontSize: '8px', fontWeight: 'bold', color: 'var(--text-muted)', textTransform: 'uppercase' }}>Total</div>
                                  <div style={{ fontSize: '12px', fontWeight: 'bold', letterSpacing: '-0.5px' }}>${totalCatSales.toFixed(0)}</div>
                                </div>
                              </div>
                              
                              <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: '6px', width: '100%', fontSize: '10px' }}>
                                {donutElements.map((d, idx) => (
                                  <div key={idx} style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                                    <span style={{ width: '8px', height: '8px', background: d.color, display: 'inline-block' }}></span>
                                    <span style={{ color: 'var(--text-secondary)', fontWeight: 'bold' }}>{d.name}</span>
                                    <span style={{ marginLeft: 'auto', fontWeight: 'bold' }}>${d.sales.toFixed(0)}</span>
                                  </div>
                                ))}
                              </div>
                            </div>
                          );
                        })()}
                      </div>
                    </div>

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
                    <div className="section-title-wrapper">
                      <div>
                        <h1 className="section-title">Analytics Reports</h1>
                        <p className="section-subtitle">Aggregated sales performance & insights</p>
                      </div>
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
                    <div style={{ display: 'grid', gridTemplateColumns: '1.8fr 1.2fr', gap: '32px', marginBottom: '32px' }}>
                      
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
                                      textTransform="uppercase"
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
                                {item.image && <img src={item.image} alt={item.name} style={{ width: '32px', height: '40px', objectFit: 'cover' }} />}
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
                      <button onClick={openAddModal} className="primary-btn">
                        + Add Product
                      </button>
                    </div>

                    <div style={{ display: 'grid', gridTemplateColumns: '3fr 1.2fr', gap: '32px', alignItems: 'start' }}>
                      {/* Left Column: Products List */}
                      <div>
                        {/* Inventory Filters */}
                        <div className="filter-bar" style={{ display: 'flex', gap: '16px', marginBottom: '24px', padding: '16px', background: 'var(--bg-secondary)', border: '1px solid var(--border-color)' }}>
                          <div>
                            <label className="form-label" style={{ marginBottom: '6px', display: 'block' }}>Category Filter</label>
                            <select
                              className="form-input"
                              style={{ padding: '8px 12px', cursor: 'pointer' }}
                              value={productCategoryFilter}
                              onChange={(e) => setProductCategoryFilter(e.target.value)}
                            >
                              <option value="All">All Categories</option>
                              {categories.map(cat => (
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
                                    <img src={p.image} alt={p.name} className="product-thumb" />
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
                                        href={`http://localhost:5174/product/${p.id}`} 
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
                            {categories.map((cat) => (
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
                            {categories.length === 0 && (
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
                                {categories.map((cat) => (
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
                                          href={`http://localhost:5174/product/${item.id || item.productId || item.product_id}`}
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
                              <button onClick={() => setSelectedOrder(order)} className="secondary-btn" style={{ padding: '6px 12px', fontSize: '10px' }}>
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
                  <div className="section-title-wrapper">
                    <div>
                      <h1 className="section-title">User Accounts</h1>
                      <p className="section-subtitle">Audit registered buyers & administrators</p>
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
                        {users.map((u) => (
                          <tr key={u.id}>
                            <td style={{ fontFamily: 'var(--mono)', fontSize: '12px', color: 'var(--text-muted)' }}>
                              #{u.id}
                            </td>
                            <td>
                              <div style={{ fontWeight: '600' }}>{u.name || 'N/A'}</div>
                            </td>
                            <td>
                              <div style={{ color: 'var(--text-secondary)' }}>{u.email}</div>
                            </td>
                            <td>
                              <div style={{ fontWeight: '700' }}>{u.order_count || 0}</div>
                            </td>
                            <td>
                              <div style={{ fontWeight: '700' }}>${parseFloat(u.lifetime_value || 0).toFixed(2)}</div>
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
                                <button onClick={() => handleViewUserHistory(u)} className="action-link">
                                  Orders
                                </button>
                                <button onClick={() => handleToggleUserStatus(u.id)} className="action-link" style={{ color: u.is_active !== 0 ? '#b91c1c' : '#15803d' }}>
                                  {u.is_active !== 0 ? 'Block' : 'Unblock'}
                                </button>
                              </div>
                            </td>
                          </tr>
                        ))}
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
                    <button onClick={() => setShowCouponModal(true)} className="primary-btn">
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
                        <div className="grid-2col" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '24px', marginBottom: '24px' }}>
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
                              {categories.map(cat => (
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

                        <div className="form-group" style={{ marginBottom: '32px' }}>
                          <label className="form-label" style={{ marginBottom: '12px', display: 'block' }}>Size Measurements Grid</label>
                          <div className="table-container" style={{ border: '1px solid #e5e7eb', borderRadius: '4px' }}>
                            <table className="admin-table">
                              <thead>
                                <tr>
                                  <th style={{ width: '80px' }}>Size</th>
                                  {guideFormColumns.split(',').map((c, i) => c.trim()).filter(Boolean).map((col, idx) => (
                                    <th key={idx}>{col}</th>
                                  ))}
                                </tr>
                              </thead>
                              <tbody>
                                {['S', 'M', 'L', 'XL', 'XXL'].map(size => {
                                  const cols = guideFormColumns.split(',').map(c => c.trim()).filter(Boolean);
                                  return (
                                    <tr key={size}>
                                      <td style={{ fontWeight: 'bold' }}>{size}</td>
                                      {cols.map((_, colIndex) => (
                                        <td key={colIndex}>
                                          <input
                                            required
                                            type="text"
                                            className="form-input"
                                            style={{ padding: '8px 12px', fontSize: '13px', height: '36px' }}
                                            placeholder="e.g. 38-40"
                                            value={guideFormSlots[size]?.[colIndex] || ''}
                                            onChange={(e) => handleSlotChange(size, colIndex, e.target.value)}
                                          />
                                        </td>
                                      ))}
                                    </tr>
                                  );
                                })}
                              </tbody>
                            </table>
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
                      {categories.map((cat) => (
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
                            <img src={imgUrl} alt="Thumbnail" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
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
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '24px', marginBottom: '32px', fontSize: '12px' }}>
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
                          {item.image && <img src={item.image} alt="" className="hide-print" style={{ width: '28px', height: '34px', objectFit: 'cover' }} />}
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
              <div style={{ display: 'flex', justifyContent: 'flex-end', borderTop: '2px solid #000', paddingTop: '16px' }}>
                <div style={{ textAlign: 'right', width: '200px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px', color: 'var(--text-secondary)', marginBottom: '8px' }}>
                    <span>Subtotal</span>
                    <span>${parseFloat(selectedOrder.total || 0).toFixed(2)}</span>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px', color: 'var(--text-secondary)', marginBottom: '8px' }}>
                    <span>Shipping</span>
                    <span>{parseFloat(selectedOrder.total || 0) >= 200 ? 'Free' : '$15.00'}</span>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '16px', fontWeight: '800', borderTop: '1px solid var(--border-color)', paddingTop: '8px', marginTop: '8px' }}>
                    <span>Grand Total</span>
                    <span>${parseFloat(selectedOrder.total || 0).toFixed(2)}</span>
                  </div>
                </div>
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

      {/* Modal: Create Coupon */}
      {showCouponModal && (
        <div className="modal-overlay">
          <div className="modal-card" style={{ maxWidth: '400px' }}>
            <div className="modal-header">
              <h2 className="modal-title">Create Promo Coupon</h2>
              <button onClick={() => setShowCouponModal(false)} className="modal-close">
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
                    {categories.map((cat) => (
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
                  <button type="button" onClick={() => setShowCouponModal(false)} className="secondary-btn">
                    Cancel
                  </button>
                  <button type="submit" className="primary-btn">
                    Create Coupon
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
    </div>
  );
}

export default App;
