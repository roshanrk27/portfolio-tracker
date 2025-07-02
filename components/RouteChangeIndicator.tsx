"use client";

import { useEffect, useRef } from "react";
import { usePathname } from "next/navigation";
import NProgress from "nprogress";

export default function RouteChangeIndicator() {
  const pathname = usePathname();
  const timer = useRef<NodeJS.Timeout | null>(null);
  const prevPath = useRef(pathname);

  useEffect(() => {
    // If the path changes, start NProgress
    if (prevPath.current !== pathname) {
      NProgress.start();
      // Simulate a short delay for demo; in real use, NProgress.done() should be called when page data is loaded
      if (timer.current) clearTimeout(timer.current);
      timer.current = setTimeout(() => {
        NProgress.done();
      }, 600); // Adjust as needed
      prevPath.current = pathname;
    }
    // Clean up on unmount
    return () => {
      if (timer.current) clearTimeout(timer.current);
    };
  }, [pathname]);

  return null;
} 