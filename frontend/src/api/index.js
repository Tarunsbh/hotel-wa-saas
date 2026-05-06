import axios from 'axios';

const BASE_URL = import.meta.env.VITE_API_URL || '/api/v1';

const api = axios.create({
  baseURL: BASE_URL,
  headers: { 'Content-Type': 'application/json' },
});

const mapStayStatus = (value) => {
  const status = String(value || '').toUpperCase();
  if (status === 'CHECKED_IN') return 'IN_HOUSE';
  if (status === 'ACTIVE' || status === 'INACTIVE') return 'NO_STAY';
  return status || undefined;
};

const mapAudienceType = (value) => {
  const audience = String(value || '').toUpperCase();
  if (audience === 'CHECKED_IN') return 'IN_HOUSE';
  if (audience === 'CUSTOM') return 'CSV';
  return audience || undefined;
};

const normalizeGuestPayload = (data = {}) => {
  const {
    stayStatus,
    checkIn,
    checkOut,
    room,
    ...rest
  } = data;

  return {
    ...rest,
    status: mapStayStatus(stayStatus || data.status),
    checkInDate: checkIn || data.checkInDate || undefined,
    checkOutDate: checkOut || data.checkOutDate || undefined,
    roomNumber: room || data.roomNumber || undefined,
  };
};

const normalizeTemplatePayload = (data = {}) => {
  // Support both old field names (body/footer) and new (bodyText/footerText)
  const { body, footer, ...rest } = data;
  return {
    ...rest,
    bodyText:   data.bodyText   || body   || '',
    footerText: data.footerText || footer || undefined,
  };
};

const normalizeCampaignPayload = (data = {}) => ({
  ...data,
  audienceType: mapAudienceType(data.audienceType),
});

const normalizeRulePayload = (data = {}) => {
  const triggerType = String(data.triggerType || '').toLowerCase();
  const offsetDirection = data.offsetDirection || data.triggerConfig?.offsetDirection;
  let mappedTrigger = String(data.triggerType || '').toUpperCase();

  if (triggerType === 'check_in') {
    mappedTrigger = offsetDirection === 'before' ? 'BEFORE_ARRIVAL' : 'AFTER_CHECKIN';
  } else if (triggerType === 'check_out') {
    mappedTrigger = offsetDirection === 'before' ? 'BEFORE_CHECKOUT' : 'AFTER_CHECKOUT';
  } else if (['reservation_created', 'birthday', 'anniversary'].includes(triggerType)) {
    mappedTrigger = 'CUSTOM_DATE';
  }

  return {
    name: data.name,
    triggerType: mappedTrigger,
    triggerConfig: {
      ...(data.triggerConfig || {}),
      offsetHours: data.offsetHours,
      offsetDirection,
      sendTime: data.sendTime,
    },
    templateId: data.templateId,
    audienceType: mapAudienceType(data.audienceType),
    audienceFilter: data.audienceFilter,
    variableValues: data.variableValues,
    isActive: data.isActive ?? data.active,
  };
};

// Request interceptor — attach token
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// Response interceptor — handle 401
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      localStorage.removeItem('token');
      localStorage.removeItem('user');
      window.location.href = '/login';
    }
    return Promise.reject(error);
  }
);

// ─── Auth ─────────────────────────────────────────────────────────────────────
export const auth = {
  login: (data) => api.post('/auth/login', data),
  me: () => api.get('/auth/me'),
  register: (data) => api.post('/auth/register', data),
  listAgents: () => api.get('/auth/agents'),
  changePassword: (data) => api.patch('/auth/change-password', data),
};

// ─── Guests ───────────────────────────────────────────────────────────────────
export const guests = {
  list: (params = {}) => api.get('/guests', {
    params: {
      ...params,
      status: mapStayStatus(params.stayStatus || params.status),
      stayStatus: undefined,
    },
  }),
  get: (id) => api.get(`/guests/${id}`),
  create: (data) => api.post('/guests', normalizeGuestPayload(data)),
  update: (id, data) => api.patch(`/guests/${id}`, normalizeGuestPayload(data)),
  remove: (id) => api.delete(`/guests/${id}`),
  forceRemove: (id) => api.delete(`/guests/${id}/force`),
  importCsv: (formData) =>
    api.post('/guests/import-csv', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    }),
  addTag: (id, tagId) => api.post(`/guests/${id}/tags/${tagId}`),
  removeTag: (id, tagId) => api.delete(`/guests/${id}/tags/${tagId}`),
  listTags: () => api.get('/guests/tags'),
  createTag: (data) => api.post('/guests/tags', data),
  optOut: (id) => api.post(`/guests/${id}/opt-out`),
};

// ─── Templates ────────────────────────────────────────────────────────────────
export const templates = {
  list: (params) => api.get('/templates', { params }),
  get: (id) => api.get(`/templates/${id}`),
  create: (data) => api.post('/templates', normalizeTemplatePayload(data)),
  update: (id, data) => api.patch(`/templates/${id}`, normalizeTemplatePayload(data)),
  remove: (id) => api.delete(`/templates/${id}`),
  sync: () => api.post('/templates/sync'),
  duplicate: (id) => api.post(`/templates/${id}/duplicate`),
  submit: (id) => api.post(`/templates/${id}/submit`),
};

// ─── Campaigns ────────────────────────────────────────────────────────────────
export const campaigns = {
  list: (params) => api.get('/campaigns', { params }),
  get: (id) => api.get(`/campaigns/${id}`),
  create: (data) => api.post('/campaigns', normalizeCampaignPayload(data)),
  update: (id, data) => api.patch(`/campaigns/${id}`, normalizeCampaignPayload(data)),
  remove: (id) => api.delete(`/campaigns/${id}`),
  launch: (id) => api.post(`/campaigns/${id}/launch`),
  cancel: (id) => api.post(`/campaigns/${id}/cancel`),
  getRecipients: (id, params) => api.get(`/campaigns/${id}/recipients`, { params }),
  getStats: (id) => api.get(`/campaigns/${id}/stats`),
  getAnalytics: () => api.get('/campaigns/analytics/summary'),
};

// ─── Conversations ────────────────────────────────────────────────────────────
export const conversations = {
  list: (params) => api.get('/conversations', { params }),
  get: (id) => api.get(`/conversations/${id}`),
  assign: (id, agentId) => api.patch(`/conversations/${id}/assign`, { agentId }),
  updateStatus: (id, status) => api.patch(`/conversations/${id}/status`, { status }),
  markRead: (id) => api.patch(`/conversations/${id}/read`),
  remove: (id) => api.delete(`/conversations/${id}`),
};

// ─── Messages ─────────────────────────────────────────────────────────────────
export const messages = {
  listByConversation: (conversationId, params) =>
    api.get(`/messages/conversation/${conversationId}`, { params }),
  sendText: (conversationId, data) =>
    api.post('/messages/send/text', {
      conversationId,
      body: data.body || data.text,
    }),
  sendTemplate: (conversationId, data) =>
    api.post('/messages/send/template', { conversationId, ...data }),
  sendTemplateToNumber: (to, data) =>
    api.post('/messages/send/template/to-number', { to, ...data }),
  sendMedia: (conversationId, data) =>
    api.post('/messages/send/media', { conversationId, ...data }),
  sendToNumber: (to, body) =>
    api.post('/messages/send/to-number', { to, body }),
};

// ─── Automation ───────────────────────────────────────────────────────────────
export const automation = {
  listRules: (params) => api.get('/automation/rules', { params }),
  getRule: (id) => api.get(`/automation/rules/${id}`),
  createRule: (data) => api.post('/automation/rules', normalizeRulePayload(data)),
  updateRule: (id, data) => api.patch(`/automation/rules/${id}`, normalizeRulePayload(data)),
  deleteRule: (id) => api.delete(`/automation/rules/${id}`),
  toggleRule: (id, active) => api.patch(`/automation/rules/${id}/toggle`, { active }),
  runNow: (id) => api.post(`/automation/rules/${id}/run-now`),
  getLogs: (id) => api.get(`/automation/rules/${id}/logs`),
};

// ─── Analytics ────────────────────────────────────────────────────────────────
export const analytics = {
  getDashboard: () => api.get('/analytics/dashboard'),
  getMessageVolume: (params) => api.get('/analytics/message-volume', { params }),
  getCampaigns: (params) => api.get('/analytics/campaigns', { params }),
  getAgents: (params) => api.get('/analytics/agents', { params }),
};

export default api;

// ─── Hotels ───────────────────────────────────────────────────────────────────
export const hotels = {
  get: () => api.get('/hotels/me'),
  update: (data) => api.patch('/hotels/me', data),
  saveToken: (data) => api.post('/hotels/me/token', data),
  getTokens: () => api.get('/hotels/me/tokens'),
};
