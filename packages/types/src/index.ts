export type UserRole = "customer" | "admin" | "staff" | "rider";

export type RiderStatus = "pending_approval" | "available" | "vacant" | "occupied" | "rejected";

export type OrderStatus =
  | "pending"
  | "confirmed"
  | "preparing"
  | "ready_for_pickup"
  | "claimed_by_rider"
  | "out_for_delivery"
  | "near_customer"
  | "delivered"
  | "cancelled";

export type PaymentMethod = "cod" | "gcash" | "maya";

export type PaymentStatus = "pending" | "verified" | "rejected" | "refunded";

export type ProductAvailability = "available" | "sold_out";

export type VariantType = "none" | "size" | "preparation" | "sugar_level";

export type LocationType = "region" | "province" | "city" | "barangay";

export type EarningStatus = "pending" | "paid";

export type CashoutStatus = "requested" | "approved" | "paid" | "rejected";

export interface Profile {
  id: string;
  email?: string;
  username?: string;
  full_name: string;
  first_name: string;
  last_name: string;
  role: UserRole;
  phone: string;
  address: string;
  street_address: string;
  region_id: string | null;
  province_id: string | null;
  town_id: string | null;
  barangay_id: string | null;
  zip_code: string;
  avatar_url: string | null;
  rider_status: RiderStatus | null;
  vehicle_type: string | null;
  plate_number: string | null;
  license_number: string | null;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface Category {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  image_url: string | null;
  sort_order: number;
  is_active: boolean;
  created_at: string;
}

export interface Product {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  image_url: string | null;
  category_id: string | null;
  base_price: number;
  variant_type: VariantType;
  rating: number;
  quantity: number;
  buffer_quantity: number;
  low_stock_alerted_at: string | null;
  availability: ProductAvailability;
  is_featured: boolean;
  created_at: string;
  updated_at: string;
  category?: Category;
  variants?: ProductVariant[];
}

export interface ProductVariant {
  id: string;
  product_id: string;
  name: string;
  price: number;
  quantity: number;
  is_active: boolean;
  sort_order: number;
}

export interface Order {
  id: string;
  order_number: string;
  user_id: string;
  status: OrderStatus;
  payment_method: PaymentMethod;
  payment_status: PaymentStatus;
  payment_proof_url: string | null;
  gcash_reference_no: string | null;
  maya_reference_no: string | null;
  delivery_address: string;
  delivery_lat: number | null;
  delivery_lng: number | null;
  delivery_contact: string;
  delivery_notes: string | null;
  rider_id: string | null;
  staff_id: string | null;
  subtotal: number;
  delivery_fee: number;
  total: number;
  rider_earnings: number;
  confirmed_at: string | null;
  prepared_at: string | null;
  picked_up_at: string | null;
  delivered_at: string | null;
  cancelled_at: string | null;
  created_at: string;
  updated_at: string;
  customer?: Profile;
  rider?: Profile;
  staff?: Profile;
  items?: OrderItem[];
}

export interface OrderItem {
  id: string;
  order_id: string;
  product_id: string;
  variant_id: string | null;
  product_name: string;
  variant_name: string | null;
  quantity: number;
  unit_price: number;
  total_price: number;
}

export interface OrderStatusLog {
  id: string;
  order_id: string;
  status: OrderStatus;
  changed_by: string | null;
  notes: string | null;
  changed_at: string;
}

export interface RiderLocation {
  id: string;
  rider_id: string;
  order_id: string | null;
  latitude: number;
  longitude: number;
  updated_at: string;
}

export interface RiderEarning {
  id: string;
  rider_id: string;
  order_id: string;
  amount: number;
  status: EarningStatus;
  earned_at: string;
}

export interface RiderCashout {
  id: string;
  rider_id: string;
  amount: number;
  status: CashoutStatus;
  notes: string | null;
  processed_by: string | null;
  processed_at: string | null;
  requested_at: string;
}

export interface Location {
  id: string;
  type: LocationType;
  parent_id: string | null;
  code: string | null;
  name: string;
  is_custom: boolean;
  created_at: string;
}

export interface BusinessConfig {
  id: string;
  name: string;
  address: string;
  phone: string;
  email: string;
  logo_url: string | null;
  registration_no: string | null;
  gcash_qr_url: string | null;
  maya_qr_url: string | null;
  delivery_fee: number;
  free_delivery_min: number;
  created_at: string;
  updated_at: string;
}

export interface Notification {
  id: string;
  user_id: string;
  type: string;
  title: string;
  message: string;
  data: Record<string, unknown> | null;
  read: boolean;
  created_at: string;
}

export interface UserCart {
  user_id: string;
  items: unknown;
  updated_at: string;
}

export interface CartItem {
  product: Product;
  quantity: number;
  variant?: ProductVariant;
}

export interface CartStore {
  items: CartItem[];
  addItem: (product: Product, quantity?: number, variant?: ProductVariant) => void;
  removeItem: (productId: string, variantId?: string) => void;
  updateQuantity: (productId: string, quantity: number, variantId?: string) => void;
  clearCart: () => void;
  getSubtotal: () => number;
  getTotal: () => number;
  getItemCount: () => number;
}

export interface ApiResponse<T = unknown> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
}
