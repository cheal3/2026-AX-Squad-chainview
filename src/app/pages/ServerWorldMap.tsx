import { useMemo, useRef, useState } from "react";
import {
  AlertTriangle,
  ChevronsRight,
  CircleDot,
  Compass,
  Database,
  Minus,
  Plus,
  Server,
  ShieldAlert,
  Sparkles,
  X,
  Zap,
} from "lucide-react";
import { usePortalData } from "../PortalDataStore";
import { codeLabels, type ServerRecord, type ServiceRecord } from "../mockData";

type Region = {
  name: string;
  explore: number;
  x: number;
  y: number;
  width: number;
  height: number;
};

type PointServer = ServerRecord & {
  mapX: number;
  mapY: number;
  regionName: string;
  services: ServiceRecord[];
};

const MAP_WIDTH = 2280;
const MAP_HEIGHT = 1480;
const SERVICE_ZOOM = 1.25;

const regions: Region[] = [
  {
    name: "크라운 마운틴",
    explore: 100,
    x: 480,
    y: 300,
    width: 520,
    height: 330,
  },
  {
    name: "별이 떨어지는 산골짜기",
    explore: 90,
    x: 1320,
    y: 360,
    width: 560,
    height: 360,
  },
  {
    name: "장풍 고지대",
    explore: 94,
    x: 900,
    y: 760,
    width: 520,
    height: 340,
  },
  {
    name: "울부짖는 언덕",
    explore: 100,
    x: 1560,
    y: 930,
    width: 540,
    height: 360,
  },
  {
    name: "드래곤스파인",
    explore: 100,
    x: 1080,
    y: 1240,
    width: 560,
    height: 320,
  },
  {
    name: "백수원",
    explore: 71,
    x: 330,
    y: 1130,
    width: 500,
    height: 340,
  },
  {
    name: "데이터 항만",
    explore: 88,
    x: 1220,
    y: 660,
    width: 380,
    height: 260,
  },
  {
    name: "공통 플랫폼 성채",
    explore: 96,
    x: 720,
    y: 980,
    width: 390,
    height: 280,
  },
];

export function ServerWorldMap() {
  const { servers, services } = usePortalData();
  const [scale, setScale] = useState(0.72);
  const [offset, setOffset] = useState({ x: -250, y: -150 });
  const [dragging, setDragging] = useState(false);
  const [selectedServiceId, setSelectedServiceId] = useState<number | null>(
    null
  );
  const dragStartRef = useRef({
    pointerX: 0,
    pointerY: 0,
    offsetX: 0,
    offsetY: 0,
  });

  const serviceById = useMemo(
    () => new Map(services.map((service) => [service.serviceId, service])),
    [services]
  );
  const selectedService = selectedServiceId
    ? serviceById.get(selectedServiceId)
    : undefined;
  const selectedServer = selectedService
    ? servers.find((server) => server.serverId === selectedService.serverId)
    : undefined;

  const pointServers = useMemo<PointServer[]>(() => {
    return servers.map((server, index) => {
      const region = regions[index % regions.length];
      const ring = Math.floor(index / regions.length) % 5;
      const angle = ((index * 137.5) % 360) * (Math.PI / 180);
      const radiusX = 54 + ring * 38 + (index % 3) * 18;
      const radiusY = 38 + ring * 30 + (index % 4) * 12;
      const mapX = region.x + Math.cos(angle) * Math.min(radiusX, region.width / 2 - 50);
      const mapY = region.y + Math.sin(angle) * Math.min(radiusY, region.height / 2 - 42);

      return {
        ...server,
        mapX,
        mapY,
        regionName: region.name,
        services: services.filter((service) => service.serverId === server.serverId),
      };
    });
  }, [servers, services]);

  const stats = useMemo(() => {
    const incidentServices = services.filter((service) =>
      ["INCIDENT", "IMPACTED"].includes(service.statusCode)
    );
    const maintenanceServices = services.filter(
      (service) => service.statusCode === "MAINTENANCE"
    );
    const incidentServers = servers.filter(
      (server) => server.statusCode === "INCIDENT"
    );

    return {
      incidentServices: incidentServices.length,
      maintenanceServices: maintenanceServices.length,
      incidentServers: incidentServers.length,
      normalServices: services.filter((service) => service.statusCode === "NORMAL")
        .length,
    };
  }, [servers, services]);

  const zoomedIn = scale >= SERVICE_ZOOM;

  const handleWheel = (event: React.WheelEvent<HTMLDivElement>) => {
    event.preventDefault();
    const nextScale = clamp(scale - event.deltaY * 0.001, 0.52, 2.25);
    setScale(nextScale);
  };

  const handlePointerDown = (event: React.PointerEvent<HTMLDivElement>) => {
    const target = event.target as HTMLElement;
    if (target.closest("[data-map-panel]")) {
      return;
    }
    if (!target.closest("[data-service-marker]")) {
      setSelectedServiceId(null);
    }
    setDragging(true);
    event.currentTarget.setPointerCapture(event.pointerId);
    dragStartRef.current = {
      pointerX: event.clientX,
      pointerY: event.clientY,
      offsetX: offset.x,
      offsetY: offset.y,
    };
  };

  const handlePointerMove = (event: React.PointerEvent<HTMLDivElement>) => {
    if (!dragging) {
      return;
    }
    const start = dragStartRef.current;
    setOffset({
      x: start.offsetX + event.clientX - start.pointerX,
      y: start.offsetY + event.clientY - start.pointerY,
    });
  };

  const handlePointerUp = (event: React.PointerEvent<HTMLDivElement>) => {
    setDragging(false);
    event.currentTarget.releasePointerCapture(event.pointerId);
  };

  const zoomBy = (delta: number) => {
    setScale((current) => clamp(current + delta, 0.52, 2.25));
  };

  return (
    <div className="h-[calc(100vh-136px)] min-h-[720px] overflow-hidden rounded-2xl border border-slate-300 bg-slate-100 shadow-sm">
      <div
        className={`relative h-full select-none overflow-hidden ${
          dragging ? "cursor-grabbing" : "cursor-grab"
        }`}
        onWheel={handleWheel}
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
      >
        <MapTopBar stats={stats} />

        <div
          className="absolute left-0 top-0 h-full w-full"
          style={{
            transform: `translate(${offset.x}px, ${offset.y}px) scale(${scale})`,
            transformOrigin: "0 0",
          }}
        >
          <div
            className="relative overflow-hidden rounded-[32px] bg-slate-50"
            style={{ width: MAP_WIDTH, height: MAP_HEIGHT }}
          >
            <MapCanvas />
            {regions.map((region) => (
              <RegionArea key={region.name} region={region} />
            ))}

            {pointServers.map((server) => (
              <ServerMarker
                key={server.serverId}
                server={server}
                zoomedIn={zoomedIn}
                onServiceClick={(serviceId) => setSelectedServiceId(serviceId)}
              />
            ))}
          </div>
        </div>

        <div className="absolute bottom-6 left-6 z-30 flex items-center gap-3">
          <button
            onClick={() => zoomBy(-0.16)}
            className="flex h-11 w-11 items-center justify-center rounded-full border border-slate-300 bg-white text-slate-800 shadow-sm hover:bg-slate-100"
          >
            <Minus size={20} />
          </button>
          <div className="rounded-full border border-slate-300 bg-white px-4 py-2 text-sm font-semibold text-slate-800 shadow-sm">
            {Math.round(scale * 100)}%
          </div>
          <button
            onClick={() => zoomBy(0.16)}
            className="flex h-11 w-11 items-center justify-center rounded-full border border-slate-300 bg-white text-slate-800 shadow-sm hover:bg-slate-100"
          >
            <Plus size={20} />
          </button>
        </div>

        <MapLegend zoomedIn={zoomedIn} />

        {selectedService && (
          <ServiceSidePanel
            service={selectedService}
            server={selectedServer}
            onClose={() => setSelectedServiceId(null)}
          />
        )}
      </div>
    </div>
  );
}

function MapTopBar({
  stats,
}: {
  stats: {
    incidentServices: number;
    maintenanceServices: number;
    incidentServers: number;
    normalServices: number;
  };
}) {
  return (
    <div className="pointer-events-none absolute left-1/2 top-5 z-30 flex -translate-x-1/2 flex-wrap items-center justify-center gap-4">
      <StatusPill icon={ShieldAlert} label="장애 서비스" value={stats.incidentServices} danger />
      <StatusPill icon={Zap} label="점검 서비스" value={stats.maintenanceServices} />
      <StatusPill icon={Server} label="장애 서버" value={stats.incidentServers} danger />
      <StatusPill icon={Sparkles} label="정상 서비스" value={stats.normalServices} />
    </div>
  );
}

function StatusPill({
  icon: Icon,
  label,
  value,
  danger = false,
}: {
  icon: typeof ShieldAlert;
  label: string;
  value: number;
  danger?: boolean;
}) {
  return (
    <div className="flex items-center gap-2 rounded-full border border-slate-200 bg-white px-4 py-2 text-slate-900 shadow-sm">
      <div
        className={`flex h-8 w-8 items-center justify-center rounded-full ${
          danger ? "bg-red-500/25 text-red-200" : "bg-cyan-400/20 text-cyan-100"
        }`}
      >
        <Icon size={18} />
      </div>
      <span className="text-sm font-semibold text-slate-500">{label}</span>
      <span className="text-xl font-black">{value}</span>
    </div>
  );
}

function MapCanvas() {
  return (
    <div
      className="absolute inset-0"
      style={{
        backgroundColor: "#f8fafc",
        backgroundImage:
          "radial-gradient(circle, rgba(15, 23, 42, 0.18) 1.2px, transparent 1.2px), linear-gradient(rgba(15, 23, 42, 0.06) 1px, transparent 1px), linear-gradient(90deg, rgba(15, 23, 42, 0.06) 1px, transparent 1px)",
        backgroundSize: "28px 28px, 140px 140px, 140px 140px",
      }}
    />
  );
}

function RegionArea({ region }: { region: Region }) {
  return (
    <div
      className="absolute rounded-[28px] border-2 border-dashed border-slate-300 bg-white/42"
      style={{
        left: region.x - region.width / 2,
        top: region.y - region.height / 2,
        width: region.width,
        height: region.height,
      }}
    >
      <div className="absolute left-6 top-5 whitespace-nowrap text-left text-[32px] font-black text-slate-700">
        {region.name}
        <div className="mt-1 text-lg font-bold text-slate-500">
          안정도 {region.explore}%
        </div>
      </div>
    </div>
  );
}

function ServerMarker({
  server,
  zoomedIn,
  onServiceClick,
}: {
  server: PointServer;
  zoomedIn: boolean;
  onServiceClick: (serviceId: number) => void;
}) {
  const hasIncident = server.services.some((service) =>
    ["INCIDENT", "IMPACTED"].includes(service.statusCode)
  );
  const hasMaintenance = server.services.some(
    (service) => service.statusCode === "MAINTENANCE"
  );

  return (
    <div
      className="absolute"
      style={{
        left: server.mapX,
        top: server.mapY,
        transform: "translate(-50%, -50%)",
      }}
    >
      <div className="relative flex flex-col items-center">
        <div className="relative flex h-16 w-16 items-center justify-center rounded-full border-[5px] border-white bg-sky-300 text-slate-900 shadow-md">
          <Server size={26} />
          <div className="absolute -bottom-4 h-6 w-6 rotate-45 border-b-4 border-r-4 border-white bg-slate-950" />
          {(hasIncident || server.statusCode === "INCIDENT") && <MapExclamation />}
          {!hasIncident && hasMaintenance && (
            <div className="absolute -right-2 -top-2 flex h-7 w-7 items-center justify-center rounded-full border-2 border-white bg-yellow-400 text-xs font-black text-slate-900">
              !
            </div>
          )}
        </div>

        {!zoomedIn && (
          <div className="mt-4 whitespace-nowrap rounded-full border border-slate-200 bg-white px-3 py-1.5 text-center text-sm font-bold text-slate-800 shadow-sm">
            {server.serverName}
            <div className="text-xs font-semibold text-slate-500">
              {codeLabels.envType[server.envCode]} · 서비스 {server.services.length}
            </div>
          </div>
        )}

        {zoomedIn && (
          <div className="pointer-events-none absolute left-1/2 top-1/2 h-1 w-1">
            {server.services.slice(0, 7).map((service, index) => {
              const angle = (-90 + index * (360 / Math.max(server.services.length, 3))) * (Math.PI / 180);
              const distance = 88 + (index % 2) * 22;
              return (
                <button
                  key={service.serviceId}
                  data-service-marker
                  onClick={(event) => {
                    event.stopPropagation();
                    onServiceClick(service.serviceId);
                  }}
                  className="pointer-events-auto absolute flex -translate-x-1/2 -translate-y-1/2 items-center gap-2 whitespace-nowrap rounded-full border border-slate-200 bg-white py-1.5 pl-2 pr-3 text-xs font-bold text-slate-800 shadow-sm hover:bg-orange-50"
                  style={{
                    left: Math.cos(angle) * distance,
                    top: Math.sin(angle) * distance,
                  }}
                >
                  <span
                    className={`flex h-6 w-6 items-center justify-center rounded-full ${
                      ["INCIDENT", "IMPACTED"].includes(service.statusCode)
                        ? "bg-red-500"
                        : service.statusCode === "MAINTENANCE"
                          ? "bg-yellow-400 text-slate-900"
                          : "bg-cyan-400 text-slate-950"
                    }`}
                  >
                    {["INCIDENT", "IMPACTED"].includes(service.statusCode) ? "!" : <Database size={13} />}
                  </span>
                  {service.serviceName}
                </button>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}

function MapExclamation() {
  return (
    <div className="absolute -right-3 -top-4">
      <div className="relative flex h-9 w-9 items-center justify-center rounded-full border-[3px] border-white bg-red-500 text-xl font-black text-white shadow-lg">
        !
        <span className="absolute h-12 w-12 animate-ping rounded-full bg-red-500/30" />
      </div>
    </div>
  );
}

function MapLegend({ zoomedIn }: { zoomedIn: boolean }) {
  return (
    <div className="pointer-events-none absolute bottom-6 right-6 z-30 rounded-2xl border border-slate-200 bg-white p-4 text-slate-800 shadow-sm">
      <div className="flex items-center gap-2 text-sm font-bold">
        <Compass size={18} className="text-[#f60]" />
        {zoomedIn ? "서비스 상세 보기" : "서버 구역 보기"}
      </div>
      <div className="mt-2 text-xs text-slate-500">
        마우스 드래그로 이동 · 휠로 확대/축소
      </div>
    </div>
  );
}

function ServiceSidePanel({
  service,
  server,
  onClose,
}: {
  service: ServiceRecord;
  server?: ServerRecord;
  onClose: () => void;
}) {
  return (
    <aside
      data-map-panel
      className="absolute right-0 top-0 z-40 h-full w-[420px] border-l border-slate-200 bg-white text-slate-900 shadow-2xl"
    >
      <div className="flex items-center justify-between border-b border-slate-200 px-6 py-5">
        <div>
          <div className="text-sm font-semibold text-[#f60]">서비스 상세</div>
          <h3 className="mt-1 text-2xl font-black">{service.serviceName}</h3>
        </div>
        <button
          onClick={onClose}
          className="flex h-10 w-10 items-center justify-center rounded-full bg-slate-100 text-slate-700 hover:bg-slate-200"
        >
          <X size={21} />
        </button>
      </div>

      <div className="space-y-5 overflow-auto px-6 py-6">
        <PanelStatus service={service} />
        <PanelItem label="서비스 코드" value={service.serviceCode} />
        <PanelItem label="배포 서버" value={server?.serverName ?? "미지정"} />
        <PanelItem label="분류" value={service.categoryPath.join(" / ")} />
        <PanelItem label="엔드포인트" value={service.endpointUrl || "미입력"} />
        <PanelItem label="배포 경로" value={service.deployPath || "미입력"} />
        <PanelItem
          label="포트 / 인스턴스"
          value={`${service.portInfo || "-"} / ${service.instanceCount}`}
        />
        <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
          <div className="mb-3 flex items-center gap-2 text-sm font-bold text-slate-700">
            <ChevronsRight size={17} className="text-[#f60]" />
            설명
          </div>
          <p className="text-sm leading-6 text-slate-600">
            {service.description || "등록된 설명이 없습니다."}
          </p>
        </div>
      </div>
    </aside>
  );
}

function PanelStatus({ service }: { service: ServiceRecord }) {
  const danger = ["INCIDENT", "IMPACTED"].includes(service.statusCode);
  return (
    <div
      className={`rounded-2xl border p-4 ${
        danger
          ? "border-red-200 bg-red-50"
          : service.statusCode === "MAINTENANCE"
            ? "border-yellow-200 bg-yellow-50"
            : "border-cyan-200 bg-cyan-50"
      }`}
    >
      <div className="flex items-center gap-3">
        <div
          className={`flex h-11 w-11 items-center justify-center rounded-full ${
            danger ? "bg-red-500 text-white" : "bg-cyan-400 text-slate-950"
          }`}
        >
          {danger ? <AlertTriangle size={22} /> : <CircleDot size={22} />}
        </div>
        <div>
          <div className="text-sm text-slate-500">상태</div>
          <div className="text-lg font-black">
            {codeLabels.serviceStatus[service.statusCode]}
          </div>
        </div>
      </div>
    </div>
  );
}

function PanelItem({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3">
      <div className="text-xs font-semibold text-slate-400">{label}</div>
      <div className="mt-1 break-words text-sm font-bold text-slate-800">
        {value}
      </div>
    </div>
  );
}

function clamp(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value));
}
