"use client";

import { useEffect } from "react";

export default function SwRegister() {
  useEffect(() => {
    if ("serviceWorker" in navigator) {
      navigator.serviceWorker.register("/sw.js").catch(() => {
        // PWA install still works without it in most cases; don't cry about it
      });
    }
  }, []);
  return null;
}
