"use client";

import { useState } from "react";
import { Crown, Check, Lock, X } from "lucide-react";
import type { SubscriptionStatus } from "@/lib/types";
import { remoteApi } from "@/lib/api";

declare global {
  interface Window {
    YocoSDK: new (config: { publicKey: string }) => {
      showPopup: (opts: {
        amountInCents: number;
        currency: string;
        name: string;
        description: string;
        callback: (result: { error?: { message: string }; id?: string }) => void;
      }) => void;
    };
  }
}

interface Props {
  subscription: SubscriptionStatus;
  onUpgraded: () => void;
  onClose: () => void;
}

const YOCO_PUBLIC_KEY = process.env.NEXT_PUBLIC_YOCO_PUBLIC_KEY ?? "";

const features = [
  { free: "5 photos", premium: "Unlimited photos" },
  { free: "3 custom events", premium: "Unlimited events" },
  { free: "Basic calendar", premium: "Full calendar + reminders" },
  { free: "Daily check-ins", premium: "Daily check-ins + trends" },
  { free: "—", premium: "Photo-timeline compare" },
  { free: "—", premium: "Priority support" },
];

export default function Paywall({ subscription, onUpgraded, onClose }: Props) {
  const [processing, setProcessing] = useState(false);
  const [error, setError] = useState("");

  function handleUpgrade() {
    if (!YOCO_PUBLIC_KEY) {
      setError("Payment not configured. Contact support.");
      return;
    }

    setError("");
    setProcessing(true);

    const yoco = new window.YocoSDK({ publicKey: YOCO_PUBLIC_KEY });
    yoco.showPopup({
      amountInCents: 9900,
      currency: "ZAR",
      name: "Baby's Calendar Premium",
      description: "Monthly subscription — R99 (VAT incl.)",
      callback: async (result) => {
        if (result.error) {
          setError(result.error.message ?? "Payment cancelled.");
          setProcessing(false);
          return;
        }

        if (!result.id) {
          setError("No payment token received.");
          setProcessing(false);
          return;
        }

        try {
          await remoteApi.processPayment(result.id);
          onUpgraded();
        } catch {
          setError("Payment processed but activation failed. Contact support.");
        } finally {
          setProcessing(false);
        }
      },
    });
  }

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl max-w-md w-full shadow-2xl overflow-hidden">
        {/* Header */}
        <div className="bg-gradient-to-br from-purple-500 via-pink-500 to-primary-500 p-6 text-white relative">
          <button
            onClick={onClose}
            className="absolute top-3 right-3 p-1 rounded-full bg-white/20 hover:bg-white/30"
          >
            <X className="w-4 h-4" />
          </button>
          <div className="flex items-center gap-3 mb-2">
            <Crown className="w-8 h-8" />
            <h2 className="text-xl font-bold">Go Premium</h2>
          </div>
          <p className="text-white/90 text-sm">
            Unlock the full journey — unlimited photos, events & more
          </p>
          <div className="mt-4 flex items-baseline gap-1">
            <span className="text-3xl font-bold">R99</span>
            <span className="text-white/70 text-sm">/month (VAT incl.)</span>
          </div>
        </div>

        {/* Feature comparison */}
        <div className="p-5">
          <div className="grid grid-cols-3 gap-2 text-xs mb-4">
            <div className="font-medium text-gray-400">Feature</div>
            <div className="font-medium text-gray-400 text-center">Free</div>
            <div className="font-medium text-purple-500 text-center">Premium</div>
            {features.map((f, i) => (
              <div key={i} className="contents">
                <div className="py-1.5 text-gray-600 border-t border-gray-50">
                  {f.premium.replace("Unlimited ", "").replace("Full ", "").replace(" + trends", "").replace(" + reminders", "")}
                </div>
                <div className="py-1.5 text-gray-400 text-center border-t border-gray-50">{f.free}</div>
                <div className="py-1.5 text-purple-600 text-center font-medium border-t border-gray-50 flex items-center justify-center gap-1">
                  <Check className="w-3 h-3" /> {f.premium}
                </div>
              </div>
            ))}
          </div>

          {/* Current usage */}
          <div className="bg-primary-50 rounded-xl p-3 mb-4 text-xs">
            <p className="text-primary-700 font-medium mb-1">Your usage</p>
            <div className="flex justify-between text-gray-500">
              <span>Photos: {subscription.photoCount} / {subscription.limits.isPremium ? "∞" : subscription.limits.maxPhotos}</span>
              <span>Events: {subscription.customEventCount} / {subscription.limits.isPremium ? "∞" : subscription.limits.maxCustomEvents}</span>
            </div>
          </div>

          {error && (
            <p className="text-red-500 text-xs mb-3 text-center">{error}</p>
          )}

          <button
            onClick={handleUpgrade}
            disabled={processing}
            className="btn-primary w-full flex items-center justify-center gap-2"
          >
            {processing ? (
              <span className="animate-pulse">Processing payment…</span>
            ) : (
              <>
                <Lock className="w-4 h-4" /> Upgrade for R99/month
              </>
            )}
          </button>

          <p className="text-[10px] text-gray-400 text-center mt-3">
            Secure payment via Yoco. Cancel anytime. POPIA compliant.
          </p>
        </div>
      </div>
    </div>
  );
}
