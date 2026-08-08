import Link from "next/link";
import { APP_NAME } from "@/lib/config";

/**
 * 404 de marque. Atteinte notamment par `notFound()` du recap partagé
 * (/recap/<userId>/<month>) quand le lien est périmé, mal formé, ou que
 * l'auteur n'est plus Pro — cas nominal, pas une anomalie.
 */
export default function NotFound() {
  return (
    <div className="errorpage">
      <div className="errorcard">
        <h1 className="errorcard__title">Page not found</h1>
        <p className="errorcard__text">
          This page doesn&apos;t exist, or the shared link has expired.
        </p>
        <div className="errorcard__actions">
          <Link href="/" className="btn btn--secondary">
            {APP_NAME} home
          </Link>
          <Link href="/app" className="btn btn--primary">
            My dashboard
          </Link>
        </div>
      </div>
    </div>
  );
}
