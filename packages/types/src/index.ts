export type UserRole = 'customer' | 'admin' | 'rider' | 'manager';

export type OrderStatus =
  | 'pending'
  | 'confirmed'
  | 'preparing'
  | 'out_for_delivery'
  | 'delivered'
  | 'cancelled';

export type PaymentMethod = 'cod' | 'gcash';

export type PaymentStatus = 'pending' | 'paid' | 'failed' | 'refunded';

export type ProductAvailability = 'available' | 'unavailable' | 'pre_order' | 'sold_out';

export type VariantType = 'none' | 'size' | 'preparation' | 'sugar_level';

export interface Profile {
  id: string;
  user_id?: string;
  full_name: string;
  first_name?: string;
  last_name?: string;
  role: UserRole;
  phone: string;
  address: string;
  avatar_url: string | null;
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
  stocks: number;
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
  stocks: number;
  is_active: boolean;
  sort_order: number;
}

export interface Order {
  id: string;
  order_number: string;
  customer_id: string;
  status: OrderStatus;
  payment_method: PaymentMethod;
  payment_status: PaymentStatus;
  payment_proof_url: string | null;
  gcash_reference_no: string | null;
  delivery_address: string;
  delivery_contact: string;
  delivery_notes: string | null;
  delivery_location_lat: number | null;
  delivery_location_lng: number | null;
  rider_id: string | null;
  subtotal: number;
  delivery_fee: number;
  total: number;
  rider_earnings: number;
  completed_at: string | null;
  created_at: string;
  updated_at: string;
  customer?: Profile;
  rider?: Profile;
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

export interface RiderLocation {
  id: string;
  rider_id: string;
  order_id: string | null;
  latitude: number;
  longitude: number;
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
