import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { BLOG_POSTS, BLOG_INDEX, getBlogPost } from "@/lib/blog-data";
import { BlogChrome } from "../_components/blog-chrome";
import Link from "next/link";
import Script from "next/script";
import "../blog.css";

export function generateStaticParams() {
  return BLOG_POSTS.map((post) => ({ slug: post.slug }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const post = getBlogPost(slug);
  if (!post) return {};
  return {
    title: `${post.title} | Elena`,
    description: post.description,
    openGraph: {
      title: post.ogTitle,
      description: post.ogDescription,
      type: "article",
      url: `https://elena-health.com/blog/${post.slug}`,
    },
    alternates: { canonical: `https://elena-health.com/blog/${post.slug}` },
  };
}

export default async function BlogPostPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const post = getBlogPost(slug);
  if (!post) notFound();

  return (
    <div data-blog-slug={post.slug}>
      <Script
        id="ld-json"
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(post.ldJson) }}
      />

      <nav className="blog-nav">
        <Link href="/" className="blog-nav-logo">
          <img src="/images/elena-icon.png" alt="Elena" className="blog-nav-icon" />
          <span>elena</span>
        </Link>
      </nav>

      <header className="blog-header">
        <span className="blog-category">{post.category}</span>
        <h1
          dangerouslySetInnerHTML={{
            __html: post.htmlTitle,
          }}
        />
        <div className="blog-byline">
          <span>By {post.author}</span>
          <span>{post.date}</span>
          <span>{post.readTime}</span>
        </div>
      </header>

      <article
        className="blog-content"
        dangerouslySetInnerHTML={{ __html: post.content }}
      />

      <section className="blog-cta-bottom fade-in">
        <div className="blog-cta-bottom-inner">
          <h2>{post.bottomCta.heading}</h2>
          <p>{post.bottomCta.text}</p>
          <a href="/" className="blog-cta-link">
            Try Elena Free &rarr;
          </a>
        </div>
      </section>

      <footer className="blog-footer">
        <div className="footer-inner">
          <div className="footer-brand">elena</div>
          <p className="footer-tagline">Put healthcare on autopilot.</p>
          <div className="footer-resources">
            {BLOG_INDEX.map((p) => (
              <Link key={p.slug} href={`/blog/${p.slug}`}>
                {p.title}
              </Link>
            ))}
          </div>
        </div>
        <div className="footer-bottom">
          <span>&copy; 2026 Elena AI. All rights reserved.</span>
          <span>Made with love in NYC</span>
        </div>
        <div className="footer-fine-print">
          Elena helps you navigate healthcare costs and logistics &mdash; not a
          substitute for medical advice.
        </div>
      </footer>

      <BlogChrome slug={post.slug} exitModal={post.exitModal} />
    </div>
  );
}
