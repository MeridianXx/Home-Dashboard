import TopNav from "./TopNav";
import SideNav from "./SideNav";
import Footer from "./Footer";

export default function DashboardShell({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <>
      <TopNav />
      <SideNav />
      <main className="pt-20 pb-24 min-h-screen">
        <div className="lg:ml-64 px-5 lg:px-10">
          <div className="max-w-[1400px] mx-auto">
            {children}
          </div>
        </div>
      </main>
      <Footer />
    </>
  );
}
