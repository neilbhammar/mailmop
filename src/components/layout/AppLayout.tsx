import React from "react";
import { Toaster } from "../ui/toaster";

interface AppLayoutProps {
  children: React.ReactNode;
}

export function AppLayout({ children }: AppLayoutProps) {
  return (
    <div className="min-h-screen bg-background flex flex-col">
      <div className="flex-1 flex flex-col">
        <main className="flex-1 w-full mx-auto max-w-7xl">
          {children}
        </main>
        <footer className="py-4 text-center text-xs text-muted-foreground">
          <p>MailMop &copy; {new Date().getFullYear()} - Analyze your Gmail inbox</p>
        </footer>
      </div>
      <Toaster />
    </div>
  );
} 