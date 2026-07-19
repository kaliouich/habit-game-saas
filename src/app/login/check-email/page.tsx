import { APP_NAME } from "@/lib/config";

export default function CheckEmailPage() {
  return (
    <div className="authpage">
      <div className="authcard">
        <h1 className="authcard__title">{APP_NAME}</h1>
        <p className="authcard__subtitle">Check your email 📬</p>
        <p className="authcard__hint">
          We sent you a magic link. Click it to sign in — you can close this tab.
        </p>
      </div>
    </div>
  );
}
