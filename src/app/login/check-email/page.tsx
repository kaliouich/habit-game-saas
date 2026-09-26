import { getTranslations } from "next-intl/server";
import { APP_NAME } from "@/lib/config";

export default async function CheckEmailPage() {
  const t = await getTranslations("Login");

  return (
    <div className="authpage">
      <div className="authcard">
        <div className="authcard__head">
          <img src="/icon-512.png" alt="" width={48} height={48} className="authcard__mark" />
          <h1 className="authcard__title">{APP_NAME}</h1>
          <p className="authcard__subtitle">{t("checkYourEmail")}</p>
        </div>

        <div className="authcard__body">
          <p className="authcard__hint">📬 {t("magicLinkSent")}</p>
        </div>
      </div>
    </div>
  );
}
