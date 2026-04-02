import React, { useState } from "react";
import type { OnboardingData, ExtendedProfile } from "@/lib/types";

interface ProfileProps {
  data: OnboardingData;
  extendedProfile: ExtendedProfile;
  onSave: (data: OnboardingData, extended: ExtendedProfile) => void;
  onClose: () => void;
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

const Profile: React.FC<ProfileProps> = ({ data, extendedProfile, onSave, onClose }) => {
  const [form, setForm] = useState<OnboardingData>({ ...data });
  const [ext, setExt] = useState<ExtendedProfile>({ ...extendedProfile });
  const [saving, setSaving] = useState(false);
  const [tab, setTab] = useState<"basics" | "medical" | "emergency">("basics");

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
        {(["basics", "medical", "emergency"] as const).map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={`flex-1 py-2 text-xs font-medium rounded-lg transition-all ${tab === t ? "bg-white text-primary-700 shadow-sm" : "text-primary-400 hover:text-primary-600"}`}
          >
            {t === "basics" ? "Basics" : t === "medical" ? "Medical" : "Emergency"}
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
            <input type="text" value={(ext.currentMedications ?? []).join(", ")} onChange={e => updateExt({ currentMedications: e.target.value ? e.target.value.split(",").map(s => s.trim()).filter(Boolean) : [] })} className="w-full" placeholder="e.g. Prenatal vitamins, Iron supplements" />
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
