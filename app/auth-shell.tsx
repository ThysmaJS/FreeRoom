import { DoorOpen } from "lucide-react";

export default function AuthShell({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <div className="flex flex-1 items-center justify-center bg-surface px-4 py-12">
      <div className="w-full max-w-sm">
        <div className="mb-8 flex flex-col items-center gap-2 text-center">
          <div className="flex size-11 items-center justify-center rounded-full bg-navy dark:bg-cyan">
            <DoorOpen
              className="size-5 text-cyan dark:text-navy"
              strokeWidth={2.25}
              aria-hidden
            />
          </div>
          <h1 className="text-2xl font-black">{title}</h1>
        </div>
        <div className="rounded-[var(--radius-card)] border border-border bg-background p-6 shadow-[0_2px_24px_rgba(0,27,64,0.08)] sm:p-8">
          {children}
        </div>
      </div>
    </div>
  );
}
