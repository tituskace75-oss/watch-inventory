
import React, { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { supabase } from '../lib/supabase';
import { Icon } from '../components/Icon';
import { FiLoader } from 'react-icons/fi';

const ADMIN_ROLES = ['super_admin', 'catalog_manager', 'order_manager', 'content_manager'];

export const AdminLoginRedirect: React.FC = () => {
  const { user, loading } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (loading) return;

    // 1. Not Logged In -> Go to Login
    if (!user) {
      navigate('/login?next=/admin', { replace: true });
      return;
    }

    // 2. Logged In -> Check Permissions
    const checkRole = async () => {
      try {
        const { data: userRoles } = await supabase
          .from('user_roles')
          .select('role:roles(name)')
          .eq('user_id', user.id);

        const roleNames = userRoles?.map((r: any) => r.role?.name) || [];
        const isAdmin = roleNames.some((r: string) => ADMIN_ROLES.includes(r));

        if (isAdmin) {
          navigate('/admin/dashboard', { replace: true });
        } else {
          // Logged in but not an admin
          navigate('/account', { replace: true });
        }
      } catch (error) {
        console.error('Role check failed:', error);
        navigate('/account', { replace: true });
      }
    };

    checkRole();
  }, [user, loading, navigate]);

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-white">
      <Icon icon={FiLoader} className="animate-spin text-slate-900 mb-4" size={32} />
      <p className="text-xs font-bold uppercase tracking-widest text-slate-400">Verifying Access...</p>
    </div>
  );
};
