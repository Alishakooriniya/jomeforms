/* چیدمان اصلی برنامه: منوی کناری + هدر + محتوا */

import { useEffect } from 'react';
import { Outlet, useLocation } from 'react-router-dom';
import { useDisclosure } from '../../lib/hooks';
import { useDb } from '../../store/DataProvider';
import { titleForPath } from '../../config/navigation';
import { Drawer } from '../ui/Drawer';
import { Sidebar } from './Sidebar';
import { Topbar } from './Topbar';

export function AppLayout() {
  const drawer = useDisclosure();
  const location = useLocation();
  const { settings } = useDb();

  useEffect(() => {
    document.title = `${titleForPath(location.pathname)} | Jome Forms`;
  }, [location.pathname, settings.orgName]);

  return (
    <div className="flex min-h-screen bg-bg">
      {/* منوی ثابت دسکتاپ */}
      <aside className="sticky top-0 hidden h-screen w-[280px] shrink-0 border-s border-line lg:block">
        <Sidebar />
      </aside>

      {/* منوی موبایل */}
      <Drawer open={drawer.isOpen} onClose={drawer.close} title={settings.orgName}>
        <Sidebar onNavigate={drawer.close} />
      </Drawer>

      <div className="flex min-w-0 flex-1 flex-col">
        <Topbar onOpenMenu={drawer.open} />
        <main className="mx-auto w-full max-w-[1440px] flex-1 p-4 sm:p-5 lg:p-7">
          <Outlet />
        </main>
        <footer className="px-4 pb-5 pt-2 text-center text-[12px] text-fg-subtle">
          Jome Forms — داده‌ها به‌صورت محلی در مرورگر ذخیره می‌شوند
        </footer>
      </div>
    </div>
  );
}
