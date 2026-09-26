import Link from "next/link";
import { getTranslations } from "next-intl/server";
import { auth } from "@/lib/auth";
import { APP_NAME } from "@/lib/config";
import { LanguageSwitcher } from "@/components/LanguageSwitcher";

export default async function MarketingLayout({ children }: { children: React.ReactNode }) {
  const session = await auth();
  const t = await getTranslations("MarketingNav");

  return (
    <div className="marketing">
      <header className="marketingheader">
        <Link href="/" className="marketingheader__logo">
          <img src="/icon-512.png" alt="" width={32} height={32} className="marketingheader__mark" />
          {APP_NAME}
        </Link>
        <nav className="marketingheader__nav">
          <Link href="/#features">{t("features")}</Link>
          <Link href="/pricing">{t("pricing")}</Link>
          <LanguageSwitcher className="langswitcher langswitcher--nav" />
          {session?.user ? (
            <Link href="/app" className="btn btn--primary btn--nav">
              {t("dashboard")}
            </Link>
          ) : (
            <Link href="/login" className="btn btn--primary btn--nav">
              {t("signIn")}
            </Link>
          )}
        </nav>
      </header>

      <main>{children}</main>

      <footer className="marketingfooter">
        <span>
          © {new Date().getFullYear()} {APP_NAME}
        </span>
        <nav className="marketingfooter__nav">
          <Link href="/pricing">{t("pricing")}</Link>
          <Link href="/legal/terms">{t("terms")}</Link>
          <Link href="/legal/privacy">{t("privacy")}</Link>
        </nav>
      </footer>
    </div>
  );
}
