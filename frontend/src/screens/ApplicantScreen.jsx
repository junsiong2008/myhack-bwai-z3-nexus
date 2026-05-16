import { useState, useRef } from 'react';
import { Check, Plus } from '../icons';

export default function ApplicantScreen({ addPendingApplication }) {
  const [companyName, setCompanyName] = useState("");
  const [pitch, setPitch] = useState("");
  const [teamSize, setTeamSize] = useState("");
  const [foundedYear, setFoundedYear] = useState("");
  const [pdfFile, setPdfFile] = useState(null);
  const [submitted, setSubmitted] = useState(false);
  const fileRef = useRef(null);

  const canSubmit = companyName.trim() && pitch.trim();

  const handleSubmit = () => {
    if (!canSubmit) return;
    addPendingApplication({
      companyName: companyName.trim(),
      pitch,
      teamSize: teamSize ? Number(teamSize) : undefined,
      foundedYear: foundedYear ? Number(foundedYear) : undefined,
      pdfFileName: pdfFile?.name || null,
      submittedAt: new Date().toISOString(),
    });
    setSubmitted(true);
  };

  if (submitted) {
    return (
      <div className="max-w-lg mx-auto mt-16 text-center">
        <div className="w-14 h-14 rounded-full flex items-center justify-center mx-auto mb-5"
             style={{ background: "var(--nx-success-50)" }}>
          <Check size={28} style={{ color: "#1D9E75" }} />
        </div>
        <h2 className="text-[22px] font-semibold tracking-tight mb-2">Application submitted successfully</h2>
        <p className="text-[14px] mb-6" style={{ color: "var(--nx-text-2)" }}>
          Your application has been received. The programme team will review it shortly.
        </p>
        <button
          onClick={() => {
            setSubmitted(false);
            setCompanyName("");
            setPitch("");
            setTeamSize("");
            setFoundedYear("");
            setPdfFile(null);
          }}
          className="nx-btn-outline text-[13px]">
          Submit another application
        </button>
      </div>
    );
  }

  return (
    <div className="max-w-2xl">
      <div className="nx-card p-6">
        <h2 className="text-[18px] font-semibold tracking-tight mb-1">Submit your application</h2>
        <p className="text-[13px] mb-6" style={{ color: "var(--nx-text-2)" }}>
          Fill in the details below. All fields marked with * are required.
        </p>

        <div className="space-y-4">
          <div>
            <label className="text-[12px] font-medium uppercase tracking-wide" style={{ color: "var(--nx-text-2)" }}>
              Company name *
            </label>
            <input
              className="nx-input mt-1.5 w-full"
              placeholder="e.g. Tanah Technologies"
              value={companyName}
              onChange={(e) => setCompanyName(e.target.value)}
            />
          </div>

          <div>
            <label className="text-[12px] font-medium uppercase tracking-wide" style={{ color: "var(--nx-text-2)" }}>
              Pitch description *
            </label>
            <textarea
              className="nx-input mt-1.5 resize-none text-[14px] leading-relaxed w-full"
              placeholder="Describe your startup, the problem you solve, your target market, and your traction so far…"
              style={{ height: 200, lineHeight: 1.5 }}
              value={pitch}
              onChange={(e) => setPitch(e.target.value)}
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="text-[12px] font-medium uppercase tracking-wide" style={{ color: "var(--nx-text-2)" }}>
                Team size
              </label>
              <input
                className="nx-input mt-1.5 w-full"
                placeholder="—"
                type="number"
                min="1"
                value={teamSize}
                onChange={(e) => setTeamSize(e.target.value)}
              />
            </div>
            <div>
              <label className="text-[12px] font-medium uppercase tracking-wide" style={{ color: "var(--nx-text-2)" }}>
                Founded year
              </label>
              <input
                className="nx-input mt-1.5 w-full"
                placeholder="—"
                type="number"
                min="2000"
                max="2026"
                value={foundedYear}
                onChange={(e) => setFoundedYear(e.target.value)}
              />
            </div>
          </div>

          <div>
            <label className="text-[12px] font-medium uppercase tracking-wide" style={{ color: "var(--nx-text-2)" }}>
              Supporting document (PDF)
            </label>
            <div className="mt-1.5">
              <button
                type="button"
                onClick={() => fileRef.current?.click()}
                className="nx-btn-outline text-[13px] flex items-center gap-2"
                style={{ borderColor: "var(--nx-border)", color: "var(--nx-text-2)" }}>
                <Plus size={14} />
                {pdfFile ? pdfFile.name : "Upload PDF"}
              </button>
              <input
                ref={fileRef}
                type="file"
                accept=".pdf"
                className="hidden"
                onChange={(e) => setPdfFile(e.target.files?.[0] || null)}
              />
              {pdfFile && (
                <span className="ml-3 text-[12px]" style={{ color: "var(--nx-text-3)" }}>
                  {(pdfFile.size / 1024).toFixed(0)} KB
                </span>
              )}
            </div>
          </div>
        </div>

        <button
          onClick={handleSubmit}
          disabled={!canSubmit}
          className="nx-btn-primary w-full mt-6 flex items-center justify-center gap-2">
          Submit Application
        </button>
      </div>
    </div>
  );
}
