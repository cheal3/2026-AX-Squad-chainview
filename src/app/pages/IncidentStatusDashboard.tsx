import { useEffect, useMemo, useRef, useState } from "react";
import { Siren, TrendingUp } from "lucide-react";
import {
  Area,
  AreaChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { usePortalData } from "../PortalDataStore";
import { PageHeader } from "../components/PageHeader";
import {
  codeLabels,
  type IncidentRecord,
  type ServiceRelationRecord,
  type ServiceRecord,
} from "../mockData";

const hourlyIncidentData = [
  { time: "09:00", count: 2, degraded: 1, down: 1 },
  { time: "10:00", count: 4, degraded: 3, down: 1 },
  { time: "11:00", count: 7, degraded: 4, down: 3 },
  { time: "12:00", count: 9, degraded: 6, down: 3 },
  { time: "13:00", count: 13, degraded: 8, down: 5 },
  { time: "14:00", count: 18, degraded: 11, down: 7 },
  { time: "15:00", count: 24, degraded: 15, down: 9 },
  { time: "16:00", count: 29, degraded: 18, down: 11 },
];

const INCIDENT_IMPACT_DEPTH = 1;

type IncidentImpactSummary = {
  service: ServiceRecord;
  analysis: ImpactAnalysis;
};

export function IncidentStatusDashboard() {
  const { services, incidents, relations, owners } = usePortalData();
  const [timeStep, setTimeStep] = useState(1);
  const incidentServices = useMemo(
    () =>
      services.filter(
        (service) =>
          service.statusCode === "INCIDENT" ||
          service.statusCode === "IMPACTED" ||
          service.statusCode === "MAINTENANCE" ||
          service.statusCode === "INACTIVE"
      ),
    [services]
  );
  const [selectedImpactServiceId, setSelectedImpactServiceId] = useState<
    number | null
  >(incidentServices[0]?.serviceId ?? null);
  const serviceById = useMemo(
    () => new Map(services.map((service) => [service.serviceId, service])),
    [services]
  );
  const ownerByServiceId = useMemo(
    () =>
      new Map(
        owners.map((owner) => [owner.serviceId, owner.ownerName])
      ),
    [owners]
  );
  const activeRelations = useMemo(
    () =>
      relations.filter(
        (relation) =>
          relation.relationStatusCode === "ACTIVE" &&
          relation.sourceServiceId !== relation.targetServiceId
      ),
    [relations]
  );
  const incidentImpactSummaries = useMemo<IncidentImpactSummary[]>(
    () =>
      incidentServices
        .map((service) => ({
          service,
          analysis: buildImpactAnalysis(
            service.serviceId,
            serviceById,
            activeRelations,
            ownerByServiceId,
            INCIDENT_IMPACT_DEPTH
          ),
        }))
        .sort((first, second) => {
          const criticalDelta =
            second.analysis.criticalCount - first.analysis.criticalCount;
          if (criticalDelta !== 0) {
            return criticalDelta;
          }

          const impactDelta =
            second.analysis.items.length - first.analysis.items.length;
          if (impactDelta !== 0) {
            return impactDelta;
          }

          return (
            getStatusRiskRank(second.service.statusCode) -
            getStatusRiskRank(first.service.statusCode)
          );
        }),
    [activeRelations, incidentServices, ownerByServiceId, serviceById]
  );
  const downCount = services.filter(
    (service) =>
      service.statusCode === "INCIDENT" || service.statusCode === "INACTIVE"
  ).length;
  const degradedCount = services.filter(
    (service) =>
      service.statusCode === "IMPACTED" || service.statusCode === "MAINTENANCE"
  ).length;
  const latestCount = hourlyIncidentData[hourlyIncidentData.length - 1].count;
  const previousCount = hourlyIncidentData[hourlyIncidentData.length - 2].count;
  const growth = latestCount - previousCount;
  const topIncidentServices = incidentImpactSummaries
    .slice(0, 10)
    .map((summary) => summary.service);
  const chartData = useMemo(
    () =>
      hourlyIncidentData.filter(
        (_, index) =>
          index % timeStep === 0 || index === hourlyIncidentData.length - 1
      ),
    [timeStep]
  );

  useEffect(() => {
    if (
      selectedImpactServiceId !== null &&
      serviceById.has(selectedImpactServiceId)
    ) {
      return;
    }

    setSelectedImpactServiceId(
      incidentImpactSummaries[0]?.service.serviceId ?? null
    );
  }, [incidentImpactSummaries, selectedImpactServiceId, serviceById]);

  return (
    <div className="mx-auto flex w-full max-w-[1600px] flex-col gap-5">
      <PageHeader
        description="시간별 장애 증가 추이와 현재 장애 서비스의 누적 상태를 확인합니다."
        icon={<Siren size={22} />}
        title="장애 현황 대시보드"
        actions={
          <div className="rounded-lg border border-red-100 bg-red-50 px-4 py-2 text-sm font-black text-red-700">
            최근 1시간 +{growth}개 서비스 영향
          </div>
        }
      />

      <section className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
        <div className="mb-4 flex flex-col gap-3 xl:flex-row xl:items-center xl:justify-between">
          <div>
            <h3 className="text-lg font-semibold text-slate-950">
              시간별 장애 서비스 수
            </h3>
            <p className="mt-1 text-sm text-slate-500">
              누적 장애 서비스와 중단/성능저하 구간을 함께 표시합니다.
            </p>
          </div>
          <div className="flex items-center gap-3">
            <div className="inline-flex rounded-lg border border-slate-200 bg-slate-50 p-1">
              {[1, 2, 3].map((step) => (
                <button
                  key={step}
                  onClick={() => setTimeStep(step)}
                  className={`rounded-md px-3 py-1.5 text-xs font-semibold transition ${
                    timeStep === step
                      ? "bg-white text-blue-600 shadow-sm"
                      : "text-slate-500 hover:text-slate-900"
                  }`}
                >
                  {step}시간
                </button>
              ))}
            </div>
            <TrendingUp size={20} className="text-slate-400" />
          </div>
        </div>
        <div className="h-[260px]">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={chartData} margin={{ left: 0, right: 12, top: 8 }}>
              <defs>
                <linearGradient id="incidentCount" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#ef4444" stopOpacity={0.28} />
                  <stop offset="95%" stopColor="#ef4444" stopOpacity={0.02} />
                </linearGradient>
              </defs>
              <CartesianGrid stroke="#e2e8f0" strokeDasharray="4 4" vertical={false} />
              <XAxis dataKey="time" interval={0} tickLine={false} axisLine={false} tick={{ fill: "#64748b", fontSize: 12 }} />
              <YAxis tickLine={false} axisLine={false} tick={{ fill: "#64748b", fontSize: 12 }} />
              <Tooltip
                contentStyle={{
                  border: "1px solid #e2e8f0",
                  borderRadius: 10,
                  boxShadow: "0 14px 30px rgba(15, 23, 42, 0.12)",
                }}
              />
              <Area
                type="monotone"
                dataKey="count"
                name="전체 영향"
                stroke="#ef4444"
                strokeWidth={3}
                fill="url(#incidentCount)"
                activeDot={{ r: 6 }}
              />
              <Area
                type="monotone"
                dataKey="down"
                name="중단"
                stroke="#991b1b"
                strokeWidth={2}
                fill="transparent"
              />
              <Area
                type="monotone"
                dataKey="degraded"
                name="성능저하"
                stroke="#f59e0b"
                strokeWidth={2}
                fill="transparent"
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </section>

      <section>
        <div className="rounded-xl border border-slate-200 bg-white shadow-sm">
          <div className="flex flex-col gap-3 border-b border-slate-200 px-6 py-4 xl:flex-row xl:items-center xl:justify-between">
            <div>
              <h3 className="text-lg font-semibold text-slate-950">
                장애 서비스 클라우드
              </h3>
              <p className="mt-1 text-sm text-slate-500">
                장애 경과 시간에 따라 크기와 테두리 색상을 표시합니다.
              </p>
            </div>
            <div className="flex w-full flex-col gap-3 xl:w-[520px]">
              <label className="grid gap-1 text-xs font-bold text-slate-500">
                분석 기준 서비스
                <select
                  value={selectedImpactServiceId ?? ""}
                  onChange={(event) =>
                    setSelectedImpactServiceId(Number(event.target.value))
                  }
                  className="h-10 rounded-lg border border-slate-200 bg-white px-3 text-sm font-semibold text-slate-800 outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
                >
                  {incidentImpactSummaries.map(({ service, analysis }) => (
                    <option key={service.serviceId} value={service.serviceId}>
                      {service.serviceName} · 영향 {analysis.items.length}개
                    </option>
                  ))}
                </select>
              </label>
              <div className="grid grid-cols-3 overflow-hidden rounded-lg border border-slate-200 bg-slate-50 text-center">
                <div className="px-3 py-2">
                  <div className="text-[11px] font-medium text-slate-500">
                    표시
                  </div>
                  <div className="mt-0.5 text-sm font-bold text-slate-950">
                    {topIncidentServices.length}
                  </div>
                </div>
                <div className="border-x border-slate-200 px-3 py-2">
                  <div className="text-[11px] font-medium text-slate-500">
                    장애
                  </div>
                  <div className="mt-0.5 text-sm font-bold text-red-600">
                    {downCount}
                  </div>
                </div>
                <div className="px-3 py-2">
                  <div className="text-[11px] font-medium text-slate-500">
                    저하
                  </div>
                  <div className="mt-0.5 text-sm font-bold text-amber-600">
                    {degradedCount}
                  </div>
                </div>
              </div>
            </div>
          </div>
          <PhysicsIncidentCloud
            services={topIncidentServices}
            incidents={incidents}
            selectedServiceId={selectedImpactServiceId}
          />
        </div>
      </section>

      <section className="rounded-xl border border-slate-200 bg-white shadow-sm">
        <div className="border-b border-slate-200 px-6 py-4">
          <h3 className="font-semibold text-slate-950">장애 서비스 목록</h3>
        </div>
        <div className="divide-y divide-slate-200">
          {incidentImpactSummaries.slice(0, 6).map(({ service, analysis }) => {
            const impactedCount = analysis.items.length;
            const selected = service.serviceId === selectedImpactServiceId;

            return (
              <div
                key={service.serviceId}
                className={`grid w-full grid-cols-1 gap-3 px-6 py-4 text-left md:grid-cols-[minmax(260px,1fr)_140px_120px_120px] ${
                  selected ? "bg-blue-50/70" : ""
                }`}
              >
                <div>
                  <div className="font-semibold text-slate-950">
                    {service.serviceName}
                  </div>
                  <div className="mt-1 text-sm text-slate-500">
                    {service.categoryPath.join(" / ")}
                  </div>
                </div>
                <StatusBadge status={codeLabels.serviceStatus[service.statusCode]} critical={service.statusCode === "INCIDENT" || service.statusCode === "INACTIVE"} />
                <div className="text-sm text-slate-600">
                  {codeLabels.importance[service.importanceCode ?? "NORMAL"]}
                </div>
                <div className="text-sm font-semibold text-slate-950">
                  영향 {impactedCount}개
                </div>
              </div>
            );
          })}
        </div>
      </section>

      <style>{`
        .incident-physics-field {
          position: relative;
          height: 620px;
          margin: 18px;
          overflow: hidden;
          border-radius: 24px;
          background: #fbfcfe;
        }

        .incident-ball {
          position: absolute;
          z-index: 2;
          display: flex;
          align-items: center;
          justify-content: center;
          border-radius: 999px;
          color: #334155;
          font-size: 11px;
          font-weight: 700;
          line-height: 1.2;
          padding: 14px;
          text-align: center;
          will-change: transform;
          transition: border-color 0.3s ease, box-shadow 0.3s ease;
        }

        .incident-ball:hover {
          z-index: 999 !important;
        }

        .incident-ball-active {
          outline: 3px solid rgba(37, 99, 235, 0.34);
          outline-offset: 4px;
        }

        .incident-ball span {
          display: -webkit-box;
          overflow: hidden;
          -webkit-box-orient: vertical;
          -webkit-line-clamp: 3;
          text-shadow: 0 1px 0 rgba(255, 255, 255, 0.42);
          word-break: keep-all;
        }

        .incident-ball-detail {
          position: absolute;
          left: 50%;
          bottom: calc(100% + 10px);
          min-width: 180px;
          transform: translateX(-50%) translateY(4px);
          border: 1px solid rgba(226, 232, 240, 0.95);
          border-radius: 10px;
          background: rgba(255, 255, 255, 0.96);
          box-shadow: 0 16px 32px rgba(15, 23, 42, 0.14);
          color: #334155;
          opacity: 0;
          padding: 10px 12px;
          pointer-events: none;
          text-align: left;
          transition: opacity 0.16s ease, transform 0.16s ease;
        }

        .incident-ball:hover .incident-ball-detail {
          opacity: 1;
          transform: translateX(-50%) translateY(0);
        }

        .incident-ball-detail-title {
          font-size: 12px;
          font-weight: 800;
          color: #0f172a;
        }

        .incident-ball-detail-row {
          margin-top: 5px;
          font-size: 11px;
          font-weight: 600;
          color: #64748b;
        }
      `}</style>
    </div>
  );
}

type ImpactItem = {
  service: ServiceRecord;
  depth: number;
  pathIds: number[];
  pathCodes: string[];
  relations: ServiceRelationRecord[];
};

type ImpactAnalysis = {
  items: ImpactItem[];
  byDepth: Array<{ depth: number; items: ImpactItem[] }>;
  criticalCount: number;
  ownerGroups: string[];
  upstreamCount: number;
};

function buildImpactAnalysis(
  rootServiceId: number,
  serviceById: Map<number, ServiceRecord>,
  relations: ServiceRelationRecord[],
  ownerByServiceId: Map<number, string>,
  maxDepth: number
): ImpactAnalysis {
  const outgoingBySource = new Map<number, ServiceRelationRecord[]>();
  relations.forEach((relation) => {
    const list = outgoingBySource.get(relation.sourceServiceId) ?? [];
    list.push(relation);
    outgoingBySource.set(relation.sourceServiceId, list);
  });

  const items: ImpactItem[] = [];
  const visitedDepth = new Map<number, number>([[rootServiceId, 0]]);
  const queue: Array<{
    depth: number;
    pathIds: number[];
    relations: ServiceRelationRecord[];
    serviceId: number;
  }> = [{ serviceId: rootServiceId, depth: 0, pathIds: [rootServiceId], relations: [] }];

  while (queue.length > 0) {
    const current = queue.shift();
    if (!current || current.depth >= maxDepth) {
      continue;
    }

    const outgoing = outgoingBySource.get(current.serviceId) ?? [];
    outgoing.forEach((relation) => {
      const nextServiceId = relation.targetServiceId;
      const nextDepth = current.depth + 1;

      if (current.pathIds.includes(nextServiceId)) {
        return;
      }

      const previousDepth = visitedDepth.get(nextServiceId);
      if (previousDepth !== undefined && previousDepth <= nextDepth) {
        return;
      }

      const service = serviceById.get(nextServiceId);
      if (!service) {
        return;
      }

      const nextPathIds = [...current.pathIds, nextServiceId];
      const nextRelations = [...current.relations, relation];
      visitedDepth.set(nextServiceId, nextDepth);
      items.push({
        service,
        depth: nextDepth,
        pathIds: nextPathIds,
        pathCodes: nextPathIds.map(
          (serviceId) => serviceById.get(serviceId)?.serviceCode ?? String(serviceId)
        ),
        relations: nextRelations,
      });
      queue.push({
        serviceId: nextServiceId,
        depth: nextDepth,
        pathIds: nextPathIds,
        relations: nextRelations,
      });
    });
  }

  const byDepth = [1, 2, 3].map((depth) => ({
    depth,
    items: items.filter((item) => item.depth === depth),
  }));
  const criticalCount = items.filter(
    (item) =>
      item.service.statusCode === "INCIDENT" ||
      item.service.statusCode === "INACTIVE" ||
      item.service.importanceCode === "CRITICAL" ||
      item.service.importanceCode === "HIGH"
  ).length;
  const upstreamCount = relations.filter(
    (relation) => relation.targetServiceId === rootServiceId
  ).length;
  const ownerGroups = Array.from(
    new Set(
      items
        .map((item) => ownerByServiceId.get(item.service.serviceId))
        .filter((owner): owner is string => Boolean(owner))
    )
  ).sort((first, second) => first.localeCompare(second, "ko"));

  return {
    items,
    byDepth,
    criticalCount,
    ownerGroups,
    upstreamCount,
  };
}

function getStatusRiskRank(statusCode: ServiceRecord["statusCode"]) {
  if (statusCode === "INCIDENT" || statusCode === "INACTIVE") {
    return 3;
  }
  if (statusCode === "IMPACTED" || statusCode === "MAINTENANCE") {
    return 2;
  }
  return 1;
}

type PhysicsBall = {
  id: number;
  label: string;
  x: number;
  y: number;
  vx: number;
  vy: number;
  radius: number;
  ageMinutes: number;
  startedAtLabel: string;
  statusLabel: string;
  spawnDelay: number;
  active: boolean;
  color: ReturnType<typeof getIncidentBallColor>;
};

function PhysicsIncidentCloud({
  services,
  incidents,
  selectedServiceId,
}: {
  services: ServiceRecord[];
  incidents: IncidentRecord[];
  selectedServiceId: number | null;
}) {
  const fieldRef = useRef<HTMLDivElement | null>(null);
  const ballsRef = useRef<PhysicsBall[]>([]);
  const animationRef = useRef<number | null>(null);
  const startTimeRef = useRef(0);
  const [balls, setBalls] = useState<PhysicsBall[]>([]);

  const cloudSeeds = useMemo(
    () =>
      services
        .map((service, index) => {
          const incident = incidents.find(
            (item) => item.serviceId === service.serviceId
          );
          const ageMinutes = getIncidentAgeMinutes(incident?.startedAt, index);
          const ageRatio = Math.min(1, ageMinutes / 360);
          const sizeVariant = getServiceSizeVariant(service.serviceId, index);

          return {
            id: service.serviceId,
            label: service.serviceName,
            ageMinutes,
            startedAtLabel: incident?.startedAt ?? getFallbackStartedAt(index),
            statusLabel: codeLabels.serviceStatus[service.statusCode],
            radius: 34 + sizeVariant + ageRatio * 20,
            color: getIncidentBallColor(ageMinutes),
          };
        })
        .sort((a, b) => b.ageMinutes - a.ageMinutes),
    [incidents, services]
  );

  useEffect(() => {
    const field = fieldRef.current;
    if (!field) {
      return;
    }

    const initialize = () => {
      const { width, height } = field.getBoundingClientRect();
      const usableWidth = Math.max(160, width - 80);

      startTimeRef.current = performance.now();
      ballsRef.current = cloudSeeds.map((seed, index) => {
        const columnRatio =
          ((index * 0.61803398875) % 1) * 0.82 + 0.09;

        return {
          ...seed,
          x: 40 + usableWidth * columnRatio,
          y: -seed.radius - index * 18,
          vx: Math.sin(index * 1.7) * 0.24,
          vy: 0,
          spawnDelay: index * 460,
          active: false,
        };
      });
      setBalls([...ballsRef.current]);
    };

    initialize();
    const resizeObserver = new ResizeObserver(initialize);
    resizeObserver.observe(field);

    return () => resizeObserver.disconnect();
  }, [cloudSeeds]);

  useEffect(() => {
    const tick = () => {
      const field = fieldRef.current;

      if (!field) {
        animationRef.current = window.requestAnimationFrame(tick);
        return;
      }

      const { width, height } = field.getBoundingClientRect();
      const currentBalls = ballsRef.current;
      const elapsed = performance.now() - startTimeRef.current;

      currentBalls.forEach((ball, index) => {
        if (elapsed < ball.spawnDelay) {
          return;
        }

        if (!ball.active) {
          ball.active = true;
          ball.y = -ball.radius - 12;
          ball.vx = Math.sin(index * 1.7) * 0.32;
          ball.vy = 0.32;
        }

        const agePower = Math.min(1, ball.ageMinutes / 360);
        const time = Date.now();
        const sideDrift =
          Math.sin(time / (1700 + index * 137) + index) *
          (0.005 + agePower * 0.002);

        ball.vx += sideDrift;
        ball.vy += 0.105;
      });

      for (let pass = 0; pass < 3; pass += 1) {
        for (let i = 0; i < currentBalls.length; i += 1) {
          for (let j = i + 1; j < currentBalls.length; j += 1) {
            const a = currentBalls[i];
            const b = currentBalls[j];

            if (!a.active || !b.active) {
              continue;
            }

            const dx = b.x - a.x;
            const dy = b.y - a.y;
            const distance = Math.max(0.001, Math.hypot(dx, dy));
            const minDistance = a.radius + b.radius + 8;

            if (distance < minDistance) {
              const overlap = minDistance - distance;
              const nx = dx / distance;
              const ny = dy / distance;
              const aMass = a.radius * a.radius;
              const bMass = b.radius * b.radius;
              const totalMass = aMass + bMass;
              const aMove = overlap * (bMass / totalMass);
              const bMove = overlap * (aMass / totalMass);
              const relativeVx = b.vx - a.vx;
              const relativeVy = b.vy - a.vy;
              const separatingSpeed = relativeVx * nx + relativeVy * ny;
              const bounce = separatingSpeed < 0 ? -separatingSpeed * 0.28 : 0.08;

              a.x -= nx * aMove;
              a.y -= ny * aMove;
              b.x += nx * bMove;
              b.y += ny * bMove;
              a.vx -= nx * bounce;
              a.vy -= ny * bounce;
              b.vx += nx * bounce;
              b.vy += ny * bounce;
            }
          }
        }
      }

      currentBalls.forEach((ball) => {
        if (!ball.active) {
          return;
        }

        ball.vx *= 0.988;
        ball.vy *= 0.992;
        const speed = Math.hypot(ball.vx, ball.vy);
        const maxSpeed = 1.65;
        if (speed > maxSpeed) {
          ball.vx = (ball.vx / speed) * maxSpeed;
          ball.vy = (ball.vy / speed) * maxSpeed;
        }
        ball.x += ball.vx;
        ball.y += ball.vy;

        if (ball.x - ball.radius < 14) {
          ball.x = ball.radius + 14;
          ball.vx = Math.abs(ball.vx) * 0.56;
        }
        if (ball.x + ball.radius > width - 14) {
          ball.x = width - ball.radius - 14;
          ball.vx = -Math.abs(ball.vx) * 0.56;
        }
        if (ball.y - ball.radius < 14) {
          ball.y = ball.radius + 14;
          ball.vy = Math.abs(ball.vy) * 0.42;
        }
        if (ball.y + ball.radius > height - 14) {
          ball.y = height - ball.radius - 14;
          ball.vy = -Math.abs(ball.vy) * 0.34;
          ball.vx *= 0.92;

          if (Math.abs(ball.vy) < 0.16) {
            ball.vy = 0;
          }
        }
      });

      setBalls(currentBalls.map((ball) => ({ ...ball })));
      animationRef.current = window.requestAnimationFrame(tick);
    };

    animationRef.current = window.requestAnimationFrame(tick);

    return () => {
      if (animationRef.current !== null) {
        window.cancelAnimationFrame(animationRef.current);
      }
    };
  }, []);

  return (
    <div ref={fieldRef} className="incident-physics-field">
      {balls.map((ball) => (
        <div
          key={ball.id}
          className={`incident-ball ${
            ball.id === selectedServiceId ? "incident-ball-active" : ""
          }`}
          style={{
            width: ball.radius * 2,
            height: ball.radius * 2,
            background: ball.color.background,
            border: `1.5px dashed ${ball.color.borderColor}`,
            boxShadow: ball.color.shadow,
            transform: `translate(${ball.x - ball.radius}px, ${ball.y - ball.radius}px)`,
            zIndex: Math.round(ball.radius),
          }}
          title={`${ball.label} · ${ball.ageMinutes}분 경과`}
        >
          <span>{ball.label}</span>
          <div className="incident-ball-detail">
            <div className="incident-ball-detail-title">{ball.label}</div>
            <div className="incident-ball-detail-row">
              발생시각 {ball.startedAtLabel}
            </div>
            <div className="incident-ball-detail-row">
              상태 {ball.statusLabel} · 경과 {formatAgeMinutes(ball.ageMinutes)}
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}

function getIncidentAgeMinutes(startedAt: string | undefined, index: number) {
  if (!startedAt) {
    return 25 + index * 42;
  }

  const started = new Date(startedAt.replace(" ", "T"));
  const timestamp = started.getTime();

  if (Number.isNaN(timestamp)) {
    return 25 + index * 42;
  }

  return Math.max(5, Math.round((Date.now() - timestamp) / 60000));
}

function getFallbackStartedAt(index: number) {
  const baseMinutes = 25 + index * 42;
  const fallback = new Date(Date.now() - baseMinutes * 60000);
  const month = String(fallback.getMonth() + 1).padStart(2, "0");
  const day = String(fallback.getDate()).padStart(2, "0");
  const hour = String(fallback.getHours()).padStart(2, "0");
  const minute = String(fallback.getMinutes()).padStart(2, "0");
  return `${month}-${day} ${hour}:${minute}`;
}

function formatAgeMinutes(ageMinutes: number) {
  if (ageMinutes < 60) {
    return `${ageMinutes}분`;
  }

  const hours = Math.floor(ageMinutes / 60);
  const minutes = ageMinutes % 60;
  return minutes > 0 ? `${hours}시간 ${minutes}분` : `${hours}시간`;
}

function getServiceSizeVariant(serviceId: number, index: number) {
  const seed = Math.sin(serviceId * 12.9898 + index * 78.233) * 43758.5453;
  const normalized = seed - Math.floor(seed);
  return Math.round(normalized * 18);
}

function getIncidentBallColor(ageMinutes: number) {
  const ratio = Math.min(1, ageMinutes / 360);
  const palette = [
    {
      fill: "rgba(254, 240, 138, 0.72)",
      edge: "rgba(253, 224, 71, 0.86)",
      border: "rgba(234, 179, 8, 0.78)",
    },
    {
      fill: "rgba(253, 186, 116, 0.66)",
      edge: "rgba(251, 146, 60, 0.8)",
      border: "rgba(249, 115, 22, 0.72)",
    },
    {
      fill: "rgba(253, 164, 175, 0.62)",
      edge: "rgba(251, 113, 133, 0.76)",
      border: "rgba(244, 63, 94, 0.68)",
    },
    {
      fill: "rgba(252, 165, 165, 0.6)",
      edge: "rgba(248, 113, 113, 0.72)",
      border: "rgba(239, 68, 68, 0.66)",
    },
    {
      fill: "rgba(248, 113, 113, 0.56)",
      edge: "rgba(239, 68, 68, 0.68)",
      border: "rgba(220, 38, 38, 0.64)",
    },
  ];
  const index = Math.min(
    palette.length - 1,
    Math.floor(ratio * palette.length)
  );
  const tone = palette[index];

  return {
    background: `
      radial-gradient(circle at 34% 28%, rgba(255, 255, 255, 0.72), transparent 28%),
      radial-gradient(circle at 68% 76%, ${tone.edge}, transparent 58%),
      ${tone.fill}
    `,
    borderColor: tone.border,
    shadow: "inset -8px -10px 18px rgba(15, 23, 42, 0.05), inset 7px 7px 14px rgba(255, 255, 255, 0.36)",
  };
}

function StatusBadge({
  status,
  critical,
}: {
  status: string;
  critical: boolean;
}) {
  return (
    <span
      className={`inline-flex w-fit rounded-md border px-3 py-1 text-xs font-semibold ${
        critical
          ? "border-red-200 bg-red-50 text-red-700"
          : "border-amber-200 bg-amber-50 text-amber-700"
      }`}
    >
      {status}
    </span>
  );
}
