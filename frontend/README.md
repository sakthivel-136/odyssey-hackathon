This is a [Next.js](https://nextjs.org) project bootstrapped with [`create-next-app`](https://nextjs.org/docs/app/api-reference/cli/create-next-app).

## Getting Started

First, run the development server:

```bash
npm run dev
# or
yarn dev
# or
pnpm dev
# or
bun dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

You can start editing the page by modifying `app/page.tsx`. The page auto-updates as you edit the file.

This project uses [`next/font`](https://nextjs.org/docs/app/building-your-application/optimizing/fonts) to automatically optimize and load [Geist](https://vercel.com/font), a new font family for Vercel.

## Learn More

To learn more about Next.js, take a look at the following resources:

- [Next.js Documentation](https://nextjs.org/docs) - learn about Next.js features and API.
- [Learn Next.js](https://nextjs.org/learn) - an interactive Next.js tutorial.

You can check out [the Next.js GitHub repository](https://github.com/vercel/next.js) - your feedback and contributions are welcome!

## 🎨 Smart Medibox Motion Design System (`/components/ui/motion`)

Smart Medibox uses a tailored, healthcare-grade motion design system built on **Next.js 16 + Tailwind CSS + Framer Motion**. It guarantees WCAG AA contrast standards, mobile responsiveness at 60fps, and automatic fallback for `prefers-reduced-motion`.

### 📦 Reusable Components & Usage

| Component | Description | Example Usage |
| :--- | :--- | :--- |
| `<AnimatedBackground />` | Drifting blurred mesh blobs (blue/emerald/sky) with 5% floating medical particles | `<AnimatedBackground />` in layout.tsx |
| `<TopProgressBar />` | Thin animated route transition gradient bar | `<TopProgressBar />` in layout.tsx |
| `<PageLoader message="..." />` | Branded full-screen splash loader with scaling logo & splitting/filling pill capsule | `<PageLoader message="Connecting..." />` |
| `<Skeleton />` / `<CardSkeleton />` / `<TimelineSkeleton />` / `<ReportsSkeleton />` / `<MedicineListSkeleton />` | Reusable linear shimmer sweep skeleton loaders matching actual component layouts | `<TimelineSkeleton />` |
| `<MotionButton variant="..." loading={bool} success={bool} error={bool} />` | Interactive button with hover lift, tap scale, and morphing heartbeat / check / shake states | `<MotionButton loading={loading}>Save</MotionButton>` |
| `<SyncPulse status="ONLINE"|"OFFLINE"|"SYNCING" label="..." />` | Concentric radar-style pulsing rings around device status with live Wi-Fi telemetry | `<SyncPulse status="ONLINE" />` |
| `<NumberCountUp to={num} suffix="%" />` | Accessible smooth numeric and percentage counter | `<NumberCountUp to={96} suffix="%" />` |
| `<AdherenceRing percentage={num} status="..." />` | Animated circular SVG gradient adherence ring with soft status glow | `<AdherenceRing percentage={96} />` |
| `<EmptyState type="medicines"|"schedules"|"notifications"|"history" title="..." description="..." actionLabel="..." />` | Friendly animated empty state with floating illustrations and primary CTA | `<EmptyState type="medicines" title="..." />` |

### ⚙️ Motion Physics (`motion-config.ts`)
- **`SPRING_SNAPPY`**: `{ type: "spring", damping: 26, stiffness: 320 }` — for buttons, badges, and micro-interactions.
- **`SPRING_GENTLE`**: `{ type: "spring", damping: 30, stiffness: 200 }` — for cards and list stagger.
- **`SPRING_DRAWER`**: `{ type: "spring", damping: 28, stiffness: 250 }` — for the right-side slide-over drawer.
- **`useMotionSafe()`**: Hook automatically disabling large physical translations for users with `prefers-reduced-motion: reduce`.

