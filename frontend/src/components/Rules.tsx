import React, { useEffect, useMemo, useState } from 'react';
import {
  Plus, Search, Pencil, Trash2, X, Check
} from 'lucide-react';
import { useDialog } from './ui/DialogProvider';
import { editRule, loadRules, removeRule, saveRule, toggleStoredRule, type RuleCategory, type StoredRule } from '../services/rulesStore';

type Rule = StoredRule;

const categories: RuleCategory[] = ['Risk','Psychology','Trade','News','Discipline','Review','Mindset'];
const Rules: React.FC = () => {
  const dialog = useDialog();
  const [rules,setRules]=useState<Rule[]>([]);
  const [loading,setLoading]=useState(true);
  const [error,setError]=useState('');
  const [search,setSearch]=useState('');
  const [category,setCategory]=useState<'All'|RuleCategory>('All');
  const [show,setShow]=useState(false);
  const [editing,setEditing]=useState<Rule|null>(null);
  const [form,setForm]=useState({title:'',description:'',category:'Risk' as RuleCategory});

  const load=async()=>{
    try { setLoading(true); setError(''); const data = await loadRules(); setRules(data); }
    catch { setError('Could not load rules from the SQLite database. Make sure the Firebase is configured and you are signed in.'); }
    finally { setLoading(false); }
  };
  useEffect(()=>{ void load(); },[]);

  const filtered=useMemo(()=>{
    const q=search.trim().toLowerCase();
    return rules.filter(r=>(category==='All'||r.category===category)&&(!q||`${r.title} ${r.description} ${r.category}`.toLowerCase().includes(q)));
  },[rules,search,category]);

  const openAdd=()=>{setEditing(null);setForm({title:'',description:'',category:'Risk'});setShow(true);};
  const openEdit=(r:Rule)=>{setEditing(r);setForm({title:r.title,description:r.description||'',category:r.category});setShow(true);};

  const save=async()=>{
    if(!form.title.trim()) { setError('Please enter a rule title.'); return; }
    try {
      if(editing) {
        const rule = await editRule(editing._id,form);
        setRules(x=>x.map(r=>r._id===editing._id?rule:r));
      } else {
        const rule = await saveRule(form);
        setRules(x=>[rule,...x.filter(r=>r._id!==rule._id)]);
      }
      setShow(false);
    } catch { setError('Could not save the rule.'); }
  };

  const remove=async(id:string)=>{
    const rule = rules.find(r=>r._id===id);
    const confirmed = await dialog.confirm({
      title: 'Delete this rule?',
      message: rule ? `"${rule.title}" will no longer be available when you journal a trade. Past entries keep their record.` : 'This rule will be removed.',
      confirmLabel: 'Delete rule',
      tone: 'danger',
      icon: <Trash2 className="h-5 w-5" strokeWidth={1.9} />,
    });
    if(!confirmed) return;
    try { await removeRule(id); setRules(x=>x.filter(r=>r._id!==id)); dialog.toast('success','Rule deleted'); }
    catch { setError('Could not delete the rule.'); }
  };

  const toggle=async(id:string)=>{
    try { const rule = await toggleStoredRule(id); setRules(x=>x.map(r=>r._id===id?rule:r)); }
    catch { setError('Could not change the rule status.'); }
  };

  return <div className="text-[var(--ink)]">
<main><div className="app-page">
      <div className="mb-7 flex flex-wrap items-end justify-between gap-4"><div><div className="eyebrow">Discipline</div><h1 className="page-title mt-2">Rules</h1><p className="page-sub">Create and manage the rules you check every trade against.</p></div><button onClick={openAdd} className="btn-primary"><Plus className="h-4 w-4"/>Add Rule</button></div>
      {error&&<div className="mb-4 rounded-lg border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-600">{error}</div>}
      <div className="bg-[var(--surface)] border border-[var(--line)] rounded-xl overflow-hidden">
        <div className="p-3 border-b border-[var(--line)] flex flex-col md:flex-row gap-3"><div className="relative flex-1"><Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[var(--muted)]"/><input value={search} onChange={e=>setSearch(e.target.value)} placeholder="Search rules..." className="w-full h-10 rounded-lg border border-[var(--line)] pl-9 pr-3 text-[13px] outline-none"/></div><select value={category} onChange={e=>setCategory(e.target.value as any)} className="w-full md:w-52 h-10 rounded-lg border border-[var(--line)] px-3 text-[13px]">{['All',...categories].map(x=><option key={x}>{x}</option>)}</select></div>
        {loading?<div className="p-10 text-center text-sm text-[var(--muted)]">Loading rules…</div>:filtered.length===0?<div className="p-10 text-center text-sm text-[var(--muted)]">No rules yet. Add your first trading rule.</div>:
        <div className="divide-y divide-[var(--line-soft)]">{filtered.map((r,i)=><div key={r._id} className="px-5 py-4 flex items-center gap-4"><div className="w-8 text-xs text-[var(--muted)]">{i+1}</div><div className="flex-1 min-w-0"><div className="font-semibold text-[13px] text-[var(--ink)]">{r.title}</div><div className="text-[11px] text-[var(--muted)] mt-1">{r.description}</div></div><span className="rounded-md bg-[var(--surface-2)] px-2.5 py-1 mono text-[10px] font-semibold uppercase tracking-wider text-[var(--muted-strong)]">{r.category}</span><button onClick={()=>toggle(r._id)} className={`rounded-full px-3 py-1 text-[10px] font-semibold ${r.isActive?'bg-emerald-50 text-emerald-600':'bg-slate-100 text-slate-500'}`}>{r.isActive?'Active':'Inactive'}</button><button onClick={()=>openEdit(r)} className="p-2 text-slate-500 hover:bg-slate-100 rounded"><Pencil className="w-4 h-4"/></button><button onClick={()=>remove(r._id)} className="p-2 text-rose-500 hover:bg-rose-50 rounded"><Trash2 className="w-4 h-4"/></button></div>)}</div>}
      </div>
    </div></main>
    {show&&<div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/40 p-4"><div className="w-full max-w-lg rounded-xl bg-[var(--surface)] shadow-2xl"><div className="flex justify-between items-center px-5 py-4 border-b"><h2 className="font-bold text-lg">{editing?'Edit Rule':'Add Rule'}</h2><button onClick={()=>setShow(false)}><X className="w-5"/></button></div><div className="p-5 space-y-4"><div><label className="text-xs font-semibold">Rule title</label><input value={form.title} onChange={e=>setForm({...form,title:e.target.value})} className="mt-1 w-full h-10 border rounded-lg px-3 text-sm"/></div><div><label className="text-xs font-semibold">Description <span className="font-normal text-slate-400">(optional)</span></label><textarea value={form.description} onChange={e=>setForm({...form,description:e.target.value})} className="mt-1 w-full h-24 border rounded-lg px-3 py-2 text-sm"/></div><div><label className="text-xs font-semibold">Category</label><select value={form.category} onChange={e=>setForm({...form,category:e.target.value as RuleCategory})} className="mt-1 w-full h-10 border rounded-lg px-3 text-sm">{categories.map(c=><option key={c}>{c}</option>)}</select></div></div><div className="flex justify-end gap-2 border-t px-5 py-3"><button onClick={()=>setShow(false)} className="px-4 h-9 rounded-lg border text-sm">Cancel</button><button onClick={save} className="px-4 h-9 rounded-lg bg-blue-600 text-white text-sm flex items-center gap-2"><Check className="w-4 h-4"/>Save</button></div></div></div>}
  </div>;
};
export default Rules;
