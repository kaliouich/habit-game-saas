import Link from "next/link";
import { auth } from "@/lib/auth";
import { APP_NAME } from "@/lib/config";

export default async function MarketingLayout({ children }: { children: React.ReactNode }) {
  const session = await auth();

  return (
    <div className="marketing">
      <header className="marketingheader">
        <Link href="/" className="marketingheader__logo">
          {APP_NAME}
        </Link>
        <nav className="marketingheader__nav">
          <Link href="/#features">Features</Link>
          <Link href="/pricing">Pricing</Link>
          {session?.user ? (
            <Link href="/app" className="btn btn--primary btn--nav">
              Dashboard
            </Link>
          ) : (
            <Link href="/login" className="btn btn--primary btn--nav">
              Sign in
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
          <Link href="/pricing">Pricing</Link>
          <Link href="/legal/terms">Terms</Link>
          <Link href="/legal/privacy">Privacy</Link>
        </nav>
      </footer>
    </div>
  );
}
