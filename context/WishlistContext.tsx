
import React, { createContext, useContext, useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { useAuth } from './AuthContext';

interface WishlistContextType {
  wishlist: string[]; // Array of product IDs
  toggleWishlist: (productId: string) => Promise<void>;
  isInWishlist: (productId: string) => boolean;
  clearWishlist: () => Promise<void>;
  loading: boolean;
}

const WishlistContext = createContext<WishlistContextType | undefined>(undefined);

export const WishlistProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user } = useAuth();
  const [wishlist, setWishlist] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);

  // Load initial state
  useEffect(() => {
    let mounted = true;

    const loadWishlist = async () => {
      try {
        if (user) {
          // 1. Sync Logic: Merge local items to DB if any
          const localStr = localStorage.getItem('ruiz_wishlist');
          if (localStr) {
            const localIds: string[] = JSON.parse(localStr);
            if (localIds.length > 0) {
              // Insert missing items
              const { data: existing } = await supabase
                .from('wishlist_items')
                .select('product_id')
                .eq('user_id', user.id);
              
              const existingIds = new Set(existing?.map(i => i.product_id) || []);
              const newItems = localIds
                .filter(id => !existingIds.has(id))
                .map(id => ({ user_id: user.id, product_id: id }));
              
              if (newItems.length > 0) {
                await supabase.from('wishlist_items').insert(newItems);
              }
              // Clear local storage after sync
              localStorage.removeItem('ruiz_wishlist');
            }
          }

          // 2. Fetch from DB
          const { data, error } = await supabase
            .from('wishlist_items')
            .select('product_id')
            .eq('user_id', user.id);
          
          if (mounted && data && !error) {
            setWishlist(data.map(i => i.product_id));
          }
        } else {
          // Guest: Load from Local Storage
          const saved = localStorage.getItem('ruiz_wishlist');
          if (mounted) {
            setWishlist(saved ? JSON.parse(saved) : []);
          }
        }
      } catch (err) {
        console.error('Error loading wishlist:', err);
      } finally {
        if (mounted) setLoading(false);
      }
    };

    loadWishlist();

    return () => { mounted = false; };
  }, [user]);

  // Persist guest wishlist to localStorage whenever it changes (if no user)
  useEffect(() => {
    if (!user && !loading) {
      localStorage.setItem('ruiz_wishlist', JSON.stringify(wishlist));
    }
  }, [wishlist, user, loading]);

  const toggleWishlist = async (productId: string) => {
    const isAdded = wishlist.includes(productId);
    
    // Optimistic Update
    const newWishlist = isAdded 
      ? wishlist.filter(id => id !== productId)
      : [...wishlist, productId];
    
    setWishlist(newWishlist);

    if (user) {
      try {
        if (isAdded) {
          await supabase
            .from('wishlist_items')
            .delete()
            .eq('user_id', user.id)
            .eq('product_id', productId);
        } else {
          await supabase
            .from('wishlist_items')
            .insert({ user_id: user.id, product_id: productId });
        }
      } catch (err) {
        console.error('Error syncing wishlist:', err);
        // Revert on error? For now, we assume success or user refreshes.
      }
    }
  };

  const clearWishlist = async () => {
    setWishlist([]);
    if (user) {
      await supabase.from('wishlist_items').delete().eq('user_id', user.id);
    } else {
      localStorage.removeItem('ruiz_wishlist');
    }
  };

  const isInWishlist = (productId: string) => wishlist.includes(productId);

  return (
    <WishlistContext.Provider value={{ wishlist, toggleWishlist, isInWishlist, clearWishlist, loading }}>
      {children}
    </WishlistContext.Provider>
  );
};

export const useWishlist = () => {
  const context = useContext(WishlistContext);
  if (!context) throw new Error('useWishlist must be used within WishlistProvider');
  return context;
};
