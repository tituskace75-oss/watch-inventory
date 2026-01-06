import React, { createContext, useContext, useState, useEffect } from 'react';
import { CartItem, Coupon } from '../types';
import { supabase } from '../lib/supabase';

interface CartContextType {
  cart: CartItem[];
  addToCart: (item: CartItem) => void;
  removeFromCart: (variantId: string) => void;
  updateQty: (variantId: string, qty: number) => void;
  clearCart: () => void;
  refreshCart: () => Promise<void>;
  subtotal: number;
  // Coupon
  coupon: Coupon | null;
  applyCoupon: (code: string) => Promise<{ success: boolean; message: string }>;
  removeCoupon: () => void;
  discountTotal: number;
  grandTotal: number; // subtotal - discount
  isLoading: boolean;
}

const CartContext = createContext<CartContextType | undefined>(undefined);

export const CartProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [cart, setCart] = useState<CartItem[]>(() => {
    const saved = localStorage.getItem('ruiz_cart');
    return saved ? JSON.parse(saved) : [];
  });

  const [coupon, setCoupon] = useState<Coupon | null>(() => {
    const saved = localStorage.getItem('ruiz_cart_coupon');
    return saved ? JSON.parse(saved) : null;
  });

  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    localStorage.setItem('ruiz_cart', JSON.stringify(cart));
  }, [cart]);

  useEffect(() => {
    if (coupon) {
      localStorage.setItem('ruiz_cart_coupon', JSON.stringify(coupon));
    } else {
      localStorage.removeItem('ruiz_cart_coupon');
    }
  }, [coupon]);

  const subtotal = cart.reduce((acc, item) => acc + item.price * item.qty, 0);

  // Validate coupon whenever subtotal changes
  useEffect(() => {
    if (coupon && subtotal < (coupon.min_subtotal || 0)) {
      setCoupon(null); // Auto-remove if requirement no longer met
    }
  }, [subtotal, coupon]);

  const discountTotal = React.useMemo(() => {
    if (!coupon) return 0;
    
    let discount = 0;
    if (coupon.discount_type === 'fixed') {
      discount = coupon.discount_value;
    } else if (coupon.discount_type === 'percentage') {
      discount = Math.round((subtotal * coupon.discount_value) / 100);
      if (coupon.max_discount && discount > coupon.max_discount) {
        discount = coupon.max_discount;
      }
    }
    
    // Discount cannot exceed subtotal
    return Math.min(discount, subtotal);
  }, [coupon, subtotal]);

  const grandTotal = subtotal - discountTotal;

  const addToCart = (item: CartItem) => {
    setCart(prev => {
      const existing = prev.find(i => i.variant_id === item.variant_id);
      if (existing) {
        return prev.map(i => i.variant_id === item.variant_id ? { ...i, qty: i.qty + item.qty } : i);
      }
      return [...prev, item];
    });
  };

  const removeFromCart = (variantId: string) => {
    setCart(prev => prev.filter(i => i.variant_id !== variantId));
  };

  const updateQty = (variantId: string, qty: number) => {
    setCart(prev => prev.map(i => i.variant_id === variantId ? { ...i, qty: Math.max(1, qty) } : i));
  };

  const clearCart = () => {
    setCart([]);
    setCoupon(null);
  };

  // Hydrate cart with latest prices and stock from DB
  const refreshCart = async () => {
    if (cart.length === 0) return;
    setIsLoading(true);
    try {
      const variantIds = cart.map(c => c.variant_id);
      
      // Fetch variants with product info
      const { data: variants, error } = await supabase
        .from('product_variants')
        .select(`
          id, price_bdt, stock_qty, title, sku,
          product:products (
            id, title, model, 
            brand:brands (name),
            images:product_images (url, is_primary)
          )
        `)
        .in('id', variantIds);

      if (error || !variants) {
        console.error('Failed to refresh cart:', error);
        return;
      }

      setCart(prevCart => {
        return prevCart.map(item => {
          const fresh: any = variants.find((v: any) => v.id === item.variant_id);
          if (!fresh) return item; // Keep stale if not found (or maybe remove?)
          
          // Handle potential array return from Supabase relations
          const product = Array.isArray(fresh.product) ? fresh.product[0] : fresh.product;
          
          const primaryImg = Array.isArray(product?.images) 
             ? product.images.find((img: any) => img.is_primary) || product.images[0] 
             : null;

          const brand = Array.isArray(product?.brand) ? product.brand[0] : product?.brand;

          return {
            ...item,
            price: fresh.price_bdt,
            stock: fresh.stock_qty,
            // Update other fields just in case
            title: product?.title || item.title,
            brand_name: brand?.name || item.brand_name,
            model: fresh.title || product?.model || item.model, // Variant title or product model
            image: primaryImg?.url || item.image,
            sku: fresh.sku
          };
        });
      });
    } catch (err) {
      console.error('Refresh cart error', err);
    } finally {
      setIsLoading(false);
    }
  };

  const applyCoupon = async (code: string): Promise<{ success: boolean; message: string }> => {
    if (!code) return { success: false, message: 'Please enter a code.' };

    try {
      const { data, error } = await supabase
        .from('coupons')
        .select('*')
        .eq('code', code.toUpperCase()) // Case insensitive search usually handled by DB, but standardizing input helps
        .single();

      if (error || !data) {
        return { success: false, message: 'Invalid promo code.' };
      }

      const c = data as Coupon;

      if (!c.is_active) {
        return { success: false, message: 'This promo code is no longer active.' };
      }

      const now = new Date();
      if (c.starts_at && new Date(c.starts_at) > now) {
        return { success: false, message: 'Promo code is not valid yet.' };
      }
      if (c.ends_at && new Date(c.ends_at) < now) {
        return { success: false, message: 'Promo code has expired.' };
      }

      if (subtotal < (c.min_subtotal || 0)) {
        return { success: false, message: `Minimum order of ৳${c.min_subtotal} required.` };
      }

      setCoupon(c);
      return { success: true, message: 'Coupon applied successfully!' };
    } catch (err) {
      console.error(err);
      return { success: false, message: 'Error applying coupon.' };
    }
  };

  const removeCoupon = () => {
    setCoupon(null);
  };

  return (
    <CartContext.Provider value={{ 
      cart, addToCart, removeFromCart, updateQty, clearCart, refreshCart,
      subtotal, coupon, applyCoupon, removeCoupon, discountTotal, grandTotal, isLoading 
    }}>
      {children}
    </CartContext.Provider>
  );
};

export const useCart = () => {
  const context = useContext(CartContext);
  if (!context) throw new Error('useCart must be used within CartProvider');
  return context;
};