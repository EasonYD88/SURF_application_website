import React, { useEffect, useMemo, useRef, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Checkbox } from "@/components/ui/checkbox";
import { Separator } from "@/components/ui/separator";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Calendar,
  Download,
  Filter,
  Plus,
  Search,
  Settings,
  Trash2,
  Upload,
  Unlink,
} from "lucide-react";

// -----------------------------
// Types
// -----------------------------

type ID = string;

type ProjectStatus =
  | "Prospecting"
  | "Need Outreach"
  | "Preparing"
  | "Submitted"
  | "Interview"
  | "Offer"
  | "Rejected"
  | "Closed";

type Priority = "High" | "Medium" | "Low";

type YesNoOpt = "Yes" | "No" | "Optional";

type Project = {
  id: ID;
  projectId: string;
  name: string;
  institution: string;
  region: string;
  type: string;
  officialLink: string;
  keywords: string[];
  piLab: string;
  needsOutreach: YesNoOpt;
  round: string;
  ddl: string;
  period: string;
  funding: string[];
  eligibility: string;
  materials: string[];
  portalStatus: "Not Open" | "Open" | "Closed";
  status: ProjectStatus;
  fit: number;
  risk: number;
  roi: number;
  priority: Priority;
  decision: "Apply" | "Maybe" | "No";
  nextAction: string;
  nextActionDate: string;
  outreachIds: ID[];
  materialTaskIds: ID[];
  notes: string;
};

type OutreachStage = "Drafting" | "Sent" | "Follow-up" | "Meeting" | "Closed";

type Outreach = {
  id: ID;
  outreachId: string;
  piName: string;
  institution: string;
  directions: string[];
  contact: string;
  firstContact: string;
  emailVersion: string;
  replied: "No reply" | "Replied" | "Auto-reply";
  replyDate: string;
  replySummary: string;
  stage: OutreachStage;
  nextFollowUp: string;
  nextAction: string;
  projectIds: ID[];
  notes: string;
  threadId?: string;
};

type MaterialStatus = "未开始" | "草稿" | "已修改" | "定稿" | "已提交";

type MaterialTask = {
  id: ID;
  taskId: string;
  type:
    | "CV"
    | "Research Statement"
    | "SOP"
    | "Recommendation Letter"
    | "Transcript"
    | "Writing Sample"
    | "Language"
    | "Portfolio"
    | "Other";
  targetProject: ID | "通用";
  status: MaterialStatus;
  version: string;
  due: string;
  dependency: string;
  link: string;
  fileName?: string;
  fileLastModified?: string;
  notes: string;
};

type Decision = {
  id: ID;
  projectInternalId: ID;
  conclusion: "Apply" | "Maybe" | "No";
  priority: Priority;
  whyApply: string;
  risks: string;
  fitEvidence: string;
  strategy: string;
  postResult: "" | "Interview" | "Offer" | "Rejected" | "No response";
  timeline: string;
  worked: string;
  didnt: string;
  improvements: string;
  takeaways: string;
};

// -----------------------------
// Utilities
// -----------------------------

const LS_KEY = "summer_research_tracker_v1";

function uid(prefix = "id"): ID {
  return `${prefix}_${Math.random().toString(16).slice(2)}_${Date.now().toString(16)}`;
}

function todayISO(): string {
  const d = new Date();
  const yyyy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const dd = String(d.getDate()).padStart(2, "0");
  return `${yyyy}-${mm}-${dd}`;
}

function parseDateOrInf(s: string): number {
  if (!s) return Number.POSITIVE_INFINITY;
  const t = Date.parse(s);
  return Number.isFinite(t) ? t : Number.POSITIVE_INFINITY;
}

function parseDateOrNull(s: string): number | null {
  if (!s) return null;
  const t = Date.parse(s);
  return Number.isFinite(t) ? t : null;
}

function dateToString(d: Date | null): string {
  if (!d) return "";
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  const year = d.getFullYear();
  return `${month}/${day}/${year}`;
}

function formatDateInput(s: string): string {
  // 自动添加斜杠
  const cleaned = s.replace(/[^\d]/g, '');
  if (cleaned.length <= 2) {
    return cleaned;
  } else if (cleaned.length <= 4) {
    return `${cleaned.slice(0, 2)}/${cleaned.slice(2)}`;
  } else {
    return `${cleaned.slice(0, 2)}/${cleaned.slice(2, 4)}/${cleaned.slice(4, 8)}`;
  }
}

function parseDateInput(s: string): string {
  if (!s) return "";
  const cleaned = s.replace(/[^\d]/g, '');
  
  // 完整格式: MMDDYYYY (8位数字)
  if (cleaned.length === 8) {
    const month = cleaned.slice(0, 2);
    const day = cleaned.slice(2, 4);
    const year = cleaned.slice(4, 8);
    const date = new Date(`${year}-${month}-${day}`);
    if (!isNaN(date.getTime()) && 
        date.getMonth() + 1 === parseInt(month) && 
        date.getDate() === parseInt(day)) {
      return `${month}/${day}/${year}`;
    }
  }
  
  // 支持 MM/DD/YYYY 或 M/D/YYYY 格式
  const slashFormat = s.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
  if (slashFormat) {
    const [, month, day, year] = slashFormat;
    const date = new Date(`${year}-${month.padStart(2, '0')}-${day.padStart(2, '0')}`);
    if (!isNaN(date.getTime()) && 
        date.getMonth() + 1 === parseInt(month) && 
        date.getDate() === parseInt(day)) {
      return `${month.padStart(2, '0')}/${day.padStart(2, '0')}/${year}`;
    }
  }
  
  // 支持 MM/DD 格式，自动补充当前年份
  const shortFormat = s.match(/^(\d{1,2})\/(\d{1,2})$/);
  if (shortFormat) {
    const [, month, day] = shortFormat;
    const currentYear = new Date().getFullYear();
    const date = new Date(`${currentYear}-${month.padStart(2, '0')}-${day.padStart(2, '0')}`);
    if (!isNaN(date.getTime()) && 
        date.getMonth() + 1 === parseInt(month) && 
        date.getDate() === parseInt(day)) {
      return `${month.padStart(2, '0')}/${day.padStart(2, '0')}/${currentYear}`;
    }
  }
  
  // 支持 MMDD 格式 (4位数字)，自动补充当前年份
  if (cleaned.length === 4) {
    const month = cleaned.slice(0, 2);
    const day = cleaned.slice(2, 4);
    const currentYear = new Date().getFullYear();
    const date = new Date(`${currentYear}-${month}-${day}`);
    if (!isNaN(date.getTime()) && 
        date.getMonth() + 1 === parseInt(month) && 
        date.getDate() === parseInt(day)) {
      return `${month}/${day}/${currentYear}`;
    }
  }
  
  // 尝试其他格式
  const date = new Date(s);
  if (!isNaN(date.getTime())) {
    return dateToString(date);
  }
  
  return s; // 返回原始输入，让用户看到无效输入
}

function formatDateForDisplay(s: string): string {
  if (!s) return "";
  // Check if it matches MM/DD/YYYY
  const match = s.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
  if (match) {
    const [, month, day, year] = match;
    const currentYear = new Date().getFullYear();
    if (parseInt(year) === currentYear) {
      return `${month.padStart(2, '0')}/${day.padStart(2, '0')}`;
    }
  }
  return s;
}

function clamp01_10(n: number): number {
  if (!Number.isFinite(n)) return 0;
  return Math.max(0, Math.min(10, Math.round(n * 10) / 10));
}

function csvEscape(v: string) {
  const needs = /[",\n]/.test(v);
  const vv = v.replace(/"/g, '""');
  return needs ? `"${vv}"` : vv;
}

function downloadText(filename: string, content: string) {
  const blob = new Blob([content], { type: "text/plain;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}

function safeStorageGet(key: string): string | null {
  try {
    if (typeof window === "undefined") return null;
    return window.localStorage.getItem(key);
  } catch {
    return null;
  }
}

function safeStorageSet(key: string, value: string) {
  try {
    if (typeof window === "undefined") return;
    window.localStorage.setItem(key, value);
  } catch {
    return;
  }
}

// -----------------------------
// Seed Data (Example)
// -----------------------------

const seed = () => {
  const p1: Project = {
    id: uid("p"),
    projectId: "SR-2026-01",
    name: "Summer Research Internship in Computational Biology",
    institution: "Example University",
    region: "USA",
    type: "Summer Research Program",
    officialLink: "https://example.edu/summer-research",
    keywords: ["Computational Chemistry", "GPCR", "Docking", "ML", "Free Energy"],
    piLab: "Dr. A. Smith — Structural Pharmacology Lab",
    needsOutreach: "Yes",
    round: "Round 1",
    ddl: "2026-02-01",
    period: "2026-06-01 ~ 2026-08-15",
    funding: ["stipend", "housing"],
    eligibility: "Master/PhD track preferred; programming required",
    materials: ["CV", "Research Statement", "Transcript", "2 Letters"],
    portalStatus: "Open",
    status: "Preparing",
    fit: 9,
    risk: 7,
    roi: 9,
    priority: "High",
    decision: "Apply",
    nextAction: "Send outreach email with CV + 1-page summary",
    nextActionDate: "2026-01-05",
    outreachIds: [],
    materialTaskIds: [],
    notes: "Recent relevant publications; method-development friendly.",
  };

  const p2: Project = {
    id: uid("p"),
    projectId: "SR-2026-02",
    name: "Visiting Student Research Fellowship (Chemistry)",
    institution: "Example Institute",
    region: "EU",
    type: "Visiting Student",
    officialLink: "",
    keywords: ["Computational Chemistry", "Drug Discovery"],
    piLab: "",
    needsOutreach: "Optional",
    round: "Single",
    ddl: "2026-01-20",
    period: "Summer 2026",
    funding: ["travel"],
    eligibility: "Strong academic record; statement required",
    materials: ["CV", "SOP", "Transcript"],
    portalStatus: "Not Open",
    status: "Prospecting",
    fit: 8,
    risk: 6,
    roi: 8,
    priority: "Medium",
    decision: "Maybe",
    nextAction: "Confirm opening date; shortlist 2 labs",
    nextActionDate: "2025-12-28",
    outreachIds: [],
    materialTaskIds: [],
    notes: "Need to verify eligibility for current degree.",
  };

  const o1: Outreach = {
    id: uid("o"),
    outreachId: "PI-2026-01",
    piName: "A. Smith",
    institution: "Example University",
    directions: ["GPCR", "Docking", "ML"],
    contact: "asmith@example.edu",
    firstContact: "2026-01-05",
    emailVersion: "v2-tailored",
    replied: "No reply",
    replyDate: "",
    replySummary: "",
    stage: "Sent",
    nextFollowUp: "2026-01-12",
    nextAction: "Follow up with 1-page proposal summary",
    projectIds: [],
    notes: "Keep email concise; include 2 most relevant outputs.",
  };

  const m1: MaterialTask = {
    id: uid("m"),
    taskId: "MAT-01",
    type: "CV",
    targetProject: "通用",
    status: "已修改",
    version: "v2",
    due: "2026-01-10",
    dependency: "",
    link: "",
    notes: "Add 2 representative projects + skills summary.",
  };

  const m2: MaterialTask = {
    id: uid("m"),
    taskId: "MAT-02",
    type: "Research Statement",
    targetProject: p1.id,
    status: "草稿",
    version: "v1",
    due: "2026-01-15",
    dependency: "Need PI focus confirmed",
    link: "",
    notes: "Emphasize compute→experiment loop.",
  };

  const d1: Decision = {
    id: uid("d"),
    projectInternalId: p2.id,
    conclusion: "Apply",
    priority: "Medium",
    whyApply:
      "- Strong alignment with computational chemistry + drug discovery\n- Travel funding lowers cost\n- Clear PI/lab options once portal opens",
    risks:
      "- Early DDL and tight materials timeline\n- Competitive; may prefer PhD-only\n- Recommendation letter uncertainty",
    fitEvidence:
      "- Prior screening + docking + assay validation experience\n- Python + modeling + free-energy familiarity\n- Potential for method benchmark + dataset curation",
    strategy:
      "- Outreach: short email + 2 relevant outputs\n- Materials: tailor RS around closed-loop pipeline\n- Backup: alternative labs within same institute",
    postResult: "",
    timeline: "",
    worked: "",
    didnt: "",
    improvements: "",
    takeaways: "",
  };

  p1.outreachIds = [o1.id];
  p1.materialTaskIds = [m1.id, m2.id];
  o1.projectIds = [p1.id];

  return {
    projects: [p1, p2],
    outreach: [o1],
    materials: [m1, m2],
    decisions: [d1],
    meta: {
      version: 1,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    },
  };
};

type Store = ReturnType<typeof seed>;

function normalizeStore(input: any): Store {
  const base: Store = seed();
  const s: Store = {
    projects: Array.isArray(input?.projects) ? input.projects : base.projects,
    outreach: Array.isArray(input?.outreach) ? input.outreach : base.outreach,
    materials: Array.isArray(input?.materials) ? input.materials : base.materials,
    decisions: Array.isArray(input?.decisions) ? input.decisions : base.decisions,
    meta: {
      version: 1,
      createdAt: String(input?.meta?.createdAt || base.meta.createdAt),
      updatedAt: String(input?.meta?.updatedAt || base.meta.updatedAt),
    },
  };

  const projectIds = new Set(s.projects.map((p) => p.id));
  const outreachIds = new Set(s.outreach.map((o) => o.id));
  const materialIds = new Set(s.materials.map((m) => m.id));

  const nextProjects = s.projects.map((p) => ({
    ...p,
    keywords: Array.isArray(p.keywords) ? p.keywords : [],
    funding: Array.isArray(p.funding) ? p.funding : [],
    materials: Array.isArray(p.materials) ? p.materials : [],
    outreachIds: Array.isArray(p.outreachIds)
      ? p.outreachIds.filter((x) => outreachIds.has(x))
      : [],
    materialTaskIds: Array.isArray(p.materialTaskIds)
      ? p.materialTaskIds.filter((x) => materialIds.has(x))
      : [],
  }));

  const nextOutreach = s.outreach.map((o) => ({
    ...o,
    directions: Array.isArray(o.directions) ? o.directions : [],
    projectIds: Array.isArray(o.projectIds)
      ? o.projectIds.filter((pid) => projectIds.has(pid))
      : [],
  }));

  const nextMaterials = s.materials.map((m) => ({
    ...m,
    targetProject:
      m.targetProject === "通用" || projectIds.has(m.targetProject)
        ? m.targetProject
        : "通用",
  }));

  const projById = new Map(nextProjects.map((p) => [p.id, p] as const));
  const outById = new Map(nextOutreach.map((o) => [o.id, o] as const));

  for (const o of nextOutreach) {
    for (const pid of o.projectIds) {
      const p = projById.get(pid);
      if (!p) continue;
      if (!p.outreachIds.includes(o.id)) {
        p.outreachIds = Array.from(new Set([...(p.outreachIds || []), o.id]));
      }
    }
  }

  for (const m of nextMaterials) {
    if (m.targetProject === "通用") continue;
    const p = projById.get(m.targetProject);
    if (!p) continue;
    if (!p.materialTaskIds.includes(m.id)) {
      p.materialTaskIds = Array.from(new Set([...(p.materialTaskIds || []), m.id]));
    }
  }

  for (const p of nextProjects) {
    p.outreachIds = (p.outreachIds || []).filter((oid) => outById.has(oid));
  }

  const nextDecisions = (Array.isArray(s.decisions) ? s.decisions : base.decisions)
    .filter((d: any) => projectIds.has(d?.projectInternalId))
    .map((d: any) => ({
      ...d,
      postResult: d?.postResult ?? "",
    }));

  return {
    projects: nextProjects,
    outreach: nextOutreach,
    materials: nextMaterials,
    decisions: nextDecisions,
    meta: { ...s.meta, updatedAt: new Date().toISOString() },
  };
}

function loadStore(): Store {
  try {
    const raw = safeStorageGet(LS_KEY);
    if (!raw) return seed();
    const parsed = JSON.parse(raw);
    if (!parsed?.projects || !parsed?.outreach || !parsed?.materials || !parsed?.decisions) {
      return seed();
    }
    return normalizeStore(parsed);
  } catch {
    return seed();
  }
}

function saveStore(s: Store) {
  const next = normalizeStore({
    ...s,
    meta: { ...s.meta, updatedAt: new Date().toISOString() },
  });
  safeStorageSet(LS_KEY, JSON.stringify(next));
  return next;
}

// -----------------------------
// Constants
// -----------------------------

const STATUS_LIST: ProjectStatus[] = [
  "Prospecting",
  "Need Outreach",
  "Preparing",
  "Submitted",
  "Interview",
  "Offer",
  "Rejected",
  "Closed",
];

const PRIORITIES: Priority[] = ["High", "Medium", "Low"];

const DECISION_OPTIONS: SelectOption[] = [
  { value: "Apply", label: "Apply" },
  { value: "Maybe", label: "Maybe" },
  { value: "No", label: "No" },
];

// -----------------------------
// Small UI helpers
// -----------------------------

function Pill({ children }: { children: React.ReactNode }) {
  return (
    <Badge variant="secondary" className="rounded-full">
      {children}
    </Badge>
  );
}

function SectionTitle({ title, right }: { title: string; right?: React.ReactNode }) {
  return (
    <div className="flex items-center justify-between gap-4">
      <div className="text-xl font-bold tracking-tight text-foreground">{title}</div>
      {right}
    </div>
  );
}

function EmptyState({
  title,
  desc,
  action,
}: {
  title: string;
  desc?: string;
  action?: React.ReactNode;
}) {
  return (
    <Card className="border-dashed border-border/50 bg-muted/20 shadow-sm">
      <CardHeader className="pb-3">
        <CardTitle className="text-lg font-semibold text-muted-foreground">{title}</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {desc ? <div className="text-sm text-muted-foreground leading-relaxed">{desc}</div> : null}
        {action}
      </CardContent>
    </Card>
  );
}

type SelectOption = { value: string; label: string; disabled?: boolean };

function SelectBox({
  value,
  onValueChange,
  options,
  className,
  id,
}: {
  value?: string;
  onValueChange: (v: string) => void;
  options: SelectOption[];
  className?: string;
  id?: string;
}) {
  const v = value ?? "";
  return (
    <Select value={v} onValueChange={onValueChange}>
      <SelectTrigger id={id} className={className}>
        <SelectValue placeholder="Select..." />
      </SelectTrigger>
      <SelectContent>
        {options.map((o) => (
          <SelectItem key={o.value} value={o.value || "_empty_"} disabled={o.disabled}>
            {o.label}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}

// -----------------------------
// Main App
// -----------------------------

function SettingsDialog() {
  const [open, setOpen] = useState(false);
  const [storageRoot, setStorageRoot] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (open) {
      fetch('http://localhost:3001/config')
        .then(res => res.json())
        .then(data => setStorageRoot(data.storageRoot))
        .catch(err => console.error(err));
    }
  }, [open]);

  const handleSave = async () => {
    setLoading(true);
    try {
      await fetch('http://localhost:3001/config', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ storageRoot })
      });
      setOpen(false);
    } catch (err) {
      alert('Failed to save config');
    } finally {
      setLoading(false);
    }
  };

  const handleOpenFolder = async () => {
    try {
      await fetch('http://localhost:3001/open-folder', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ path: storageRoot })
      });
    } catch (err) {
      alert('Failed to open folder');
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" className="gap-2">
          <Settings className="h-4 w-4" />
          Settings
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Settings</DialogTitle>
          <DialogDescription>Configure application settings</DialogDescription>
        </DialogHeader>
        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <Label>External Storage Path</Label>
            <div className="flex gap-2">
              <Input 
                value={storageRoot} 
                onChange={(e) => setStorageRoot(e.target.value)} 
                placeholder="/path/to/storage"
              />
              <Button variant="outline" size="icon" onClick={handleOpenFolder} title="Open in File Explorer">
                <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 19a2 2 0 01-2-2V7a2 2 0 012-2h4l2 2h4a2 2 0 012 2v1M5 19h14a2 2 0 002-2v-5a2 2 0 00-2-2H9a2 2 0 00-2 2v5a2 2 0 01-2 2z" />
                </svg>
              </Button>
            </div>
            <p className="text-xs text-muted-foreground">
              Absolute path to the folder where files will be stored.
            </p>
          </div>
        </div>
        <DialogFooter>
          <Button onClick={handleSave} disabled={loading}>
            {loading ? 'Saving...' : 'Save Changes'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export default function SummerResearchTrackerApp() {
  const [store, setStore] = useState<Store>(() => loadStore());
  const [activeTab, setActiveTab] = useState<
    "dashboard" | "projects" | "outreach" | "materials" | "decisions"
  >("dashboard");

  const [q, setQ] = useState("");
  const [showOnlyUpcoming, setShowOnlyUpcoming] = useState(false);

  const [statusFilter, setStatusFilter] = useState<ProjectStatus | "ALL">("ALL");
  const [priorityFilter, setPriorityFilter] = useState<Priority | "ALL">("ALL");
  const [decisionFilter, setDecisionFilter] = useState<"Apply" | "Maybe" | "No" | "ALL">(
    "ALL"
  );

  const [viewingDecision, setViewingDecision] = useState<Decision | null>(null);
  const [followupReminders, setFollowupReminders] = useState<any[]>([]);

  useEffect(() => {
    saveStore(store);
  }, [store]);

  // Check for follow-ups on mount and every hour
  useEffect(() => {
    const checkFollowups = async () => {
      try {
        const response = await fetch('http://localhost:3001/check-followups', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ outreachList: store.outreach }),
        });
        const data = await response.json();
        if (data.results && data.results.length > 0) {
          setFollowupReminders(data.results);
        }
      } catch (error) {
        console.error('Failed to check follow-ups:', error);
      }
    };

    checkFollowups();
    const interval = setInterval(checkFollowups, 60 * 60 * 1000); // Check every hour

    return () => clearInterval(interval);
  }, [store.outreach]);

  const projectsById = useMemo(
    () => new Map(store.projects.map((p) => [p.id, p] as const)),
    [store.projects]
  );

  const filteredProjects = useMemo(() => {
    const needle = q.trim().toLowerCase();
    const now = Date.now();

    return store.projects
      .filter((p) => {
        if (statusFilter !== "ALL" && p.status !== statusFilter) return false;
        if (priorityFilter !== "ALL" && p.priority !== priorityFilter) return false;
        if (decisionFilter !== "ALL" && p.decision !== decisionFilter) return false;

        if (showOnlyUpcoming) {
          const nextAct = parseDateOrNull(p.nextActionDate);
          const ddl = parseDateOrNull(p.ddl);
          if (!((nextAct !== null && nextAct >= now) || (ddl !== null && ddl >= now))) {
            return false;
          }
        }

        if (!needle) return true;
        const hay = [
          p.projectId,
          p.name,
          p.institution,
          p.region,
          p.type,
          p.piLab,
          (p.keywords || []).join(" "),
          (p.materials || []).join(" "),
          p.notes,
        ]
          .join(" | ")
          .toLowerCase();
        return hay.includes(needle);
      })
      .sort((a, b) => parseDateOrInf(a.ddl) - parseDateOrInf(b.ddl));
  }, [store.projects, q, statusFilter, priorityFilter, decisionFilter, showOnlyUpcoming]);

  const dashboard = useMemo(() => {
    const counts = new Map<ProjectStatus, number>();
    STATUS_LIST.forEach((s) => counts.set(s, 0));
    for (const p of store.projects) counts.set(p.status, (counts.get(p.status) || 0) + 1);

    const now = Date.now();
    const sortedByDDL = [...store.projects].sort((a, b) => parseDateOrInf(a.ddl) - parseDateOrInf(b.ddl));
    const nextDDL =
      sortedByDDL.find((p) => {
        const t = parseDateOrNull(p.ddl);
        return t !== null && t >= now;
      }) || sortedByDDL.find((p) => p.ddl);

    const upcomingFollowUps = [...store.outreach]
      .filter((o) => o.nextFollowUp)
      .sort((a, b) => parseDateOrInf(a.nextFollowUp) - parseDateOrInf(b.nextFollowUp))
      .slice(0, 5);

    const tasksDue = [...store.materials]
      .filter((m) => m.due)
      .sort((a, b) => parseDateOrInf(a.due) - parseDateOrInf(b.due))
      .slice(0, 6);

    const actions = [...store.projects]
      .filter((p) => p.nextActionDate)
      .sort((a, b) => parseDateOrInf(a.nextActionDate) - parseDateOrInf(b.nextActionDate))
      .slice(0, 6);

    const decisionStats = {
      total: store.decisions.length,
      apply: store.decisions.filter(d => d.conclusion === "Apply").length,
      maybe: store.decisions.filter(d => d.conclusion === "Maybe").length,
      no: store.decisions.filter(d => d.conclusion === "No").length,
    };

    return { counts, nextDDL, upcomingFollowUps, tasksDue, actions, decisionStats };
  }, [store.projects, store.outreach, store.materials, store.decisions]);

  const fileInputRef = useRef<HTMLInputElement | null>(null);

  function exportJSON() {
    downloadText(`summer-research-tracker_${todayISO()}.json`, JSON.stringify(store, null, 2));
  }

  function exportProjectsCSV() {
    const headers = [
      "ProjectID",
      "Name",
      "Institution",
      "Region",
      "Type",
      "DDL",
      "Funding",
      "Status",
      "Fit",
      "Risk",
      "ROI",
      "Priority",
      "Decision",
      "NextAction",
      "NextActionDate",
      "OfficialLink",
    ];

    const rows = store.projects.map((p) => [
      p.projectId,
      p.name,
      p.institution,
      p.region,
      p.type,
      p.ddl,
      (p.funding || []).join(";"),
      p.status,
      String(p.fit),
      String(p.risk),
      String(p.roi),
      p.priority,
      p.decision,
      p.nextAction,
      p.nextActionDate,
      p.officialLink,
    ]);

    const csv = [headers, ...rows]
      .map((r) => r.map((x) => csvEscape(String(x || ""))).join(","))
      .join("\n");
    downloadText(`projects_${todayISO()}.csv`, csv);
  }

  function triggerImport() {
    fileInputRef.current?.click();
  }

  function handleImportFile(file: File) {
    const reader = new FileReader();
    reader.onload = () => {
      try {
        const parsed = JSON.parse(String(reader.result || ""));
        if (!parsed?.projects || !parsed?.outreach || !parsed?.materials || !parsed?.decisions) {
          throw new Error("Invalid file shape");
        }
        setStore(
          normalizeStore({
            ...parsed,
            meta: {
              ...(parsed.meta || {}),
              version: 1,
              updatedAt: new Date().toISOString(),
            },
          })
        );
      } catch {
        alert("Import failed. Please upload a valid exported JSON file.");
      }
    };
    reader.readAsText(file);
  }

  function resetAll() {
    const ok = confirm("Reset everything to a fresh template (includes sample data)?");
    if (!ok) return;
    setStore(seed());
  }

  async function addProject() {
    const name = prompt("Enter project name (this will create a folder):");
    if (name === null) return;

    try {
      await fetch('http://localhost:3001/create-project-folder', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ projectName: name || "Untitled" })
      });
    } catch (e) {
      console.error("Failed to create folder", e);
      alert("Warning: Failed to create project folder on server.");
    }

    const p: Project = {
      id: uid("p"),
      projectId: `SR-${new Date().getFullYear() + 1}-${String(store.projects.length + 1).padStart(2, "0")}`,
      name: name || "",
      institution: "",
      region: "",
      type: "",
      officialLink: "",
      keywords: [],
      piLab: "",
      needsOutreach: "Optional",
      round: "",
      ddl: "",
      period: "",
      funding: [],
      eligibility: "",
      materials: [],
      portalStatus: "Not Open",
      status: "Prospecting",
      fit: 0,
      risk: 0,
      roi: 0,
      priority: "Medium",
      decision: "Maybe",
      nextAction: "",
      nextActionDate: "",
      outreachIds: [],
      materialTaskIds: [],
      notes: "",
    };
    setStore((s) => normalizeStore({ ...s, projects: [p, ...s.projects] }));
  }

  async function updateProject(id: ID, patch: Partial<Project>) {
    const oldProject = store.projects.find(p => p.id === id);
    
    // Handle Folder Rename
    if (oldProject && patch.name && patch.name !== oldProject.name) {
      try {
        await fetch('http://localhost:3001/rename-folder', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ oldName: oldProject.name, newName: patch.name })
        });
        
        // Update links for all materials in this project
        const materialsToUpdate = store.materials.filter(m => m.targetProject === id && m.link);
        materialsToUpdate.forEach(m => {
          const newLink = m.link.replace(
            `/files/${encodeURIComponent(oldProject.name)}/`, 
            `/files/${encodeURIComponent(patch.name!)}/`
          );
          updateMaterial(m.id, { link: newLink });
        });
      } catch (e) {
        console.error("Failed to rename folder", e);
      }
    }

    setStore((s) =>
      normalizeStore({
        ...s,
        projects: s.projects.map((p) => (p.id === id ? { ...p, ...patch } : p)),
      })
    );
  }

  async function deleteProject(id: ID) {
    const ok = confirm("Delete this project? (linked outreach/materials will remain)");
    if (!ok) return;

    const project = store.projects.find(p => p.id === id);
    if (project && project.name) {
      const deleteFiles = confirm(`Also delete the folder "${project.name}" and all its files?`);
      if (deleteFiles) {
        try {
          await fetch('http://localhost:3001/delete-folder', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ folderName: project.name })
          });
        } catch (e) {
          console.error("Failed to delete folder", e);
        }
      }
    }

    setStore((s) =>
      normalizeStore({
        ...s,
        projects: s.projects.filter((p) => p.id !== id),
        decisions: s.decisions.filter((d) => d.projectInternalId !== id),
        outreach: s.outreach.map((o) => ({
          ...o,
          projectIds: (o.projectIds || []).filter((pid) => pid !== id),
        })),
        materials: s.materials.map((m) =>
          m.targetProject === id ? { ...m, targetProject: "通用" } : m
        ),
      })
    );
  }

  function addOutreach(linkProjectId?: ID) {
    const o: Outreach = {
      id: uid("o"),
      outreachId: `PI-${new Date().getFullYear() + 1}-${String(store.outreach.length + 1).padStart(2, "0")}`,
      piName: "",
      institution: "",
      directions: [],
      contact: "",
      firstContact: "",
      emailVersion: "",
      replied: "No reply",
      replyDate: "",
      replySummary: "",
      stage: "Drafting",
      nextFollowUp: "",
      nextAction: "",
      projectIds: linkProjectId ? [linkProjectId] : [],
      notes: "",
    };

    setStore((s) =>
      normalizeStore({
        ...s,
        outreach: [o, ...s.outreach],
        projects: linkProjectId
          ? s.projects.map((p) =>
              p.id === linkProjectId
                ? { ...p, outreachIds: Array.from(new Set([...(p.outreachIds || []), o.id])) }
                : p
            )
          : s.projects,
      })
    );
  }

  function updateOutreach(id: ID, patch: Partial<Outreach>) {
    setStore((s) =>
      normalizeStore({
        ...s,
        outreach: s.outreach.map((o) => (o.id === id ? { ...o, ...patch } : o)),
      })
    );
  }

  function linkOutreachToProject(outreachId: ID, projectId: ID) {
    setStore((s) => {
      const o = s.outreach.find((x) => x.id === outreachId);
      const p = s.projects.find((x) => x.id === projectId);
      if (!o || !p) return s;

      const nextOutreach = s.outreach.map((x) =>
        x.id === outreachId
          ? { ...x, projectIds: Array.from(new Set([...(x.projectIds || []), projectId])) }
          : x
      );

      const nextProjects = s.projects.map((x) =>
        x.id === projectId
          ? { ...x, outreachIds: Array.from(new Set([...(x.outreachIds || []), outreachId])) }
          : x
      );

      return normalizeStore({ ...s, outreach: nextOutreach, projects: nextProjects });
    });
  }

  function deleteOutreach(id: ID) {
    const ok = confirm("Delete this outreach record?");
    if (!ok) return;
    setStore((s) =>
      normalizeStore({
        ...s,
        outreach: s.outreach.filter((o) => o.id !== id),
        projects: s.projects.map((p) => ({
          ...p,
          outreachIds: (p.outreachIds || []).filter((oid) => oid !== id),
        })),
      })
    );
  }

  function addMaterial(linkProjectId?: ID) {
    const m: MaterialTask = {
      id: uid("m"),
      taskId: `MAT-${String(store.materials.length + 1).padStart(2, "0")}`,
      type: "CV",
      targetProject: linkProjectId || "通用",
      status: "未开始",
      version: "v1",
      due: "",
      dependency: "",
      link: "",
      notes: "",
    };

    setStore((s) =>
      normalizeStore({
        ...s,
        materials: [m, ...s.materials],
        projects: linkProjectId
          ? s.projects.map((p) =>
              p.id === linkProjectId
                ? { ...p, materialTaskIds: Array.from(new Set([...(p.materialTaskIds || []), m.id])) }
                : p
            )
          : s.projects,
      })
    );
  }

  async function updateMaterial(id: ID, patch: Partial<MaterialTask>) {
    const current = store.materials.find((m) => m.id === id);
    if (!current) return;

    // Handle File Move/Rename
    if (current.link && (patch.targetProject || patch.type)) {
      const oldProjectName = current.targetProject === "通用" 
        ? "General" 
        : store.projects.find(p => p.id === current.targetProject)?.name || "General";
      
      const newTargetId = patch.targetProject !== undefined ? patch.targetProject : current.targetProject;
      const newProjectName = newTargetId === "通用"
        ? "General"
        : store.projects.find(p => p.id === newTargetId)?.name || "General";

      const oldType = current.type;
      const newType = patch.type !== undefined ? patch.type : oldType;

      // Extract filename from link (assuming format .../files/Project/Filename.ext)
      const urlParts = current.link.split('/');
      const oldFilename = decodeURIComponent(urlParts[urlParts.length - 1]);
      const ext = oldFilename.includes('.') ? '.' + oldFilename.split('.').pop() : '';
      
      // If type changed, new filename changes
      const newFilename = (patch.type && patch.type !== oldType) 
        ? `${newType}${ext}` 
        : oldFilename;

      if (oldProjectName !== newProjectName || oldFilename !== newFilename) {
        try {
          const res = await fetch('http://localhost:3001/move-file', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              oldPath: `${oldProjectName}/${oldFilename}`,
              newPath: `${newProjectName}/${newFilename}`
            })
          });
          
          if (res.ok) {
            // Update link in patch
            const newLink = `http://localhost:3001/files/${encodeURIComponent(newProjectName)}/${encodeURIComponent(newFilename)}`;
            patch.link = newLink;
          }
        } catch (e) {
          console.error("Failed to move file", e);
        }
      }
    }

    setStore((s) => {
      const current = s.materials.find((m) => m.id === id);
      if (!current) return s;

      const oldTarget = current.targetProject;
      const newTarget = patch.targetProject !== undefined ? patch.targetProject : oldTarget;

      const nextMaterials = s.materials.map((m) => (m.id === id ? { ...m, ...patch } : m));

      let nextProjects = s.projects;
      if (newTarget !== oldTarget) {
        nextProjects = s.projects.map((p) => {
          let ids = Array.isArray(p.materialTaskIds) ? p.materialTaskIds : [];
          if (oldTarget !== "通用" && p.id === oldTarget) ids = ids.filter((mid) => mid !== id);
          if (newTarget !== "通用" && p.id === newTarget) ids = Array.from(new Set([...ids, id]));
          return ids === p.materialTaskIds ? p : { ...p, materialTaskIds: ids };
        });
      }

      return normalizeStore({ ...s, materials: nextMaterials, projects: nextProjects });
    });
  }

  async function deleteMaterial(id: ID) {
    const ok = confirm("Delete this material task?");
    if (!ok) return;

    const task = store.materials.find(m => m.id === id);
    if (task && task.link) {
      const deleteFile = confirm("Also delete the associated file?");
      if (deleteFile) {
        try {
          const urlParts = task.link.split('/');
          const filename = decodeURIComponent(urlParts[urlParts.length - 1]);
          const projectName = task.targetProject === "通用" 
            ? "General" 
            : store.projects.find(p => p.id === task.targetProject)?.name || "General";
            
          await fetch('http://localhost:3001/delete-file', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ filePath: `${projectName}/${filename}` })
          });
        } catch (e) {
          console.error("Failed to delete file", e);
        }
      }
    }

    setStore((s) =>
      normalizeStore({
        ...s,
        materials: s.materials.filter((m) => m.id !== id),
        projects: s.projects.map((p) => ({
          ...p,
          materialTaskIds: (p.materialTaskIds || []).filter((mid) => mid !== id),
        })),
      })
    );
  }

  function ensureDecisionForProject(pid: ID) {
    const existing = store.decisions.find((d) => d.projectInternalId === pid);
    if (existing) return existing.id;

    const p = projectsById.get(pid);
    const d: Decision = {
      id: uid("d"),
      projectInternalId: pid,
      conclusion: p?.decision || "Maybe",
      priority: p?.priority || "Medium",
      whyApply: "",
      risks: "",
      fitEvidence: "",
      strategy: "",
      postResult: "",
      timeline: "",
      worked: "",
      didnt: "",
      improvements: "",
      takeaways: "",
    };

    setStore((s) => normalizeStore({ ...s, decisions: [d, ...s.decisions] }));
    return d.id;
  }

  function updateDecision(id: ID, patch: Partial<Decision>) {
    setStore((s) =>
      normalizeStore({
        ...s,
        decisions: s.decisions.map((d) => (d.id === id ? { ...d, ...patch } : d)),
      })
    );
  }

  const filterStatusOptions: SelectOption[] = [
    { value: "ALL", label: "ALL" },
    ...STATUS_LIST.map((s) => ({ value: s, label: s })),
  ];

  const filterPriorityOptions: SelectOption[] = [
    { value: "ALL", label: "ALL" },
    ...PRIORITIES.map((p) => ({ value: p, label: p })),
  ];

  const filterDecisionOptions: SelectOption[] = [
    { value: "ALL", label: "ALL" },
    { value: "Apply", label: "Apply" },
    { value: "Maybe", label: "Maybe" },
    { value: "No", label: "No" },
  ];


  return (
    <div className="min-h-screen w-full bg-gradient-to-br from-background to-muted/20">
      <div className="mx-auto max-w-7xl px-4 py-6 md:px-6 lg:px-8 space-y-8">
        {/* Header */}
        <div className="flex flex-col gap-6 pb-6 border-b border-border/50 bg-card/50 backdrop-blur-sm rounded-lg p-6 shadow-sm">
          <div>
            <h1 className="text-4xl font-bold tracking-tight bg-gradient-to-r from-primary to-primary/70 bg-clip-text text-transparent">
              Summer Research Application Tracker
            </h1>
            <p className="text-muted-foreground mt-2 text-base">
              Notion-like databases + dashboard · Local-only (saved to browser) · Export/Import JSON
            </p>
          </div>

          <div className="flex items-center gap-3 flex-wrap">
            <div className="relative flex-1 min-w-[240px] max-w-[320px]">
              <Search className="h-4 w-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
              <Input
                value={q}
                onChange={(e) => setQ(e.target.value)}
                placeholder="Search projects / PIs / keywords..."
                className="pl-10 h-11 border-border/50 focus:border-primary/50 transition-colors"
              />
            </div>

            <div className="flex items-center gap-2 px-3 py-2 bg-muted/50 rounded-md">
              <Checkbox 
                id="upcoming-filter"
                checked={showOnlyUpcoming} 
                onCheckedChange={(v) => setShowOnlyUpcoming(Boolean(v))} 
                className="data-[state=checked]:bg-primary data-[state=checked]:border-primary"
              />
              <Label htmlFor="upcoming-filter" className="text-sm font-medium cursor-pointer select-none">
                Upcoming only
              </Label>
            </div>

            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" className="gap-2 h-10 px-4">
                  <Filter className="h-4 w-4" /> Filters
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-[260px]">
                <DropdownMenuLabel>Project Filters</DropdownMenuLabel>
                <DropdownMenuSeparator />

                <div className="px-2 py-2 space-y-2">
                  <Label className="text-xs" htmlFor="filter_status">
                    Status
                  </Label>
                  <SelectBox
                    id="filter_status"
                    value={statusFilter}
                    onValueChange={(v) => setStatusFilter(v as any)}
                    options={filterStatusOptions}
                    className="h-10"
                  />

                  <Label className="text-xs" htmlFor="filter_priority">
                    Priority
                  </Label>
                  <SelectBox
                    id="filter_priority"
                    value={priorityFilter}
                    onValueChange={(v) => setPriorityFilter(v as any)}
                    options={filterPriorityOptions}
                    className="h-10"
                  />

                  <Label className="text-xs" htmlFor="filter_decision">
                    Decision
                  </Label>
                  <SelectBox
                    id="filter_decision"
                    value={decisionFilter}
                    onValueChange={(v) => setDecisionFilter(v as any)}
                    options={filterDecisionOptions}
                    className="h-10"
                  />
                </div>
              </DropdownMenuContent>
            </DropdownMenu>

            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" className="gap-2 h-10 px-4">
                  <Settings className="h-4 w-4" /> Data
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-[260px]">
                <DropdownMenuLabel>Export / Import</DropdownMenuLabel>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={exportJSON} className="gap-2">
                  <Download className="h-4 w-4" /> Export JSON
                </DropdownMenuItem>
                <DropdownMenuItem onClick={exportProjectsCSV} className="gap-2">
                  <Download className="h-4 w-4" /> Export Projects CSV
                </DropdownMenuItem>
                <DropdownMenuItem onClick={triggerImport} className="gap-2">
                  <Upload className="h-4 w-4" /> Import JSON
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={resetAll} className="gap-2 text-destructive">
                  <Trash2 className="h-4 w-4" /> Reset
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>

            <SettingsDialog />

            <input
              ref={fileInputRef}
              type="file"
              accept="application/json"
              className="hidden"
              onChange={(e) => {
                const f = e.target.files?.[0];
                if (f) handleImportFile(f);
                e.currentTarget.value = "";
              }}
            />
          </div>
        </div>

        <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as any)} className="space-y-8">
          <TabsList className="grid grid-cols-2 md:grid-cols-5 w-full h-12 bg-muted/50 p-1 rounded-xl">
            <TabsTrigger value="dashboard" className="text-sm font-medium rounded-lg data-[state=active]:bg-background data-[state=active]:shadow-sm transition-all">
              Dashboard
            </TabsTrigger>
            <TabsTrigger value="projects" className="text-sm font-medium rounded-lg data-[state=active]:bg-background data-[state=active]:shadow-sm transition-all">
              Projects
            </TabsTrigger>
            <TabsTrigger value="outreach" className="text-sm font-medium rounded-lg data-[state=active]:bg-background data-[state=active]:shadow-sm transition-all">
              PI Outreach
            </TabsTrigger>
            <TabsTrigger value="materials" className="text-sm font-medium rounded-lg data-[state=active]:bg-background data-[state=active]:shadow-sm transition-all">
              Materials
            </TabsTrigger>
            <TabsTrigger value="decisions" className="text-sm font-medium rounded-lg data-[state=active]:bg-background data-[state=active]:shadow-sm transition-all">
              Decision & Review
            </TabsTrigger>
          </TabsList>

          <TabsContent value="dashboard" className="space-y-8 mt-8">
            <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
              <Card className="shadow-sm border-border/50 hover:shadow-md transition-shadow cursor-pointer" onClick={() => setActiveTab("projects")}>
                <CardHeader className="pb-3">
                  <CardTitle className="text-lg font-semibold flex items-center gap-2">
                    <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
                    Status Overview
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-2">
                  {STATUS_LIST.map((s) => (
                    <div key={s} className="flex items-center justify-between">
                      <div className="text-sm">{s}</div>
                      <Pill>{dashboard.counts.get(s) || 0}</Pill>
                    </div>
                  ))}
                </CardContent>
              </Card>

              <Card className="shadow-sm border-border/50 hover:shadow-md transition-shadow cursor-pointer" onClick={() => setActiveTab("projects")}>
                <CardHeader className="pb-3">
                  <CardTitle className="text-lg font-semibold flex items-center gap-2">
                    <div className="w-2 h-2 bg-red-500 rounded-full"></div>
                    Next Deadline
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  {dashboard.nextDDL ? (
                    <>
                      <div className="text-base font-medium text-foreground">
                        {dashboard.nextDDL.projectId} · {dashboard.nextDDL.name}
                      </div>
                      <div className="text-sm text-muted-foreground">
                        {dashboard.nextDDL.institution} · {dashboard.nextDDL.region}
                      </div>
                      <div className="flex items-center gap-2 text-sm">
                        <Calendar className="h-4 w-4 text-red-500" />
                        <span className="font-medium">DDL: {dashboard.nextDDL.ddl || "—"}</span>
                      </div>
                      <div className="flex gap-2 flex-wrap">
                        <Pill>{dashboard.nextDDL.status}</Pill>
                        <Pill>{dashboard.nextDDL.priority}</Pill>
                        <Pill>Fit {dashboard.nextDDL.fit}</Pill>
                      </div>
                    </>
                  ) : (
                    <div className="text-sm text-muted-foreground">No deadline yet.</div>
                  )}
                </CardContent>
              </Card>

              <Card className="shadow-sm border-border/50 hover:shadow-md transition-shadow cursor-pointer" onClick={() => setActiveTab("projects")}>
                <CardHeader className="pb-3">
                  <CardTitle className="text-lg font-semibold flex items-center gap-2">
                    <div className="w-2 h-2 bg-orange-500 rounded-full"></div>
                    Upcoming Actions
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  {dashboard.actions.length ? (
                    dashboard.actions.map((p) => (
                      <div key={p.id} className="rounded-lg border border-border/50 p-3 bg-muted/30 hover:bg-muted/50 transition-colors">
                        <div className="text-sm font-medium text-foreground">
                          {p.projectId} · {p.name}
                        </div>
                        <div className="text-xs text-muted-foreground mt-1">
                          {p.nextActionDate || "—"} · {p.nextAction || "—"}
                        </div>
                      </div>
                    ))
                  ) : (
                    <div className="text-sm text-muted-foreground">No upcoming actions.</div>
                  )}
                </CardContent>
              </Card>

              <Card className="shadow-sm border-border/50 hover:shadow-md transition-shadow cursor-pointer" onClick={() => setActiveTab("decisions")}>
                <CardHeader className="pb-3">
                  <CardTitle className="text-lg font-semibold flex items-center gap-2">
                    <div className="w-2 h-2 bg-indigo-500 rounded-full"></div>
                    Decision Stats
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-2">
                  <div className="flex items-center justify-between">
                    <div className="text-sm">Total Decisions</div>
                    <Pill>{dashboard.decisionStats.total}</Pill>
                  </div>
                  <div className="flex items-center justify-between">
                    <div className="text-sm text-green-600">Apply</div>
                    <Pill>{dashboard.decisionStats.apply}</Pill>
                  </div>
                  <div className="flex items-center justify-between">
                    <div className="text-sm text-yellow-600">Maybe</div>
                    <Pill>{dashboard.decisionStats.maybe}</Pill>
                  </div>
                  <div className="flex items-center justify-between">
                    <div className="text-sm text-red-600">No</div>
                    <Pill>{dashboard.decisionStats.no}</Pill>
                  </div>
                </CardContent>
              </Card>

              <Card className="shadow-sm border-border/50 hover:shadow-md transition-shadow cursor-pointer" onClick={() => setActiveTab("outreach")}>
                <CardHeader className="pb-3">
                  <CardTitle className="text-lg font-semibold flex items-center gap-2">
                    <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                    Upcoming Follow-ups (PI)
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  {dashboard.upcomingFollowUps.length ? (
                    dashboard.upcomingFollowUps.map((o) => (
                      <div key={o.id} className="rounded-lg border border-border/50 p-3 bg-muted/30 hover:bg-muted/50 transition-colors">
                        <div className="text-sm font-medium text-foreground">
                          {o.outreachId} · {o.piName}
                        </div>
                        <div className="text-xs text-muted-foreground mt-1">{o.institution}</div>
                        <div className="text-xs mt-1 text-muted-foreground">
                          Next: {o.nextFollowUp || "—"} · {o.nextAction || "—"}
                        </div>
                      </div>
                    ))
                  ) : (
                    <div className="text-sm text-muted-foreground">No follow-ups scheduled.</div>
                  )}
                </CardContent>
              </Card>

              <Card className="shadow-sm border-border/50 hover:shadow-md transition-shadow cursor-pointer" onClick={() => setActiveTab("materials")}>
                <CardHeader className="pb-3">
                  <CardTitle className="text-lg font-semibold flex items-center gap-2">
                    <div className="w-2 h-2 bg-purple-500 rounded-full"></div>
                    Tasks Due (Materials)
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  {dashboard.tasksDue.length ? (
                    dashboard.tasksDue.map((m) => (
                      <div key={m.id} className="rounded-lg border border-border/50 p-3 bg-muted/30 hover:bg-muted/50 transition-colors">
                        <div className="text-sm font-medium text-foreground">
                          {m.taskId} · {m.type}
                        </div>
                        <div className="text-xs text-muted-foreground mt-1">
                          Due: {m.due || "—"} · {m.status}
                        </div>
                      </div>
                    ))
                  ) : (
                    <div className="text-sm text-muted-foreground">No tasks due.</div>
                  )}
                </CardContent>
              </Card>
            </div>

            {/* Follow-up Reminders Alert */}
            {followupReminders.length > 0 && (
              <Card className="border-yellow-500 bg-yellow-50 dark:bg-yellow-950">
                <CardHeader className="pb-3">
                  <CardTitle className="text-lg font-semibold flex items-center gap-2 text-yellow-700 dark:text-yellow-400">
                    <div className="w-2 h-2 bg-yellow-500 rounded-full animate-pulse"></div>
                    Follow-up Reminders ({followupReminders.length})
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  {followupReminders.map((reminder, idx) => (
                    <div key={idx} className="rounded-lg border border-yellow-300 p-3 bg-white dark:bg-gray-900">
                      <div className="text-sm font-medium text-foreground">
                        {reminder.piName}
                      </div>
                      <div className="text-xs text-muted-foreground mt-1">
                        {reminder.message}
                      </div>
                      {reminder.needsFollowup && (
                        <Badge variant="destructive" className="mt-2 text-xs">
                          Action Required
                        </Badge>
                      )}
                    </div>
                  ))}
                  <Button 
                    variant="outline" 
                    className="w-full"
                    onClick={() => setFollowupReminders([])}
                  >
                    Dismiss All
                  </Button>
                </CardContent>
              </Card>
            )}
          </TabsContent>

          <TabsContent value="projects" className="space-y-8 mt-8">
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
              <SectionTitle
                title={`Projects (${filteredProjects.length})`}
                right={
                  <Button onClick={addProject} className="gap-2 w-full sm:w-auto shadow-sm hover:shadow-md transition-shadow">
                    <Plus className="h-4 w-4" /> Add Project
                  </Button>
                }
              />
            </div>

            {filteredProjects.length ? (
              <div className="border border-border/50 rounded-xl overflow-hidden bg-card shadow-sm">
                <div className="overflow-x-auto scrollbar-hide">
                  <Table>
                    <TableHeader className="bg-muted/50">
                      <TableRow className="hover:bg-muted/30">
                        <TableHead className="min-w-[130px] font-semibold text-foreground">ID</TableHead>
                        <TableHead className="min-w-[250px] font-semibold text-foreground">Name</TableHead>
                        <TableHead className="min-w-[200px] font-semibold text-foreground">Institution</TableHead>
                        <TableHead className="min-w-[110px] font-semibold text-foreground">DDL</TableHead>
                        <TableHead className="min-w-[140px] font-semibold text-foreground">Status</TableHead>
                        <TableHead className="min-w-[120px] font-semibold text-foreground">Priority</TableHead>
                        <TableHead className="min-w-[300px] font-semibold text-foreground">Next Action</TableHead>
                        <TableHead className="w-[100px] font-semibold text-foreground">Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {filteredProjects.map((p) => (
                        <TableRow key={p.id} className="hover:bg-muted/30 transition-colors">
                          <TableCell className="font-medium">
                            <Input
                              value={p.projectId}
                              onChange={(e) => updateProject(p.id, { projectId: e.target.value })}
                              className="h-8"
                            />
                          </TableCell>

                          <TableCell>
                            <div className="space-y-2">
                              <Input
                                value={p.name}
                                onChange={(e) => updateProject(p.id, { name: e.target.value })}
                                placeholder="Project name"
                                className="h-8"
                              />
                              <div className="flex gap-2 flex-wrap">
                                {(p.keywords || []).slice(0, 4).map((k, idx) => (
                                  <Pill key={idx}>{k}</Pill>
                                ))}
                                {(p.keywords || []).length > 4 ? (
                                  <Pill>+{(p.keywords || []).length - 4}</Pill>
                                ) : null}
                              </div>
                            </div>
                          </TableCell>

                          <TableCell>
                            <Input
                              value={p.institution}
                              onChange={(e) => updateProject(p.id, { institution: e.target.value })}
                              placeholder="Institution"
                              className="h-8"
                            />
                            <div className="mt-2">
                              <Input
                                value={p.region}
                                onChange={(e) => updateProject(p.id, { region: e.target.value })}
                                placeholder="Region"
                                className="h-8"
                              />
                            </div>
                          </TableCell>

                          <TableCell>
                            <Input
                              type="text"
                              value={formatDateForDisplay(p.ddl)}
                              onChange={(e) => {
                                const formatted = formatDateInput(e.target.value);
                                updateProject(p.id, { ddl: formatted });
                              }}
                              onBlur={(e) => updateProject(p.id, { ddl: parseDateInput(e.target.value) })}
                              placeholder="MM/DD"
                              className="h-8"
                              maxLength={10}
                            />
                          </TableCell>

                          <TableCell>
                            <SelectBox
                              value={p.status}
                              onValueChange={(v) => updateProject(p.id, { status: v as ProjectStatus })}
                              options={STATUS_LIST.map((s) => ({ value: s, label: s }))}
                            />
                            <div className="mt-2">
                              <SelectBox
                                value={p.decision}
                                onValueChange={(v) => updateProject(p.id, { decision: v as any })}
                                options={DECISION_OPTIONS}
                              />
                            </div>
                          </TableCell>

                          <TableCell>
                            <SelectBox
                              value={p.priority}
                              onValueChange={(v) => updateProject(p.id, { priority: v as Priority })}
                              options={PRIORITIES.map((pr) => ({ value: pr, label: pr }))}
                            />
                          </TableCell>

                          <TableCell>
                            <div className="space-y-2">
                              <Input
                                value={p.nextAction}
                                onChange={(e) => updateProject(p.id, { nextAction: e.target.value })}
                                placeholder="Next action"
                                className="h-8"
                              />
                              <Input
                                type="text"
                                value={formatDateForDisplay(p.nextActionDate)}
                                onChange={(e) => {
                                  const formatted = formatDateInput(e.target.value);
                                  updateProject(p.id, { nextActionDate: formatted });
                                }}
                                onBlur={(e) => updateProject(p.id, { nextActionDate: parseDateInput(e.target.value) })}
                                placeholder="MM/DD"
                                className="h-8"
                                maxLength={10}
                              />
                            </div>
                          </TableCell>

                          <TableCell>
                            <div className="flex items-center gap-1">
                              <ProjectDetailsDialog
                                project={p}
                                outreach={store.outreach.filter((o) => (p.outreachIds || []).includes(o.id))}
                                materials={store.materials.filter((m) => (p.materialTaskIds || []).includes(m.id))}
                                allOutreach={store.outreach}
                                allMaterials={store.materials}
                                onUpdate={(patch) => updateProject(p.id, patch)}
                                onAddOutreach={() => addOutreach(p.id)}
                                onAddMaterial={() => addMaterial(p.id)}
                                onLinkOutreach={(outreachId) => linkOutreachToProject(outreachId, p.id)}
                                onLinkMaterial={(materialId) => {
                                  updateMaterial(materialId, { targetProject: p.id });
                                }}
                                onUnlinkOutreach={(outreachId) => {
                                  setStore((s) =>
                                    normalizeStore({
                                      ...s,
                                      projects: s.projects.map((proj) =>
                                        proj.id === p.id
                                          ? { ...proj, outreachIds: (proj.outreachIds || []).filter((oid) => oid !== outreachId) }
                                          : proj
                                      ),
                                      outreach: s.outreach.map((o) =>
                                        o.id === outreachId
                                          ? { ...o, projectIds: (o.projectIds || []).filter((pid) => pid !== p.id) }
                                          : o
                                      ),
                                    })
                                  );
                                }}
                                onUnlinkMaterial={(materialId) => {
                                  updateMaterial(materialId, { targetProject: "通用" });
                                }}
                                onOpenDecision={() => {
                                  ensureDecisionForProject(p.id);
                                  setActiveTab("decisions");
                                }}
                                projectsById={projectsById}
                                updateOutreach={updateOutreach}
                                updateMaterial={updateMaterial}
                              />

                              <Button
                                variant="ghost"
                                size="icon"
                                className="text-destructive h-8 w-8"
                                onClick={() => deleteProject(p.id)}
                                title="Delete"
                              >
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            </div>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              </div>
            ) : (
              <EmptyState
                title="No projects yet"
                desc="Add your first program and start tracking deadlines, outreach, and materials."
                action={
                  <Button onClick={addProject} className="gap-2">
                    <Plus className="h-4 w-4" /> Add Project
                  </Button>
                }
              />
            )}
          </TabsContent>

          <TabsContent value="outreach" className="space-y-8 mt-8">
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
              <SectionTitle
                title={`PI Outreach (${store.outreach.length})`}
                right={
                  <Button onClick={() => addOutreach()} className="gap-2 w-full sm:w-auto shadow-sm hover:shadow-md transition-shadow">
                    <Plus className="h-4 w-4" /> Add Outreach
                  </Button>
                }
              />
            </div>

            {store.outreach.length ? (
              <div className="border rounded-lg overflow-hidden bg-card">
                <div className="overflow-x-auto scrollbar-hide">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead className="min-w-[130px]">Outreach ID</TableHead>
                        <TableHead className="min-w-[200px]">PI</TableHead>
                        <TableHead className="min-w-[220px]">Institution</TableHead>
                        <TableHead className="min-w-[120px]">First Contact</TableHead>
                        <TableHead className="min-w-[140px]">Reply</TableHead>
                        <TableHead className="min-w-[130px]">Stage</TableHead>
                        <TableHead className="min-w-[200px]">Next Follow-up</TableHead>
                        <TableHead className="w-[100px]">Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {store.outreach
                        .slice()
                        .sort((a, b) => parseDateOrInf(a.nextFollowUp) - parseDateOrInf(b.nextFollowUp))
                        .map((o) => (
                          <TableRow key={o.id}>
                            <TableCell className="font-medium">
                              <Input
                                value={o.outreachId}
                                onChange={(e) => updateOutreach(o.id, { outreachId: e.target.value })}
                                className="h-8"
                              />
                            </TableCell>
                            <TableCell>
                              <Input
                                value={o.piName}
                                onChange={(e) => updateOutreach(o.id, { piName: e.target.value })}
                                placeholder="PI name"
                                className="h-8"
                              />
                              <div className="mt-2">
                                <Input
                                  value={o.contact}
                                  onChange={(e) => updateOutreach(o.id, { contact: e.target.value })}
                                  placeholder="Email / form"
                                  className="h-8"
                                />
                              </div>
                            </TableCell>
                            <TableCell>
                              <Input
                                value={o.institution}
                                onChange={(e) => updateOutreach(o.id, { institution: e.target.value })}
                                placeholder="Institution"
                                className="h-8"
                              />
                            </TableCell>
                            <TableCell>
                              <Input
                                type="text"
                                value={formatDateForDisplay(o.firstContact)}
                                onChange={(e) => {
                                  const formatted = formatDateInput(e.target.value);
                                  updateOutreach(o.id, { firstContact: formatted });
                                }}
                                onBlur={(e) => updateOutreach(o.id, { firstContact: parseDateInput(e.target.value) })}
                                placeholder="MM/DD"
                                className="h-8"
                                maxLength={10}
                              />
                            </TableCell>
                            <TableCell>
                              <SelectBox
                                value={o.replied}
                                onValueChange={(v) => updateOutreach(o.id, { replied: v as any })}
                                options={[
                                  { value: "No reply", label: "No reply" },
                                  { value: "Replied", label: "Replied" },
                                  { value: "Auto-reply", label: "Auto-reply" },
                                ]}
                              />
                              <div className="mt-2">
                                <Input
                                  type="text"
                                  value={formatDateForDisplay(o.replyDate)}
                                  onChange={(e) => {
                                    const formatted = formatDateInput(e.target.value);
                                    updateOutreach(o.id, { replyDate: formatted });
                                  }}
                                  onBlur={(e) => updateOutreach(o.id, { replyDate: parseDateInput(e.target.value) })}
                                  placeholder="MM/DD"
                                  className="h-8"
                                  maxLength={10}
                                />
                              </div>
                            </TableCell>
                            <TableCell>
                              <SelectBox
                                value={o.stage}
                                onValueChange={(v) => updateOutreach(o.id, { stage: v as OutreachStage })}
                                options={(
                                  ["Drafting", "Sent", "Follow-up", "Meeting", "Closed"] as OutreachStage[]
                                ).map((s) => ({ value: s, label: s }))}
                                className="h-8 rounded-md border border-input bg-background px-2 text-sm"
                              />
                            </TableCell>
                            <TableCell>
                              <Input
                                type="text"
                                value={formatDateForDisplay(o.nextFollowUp)}
                                onChange={(e) => {
                                  const formatted = formatDateInput(e.target.value);
                                  updateOutreach(o.id, { nextFollowUp: formatted });
                                }}
                                onBlur={(e) => updateOutreach(o.id, { nextFollowUp: parseDateInput(e.target.value) })}
                                placeholder="MM/DD"
                                className="h-8"
                                maxLength={10}
                              />
                            </TableCell>
                            <TableCell>
                              <div className="flex items-center gap-1">
                                <OutreachDetailsDialog
                                  outreach={o}
                                  projects={o.projectIds.map((pid) => projectsById.get(pid)).filter(Boolean) as Project[]}
                                  allProjects={store.projects}
                                  onUpdate={(patch) => updateOutreach(o.id, patch)}
                                  onLinkProject={(pid) => linkOutreachToProject(o.id, pid)}
                                />

                                <Button
                                  variant="ghost"
                                  size="icon"
                                  className="text-destructive h-8 w-8"
                                  onClick={() => deleteOutreach(o.id)}
                                  title="Delete"
                                >
                                  <Trash2 className="h-4 w-4" />
                                </Button>
                              </div>
                            </TableCell>
                          </TableRow>
                        ))}
                    </TableBody>
                  </Table>
                </div>
              </div>
            ) : (
              <EmptyState
                title="No outreach records"
                desc="Track PI emails, replies, and follow-up dates."
                action={
                  <Button onClick={() => addOutreach()} className="gap-2">
                    <Plus className="h-4 w-4" /> Add Outreach
                  </Button>
                }
              />
            )}
          </TabsContent>

          <TabsContent value="materials" className="space-y-8 mt-8">
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
              <SectionTitle
                title={`Materials (${store.materials.length})`}
                right={
                  <Button onClick={() => addMaterial()} className="gap-2 w-full sm:w-auto shadow-sm hover:shadow-md transition-shadow">
                    <Plus className="h-4 w-4" /> Add Task
                  </Button>
                }
              />
            </div>

            {store.materials.length ? (
              <div className="border rounded-lg overflow-hidden bg-card">
                <div className="overflow-x-auto scrollbar-hide">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead className="min-w-[110px]">Task ID</TableHead>
                        <TableHead className="min-w-[220px]">Type</TableHead>
                        <TableHead className="min-w-[200px]">Target</TableHead>
                        <TableHead className="min-w-[140px]">Status</TableHead>
                        <TableHead className="min-w-[150px]">Due</TableHead>
                        <TableHead className="w-[100px]">Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {store.materials
                        .slice()
                        .sort((a, b) => parseDateOrInf(a.due) - parseDateOrInf(b.due))
                        .map((m) => (
                          <TableRow key={m.id}>
                            <TableCell className="font-medium">
                              <Input
                                value={m.taskId}
                                onChange={(e) => updateMaterial(m.id, { taskId: e.target.value })}
                                className="h-8"
                              />
                            </TableCell>
                            <TableCell>
                              <SelectBox
                                value={m.type}
                                onValueChange={(v) => updateMaterial(m.id, { type: v as any })}
                                options={(
                                  [
                                    "CV",
                                    "Research Statement",
                                    "SOP",
                                    "Recommendation Letter",
                                    "Transcript",
                                    "Writing Sample",
                                    "Language",
                                    "Portfolio",
                                    "Other",
                                  ] as MaterialTask["type"][]
                                ).map((t) => ({ value: t, label: t }))}
                                className="h-8 rounded-md border border-input bg-background px-2 text-sm"
                              />
                              <div className="mt-2">
                                <Input
                                  value={m.version}
                                  onChange={(e) => updateMaterial(m.id, { version: e.target.value })}
                                  placeholder="v1 / v2 / final"
                                  className="h-8"
                                />
                              </div>
                            </TableCell>
                            <TableCell>
                              <SelectBox
                                value={m.targetProject}
                                onValueChange={(v) => updateMaterial(m.id, { targetProject: v as any })}
                                options={[
                                  { value: "通用", label: "通用" },
                                  ...store.projects.map((p) => ({
                                    value: p.id,
                                    label: `${p.projectId} · ${p.name || "(untitled)"}`,
                                  })),
                                ]}
                                className="h-8 rounded-md border border-input bg-background px-2 text-sm"
                              />
                              <div className="mt-2 text-xs text-muted-foreground">
                                {m.targetProject === "通用"
                                  ? "Reusable"
                                  : `For: ${projectsById.get(m.targetProject as ID)?.projectId || "—"}`}
                              </div>
                            </TableCell>
                            <TableCell>
                              <SelectBox
                                value={m.status}
                                onValueChange={(v) => updateMaterial(m.id, { status: v as any })}
                                options={(
                                  ["未开始", "草稿", "已修改", "定稿", "已提交"] as MaterialStatus[]
                                ).map((s) => ({ value: s, label: s }))}
                                className="h-8 rounded-md border border-input bg-background px-2 text-sm"
                              />
                            </TableCell>
                            <TableCell>
                              <Input
                                type="text"
                                value={formatDateForDisplay(m.due)}
                                onChange={(e) => {
                                  const formatted = formatDateInput(e.target.value);
                                  updateMaterial(m.id, { due: formatted });
                                }}
                                onBlur={(e) => updateMaterial(m.id, { due: parseDateInput(e.target.value) })}
                                placeholder="MM/DD"
                                className="h-8"
                                maxLength={10}
                              />
                            </TableCell>
                            <TableCell>
                              <div className="flex items-center gap-1">
                                <MaterialDetailsDialog
                                  task={m}
                                  project={
                                    m.targetProject !== "通用"
                                      ? (projectsById.get(m.targetProject as ID) as Project)
                                      : undefined
                                  }
                                  onUpdate={(patch) => updateMaterial(m.id, patch)}
                                />
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  className="text-destructive h-8 w-8"
                                  onClick={() => deleteMaterial(m.id)}
                                  title="Delete"
                                >
                                  <Trash2 className="h-4 w-4" />
                                </Button>
                              </div>
                            </TableCell>
                          </TableRow>
                        ))}
                    </TableBody>
                  </Table>
                </div>
              </div>
            ) : (
              <EmptyState
                title="No material tasks"
                desc="Track CV/RS/SOP, letters, transcript, and other deliverables."
                action={
                  <Button onClick={() => addMaterial()} className="gap-2">
                    <Plus className="h-4 w-4" /> Add Task
                  </Button>
                }
              />
            )}
          </TabsContent>

          <TabsContent value="decisions" className="space-y-8 mt-8">
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
              <SectionTitle
                title={`Decision & Review (${store.decisions.length})`}
                right={
                  <DecisionCreateDialog
                    projects={store.projects}
                    onCreate={(pid) => {
                      ensureDecisionForProject(pid);
                      setActiveTab("decisions");
                    }}
                  />
                }
              />
            </div>

            {store.decisions.length ? (
              <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                {store.decisions
                  .slice()
                  .sort((a, b) => {
                    const pa = projectsById.get(a.projectInternalId);
                    const pb = projectsById.get(b.projectInternalId);
                    return parseDateOrInf(pa?.ddl || "") - parseDateOrInf(pb?.ddl || "");
                  })
                  .map((d) => {
                    const p = projectsById.get(d.projectInternalId);
                    if (!p) return null;
                    return (
                      <Card key={d.id} className="overflow-hidden cursor-pointer hover:shadow-md transition-shadow" onClick={() => setViewingDecision(d)}>
                        <CardHeader className="pb-4">
                          <div className="flex items-start justify-between gap-3">
                            <div className="flex-1 min-w-0">
                              <CardTitle className="text-base truncate">
                                {p.projectId} · {p.name || "(untitled)"}
                              </CardTitle>
                              <div className="text-xs text-muted-foreground truncate">
                                {p.institution} · {p.region}
                              </div>
                            </div>
                            <div className="flex flex-col gap-1 items-end">
                              <Pill>{d.conclusion}</Pill>
                              <Pill>{d.priority}</Pill>
                            </div>
                          </div>
                        </CardHeader>
                        <CardContent className="pt-0">
                          <div className="text-xs text-muted-foreground">
                            Click to view details and edit
                          </div>
                        </CardContent>
                      </Card>
                    );
                  })}
              </div>
            ) : (
              <EmptyState
                title="No decision cards"
                desc="Create a decision card per project to record rationale and post-mortem notes."
              />
            )}
          </TabsContent>
        </Tabs>

        {viewingDecision && (
          <DecisionDetailsDialog
            decision={viewingDecision}
            project={projectsById.get(viewingDecision.projectInternalId)!}
            onUpdate={(patch) => updateDecision(viewingDecision.id, patch)}
            onClose={() => setViewingDecision(null)}
          />
        )}

        <footer className="pt-6 mt-6 border-t">
          <p className="text-xs text-muted-foreground text-center">
            Data is stored locally in your browser (localStorage). Use Data → Export JSON for backups.
          </p>
        </footer>
      </div>
    </div>
  );
}

function DecisionCreateDialog({
  projects,
  onCreate,
}: {
  projects: Project[];
  onCreate: (pid: ID) => void;
}) {
  const [open, setOpen] = useState(false);
  const [pid, setPid] = useState<ID | "">("");
  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" className="gap-2">
          <Plus className="h-4 w-4" /> New Decision Card
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Create a decision card</DialogTitle>
          <DialogDescription>Pick a project and we will create a linked decision template.</DialogDescription>
        </DialogHeader>
        <div className="space-y-2">
          <Label>Project</Label>
          <SelectBox
            value={pid}
            onValueChange={(v) => setPid(v as any)}
            options={projects.map((p) => ({
              value: p.id,
              label: `${p.projectId} · ${p.name || "(untitled)"}`,
            }))}
          />
        </div>
        <DialogFooter>
          <Button
            onClick={() => {
              if (!pid) return;
              onCreate(pid);
              setOpen(false);
              setPid("");
            }}
            disabled={!pid}
          >
            Create
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// -----------------------------
// Dialogs & Editors
// -----------------------------

function ProjectDetailsDialog({
  project,
  outreach,
  materials,
  allOutreach,
  allMaterials,
  onUpdate,
  onAddOutreach,
  onAddMaterial,
  onLinkOutreach,
  onLinkMaterial,
  onUnlinkOutreach,
  onUnlinkMaterial,
  onOpenDecision,
  projectsById,
  updateOutreach,
  updateMaterial,
}: {
  project: Project;
  outreach: Outreach[];
  materials: MaterialTask[];
  allOutreach: Outreach[];
  allMaterials: MaterialTask[];
  onUpdate: (patch: Partial<Project>) => void;
  onAddOutreach: () => void;
  onAddMaterial: () => void;
  onLinkOutreach: (outreachId: ID) => void;
  onLinkMaterial: (materialId: ID) => void;
  onUnlinkOutreach: (outreachId: ID) => void;
  onUnlinkMaterial: (materialId: ID) => void;
  onOpenDecision: () => void;
  projectsById: Map<ID, Project>;
  updateOutreach: (id: ID, patch: Partial<Outreach>) => void;
  updateMaterial: (id: ID, patch: Partial<MaterialTask>) => void;
}) {
  const [open, setOpen] = useState(false);
  const [kwInput, setKwInput] = useState("");
  const [fundInput, setFundInput] = useState("");
  const [matInput, setMatInput] = useState("");
  const [outreachSearch, setOutreachSearch] = useState("");
  const [materialSearch, setMaterialSearch] = useState("");
  const [viewingOutreach, setViewingOutreach] = useState<Outreach | null>(null);
  const [viewingMaterial, setViewingMaterial] = useState<MaterialTask | null>(null);

  const addToList = (field: "keywords" | "funding" | "materials", value: string) => {
    const v = value.trim();
    if (!v) return;
    const list = new Set((project as any)[field] as string[]);
    list.add(v);
    onUpdate({ [field]: Array.from(list) } as any);
  };

  const removeFromList = (field: "keywords" | "funding" | "materials", value: string) => {
    const list = new Set((project as any)[field] as string[]);
    list.delete(value);
    onUpdate({ [field]: Array.from(list) } as any);
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="icon" title="Details" className="h-8 w-8">
          <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 5v.01M12 12v.01M12 19v.01M12 6a1 1 0 110-2 1 1 0 010 2zm0 7a1 1 0 110-2 1 1 0 010 2zm0 7a1 1 0 110-2 1 1 0 010 2z" />
          </svg>
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Project Details · {project.projectId}</DialogTitle>
          <DialogDescription>Edit everything in one place; link outreach and materials.</DialogDescription>
        </DialogHeader>

        <div className="grid gap-6 md:grid-cols-2">
          <div className="space-y-4">
            <div className="space-y-2">
              <Label className="text-sm font-medium">Name</Label>
              <Input value={project.name} onChange={(e) => onUpdate({ name: e.target.value })} placeholder="Project name" className="h-11" />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label className="text-sm font-medium">Institution</Label>
                <Input value={project.institution} onChange={(e) => onUpdate({ institution: e.target.value })} className="h-11" />
              </div>
              <div className="space-y-2">
                <Label className="text-sm font-medium">Region</Label>
                <Input value={project.region} onChange={(e) => onUpdate({ region: e.target.value })} className="h-11" />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label className="text-sm font-medium">Type</Label>
                <Input value={project.type} onChange={(e) => onUpdate({ type: e.target.value })} placeholder="Summer Program / Visiting" className="h-11" />
              </div>
              <div className="space-y-2">
                <Label className="text-sm font-medium">Round</Label>
                <Input value={project.round} onChange={(e) => onUpdate({ round: e.target.value })} placeholder="Round 1 / Rolling" className="h-11" />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label className="text-sm font-medium">DDL</Label>
                <Input
                  type="text"
                  value={project.ddl}
                  onChange={(e) => {
                    const formatted = formatDateInput(e.target.value);
                    onUpdate({ ddl: formatted });
                  }}
                  onBlur={(e) => onUpdate({ ddl: parseDateInput(e.target.value) })}
                  placeholder="MM/DD/YYYY"
                  className="h-11"
                  maxLength={10}
                />
              </div>
              <div className="space-y-2">
                <Label className="text-sm font-medium">Next Action Date</Label>
                <Input
                  type="text"
                  value={project.nextActionDate}
                  onChange={(e) => {
                    const formatted = formatDateInput(e.target.value);
                    onUpdate({ nextActionDate: formatted });
                  }}
                  onBlur={(e) => onUpdate({ nextActionDate: parseDateInput(e.target.value) })}
                  placeholder="MM/DD/YYYY"
                  className="h-11"
                  maxLength={10}
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label>Official Link</Label>
              <Input value={project.officialLink} onChange={(e) => onUpdate({ officialLink: e.target.value })} placeholder="https://..." />
            </div>

            <div className="space-y-2">
              <Label>PI / Lab</Label>
              <Input value={project.piLab} onChange={(e) => onUpdate({ piLab: e.target.value })} placeholder="PI name — Lab" />
            </div>

            <div className="grid grid-cols-3 gap-2">
              <ScoreInput label="Fit (0–10)" value={project.fit} onChange={(v) => onUpdate({ fit: clamp01_10(v) })} />
              <ScoreInput label="Risk (0–10)" value={project.risk} onChange={(v) => onUpdate({ risk: clamp01_10(v) })} />
              <ScoreInput label="ROI (0–10)" value={project.roi} onChange={(v) => onUpdate({ roi: clamp01_10(v) })} />
            </div>

            <div className="space-y-2">
              <Label>Eligibility</Label>
              <Textarea value={project.eligibility} onChange={(e) => onUpdate({ eligibility: e.target.value })} rows={3} />
            </div>
          </div>

          <div className="space-y-3">
            <div className="grid grid-cols-2 gap-2">
              <div className="space-y-2">
                <Label>Needs Outreach</Label>
                <SelectBox
                  value={project.needsOutreach}
                  onValueChange={(v) => onUpdate({ needsOutreach: v as any })}
                  options={[
                    { value: "Yes", label: "Yes" },
                    { value: "No", label: "No" },
                    { value: "Optional", label: "Optional" },
                  ]}
                />
              </div>

              <div className="space-y-2">
                <Label>Portal Status</Label>
                <SelectBox
                  value={project.portalStatus}
                  onValueChange={(v) => onUpdate({ portalStatus: v as any })}
                  options={[
                    { value: "Not Open", label: "Not Open" },
                    { value: "Open", label: "Open" },
                    { value: "Closed", label: "Closed" },
                  ]}
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-2">
              <div className="space-y-2">
                <Label>Status</Label>
                <SelectBox
                  value={project.status}
                  onValueChange={(v) => onUpdate({ status: v as any })}
                  options={STATUS_LIST.map((s) => ({ value: s, label: s }))}
                />
              </div>

              <div className="space-y-2">
                <Label>Priority</Label>
                <SelectBox
                  value={project.priority}
                  onValueChange={(v) => onUpdate({ priority: v as any })}
                  options={PRIORITIES.map((p) => ({ value: p, label: p }))}
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label>Decision</Label>
              <SelectBox value={project.decision} onValueChange={(v) => onUpdate({ decision: v as any })} options={DECISION_OPTIONS} />
            </div>

            <div className="space-y-2">
              <Label>Project Period</Label>
              <Input value={project.period} onChange={(e) => onUpdate({ period: e.target.value })} placeholder="YYYY-MM-DD ~ YYYY-MM-DD" />
            </div>

            <div className="space-y-2">
              <Label>Next Action</Label>
              <Textarea value={project.nextAction} onChange={(e) => onUpdate({ nextAction: e.target.value })} rows={3} />
            </div>

            <Separator />

            <div className="space-y-2">
              <Label>Keywords</Label>
              <div className="flex gap-2">
                <Input value={kwInput} onChange={(e) => setKwInput(e.target.value)} placeholder="Add keyword" />
                <Button
                  variant="outline"
                  onClick={() => {
                    addToList("keywords", kwInput);
                    setKwInput("");
                  }}
                >
                  Add
                </Button>
              </div>
              <div className="flex gap-2 flex-wrap">
                {(project.keywords || []).map((k, idx) => (
                  <Badge key={idx} className="rounded-full" variant="secondary">
                    {k}
                    <button
                      className="ml-2 text-xs opacity-70 hover:opacity-100"
                      onClick={() => removeFromList("keywords", k)}
                      title="Remove"
                    >
                      ×
                    </button>
                  </Badge>
                ))}
              </div>
            </div>

            <div className="space-y-2">
              <Label>Funding</Label>
              <div className="flex gap-2">
                <Input value={fundInput} onChange={(e) => setFundInput(e.target.value)} placeholder="stipend / travel / housing" />
                <Button
                  variant="outline"
                  onClick={() => {
                    addToList("funding", fundInput);
                    setFundInput("");
                  }}
                >
                  Add
                </Button>
              </div>
              <div className="flex gap-2 flex-wrap">
                {(project.funding || []).map((k, idx) => (
                  <Badge key={idx} className="rounded-full" variant="secondary">
                    {k}
                    <button
                      className="ml-2 text-xs opacity-70 hover:opacity-100"
                      onClick={() => removeFromList("funding", k)}
                      title="Remove"
                    >
                      ×
                    </button>
                  </Badge>
                ))}
              </div>
            </div>

            <div className="space-y-2">
              <Label>Materials Needed</Label>
              <div className="flex gap-2">
                <Input value={matInput} onChange={(e) => setMatInput(e.target.value)} placeholder="CV / RS / Transcript / Letters" />
                <Button
                  variant="outline"
                  onClick={() => {
                    addToList("materials", matInput);
                    setMatInput("");
                  }}
                >
                  Add
                </Button>
              </div>
              <div className="flex gap-2 flex-wrap">
                {(project.materials || []).map((k, idx) => (
                  <Badge key={idx} className="rounded-full" variant="secondary">
                    {k}
                    <button
                      className="ml-2 text-xs opacity-70 hover:opacity-100"
                      onClick={() => removeFromList("materials", k)}
                      title="Remove"
                    >
                      ×
                    </button>
                  </Badge>
                ))}
              </div>
            </div>
          </div>
        </div>

        <Separator className="my-2" />

        <div className="grid gap-4 md:grid-cols-2">
          {/* Linked Outreach Card */}
          <Card>
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <CardTitle className="text-sm">Linked Outreach ({outreach.length})</CardTitle>
              </div>
            </CardHeader>
            <CardContent className="space-y-3">
              {outreach.length > 0 ? (
                <div className="space-y-2 max-h-[300px] overflow-y-auto">
                  {outreach.map((o) => (
                    <div
                      key={o.id}
                      className="group relative rounded-lg border p-3 hover:bg-accent/50 transition-colors cursor-pointer"
                      onClick={() => setViewingOutreach(o)}
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex-1 min-w-0">
                          <div className="text-sm font-medium truncate flex items-center gap-1">
                            {o.outreachId} · {o.piName}
                            <Search className="h-3 w-3 opacity-0 group-hover:opacity-50 transition-opacity" />
                          </div>
                          <div className="text-xs text-muted-foreground mt-1 space-y-0.5">
                            <div>{o.institution || "—"}</div>
                            {o.nextFollowUp && (
                              <div className="flex items-center gap-1">
                                <Calendar className="h-3 w-3" />
                                Next: {o.nextFollowUp}
                              </div>
                            )}
                            <div className="flex items-center gap-2 mt-1">
                              <Badge variant="outline" className="text-xs">
                                {o.stage}
                              </Badge>
                              <Badge variant={o.replied === "Replied" ? "default" : "secondary"} className="text-xs">
                                {o.replied}
                              </Badge>
                            </div>
                          </div>
                        </div>
                        <div className="flex items-center gap-1">
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-6 w-6 opacity-0 group-hover:opacity-100 transition-opacity text-muted-foreground hover:text-primary"
                            onClick={(e) => {
                              e.stopPropagation();
                              setViewingOutreach(o);
                            }}
                            title="View Details"
                          >
                            <Search className="h-3.5 w-3.5" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-6 w-6 opacity-0 group-hover:opacity-100 transition-opacity text-muted-foreground hover:text-destructive"
                            onClick={(e) => {
                              e.stopPropagation();
                              if (confirm(`Unlink ${o.outreachId} from this project?`)) {
                                onUnlinkOutreach(o.id);
                              }
                            }}
                            title="Unlink"
                          >
                            <Unlink className="h-3.5 w-3.5" />
                          </Button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-sm text-muted-foreground py-4 text-center">No linked outreach.</div>
              )}

              <Separator />

              <div className="space-y-2">
                <div className="text-xs font-medium text-muted-foreground">Link Existing Outreach</div>
                <div className="relative">
                  <Search className="h-3.5 w-3.5 absolute left-2 top-1/2 -translate-y-1/2 text-muted-foreground" />
                  <Input
                    value={outreachSearch}
                    onChange={(e) => setOutreachSearch(e.target.value)}
                    placeholder="Search outreach..."
                    className="pl-8 h-8 text-xs"
                  />
                </div>
                <SelectBox
                  value=""
                  onValueChange={(id) => {
                    if (id && !outreach.some((o) => o.id === id)) {
                      onLinkOutreach(id);
                      setOutreachSearch("");
                    }
                  }}
                  options={allOutreach
                    .filter((o) => {
                      if (outreach.some((linked) => linked.id === o.id)) return false;
                      const search = outreachSearch.toLowerCase();
                      return (
                        !search ||
                        o.outreachId.toLowerCase().includes(search) ||
                        o.piName.toLowerCase().includes(search) ||
                        o.institution.toLowerCase().includes(search)
                      );
                    })
                    .map((o) => ({
                      value: o.id,
                      label: `${o.outreachId} · ${o.piName}${o.institution ? ` (${o.institution})` : ""}`,
                    }))}
                  className="h-8 text-xs"
                />
              </div>

              <Button variant="outline" className="gap-2 w-full" onClick={onAddOutreach}>
                <Plus className="h-4 w-4" /> Create New Outreach
              </Button>
            </CardContent>
          </Card>

          {/* Linked Materials Card */}
          <Card>
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <CardTitle className="text-sm">Linked Materials ({materials.length})</CardTitle>
              </div>
            </CardHeader>
            <CardContent className="space-y-3">
              {materials.length > 0 ? (
                <div className="space-y-2 max-h-[300px] overflow-y-auto">
                  {materials.map((m) => (
                    <div
                      key={m.id}
                      className="group relative rounded-lg border p-3 hover:bg-accent/50 transition-colors cursor-pointer"
                      onClick={() => setViewingMaterial(m)}
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex-1 min-w-0">
                          <div className="text-sm font-medium truncate flex items-center gap-1">
                            {m.taskId} · {m.type}
                            <Search className="h-3 w-3 opacity-0 group-hover:opacity-50 transition-opacity" />
                          </div>
                          <div className="text-xs text-muted-foreground mt-1 space-y-0.5">
                            <div className="flex items-center gap-2">
                              {m.due && (
                                <div className="flex items-center gap-1">
                                  <Calendar className="h-3 w-3" />
                                  Due: {m.due}
                                </div>
                              )}
                            </div>
                            <div className="flex items-center gap-2 mt-1">
                              <Badge variant="outline" className="text-xs">
                                {m.status}
                              </Badge>
                              {m.version && (
                                <Badge variant="secondary" className="text-xs">
                                  {m.version}
                                </Badge>
                              )}
                            </div>
                          </div>
                        </div>
                        <div className="flex items-center gap-1">
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-6 w-6 opacity-0 group-hover:opacity-100 transition-opacity text-muted-foreground hover:text-primary"
                            onClick={(e) => {
                              e.stopPropagation();
                              setViewingMaterial(m);
                            }}
                            title="View Details"
                          >
                            <Search className="h-3.5 w-3.5" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-6 w-6 opacity-0 group-hover:opacity-100 transition-opacity text-muted-foreground hover:text-destructive"
                            onClick={(e) => {
                              e.stopPropagation();
                              if (confirm(`Unlink ${m.taskId} from this project?`)) {
                                onUnlinkMaterial(m.id);
                              }
                            }}
                            title="Unlink"
                          >
                            <Unlink className="h-3.5 w-3.5" />
                          </Button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-sm text-muted-foreground py-4 text-center">No linked material tasks.</div>
              )}

              <Separator />

              <div className="space-y-2">
                <div className="text-xs font-medium text-muted-foreground">Link Existing Material</div>
                <div className="relative">
                  <Search className="h-3.5 w-3.5 absolute left-2 top-1/2 -translate-y-1/2 text-muted-foreground" />
                  <Input
                    value={materialSearch}
                    onChange={(e) => setMaterialSearch(e.target.value)}
                    placeholder="Search materials..."
                    className="pl-8 h-8 text-xs"
                  />
                </div>
                <SelectBox
                  value=""
                  onValueChange={(id) => {
                    if (id && !materials.some((m) => m.id === id)) {
                      onLinkMaterial(id);
                      setMaterialSearch("");
                    }
                  }}
                  options={allMaterials
                    .filter((m) => {
                      if (materials.some((linked) => linked.id === m.id)) return false;
                      const search = materialSearch.toLowerCase();
                      return (
                        !search ||
                        m.taskId.toLowerCase().includes(search) ||
                        m.type.toLowerCase().includes(search)
                      );
                    })
                    .map((m) => ({
                      value: m.id,
                      label: `${m.taskId} · ${m.type}`,
                    }))}
                  className="h-8 text-xs"
                />
              </div>

              <Button variant="outline" className="gap-2 w-full" onClick={onAddMaterial}>
                <Plus className="h-4 w-4" /> Create New Material Task
              </Button>
            </CardContent>
          </Card>
        </div>

        <Separator className="my-2" />

        <div className="space-y-2">
          <Label>Notes</Label>
          <Textarea value={project.notes} onChange={(e) => onUpdate({ notes: e.target.value })} rows={4} />
        </div>

        <DialogFooter className="gap-2">
          <Button variant="outline" onClick={onOpenDecision}>
            Open Decision Card
          </Button>
          <Button onClick={() => setOpen(false)}>Done</Button>
        </DialogFooter>
      </DialogContent>

      {/* Embedded Outreach Details Dialog */}
      {viewingOutreach && (
        <OutreachDetailsDialog
          outreach={viewingOutreach}
          projects={viewingOutreach.projectIds.map((pid) => projectsById.get(pid)).filter(Boolean) as Project[]}
          allProjects={Array.from(projectsById.values())}
          onUpdate={(patch) => updateOutreach(viewingOutreach.id, patch)}
          onLinkProject={(pid) => {
            // Link the project to the outreach (this is handled by the parent)
            // The outreach is already linked to the current project
            void pid; // Suppress unused variable warning
          }}
          controlledOpen={true}
          onOpenChange={(isOpen) => {
            if (!isOpen) setViewingOutreach(null);
          }}
        />
      )}

      {/* Embedded Material Details Dialog */}
      {viewingMaterial && (
        <MaterialDetailsDialog
          task={viewingMaterial}
          project={project}
          onUpdate={(patch) => updateMaterial(viewingMaterial.id, patch)}
          controlledOpen={true}
          onOpenChange={(isOpen) => {
            if (!isOpen) setViewingMaterial(null);
          }}
        />
      )}
    </Dialog>
  );
}

function ScoreInput({ label, value, onChange }: { label: string; value: number; onChange: (v: number) => void }) {
  return (
    <div className="space-y-2">
      <Label className="text-xs">{label}</Label>
      <Input
        type="number"
        min={0}
        max={10}
        step={0.1}
        value={String(value ?? 0)}
        onChange={(e) => onChange(Number(e.target.value))}
        className="h-8"
      />
    </div>
  );
}

function OutreachDetailsDialog({
  outreach,
  projects,
  allProjects,
  onUpdate,
  onLinkProject,
  controlledOpen,
  onOpenChange,
}: {
  outreach: Outreach;
  projects: Project[];
  allProjects: Project[];
  onUpdate: (patch: Partial<Outreach>) => void;
  onLinkProject: (pid: ID) => void;
  controlledOpen?: boolean;
  onOpenChange?: (open: boolean) => void;
}) {
  const [internalOpen, setInternalOpen] = useState(false);
  const [dirInput, setDirInput] = useState("");
  
  const open = controlledOpen !== undefined ? controlledOpen : internalOpen;
  const setOpen = controlledOpen !== undefined 
    ? (onOpenChange || (() => {}))
    : setInternalOpen;

  const addDirection = () => {
    const v = dirInput.trim();
    if (!v) return;
    onUpdate({ directions: Array.from(new Set([...(outreach.directions || []), v])) });
    setDirInput("");
  };

  const removeDirection = (v: string) => {
    onUpdate({ directions: (outreach.directions || []).filter((x) => x !== v) });
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="icon" title="Details" className="h-8 w-8">
          <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 5v.01M12 12v.01M12 19v.01M12 6a1 1 0 110-2 1 1 0 010 2zm0 7a1 1 0 110-2 1 1 0 010 2zm0 7a1 1 0 110-2 1 1 0 010 2z" />
          </svg>
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Outreach Details · {outreach.outreachId}</DialogTitle>
          <DialogDescription>Track emails, replies, and follow-ups.</DialogDescription>
        </DialogHeader>

        <div className="grid gap-4 md:grid-cols-2">
          <div className="space-y-3">
            <div className="space-y-2">
              <Label>PI Name</Label>
              <Input value={outreach.piName} onChange={(e) => onUpdate({ piName: e.target.value })} />
            </div>
            <div className="space-y-2">
              <Label>Institution</Label>
              <Input value={outreach.institution} onChange={(e) => onUpdate({ institution: e.target.value })} />
            </div>
            <div className="space-y-2">
              <Label>Contact</Label>
              <Input value={outreach.contact} onChange={(e) => onUpdate({ contact: e.target.value })} placeholder="Email / form link" />
            </div>

            <div className="grid grid-cols-2 gap-2">
              <div className="space-y-2">
                <Label>First Contact</Label>
                <Input
                  type="text"
                  value={outreach.firstContact}
                  onChange={(e) => {
                    const formatted = formatDateInput(e.target.value);
                    onUpdate({ firstContact: formatted });
                  }}
                  onBlur={(e) => onUpdate({ firstContact: parseDateInput(e.target.value) })}
                  placeholder="MM/DD/YYYY"
                  maxLength={10}
                />
              </div>
              <div className="space-y-2">
                <Label>Email Version</Label>
                <Input value={outreach.emailVersion} onChange={(e) => onUpdate({ emailVersion: e.target.value })} placeholder="v1-short / v2-tailored" />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-2">
              <div className="space-y-2">
                <Label>Reply Status</Label>
                <div className="flex gap-2">
                  <SelectBox
                    value={outreach.replied}
                    onValueChange={(v) => onUpdate({ replied: v as any })}
                    options={[
                      { value: "No reply", label: "No reply" },
                      { value: "Replied", label: "Replied" },
                      { value: "Auto-reply", label: "Auto-reply" },
                    ]}
                  />
                  <Button
                    variant="outline"
                    onClick={async () => {
                      if (outreach.threadId) {
                        try {
                          const response = await fetch(`http://localhost:3001/check-replies/${outreach.threadId}`);
                          const data = await response.json();
                          if (data.replies.length > 0) {
                            alert(`Found ${data.replies.length} reply(s)`);
                            onUpdate({ replied: 'Replied', replyDate: new Date().toISOString().split('T')[0] });
                          } else {
                            alert('No new replies');
                          }
                        } catch (error) {
                          alert('Failed to check replies');
                        }
                      } else {
                        alert('No thread ID available');
                      }
                    }}
                  >
                    Check Replies
                  </Button>
                </div>
              </div>
              <div className="space-y-2">
                <Label>Reply Date</Label>
                <Input
                  type="text"
                  value={outreach.replyDate}
                  onChange={(e) => {
                    const formatted = formatDateInput(e.target.value);
                    onUpdate({ replyDate: formatted });
                  }}
                  onBlur={(e) => onUpdate({ replyDate: parseDateInput(e.target.value) })}
                  placeholder="MM/DD/YYYY"
                  maxLength={10}
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label>Reply Summary</Label>
              <Textarea value={outreach.replySummary} onChange={(e) => onUpdate({ replySummary: e.target.value })} rows={4} />
            </div>
          </div>

          <div className="space-y-3">
            <div className="grid grid-cols-2 gap-2">
              <div className="space-y-2">
                <Label>Stage</Label>
                <SelectBox
                  value={outreach.stage}
                  onValueChange={(v) => onUpdate({ stage: v as any })}
                  options={(
                    ["Drafting", "Sent", "Follow-up", "Meeting", "Closed"] as OutreachStage[]
                  ).map((s) => ({ value: s, label: s }))}
                />
              </div>
              <div className="space-y-2">
                <Label>Next Follow-up</Label>
                <Input
                  type="text"
                  value={outreach.nextFollowUp}
                  onChange={(e) => {
                    const formatted = formatDateInput(e.target.value);
                    onUpdate({ nextFollowUp: formatted });
                  }}
                  onBlur={(e) => onUpdate({ nextFollowUp: parseDateInput(e.target.value) })}
                  placeholder="MM/DD/YYYY"
                  maxLength={10}
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label>Next Action</Label>
              <Textarea value={outreach.nextAction} onChange={(e) => onUpdate({ nextAction: e.target.value })} rows={3} />
            </div>

            <Separator />

            <div className="space-y-2">
              <Label>Research Directions</Label>
              <div className="flex gap-2">
                <Input value={dirInput} onChange={(e) => setDirInput(e.target.value)} placeholder="Add direction" />
                <Button variant="outline" onClick={addDirection}>
                  Add
                </Button>
              </div>
              <div className="flex gap-2 flex-wrap">
                {(outreach.directions || []).map((d, idx) => (
                  <Badge key={idx} variant="secondary" className="rounded-full">
                    {d}
                    <button className="ml-2 text-xs opacity-70 hover:opacity-100" onClick={() => removeDirection(d)}>
                      ×
                    </button>
                  </Badge>
                ))}
              </div>
            </div>

            <Separator />

            <div className="space-y-2">
              <Label>Linked Projects</Label>
              {projects.length ? (
                <div className="space-y-2">
                  {projects.map((p) => (
                    <div key={p.id} className="rounded-lg border p-2">
                      <div className="text-sm font-medium">
                        {p.projectId} · {p.name || "(untitled)"}
                      </div>
                      <div className="text-xs text-muted-foreground">{p.institution}</div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-sm text-muted-foreground">No projects linked yet.</div>
              )}

              <SelectBox
                value=""
                onValueChange={(pid) => onLinkProject(pid)}
                options={allProjects.map((p) => ({
                  value: p.id,
                  label: `${p.projectId} · ${p.name || "(untitled)"}`,
                }))}
              />
            </div>

            <div className="space-y-2">
              <Label>Notes</Label>
              <Textarea value={outreach.notes} onChange={(e) => onUpdate({ notes: e.target.value })} rows={3} />
            </div>
          </div>
        </div>

        <DialogFooter>
          <Button onClick={() => setOpen(false)}>Done</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function MaterialDetailsDialog({
  task,
  project,
  onUpdate,
  controlledOpen,
  onOpenChange,
}: {
  task: MaterialTask;
  project?: Project;
  onUpdate: (patch: Partial<MaterialTask>) => void;
  controlledOpen?: boolean;
  onOpenChange?: (open: boolean) => void;
}) {
  const [internalOpen, setInternalOpen] = useState(false);
  
  const open = controlledOpen !== undefined ? controlledOpen : internalOpen;
  const setOpen = controlledOpen !== undefined 
    ? (onOpenChange || (() => {}))
    : setInternalOpen;
    
  return (
    <Dialog open={open} onOpenChange={setOpen}>
      {controlledOpen === undefined && (
        <DialogTrigger asChild>
          <Button variant="outline" size="icon" title="Details" className="h-8 w-8">
            <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 5v.01M12 12v.01M12 19v.01M12 6a1 1 0 110-2 1 1 0 010 2zm0 7a1 1 0 110-2 1 1 0 010 2zm0 7a1 1 0 110-2 1 1 0 010 2z" />
            </svg>
          </Button>
        </DialogTrigger>
      )}
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Material Task · {task.taskId}</DialogTitle>
          <DialogDescription>
            {project ? `For ${project.projectId} · ${project.name || "(untitled)"}` : "Reusable (通用)"}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-3">
          <div className="grid md:grid-cols-2 gap-2">
            <div className="space-y-2">
              <Label>Dependency</Label>
              <Input value={task.dependency} onChange={(e) => onUpdate({ dependency: e.target.value })} placeholder="E.g., confirm recommender" />
            </div>
          </div>

          <div className="space-y-4 border rounded-md p-4 bg-muted/10">
            <div className="space-y-2">
              <Label className="flex items-center gap-2">
                <Upload className="h-4 w-4" />
                File Management
              </Label>
              
              <div className="flex gap-2">
                <Input 
                  value={task.link} 
                  onChange={(e) => onUpdate({ link: e.target.value })} 
                  placeholder="File URL or External Link" 
                  className="flex-1"
                />
                {task.link && (
                  <Button
                    variant="secondary"
                    size="icon"
                    onClick={() => window.open(task.link, '_blank')}
                    title="Open Link"
                  >
                    <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                    </svg>
                  </Button>
                )}
              </div>

              <div className="flex items-center gap-3 mt-2">
                <input
                  type="file"
                  id={`file-upload-${task.id}`}
                  style={{ display: 'none' }}
                  onChange={async (e) => {
                    const file = e.target.files?.[0];
                    if (file) {
                      const formData = new FormData();
                      formData.append('file', file);
                      // Add metadata for folder structure
                      // Use project name for folder naming as requested
                      formData.append('projectName', project ? project.name : 'General');
                      formData.append('type', task.type);

                      try {
                        const response = await fetch('http://localhost:3001/upload', {
                          method: 'POST',
                          body: formData,
                        });
                        if (!response.ok) throw new Error('Upload failed');
                        const data = await response.json();
                        onUpdate({ link: data.link });
                      } catch (error) {
                        alert('Upload failed. Ensure server is running on port 3001.');
                      }
                    }
                    e.target.value = '';
                  }}
                />
                <Button
                  variant="outline"
                  className="w-full"
                  onClick={() => document.getElementById(`file-upload-${task.id}`)?.click()}
                >
                  <Upload className="h-4 w-4 mr-2" />
                  Upload & Organize File
                </Button>
              </div>
              <p className="text-[10px] text-muted-foreground">
                * Uploads to server/uploads/{project ? project.projectId : 'General'}/{task.type}/
              </p>
            </div>
          </div>
          <div className="space-y-2">
            <Label>Notes</Label>
            <Textarea value={task.notes} onChange={(e) => onUpdate({ notes: e.target.value })} rows={6} />
          </div>
        </div>

        <DialogFooter>
          <Button onClick={() => setOpen(false)}>Done</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function DecisionEditor({
  d,
  p,
  onLocalUpdate,
  onCommit,
}: {
  d: Decision;
  p: Project;
  onLocalUpdate: (patch: Partial<Decision>) => void;
  onCommit: (patch: Partial<Decision>) => void;
}) {
  return (
    <div className="space-y-3">
      <div className="grid grid-cols-3 gap-2">
        <div className="space-y-1">
          <Label className="text-xs">Why apply</Label>
          <Textarea 
            value={d.whyApply} 
            onChange={(e) => onLocalUpdate({ whyApply: e.target.value })} 
            onBlur={() => onCommit({ whyApply: d.whyApply })}
            rows={4} 
            placeholder="3–5 bullets" 
          />
        </div>
        <div className="space-y-1">
          <Label className="text-xs">Risks</Label>
          <Textarea 
            value={d.risks} 
            onChange={(e) => onLocalUpdate({ risks: e.target.value })} 
            onBlur={() => onCommit({ risks: d.risks })}
            rows={4} 
            placeholder="3–5 bullets" 
          />
        </div>
        <div className="space-y-1">
          <Label className="text-xs">Fit evidence</Label>
          <Textarea 
            value={d.fitEvidence} 
            onChange={(e) => onLocalUpdate({ fitEvidence: e.target.value })} 
            onBlur={() => onCommit({ fitEvidence: d.fitEvidence })}
            rows={4} 
            placeholder="Evidence from your work" 
          />
        </div>
      </div>

      <div className="space-y-1">
        <Label className="text-xs">Strategy</Label>
        <Textarea 
          value={d.strategy} 
          onChange={(e) => onLocalUpdate({ strategy: e.target.value })} 
          onBlur={() => onCommit({ strategy: d.strategy })}
          rows={4} 
          placeholder="Outreach / materials / backup plan" 
        />
      </div>

      <Separator />

      <div className="grid md:grid-cols-2 gap-2">
        <div className="space-y-1">
          <Label className="text-xs">Post result</Label>
          <SelectBox
            value={d.postResult || "_none_"}
            onValueChange={(v) => {
              const val = v === "_none_" ? "" : v;
              onLocalUpdate({ postResult: val as any });
              onCommit({ postResult: val as any });
            }}
            options={[
              { value: "_none_", label: "(empty)" },
              { value: "Interview", label: "Interview" },
              { value: "Offer", label: "Offer" },
              { value: "Rejected", label: "Rejected" },
              { value: "No response", label: "No response" },
            ]}
          />
        </div>
        <div className="space-y-1">
          <Label className="text-xs">Timeline</Label>
          <Textarea 
            value={d.timeline} 
            onChange={(e) => onLocalUpdate({ timeline: e.target.value })} 
            onBlur={() => onCommit({ timeline: d.timeline })}
            rows={2} 
            placeholder="Submitted → reply → interview → result" 
          />
        </div>
      </div>

      <div className="grid md:grid-cols-2 gap-2">
        <div className="space-y-1">
          <Label className="text-xs">What worked</Label>
          <Textarea 
            value={d.worked} 
            onChange={(e) => onLocalUpdate({ worked: e.target.value })} 
            onBlur={() => onCommit({ worked: d.worked })}
            rows={3} 
          />
        </div>
        <div className="space-y-1">
          <Label className="text-xs">What didn't</Label>
          <Textarea 
            value={d.didnt} 
            onChange={(e) => onLocalUpdate({ didnt: e.target.value })} 
            onBlur={() => onCommit({ didnt: d.didnt })}
            rows={3} 
          />
        </div>
      </div>

      <div className="space-y-1">
        <Label className="text-xs">Improvements</Label>
        <Textarea 
          value={d.improvements} 
          onChange={(e) => onLocalUpdate({ improvements: e.target.value })} 
          onBlur={() => onCommit({ improvements: d.improvements })}
          rows={3} 
        />
      </div>

      <div className="space-y-1">
        <Label className="text-xs">Takeaways</Label>
        <Textarea 
          value={d.takeaways} 
          onChange={(e) => onLocalUpdate({ takeaways: e.target.value })} 
          onBlur={() => onCommit({ takeaways: d.takeaways })}
          rows={2} 
          placeholder="≤ 3 items" 
        />
      </div>

      <div className="text-xs text-muted-foreground">
        Tip: keep each box short and actionable. For {p.projectId}, ensure Next Action Date is set.
      </div>
    </div>
  );
}

function DecisionDetailsDialog({
  decision,
  project,
  onUpdate,
  onClose,
}: {
  decision: Decision;
  project: Project;
  onUpdate: (patch: Partial<Decision>) => void;
  onClose: () => void;
}) {
  // Local state to prevent re-render issues
  const [localDecision, setLocalDecision] = React.useState<Decision>(decision);

  // Sync local state when decision ID changes (switching items)
  React.useEffect(() => {
    setLocalDecision(decision);
  }, [decision.id]);

  const handleLocalUpdate = (patch: Partial<Decision>) => {
    setLocalDecision((prev) => ({ ...prev, ...patch }));
  };

  const commitUpdate = (patch: Partial<Decision>) => {
    onUpdate(patch);
  };

  return (
    <Dialog open={true} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Decision Details · {project.projectId}</DialogTitle>
          <DialogDescription>
            Review and edit decision rationale for {project.name || "(untitled)"}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label className="text-sm font-medium">Conclusion</Label>
              <SelectBox
                value={localDecision.conclusion || "_none_"}
                onValueChange={(v) => {
                  const val = v === "_none_" ? "" : v;
                  handleLocalUpdate({ conclusion: val as any });
                  commitUpdate({ conclusion: val as any });
                }}
                options={[{ value: "_none_", label: "(empty)" }, ...DECISION_OPTIONS]}
              />
            </div>
            <div className="space-y-2">
              <Label className="text-sm font-medium">Priority</Label>
              <SelectBox
                value={localDecision.priority || "_none_"}
                onValueChange={(v) => {
                  const val = v === "_none_" ? "" : v;
                  handleLocalUpdate({ priority: val as any });
                  commitUpdate({ priority: val as any });
                }}
                options={[{ value: "_none_", label: "(empty)" }, ...PRIORITIES.map((pr) => ({ value: pr, label: pr }))]}
              />
            </div>
          </div>

          <DecisionEditor 
            d={localDecision} 
            p={project} 
            onLocalUpdate={handleLocalUpdate}
            onCommit={commitUpdate}
          />
        </div>
      </DialogContent>
    </Dialog>
  );
}

export function __tests__() {
  const results: { name: string; ok: boolean }[] = [];

  const t1 = parseDateOrNull("") === null;
  results.push({ name: "parseDateOrNull empty", ok: t1 });

  const t2 = parseDateOrInf("") === Number.POSITIVE_INFINITY;
  results.push({ name: "parseDateOrInf empty", ok: t2 });

  const t3 = clamp01_10(11.2) === 10;
  results.push({ name: "clamp01_10 upper", ok: t3 });

  const t4 = clamp01_10(-1) === 0;
  results.push({ name: "clamp01_10 lower", ok: t4 });

  const t5 = typeof uid("x") === "string" && uid("x").startsWith("x_");
  results.push({ name: "uid prefix", ok: t5 });

  const raw = seed();
  const norm = normalizeStore(raw);
  const t6 = Array.isArray(norm.projects) && Array.isArray(norm.outreach) && Array.isArray(norm.materials) && Array.isArray(norm.decisions);
  results.push({ name: "normalizeStore shape", ok: t6 });

  const norm2 = normalizeStore({ ...raw, projects: raw.projects.map((p: any) => ({ ...p, outreachIds: ["missing"], materialTaskIds: ["missing2"] })) });
  const t7 = norm2.projects.every((p) => (p.outreachIds || []).every((id) => norm2.outreach.some((o) => o.id === id)));
  results.push({ name: "normalizeStore prunes dangling links", ok: t7 });

  return results;
}
