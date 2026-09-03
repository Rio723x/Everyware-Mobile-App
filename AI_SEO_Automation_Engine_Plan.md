# AI SEO & Content Automation Engine: Architecture & Implementation Plan

> **Project**: Everyware Website (`everyware.in`)  
> **Target Role**: Junior Developer (using **Claude Code CLI**)  
> **Goal**: Build an automated content pipeline for Blogs and User Personas with automatic AI SEO, metadata generation, JSON-LD schema injection, and Vercel deployment.

---

## 1. Executive Summary & Concepts

### What is AI SEO?
Traditional SEO focuses on manual keyword density, backlink checks, and basic meta tag creation.  
**AI SEO (and Generative Engine Optimization - GEO)** goes further:
1. **Automated Metadata Extraction**: Uses LLMs to generate high-converting title tags, meta descriptions, target keywords, OpenGraph share banners, and URL slugs automatically from raw text.
2. **Structured Data Injection (JSON-LD)**: Injects machine-readable schemas (`BlogPosting`, `Person`, `FAQPage`) so search engines and AI engines (ChatGPT Search, Perplexity, Claude, Google SGE) treat Everyware as an authoritative data source.
3. **Semantic Hierarchy & Entity Indexing**: Automatically structures headers (`H1`, `H2`, `H3`), internal links, and micro-summaries so LLMs can summarize and cite your articles in search answers.

---

## 2. High-Level Engine Architecture

```
 ┌────────────────┐     ┌───────────────────────┐     ┌───────────────────────┐
 │ 1. Draft Text  │ ──> │ 2. AI SEO Script      │ ──> │ 3. Automated Metadata │
 │   & Image Drop │     │    (via Claude API)   │     │    & Sitemap Engine   │
 └────────────────┘     └───────────────────────┘     └───────────────────────┘
                                                                  │
                                                                  ▼
 ┌────────────────┐     ┌───────────────────────┐     ┌───────────────────────┐
 │ 5. Auto Vercel │ <── │ 4. Git Commit & Push  │ <── │ 4. Page Generator     │
 │    Deploy      │     │    (Claude Code CLI)  │     │    (React Helmet)    │
 └────────────────┘     └───────────────────────┘     └───────────────────────┘
```

---

## 3. Step-by-Step Implementation Guide for Junior Developer

### Step 1: Define Content Directory (`/content/blogs/` & `/content/personas/`)
Create a markdown folder structure for storing drafts:

```markdown
---
title: "How AI Diagnosis Reduces Home Appliance Repair Costs"
author: "Everyware Engineering"
image: "/assets/blogs/ai-appliance-repair.webp"
date: "2026-09-03"
category: "Smart Home"
---

# Article Raw Content Here...
```

---

### Step 2: Create the AI SEO Script (`scripts/generate-seo.js`)
Write a Node.js automation script using the Anthropic API (or Gemini API) to read raw markdown files, analyze content, and auto-inject generated SEO parameters into the frontmatter.

```javascript
// scripts/generate-seo.js
import fs from 'fs';
import path from 'path';
import matter from 'gray-matter';
import { Anthropic } from '@anthropic-ai/sdk';

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

async function processSEO(filePath) {
  const fileContent = fs.readFileSync(filePath, 'utf8');
  const { data: frontmatter, content } = matter(fileContent);

  const prompt = `
  You are an AI SEO specialist for Everyware (smart home appliance repair app).
  Analyze the article below and return ONLY a valid JSON object matching this schema:
  {
    "seoTitle": "50-60 character click-worthy title tag",
    "metaDescription": "140-150 character meta description with clear value proposition",
    "keywords": ["array", "of", "8", "long-tail", "keywords"],
    "slug": "url-friendly-slug",
    "summary": "2-sentence micro-summary for AI crawlers",
    "jsonLdSchema": {
      "@context": "https://schema.org",
      "@type": "BlogPosting",
      "headline": "...",
      "description": "...",
      "author": { "@type": "Organization", "name": "Everyware" }
    }
  }

  Article Draft:
  ${content}
  `;

  const response = await anthropic.messages.create({
    model: 'claude-3-5-sonnet-20241022',
    max_tokens: 1000,
    messages: [{ role: 'user', content: prompt }]
  });

  const seoResults = JSON.parse(response.content[0].text);

  // Merge generated AI SEO metadata with existing frontmatter
  const updatedFrontmatter = { ...frontmatter, ...seoResults };
  const updatedFile = matter.stringify(content, updatedFrontmatter);

  fs.writeFileSync(filePath, updatedFile);
  console.log(`✅ AI SEO successfully generated for ${filePath}`);
}

const fileArg = process.argv[2];
if (fileArg) processSEO(fileArg);
```

---

### Step 3: Inject Dynamic Meta Tags & Schema in React (`react-helmet-async`)

#### What Is It & Why Is It Required?
When a link is shared on **WhatsApp, LinkedIn, Twitter**, or crawled by **Google & AI Search Engines (ChatGPT, Perplexity)**, crawlers read hidden tags inside the HTML `<head>`.

Because Everyware is a **React Single Page Application (SPA)**, there is only **one global `index.html` file**. Without `react-helmet-async`, every single blog post or persona page would share the exact same homepage title and image preview on WhatsApp! `react-helmet-async` dynamically updates the browser `<head>` tags for each unique article URL on the fly.

#### Implementation Steps:

**1. Install Package**:
```bash
npm install react-helmet-async
```

**2. Wrap `src/main.jsx` with `<HelmetProvider>`**:
```jsx
// src/main.jsx
import React from 'react';
import ReactDOM from 'react-dom/client';
import { HelmetProvider } from 'react-helmet-async';
import App from './App';

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <HelmetProvider>
      <App />
    </HelmetProvider>
  </React.StrictMode>
);
```

**3. Use `<Helmet>` in the Blog / Persona Page Component**:
```jsx
// src/components/BlogPostTemplate.jsx
import React from 'react';
import { Helmet } from 'react-helmet-async';

export default function BlogPostTemplate({ post }) {
  return (
    <>
      <Helmet>
        {/* Primary Google Search Meta Tags */}
        <title>{post.seoTitle}</title>
        <meta name="description" content={post.metaDescription} />
        <meta name="keywords" content={post.keywords.join(', ')} />
        <link rel="canonical" href={`https://everyware.in/blog/${post.slug}`} />

        {/* WhatsApp & LinkedIn Share Preview Card */}
        <meta property="og:type" content="article" />
        <meta property="og:title" content={post.seoTitle} />
        <meta property="og:description" content={post.metaDescription} />
        <meta property="og:image" content={`https://everyware.in${post.image}`} />
        <meta property="og:url" content={`https://everyware.in/blog/${post.slug}`} />

        {/* Twitter/X Share Preview Card */}
        <meta name="twitter:card" content="summary_large_image" />
        <meta name="twitter:title" content={post.seoTitle} />
        <meta name="twitter:description" content={post.metaDescription} />
        <meta name="twitter:image" content={`https://everyware.in${post.image}`} />

        {/* Structured AI SEO Schema for ChatGPT, Perplexity & Google SGE */}
        <script type="application/ld+json">
          {JSON.stringify(post.jsonLdSchema)}
        </script>
      </Helmet>

      <article className="blog-container">
        <h1>{post.title}</h1>
        <img src={post.image} alt={post.seoTitle} />
        <div className="blog-content">{post.content}</div>
      </article>
    </>
  );
}
```

#### Quick Reference: What Each Meta Tag Does

| Meta Tag | Purpose & Output | Target Audience |
| :--- | :--- | :--- |
| `<title>` | Sets tab name and Google's clickable blue headline link | Google Search & Users |
| `<meta name="description">` | Sets the 2-line snippet text below search title | Google Search |
| `<meta property="og:image">` | Sets the thumbnail card image when sharing link | WhatsApp, LinkedIn, Facebook |
| `<meta name="twitter:image">` | Sets the large image banner preview | Twitter / X |
| `<script type="application/ld+json">` | Provides machine-readable structured JSON about author & article | ChatGPT Search, Perplexity, Google SGE |

---

### Step 4: Automate Sitemap & Index Update (`scripts/generate-sitemap.js`)
Create a script to automatically parse all posts in `/content/blogs/` and build/update `public/sitemap.xml` on build.

---

### Step 5: Execute via **Claude Code CLI** Workflow

Whenever a new article or user persona is ready to publish, your junior developer executes a single command in **Claude Code**:

```bash
claude "Create a new blog file in content/blogs/ac-maintenance.md using the provided article text, add the image to public/assets/blogs/ac-maintenance.jpg, run node scripts/generate-seo.js content/blogs/ac-maintenance.md, verify npm run build passes with 0 errors, and commit and push to origin main."
```

#### What Claude Code Will Execute Automatically:
1. **File Creation**: Writes raw article draft + saves the image asset.
2. **AI SEO Run**: Executes `node scripts/generate-seo.js` to compute and attach `seoTitle`, `metaDescription`, `keywords`, `slug`, and `jsonLdSchema`.
3. **Build Validation**: Runs `npm run build` to confirm 0 compilation errors.
4. **Git Operations**: Stages changes, commits with `feat(blog): publish ac-maintenance with AI SEO`, and pushes to `origin main`.
5. **Auto Deployment**: Vercel picks up the push and automatically deploys the live blog page to `https://everyware.in`.

---

## 4. Checklist for Developer

- [ ] Create `/content/blogs/` and `/content/personas/` directories.
- [ ] Install `@anthropic-ai/sdk` and `gray-matter`.
- [ ] Add `scripts/generate-seo.js` and test locally.
- [ ] Add `react-helmet-async` for head meta tag and JSON-LD schema injection.
- [ ] Run test publication using Claude Code CLI workflow.
