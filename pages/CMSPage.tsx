
import React, { useState, useEffect } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { Icon } from '../components/Icon';
import { FiChevronRight, FiFileText, FiClock, FiShield } from 'react-icons/fi';

const LEGAL_NAV = [
  { label: 'Shipping & Delivery', path: '/legal/shipping', slug: 'legal-shipping' },
  { label: 'Returns & Refunds', path: '/legal/returns', slug: 'legal-returns' },
  { label: 'Warranty Policy', path: '/legal/warranty', slug: 'legal-warranty' },
  { label: 'Privacy Policy', path: '/legal/privacy', slug: 'legal-privacy' },
  { label: 'Terms & Conditions', path: '/legal/terms', slug: 'legal-terms' },
];

const DEFAULT_PAGES: Record<string, { title: string, body: string, updated: string }> = {
  'legal-shipping': {
    title: 'Shipping & Delivery Policy',
    updated: 'October 15, 2024',
    body: `We are committed to delivering your timepiece safely and swiftly.

1. DELIVERY LOCATIONS
We deliver to all 64 districts in Bangladesh. 

2. DELIVERY TIMELINES
• Dhaka City: Within 12–24 hours of order confirmation (if ordered before 2 PM).
• Outside Dhaka: Within 24–48 hours via Steadfast or Pathao Courier.
• Remote Areas: May take up to 3-4 business days depending on courier coverage.

3. SHIPPING CHARGES
• Inside Dhaka: ৳60 Flat Rate.
• Outside Dhaka: ৳120 Flat Rate.
• Free Shipping: On all orders over ৳5,000.

4. ORDER TRACKING
Once your order is packed, you will receive a tracking ID via SMS. You can also track your order on our website under the "Track Order" page using your Order ID and Phone Number.

5. CASH ON DELIVERY (COD)
We offer full Cash on Delivery. However, for orders outside Dhaka, we may request a small security deposit (e.g., delivery charge) for first-time customers to prevent fake orders.

6. INSPECTION POLICY
We allow "Open Box" inspection if permitted by the specific courier service in your area. Please check the package externally for any damage before accepting.`
  },
  'legal-returns': {
    title: 'Return & Refund Policy',
    updated: 'September 01, 2024',
    body: `At Ruiz, we want you to love your watch. If you don't, we're here to help.

1. 7-DAY EASY RETURN
You can return or exchange any item within 7 days of delivery if:
• The product is defective or damaged upon arrival.
• You received the wrong product.
• The product description does not match the physical item.

2. RETURN CONDITIONS
• The item must be unused, unworn, and in the same condition that you received it.
• It must be in the original packaging with all tags, manuals, and warranty cards intact.
• Any free gifts or accessories received must also be returned.

3. REFUND PROCESS
• Once we receive your return, our team will inspect it within 24 hours.
• If approved, we will initiate a refund to your bKash, Nagad, or Bank Account within 48 hours.
• Delivery charges are non-refundable unless the fault is ours (e.g., wrong item sent).

4. HOW TO INITIATE A RETURN
Please contact our support via WhatsApp (01571339897) with your Order ID and a photo/video of the issue. We will arrange a pickup or guide you to the nearest courier drop-off.`
  },
  'legal-warranty': {
    title: 'Warranty Policy',
    updated: 'January 10, 2024',
    body: `We stand by the quality of our curated timepieces.

1. WARRANTY COVERAGE
Most watches sold by Ruiz come with a Brand Warranty ranging from 6 months to 2 years. The specific duration is mentioned on the product page.

2. WHAT IS COVERED?
• Manufacturing defects in the watch movement/engine.
• Battery failure within the first 6 months (for quartz watches).
• Digital module malfunction (for smartwatches).

3. WHAT IS NOT COVERED?
• Physical damage to the glass, case, or strap caused by drops or accidents.
• Water damage if the watch was used beyond its ATM rating (e.g., swimming with a 3ATM watch).
• Normal wear and tear, plating fade over time, or unauthorized repairs.

4. CLAIMING WARRANTY
To claim warranty, please send the watch to our Dhaka service center. You must present the original warranty card or the digital invoice sent to your email. Return shipping costs for warranty claims are shared (customer pays one way).`
  },
  'legal-privacy': {
    title: 'Privacy Policy',
    updated: 'August 20, 2024',
    body: `Your trust is our top priority. This policy outlines how Ruiz collects and uses your data.

1. INFORMATION WE COLLECT
• Personal Details: Name, Phone Number, Email, and Delivery Address to process your orders.
• Order History: To provide support and warranty services.
• Usage Data: Anonymous analytics to improve our website experience.

2. HOW WE USE YOUR DATA
• To process and deliver your orders.
• To send order updates via SMS or WhatsApp.
• To prevent fraud (e.g., verifying COD orders).
• We DO NOT sell or share your personal data with third parties for marketing.

3. DATA SECURITY
We use industry-standard encryption (SSL) to protect your data during transmission. Your payment information is processed securely by our payment partners and is never stored on our servers.

4. YOUR RIGHTS
You can request to view, update, or delete your personal data from our system at any time by contacting support@ruiz.com.bd.`
  },
  'legal-terms': {
    title: 'Terms & Conditions',
    updated: 'August 20, 2024',
    body: `Welcome to Ruiz. By accessing our website, you agree to the following terms.

1. GENERAL
• Ruiz reserves the right to cancel any order due to stock unavailability or suspicion of fraud.
• Prices are subject to change without notice, but confirmed orders will be honored at the booked price.

2. PRODUCT INFORMATION
We strive for accuracy, but errors may occur. If a product's correct price is higher than the listed price, we will contact you before shipping.

3. INTELLECTUAL PROPERTY
All content on this site (images, text, logos) is the property of Ruiz or its brand partners. Unauthorized use is prohibited.

4. LIMITATION OF LIABILITY
Ruiz shall not be liable for any indirect or consequential damages arising from the use of our products.

5. GOVERNING LAW
These terms are governed by the laws of Bangladesh. Any disputes shall be subject to the jurisdiction of the courts in Dhaka.`
  }
};

export const CMSPage: React.FC<{ slug: string }> = ({ slug }) => {
  const [content, setContent] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const location = useLocation();

  useEffect(() => {
    // Scroll to top on slug change
    window.scrollTo(0, 0);
    
    async function fetchPage() {
      setLoading(true);
      try {
        const { data, error } = await supabase
          .from('pages')
          .select('*')
          .eq('slug', slug)
          .single();

        if (error || !data) {
          // Use default content
          const def = DEFAULT_PAGES[slug] || { title: 'Page Not Found', body: 'The requested policy could not be found.', updated: 'N/A' };
          setContent(def);
        } else {
          setContent({
            title: data.title,
            body: data.content?.body || '',
            updated: new Date(data.updated_at).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })
          });
        }
      } catch (err) {
        console.error('Error fetching CMS page:', err);
      } finally {
        setLoading(false);
      }
    }
    fetchPage();
  }, [slug]);

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <div className="animate-pulse flex flex-col items-center">
           <div className="h-8 w-48 bg-slate-200 rounded mb-4"></div>
           <div className="h-4 w-64 bg-slate-200 rounded"></div>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-slate-50 min-h-screen pb-20">
      
      {/* Page Header */}
      <div className="bg-white border-b border-slate-200 py-12 md:py-20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
           <span className="text-[10px] font-bold uppercase tracking-[0.4em] text-slate-400 mb-4 block">Legal Center</span>
           <h1 className="text-3xl md:text-5xl font-bold tracking-tighter text-slate-900 mb-6">Policies & Terms</h1>
           <p className="max-w-2xl mx-auto text-slate-500 font-light text-sm md:text-base">
             Transparency is key to our relationship. Here is everything you need to know about how we operate.
           </p>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-12">
          
          {/* Sidebar Nav */}
          <aside className="lg:col-span-3">
            <div className="sticky top-24">
              <nav className="bg-white border border-slate-200 rounded-sm overflow-hidden shadow-sm">
                <div className="p-4 bg-slate-50 border-b border-slate-100">
                  <span className="text-xs font-bold uppercase tracking-widest text-slate-500">Select Policy</span>
                </div>
                <ul className="divide-y divide-slate-50">
                  {LEGAL_NAV.map((item) => {
                    const isActive = location.pathname === item.path;
                    return (
                      <li key={item.slug}>
                        <Link 
                          to={item.path} 
                          className={`flex items-center justify-between px-5 py-4 text-xs font-bold uppercase tracking-widest transition-all ${
                            isActive 
                              ? 'bg-slate-900 text-white' 
                              : 'text-slate-500 hover:bg-slate-50 hover:text-slate-900'
                          }`}
                        >
                          <span>{item.label}</span>
                          {isActive && <Icon icon={FiChevronRight} />}
                        </Link>
                      </li>
                    );
                  })}
                </ul>
              </nav>
              
              {/* Quick Help Box */}
              <div className="mt-8 bg-blue-50 border border-blue-100 p-6 rounded-sm">
                 <h4 className="text-xs font-bold uppercase tracking-widest text-blue-800 mb-2 flex items-center">
                   <Icon icon={FiShield} className="mr-2"/> Need Help?
                 </h4>
                 <p className="text-xs text-blue-600 mb-4 leading-relaxed">
                   Can't find what you're looking for? Our support team is available to clarify any terms.
                 </p>
                 <a href="https://wa.me/8801571339897" target="_blank" rel="noreferrer" className="text-[10px] font-bold uppercase tracking-widest text-blue-900 border-b border-blue-900 pb-0.5 hover:opacity-70">
                   Chat Support
                 </a>
              </div>
            </div>
          </aside>

          {/* Main Content */}
          <div className="lg:col-span-9">
            <div className="bg-white border border-slate-200 rounded-sm p-8 md:p-12 shadow-sm min-h-[500px]">
               
               <div className="border-b border-slate-100 pb-8 mb-8">
                  <h2 className="text-3xl font-bold tracking-tight text-slate-900 mb-3">{content?.title}</h2>
                  <div className="flex items-center text-xs text-slate-400 font-medium">
                     <Icon icon={FiClock} className="mr-2" size={14} />
                     Last Updated: {content?.updated}
                  </div>
               </div>

               <div className="prose prose-slate max-w-none prose-headings:font-bold prose-headings:tracking-tight prose-p:text-slate-600 prose-p:leading-relaxed prose-li:text-slate-600 prose-strong:text-slate-900 text-sm md:text-base font-light">
                  {/* We handle simple line breaks as paragraphs for the default content */}
                  {content?.body.split('\n').map((line: string, i: number) => {
                    if (!line.trim()) return <br key={i} />;
                    // Simple heuristic for headings in default text (lines ending in colon or short uppercase lines)
                    if (line.trim().length < 50 && (line.trim().endsWith(':') || line === line.toUpperCase())) {
                       // Check if it's a list item
                       if (line.trim().startsWith('•') || /^\d+\./.test(line.trim())) {
                          return <p key={i} className="mb-2 pl-4">{line}</p>;
                       }
                       return <h3 key={i} className="text-lg font-bold text-slate-900 mt-8 mb-4">{line}</h3>;
                    }
                    return <p key={i} className="mb-4">{line}</p>;
                  })}
               </div>

            </div>
          </div>

        </div>
      </div>
    </div>
  );
};
