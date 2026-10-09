import { Suspense } from "react";
import { redirect } from "next/navigation";
import { GraduationCap, Sparkles, ShieldCheck } from "lucide-react";
import { auth } from "@/auth";
import { homePathFor } from "@/lib/permissions";
import { LoginForm } from "@/components/auth/LoginForm";
import { uiMessages } from "@/lib/messages";

export const instant = false;

export const metadata = {
  title: "Sign in | Workshop Manager",
  description: "Sign in to your Workshop Manager staff portal",
};

export default async function LoginPage() {
  const session = await auth();

  if (session?.user) {
    redirect(homePathFor(session.user.role));
  }

  return (
    <div className="min-h-screen w-full flex items-center justify-center p-4 sm:p-6 md:p-10 bg-gradient-to-br from-[#122e26] via-[#1b4337] to-[#0f241d]">
      {/* Decorative ambient background accents inspired by reference */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-32 -left-32 w-96 h-96 rounded-full bg-emerald-500/10 blur-3xl" />
        <div className="absolute top-1/2 -right-32 w-96 h-96 rounded-full bg-teal-400/10 blur-3xl" />
        <div className="absolute -bottom-32 left-1/3 w-96 h-96 rounded-full bg-emerald-600/10 blur-3xl" />
      </div>

      {/* Main Split Login Card */}
      <div className="relative w-full max-w-4xl rounded-3xl overflow-hidden shadow-2xl border border-emerald-900/40 bg-[#16382f]/95 backdrop-blur-md grid grid-cols-1 md:grid-cols-12 min-h-[580px]">
        {/* Left Visual / Branding Section (Visible on md+ screens, organic wave inspired by reference) */}
        <div className="md:col-span-6 relative bg-gradient-to-b from-emerald-50 via-teal-50/90 to-emerald-100/80 p-8 flex flex-col justify-between overflow-hidden">
          {/* Organic background curve SVG */}
          <div className="absolute inset-0 pointer-events-none opacity-20">
            <svg
              className="w-full h-full"
              viewBox="0 0 400 600"
              fill="none"
              xmlns="http://www.w3.org/2000/svg"
            >
              <circle cx="350" cy="80" r="120" fill="#059669" />
              <circle cx="80" cy="300" r="160" fill="#0d9488" />
              <circle cx="320" cy="520" r="140" fill="#10b981" />
            </svg>
          </div>

          {/* Top Logo and Organization Title */}
          <div className="relative z-10 flex items-center gap-3">
            <div className="h-10 w-10 rounded-xl bg-emerald-800 text-white flex items-center justify-center shadow-md">
              <GraduationCap className="size-6" />
            </div>
            <div>
              <span className="block text-xs font-semibold uppercase tracking-wider text-emerald-800">
                Community Training Centre
              </span>
              <span className="block text-sm font-bold text-emerald-950">
                Workshop Portal
              </span>
            </div>
          </div>

          {/* Center Illustration Graphic */}
          <div className="relative z-10 my-auto py-8 flex flex-col items-center text-center">
            <div className="relative mb-6">
              <div className="w-48 h-48 rounded-full bg-emerald-100 flex items-center justify-center border-4 border-white shadow-inner relative">
                {/* Stylized tree / community motif inspired by reference image */}
                <svg
                  className="w-32 h-32"
                  viewBox="0 0 100 100"
                  fill="none"
                  xmlns="http://www.w3.org/2000/svg"
                >
                  {/* Base snow / ground */}
                  <ellipse cx="50" cy="84" rx="38" ry="8" fill="#d1fae5" />
                  {/* Trunk */}
                  <rect x="46" y="62" width="8" height="24" rx="2" fill="#064e3b" />
                  {/* Foliage tiers */}
                  <path
                    d="M50 14L24 48H76L50 14Z"
                    fill="#047857"
                  />
                  <path
                    d="M50 28L20 62H80L50 28Z"
                    fill="#065f46"
                  />
                  <path
                    d="M50 42L16 76H84L50 42Z"
                    fill="#064e3b"
                  />
                  {/* Tree star ornament */}
                  <polygon
                    points="50,9 52,14 57,14 53,17 55,22 50,19 45,22 47,17 43,14 48,14"
                    fill="#f59e0b"
                  />
                  {/* Decorative circles */}
                  <circle cx="42" cy="40" r="2.5" fill="#ef4444" />
                  <circle cx="58" cy="46" r="2.5" fill="#f59e0b" />
                  <circle cx="36" cy="60" r="2.5" fill="#3b82f6" />
                  <circle cx="64" cy="62" r="2.5" fill="#ec4899" />
                  <circle cx="50" cy="68" r="2.5" fill="#ef4444" />
                </svg>
              </div>
              <div className="absolute -bottom-2 -right-2 bg-emerald-700 text-white p-1.5 rounded-full shadow">
                <Sparkles className="size-4" />
              </div>
            </div>
            <h2 className="text-xl font-bold text-emerald-950">
              Community Workshop Hub
            </h2>
            <p className="text-xs text-emerald-800 mt-1 max-w-xs">
              Fast, simple registration and attendee management for all training sessions across our 3 centres.
            </p>
          </div>

          {/* Bottom Footer Notice */}
          <div className="relative z-10 text-[11px] text-emerald-700 font-medium">
            Internal Staff & Admin Management Portal
          </div>
        </div>

        {/* Right Form Section */}
        <div className="md:col-span-6 p-8 sm:p-12 flex flex-col justify-center bg-[#15342b]">
          {/* Mobile branding header */}
          <div className="flex md:hidden items-center gap-2.5 mb-6">
            <div className="h-9 w-9 rounded-lg bg-emerald-600 text-white flex items-center justify-center">
              <GraduationCap className="size-5" />
            </div>
            <div>
              <span className="block text-xs uppercase tracking-wider text-emerald-400 font-semibold">
                Community Training Centre
              </span>
              <span className="block text-sm font-bold text-white">
                {uiMessages.appName}
              </span>
            </div>
          </div>

          <div className="mb-6">
            <div className="hidden md:inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-emerald-900/60 border border-emerald-700/40 text-emerald-300 text-xs font-medium mb-3">
              <GraduationCap className="size-3.5" />
              <span>{uiMessages.appName}</span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-bold text-white tracking-tight">
              {uiMessages.loginTitle}
            </h1>
            <p className="text-sm text-emerald-200/70 mt-1.5">
              {uiMessages.loginSubtitle}
            </p>
          </div>

          <div className="bg-[#1c4539] p-6 rounded-2xl border border-emerald-700/30 shadow-inner">
            <Suspense fallback={<div className="h-48 flex items-center justify-center text-emerald-300 text-sm">Loading form...</div>}>
              <LoginForm />
            </Suspense>
          </div>

          <div className="mt-6 flex items-center justify-center gap-1.5 text-xs text-emerald-300/60">
            <ShieldCheck className="size-3.5 text-emerald-400" />
            <span>Authorized staff and administration access only</span>
          </div>
        </div>
      </div>
    </div>
  );
}
