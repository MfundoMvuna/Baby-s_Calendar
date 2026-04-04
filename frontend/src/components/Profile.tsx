import React, { useState } from "react";
import { Crown, Users, CalendarSync, Link2, Unlink, Copy, CheckCircle } from "lucide-react";
import type { OnboardingData, ExtendedProfile, PartnerLink, CalendarSyncConfig, SubscriptionStatus } from "@/lib/types";
import {
  getPartnerLink, createPartnerLink, revokePartnerLink, removePartnerLink,
  getCalendarSyncConfig, saveCalendarSyncConfig, refreshPartnerShareToken,
} from "@/lib/api";

interface ProfileProps {
  data: OnboardingData;
  extendedProfile: ExtendedProfile;
  onSave: (data: OnboardingData, extended: ExtendedProfile) => void;
  onClose: () => void;
  subscription?: SubscriptionStatus | null;
  onShowPaywall?: () => void;
}

const RISK_OPTIONS = [
  "High blood pressure",
  "Diabetes (pre-existing)",
  "Previous C-section",
  "Multiple pregnancies (twins+)",
  "Previous miscarriage",
  "Thyroid condition",
  "HIV positive",
  "Rh-negative blood type",
  "None of the above",
];

const BLOOD_TYPES = ["A+", "A-", "B+", "B-", "AB+", "AB-", "O+", "O-"];

const Profile: React.FC<ProfileProps> = ({ data, extendedProfile, onSave, onClose, subscription, onShowPaywall }) => {
  const [form, setForm] = useState<OnboardingData>({ ...data });
  const [ext, setExt] = useState<ExtendedProfile>({ ...extendedProfile });
  const [saving, setSaving] = useState(false);
  const [tab, setTab] = useState<"basics" | "medical" | "emergency" | "sync">("basics");
  const isPremium = subscription?.limits.isPremium ?? false;

  // Partner sync state
  const [partnerLink, setPartnerLink] = useState<PartnerLink | null>(() => getPartnerLink());
  const [partnerEmail, setPartnerEmail] = useState("");
  const [partnerName, setPartnerName] = useState("");
  const [linkCopied, setLinkCopied] = useState(false);

  // Calendar sync state
  const [calSync, setCalSync] = useState<CalendarSyncConfig>(() => getCalendarSyncConfig());

  const update = (patch: Partial<OnboardingData>) =>
    setForm((prev) => ({ ...prev, ...patch }));
  const updateExt = (patch: Partial<ExtendedProfile>) =>
    setExt((prev) => ({ ...prev, ...patch }));

  return (
    <div className="card max-w-lg w-full p-6 relative max-h-[90vh] overflow-y-auto">
      <button onClick={onClose} className="absolute top-3 right-3 text-primary-400 hover:text-primary-600 text-xl" aria-label="Close profile">×</button>
      <h2 className="text-xl font-bold text-primary-700 mb-4">My Profile</h2>

      {/* Sub-tabs */}
      <div className="flex gap-1 mb-5 bg-primary-50 rounded-xl p-1">
        {(["basics", "medical", "emergency", "sync"] as const).map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={`flex-1 py-2 text-xs font-medium rounded-lg transition-all ${tab === t ? "bg-white text-primary-700 shadow-sm" : "text-primary-400 hover:text-primary-600"}`}
          >
            {t === "basics" ? "Basics" : t === "medical" ? "Medical" : t === "emergency" ? "Emergency" : "Sync"}
          </button>
        ))}
      </div>

      {/* ── Basics Tab ── */}
      {tab === "basics" && (
        <div className="space-y-4">
          <div>
            <label className="text-sm font-medium text-primary-600 block mb-1">Display name</label>
            <input type="text" value={form.displayName} onChange={e => update({ displayName: e.target.value })} className="w-full" />
          </div>
          <div>
            <label className="text-sm font-medium text-primary-600 block mb-1">Date of birth</label>
            <input type="date" value={ext.dateOfBirth ?? ""} onChange={e => updateExt({ dateOfBirth: e.target.value })} className="w-full" />
            <p className="text-[10px] text-gray-400 mt-1">Helps us assess age-related risk factors</p>
          </div>
          <div>
            <label className="text-sm font-medium text-primary-600 block mb-1">Last menstrual period</label>
            <input type="date" value={form.lmpDate} onChange={e => update({ lmpDate: e.target.value })} className="w-full" />
          </div>
          <div>
            <label className="text-sm font-medium text-primary-600 block mb-1">Cycle length (days)</label>
            <input type="number" min={21} max={45} value={ext.cycleLength ?? ""} onChange={e => updateExt({ cycleLength: e.target.value ? Number(e.target.value) : undefined })} className="w-full" placeholder="28 (default)" />
            <p className="text-[10px] text-gray-400 mt-1">Used for a more accurate due date calculation (modified Naegele&apos;s rule)</p>
          </div>
          <div>
            <label className="text-sm font-medium text-primary-600 block mb-1">Weeks pregnant</label>
            <input type="number" min={1} max={42} value={form.weeksPregnant ?? ""} onChange={e => update({ weeksPregnant: e.target.value ? Number(e.target.value) : undefined })} className="w-full" />
          </div>
          <div>
            <label className="text-sm font-medium text-primary-600 block mb-1">Baby&apos;s nickname (optional)</label>
            <input type="text" value={form.babyNickname ?? ""} onChange={e => update({ babyNickname: e.target.value })} className="w-full" />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-sm font-medium text-primary-600 block mb-1">Height (cm)</label>
              <input type="number" min={100} max={220} value={ext.height ?? ""} onChange={e => updateExt({ height: e.target.value ? Number(e.target.value) : undefined })} className="w-full" placeholder="e.g. 165" />
            </div>
            <div>
              <label className="text-sm font-medium text-primary-600 block mb-1">Pre-pregnancy weight (kg)</label>
              <input type="number" min={30} max={250} step={0.1} value={ext.prePregnancyWeight ?? ""} onChange={e => updateExt({ prePregnancyWeight: e.target.value ? Number(e.target.value) : undefined })} className="w-full" placeholder="e.g. 62" />
            </div>
          </div>
          <div>
            <label className="flex items-center gap-2 cursor-pointer">
              <input type="checkbox" checked={form.hasSeenDoctor} onChange={e => update({ hasSeenDoctor: e.target.checked })} />
              <span className="text-sm text-gray-700">I&apos;ve already seen a doctor or midwife</span>
            </label>
          </div>
          {form.hasSeenDoctor && (
            <>
              <div>
                <label className="text-sm font-medium text-primary-600 block mb-1">Doctor / Midwife name</label>
                <input type="text" value={form.doctorName ?? ""} onChange={e => update({ doctorName: e.target.value })} className="w-full" />
              </div>
              <div>
                <label className="text-sm font-medium text-primary-600 block mb-1">Hospital or clinic</label>
                <input type="text" value={form.hospitalClinic ?? ""} onChange={e => update({ hospitalClinic: e.target.value })} className="w-full" />
              </div>
            </>
          )}
          <div>
            <label className="text-sm font-medium text-primary-600 block mb-1">Anything else you&apos;d like to share? (optional)</label>
            <textarea rows={2} value={form.extraNotes ?? ""} onChange={e => update({ extraNotes: e.target.value })} className="w-full" />
          </div>
        </div>
      )}

      {/* ── Medical Tab ── */}
      {tab === "medical" && (
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-sm font-medium text-primary-600 block mb-1">Gravida (total pregnancies)</label>
              <input type="number" min={1} max={20} value={ext.gravida ?? ""} onChange={e => updateExt({ gravida: e.target.value ? Number(e.target.value) : undefined })} className="w-full" placeholder="Including this one" />
            </div>
            <div>
              <label className="text-sm font-medium text-primary-600 block mb-1">Para (previous births)</label>
              <input type="number" min={0} max={20} value={ext.para ?? ""} onChange={e => updateExt({ para: e.target.value ? Number(e.target.value) : undefined })} className="w-full" placeholder="0" />
            </div>
          </div>
          <div>
            <label className="text-sm font-medium text-primary-600 block mb-1">Blood type</label>
            <div className="flex flex-wrap gap-2">
              {BLOOD_TYPES.map((bt) => (
                <button
                  key={bt}
                  onClick={() => updateExt({ bloodType: ext.bloodType === bt ? undefined : bt })}
                  className={`px-3 py-1.5 rounded-full border text-xs transition-all ${ext.bloodType === bt ? "bg-primary-500 text-white border-primary-500" : "border-primary-200 text-gray-500 hover:border-primary-400"}`}
                >
                  {bt}
                </button>
              ))}
            </div>
          </div>
          <div>
            <label className="text-sm font-medium text-primary-600 block mb-1">Medical background</label>
            <div className="flex flex-wrap gap-2 mt-1">
              {RISK_OPTIONS.map((option) => {
                const isNone = option === "None of the above";
                const checked = isNone
                  ? form.riskFactors.length === 0
                  : form.riskFactors.includes(option);
                return (
                  <label key={option} className={`px-3 py-1.5 rounded-full border text-xs cursor-pointer transition-all ${checked ? "bg-primary-500 text-white border-primary-500" : "border-primary-200 text-gray-500 hover:border-primary-400"}`}>
                    <input
                      type="checkbox"
                      className="sr-only"
                      checked={checked}
                      onChange={() => {
                        if (isNone) {
                          update({ riskFactors: [] });
                        } else {
                          const next = checked
                            ? form.riskFactors.filter((r) => r !== option)
                            : [...form.riskFactors, option];
                          update({ riskFactors: next });
                        }
                      }}
                    />
                    {option}
                  </label>
                );
              })}
            </div>
          </div>
          <div>
            <label className="text-sm font-medium text-primary-600 block mb-1">Allergies (comma-separated)</label>
            <input type="text" value={(ext.allergies ?? []).join(", ")} onChange={e => updateExt({ allergies: e.target.value ? e.target.value.split(",").map(s => s.trim()).filter(Boolean) : [] })} className="w-full" placeholder="e.g. Penicillin, Peanuts" />
          </div>
          <div>
            <label className="text-sm font-medium text-primary-600 block mb-1">Current medications (comma-separated)</label>
            <textarea rows={3} value={(ext.currentMedications ?? []).join(", ")} onChange={e => updateExt({ currentMedications: e.target.value ? e.target.value.split(",").map(s => s.trim()).filter(Boolean) : [] })} className="w-full" placeholder="e.g. Prenatal vitamins, Iron supplements, Folic acid 5mg daily" />
          </div>
          <div>
            <label className="text-sm font-medium text-primary-600 block mb-1">Medical aid / insurance name</label>
            <input type="text" value={ext.medicalAidName ?? ""} onChange={e => updateExt({ medicalAidName: e.target.value })} className="w-full" placeholder="e.g. Discovery Health" />
          </div>
          <div>
            <label className="text-sm font-medium text-primary-600 block mb-1">Medical aid number</label>
            <input type="text" value={ext.medicalAidNumber ?? ""} onChange={e => updateExt({ medicalAidNumber: e.target.value })} className="w-full" />
          </div>
        </div>
      )}

      {/* ── Emergency Tab ── */}
      {tab === "emergency" && (
        <div className="space-y-4">
          <div className="card p-4 bg-gradient-to-br from-pink-50 to-purple-50">
            <p className="text-sm text-primary-600 mb-1 font-medium">Why we ask for this</p>
            <p className="text-xs text-gray-500">In an emergency, having your contact person&apos;s details ready can save precious time. This information stays private on your device unless you choose to sync.</p>
          </div>
          <div>
            <label className="text-sm font-medium text-primary-600 block mb-1">Emergency contact name</label>
            <input type="text" value={ext.emergencyContactName ?? ""} onChange={e => updateExt({ emergencyContactName: e.target.value })} className="w-full" placeholder="e.g. Partner, mother, friend" />
          </div>
          <div>
            <label className="text-sm font-medium text-primary-600 block mb-1">Emergency contact phone</label>
            <input type="tel" value={ext.emergencyContactPhone ?? ""} onChange={e => updateExt({ emergencyContactPhone: e.target.value })} className="w-full" placeholder="+27 XX XXX XXXX" />
          </div>
        </div>
      )}

      {/* ── Sync & Sharing Tab ── */}
      {tab === "sync" && (
        <div className="space-y-5">
          {!isPremium ? (
            <div className="card p-5 bg-gradient-to-br from-purple-50 to-pink-50 text-center space-y-3">
              <Crown className="w-8 h-8 text-purple-400 mx-auto" />
              <h3 className="text-sm font-bold text-purple-700">Premium Feature</h3>
              <p className="text-xs text-gray-500">Partner sharing and Google Calendar sync are available for Premium subscribers.</p>
              <button
                onClick={() => onShowPaywall?.()}
                className="inline-flex items-center gap-1.5 text-sm bg-gradient-to-r from-purple-500 to-pink-500 text-white px-5 py-2.5 rounded-full hover:shadow-md transition font-medium"
              >
                <Crown className="w-4 h-4" /> Upgrade to Premium — R99/mo
              </button>
            </div>
          ) : (
            <>
              {/* Partner Sharing */}
              <div className="space-y-3">
                <h3 className="text-sm font-bold text-primary-700 flex items-center gap-2">
                  <Users className="w-4 h-4" /> Share with Partner
                </h3>
                <p className="text-xs text-gray-500">
                  Invite your partner to view your calendar, check-ins, and photos. They get <strong>read-only</strong> access — they can see everything but can&apos;t edit.
                </p>

                {!partnerLink || partnerLink.status === "revoked" ? (
                  <div className="space-y-2">
                    <input
                      type="text"
                      placeholder="Partner's name"
                      value={partnerName}
                      onChange={(e) => setPartnerName(e.target.value)}
                      className="w-full text-sm"
                    />
                    <input
                      type="email"
                      placeholder="Partner's email"
                      value={partnerEmail}
                      onChange={(e) => setPartnerEmail(e.target.value)}
                      className="w-full text-sm"
                    />
                    <button
                      onClick={() => {
                        if (!partnerEmail || !partnerName) return;
                        const link = createPartnerLink(partnerEmail, partnerName);
                        setPartnerLink(link);
                        setPartnerEmail("");
                        setPartnerName("");
                      }}
                      disabled={!partnerEmail || !partnerName}
                      className="btn-primary w-full text-sm disabled:opacity-40 flex items-center justify-center gap-2"
                    >
                      <Link2 className="w-4 h-4" /> Send Invite
                    </button>
                  </div>
                ) : (
                  <div className="card p-4 space-y-3">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm font-medium text-primary-700">{partnerLink.partnerName}</p>
                        <p className="text-xs text-gray-400">{partnerLink.partnerEmail}</p>
                      </div>
                      <span className={`text-xs px-2 py-1 rounded-full ${partnerLink.status === "active" ? "bg-green-50 text-green-600" : "bg-amber-50 text-amber-600"}`}>
                        {partnerLink.status === "active" ? "Connected" : "Pending"}
                      </span>
                    </div>
                    <div className="flex gap-2">
                      <button
                        onClick={() => {
                          // Refresh the token with latest data before sharing
                          const updated = refreshPartnerShareToken();
                          const token = updated?.shareToken ?? partnerLink.shareToken ?? "";
                          if (updated) setPartnerLink(updated);
                          const shareUrl = `${window.location.origin}?share=${token}`;
                          navigator.clipboard.writeText(shareUrl).then(() => {
                            setLinkCopied(true);
                            setTimeout(() => setLinkCopied(false), 2000);
                          });
                        }}
                        className="btn-secondary text-xs flex-1 flex items-center justify-center gap-1"
                      >
                        {linkCopied ? <><CheckCircle className="w-3 h-3" /> Copied!</> : <><Copy className="w-3 h-3" /> Copy Link</>}
                      </button>
                      <button
                        onClick={() => { revokePartnerLink(); setPartnerLink({ ...partnerLink, status: "revoked" }); }}
                        className="text-xs text-red-400 hover:text-red-600 px-3 py-2 rounded-lg hover:bg-red-50 flex items-center gap-1"
                      >
                        <Unlink className="w-3 h-3" /> Revoke
                      </button>
                    </div>
                    {partnerLink.lastAccessedAt && (
                      <p className="text-[10px] text-gray-400">Last accessed: {new Date(partnerLink.lastAccessedAt).toLocaleDateString()}</p>
                    )}
                  </div>
                )}
              </div>

              {/* Google Calendar Sync */}
              <div className="border-t border-gray-100 pt-4 space-y-3">
                <h3 className="text-sm font-bold text-primary-700 flex items-center gap-2">
                  <CalendarSync className="w-4 h-4" /> Google Calendar Sync
                </h3>
                <p className="text-xs text-gray-500">
                  Sync your appointments and reminders to Google Calendar on your phone.
                </p>

                <label className="flex items-center justify-between p-3 rounded-lg bg-gray-50 cursor-pointer">
                  <span className="text-sm text-gray-700">Enable sync</span>
                  <input
                    type="checkbox"
                    checked={calSync.enabled}
                    onChange={(e) => {
                      const updated = { ...calSync, enabled: e.target.checked };
                      setCalSync(updated);
                      saveCalendarSyncConfig(updated);
                    }}
                    className="w-5 h-5 accent-primary-500"
                  />
                </label>

                {calSync.enabled && (
                  <div className="space-y-2 pl-1">
                    <label className="flex items-center justify-between p-2 rounded-lg hover:bg-gray-50 cursor-pointer">
                      <span className="text-xs text-gray-600">Sync appointments &amp; scans</span>
                      <input
                        type="checkbox"
                        checked={calSync.syncEvents}
                        onChange={(e) => {
                          const updated = { ...calSync, syncEvents: e.target.checked };
                          setCalSync(updated);
                          saveCalendarSyncConfig(updated);
                        }}
                        className="w-4 h-4 accent-primary-500"
                      />
                    </label>
                    <label className="flex items-center justify-between p-2 rounded-lg hover:bg-gray-50 cursor-pointer">
                      <span className="text-xs text-gray-600">Sync reminders</span>
                      <input
                        type="checkbox"
                        checked={calSync.syncReminders}
                        onChange={(e) => {
                          const updated = { ...calSync, syncReminders: e.target.checked };
                          setCalSync(updated);
                          saveCalendarSyncConfig(updated);
                        }}
                        className="w-4 h-4 accent-primary-500"
                      />
                    </label>

                    {!calSync.googleCalendarId ? (
                      <button
                        onClick={() => {
                          // Google OAuth flow would go here — for now, show a placeholder
                          const updated = { ...calSync, googleCalendarId: "connected", lastSyncedAt: new Date().toISOString() };
                          setCalSync(updated);
                          saveCalendarSyncConfig(updated);
                        }}
                        className="btn-primary w-full text-sm flex items-center justify-center gap-2"
                      >
                        <svg className="w-4 h-4" viewBox="0 0 24 24"><path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 01-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z" fill="#4285F4"/><path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/><path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/><path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/></svg>
                        Connect Google Calendar
                      </button>
                    ) : (
                      <div className="flex items-center justify-between p-3 bg-green-50 rounded-lg">
                        <div>
                          <p className="text-xs font-medium text-green-700">Connected</p>
                          {calSync.lastSyncedAt && <p className="text-[10px] text-green-500">Last synced: {new Date(calSync.lastSyncedAt).toLocaleString()}</p>}
                        </div>
                        <button
                          onClick={() => {
                            const updated = { ...calSync, googleCalendarId: undefined, lastSyncedAt: undefined };
                            setCalSync(updated);
                            saveCalendarSyncConfig(updated);
                          }}
                          className="text-xs text-red-400 hover:text-red-600"
                        >
                          Disconnect
                        </button>
                      </div>
                    )}
                  </div>
                )}
              </div>
            </>
          )}
        </div>
      )}

      <div className="flex gap-2 mt-8">
        <button onClick={onClose} className="btn-secondary flex-1">Cancel</button>
        <button
          onClick={() => { setSaving(true); onSave(form, ext); setTimeout(() => setSaving(false), 1000); }}
          className="btn-primary flex-1"
          disabled={saving}
        >
          {saving ? "Saving..." : "Save changes"}
        </button>
      </div>
    </div>
  );
};

export default Profile;
