
export interface Brand {
  id: string;
  name: string;
  slug: string;
  logo_url?: string;
}

export interface Product {
  id: string;
  brand_id: string;
  watch_type: 'smartwatch' | 'classic';
  model: string;
  title: string;
  slug: string;
  short_description?: string;
  default_warranty_months: number;
  brand?: Brand;
  highlights?: string[];
}

export interface ProductVariant {
  id: string;
  product_id: string;
  sku: string;
  title: string;
  color?: string;
  strap?: string;
  price_bdt: number;
  compare_at_bdt?: number;
  stock_qty: number;
  warranty_months: number;
  warranty_note?: string;
  specs: Record<string, any>;
}

export interface ProductImage {
  id: string;
  product_id: string;
  url: string;
  alt?: string;
  is_primary: boolean;
}

export interface Collection {
  id: string;
  name: string;
  slug: string;
  description?: string;
}

export interface CartItem {
  variant_id: string;
  product_id: string;
  sku: string;
  qty: number;
  // Hydrated fields
  title: string;
  model: string;
  brand_name: string;
  price: number;
  image: string;
  stock: number;
}

export interface Coupon {
  id: string;
  code: string;
  discount_type: 'percentage' | 'fixed';
  discount_value: number;
  min_subtotal: number;
  max_discount?: number;
  starts_at?: string;
  ends_at?: string;
  is_active: boolean;
}

export interface Order {
  id: string;
  order_number: number;
  customer_id: string | null;
  customer_name: string;
  customer_phone: string;
  customer_email?: string;
  status: string;
  total: number;
  subtotal: number;
  shipping_fee: number;
  discount_total: number;
  coupon_code?: string;
  payment_method: string;
  shipping_address: Record<string, any>;
  notes?: string;
  created_at: string;
  updated_at: string;
}

export interface Profile {
  user_id: string;
  email: string;
  full_name: string;
  phone: string;
}

export interface Address {
  id?: string;
  user_id: string;
  label: string;
  full_name: string;
  phone: string;
  address_line: string;
  division: string;
  district: string;
  thana: string;
  zip: string;
  is_default: boolean;
}

export interface PageContent {
  slug: string;
  title: string;
  content: {
    body?: string;
    sections?: any[];
  };
}

export interface Review {
  id: string;
  product_id: string;
  user_id: string;
  rating: number;
  title?: string;
  body?: string;
  created_at: string;
  user_name?: string; // joined or masked
  media?: ReviewMedia[];
}

export interface ReviewMedia {
  id: string;
  review_id: string;
  url: string;
  type: 'image' | 'video';
}
