
'use client';

import Link from 'next/link';

export function AppFooter() {
  return (
    <footer className="bg-background border-t py-6 px-4 sm:px-6 text-center">
      <div className="container mx-auto text-sm text-muted-foreground">
        <p className="font-semibold">Developed by RemotizedIT</p>
        <div className="flex justify-center items-center gap-x-4 gap-y-1 flex-wrap mt-2">
          <Link href="https://www.remotizedit.com" target="_blank" rel="noopener noreferrer" className="hover:text-primary">
            Visit: www.remotizedit.com
          </Link>
          <span className="hidden sm:inline">|</span>
          <a href="tel:+8809649174632" className="hover:text-primary">
            Phone: +8809649-174632
          </a>
          <span className="hidden sm:inline">|</span>
          <a href="mailto:info@remotizedit.com" className="hover:text-primary">
            Email: info@remotizedit.com
          </a>
        </div>
        <p className="mt-4 text-xs">&copy; {new Date().getFullYear()} All rights reserved</p>
      </div>
    </footer>
  );
}
