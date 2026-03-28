"use client";

import { useEffect, useRef } from "react";

interface BlogChromeProps {
  slug: string;
  exitModal: { heading: string; text: string };
}

export function BlogChrome({ slug, exitModal }: BlogChromeProps) {
  const stickyRef = useRef<HTMLDivElement>(null);
  const modalRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    // Build UTM-aware destination URL for all CTA links
    const params = new URLSearchParams(window.location.search);
    params.set("ref", `blog_${slug}`);
    const ctaDest = `/?${params.toString()}`;

    // Rewrite all CTA links (inside dangerouslySetInnerHTML content + this component)
    document.querySelectorAll<HTMLAnchorElement>(
      '.blog-cta-link, .blog-sticky-btn'
    ).forEach((a) => {
      if (a.getAttribute("href") === "/") a.href = ctaDest;
    });

    // Mixpanel registration
    if (typeof window !== "undefined" && (window as any).mixpanel) {
      (window as any).mixpanel.register({ landing_variant: "blog", blog_slug: slug });
    }

    // Fade-in observer
    const fadeObserver = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) entry.target.classList.add("visible");
        });
      },
      { threshold: 0.1 }
    );
    document.querySelectorAll(".fade-in").forEach((el) => fadeObserver.observe(el));

    // Sticky bar
    const bar = stickyRef.current;
    const bottomCta = document.querySelector(".blog-cta-bottom");
    const dismissKey = `sticky_dismissed_${slug}`;
    let stickyShown = false;

    function showBar() {
      if (stickyShown || !bar || sessionStorage.getItem(dismissKey)) return;
      bar.style.display = "flex";
      stickyShown = true;
    }

    const stickyTimer = setTimeout(showBar, 3000);

    function onScroll() {
      const scrollPct = window.scrollY / (document.body.scrollHeight - window.innerHeight);
      if (scrollPct >= 0.15) showBar();
    }
    window.addEventListener("scroll", onScroll);

    // Hide sticky when bottom CTA visible
    let ctaObserver: IntersectionObserver | undefined;
    if (bottomCta && bar) {
      ctaObserver = new IntersectionObserver(
        (entries) => {
          entries.forEach((entry) => {
            if (bar.style.display === "flex") {
              bar.style.display = entry.isIntersecting ? "none" : "flex";
            }
          });
        },
        { threshold: 0.1 }
      );
      ctaObserver.observe(bottomCta);
    }

    // Dismiss button
    const dismissBtn = bar?.querySelector(".blog-sticky-dismiss");
    function handleDismiss() {
      if (bar) bar.style.display = "none";
      sessionStorage.setItem(dismissKey, "1");
    }
    dismissBtn?.addEventListener("click", handleDismiss);

    // Exit intent (desktop only)
    const modal = modalRef.current;
    const isMobile = "ontouchstart" in window || navigator.maxTouchPoints > 0;
    const exitSessionKey = "exit_intent_shown";
    let exitTimeout: ReturnType<typeof setTimeout> | undefined;

    function onMouseLeave(e: MouseEvent) {
      if (e.clientY > 10) return;
      if (sessionStorage.getItem(exitSessionKey)) return;
      if (modal) modal.style.display = "block";
      sessionStorage.setItem(exitSessionKey, "1");
      document.removeEventListener("mouseleave", onMouseLeave);
    }

    if (!isMobile && modal && !sessionStorage.getItem(exitSessionKey)) {
      exitTimeout = setTimeout(() => {
        document.addEventListener("mouseleave", onMouseLeave);
      }, 5000);
    }

    // Exit modal close handlers
    const overlay = modal?.querySelector(".blog-exit-overlay");
    const closeBtn = modal?.querySelector(".blog-exit-close");
    function dismissModal() {
      if (modal) modal.style.display = "none";
    }
    overlay?.addEventListener("click", dismissModal);
    closeBtn?.addEventListener("click", dismissModal);

    // Scroll depth tracking
    const milestones = [25, 50, 75, 100];
    const fired = new Set<number>();
    function trackScroll() {
      if (!(window as any).mixpanel) return;
      const scrollPct = Math.round(
        (window.scrollY / (document.body.scrollHeight - window.innerHeight)) * 100
      );
      milestones.forEach((m) => {
        if (scrollPct >= m && !fired.has(m)) {
          fired.add(m);
          (window as any).mixpanel.track("blog_scroll_depth", { depth: m, blog_slug: slug });
        }
      });
    }
    window.addEventListener("scroll", trackScroll);

    // CTA view tracking
    const ctaViewObservers: IntersectionObserver[] = [];
    if ((window as any).mixpanel) {
      document.querySelectorAll(".blog-cta-inline, .blog-cta-bottom").forEach((el) => {
        const ctaType = el.classList.contains("blog-cta-inline") ? "inline" : "bottom";
        const obs = new IntersectionObserver(
          (entries) => {
            entries.forEach((entry) => {
              if (entry.isIntersecting) {
                (window as any).mixpanel.track("blog_cta_view", { cta_type: ctaType, blog_slug: slug });
                obs.unobserve(entry.target);
              }
            });
          },
          { threshold: 0.5 }
        );
        obs.observe(el);
        ctaViewObservers.push(obs);
      });
    }

    return () => {
      clearTimeout(stickyTimer);
      clearTimeout(exitTimeout);
      fadeObserver.disconnect();
      ctaObserver?.disconnect();
      ctaViewObservers.forEach((o) => o.disconnect());
      window.removeEventListener("scroll", onScroll);
      window.removeEventListener("scroll", trackScroll);
      dismissBtn?.removeEventListener("click", handleDismiss);
      overlay?.removeEventListener("click", dismissModal);
      closeBtn?.removeEventListener("click", dismissModal);
      document.removeEventListener("mouseleave", onMouseLeave);
    };
  }, [slug]);

  return (
    <>
      <div ref={stickyRef} className="blog-sticky-bar" style={{ display: "none" }}>
        <span>Elena is live &mdash; try it free</span>
        <a href="/" className="blog-sticky-btn">Try Elena</a>
        <button className="blog-sticky-dismiss" aria-label="Dismiss">&times;</button>
      </div>

      <div ref={modalRef} className="blog-exit-modal" style={{ display: "none" }}>
        <div className="blog-exit-overlay" />
        <div className="blog-exit-card">
          <button className="blog-exit-close" aria-label="Close">&times;</button>
          <h2>{exitModal.heading}</h2>
          <p>{exitModal.text}</p>
          <a href="/" className="blog-cta-link">Try Elena Free &rarr;</a>
        </div>
      </div>
    </>
  );
}
