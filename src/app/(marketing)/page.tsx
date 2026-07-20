import Link from "next/link";
import { APP_NAME } from "@/lib/config";
import { HeroPreview } from "@/components/marketing/HeroPreview";

const FEATURES: { emoji: string; title: string; text: string }[] = [
  { emoji: "📊", title: "Monthly grid", text: "Every habit, every day, one checkbox click away. Just like a spreadsheet — but alive." },
  { emoji: "📈", title: "Daily & weekly progress", text: "Bar charts that update the instant you check a box. See momentum build in real time." },
  { emoji: "🍩", title: "Overall stats", text: "One glance at your donut chart tells you exactly where the month stands." },
  { emoji: "🏆", title: "Top 10 habits", text: "Automatically ranked. Know which habits stick and which need work." },
  { emoji: "🔥", title: "Streaks", text: "Consecutive-day streaks per habit, with your all-time record — the thing spreadsheets never had." },
  { emoji: "🌤️", title: "Mood tracking", text: "Log how you felt each day and watch it line up against your consistency." },
  { emoji: "🌓", title: "Dark mode", text: "Because checking boxes at 5am shouldn't hurt your eyes." },
  { emoji: "📱", title: "Actually usable on mobile", text: "A real 'Today' view for daily use, not just a shrunk-down spreadsheet." },
];

export default function LandingPage() {
  return (
    <>
      <section className="hero">
        <div className="hero__text">
          <p className="hero__eyebrow">A dedicated page to rebuild your consistency 🎯</p>
          <h1 className="hero__title">{APP_NAME}</h1>
          <p className="hero__subtitle">
            The habit tracker that feels like a premium spreadsheet — gamified, on a single page.
            Check a box, watch every chart update instantly.
          </p>
          <div className="hero__ctas">
            <Link href="/login" className="btn btn--primary btn--hero">
              Start free — no card required
            </Link>
            <Link href="/pricing" className="btn btn--secondary btn--hero">
              See pricing
            </Link>
          </div>
        </div>
        <HeroPreview />
      </section>

      <section id="features" className="features">
        <h2 className="features__title">Everything the spreadsheet had. Plus everything it didn&apos;t.</h2>
        <div className="features__grid">
          {FEATURES.map((f) => (
            <div key={f.title} className="featurecard">
              <span className="featurecard__emoji">{f.emoji}</span>
              <h3 className="featurecard__title">{f.title}</h3>
              <p className="featurecard__text">{f.text}</p>
            </div>
          ))}
        </div>
      </section>

      <section className="howitworks">
        <h2 className="howitworks__title">How it works</h2>
        <div className="howitworks__steps">
          <div className="howitworks__step">
            <span className="howitworks__num">1</span>
            <h3>Add your habits</h3>
            <p>Wake up early, gym, reading — anything you want to build or quit.</p>
          </div>
          <div className="howitworks__step">
            <span className="howitworks__num">2</span>
            <h3>Check the box, daily</h3>
            <p>One click. Optimistic, instant, no page reload.</p>
          </div>
          <div className="howitworks__step">
            <span className="howitworks__num">3</span>
            <h3>Watch the trend</h3>
            <p>Streaks, percentages, and a ranked list keep you honest.</p>
          </div>
        </div>
      </section>

      <section className="ctaband">
        <h2>Rebuild your consistency today.</h2>
        <Link href="/login" className="btn btn--primary btn--hero">
          Get started free
        </Link>
      </section>
    </>
  );
}
