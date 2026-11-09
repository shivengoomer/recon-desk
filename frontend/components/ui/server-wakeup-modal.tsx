"use client";

import { useEffect, useState } from "react";
import * as Dialog from "@radix-ui/react-dialog";
import { AnimatePresence, motion } from "framer-motion";
import { Check, Copy, ExternalLink, Mail, Moon, RefreshCw, X } from "lucide-react";
import { buttonClass } from "./button";

const ADMIN_EMAIL = process.env.NEXT_PUBLIC_ADMIN_EMAIL ?? "shivengoomer@gmail.com";
const MAIL_SUBJECT = encodeURIComponent("[Recon Desk] Please turn the backend server on");
const MAIL_BODY = encodeURIComponent(
  `Hi Shiven,\n\nI am trying to access Recon Desk and the server appears to be sleeping.\nCould you please turn the Azure VM server on?\n\nThank you!`
);
const MAILTO_LINK = `mailto:${ADMIN_EMAIL}?subject=${MAIL_SUBJECT}&body=${MAIL_BODY}`;

export function triggerServerWakeupModal() {
  if (typeof window !== "undefined") {
    window.dispatchEvent(new CustomEvent("server-offline"));
  }
}

export function ServerWakeupModal() {
  const [open, setOpen] = useState(false);
  const [copied, setCopied] = useState(false);
  const [checking, setChecking] = useState(false);
  const [onlineNotice, setOnlineNotice] = useState(false);

  useEffect(() => {
    function handleOffline() {
      setOpen(true);
    }
    window.addEventListener("server-offline", handleOffline);
    return () => window.removeEventListener("server-offline", handleOffline);
  }, []);

  async function checkServerStatus() {
    setChecking(true);
    setOnlineNotice(false);
    const base = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000";
    try {
      const res = await fetch(`${base}/api/health`, { method: "GET", cache: "no-store" });
      if (res.ok) {
        setOnlineNotice(true);
        setTimeout(() => {
          setOpen(false);
          setOnlineNotice(false);
        }, 1200);
      } else {
        setOnlineNotice(false);
      }
    } catch {
      setOnlineNotice(false);
    } finally {
      setChecking(false);
    }
  }

  function handleCopy() {
    navigator.clipboard.writeText(ADMIN_EMAIL);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  return (
    <Dialog.Root open={open} onOpenChange={setOpen}>
      <AnimatePresence>
        {open && (
          <Dialog.Portal forceMount>
            <Dialog.Overlay asChild>
              <motion.div
                className="fixed inset-0 z-50 bg-ink/50 backdrop-blur-sm"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.18 }}
              />
            </Dialog.Overlay>

            <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
              <Dialog.Content asChild>
                <motion.div
                  className="relative w-full max-w-md overflow-hidden rounded-[24px] border border-hairline bg-canvas p-6 shadow-layer-4 md:p-8"
                  initial={{ opacity: 0, scale: 0.95, y: 10 }}
                  animate={{ opacity: 1, scale: 1, y: 0 }}
                  exit={{ opacity: 0, scale: 0.95, y: 10 }}
                  transition={{ type: "spring", damping: 28, stiffness: 350 }}
                >
                  {/* Close button */}
                  <Dialog.Close
                    className="absolute right-4 top-4 flex h-9 w-9 items-center justify-center rounded-full text-body-mid transition-colors hover:bg-soft hover:text-ink focus-visible:outline-none"
                    aria-label="Close"
                  >
                    <X size={17} />
                  </Dialog.Close>

                  {/* Header Icon badge */}
                  <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-amber-500/10 text-amber-600 ring-1 ring-amber-500/20">
                    <Moon size={22} strokeWidth={2.4} />
                  </div>

                  <Dialog.Title className="font-display mt-5 text-[22px] font-bold tracking-tight text-ink">
                    Server is taking a nap 💤
                  </Dialog.Title>

                  <Dialog.Description className="mt-2 text-body-sm leading-relaxed text-body-mid">
                    To keep cloud hosting costs minimal, the Azure backend server is currently deallocated.
                    Send a quick request to turn it back on, and it will be up in 1–2 minutes.
                  </Dialog.Description>

                  {/* Status Banner when awake */}
                  {onlineNotice && (
                    <div className="mt-4 flex items-center gap-2 rounded-xl bg-mint/15 px-3.5 py-2 text-xs font-semibold text-emerald-800">
                      <span className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
                      Server is online! Closing...
                    </div>
                  )}

                  {/* Actions */}
                  <div className="mt-6 flex flex-col gap-2.5">
                    <a
                      href={MAILTO_LINK}
                      className={buttonClass(
                        "primary",
                        "w-full !rounded-[16px] !py-3 flex items-center justify-center gap-2"
                      )}
                    >
                      <Mail size={16} strokeWidth={2.2} />
                      Email owner to wake up server
                      <ExternalLink size={13} className="opacity-60" />
                    </a>

                    <div className="flex gap-2">
                      <button
                        type="button"
                        onClick={handleCopy}
                        className="flex flex-1 items-center justify-center gap-1.5 rounded-[14px] border border-hairline bg-soft px-3 py-2 text-xs font-semibold text-ink transition-colors hover:bg-hairline active:scale-[0.98]"
                      >
                        {copied ? <Check size={14} className="text-emerald-600" /> : <Copy size={14} />}
                        {copied ? "Copied address" : "Copy owner email"}
                      </button>

                      <button
                        type="button"
                        onClick={checkServerStatus}
                        disabled={checking}
                        className="flex items-center justify-center gap-1.5 rounded-[14px] border border-hairline bg-canvas px-4 py-2 text-xs font-semibold text-body-mid transition-colors hover:bg-soft hover:text-ink active:scale-[0.98] disabled:opacity-50"
                      >
                        <RefreshCw size={13} className={checking ? "animate-spin" : ""} />
                        {checking ? "Checking..." : "Retry"}
                      </button>
                    </div>
                  </div>

                  <p className="mt-4 text-center font-mono text-[11px] text-body-mid/70">
                    Target: {ADMIN_EMAIL}
                  </p>
                </motion.div>
              </Dialog.Content>
            </div>
          </Dialog.Portal>
        )}
      </AnimatePresence>
    </Dialog.Root>
  );
}

