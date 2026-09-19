"use client";

import { useEffect, useState } from "react";

/**
 * Client-side deterrents for demo accounts. These DISCOURAGE copying and make
 * screenshots traceable — they are not a security boundary. The real protection
 * is server-side: demo accounts cannot write or generate PDFs.
 */
export function DemoGuard({ email }: { email: string }) {
  const [obscured, setObscured] = useState(false);
  const stamp = new Date().toLocaleString("en-AE", { timeZone: "Asia/Dubai" });

  useEffect(() => {
    const block = (e: Event) => {
      e.preventDefault();
      return false;
    };
    const events: (keyof DocumentEventMap)[] = ["copy", "cut", "contextmenu", "dragstart"];
    events.forEach((ev) => document.addEventListener(ev, block));

    // Blur content when the tab/window loses focus (deters some capture tools).
    const onHide = () => setObscured(document.visibilityState === "hidden");
    const onBlur = () => setObscured(true);
    const onFocus = () => setObscured(false);
    document.addEventListener("visibilitychange", onHide);
    window.addEventListener("blur", onBlur);
    window.addEventListener("focus", onFocus);

    return () => {
      events.forEach((ev) => document.removeEventListener(ev, block));
      document.removeEventListener("visibilitychange", onHide);
      window.removeEventListener("blur", onBlur);
      window.removeEventListener("focus", onFocus);
    };
  }, []);

  const tile = `DEMO · ${email} · ${stamp}`;

  return (
    <>
      {/* Repeating diagonal watermark across the whole viewport */}
      <div aria-hidden className="demo-watermark">
        <div className="demo-watermark-inner">
          {Array.from({ length: 60 }).map((_, i) => (
            <span key={i}>{tile}</span>
          ))}
        </div>
      </div>

      {/* Read-only banner */}
      <div className="demo-banner">
        Demo mode — viewing only. Saving, downloads and copying are disabled.
      </div>

      {/* Focus-loss blur overlay */}
      {obscured && (
        <div className="demo-obscure">
          <span>Preview hidden — return focus to the window</span>
        </div>
      )}
    </>
  );
}
