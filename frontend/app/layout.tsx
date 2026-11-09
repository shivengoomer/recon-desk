import type { Metadata, Viewport } from "next";
import { DM_Mono, Inter, Titillium_Web } from "next/font/google";
import "./globals.css";
import { AuthProvider } from "@/lib/auth";
import { ToastProvider } from "@/components/ui/toast";
import { ServerWakeupModal } from "@/components/ui/server-wakeup-modal";

const sans = Inter({ subsets: ["latin"], variable: "--font-sans", display: "swap" });
const display = Titillium_Web({ subsets: ["latin"], weight: ["600", "700"], variable: "--font-display", display: "swap" });
const mono = DM_Mono({ subsets: ["latin"], weight: ["400", "500"], variable: "--font-mono", display: "swap" });

export const metadata: Metadata = {
  title: { default: "Recon Desk", template: "%s | Recon Desk" },
  description: "Order, settlement, COD and freight reconciliation for D2C home brands.",
};
export const viewport: Viewport = { width: "device-width", initialScale: 1 };

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${sans.variable} ${display.variable} ${mono.variable}`}>
      <body className="min-h-screen">
        <AuthProvider>
          <ToastProvider>
            {children}
            <ServerWakeupModal />
          </ToastProvider>
        </AuthProvider>
      </body>
    </html>
  );
}
