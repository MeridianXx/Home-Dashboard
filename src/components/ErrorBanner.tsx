/**
 * Visas när ett SWR-anrop misslyckas. Ger användaren en retry-knapp.
 */
export default function ErrorBanner({ onRetry, message }: { onRetry?: () => void; message?: string }) {
  return (
    <div
      className="flex items-center justify-between gap-3 rounded-2xl px-4 py-3 text-sm"
      style={{
        backgroundColor: "var(--color-error-container, #ffdad6)",
        color: "var(--color-on-error-container, #410002)",
      }}
      role="alert"
    >
      <div className="flex items-center gap-2">
        <span className="material-symbols-outlined" style={{ fontSize: 18 }} aria-hidden="true">
          wifi_off
        </span>
        <span>{message ?? "Kunde inte hämta data — kontrollera anslutningen."}</span>
      </div>
      {onRetry && (
        <button
          onClick={onRetry}
          className="font-semibold underline shrink-0"
          style={{ background: "none", border: "none", cursor: "pointer", color: "inherit" }}
        >
          Försök igen
        </button>
      )}
    </div>
  );
}
