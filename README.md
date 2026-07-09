# NXT.Bargains Frontend

Next.js frontend for the NXT.Bargains Strapi CMS site. It renders product pages, deals articles, coupon pages, store pages, best-seller pages, and blog content from the Strapi backend.

## Stack

- Next.js 15
- React 19
- Tailwind CSS
- Strapi CMS API
- RapidAPI coupon/product data helpers

## Local Setup

```bash
npm install
cp .env.example .env.local
npm run dev
```

Default dev command runs on port `3001`.

## Environment

Important environment variables:

```bash
NEXT_PUBLIC_STRAPI_URL=
STRAPI_INTERNAL_URL=
STRAPI_API_TOKEN=
STRAPI_WRITE_TOKEN=
NEXT_PUBLIC_SITE_URL=
NEXT_PUBLIC_AMAZON_AFFILIATE_TAG=
RAPIDAPI_KEY=
```

Use `.env.example` as the template. Do not commit `.env.local`.

## Production Build

```bash
npm run build
```

On the current server, the frontend is served by:

```bash
systemctl restart nxt-bargains.service
systemctl status nxt-bargains.service --no-pager -l
```

The production service listens locally on port `3008` and is proxied by nginx for `https://nxt.bargains`.

## Useful Commands

```bash
npm run build
systemctl restart nxt-bargains.service
curl -skL --resolve nxt.bargains:443:127.0.0.1 https://nxt.bargains/
```

## Content Sources

- Posts and categories: Strapi NXT.Bargains collections
- Products, offers, reviews, comments: Strapi commerce/NXT collections
- Coupons: local feed helpers and RapidAPI-backed scripts
- Best sellers: JSON caches under `data/`

## Deployment Notes

After code changes:

```bash
npm run build
systemctl restart nxt-bargains.service
```

Then verify the origin directly to avoid public cache confusion:

```bash
curl -skL --resolve nxt.bargains:443:127.0.0.1 https://nxt.bargains/deals
```
