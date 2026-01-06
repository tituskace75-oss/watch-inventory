
import React from 'react';
import { Link } from 'react-router-dom';

const MOCK_POSTS = [
  {
    id: 1,
    slug: 'choosing-perfect-smartwatch',
    title: 'How to Choose the Perfect Smartwatch for Your Lifestyle',
    excerpt: 'Navigate the world of wearables with our comprehensive guide to features, battery life, and style.',
    date: 'Oct 12, 2024',
    category: 'Guides',
    image: 'https://images.unsplash.com/photo-1579586337278-3befd40fd17a?q=80&w=1000&auto=format&fit=crop'
  },
  {
    id: 2,
    slug: 'classic-vs-smart',
    title: 'Classic vs. Smart: Which One Suits You?',
    excerpt: 'The eternal debate between analog elegance and digital utility. We break down the pros and cons.',
    date: 'Oct 08, 2024',
    category: 'Style',
    image: 'https://images.unsplash.com/photo-1524592094714-0f0654e20314?q=80&w=1000&auto=format&fit=crop'
  },
  {
    id: 3,
    slug: 'maintenance-101',
    title: 'Watch Maintenance 101: Keeping Your Timepiece Ticking',
    excerpt: 'Simple tips to extend the life of your watch, from cleaning straps to proper storage.',
    date: 'Sep 25, 2024',
    category: 'Care',
    image: 'https://images.unsplash.com/photo-1509048191080-d2984bad6ae5?q=80&w=1000&auto=format&fit=crop'
  },
  {
    id: 4,
    slug: 'gift-guide-2024',
    title: 'The Ultimate Gift Guide for Watch Lovers',
    excerpt: 'Struggling to find the perfect gift? Here are our top picks for every personality type.',
    date: 'Sep 15, 2024',
    category: 'Gifting',
    image: 'https://images.unsplash.com/photo-1513116476489-76db17256053?q=80&w=1000&auto=format&fit=crop'
  }
];

export const BlogList: React.FC = () => {
  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-20">
      <div className="text-center mb-20">
        <span className="text-[10px] font-bold uppercase tracking-[0.4em] text-slate-400 mb-4 block">Editorial</span>
        <h1 className="text-5xl font-bold tracking-tighter mb-6">The Ruiz Journal</h1>
        <p className="text-slate-500 font-light text-lg max-w-2xl mx-auto">
          Stories, style guides, and horological insights for the modern individual.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-x-12 gap-y-16">
        {MOCK_POSTS.map((post) => (
          <article key={post.id} className="group cursor-pointer">
            <Link to={`/blog/${post.slug}`}>
              <div className="aspect-[16/9] bg-slate-100 overflow-hidden rounded-sm mb-6">
                <img 
                  src={post.image} 
                  alt={post.title} 
                  className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105"
                />
              </div>
              <div className="flex items-center space-x-4 mb-3">
                <span className="text-[10px] font-bold uppercase tracking-widest text-slate-900 bg-slate-100 px-2 py-1 rounded-sm">{post.category}</span>
                <span className="text-[10px] font-bold uppercase tracking-widest text-slate-400">{post.date}</span>
              </div>
              <h2 className="text-2xl font-bold tracking-tight mb-3 group-hover:underline decoration-slate-300 underline-offset-4">{post.title}</h2>
              <p className="text-slate-500 font-light leading-relaxed mb-4 line-clamp-2">
                {post.excerpt}
              </p>
              <span className="text-xs font-bold uppercase tracking-widest text-slate-900 border-b border-slate-900 pb-0.5 inline-block">Read Article</span>
            </Link>
          </article>
        ))}
      </div>

      <div className="mt-20 pt-10 border-t border-slate-100 text-center">
        <p className="text-slate-400 text-xs font-light">Showing {MOCK_POSTS.length} of {MOCK_POSTS.length} articles</p>
      </div>
    </div>
  );
};
