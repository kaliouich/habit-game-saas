import Link from "next/link";
import { APP_NAME } from "@/lib/config";
import { HeroPreview } from "@/components/marketing/HeroPreview";

const FEATURES: { emoji: string; title: string; text: string }[] = [
  { emoji: "▦", title: "The month board", text: "One row per habit, one column per day. The whole month on one screen — no other tracker shows you this." },
  { emoji: "🔥", title: "Streaks & records", text: "Consecutive-day streaks per habit, plus your all-time record. The thing a paper checklist never totaled for you." },
  { emoji: "🏅", title: "Badges & levels", text: "XP for every tick, levels as you go, badges for perfect weeks and long streaks. Free gets 3 starter badges — Pro unlocks the rest." },
  { emoji: "🎨", title: "Board skins", text: "8 cosmetic color themes for your board. 2 free, 6 with Pro — zero effect on your data, just your taste." },
  { emoji: "🌤️", title: "Mood tracking", text: "Log how you felt each day and watch it line up against your consistency." },
  { emoji: "🏖️", title: "Pause mode", text: "Going on vacation? Pause a habit and the days in between won't break your streak (Pro)." },
];

export default function LandingPage() {
  return (
    <>
      <section className="hero">
        <div className="hero__text">
          <p className="hero__eyebrow">✦ Turn showing up into a game you&apos;re winning</p>
          <h1 className="hero__title">
            Your habits, tracked like a <em>game you actually want to play</em>.
          </h1>
          <p className="hero__subtitle">
            {APP_NAME} is a habit tracker built around one board: every habit, every day of the
            month, filling in as you go. Streaks, XP, levels and badges — no guilt notifications,
            just the record.
          </p>
          <div className="hero__ctas">
            <Link href="/login" className="btn btn--primary btn--hero">
              Start free — no card required
            </Link>
            <Link href="/pricing" className="btn btn--secondary btn--hero">
              See pricing
            </Link>
          </div>
          <p className="hero__note">
            <span>3 habits free, forever</span>
            <span>14-day Pro trial</span>
            <span>Export your data anytime</span>
          </p>
        </div>
        <HeroPreview />
      </section>

      <section id="features" className="features">
        <h2 className="features__title">Everything a spreadsheet had. Plus everything it couldn&apos;t.</h2>
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
            <p>One click. Optimistic, instant, no page reload. XP and streak update live.</p>
          </div>
          <div className="howitworks__step">
            <span className="howitworks__num">3</span>
            <h3>Level up</h3>
            <p>Badges, board skins and a ranked list keep you honest and coming back.</p>
          </div>
        </div>
      </section>

      <section className="ctaband">
        <h2>Day one is the only level that&apos;s hard.</h2>
        <Link href="/login" className="btn btn--primary btn--hero">
          Get started free
        </Link>
      </section>
    </>
  );
}
