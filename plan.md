# Implementation Plan

## Problem Statement
The user wants to upgrade the UzumBot ecosystem (Bot, WebApp, Admin Panel) to be "production-ready", "wow", and "smooth". Key requirements include fixing auth issues, improving UI/UX (20+ improvements), adding a "view photos" feature for reviews, and implementing engaging bot features.

## Proposed Approach
We will tackle this in layers:
1.  **Core Reliability**: Ensure Auth and Data flow is 100% stable.
2.  **Admin UX**: Enhance the Admin Panel with better data visualization (photos) and management tools.
3.  **WebApp UX**: Make the Mini App feel native with animations, haptics, and skeleton loaders.
4.  **Bot Features**: Add "Wow" factors like generated profile cards and inline search.

## Todos

### 1. Core Reliability & Auth
- [x] **WebApp Auth Hardening**: Add retry logic for `initData` and better loading states in `useTelegramAuth`.
- [x] **Backend Auth**: Verify `initData` validation is robust (Completed).
- [x] **Admin Auth Fix**: Seeded test admins and verified login flow.
- [x] **Bulk Actions Fix**: Added error handling to prevent 502 errors during bulk approval notifications.

### 2. Admin Panel Improvements
- [x] **Seed Data**: Update seed script with real Unsplash photos for products/submissions.
- [x] **Photo Gallery in Table**: Show thumbnails directly in the Submissions table (verified).
- [x] **Admin CRUD**: Verified Add/Edit functionality including Force 2FA.

### 3. WebApp UI/UX (The "20 Improvements")
- [x] **Transitions**: Added page transition animations (framer-motion).
- [x] **Haptic Feedback**: Added `Telegram.WebApp.HapticFeedback` to buttons.
- [x] **Confetti**: Trigger confetti on successful spin.

### 4. Bot "Wow" Features
- [x] **Inline Search**: Implemented `InlineQueryHandler` to search products from any chat.
- [x] **Deep Linking**: Added support for `start=review_{id}` to quickly review a product.
- [ ] **Profile Card Generator**: Create a backend endpoint that generates a stats card image (Pillow) and sends it.
- [ ] **Referral Visuals**: Generate a QR code image for their referral link.

## Execution Order
1.  Fix WebApp Auth (Critical).
2.  Implement Admin Photo Thumbnails (User Request).
3.  Implement Bot Profile Card (Wow Factor).
4.  Implement WebApp Haptics & Skeletons (UX).
