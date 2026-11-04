import React, { Suspense } from "react";
import AdminClientLayout from "./AdminClientLayout";

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-slate-950 flex items-center justify-center text-slate-400 text-xs">
          Loading workspace...
        </div>
      }
    >
      <AdminClientLayout>{children}</AdminClientLayout>
    </Suspense>
  );
}
