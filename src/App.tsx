import React, { useEffect, useMemo, useRef, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
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
  owner: string;
  status: MaterialStatus;
  version: string;
  due: string;
  dependency: string;
  link: string;
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
    owner: "我",
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
    owner: "我",
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
    <div className="flex items-center justify-between gap-3">
      <div className="text-lg font-semibold tracking-tight">{title}</div>
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
    <Card className="border-dashed">
      <CardHeader>
        <CardTitle className="text-base">{title}</CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        {desc ? <div className="text-sm text-muted-foreground">{desc}</div> : null}
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
  placeholder,
  className,
  id,
}: {
  value?: string;
  onValueChange: (v: string) => void;
  options: SelectOption[];
  placeholder?: string;
  className?: string;
  id?: string;
}) {
  const v = value ?? "";
  return (
    <select
      id={id}
      value={v}
      onChange={(e) => onValueChange(e.target.value)}
      className={
        className ||
        "flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
      }
    >
      {placeholder !== undefined ? (
        <option value="" disabled>
          {placeholder}
        </option>
      ) : null}
      {options.map((o) => (
        <option key={o.value} value={o.value} disabled={o.disabled}>
          {o.label}
        </option>
      ))}
    </select>
  );
}

// -----------------------------
// Main App
// -----------------------------

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

  useEffect(() => {
    saveStore(store);
  }, [store]);

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

    return { counts, nextDDL, upcomingFollowUps, tasksDue, actions };
  }, [store.projects, store.outreach, store.materials]);

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

  function addProject() {
    const p: Project = {
      id: uid("p"),
      projectId: `SR-${new Date().getFullYear() + 1}-${String(store.projects.length + 1).padStart(2, "0")}`,
      name: "",
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

  function updateProject(id: ID, patch: Partial<Project>) {
    setStore((s) =>
      normalizeStore({
        ...s,
        projects: s.projects.map((p) => (p.id === id ? { ...p, ...patch } : p)),
      })
    );
  }

  function deleteProject(id: ID) {
    const ok = confirm("Delete this project? (linked outreach/materials will remain)");
    if (!ok) return;

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
      owner: "我",
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

  function updateMaterial(id: ID, patch: Partial<MaterialTask>) {
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

  function deleteMaterial(id: ID) {
    const ok = confirm("Delete this material task?");
    if (!ok) return;
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
    <div className="min-h-screen w-full bg-background">
      <div className="mx-auto max-w-7xl p-4 md:p-6 lg:p-8 space-y-6">
        {/* Header */}
        <div className="flex flex-col gap-4 pb-4 border-b">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Summer Research Application Tracker</h1>
            <p className="text-sm text-muted-foreground mt-1">
              Notion-like databases + dashboard · Local-only (saved to browser) · Export/Import JSON
            </p>
          </div>

          <div className="flex items-center gap-2 flex-wrap">
            <div className="relative flex-1 min-w-[200px] max-w-[300px]">
              <Search className="h-4 w-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground pointer-events-none" />
              <Input
                value={q}
                onChange={(e) => setQ(e.target.value)}
                placeholder="Search projects / PIs / keywords..."
                className="pl-9 w-full"
              />
            </div>

            <div className="flex items-center gap-2 px-2">
              <Checkbox 
                id="upcoming-filter"
                checked={showOnlyUpcoming} 
                onCheckedChange={(v) => setShowOnlyUpcoming(Boolean(v))} 
              />
              <Label htmlFor="upcoming-filter" className="text-sm text-muted-foreground cursor-pointer">
                Upcoming only
              </Label>
            </div>

            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" className="gap-2">
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
                <Button variant="outline" className="gap-2">
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

        <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as any)} className="space-y-6">
          <TabsList className="grid grid-cols-2 md:grid-cols-5 w-full h-auto">
            <TabsTrigger value="dashboard" className="text-xs md:text-sm">Dashboard</TabsTrigger>
            <TabsTrigger value="projects" className="text-xs md:text-sm">Projects</TabsTrigger>
            <TabsTrigger value="outreach" className="text-xs md:text-sm">PI Outreach</TabsTrigger>
            <TabsTrigger value="materials" className="text-xs md:text-sm">Materials</TabsTrigger>
            <TabsTrigger value="decisions" className="text-xs md:text-sm">Decision & Review</TabsTrigger>
          </TabsList>

          <TabsContent value="dashboard" className="space-y-6 mt-6">
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              <Card>
                <CardHeader>
                  <CardTitle className="text-base">Status Overview</CardTitle>
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

              <Card>
                <CardHeader>
                  <CardTitle className="text-base">Next Deadline</CardTitle>
                </CardHeader>
                <CardContent className="space-y-2">
                  {dashboard.nextDDL ? (
                    <>
                      <div className="text-sm font-medium">
                        {dashboard.nextDDL.projectId} · {dashboard.nextDDL.name}
                      </div>
                      <div className="text-sm text-muted-foreground">
                        {dashboard.nextDDL.institution} · {dashboard.nextDDL.region}
                      </div>
                      <div className="flex items-center gap-2">
                        <Calendar className="h-4 w-4" />
                        <div className="text-sm">DDL: {dashboard.nextDDL.ddl || "—"}</div>
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

              <Card>
                <CardHeader>
                  <CardTitle className="text-base">Upcoming Actions</CardTitle>
                </CardHeader>
                <CardContent className="space-y-2">
                  {dashboard.actions.length ? (
                    dashboard.actions.map((p) => (
                      <div key={p.id} className="rounded-lg border p-2">
                        <div className="text-sm font-medium">
                          {p.projectId} · {p.name}
                        </div>
                        <div className="text-xs text-muted-foreground">
                          {p.nextActionDate || "—"} · {p.nextAction || "—"}
                        </div>
                      </div>
                    ))
                  ) : (
                    <div className="text-sm text-muted-foreground">No upcoming actions.</div>
                  )}
                </CardContent>
              </Card>
            </div>

            <div className="grid gap-4 md:grid-cols-2">
              <Card>
                <CardHeader>
                  <CardTitle className="text-base">Upcoming Follow-ups (PI)</CardTitle>
                </CardHeader>
                <CardContent className="space-y-2">
                  {dashboard.upcomingFollowUps.length ? (
                    dashboard.upcomingFollowUps.map((o) => (
                      <div key={o.id} className="rounded-lg border p-2">
                        <div className="text-sm font-medium">
                          {o.outreachId} · {o.piName}
                        </div>
                        <div className="text-xs text-muted-foreground">{o.institution}</div>
                        <div className="text-xs">
                          Next: {o.nextFollowUp || "—"} · {o.nextAction || "—"}
                        </div>
                      </div>
                    ))
                  ) : (
                    <div className="text-sm text-muted-foreground">No follow-ups scheduled.</div>
                  )}
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="text-base">Tasks Due (Materials)</CardTitle>
                </CardHeader>
                <CardContent className="space-y-2">
                  {dashboard.tasksDue.length ? (
                    dashboard.tasksDue.map((m) => (
                      <div key={m.id} className="rounded-lg border p-2">
                        <div className="text-sm font-medium">
                          {m.taskId} · {m.type}
                        </div>
                        <div className="text-xs text-muted-foreground">
                          Due: {m.due || "—"} · {m.status}
                        </div>
                        <div className="text-xs">Owner: {m.owner}</div>
                      </div>
                    ))
                  ) : (
                    <div className="text-sm text-muted-foreground">No tasks due.</div>
                  )}
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          <TabsContent value="projects" className="space-y-6 mt-6">
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
              <SectionTitle
                title={`Projects (${filteredProjects.length})`}
                right={
                  <Button onClick={addProject} className="gap-2 w-full sm:w-auto">
                    <Plus className="h-4 w-4" /> Add Project
                  </Button>
                }
              />
            </div>

            {filteredProjects.length ? (
              <div className="border rounded-lg overflow-hidden bg-card">
                <div className="overflow-x-auto scrollbar-hide">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead className="min-w-[130px]">ID</TableHead>
                        <TableHead className="min-w-[200px]">Name</TableHead>
                        <TableHead className="min-w-[160px]">Institution</TableHead>
                        <TableHead className="min-w-[110px]">DDL</TableHead>
                        <TableHead className="min-w-[140px]">Status</TableHead>
                        <TableHead className="min-w-[120px]">Priority</TableHead>
                        <TableHead className="min-w-[210px]">Next Action</TableHead>
                        <TableHead className="w-[100px]">Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {filteredProjects.map((p) => (
                        <TableRow key={p.id}>
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
                              type="date"
                              value={p.ddl}
                              onChange={(e) => updateProject(p.id, { ddl: e.target.value })}
                              className="h-8"
                            />
                          </TableCell>

                          <TableCell>
                            <SelectBox
                              value={p.status}
                              onValueChange={(v) => updateProject(p.id, { status: v as ProjectStatus })}
                              options={STATUS_LIST.map((s) => ({ value: s, label: s }))}
                              className="h-8 rounded-md border border-input bg-background px-2 text-sm"
                            />
                            <div className="mt-2">
                              <SelectBox
                                value={p.decision}
                                onValueChange={(v) => updateProject(p.id, { decision: v as any })}
                                options={DECISION_OPTIONS}
                                className="h-8 rounded-md border border-input bg-background px-2 text-sm"
                              />
                            </div>
                          </TableCell>

                          <TableCell>
                            <SelectBox
                              value={p.priority}
                              onValueChange={(v) => updateProject(p.id, { priority: v as Priority })}
                              options={PRIORITIES.map((pr) => ({ value: pr, label: pr }))}
                              className="h-8 rounded-md border border-input bg-background px-2 text-sm"
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
                                type="date"
                                value={p.nextActionDate}
                                onChange={(e) => updateProject(p.id, { nextActionDate: e.target.value })}
                                className="h-8"
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

          <TabsContent value="outreach" className="space-y-6 mt-6">
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
              <SectionTitle
                title={`PI Outreach (${store.outreach.length})`}
                right={
                  <Button onClick={() => addOutreach()} className="gap-2 w-full sm:w-auto">
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
                        <TableHead className="min-w-[160px]">PI</TableHead>
                        <TableHead className="min-w-[180px]">Institution</TableHead>
                        <TableHead className="min-w-[120px]">First Contact</TableHead>
                        <TableHead className="min-w-[140px]">Reply</TableHead>
                        <TableHead className="min-w-[130px]">Stage</TableHead>
                        <TableHead className="min-w-[160px]">Next Follow-up</TableHead>
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
                                type="date"
                                value={o.firstContact}
                                onChange={(e) => updateOutreach(o.id, { firstContact: e.target.value })}
                                className="h-8"
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
                                className="h-8 rounded-md border border-input bg-background px-2 text-sm"
                              />
                              <div className="mt-2">
                                <Input
                                  type="date"
                                  value={o.replyDate}
                                  onChange={(e) => updateOutreach(o.id, { replyDate: e.target.value })}
                                  className="h-8"
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
                                type="date"
                                value={o.nextFollowUp}
                                onChange={(e) => updateOutreach(o.id, { nextFollowUp: e.target.value })}
                                className="h-8"
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

          <TabsContent value="materials" className="space-y-6 mt-6">
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
              <SectionTitle
                title={`Materials (${store.materials.length})`}
                right={
                  <Button onClick={() => addMaterial()} className="gap-2 w-full sm:w-auto">
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
                        <TableHead className="min-w-[180px]">Type</TableHead>
                        <TableHead className="min-w-[160px]">Target</TableHead>
                        <TableHead className="min-w-[120px]">Owner</TableHead>
                        <TableHead className="min-w-[140px]">Status</TableHead>
                        <TableHead className="min-w-[120px]">Due</TableHead>
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
                              <Input
                                value={m.owner}
                                onChange={(e) => updateMaterial(m.id, { owner: e.target.value })}
                                className="h-8"
                              />
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
                                type="date"
                                value={m.due}
                                onChange={(e) => updateMaterial(m.id, { due: e.target.value })}
                                className="h-8"
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

          <TabsContent value="decisions" className="space-y-6 mt-6">
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
                      <Card key={d.id} className="overflow-hidden">
                        <CardHeader>
                          <div className="flex items-start justify-between gap-2">
                            <div>
                              <CardTitle className="text-base">
                                {p.projectId} · {p.name || "(untitled)"}
                              </CardTitle>
                              <div className="text-xs text-muted-foreground">
                                {p.institution} · {p.region}
                              </div>
                            </div>
                            <div className="flex gap-2">
                              <Pill>{d.conclusion}</Pill>
                              <Pill>{d.priority}</Pill>
                            </div>
                          </div>
                        </CardHeader>
                        <CardContent className="space-y-3">
                          <div className="grid grid-cols-2 gap-2">
                            <div>
                              <Label className="text-xs">Conclusion</Label>
                              <SelectBox
                                value={d.conclusion}
                                onValueChange={(v) => {
                                  updateDecision(d.id, { conclusion: v as any });
                                  updateProject(p.id, { decision: v as any });
                                }}
                                options={DECISION_OPTIONS}
                                className="h-8 rounded-md border border-input bg-background px-2 text-sm"
                              />
                            </div>
                            <div>
                              <Label className="text-xs">Priority</Label>
                              <SelectBox
                                value={d.priority}
                                onValueChange={(v) => {
                                  updateDecision(d.id, { priority: v as any });
                                  updateProject(p.id, { priority: v as any });
                                }}
                                options={PRIORITIES.map((pr) => ({ value: pr, label: pr }))}
                                className="h-8 rounded-md border border-input bg-background px-2 text-sm"
                              />
                            </div>
                          </div>

                          <Separator />

                          <DecisionEditor d={d} p={p} onUpdate={(patch) => updateDecision(d.id, patch)} />
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
      <DialogContent className="max-w-xl">
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
            placeholder="Select project"
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
      <DialogContent className="max-w-3xl">
        <DialogHeader>
          <DialogTitle>Project Details · {project.projectId}</DialogTitle>
          <DialogDescription>Edit everything in one place; link outreach and materials.</DialogDescription>
        </DialogHeader>

        <div className="grid gap-4 md:grid-cols-2">
          <div className="space-y-3">
            <div className="space-y-2">
              <Label>Name</Label>
              <Input value={project.name} onChange={(e) => onUpdate({ name: e.target.value })} placeholder="Project name" />
            </div>

            <div className="grid grid-cols-2 gap-2">
              <div className="space-y-2">
                <Label>Institution</Label>
                <Input value={project.institution} onChange={(e) => onUpdate({ institution: e.target.value })} />
              </div>
              <div className="space-y-2">
                <Label>Region</Label>
                <Input value={project.region} onChange={(e) => onUpdate({ region: e.target.value })} />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-2">
              <div className="space-y-2">
                <Label>Type</Label>
                <Input value={project.type} onChange={(e) => onUpdate({ type: e.target.value })} placeholder="Summer Program / Visiting" />
              </div>
              <div className="space-y-2">
                <Label>Round</Label>
                <Input value={project.round} onChange={(e) => onUpdate({ round: e.target.value })} placeholder="Round 1 / Rolling" />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-2">
              <div className="space-y-2">
                <Label>DDL</Label>
                <Input type="date" value={project.ddl} onChange={(e) => onUpdate({ ddl: e.target.value })} />
              </div>
              <div className="space-y-2">
                <Label>Next Action Date</Label>
                <Input type="date" value={project.nextActionDate} onChange={(e) => onUpdate({ nextActionDate: e.target.value })} />
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
                  placeholder="Select outreach to link"
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
                              {m.owner && <span>Owner: {m.owner}</span>}
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
                        m.type.toLowerCase().includes(search) ||
                        m.owner.toLowerCase().includes(search)
                      );
                    })
                    .map((m) => ({
                      value: m.id,
                      label: `${m.taskId} · ${m.type}${m.owner ? ` (${m.owner})` : ""}`,
                    }))}
                  placeholder="Select material to link"
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
      <DialogContent className="max-w-2xl">
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
                <Input type="date" value={outreach.firstContact} onChange={(e) => onUpdate({ firstContact: e.target.value })} />
              </div>
              <div className="space-y-2">
                <Label>Email Version</Label>
                <Input value={outreach.emailVersion} onChange={(e) => onUpdate({ emailVersion: e.target.value })} placeholder="v1-short / v2-tailored" />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-2">
              <div className="space-y-2">
                <Label>Reply Status</Label>
                <SelectBox
                  value={outreach.replied}
                  onValueChange={(v) => onUpdate({ replied: v as any })}
                  options={[
                    { value: "No reply", label: "No reply" },
                    { value: "Replied", label: "Replied" },
                    { value: "Auto-reply", label: "Auto-reply" },
                  ]}
                />
              </div>
              <div className="space-y-2">
                <Label>Reply Date</Label>
                <Input type="date" value={outreach.replyDate} onChange={(e) => onUpdate({ replyDate: e.target.value })} />
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
                <Input type="date" value={outreach.nextFollowUp} onChange={(e) => onUpdate({ nextFollowUp: e.target.value })} />
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
                placeholder="Link a project"
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
      <DialogContent className="max-w-2xl">
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
            <div className="space-y-2">
              <Label>Link / Attachment</Label>
              <Input value={task.link} onChange={(e) => onUpdate({ link: e.target.value })} placeholder="Drive/Notion link" />
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
  onUpdate,
}: {
  d: Decision;
  p: Project;
  onUpdate: (patch: Partial<Decision>) => void;
}) {
  return (
    <div className="space-y-3">
      <div className="grid grid-cols-3 gap-2">
        <div className="space-y-1">
          <Label className="text-xs">Why apply</Label>
          <Textarea value={d.whyApply} onChange={(e) => onUpdate({ whyApply: e.target.value })} rows={4} placeholder="3–5 bullets" />
        </div>
        <div className="space-y-1">
          <Label className="text-xs">Risks</Label>
          <Textarea value={d.risks} onChange={(e) => onUpdate({ risks: e.target.value })} rows={4} placeholder="3–5 bullets" />
        </div>
        <div className="space-y-1">
          <Label className="text-xs">Fit evidence</Label>
          <Textarea value={d.fitEvidence} onChange={(e) => onUpdate({ fitEvidence: e.target.value })} rows={4} placeholder="Evidence from your work" />
        </div>
      </div>

      <div className="space-y-1">
        <Label className="text-xs">Strategy</Label>
        <Textarea value={d.strategy} onChange={(e) => onUpdate({ strategy: e.target.value })} rows={4} placeholder="Outreach / materials / backup plan" />
      </div>

      <Separator />

      <div className="grid md:grid-cols-2 gap-2">
        <div className="space-y-1">
          <Label className="text-xs">Post result</Label>
          <SelectBox
            value={d.postResult}
            onValueChange={(v) => onUpdate({ postResult: v as any })}
            options={[
              { value: "", label: "(empty)" },
              { value: "Interview", label: "Interview" },
              { value: "Offer", label: "Offer" },
              { value: "Rejected", label: "Rejected" },
              { value: "No response", label: "No response" },
            ]}
            className="h-8 rounded-md border border-input bg-background px-2 text-sm"
          />
        </div>
        <div className="space-y-1">
          <Label className="text-xs">Timeline</Label>
          <Textarea value={d.timeline} onChange={(e) => onUpdate({ timeline: e.target.value })} rows={2} placeholder="Submitted → reply → interview → result" />
        </div>
      </div>

      <div className="grid md:grid-cols-2 gap-2">
        <div className="space-y-1">
          <Label className="text-xs">What worked</Label>
          <Textarea value={d.worked} onChange={(e) => onUpdate({ worked: e.target.value })} rows={3} />
        </div>
        <div className="space-y-1">
          <Label className="text-xs">What didn’t</Label>
          <Textarea value={d.didnt} onChange={(e) => onUpdate({ didnt: e.target.value })} rows={3} />
        </div>
      </div>

      <div className="space-y-1">
        <Label className="text-xs">Improvements</Label>
        <Textarea value={d.improvements} onChange={(e) => onUpdate({ improvements: e.target.value })} rows={3} />
      </div>

      <div className="space-y-1">
        <Label className="text-xs">Takeaways</Label>
        <Textarea value={d.takeaways} onChange={(e) => onUpdate({ takeaways: e.target.value })} rows={2} placeholder="≤ 3 items" />
      </div>

      <div className="text-xs text-muted-foreground">
        Tip: keep each box short and actionable. For {p.projectId}, ensure Next Action Date is set.
      </div>
    </div>
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
