import Link from "next/link";
import { getTranslations } from "next-intl/server";
import { APP_NAME } from "@/lib/config";
import { HeroPreview } from "@/components/marketing/HeroPreview";

export default async function LandingPage() {
  const t = await getTranslations("Marketing");
  // Se remplit tout seul dès que la fiche Play Store existe — même mécanique
  // que isStripeConfigured()/isAiOnboardingConfigured() : le badge n'apparaît
  // jamais tant que le lien pointerait dans le vide.
  const playStoreUrl = process.env.NEXT_PUBLIC_PLAY_STORE_URL;

  const features = [
    { emoji: "▦", title: t("features.board.title"), text: t("features.board.text") },
    { emoji: "🔥", title: t("features.streaks.title"), text: t("features.streaks.text") },
    { emoji: "🏅", title: t("features.badges.title"), text: t("features.badges.text") },
    { emoji: "🎨", title: t("features.skins.title"), text: t("features.skins.text") },
    { emoji: "🌤️", title: t("features.mood.title"), text: t("features.mood.text") },
    { emoji: "🏖️", title: t("features.pause.title"), text: t("features.pause.text") },
  ];

  return (
    <>
      <section className="hero">
        <div className="hero__text">
          <p className="hero__eyebrow">{t("hero.eyebrow")}</p>
          <h1 className="hero__title">{t.rich("hero.title", { em: (chunks) => <em>{chunks}</em> })}</h1>
          <p className="hero__subtitle">{t("hero.subtitle", { appName: APP_NAME })}</p>
          <div className="hero__ctas">
            <Link href="/login" className="btn btn--primary btn--hero">
              {t("hero.ctaPrimary")}
            </Link>
            <Link href="/pricing" className="btn btn--secondary btn--hero">
              {t("hero.ctaSecondary")}
            </Link>
          </div>
          {playStoreUrl && (
            <a href={playStoreUrl} className="hero__storebadge" target="_blank" rel="noopener noreferrer">
              <span className="hero__storebadge-icon" aria-hidden>
                ▶
              </span>
              <span>
                <span className="hero__storebadge-eyebrow">{t("hero.getItOn")}</span>
                <span className="hero__storebadge-name">Google Play</span>
              </span>
            </a>
          )}
          <p className="hero__note">
            <span>{t("hero.note1")}</span>
            <span>{t("hero.note2")}</span>
            <span>{t("hero.note3")}</span>
          </p>
        </div>
        <HeroPreview />
      </section>

      <section id="features" className="features">
        <h2 className="features__title">{t("features.title")}</h2>
        <div className="features__grid">
          {features.map((f) => (
            <div key={f.title} className="featurecard">
              <span className="featurecard__emoji">{f.emoji}</span>
              <h3 className="featurecard__title">{f.title}</h3>
              <p className="featurecard__text">{f.text}</p>
            </div>
          ))}
        </div>
      </section>

      <section className="howitworks">
        <h2 className="howitworks__title">{t("howItWorks.title")}</h2>
        <div className="howitworks__steps">
          <div className="howitworks__step">
            <span className="howitworks__num">1</span>
            <h3>{t("howItWorks.step1.title")}</h3>
            <p>{t("howItWorks.step1.text")}</p>
          </div>
          <div className="howitworks__step">
            <span className="howitworks__num">2</span>
            <h3>{t("howItWorks.step2.title")}</h3>
            <p>{t("howItWorks.step2.text")}</p>
          </div>
          <div className="howitworks__step">
            <span className="howitworks__num">3</span>
            <h3>{t("howItWorks.step3.title")}</h3>
            <p>{t("howItWorks.step3.text")}</p>
          </div>
        </div>
      </section>

      <section className="ctaband">
        <h2>{t("cta.title")}</h2>
        <Link href="/login" className="btn btn--primary btn--hero">
          {t("cta.button")}
        </Link>
      </section>
    </>
  );
}
