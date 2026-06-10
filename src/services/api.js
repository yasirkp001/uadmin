const API_BASE_URL = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1' 
    ? '' 
    : 'https://ubackend-guk8.onrender.com';

async function request(endpoint, options = {}) {
    const token = localStorage.getItem('uclose_admin_token') || sessionStorage.getItem('uclose_admin_token');
    
    const headers = {
        'Content-Type': 'application/json',
        ...options.headers
    };

    if (token) {
        headers['Authorization'] = `Bearer ${token}`;
    }

    const config = {
        ...options,
        headers
    };

    try {
        const response = await fetch(`${API_BASE_URL}${endpoint}`, config);
        const data = await response.json();
        
        if (!response.ok) {
            const error = new Error(data.message || 'Something went wrong');
            error.status = response.status;
            throw error;
        }
        
        return data;
    } catch (error) {
        console.error('API Error:', error.message);
        throw error;
    }
}

export const api = {
    // Auth endpoints
    login: (email, password) => 
        request('/api/auth/login', {
            method: 'POST',
            body: JSON.stringify({ email, password })
        }),
        
    getMe: () => 
        request('/api/auth/me'),

    // Products endpoints
    getProducts: () => 
        request('/api/products'),

    // Admin endpoints
    getAdminStats: () =>
        request('/api/admin/stats'),

    getAdminUsers: () =>
        request('/api/admin/users'),

    getAdminOrders: () =>
        request('/api/admin/orders'),

    updateOrderStatus: (orderId, status) =>
        request(`/api/admin/orders/${orderId}`, {
            method: 'PUT',
            body: JSON.stringify({ status })
        }),

    createProduct: (productData) =>
        request('/api/admin/products', {
            method: 'POST',
            body: JSON.stringify(productData)
        }),

    updateProduct: (productId, productData) =>
        request(`/api/admin/products/${productId}`, {
            method: 'PUT',
            body: JSON.stringify(productData)
        }),

    deleteProduct: (productId) =>
        request(`/api/admin/products/${productId}`, {
            method: 'DELETE'
        }),

    uploadImage: (file) => {
        const formData = new FormData();
        formData.append('image', file);
        
        const token = localStorage.getItem('uclose_admin_token') || sessionStorage.getItem('uclose_admin_token');
        const headers = {};
        if (token) {
            headers['Authorization'] = `Bearer ${token}`;
        }
        
        return fetch('/api/admin/upload', {
            method: 'POST',
            headers,
            body: formData
        }).then(async (response) => {
            const data = await response.json();
            if (!response.ok) {
                throw new Error(data.message || 'Image upload failed');
            }
            return data;
        });
    },

    // Coupons endpoints
    getCoupons: () =>
        request('/api/admin/coupons'),

    createCoupon: (couponData) =>
        request('/api/admin/coupons', {
            method: 'POST',
            body: JSON.stringify(couponData)
        }),

    deleteCoupon: (couponId) =>
        request(`/api/admin/coupons/${couponId}`, {
            method: 'DELETE'
        }),

    // User status and history
    toggleUserStatus: (userId) =>
        request(`/api/admin/users/${userId}/toggle-status`, {
            method: 'PUT'
        }),

    getUserOrders: (userId) =>
        request(`/api/admin/users/${userId}/orders`),

    updateUser: (userId, userData) =>
        request(`/api/admin/users/${userId}`, {
            method: 'PUT',
            body: JSON.stringify(userData)
        }),

    updateProfileDetails: (name, phone, dp) =>
        request('/api/auth/profile/update', {
            method: 'PUT',
            body: JSON.stringify({ name, phone, dp })
        }),

    createAdmin: (adminData) =>
        request('/api/admin/users/create-admin', {
            method: 'POST',
            body: JSON.stringify(adminData)
        }),

    createCustomer: (userData) =>
        request('/api/admin/users/create-customer', {
            method: 'POST',
            body: JSON.stringify(userData)
        }),



    // Order tracking
    updateOrderTracking: (orderId, trackingData) =>
        request(`/api/admin/orders/${orderId}/tracking`, {
            method: 'PUT',
            body: JSON.stringify(trackingData)
        }),

    // Support tickets
    getSupportTickets: () =>
        request('/api/admin/support/tickets'),

    replyToSupportTicket: (ticketId, replyText) =>
        request(`/api/admin/support/tickets/${ticketId}/reply`, {
            method: 'PUT',
            body: JSON.stringify({ reply: replyText })
        }),

    // Sales dashboard analytics
    getAdminAnalytics: () =>
        request('/api/admin/analytics'),

    // Categories endpoints
    getCategories: () =>
        request('/api/categories'),

    createCategory: (name) =>
        request('/api/categories/admin', {
            method: 'POST',
            body: JSON.stringify({ name })
        }),

    deleteCategory: (id) =>
        request(`/api/categories/admin/${id}`, {
            method: 'DELETE'
        }),

    // Bulk inventory update
    bulkUpdateInventory: (payload) =>
        request('/api/admin/products/bulk-inventory', {
            method: 'POST',
            body: JSON.stringify(payload)
        }),

    // Site settings management
    getSettings: () =>
        request('/api/settings'),

    updateSettings: (settingsData) =>
        request('/api/settings', {
            method: 'PUT',
            body: JSON.stringify(settingsData)
        }),

    // Size Guide Management
    getSizeGuides: () =>
        request('/api/size-guides'),

    createSizeGuide: (guideData) =>
        request('/api/size-guides', {
            method: 'POST',
            body: JSON.stringify(guideData)
        }),

    updateSizeGuide: (guideId, guideData) =>
        request(`/api/size-guides/${guideId}`, {
            method: 'PUT',
            body: JSON.stringify(guideData)
        }),

    deleteSizeGuide: (guideId) =>
        request(`/api/size-guides/${guideId}`, {
            method: 'DELETE'
        }),

    // Blog / Posts endpoints
    getPosts: () =>
        request('/api/posts'),

    createPost: (postData) =>
        request('/api/posts', {
            method: 'POST',
            body: JSON.stringify(postData)
        }),

    updatePost: (postId, postData) =>
        request(`/api/posts/${postId}`, {
            method: 'PUT',
            body: JSON.stringify(postData)
        }),

    deletePost: (postId) =>
        request(`/api/posts/${postId}`, {
            method: 'DELETE'
        }),

    // Reviews endpoints
    getReviews: () =>
        request('/api/reviews'),

    approveReview: (reviewId) =>
        request(`/api/reviews/${reviewId}/approve`, {
            method: 'PUT'
        }),

    deleteReview: (reviewId) =>
        request(`/api/reviews/${reviewId}`, {
            method: 'DELETE'
        }),

    updateReview: (reviewId, data) =>
        request(`/api/reviews/${reviewId}`, {
            method: 'PUT',
            body: JSON.stringify(data)
        })
};
