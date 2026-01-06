
import React from 'react';
import { HashRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { CartProvider } from './context/CartContext';
import { WishlistProvider } from './context/WishlistContext';
import { AuthProvider, useAuth } from './context/AuthContext';
import { Layout } from './components/Layout';
import { AdminLayout } from './components/AdminLayout'; // Import AdminLayout
import { Home } from './pages/Home';
import { Shop } from './pages/Shop';
import { ProductDetail } from './pages/ProductDetail';
import { Cart } from './pages/Cart';
import { Checkout } from './pages/Checkout';
import { Success } from './pages/Success';
import { TrackOrder } from './pages/TrackOrder';
import { Wishlist } from './pages/Wishlist';
import { Login } from './pages/Login';
import { Signup } from './pages/Signup';
import { Account } from './pages/Account';
import { OrderList } from './pages/OrderList';
import { OrderDetails } from './pages/OrderDetails';
import { CMSPage } from './pages/CMSPage';
import { Contact } from './pages/Contact';
import { Wholesale } from './pages/Wholesale';
import { About } from './pages/About'; // Import About
import { FAQ } from './pages/FAQ'; // Import FAQ
import { BlogList } from './pages/BlogList';
import { BlogPost } from './pages/BlogPost';
import { AdminLoginRedirect } from './pages/AdminLoginRedirect';
import { AdminDashboard } from './pages/AdminDashboard';
import { AdminProductList } from './pages/AdminProductList';
import { AdminProductForm } from './pages/AdminProductForm';
import { AdminInventory } from './pages/AdminInventory';
import { AdminOrderList } from './pages/AdminOrderList';
import { AdminOrderDetails } from './pages/AdminOrderDetails';
import { AdminCustomers } from './pages/AdminCustomers';
import { AdminCoupons } from './pages/AdminCoupons';
import { AdminReviews } from './pages/AdminReviews';
import { AdminBlogList } from './pages/AdminBlogList';
import { AdminBlogPost } from './pages/AdminBlogPost';
import { AdminSettings } from './pages/AdminSettings';
import { AdminLoyalty } from './pages/AdminLoyalty';
import { AdminShipping } from './pages/AdminShipping';
import { AdminReports } from './pages/AdminReports';
import { AdminContactEditor } from './pages/AdminContactEditor';

const ProtectedRoute = ({ children }: { children: React.ReactNode }) => {
  const { user, loading } = useAuth();
  if (loading) return null;
  if (!user) return <Navigate to="/login" replace />;
  return <>{children}</>;
};

const App: React.FC = () => {
  return (
    <Router>
      <AuthProvider>
        <WishlistProvider>
          <CartProvider>
            <Routes>
              {/* ADMIN ROUTES (Protected by AdminLayout) */}
              <Route path="/admin" element={<AdminLayout />}>
                <Route index element={<Navigate to="dashboard" replace />} />
                <Route path="dashboard" element={<AdminDashboard />} />
                <Route path="products" element={<AdminProductList />} />
                <Route path="products/new" element={<AdminProductForm />} />
                <Route path="products/:id" element={<AdminProductForm />} />
                <Route path="inventory" element={<AdminInventory />} />
                <Route path="orders" element={<AdminOrderList />} />
                <Route path="orders/:orderNumber" element={<AdminOrderDetails />} />
                <Route path="customers" element={<AdminCustomers />} />
                <Route path="coupons" element={<AdminCoupons />} />
                <Route path="reviews" element={<AdminReviews />} />
                
                {/* Admin Content Routes */}
                <Route path="content/blog" element={<AdminBlogList />} />
                <Route path="content/blog/new" element={<AdminBlogPost />} />
                <Route path="content/blog/:id" element={<AdminBlogPost />} />
                <Route path="content/contact" element={<AdminContactEditor />} />
                
                {/* Site Settings */}
                <Route path="settings" element={<AdminSettings />} />
                
                {/* Loyalty & Referrals */}
                <Route path="loyalty" element={<AdminLoyalty />} />
                
                {/* Shipping & Currency */}
                <Route path="shipping" element={<AdminShipping />} />
                
                {/* Reports & Analytics */}
                <Route path="reports" element={<AdminReports />} />

                {/* Catch-all for admin */}
                <Route path="*" element={<div className="p-8 text-center text-slate-400 uppercase font-bold text-xs tracking-widest">Page Under Construction</div>} />
              </Route>

              {/* ADMIN LOGIN REDIRECT */}
              <Route path="/admin/login" element={<AdminLoginRedirect />} />

              {/* PUBLIC STORE ROUTES (Wrapped in Main Layout) */}
              <Route path="*" element={
                <Layout>
                  <Routes>
                    <Route path="/" element={<Home />} />
                    <Route path="/shop" element={<Shop />} />
                    <Route path="/search" element={<Shop />} />
                    <Route path="/c/:collectionSlug" element={<Shop />} />
                    <Route path="/p/:productSlug" element={<ProductDetail />} />
                    <Route path="/cart" element={<Cart />} />
                    <Route path="/checkout" element={<Checkout />} />
                    <Route path="/success/:orderId" element={<Success />} />
                    
                    <Route path="/track-order" element={<TrackOrder />} />
                    <Route path="/track" element={<Navigate to="/track-order" replace />} />

                    <Route path="/wishlist" element={<Wishlist />} />
                    
                    {/* Auth Routes */}
                    <Route path="/login" element={<Login />} />
                    <Route path="/register" element={<Signup />} />
                    <Route path="/signup" element={<Navigate to="/register" replace />} />
                    
                    {/* Account Routes */}
                    <Route path="/account" element={<ProtectedRoute><Account /></ProtectedRoute>} />
                    <Route path="/account/orders" element={<ProtectedRoute><OrderList /></ProtectedRoute>} />
                    <Route path="/account/orders/:orderNumber" element={<ProtectedRoute><OrderDetails /></ProtectedRoute>} />

                    {/* Trust & Business */}
                    <Route path="/about" element={<About />} />
                    <Route path="/contact" element={<Contact />} />
                    <Route path="/faq" element={<FAQ />} />
                    <Route path="/wholesale" element={<Wholesale />} />
                    
                    {/* Blog */}
                    <Route path="/blog" element={<BlogList />} />
                    <Route path="/blog/:slug" element={<BlogPost />} />

                    {/* Legal */}
                    <Route path="/legal/shipping" element={<CMSPage slug="legal-shipping" />} />
                    <Route path="/legal/returns" element={<CMSPage slug="legal-returns" />} />
                    <Route path="/legal/warranty" element={<CMSPage slug="legal-warranty" />} />
                    <Route path="/legal/privacy" element={<CMSPage slug="legal-privacy" />} />
                    <Route path="/legal/terms" element={<CMSPage slug="legal-terms" />} />

                    {/* Fallback */}
                    <Route path="*" element={<Home />} />
                  </Routes>
                </Layout>
              } />
            </Routes>
          </CartProvider>
        </WishlistProvider>
      </AuthProvider>
    </Router>
  );
};

export default App;
