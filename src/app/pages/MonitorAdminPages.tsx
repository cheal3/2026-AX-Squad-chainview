import { useMemo, useState, type ReactNode } from "react";
import {
  Boxes,
  CheckCircle2,
  ChevronRight,
  Code2,
  Database,
  Filter,
  Folder,
  FolderTree,
  GitBranch,
  Layers3,
  Link2,
  Pencil,
  Plus,
  Save,
  Search,
  Server,
  ShieldCheck,
  Tag,
  Tags,
  Trash2,
  Users,
  X,
} from "lucide-react";
import { usePortalData } from "../PortalDataStore";
import { PageHeader } from "../components/PageHeader";
import { TableActionButton } from "../components/TableActionButton";
import { codeLabels, type ServiceRecord } from "../mockData";

type TableColumn<T> = {
  key: string;
  label: string;
  render: (row: T) => ReactNode;
  align?: "left" | "center" | "right";
};

type SummaryItem = {
  label: string;
  value: number | string;
  tone?: "red" | "amber" | "emerald" | "indigo" | "slate";
};

function tableAlignClassName(align: TableColumn<unknown>["align"]) {
  if (align === "center") {
    return "text-center";
  }

  if (align === "right") {
    return "text-right";
  }

  return "text-left";
}

function AdminShell({
  actions,
  children,
  description,
  icon,
  summary,
  title,
}: {
  actions?: ReactNode;
  children: ReactNode;
  description: string;
  icon: ReactNode;
  summary: SummaryItem[];
  title: string;
}) {
  return (
    <div className="mx-auto flex w-full max-w-[1600px] flex-col gap-5">
      <PageHeader
        actions={actions}
        description={description}
        icon={icon}
        title={title}
      />

      {summary.length > 0 && (
        <section className="grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-4">
          {summary.map((item) => (
            <SummaryCard key={item.label} item={item} />
          ))}
        </section>
      )}

      {children}
    </div>
  );
}

function SummaryCard({ item }: { item: SummaryItem }) {
  const toneClassName =
    item.tone === "red"
      ? "text-[#f04452] bg-[#fff5f6] border-[#ffe5e8]"
      : item.tone === "amber"
        ? "text-[#f08c00] bg-[#fff8df] border-[#ffe6a3]"
        : item.tone === "emerald"
          ? "text-[#20c997] bg-[#ecfff8] border-[#c9f7e6]"
          : item.tone === "indigo"
            ? "text-[#1f6feb] bg-[#f2f7ff] border-[#d9e8ff]"
            : "text-slate-600 bg-slate-50 border-slate-100";

  return (
    <div className={`rounded-xl border p-4 shadow-sm ${toneClassName}`}>
      <div className="text-sm font-black opacity-80">{item.label}</div>
      <div className="mt-2 text-3xl font-black">{item.value}</div>
    </div>
  );
}

function DataPanel<T>({
  columns,
  empty,
  getKey,
  placeholder,
  rows,
  search,
  setSearch,
  title,
}: {
  columns: TableColumn<T>[];
  empty: string;
  getKey: (row: T) => string | number;
  placeholder: string;
  rows: T[];
  search: string;
  setSearch: (value: string) => void;
  title: string;
}) {
  return (
    <section className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
      <div className="flex flex-wrap items-center gap-3 border-b border-slate-100 p-4">
        <h2 className="text-base font-black text-slate-950">{title}</h2>
        <span className="rounded-full border border-slate-200 bg-slate-50 px-3 py-0.5 text-xs font-black text-slate-500">
          {rows.length}
        </span>
        <label className="relative ml-auto min-w-[260px] flex-1 md:max-w-[520px]">
          <Search
            size={17}
            className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400"
          />
          <input
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder={placeholder}
            className="h-10 w-full rounded-lg border border-slate-200 bg-slate-50 pl-10 pr-4 text-sm font-semibold text-slate-700 outline-none transition focus:border-[#86b7ff] focus:bg-white focus:ring-4 focus:ring-[#edf5ff]"
          />
        </label>
        <button
          type="button"
          className="inline-flex h-10 items-center gap-2 rounded-lg border border-slate-200 bg-white px-4 text-sm font-black text-slate-600 transition hover:bg-slate-50"
        >
          <Filter size={16} />
          필터
        </button>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full min-w-full">
          <thead className="bg-slate-50 text-left text-xs font-black text-slate-400">
            <tr>
              {columns.map((column) => (
                <th
                  key={column.key}
                  className={`whitespace-nowrap px-5 py-3 ${
                    column.key === "actions" ? "w-[148px] px-3" : ""
                  } ${
                    column.key === "actions"
                      ? "text-center"
                      : tableAlignClassName(column.align)
                  }`}
                >
                  {column.label}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {rows.length ? (
              rows.map((row) => (
                <tr key={getKey(row)} className="hover:bg-slate-50/70">
                  {columns.map((column) => (
                    <td
                      key={column.key}
                      className={`whitespace-nowrap px-5 py-4 align-middle text-sm font-semibold text-slate-700 ${
                        column.key === "actions" ? "w-[148px] px-3" : ""
                      } ${
                        column.key === "actions"
                          ? "text-center"
                          : tableAlignClassName(column.align)
                      }`}
                    >
                      {column.render(row)}
                    </td>
                  ))}
                </tr>
              ))
            ) : (
              <tr>
                <td
                  colSpan={columns.length}
                  className="px-5 py-12 text-center text-sm font-bold text-slate-400"
                >
                  {empty}
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </section>
  );
}

function Badge({
  children,
  tone = "slate",
}: {
  children: ReactNode;
  tone?: "red" | "amber" | "emerald" | "indigo" | "slate";
}) {
  const className =
    tone === "red"
      ? "border-[#ffd1d6] bg-[#fff5f6] text-[#f04452]"
      : tone === "amber"
        ? "border-[#ffd978] bg-[#fff8df] text-[#e67700]"
        : tone === "emerald"
          ? "border-[#a7efd8] bg-[#ecfff8] text-[#00a77d]"
          : tone === "indigo"
            ? "border-[#c7dbff] bg-[#f2f7ff] text-[#1f6feb]"
            : "border-slate-200 bg-slate-50 text-slate-600";

  return (
    <span
      className={`inline-flex min-w-fit whitespace-nowrap break-keep rounded-full border px-2.5 py-1 text-xs font-black leading-none ${className}`}
    >
      {children}
    </span>
  );
}

function ActionButtons() {
  return (
    <div className="flex flex-nowrap justify-center gap-1.5">
      <TableActionButton tone="neutral">
        <Pencil size={14} />
        수정
      </TableActionButton>
      <TableActionButton tone="danger">
        <Trash2 size={14} />
        삭제
      </TableActionButton>
    </div>
  );
}

function includesKeyword(values: unknown[], keyword: string) {
  const normalized = keyword.trim().toLowerCase();
  if (!normalized) {
    return true;
  }
  return values.join(" ").toLowerCase().includes(normalized);
}

function serviceName(service?: ServiceRecord) {
  return service ? service.serviceName : "-";
}

const CATEGORY_MAX_LEVEL = 4;
const CATEGORY_ROOT_ID = "__category-root__";

type CategoryTreeNode = {
  id: string;
  name: string;
  path: string[];
  level: number;
  serviceCount: number;
  system?: boolean;
  children: CategoryTreeNode[];
};

type CategoryCandidate = {
  existing: boolean;
  name: string;
  path: string[];
  serviceCount: number;
};

function createCategoryId(path: string[]) {
  return path.join(" > ");
}

function sortCategoryTree(nodes: CategoryTreeNode[]) {
  return nodes
    .map((node) => ({
      ...node,
      children: sortCategoryTree(node.children),
    }))
    .sort(
      (first, second) =>
        first.name.localeCompare(second.name, "ko") || first.id.localeCompare(second.id)
    );
}

function rebaseCategoryTree(
  nodes: CategoryTreeNode[],
  parentPath: string[] = []
): CategoryTreeNode[] {
  return nodes.map((node) => {
    const path = [...parentPath, node.name];

    return {
      ...node,
      path,
      level: path.length,
      children: rebaseCategoryTree(node.children, path),
    };
  });
}

function buildCategoryTree(services: ServiceRecord[]) {
  const rootNodes: CategoryTreeNode[] = [];
  const nodeByPath = new Map<string, CategoryTreeNode>();

  services.forEach((service) => {
    service.categoryPath.slice(0, CATEGORY_MAX_LEVEL).forEach((name, index) => {
      const path = service.categoryPath.slice(0, index + 1);
      const id = createCategoryId(path);
      const current =
        nodeByPath.get(id) ??
        ({
          id,
          name,
          path,
          level: index + 1,
          serviceCount: 0,
          children: [],
        } satisfies CategoryTreeNode);

      current.serviceCount += 1;
      nodeByPath.set(id, current);

      if (index === 0) {
        if (!rootNodes.some((node) => node.id === current.id)) {
          rootNodes.push(current);
        }
        return;
      }

      const parentId = createCategoryId(path.slice(0, -1));
      const parent = nodeByPath.get(parentId);

      if (parent && !parent.children.some((node) => node.id === current.id)) {
        parent.children.push(current);
      }
    });
  });

  return sortCategoryTree(rootNodes);
}

function withCategoryRoot(
  nodes: CategoryTreeNode[],
  serviceCount: number
): CategoryTreeNode[] {
  return [
    {
      id: CATEGORY_ROOT_ID,
      name: "전체",
      path: ["전체"],
      level: 0,
      serviceCount,
      system: true,
      children: nodes,
    },
  ];
}

function flattenCategoryTree(nodes: CategoryTreeNode[]) {
  return nodes.flatMap((node): CategoryTreeNode[] => [
    node,
    ...flattenCategoryTree(node.children),
  ]);
}

function createDefaultExpandedIds(nodes: CategoryTreeNode[]) {
  return new Set([
    CATEGORY_ROOT_ID,
    ...flattenCategoryTree(nodes)
      .filter((node) => node.level < 3 && node.children.length > 0)
      .map((node) => node.id),
  ]);
}

function categoryPathStartsWith(path: string[], prefix: string[]) {
  return prefix.every((item, index) => path[index] === item);
}

function categoryParentPath(node: CategoryTreeNode) {
  return node.system ? [] : node.path;
}

function getExistingCategoryChildren(
  nodes: CategoryTreeNode[],
  parentNode: CategoryTreeNode
) {
  if (parentNode.system) {
    return nodes;
  }

  return findCategoryNode(nodes, parentNode.id)?.children ?? [];
}

function buildRegisteredCategorySubtree(
  services: ServiceRecord[],
  path: string[]
): CategoryTreeNode {
  const matchedServices = services.filter((service) =>
    categoryPathStartsWith(service.categoryPath, path)
  );
  const nextLevelIndex = path.length;
  const childNames = Array.from(
    new Set(
      matchedServices
        .map((service) => service.categoryPath[nextLevelIndex])
        .filter(Boolean)
    )
  );

  return {
    id: createCategoryId(path),
    name: path[path.length - 1],
    path,
    level: path.length,
    serviceCount: matchedServices.length,
    children:
      path.length >= CATEGORY_MAX_LEVEL
        ? []
        : sortCategoryTree(
            childNames.map((name) =>
              buildRegisteredCategorySubtree(services, [...path, name])
            )
          ),
  };
}

function getRegisteredChildCandidates(
  services: ServiceRecord[],
  categoryTree: CategoryTreeNode[],
  parentNode: CategoryTreeNode
): CategoryCandidate[] {
  const parentPath = categoryParentPath(parentNode);
  const nextLevelIndex = parentPath.length;

  if (nextLevelIndex >= CATEGORY_MAX_LEVEL) {
    return [];
  }

  const existingNames = new Set(
    getExistingCategoryChildren(categoryTree, parentNode).map((node) => node.name)
  );
  const countByName = new Map<string, number>();

  services.forEach((service) => {
    if (!categoryPathStartsWith(service.categoryPath, parentPath)) {
      return;
    }

    const childName = service.categoryPath[nextLevelIndex];
    if (!childName) {
      return;
    }

    countByName.set(childName, (countByName.get(childName) ?? 0) + 1);
  });

  return Array.from(countByName.entries())
    .map(([name, serviceCount]) => ({
      existing: existingNames.has(name),
      name,
      path: [...parentPath, name],
      serviceCount,
    }))
    .sort(
      (first, second) =>
        Number(first.existing) - Number(second.existing) ||
        first.name.localeCompare(second.name, "ko")
    );
}

function filterCategoryTreeForSearch(
  nodes: CategoryTreeNode[],
  search: string
): CategoryTreeNode[] {
  const normalized = search.trim().toLowerCase();

  if (!normalized) {
    return nodes;
  }

  const filterNode = (node: CategoryTreeNode): CategoryTreeNode | null => {
    const pathLabel = node.path.join(" / ");
    const children = node.children
      .map(filterNode)
      .filter((child): child is CategoryTreeNode => Boolean(child));
    const selfMatched = [node.name, pathLabel]
      .join(" ")
      .toLowerCase()
      .includes(normalized);

    if (!selfMatched && children.length === 0) {
      return null;
    }

    return {
      ...node,
      children,
    };
  };

  return nodes
    .map(filterNode)
    .filter((node): node is CategoryTreeNode => Boolean(node));
}

function findCategoryNode(
  nodes: CategoryTreeNode[],
  nodeId: string
): CategoryTreeNode | undefined {
  for (const node of nodes) {
    if (node.id === nodeId) {
      return node;
    }

    const child = findCategoryNode(node.children, nodeId);
    if (child) {
      return child;
    }
  }

  return undefined;
}

function renameCategoryNode(
  nodes: CategoryTreeNode[],
  nodeId: string,
  name: string
) {
  const rename = (currentNodes: CategoryTreeNode[]): CategoryTreeNode[] =>
    currentNodes.map((node) => ({
      ...node,
      name: node.id === nodeId ? name : node.name,
      children: rename(node.children),
    }));

  return rebaseCategoryTree(rename(nodes));
}

function addCategoryNode(
  nodes: CategoryTreeNode[],
  parentId: string | null,
  newNode: CategoryTreeNode
) {
  if (!parentId) {
    return sortCategoryTree(rebaseCategoryTree([...nodes, newNode]));
  }

  const add = (currentNodes: CategoryTreeNode[]): CategoryTreeNode[] =>
    currentNodes.map((node) => {
      if (node.id === parentId && node.level < CATEGORY_MAX_LEVEL) {
        return {
          ...node,
          children: sortCategoryTree([...node.children, newNode]),
        };
      }

      return {
        ...node,
        children: add(node.children),
      };
    });

  return rebaseCategoryTree(add(nodes));
}

function removeCategoryNode(nodes: CategoryTreeNode[], nodeId: string) {
  const remove = (currentNodes: CategoryTreeNode[]): CategoryTreeNode[] =>
    currentNodes
      .filter((node) => node.id !== nodeId)
      .map((node) => ({
        ...node,
        children: remove(node.children),
      }));

  return rebaseCategoryTree(remove(nodes));
}

function getCategoryDepthVisual(level: number) {
  if (level === 0) {
    return {
      Icon: Layers3,
      className: "bg-[#3182f6] text-white ring-[#d9e8ff]",
    };
  }
  if (level === 1) {
    return {
      Icon: FolderTree,
      className: "bg-[#f2f7ff] text-[#1f6feb] ring-[#d9e8ff]",
    };
  }
  if (level === 2) {
    return {
      Icon: Folder,
      className: "bg-[#effbff] text-[#168aa0] ring-[#d7f4fb]",
    };
  }
  if (level === 3) {
    return {
      Icon: Tags,
      className: "bg-[#fff3e0] text-[#ff8a00] ring-[#ffd7a3]",
    };
  }
  return {
    Icon: Tag,
    className: "bg-[#f8eaff] text-[#b517d4] ring-[#edc8ff]",
  };
}

export function ServiceRelationsAdminPage() {
  const { relations, services } = usePortalData();
  const [search, setSearch] = useState("");
  const serviceById = useMemo(
    () => new Map(services.map((service) => [service.serviceId, service])),
    [services]
  );
  const rows = relations.filter((relation) => {
    const source = serviceById.get(relation.sourceServiceId);
    const target = serviceById.get(relation.targetServiceId);
    return includesKeyword(
      [
        source?.serviceName,
        source?.serviceCode,
        target?.serviceName,
        target?.serviceCode,
        relation.relationTypeCode,
        relation.description,
      ],
      search
    );
  });

  return (
    <AdminShell
      description="서비스 간 호출/연계 관계를 관리합니다."
      icon={<Link2 size={22} />}
      summary={[
        { label: "전체 관계", value: relations.length, tone: "indigo" },
        {
          label: "활성",
          value: relations.filter((item) => item.relationStatusCode === "ACTIVE").length,
          tone: "emerald",
        },
        {
          label: "필수",
          value: relations.filter((item) => item.mandatoryYn === "Y").length,
          tone: "amber",
        },
        {
          label: "폐기 예정",
          value: relations.filter((item) => item.relationStatusCode === "DEPRECATED").length,
          tone: "red",
        },
      ]}
      title="서비스 관계 관리"
    >
      <DataPanel
        columns={[
          {
            key: "source",
            label: "송신 서비스",
            render: (row) => (
              <ServiceCell service={serviceById.get(row.sourceServiceId)} />
            ),
          },
          {
            key: "target",
            label: "수신 서비스",
            render: (row) => (
              <ServiceCell service={serviceById.get(row.targetServiceId)} />
            ),
          },
          {
            key: "type",
            label: "유형",
            render: (row) => codeLabels.relationType[row.relationTypeCode],
          },
          {
            key: "required",
            label: "필수",
            align: "center",
            render: (row) => (
              <Badge tone={row.mandatoryYn === "Y" ? "amber" : "slate"}>
                {row.mandatoryYn === "Y" ? "필수" : "선택"}
              </Badge>
            ),
          },
          {
            key: "status",
            label: "상태",
            align: "center",
            render: (row) => (
              <Badge
                tone={row.relationStatusCode === "ACTIVE" ? "emerald" : "red"}
              >
                {codeLabels.relationStatus[row.relationStatusCode]}
              </Badge>
            ),
          },
          { key: "actions", label: "액션", align: "right", render: () => <ActionButtons /> },
        ]}
        empty="조건에 맞는 관계가 없습니다."
        getKey={(row) => row.relationId}
        placeholder="서비스명, 코드, 관계 유형 검색..."
        rows={rows}
        search={search}
        setSearch={setSearch}
        title="관계 목록"
      />
    </AdminShell>
  );
}

export function ServiceCategoryPage() {
  const { services } = usePortalData();
  const initialTree = useMemo(() => buildCategoryTree(services), [services]);
  const [categoryTree, setCategoryTree] = useState<CategoryTreeNode[]>(() =>
    buildCategoryTree(services)
  );
  const [expandedIds, setExpandedIds] = useState<Set<string>>(() =>
    createDefaultExpandedIds(buildCategoryTree(services))
  );
  const [search, setSearch] = useState("");
  const [addingParentId, setAddingParentId] = useState<string | null>(null);
  const [candidateSearch, setCandidateSearch] = useState("");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editingName, setEditingName] = useState("");
  const rootedCategoryTree = useMemo(
    () => withCategoryRoot(categoryTree, services.length),
    [categoryTree, services.length]
  );
  const visibleCategoryTree = useMemo(
    () => filterCategoryTreeForSearch(rootedCategoryTree, search),
    [rootedCategoryTree, search]
  );

  const toggleExpanded = (nodeId: string) => {
    setExpandedIds((current) => {
      const next = new Set(current);
      if (next.has(nodeId)) {
        next.delete(nodeId);
      } else {
        next.add(nodeId);
      }
      return next;
    });
  };

  const startEditing = (node: CategoryTreeNode) => {
    if (node.system) {
      return;
    }

    setAddingParentId(null);
    setEditingId(node.id);
    setEditingName(node.name);
  };

  const cancelEditing = () => {
    setEditingId(null);
    setEditingName("");
  };

  const saveEditing = () => {
    if (!editingId) {
      return;
    }

    const nextName = editingName.trim();
    if (!nextName) {
      return;
    }

    setCategoryTree((current) =>
      renameCategoryNode(current, editingId, nextName)
    );
    cancelEditing();
  };

  const openAddCategoryPicker = (node: CategoryTreeNode) => {
    if (node.level >= CATEGORY_MAX_LEVEL) {
      return;
    }

    setEditingId(null);
    setCandidateSearch("");
    setAddingParentId((current) => (current === node.id ? null : node.id));
    setExpandedIds((current) => new Set(current).add(node.id));
  };

  const addCategoryFromServiceList = (
    parentNode: CategoryTreeNode,
    candidate: CategoryCandidate
  ) => {
    if (candidate.existing) {
      setExpandedIds((current) => new Set(current).add(parentNode.id));
      setAddingParentId(null);
      return;
    }

    const parentId = parentNode.system ? null : parentNode.id;
    const newNode = buildRegisteredCategorySubtree(services, candidate.path);

    setCategoryTree((current) => addCategoryNode(current, parentId, newNode));
    setExpandedIds((current) => new Set(current).add(parentNode.id));
    setAddingParentId(null);
    setCandidateSearch("");
  };

  const deleteCategory = (nodeId: string) => {
    if (nodeId === CATEGORY_ROOT_ID) {
      return;
    }

    setCategoryTree((current) => removeCategoryNode(current, nodeId));
    setExpandedIds((current) => {
      const next = new Set(current);
      next.delete(nodeId);
      return next;
    });
    if (editingId === nodeId) {
      cancelEditing();
    }
    if (addingParentId === nodeId) {
      setAddingParentId(null);
      setCandidateSearch("");
    }
  };

  return (
    <AdminShell
      description="서비스 카탈로그의 1~4단계 분류를 트리 구조로 편집합니다."
      icon={<Layers3 size={22} />}
      summary={[]}
      title="서비스 분류 관리"
    >
      <section className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
        <div className="flex flex-wrap items-center gap-3 border-b border-slate-100 p-4">
          <div>
            <h2 className="text-base font-black text-slate-950">분류 트리</h2>
            <p className="mt-1 text-xs font-bold text-slate-400">
              서비스 카탈로그 분류를 펼쳐보고 필요한 항목을 바로 편집합니다.
            </p>
          </div>
          <label className="relative ml-auto min-w-[260px] flex-1 md:max-w-[520px]">
            <Search
              size={17}
              className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400"
            />
            <input
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="분류명, 경로 검색..."
              className="h-10 w-full rounded-lg border border-slate-200 bg-slate-50 pl-10 pr-4 text-sm font-semibold text-slate-700 outline-none transition focus:border-[#86b7ff] focus:bg-white focus:ring-4 focus:ring-[#edf5ff]"
            />
          </label>
          <button
            type="button"
            onClick={() => {
              setCategoryTree(initialTree);
              setExpandedIds(createDefaultExpandedIds(initialTree));
              setAddingParentId(null);
              setCandidateSearch("");
              cancelEditing();
            }}
            className="inline-flex h-10 items-center gap-2 rounded-lg border border-slate-200 bg-white px-4 text-sm font-black text-slate-600 transition hover:bg-slate-50"
          >
            초기화
          </button>
        </div>

        <div className="min-w-[720px]">
          <div>
            {visibleCategoryTree.length > 0 ? (
              visibleCategoryTree.map((node) => (
                <CategoryTreeItem
                  key={node.id}
                  addingParentId={addingParentId}
                  candidateSearch={candidateSearch}
                  editingId={editingId}
                  editingName={editingName}
                  expandedIds={expandedIds}
                  forceExpanded={Boolean(search.trim())}
                  getCandidates={(parentNode) =>
                    getRegisteredChildCandidates(services, categoryTree, parentNode)
                  }
                  node={node}
                  onAddCandidate={addCategoryFromServiceList}
                  onCancelAdd={() => {
                    setAddingParentId(null);
                    setCandidateSearch("");
                  }}
                  onCancelEditing={cancelEditing}
                  onChangeCandidateSearch={setCandidateSearch}
                  onChangeEditingName={setEditingName}
                  onDelete={deleteCategory}
                  onOpenAdd={openAddCategoryPicker}
                  onSaveEditing={saveEditing}
                  onStartEditing={startEditing}
                  onToggleExpanded={toggleExpanded}
                />
              ))
            ) : (
              <div className="px-5 py-12 text-center text-sm font-bold text-slate-400">
                조건에 맞는 분류가 없습니다.
              </div>
            )}
          </div>
        </div>
      </section>
      <style>{`
        .chainview-category-row {
          transform-origin: top;
          animation: chainview-category-row-in 220ms cubic-bezier(0.16, 1, 0.3, 1);
        }

        .chainview-category-row button svg {
          transition: transform 220ms cubic-bezier(0.16, 1, 0.3, 1);
        }

        .chainview-category-children {
          display: grid;
          grid-template-rows: 0fr;
          opacity: 0;
          transform: translateY(-8px);
          transition:
            grid-template-rows 280ms cubic-bezier(0.16, 1, 0.3, 1),
            opacity 220ms ease,
            transform 280ms cubic-bezier(0.16, 1, 0.3, 1);
        }

        .chainview-category-children.is-open {
          grid-template-rows: 1fr;
          opacity: 1;
          transform: translateY(0);
        }

        .chainview-category-children-inner {
          min-height: 0;
          overflow: hidden;
        }

        @keyframes chainview-category-row-in {
          from {
            opacity: 0;
            transform: translateY(-8px) scaleY(0.97);
          }
          to {
            opacity: 1;
            transform: translateY(0) scaleY(1);
          }
        }
      `}</style>
    </AdminShell>
  );
}

function CategoryTreeItem({
  addingParentId,
  candidateSearch,
  editingId,
  editingName,
  expandedIds,
  forceExpanded,
  getCandidates,
  node,
  onAddCandidate,
  onCancelAdd,
  onCancelEditing,
  onChangeCandidateSearch,
  onChangeEditingName,
  onDelete,
  onOpenAdd,
  onSaveEditing,
  onStartEditing,
  onToggleExpanded,
}: {
  addingParentId: string | null;
  candidateSearch: string;
  editingId: string | null;
  editingName: string;
  expandedIds: Set<string>;
  forceExpanded: boolean;
  getCandidates: (node: CategoryTreeNode) => CategoryCandidate[];
  node: CategoryTreeNode;
  onAddCandidate: (parentNode: CategoryTreeNode, candidate: CategoryCandidate) => void;
  onCancelAdd: () => void;
  onCancelEditing: () => void;
  onChangeCandidateSearch: (value: string) => void;
  onChangeEditingName: (value: string) => void;
  onDelete: (nodeId: string) => void;
  onOpenAdd: (node: CategoryTreeNode) => void;
  onSaveEditing: () => void;
  onStartEditing: (node: CategoryTreeNode) => void;
  onToggleExpanded: (nodeId: string) => void;
}) {
  const expanded = expandedIds.has(node.id) || forceExpanded;
  const adding = addingParentId === node.id;
  const childrenOpen = expanded || adding;
  const editing = editingId === node.id;
  const depthVisual = getCategoryDepthVisual(node.level);
  const DepthIcon = depthVisual.Icon;
  const editable = !node.system;
  const candidates = adding ? getCandidates(node) : [];
  const normalizedCandidateSearch = candidateSearch.trim().toLowerCase();
  const filteredCandidates = candidates.filter((candidate) =>
    [candidate.name, candidate.path.join(" / ")]
      .join(" ")
      .toLowerCase()
      .includes(normalizedCandidateSearch)
  );

  return (
    <div className="chainview-category-node">
      <div
        className={`chainview-category-row grid grid-cols-[minmax(360px,1fr)_210px] items-center gap-3 border-t border-slate-100 px-5 py-3 transition hover:bg-slate-50/80 ${
          node.children.length ? "cursor-pointer" : ""
        }`}
        onClick={() => {
          if (node.children.length) {
            onToggleExpanded(node.id);
          }
        }}
      >
        <div
          className="flex min-w-0 items-center gap-2"
          style={{ paddingLeft: node.system ? 0 : node.level * 28 }}
        >
          <button
            type="button"
            onClick={(event) => {
              event.stopPropagation();
              onToggleExpanded(node.id);
            }}
            disabled={node.children.length === 0}
            className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-md transition ${
              node.children.length
                ? "text-slate-500 hover:bg-slate-100 hover:text-slate-900"
                : "cursor-default text-transparent"
            }`}
          >
            <ChevronRight
              size={16}
              className={`transition-transform duration-200 ${
                expanded ? "rotate-90" : ""
              }`}
            />
          </button>
          <span
            className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-lg ring-1 ${depthVisual.className}`}
          >
            <DepthIcon size={15} />
          </span>

          {editing ? (
            <input
              value={editingName}
              onClick={(event) => event.stopPropagation()}
              onChange={(event) => onChangeEditingName(event.target.value)}
              onKeyDown={(event) => {
                if (event.key === "Enter") {
                  onSaveEditing();
                }
                if (event.key === "Escape") {
                  onCancelEditing();
                }
              }}
              autoFocus
              className="h-9 min-w-0 flex-1 rounded-lg border border-[#c7dbff] bg-white px-3 text-sm font-black text-slate-900 outline-none ring-4 ring-[#edf5ff]"
            />
          ) : (
            <div className="min-w-0">
              <div className="truncate text-sm font-black text-slate-900">
                {node.name}
              </div>
              <div className="mt-0.5 truncate text-xs font-bold text-slate-400">
                {node.path.join(" / ")}
              </div>
            </div>
          )}
        </div>

        <div
          className="flex flex-nowrap justify-end gap-1.5"
          onClick={(event) => event.stopPropagation()}
        >
          {editing ? (
            <>
              <TableActionButton onClick={onSaveEditing} tone="solid">
                <Save size={14} />
                저장
              </TableActionButton>
              <TableActionButton onClick={onCancelEditing} tone="neutral">
                <X size={14} />
                취소
              </TableActionButton>
            </>
          ) : (
            <>
              <TableActionButton
                onClick={() => onOpenAdd(node)}
                disabled={node.level >= CATEGORY_MAX_LEVEL}
                tone="primary"
              >
                <Plus size={14} />
                하위
              </TableActionButton>
              {editable && (
                <>
                  <TableActionButton
                    onClick={() => onStartEditing(node)}
                    tone="neutral"
                  >
                    <Pencil size={14} />
                    수정
                  </TableActionButton>
                  <TableActionButton
                    onClick={() => onDelete(node.id)}
                    tone="danger"
                  >
                    <Trash2 size={14} />
                    삭제
                  </TableActionButton>
                </>
              )}
            </>
          )}
        </div>
      </div>

      <div
        className={`chainview-category-children ${childrenOpen ? "is-open" : ""}`}
      >
        <div className="chainview-category-children-inner">
          {adding ? (
            <div className="border-t border-dashed border-[#d9e8ff] bg-[#f2f7ff]/30 px-5 py-3">
              <div
                className="space-y-2"
                style={{ paddingLeft: (node.level + 1) * 28 + 34 }}
              >
                <div className="flex flex-wrap items-center gap-2">
                  <div className="relative min-w-[240px] flex-1">
                    <Search
                      size={15}
                      className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
                    />
                    <input
                      value={candidateSearch}
                      onChange={(event) =>
                        onChangeCandidateSearch(event.target.value)
                      }
                      placeholder="등록 서비스 분류에서 불러오기..."
                      className="h-9 w-full rounded-lg border border-[#d9e8ff] bg-white pl-9 pr-3 text-xs font-bold text-slate-700 outline-none transition focus:border-[#86b7ff] focus:ring-4 focus:ring-[#edf5ff]"
                    />
                  </div>
                  <button
                    type="button"
                    onClick={onCancelAdd}
                    className="h-9 rounded-lg border border-slate-200 bg-white px-3 text-xs font-black text-slate-500 transition hover:bg-slate-50"
                  >
                    닫기
                  </button>
                </div>

                <div className="flex flex-wrap gap-2">
                  {filteredCandidates.length > 0 ? (
                    filteredCandidates.map((candidate) => (
                      <button
                        key={candidate.path.join(" > ")}
                        type="button"
                        onClick={() => onAddCandidate(node, candidate)}
                        disabled={candidate.existing}
                        className={`inline-flex items-center gap-2 rounded-full border px-3 py-1.5 text-xs font-black transition ${
                          candidate.existing
                            ? "cursor-not-allowed border-slate-200 bg-white text-slate-300"
                            : "border-[#c7dbff] bg-white text-[#1f6feb] hover:border-[#a9c8ff] hover:bg-[#f2f7ff]"
                        }`}
                      >
                        <span>{candidate.name}</span>
                        <span className="text-slate-400">
                          {candidate.serviceCount}개 서비스
                        </span>
                        <span>
                          {candidate.existing ? "표시 중" : "불러오기"}
                        </span>
                      </button>
                    ))
                  ) : (
                    <div className="rounded-lg border border-dashed border-slate-200 bg-white px-3 py-2 text-xs font-bold text-slate-400">
                      등록된 서비스에서 불러올 하위 분류가 없습니다.
                    </div>
                  )}
                </div>
              </div>
            </div>
          ) : null}

          {node.children.map((child) => (
            <CategoryTreeItem
              key={child.id}
              addingParentId={addingParentId}
              candidateSearch={candidateSearch}
              editingId={editingId}
              editingName={editingName}
              expandedIds={expandedIds}
              forceExpanded={forceExpanded}
              getCandidates={getCandidates}
              node={child}
              onAddCandidate={onAddCandidate}
              onCancelAdd={onCancelAdd}
              onCancelEditing={onCancelEditing}
              onChangeCandidateSearch={onChangeCandidateSearch}
              onChangeEditingName={onChangeEditingName}
              onDelete={onDelete}
              onOpenAdd={onOpenAdd}
              onSaveEditing={onSaveEditing}
              onStartEditing={onStartEditing}
              onToggleExpanded={onToggleExpanded}
            />
          ))}
        </div>
      </div>
    </div>
  );
}

export function TechStackPage() {
  const { services, techStacks } = usePortalData();
  const [search, setSearch] = useState("");
  const serviceById = useMemo(
    () => new Map(services.map((service) => [service.serviceId, service])),
    [services]
  );
  const rows = techStacks.filter((row) =>
    includesKeyword(
      [
        row.techTypeName,
        row.techName,
        row.versionText,
        row.vendorName,
        serviceName(serviceById.get(row.serviceId)),
      ],
      search
    )
  );

  return (
    <AdminShell
      description="서비스별 기술 스택과 버전 정보를 관리합니다."
      icon={<Code2 size={22} />}
      summary={[
        { label: "등록 스택", value: techStacks.length, tone: "indigo" },
        { label: "연결 서비스", value: new Set(techStacks.map((row) => row.serviceId)).size },
        { label: "벤더", value: new Set(techStacks.map((row) => row.vendorName)).size },
        {
          label: "미등록 서비스",
          value: services.filter(
            (service) => !techStacks.some((stack) => stack.serviceId === service.serviceId)
          ).length,
          tone: "amber",
        },
      ]}
      title="기술스택 마스터"
    >
      <DataPanel
        columns={[
          { key: "service", label: "서비스", render: (row) => <ServiceCell service={serviceById.get(row.serviceId)} /> },
          { key: "type", label: "기술 유형", render: (row) => row.techTypeName },
          { key: "name", label: "기술명", render: (row) => <b>{row.techName}</b> },
          { key: "version", label: "버전", render: (row) => row.versionText },
          { key: "vendor", label: "벤더", render: (row) => row.vendorName },
          { key: "actions", label: "액션", align: "right", render: () => <ActionButtons /> },
        ]}
        empty="조건에 맞는 기술스택이 없습니다."
        getKey={(row) => row.techStackId}
        placeholder="서비스, 기술명, 버전, 벤더 검색..."
        rows={rows}
        search={search}
        setSearch={setSearch}
        title="기술스택 목록"
      />
    </AdminShell>
  );
}

export function DeploymentsPage() {
  const { services, servers } = usePortalData();
  const [search, setSearch] = useState("");
  const serverById = useMemo(
    () => new Map(servers.map((server) => [server.serverId, server])),
    [servers]
  );
  const rows = services.filter((service) => {
    const server = serverById.get(service.serverId);
    return includesKeyword(
      [
        service.serviceName,
        service.serviceCode,
        service.portInfo,
        server?.serverName,
        server?.ipAddress,
      ],
      search
    );
  });

  return (
    <AdminShell
      description="서비스가 배포된 서버, 포트, 인스턴스 상태를 확인합니다."
      icon={<Database size={22} />}
      summary={[
        { label: "배포 서비스", value: services.length, tone: "indigo" },
        {
          label: "기동",
          value: services.filter((item) => item.deploymentStatusCode === "RUNNING").length,
          tone: "emerald",
        },
        {
          label: "점검",
          value: services.filter((item) => item.deploymentStatusCode === "MAINTENANCE").length,
          tone: "amber",
        },
        {
          label: "중지",
          value: services.filter((item) => item.deploymentStatusCode === "STOPPED").length,
          tone: "red",
        },
      ]}
      title="배포 정보"
    >
      <DataPanel
        columns={[
          { key: "service", label: "서비스", render: (row) => <ServiceCell service={row} /> },
          {
            key: "server",
            label: "서버",
            render: (row) => {
              const server = serverById.get(row.serverId);
              return server ? (
                <div>
                  <b>{server.serverName}</b>
                  <div className="mt-1 text-xs text-slate-400">{server.ipAddress}</div>
                </div>
              ) : (
                "-"
              );
            },
          },
          { key: "port", label: "포트", align: "right", render: (row) => row.portInfo || "-" },
          { key: "instance", label: "인스턴스", align: "right", render: (row) => row.instanceCount },
          {
            key: "status",
            label: "상태",
            align: "center",
            render: (row) => (
              <Badge
                tone={row.deploymentStatusCode === "RUNNING" ? "emerald" : "amber"}
              >
                {row.deploymentStatusCode
                  ? codeLabels.deploymentStatus[row.deploymentStatusCode]
                  : "미지정"}
              </Badge>
            ),
          },
          { key: "actions", label: "액션", align: "right", render: () => <ActionButtons /> },
        ]}
        empty="조건에 맞는 배포 정보가 없습니다."
        getKey={(row) => row.serviceId}
        placeholder="서비스, 서버, IP, 포트 검색..."
        rows={rows}
        search={search}
        setSearch={setSearch}
        title="배포 목록"
      />
    </AdminShell>
  );
}

export function UsersPage() {
  const { owners } = usePortalData();
  const [search, setSearch] = useState("");
  const baseUsers = [
    { id: "EMP001", name: "김철수", org: "개발본부", team: "결제팀", role: "백엔드 개발자", email: "kim@example.com", active: true },
    { id: "EMP002", name: "이영희", org: "개발본부", team: "인증팀", role: "시니어 개발자", email: "lee@example.com", active: true },
    { id: "EMP003", name: "박민수", org: "인프라본부", team: "운영팀", role: "시스템 엔지니어", email: "park@example.com", active: true },
    { id: "EMP004", name: "정수현", org: "개발본부", team: "프론트엔드팀", role: "프론트엔드 개발자", email: "jung@example.com", active: false },
    { id: "EMP005", name: "최지훈", org: "보안본부", team: "보안팀", role: "보안 담당자", email: "choi@example.com", active: true },
  ];
  const rows = baseUsers.filter((row) =>
    includesKeyword([row.id, row.name, row.org, row.team, row.role, row.email], search)
  );

  return (
    <AdminShell
      description="서비스 운영 담당자를 관리합니다."
      icon={<Users size={22} />}
      summary={[
        { label: "사용자", value: baseUsers.length, tone: "indigo" },
        { label: "활성", value: baseUsers.filter((row) => row.active).length, tone: "emerald" },
        { label: "비활성", value: baseUsers.filter((row) => !row.active).length, tone: "slate" },
        { label: "담당 매핑", value: owners.length, tone: "amber" },
      ]}
      title="사용자 관리"
    >
      <DataPanel
        columns={[
          { key: "id", label: "사번", render: (row) => <b>{row.id}</b> },
          { key: "name", label: "이름", render: (row) => row.name },
          { key: "org", label: "조직", render: (row) => row.org },
          { key: "team", label: "부서", render: (row) => row.team },
          { key: "role", label: "역할", render: (row) => <Badge>{row.role}</Badge> },
          { key: "email", label: "이메일", render: (row) => row.email },
          { key: "active", label: "상태", render: (row) => <Badge tone={row.active ? "emerald" : "slate"}>{row.active ? "활성" : "비활성"}</Badge> },
          { key: "actions", label: "액션", align: "right", render: () => <ActionButtons /> },
        ]}
        empty="조건에 맞는 사용자가 없습니다."
        getKey={(row) => row.id}
        placeholder="사번, 이름, 조직, 이메일 검색..."
        rows={rows}
        search={search}
        setSearch={setSearch}
        title="사용자 목록"
      />
    </AdminShell>
  );
}

export function GroupsPage() {
  const { owners, services } = usePortalData();
  const [search, setSearch] = useState("");
  const groups = useMemo(() => {
    const names = new Set([
      ...owners.map((owner) => owner.ownerName),
      ...services.map((service) => `${service.categoryPath[0]} 운영그룹`),
    ]);
    return Array.from(names).map((name, index) => ({
      id: `GRP-${String(index + 1).padStart(3, "0")}`,
      name,
      org: index % 2 === 0 ? "서비스운영본부" : "플랫폼운영본부",
      memberCount: 5 + (index % 8),
      serviceCount: owners.filter((owner) => owner.ownerName === name).length,
      active: index % 5 !== 0,
    }));
  }, [owners, services]);
  const rows = groups.filter((row) =>
    includesKeyword([row.id, row.name, row.org], search)
  );

  return (
    <AdminShell
      description="담당 그룹과 서비스 소유권 단위를 관리합니다."
      icon={<Boxes size={22} />}
      summary={[
        { label: "그룹", value: groups.length, tone: "indigo" },
        { label: "활성", value: groups.filter((row) => row.active).length, tone: "emerald" },
        { label: "비활성", value: groups.filter((row) => !row.active).length, tone: "slate" },
        { label: "매핑 서비스", value: owners.length, tone: "amber" },
      ]}
      title="그룹 관리"
    >
      <DataPanel
        columns={[
          { key: "id", label: "그룹 코드", render: (row) => <b>{row.id}</b> },
          { key: "name", label: "그룹명", render: (row) => row.name },
          { key: "org", label: "조직", render: (row) => row.org },
          { key: "members", label: "구성원", render: (row) => `${row.memberCount}명` },
          { key: "services", label: "담당 서비스", render: (row) => `${row.serviceCount}개` },
          { key: "active", label: "상태", render: (row) => <Badge tone={row.active ? "emerald" : "slate"}>{row.active ? "활성" : "비활성"}</Badge> },
          { key: "actions", label: "액션", align: "right", render: () => <ActionButtons /> },
        ]}
        empty="조건에 맞는 그룹이 없습니다."
        getKey={(row) => row.id}
        placeholder="그룹 코드, 그룹명, 조직 검색..."
        rows={rows}
        search={search}
        setSearch={setSearch}
        title="그룹 목록"
      />
    </AdminShell>
  );
}

export function ServiceOwnersPage() {
  const { owners, services } = usePortalData();
  const [search, setSearch] = useState("");
  const serviceById = useMemo(
    () => new Map(services.map((service) => [service.serviceId, service])),
    [services]
  );
  const rows = owners.filter((owner) => {
    const service = serviceById.get(owner.serviceId);
    return includesKeyword(
      [
        owner.ownerName,
        owner.ownerTypeCode,
        owner.responsibilityCode,
        service?.serviceName,
        service?.serviceCode,
      ],
      search
    );
  });

  return (
    <AdminShell
      description="서비스별 담당자와 알림 대상자를 관리합니다."
      icon={<ShieldCheck size={22} />}
      summary={[
        { label: "담당 매핑", value: owners.length, tone: "indigo" },
        { label: "정 담당", value: owners.filter((row) => row.responsibilityCode === "MAIN").length, tone: "emerald" },
        { label: "부 담당", value: owners.filter((row) => row.responsibilityCode === "SUB").length },
        { label: "알림 대상", value: owners.filter((row) => row.responsibilityCode === "ALERT").length, tone: "amber" },
      ]}
      title="서비스 담당자"
    >
      <DataPanel
        columns={[
          { key: "service", label: "서비스", render: (row) => <ServiceCell service={serviceById.get(row.serviceId)} /> },
          { key: "owner", label: "담당", render: (row) => <b>{row.ownerName}</b> },
          { key: "type", label: "유형", render: (row) => codeLabels.ownerType[row.ownerTypeCode] },
          { key: "responsibility", label: "책임", render: (row) => <Badge tone={row.responsibilityCode === "MAIN" ? "emerald" : "slate"}>{codeLabels.responsibilityType[row.responsibilityCode]}</Badge> },
          { key: "actions", label: "액션", align: "right", render: () => <ActionButtons /> },
        ]}
        empty="조건에 맞는 담당 매핑이 없습니다."
        getKey={(row) => row.serviceOwnerId}
        placeholder="서비스, 담당자, 책임 유형 검색..."
        rows={rows}
        search={search}
        setSearch={setSearch}
        title="담당 매핑 목록"
      />
    </AdminShell>
  );
}

export function CommonCodesPage() {
  const [search, setSearch] = useState("");
  const rows = Object.entries(codeLabels).flatMap(([group, items]) =>
    Object.entries(items).map(([code, label]) => ({
      id: `${group}-${code}`,
      group,
      code,
      label,
      active: true,
    }))
  );
  const filteredRows = rows.filter((row) =>
    includesKeyword([row.group, row.code, row.label], search)
  );

  return (
    <AdminShell
      description="시스템 전반에서 사용하는 공통 코드를 확인합니다."
      icon={<CheckCircle2 size={22} />}
      summary={[
        { label: "코드 그룹", value: Object.keys(codeLabels).length, tone: "indigo" },
        { label: "코드 항목", value: rows.length },
        { label: "활성", value: rows.filter((row) => row.active).length, tone: "emerald" },
        { label: "비활성", value: 0, tone: "slate" },
      ]}
      title="공통코드 관리"
    >
      <DataPanel
        columns={[
          { key: "group", label: "코드 그룹", render: (row) => <b>{row.group}</b> },
          { key: "code", label: "코드", render: (row) => <code>{row.code}</code> },
          { key: "label", label: "표시명", render: (row) => row.label },
          { key: "active", label: "상태", render: (row) => <Badge tone={row.active ? "emerald" : "slate"}>{row.active ? "활성" : "비활성"}</Badge> },
          { key: "actions", label: "액션", align: "right", render: () => <ActionButtons /> },
        ]}
        empty="조건에 맞는 공통코드가 없습니다."
        getKey={(row) => row.id}
        placeholder="코드 그룹, 코드, 표시명 검색..."
        rows={filteredRows}
        search={search}
        setSearch={setSearch}
        title="공통코드 목록"
      />
    </AdminShell>
  );
}

function ServiceCell({ service }: { service?: ServiceRecord }) {
  if (!service) {
    return <span className="text-slate-400">-</span>;
  }

  return (
    <div className="min-w-0">
      <div className="truncate font-black text-slate-900">{service.serviceName}</div>
      <div className="mt-1 truncate text-xs font-black text-slate-400">
        {service.serviceCode}
      </div>
    </div>
  );
}
