import React, { useEffect, useState } from "react";
import { Award, ExternalLink, FileText, Trash2, Upload } from "lucide-react";
import { createCertificate, deleteCertificate, fetchAccounts, fetchCertificates } from "../services/api";
import { fileToFirestoreDataUrl } from "../services/fileData";
import { useDialog } from "./ui/DialogProvider";

type CertificateType = "Funded Certificate" | "Payout Certificate" | "Other";

type Certificate = {
  _id: string;
  title: string;
  certificateType: CertificateType;
  fileData: string;
  fileName: string;
  mimeType: string;
  accountId?: string;
  createdAt: string;
};

type AccountOption = { _id?: string; id: string | number; name: string };

const Certificates: React.FC = () => {
  const dialog = useDialog();
  const [certificates, setCertificates] = useState<Certificate[]>([]);
  const [accounts, setAccounts] = useState<AccountOption[]>([]);
  const [title, setTitle] = useState("");
  const [certificateType, setCertificateType] = useState<CertificateType>("Funded Certificate");
  const [accountId, setAccountId] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [saving, setSaving] = useState(false);

  const refresh = async () => {
    try {
      const [certificateResponse, accountResponse] = await Promise.all([fetchCertificates(), fetchAccounts()]);
      setCertificates(certificateResponse.data.data ?? []);
      setAccounts(accountResponse.data.data ?? []);
    } catch (error) {
      console.error("Could not load certificates.", error);
    }
  };

  useEffect(() => {
    void refresh();
  }, []);

  const save = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!file) return;
    setSaving(true);
    try {
      const fileData = await fileToFirestoreDataUrl(file, 700_000);
      await createCertificate({
        title: title.trim() || file.name.replace(/\.[^.]+$/, ""),
        certificateType,
        accountId: accountId || undefined,
        fileData,
        fileName: file.name,
        mimeType: file.type || "application/octet-stream",
      });
      setTitle("");
      setCertificateType("Funded Certificate");
      setAccountId("");
      setFile(null);
      await refresh();
    } catch (error) {
      console.error(error);
      dialog.toast("error", "Could not save the certificate", "Check that Firebase is configured and that you are signed in, then try again.");
    } finally {
      setSaving(false);
    }
  };

  const remove = async (id: string) => {
    const ok = await dialog.confirm({
      title: "Delete certificate?",
      message: "This removes the certificate from your journal. Your trading account and trades are not affected.",
      confirmLabel: "Delete certificate",
      tone: "danger",
      icon: <Trash2 className="h-5 w-5" />,
    });
    if (!ok) return;
    try {
      await deleteCertificate(id);
      setCertificates(current => current.filter(item => item._id !== id));
    } catch (error) {
      console.error(error);
      dialog.toast("error", "Could not delete the certificate");
    }
  };

  return (
    <main className="mx-auto w-full max-w-[1400px] px-4 pb-8 pt-4 lg:px-6">
      <section className="rounded-2xl border border-[var(--line)] bg-[var(--surface)] p-5 shadow-[var(--shadow-sm)]">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-3">
            <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-[var(--brand-soft)]">
              <Award className="h-5 w-5 text-[var(--brand)]" />
            </div>
            <div>
              <h1 className="text-lg font-bold text-[var(--ink)]">Certificates</h1>
              <p className="text-[11px] text-[var(--muted)]">Keep your funded, payout and other trading certificates in one place.</p>
            </div>
          </div>
          <span className="rounded-full bg-[var(--surface-2)] px-3 py-1 text-[10px] font-semibold text-[var(--muted-strong)]">{certificates.length} saved</span>
        </div>

        <form onSubmit={save} className="mt-5 grid gap-3 rounded-xl border border-dashed border-[var(--line-strong)] bg-[var(--surface-2)] p-3 md:grid-cols-[1fr_180px_180px_auto] md:items-end">
          <div>
            <label className="mb-1 block text-[10px] font-semibold text-[var(--ink)]">Certificate name</label>
            <input value={title} onChange={e => setTitle(e.target.value)} placeholder="e.g. FTMO Funded Certificate" className="h-9 w-full rounded-md border border-[var(--line-strong)] bg-[var(--surface)] px-3 text-[11px] outline-none focus:border-[var(--brand)]" />
          </div>
          <div>
            <label className="mb-1 block text-[10px] font-semibold text-[var(--ink)]">Type</label>
            <select value={certificateType} onChange={e => setCertificateType(e.target.value as CertificateType)} className="h-9 w-full rounded-md border border-[var(--line-strong)] bg-[var(--surface)] px-3 text-[11px] outline-none focus:border-[var(--brand)]">
              <option>Funded Certificate</option>
              <option>Payout Certificate</option>
              <option>Other</option>
            </select>
          </div>
          <div>
            <label className="mb-1 block text-[10px] font-semibold text-[var(--ink)]">Account</label>
            <select value={accountId} onChange={e => setAccountId(e.target.value)} className="h-9 w-full rounded-md border border-[var(--line-strong)] bg-[var(--surface)] px-3 text-[11px] outline-none focus:border-[var(--brand)]">
              <option value="">Not linked</option>
              {accounts.map(account => <option key={String(account.id)} value={account._id || String(account.id)}>{account.name}</option>)}
            </select>
          </div>
          <label className="flex h-9 cursor-pointer items-center justify-center gap-2 rounded-md bg-[var(--brand)] px-4 text-[10px] font-semibold text-white hover:opacity-90">
            <Upload className="h-3.5 w-3.5" /> {file ? "Change file" : "Choose file"}
            <input type="file" accept="image/*,.pdf" className="hidden" onChange={e => setFile(e.target.files?.[0] || null)} />
          </label>
          <div className="md:col-span-4 flex items-center justify-between gap-3">
            <span className="truncate text-[10px] text-[var(--muted)]">{file ? file.name : "PNG, JPG, WEBP or PDF"}</span>
            <button type="submit" disabled={!file || saving} className="h-9 rounded-md border border-[var(--line-strong)] bg-[var(--surface)] px-4 text-[10px] font-bold text-[var(--ink)] disabled:cursor-not-allowed disabled:opacity-50">{saving ? "Saving…" : "Save certificate"}</button>
          </div>
        </form>

        {certificates.length > 0 ? (
          <div className="mt-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            {certificates.map(cert => (
              <article key={cert._id} className="overflow-hidden rounded-xl border border-[var(--line)] bg-[var(--surface-2)]">
                <div className="aspect-[4/3] bg-black/5">
                  {cert.mimeType.startsWith("image/") ? <img src={cert.fileData} alt={cert.title} className="h-full w-full object-cover" /> : <div className="flex h-full flex-col items-center justify-center gap-2 text-[var(--muted)]"><FileText className="h-10 w-10" /><span className="text-[10px] font-semibold">PDF certificate</span></div>}
                </div>
                <div className="p-3">
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0"><h3 className="truncate text-[11px] font-bold text-[var(--ink)]">{cert.title}</h3><p className="mt-1 text-[9px] text-[var(--muted)]">{cert.certificateType}</p></div>
                    <button type="button" onClick={() => remove(cert._id)} className="rounded-md p-1.5 text-[var(--muted)] hover:bg-rose-50 hover:text-rose-500" aria-label={`Delete ${cert.title}`}><Trash2 className="h-3.5 w-3.5" /></button>
                  </div>
                  {cert.accountId && <p className="mt-2 truncate text-[9px] text-[var(--muted)]">Account: {accounts.find(a => a._id === cert.accountId)?.name || "Archived account"}</p>}
                  <a href={cert.fileData} target="_blank" rel="noreferrer" className="mt-2 inline-flex items-center gap-1 text-[9px] font-semibold text-[var(--brand)] hover:underline">Open certificate <ExternalLink className="h-3 w-3" /></a>
                </div>
              </article>
            ))}
          </div>
        ) : (
          <div className="mt-5 rounded-xl border border-dashed border-[var(--line)] px-5 py-10 text-center"><Award className="mx-auto h-7 w-7 text-[var(--muted)]" /><p className="mt-2 text-[11px] font-semibold text-[var(--ink)]">No certificates yet</p><p className="mt-1 text-[10px] text-[var(--muted)]">Upload your first funded or payout certificate above.</p></div>
        )}
      </section>
    </main>
  );
};

export default Certificates;
