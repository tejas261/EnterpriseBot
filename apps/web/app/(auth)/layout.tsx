import { AuthPanel, MobileBrand } from "@/components/auth/auth-panel";

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-background lg:grid lg:grid-cols-[55%_45%]">
      <AuthPanel />
      <main className="flex min-h-screen items-center justify-center px-5 py-12 lg:min-h-0 lg:px-12">
        <div className="w-full max-w-sm">
          <MobileBrand />
          {children}
        </div>
      </main>
    </div>
  );
}
