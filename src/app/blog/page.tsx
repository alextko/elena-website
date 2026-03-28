import type { Metadata } from "next";
import { BLOG_INDEX } from "@/lib/blog-data";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Resources | Elena",
  description:
    "Healthcare guides, cost breakdowns, and tips from the Elena team. Learn how to navigate bills, insurance, and care like a pro.",
  openGraph: {
    title: "Resources | Elena",
    description: "Healthcare guides, cost breakdowns, and tips from the Elena team.",
    type: "website",
    url: "https://elena-health.com/blog",
  },
  alternates: { canonical: "https://elena-health.com/blog" },
};

export default function BlogIndex() {
  return (
    <div
      style={{
        fontFamily: "var(--font-inter), -apple-system, BlinkMacSystemFont, sans-serif",
        color: "#1a1a2e",
        background: "#ffffff",
        minHeight: "100vh",
      }}
    >
      <nav
        style={{
          padding: "20px 32px",
          borderBottom: "1px solid rgba(15, 27, 61, 0.06)",
        }}
      >
        <Link
          href="/"
          style={{
            color: "#0F1B3D",
            fontSize: "1.2rem",
            fontWeight: 600,
            textDecoration: "none",
            letterSpacing: "-0.01em",
          }}
        >
          elena
        </Link>
      </nav>

      <main
        style={{
          maxWidth: 640,
          margin: "0 auto",
          padding: "80px 24px 120px",
        }}
      >
        <h1
          style={{
            fontFamily: "var(--font-dm-serif), serif",
            fontSize: "2.2rem",
            fontWeight: 400,
            letterSpacing: "-0.02em",
            marginBottom: 12,
          }}
        >
          Resources
        </h1>
        <p
          style={{
            fontSize: "1rem",
            fontWeight: 300,
            color: "#5a6a82",
            lineHeight: 1.6,
            marginBottom: 48,
          }}
        >
          Guides and stories from the Elena team on navigating healthcare costs,
          insurance, and the system.
        </p>

        <ul style={{ listStyle: "none", display: "flex", flexDirection: "column" }}>
          {BLOG_INDEX.map((post, i) => (
            <li
              key={post.slug}
              style={{
                borderTop: "1px solid rgba(15, 27, 61, 0.08)",
                ...(i === BLOG_INDEX.length - 1
                  ? { borderBottom: "1px solid rgba(15, 27, 61, 0.08)" }
                  : {}),
              }}
            >
              <Link
                href={`/blog/${post.slug}`}
                style={{
                  display: "block",
                  padding: "24px 0",
                  textDecoration: "none",
                  color: "inherit",
                }}
              >
                <h2
                  style={{
                    fontSize: "1.1rem",
                    fontWeight: 500,
                    letterSpacing: "-0.01em",
                    marginBottom: 6,
                    color: "#0F1B3D",
                  }}
                >
                  {post.title}
                </h2>
                <p
                  style={{
                    fontSize: "0.88rem",
                    fontWeight: 300,
                    color: "#5a6a82",
                    lineHeight: 1.5,
                  }}
                >
                  {post.description}
                </p>
              </Link>
            </li>
          ))}
        </ul>

        <div style={{ marginTop: 48 }}>
          <Link
            href="/"
            style={{
              fontSize: "0.88rem",
              fontWeight: 400,
              color: "#5a6a82",
              textDecoration: "none",
            }}
          >
            &larr; Back to elena-health.com
          </Link>
        </div>
      </main>
    </div>
  );
}
