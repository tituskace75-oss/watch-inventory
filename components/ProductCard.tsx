
import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useWishlist } from '../context/WishlistContext';
import { useCart } from '../context/CartContext';
import { formatCurrency } from '../lib/utils';
import { Icon } from './Icon';
import { FiHeart, FiShoppingBag, FiCheck } from 'react-icons/fi';

interface ProductCardProps {
  id: string;
  slug: string;
  title: string;
  brand: string;
  price: number;
  compareAt?: number;
  image: string;
  badges?: string[];
  // New props for Quick Add
  variantId?: string;
  sku?: string;
  stock?: number;
  model?: string;
}

export const ProductCard: React.FC<ProductCardProps> = ({ 
  id, 
  slug, 
  title, 
  brand, 
  price, 
  compareAt, 
  image,
  badges,
  variantId,
  sku,
  stock = 0,
  model
}) => {
  const navigate = useNavigate();
  const { toggleWishlist, isInWishlist } = useWishlist();
  const { addToCart } = useCart();
  
  const [isAdding, setIsAdding] = useState(false);
  const [justAdded, setJustAdded] = useState(false);

  const handleQuickAdd = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();

    if (!variantId) {
      navigate(`/p/${slug}`);
      return;
    }

    setIsAdding(true);
    addToCart({
      variant_id: variantId,
      product_id: id,
      sku: sku || 'N/A',
      qty: 1,
      title: title,
      model: model || 'Standard',
      brand_name: brand,
      price: price,
      image: image,
      stock: stock
    });

    setTimeout(() => {
      setIsAdding(false);
      setJustAdded(true);
      setTimeout(() => setJustAdded(false), 2000);
    }, 500);
  };

  const isOutOfStock = stock === 0 && variantId !== undefined;

  return (
    <div className="group relative bg-white border border-slate-100 rounded-sm hover:shadow-lg transition-all duration-300 flex flex-col h-full">
      {/* Image Container */}
      <div className="relative aspect-[4/5] overflow-hidden bg-slate-100 rounded-t-sm">
        <Link to={`/p/${slug}`}>
          <img
            src={image || `https://picsum.photos/400/500?random=${id}`}
            alt={title}
            className="h-full w-full object-cover object-center group-hover:scale-105 transition-transform duration-700"
            loading="lazy"
          />
        </Link>
        
        {/* Badges */}
        <div className="absolute top-3 left-3 flex flex-col gap-1 z-10">
          {badges?.map(badge => (
            <span key={badge} className="bg-slate-900 text-white text-[9px] font-bold px-2 py-0.5 uppercase tracking-tighter backdrop-blur-md">
              {badge}
            </span>
          ))}
          {compareAt && compareAt > price && (
            <span className="bg-red-500 text-white text-[9px] font-bold px-2 py-0.5 uppercase tracking-tighter">
              {Math.round(((compareAt - price) / compareAt) * 100)}% OFF
            </span>
          )}
          {isOutOfStock && (
            <span className="bg-slate-500 text-white text-[9px] font-bold px-2 py-0.5 uppercase tracking-tighter">
              Sold Out
            </span>
          )}
        </div>

        {/* Action Buttons */}
        <div className="absolute top-3 right-3 flex flex-col gap-2 opacity-0 group-hover:opacity-100 transition-opacity duration-300 z-10">
          <button 
            onClick={(e) => { e.preventDefault(); toggleWishlist(id); }}
            className={`p-2 rounded-full shadow-sm transition-colors ${isInWishlist(id) ? 'bg-red-50 text-red-500' : 'bg-white hover:bg-slate-50 text-slate-400 hover:text-slate-900'}`}
            title="Add to Wishlist"
          >
            <Icon 
              icon={FiHeart} 
              size={16} 
              className={isInWishlist(id) ? "fill-current" : ""} 
            />
          </button>
        </div>

        {/* Quick Add Overlay (Desktop) */}
        <div className="absolute bottom-0 inset-x-0 translate-y-full group-hover:translate-y-0 transition-transform duration-300 hidden lg:block z-20">
           <button 
            onClick={handleQuickAdd}
            disabled={isOutOfStock || isAdding}
            className={`w-full text-white text-[10px] font-bold uppercase tracking-widest py-3 text-center block transition-colors ${
              justAdded ? 'bg-green-600' : isOutOfStock ? 'bg-slate-400 cursor-not-allowed' : 'bg-slate-900 hover:bg-slate-800'
            }`}
           >
             {justAdded ? (
               <span className="flex items-center justify-center"><Icon icon={FiCheck} className="mr-2"/> Added</span>
             ) : isAdding ? (
               'Adding...'
             ) : isOutOfStock ? (
               'Out of Stock'
             ) : (
               'Add to Cart'
             )}
           </button>
        </div>
      </div>

      {/* Content */}
      <div className="p-4 flex flex-col flex-grow">
        <p className="text-[10px] uppercase tracking-widest text-slate-400 font-bold mb-1">{brand}</p>
        <h3 className="text-sm font-bold text-slate-900 leading-tight mb-2 line-clamp-2 flex-grow">
          <Link to={`/p/${slug}`} className="hover:underline decoration-slate-300 underline-offset-2">
            {title}
          </Link>
        </h3>
        
        <div className="mt-3 flex items-center justify-between border-t border-slate-50 pt-3">
          <div className="flex flex-col">
             {compareAt && compareAt > price && (
                <span className="text-[10px] text-slate-400 line-through mb-0.5">{formatCurrency(compareAt)}</span>
             )}
             <span className="text-sm font-bold text-slate-900">{formatCurrency(price)}</span>
          </div>

          {/* Mobile Quick Add Icon */}
          <button 
            onClick={handleQuickAdd}
            disabled={isOutOfStock || isAdding}
            className={`lg:hidden p-2 rounded-full transition-colors ${
              justAdded ? 'bg-green-100 text-green-600' : 'bg-slate-100 text-slate-900'
            }`}
          >
            <Icon icon={justAdded ? FiCheck : FiShoppingBag} size={16} />
          </button>
        </div>
      </div>
    </div>
  );
};
