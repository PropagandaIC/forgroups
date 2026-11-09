import { PublicFooter } from "@/components/public-header";

export default function PublicLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-dvh flex-col bg-white">
      <div className="flex-1">{children}</div>
      <PublicFooter />
    </div>
  );
}
