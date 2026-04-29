export default function Footer() {
  return (
    <footer
      className="lg:pl-64 fixed bottom-0 w-full z-30"
      style={{ backgroundColor: "var(--color-surface-container)" }}
    >
      <div className="flex justify-between items-center px-8 py-4 w-full">
        <span
          className="text-[11px] font-medium uppercase tracking-wider opacity-60"
          style={{ color: "var(--color-on-surface)" }}
        >
          © 2024 Boet • System Operational
        </span>
        <div className="flex gap-6">
          {["Privacy", "Docs", "API"].map((label) => (
            <a
              key={label}
              href="#"
              className="text-[11px] font-medium uppercase tracking-wider opacity-60 underline hover:opacity-100 transition-opacity"
              style={{ color: "var(--color-on-surface)" }}
            >
              {label}
            </a>
          ))}
        </div>
        <span
          className="text-sm font-bold font-headline"
          style={{ color: "var(--color-on-surface)" }}
        >
          Boet
        </span>
      </div>
    </footer>
  );
}
