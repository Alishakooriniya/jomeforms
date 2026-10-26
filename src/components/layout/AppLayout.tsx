/* چیدمان اصلی برنامه: منوی کناری + هدر + محتوا */

import { useEffect } from 'react';
import { Outlet, useLocation } from 'react-router-dom';
import { useDisclosure } from '../../lib/hooks';
import { titleForPath } from '../../config/navigation';
import { ORG_NAME } from '../../config/org';
import { Drawer } from '../ui/Drawer';
import { Sidebar } from './Sidebar';
import { Topbar } from './Topbar';

export function AppLayout() {
  const drawer = useDisclosure();
  const location = useLocation();

  useEffect(() => {
    document.title = `${titleForPath(location.pathname)} | ${ORG_NAME}`;
  }, [location.pathname]);

  return (
    <div className="flex min-h-screen bg-bg">
      {/* منوی ثابت دسکتاپ */}
      <aside className="sticky top-0 hidden h-screen w-[248px] shrink-0 border-s border-line lg:block">
        <Sidebar />
      </aside>

      {/* منوی موبایل */}
      <Drawer open={drawer.isOpen} onClose={drawer.close} title={ORG_NAME}>
        <Sidebar onNavigate={drawer.close} showBrand={false} />
      </Drawer>

      <div className="flex min-w-0 flex-1 flex-col">
        <Topbar onOpenMenu={drawer.open} />
        <main className="mx-auto w-full max-w-[1360px] flex-1 px-4 py-4 sm:px-5 lg:px-6 lg:py-5">
          <Outlet />
        </main>
        <footer className="px-4 pb-4 pt-1 text-center text-[10.5px] text-fg-subtle">
          {ORG_NAME} — داده‌ها به‌صورت محلی و ایمن در همین مرورگر ذخیره می‌شوند
        </footer>
      </div>
    </div>
  );
}
