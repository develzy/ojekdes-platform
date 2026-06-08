export const USER_ROLE = {
  SUPER_ADMIN: 'super_admin',
  ADMIN: 'admin',
  OPERATOR: 'operator',
  CUSTOMER: 'customer',
  DRIVER: 'driver',
} as const;

export type UserRole = typeof USER_ROLE[keyof typeof USER_ROLE];

export const USER_STATUS = {
  ACTIVE: 'ACTIVE',
  INACTIVE: 'INACTIVE',
  SUSPENDED: 'SUSPENDED',
} as const;

export type UserStatus = typeof USER_STATUS[keyof typeof USER_STATUS];

export const ORDER_STATUS = {
  PENDING: 'PENDING',
  SEARCHING_DRIVER: 'SEARCHING_DRIVER',
  DRIVER_ACCEPTED: 'DRIVER_ACCEPTED',
  DRIVER_ARRIVED: 'DRIVER_ARRIVED',
  IN_PROGRESS: 'IN_PROGRESS',
  COMPLETED: 'COMPLETED',
  CANCELLED: 'CANCELLED',
} as const;

export type OrderStatus = typeof ORDER_STATUS[keyof typeof ORDER_STATUS];

export const PAYMENT_STATUS = {
  PENDING: 'PENDING',
  PAID: 'PAID',
  FAILED: 'FAILED',
  REFUNDED: 'REFUNDED',
  EXPIRED: 'EXPIRED',
} as const;

export type PaymentStatus = typeof PAYMENT_STATUS[keyof typeof PAYMENT_STATUS];

export const DRIVER_STATUS = {
  OFFLINE: 'OFFLINE',
  ONLINE: 'ONLINE',
  BUSY: 'BUSY',
  SUSPENDED: 'SUSPENDED',
} as const;

export type DriverStatus = typeof DRIVER_STATUS[keyof typeof DRIVER_STATUS];

export const VEHICLE_TYPE = {
  MOTOR: 'MOTOR',
  BENTOR: 'BENTOR',
} as const;

export type VehicleType = typeof VEHICLE_TYPE[keyof typeof VEHICLE_TYPE];

export const PAYMENT_METHOD = {
  CASH: 'CASH',
  QRIS: 'QRIS',
} as const;

export type PaymentMethod = typeof PAYMENT_METHOD[keyof typeof PAYMENT_METHOD];

export const ROAD_CONDITION = {
  GOOD: 'good',
  FAIR: 'fair',
  DAMAGED: 'damaged',
  SEVERE: 'severe',
} as const;

export type RoadCondition = typeof ROAD_CONDITION[keyof typeof ROAD_CONDITION];

export const ROAD_TYPE = {
  ASPHALT: 'asphalt',
  CONCRETE: 'concrete',
  GRAVEL: 'gravel',
  DIRT: 'dirt',
} as const;

export type RoadType = typeof ROAD_TYPE[keyof typeof ROAD_TYPE];

export const EDUCATION_LEVEL = {
  TK: 'TK',
  SD: 'SD',
  SMP: 'SMP',
  SMA: 'SMA',
  SMK: 'SMK',
  MA: 'MA',
  PT: 'PT',
} as const;

export type EducationLevel = typeof EDUCATION_LEVEL[keyof typeof EDUCATION_LEVEL];

export const POI_TYPE = {
  PASAR: 'PASAR',
  MASJID: 'MASJID',
  MUSHOLA: 'MUSHOLA',
  BALAI_DESA: 'BALAI_DESA',
  PUSKESMAS: 'PUSKESMAS',
  KLINIK: 'KLINIK',
  SEKOLAH: 'SEKOLAH',
  PONDOK: 'PONDOK',
  TERMINAL: 'TERMINAL',
  KANTOR_DESA: 'KANTOR_DESA',
  KANTOR_KECAMATAN: 'KANTOR_KECAMATAN',
  SPBU: 'SPBU',
  MINIMARKET: 'MINIMARKET',
} as const;

export type PoiType = typeof POI_TYPE[keyof typeof POI_TYPE];

export const CANCEL_REASON_CATEGORY = {
  DRIVER_NOT_MOVING: 'driver_not_moving',
  CLIENT_CANCELLED: 'client_cancelled',
  CHANGE_MIND: 'change_mind',
  WAIT_TOO_LONG: 'wait_too_long',
  OTHER: 'other',
} as const;

export type CancelReasonCategory = typeof CANCEL_REASON_CATEGORY[keyof typeof CANCEL_REASON_CATEGORY];

// ─── Merchant ─────────────────────────────────────────────────────────────────

export const MERCHANT_STATUS = {
  PENDING:   'PENDING',
  APPROVED:  'APPROVED',
  REJECTED:  'REJECTED',
  SUSPENDED: 'SUSPENDED',
} as const;

export type MerchantStatus = typeof MERCHANT_STATUS[keyof typeof MERCHANT_STATUS];

export const MERCHANT_ORDER_STATUS = {
  PENDING:          'PENDING',
  CONFIRMED:        'CONFIRMED',
  PREPARING:        'PREPARING',
  READY_FOR_PICKUP: 'READY_FOR_PICKUP',
  PICKED_UP:        'PICKED_UP',
  DELIVERED:        'DELIVERED',
  CANCELLED:        'CANCELLED',
} as const;

export type MerchantOrderStatus = typeof MERCHANT_ORDER_STATUS[keyof typeof MERCHANT_ORDER_STATUS];

export const MERCHANT_DOCUMENT_TYPE = {
  KTP:       'KTP',
  NPWP:      'NPWP',
  NIB:       'NIB',
  SIUP:      'SIUP',
  FOTO_TOKO: 'FOTO_TOKO',
} as const;

export type MerchantDocumentType = typeof MERCHANT_DOCUMENT_TYPE[keyof typeof MERCHANT_DOCUMENT_TYPE];

export const MERCHANT_CATEGORY_CODE = {
  FOOD:       'FOOD',
  GROCERY:    'GROCERY',
  FARM:       'FARM',
  FISHERY:    'FISHERY',
  HANDICRAFT: 'HANDICRAFT',
  SERVICES:   'SERVICES',
} as const;

export type MerchantCategoryCode = typeof MERCHANT_CATEGORY_CODE[keyof typeof MERCHANT_CATEGORY_CODE];
