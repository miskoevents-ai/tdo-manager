import { Suspense } from "react";
import { LoginForm } from "@/components/login/LoginForm";

export const dynamic = "force-dynamic";

// Pantalla de acceso a pantalla completa (tapa el shell con la barra lateral).
export default function LoginPage() {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-gradient-to-br from-[#33402c] via-sage to-[#4a563f] p-4">
      <div className="w-full max-w-sm rounded-[16px] bg-white p-8 shadow-card">
        <div className="mb-6 text-center">
          <div className="font-display text-[26px] leading-tight text-sage">
            Tu Decoración Original
          </div>
          <div className="mt-1 text-[11px] font-semibold uppercase tracking-[0.2em] text-ink-muted">
            TDO Manager
          </div>
        </div>
        <Suspense>
          <LoginForm />
        </Suspense>
      </div>
    </div>
  );
}
