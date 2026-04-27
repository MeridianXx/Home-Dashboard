import "./globals.warm.css";

export default function WarmLayout({ children }: { children: React.ReactNode }) {
  return <div className="warm-root">{children}</div>;
}
