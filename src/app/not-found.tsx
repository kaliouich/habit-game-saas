import Link from "next/link";
import { getTranslations } from "next-intl/server";
import { APP_NAME } from "@/lib/config";

/**
 * 404 de marque. Atteinte notamment par `notFound()` du recap partagé
 * (/recap/<userId>/<month>) quand le lien est périmé, mal formé, ou que
 * l'auteur n'est plus Pro — cas nominal, pas une anomalie.
 */
export default async function NotFound() {
  const t = await getTranslations("ErrorPage.notFound");
  return (
    <div className="errorpage">
      <div className="errorcard">
        <h1 className="errorcard__title">{t("title")}</h1>
        <p className="errorcard__text">{t("text")}</p>
        <div className="errorcard__actions">
          <Link href="/" className="btn btn--secondary">
            {t("home", { appName: APP_NAME })}
          </Link>
          <Link href="/app" className="btn btn--primary">
            {t("dashboard")}
          </Link>
        </div>
      </div>
    </div>
  );
}
