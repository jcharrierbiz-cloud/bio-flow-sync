import { Link } from "react-router-dom";

type Props = {
  /** Adds bottom padding to clear the fixed BottomNav on authenticated pages. */
  withBottomNav?: boolean;
  className?: string;
};

const LegalFooter = ({ withBottomNav = false, className = "" }: Props) => (
  <footer
    role="contentinfo"
    aria-label="Liens légaux"
    className={`w-full text-center text-[11px] text-muted-foreground py-4 ${
      withBottomNav ? "mb-20" : ""
    } ${className}`}
  >
    <nav aria-label="Navigation légale">
      <ul className="flex items-center justify-center gap-4 flex-wrap">
        <li>
          <Link
            to="/privacy"
            className="hover:text-foreground underline-offset-2 hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-energy rounded"
            aria-label="Lire la politique de confidentialité"
          >
            Confidentialité
          </Link>
        </li>
        <li aria-hidden="true">·</li>
        <li>
          <Link
            to="/cookies"
            className="hover:text-foreground underline-offset-2 hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-energy rounded"
            aria-label="Voir la politique des cookies"
          >
            Cookies
          </Link>
        </li>
        <li aria-hidden="true">·</li>
        <li>
          <span>© {new Date().getFullYear()} Bio-Flow</span>
        </li>
      </ul>
    </nav>
  </footer>
);

export default LegalFooter;
