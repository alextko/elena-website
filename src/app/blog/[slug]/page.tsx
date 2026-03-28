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
        id="mixpanel"
        strategy="afterInteractive"
        dangerouslySetInnerHTML={{
          __html: `(function(f,b){if(!b.__SV){var e,g,i,h;window.mixpanel=b;b._i=[];b.init=function(e,f,c){function g(a,d){var b=d.split(".");2==b.length&&(a=a[b[0]],d=b[1]);a[d]=function(){a.push([d].concat(Array.prototype.slice.call(arguments,0)))}}var a=b;"undefined"!==typeof c?a=b[c]=[]:c="mixpanel";a.people=a.people||[];a.toString=function(a){var d="mixpanel";"mixpanel"!==c&&(d+="."+c);a||(d+=" (stub)");return d};a.people.toString=function(){return a.toString(1)+".people (stub)"};i="disable time_event track track_pageview track_links track_forms track_with_groups add_group set_group remove_group register register_once alias unregister identify name_tag set_config reset opt_in_tracking opt_out_tracking has_opted_in_tracking has_opted_out_tracking clear_opt_in_out_tracking start_batch_senders people.set people.set_once people.unset people.increment people.append people.union people.track_charge people.clear_charges people.delete_user people.remove".split(" ");for(h=0;h<i.length;h++)g(a,i[h]);var j="set set_once union unset remove delete".split(" ");a.get_group=function(){function b(c){d[c]=function(){call2_args=arguments;call2=[c].concat(Array.prototype.slice.call(call2_args,0));a.push([e,call2])}}for(var d={},e=["get_group"].concat(Array.prototype.slice.call(arguments,0)),c=0;c<j.length;c++)b(j[c]);return d};b._i.push([e,f,c])};b.__SV=1.2;e=f.createElement("script");e.type="text/javascript";e.async=!0;e.src="//cdn.mxpnl.com/libs/mixpanel-2-latest.min.js";g=f.getElementsByTagName("script")[0];g.parentNode.insertBefore(e,g)}})(document,window.mixpanel||[]);mixpanel.init("e9b69d05debaeec0b454f2cdfba21d2d",{record_sessions_percent:100,record_mask_text_selector:""});mixpanel.track_pageview();`,
        }}
      />
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
