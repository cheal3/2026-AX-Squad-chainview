import { useEffect, useMemo, useRef, useState } from "react";
import {
  AlertTriangle,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  ChevronsRight,
  CircleDot,
  Compass,
  Database,
  MapPin,
  Minus,
  Plus,
  Search,
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

type LayoutRegion = Region & {
  serverCount: number;
  serviceCount: number;
  incidentCount: number;
};

type MapBounds = {
  left: number;
  top: number;
  right: number;
  bottom: number;
};

const MAP_WIDTH = 12000;
const MAP_HEIGHT = 8000;
const REGION_OFFSET_X = 3800;
const REGION_OFFSET_Y = 2500;
const SERVER_ZOOM = 0.72;
const SERVER_FADE_START = 0.58;
const SERVICE_ZOOM = 1.2;
const SERVICE_FADE_START = 1.02;
const FOCUS_SCALE = 1.34;
const MAX_SERVICE_MARKERS = 10;

const regions: Region[] = [
  {
    name: "크라운 마운틴",
    explore: 100,
    x: 520,
    y: 620,
    width: 660,
    height: 560,
  },
  {
    name: "별이 떨어지는 산골짜기",
    explore: 90,
    x: 1540,
    y: 620,
    width: 660,
    height: 560,
  },
  {
    name: "장풍 고지대",
    explore: 94,
    x: 2560,
    y: 620,
    width: 660,
    height: 560,
  },
  {
    name: "울부짖는 언덕",
    explore: 100,
    x: 3580,
    y: 620,
    width: 660,
    height: 560,
  },
  {
    name: "드래곤스파인",
    explore: 100,
    x: 520,
    y: 1880,
    width: 660,
    height: 560,
  },
  {
    name: "백수원",
    explore: 71,
    x: 1540,
    y: 1880,
    width: 660,
    height: 560,
  },
  {
    name: "데이터 항만",
    explore: 88,
    x: 2560,
    y: 1880,
    width: 660,
    height: 560,
  },
  {
    name: "공통 플랫폼 성채",
    explore: 96,
    x: 3580,
    y: 1880,
    width: 660,
    height: 560,
  },
].map((region) => ({
  ...region,
  x: region.x + REGION_OFFSET_X,
  y: region.y + REGION_OFFSET_Y,
}));

export function ServerWorldMap() {
  const { servers, services } = usePortalData();
  const [scale, setScale] = useState(0.42);
  const [offset, setOffset] = useState({ x: -1505, y: -1010 });
  const [dragging, setDragging] = useState(false);
  const [selectedServiceId, setSelectedServiceId] = useState<number | null>(
    null
  );
  const [focusedServerId, setFocusedServerId] = useState<number | null>(null);
  const [expandedServerId, setExpandedServerId] = useState<number | null>(null);
  const [finderOpen, setFinderOpen] = useState(true);
  const [serverSearch, setServerSearch] = useState("");
  const viewportRef = useRef<HTMLDivElement | null>(null);
  const dragStartRef = useRef({
    pointerX: 0,
    pointerY: 0,
    offsetX: 0,
    offsetY: 0,
  });
  const [viewportSize, setViewportSize] = useState({
    width: 1280,
    height: 720,
  });

  useEffect(() => {
    const element = viewportRef.current;
    if (!element) {
      return;
    }

    const updateViewportSize = () => {
      setViewportSize({
        width: element.clientWidth,
        height: element.clientHeight,
      });
    };

    updateViewportSize();
    const observer = new ResizeObserver(updateViewportSize);
    observer.observe(element);
    return () => observer.disconnect();
  }, []);

  const serviceById = useMemo(
    () => new Map(services.map((service) => [service.serviceId, service])),
    [services]
  );
  const servicesByServerId = useMemo(() => {
    const next = new Map<number, ServiceRecord[]>();
    services.forEach((service) => {
      const serverServices = next.get(service.serverId) ?? [];
      serverServices.push(service);
      next.set(service.serverId, serverServices);
    });
    return next;
  }, [services]);
  const selectedService = selectedServiceId
    ? serviceById.get(selectedServiceId)
    : undefined;
  const selectedServer = selectedService
    ? servers.find((server) => server.serverId === selectedService.serverId)
    : undefined;

  const layoutRegions = useMemo<LayoutRegion[]>(() => {
    const summaries = regions.map(() => ({
      serverCount: 0,
      serviceCount: 0,
      incidentCount: 0,
    }));

    servers.forEach((server, index) => {
      const regionSummary = summaries[index % regions.length];
      const serverServices = servicesByServerId.get(server.serverId) ?? [];
      const hasIncident =
        server.statusCode === "INCIDENT" ||
        serverServices.some((service) =>
          ["INCIDENT", "IMPACTED"].includes(service.statusCode)
        );

      regionSummary.serverCount += 1;
      regionSummary.serviceCount += serverServices.length;
      if (hasIncident) {
        regionSummary.incidentCount += 1;
      }
    });

    return regions.map((region, index) => {
      const summary = summaries[index];
      const requiredColumns = Math.max(
        1,
        Math.ceil(Math.sqrt(summary.serverCount || 1))
      );
      const requiredRows = Math.max(
        1,
        Math.ceil((summary.serverCount || 1) / requiredColumns)
      );
      const servicePressure = Math.min(
        160,
        Math.sqrt(summary.serviceCount) * 18
      );

      return {
        ...region,
        ...summary,
        width: clamp(
          Math.max(region.width, 160 + requiredColumns * 190 + servicePressure),
          region.width,
          980
        ),
        height: clamp(
          Math.max(
            region.height,
            170 + requiredRows * 220 + servicePressure * 0.5
          ),
          region.height,
          1060
        ),
      };
    });
  }, [servers, servicesByServerId]);

  const pointServers = useMemo<PointServer[]>(() => {
    const serversByRegion = new Map<number, ServerRecord[]>();
    servers.forEach((server, index) => {
      const regionIndex = index % layoutRegions.length;
      const regionServers = serversByRegion.get(regionIndex) ?? [];
      regionServers.push(server);
      serversByRegion.set(regionIndex, regionServers);
    });

    return layoutRegions.flatMap((region, regionIndex) => {
      const regionServers = serversByRegion.get(regionIndex) ?? [];
      const usableWidth = Math.max(220, region.width - 160);
      const usableHeight = Math.max(220, region.height - 170);
      const maxColumns = Math.max(1, Math.floor(usableWidth / 190));
      const columns = Math.max(
        1,
        Math.min(maxColumns, Math.ceil(Math.sqrt(regionServers.length || 1)))
      );
      const rows = Math.max(1, Math.ceil(regionServers.length / columns));
      const cellWidth = usableWidth / columns;
      const cellHeight = usableHeight / rows;

      return regionServers.map((server, localIndex) => {
        const column = localIndex % columns;
        const row = Math.floor(localIndex / columns);
        const mapX =
          region.x - usableWidth / 2 + cellWidth * column + cellWidth / 2;
        const mapY =
          region.y - usableHeight / 2 + cellHeight * row + cellHeight / 2 + 18;

        return {
          ...server,
          mapX,
          mapY,
          regionName: region.name,
          services: servicesByServerId.get(server.serverId) ?? [],
        };
      });
    });
  }, [servers, layoutRegions, servicesByServerId]);

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

  const serverLayerOpacity = clamp(
    (scale - SERVER_FADE_START) / (SERVER_ZOOM - SERVER_FADE_START),
    0,
    1
  );
  const serverLayerInteractive = serverLayerOpacity > 0.72;
  const serviceLayerOpacity = clamp(
    (scale - SERVICE_FADE_START) / (SERVICE_ZOOM - SERVICE_FADE_START),
    0,
    1
  );
  const serviceLayerInteractive = serviceLayerOpacity > 0.72;
  const mapDepth = scale < SERVER_ZOOM ? 1 : scale < SERVICE_ZOOM ? 2 : 3;

  const mapBounds = useMemo<MapBounds>(() => {
    const margin = 480 / scale + 160;
    return {
      left: -offset.x / scale - margin,
      top: -offset.y / scale - margin,
      right: (viewportSize.width - offset.x) / scale + margin,
      bottom: (viewportSize.height - offset.y) / scale + margin,
    };
  }, [offset.x, offset.y, scale, viewportSize.height, viewportSize.width]);

  const visiblePointServers = useMemo(() => {
    if (serverLayerOpacity <= 0.02) {
      return [];
    }
    return pointServers.filter((server) => isServerInBounds(server, mapBounds));
  }, [mapBounds, pointServers, serverLayerOpacity]);

  const focusedServer = focusedServerId
    ? pointServers.find((server) => server.serverId === focusedServerId)
    : undefined;

  const searchedServers = useMemo(() => {
    const keyword = serverSearch.trim().toLowerCase();
    if (!keyword) {
      return pointServers;
    }

    return pointServers.filter((server) => {
      const serviceText = server.services
        .map((service) => `${service.serviceName} ${service.serviceCode}`)
        .join(" ")
        .toLowerCase();
      const serverText = [
        server.serverName,
        server.hostName,
        server.ipAddress,
        server.regionName,
      ]
        .join(" ")
        .toLowerCase();

      return `${serverText} ${serviceText}`.includes(keyword);
    });
  }, [pointServers, serverSearch]);

  const focusServer = (server: PointServer, openServices = true) => {
    const nextScale = openServices ? Math.max(scale, FOCUS_SCALE) : Math.max(scale, SERVER_ZOOM);
    setFocusedServerId(server.serverId);
    setExpandedServerId(server.serverId);
    setFinderOpen(true);
    setSelectedServiceId(null);
    setScale(nextScale);
    setOffset({
      x: viewportSize.width / 2 - server.mapX * nextScale,
      y: viewportSize.height / 2 - server.mapY * nextScale,
    });
  };

  const toggleServerInFinder = (server: PointServer) => {
    if (expandedServerId === server.serverId) {
      setExpandedServerId(null);
      setFocusedServerId(server.serverId);
      return;
    }
    focusServer(server);
  };

  const handleWheel = (event: React.WheelEvent<HTMLDivElement>) => {
    event.preventDefault();
    const nextScale = clamp(scale - event.deltaY * 0.001, 0.36, 2.25);
    setScale(nextScale);
  };

  const handlePointerDown = (event: React.PointerEvent<HTMLDivElement>) => {
    const target = event.target as HTMLElement;
    if (target.closest("[data-map-panel]")) {
      return;
    }
    if (target.closest("[data-service-marker]")) {
      return;
    }
    if (target.closest("[data-server-marker]")) {
      return;
    }
    setSelectedServiceId(null);
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
    if (event.currentTarget.hasPointerCapture(event.pointerId)) {
      event.currentTarget.releasePointerCapture(event.pointerId);
    }
    setDragging(false);
  };

  const zoomBy = (delta: number) => {
    setScale((current) => clamp(current + delta, 0.36, 2.25));
  };

  return (
    <div className="h-[calc(100vh-136px)] min-h-[720px] overflow-hidden rounded-2xl border border-slate-300 bg-slate-100 shadow-sm">
      <div
        ref={viewportRef}
        className={`relative h-full select-none overflow-hidden ${
          dragging ? "cursor-grabbing" : "cursor-grab"
        }`}
        onWheel={handleWheel}
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
      >
        <MapTopBar stats={stats} />

        <ServerFinderPanel
          expandedServerId={expandedServerId}
          focusedServerId={focusedServerId}
          open={finderOpen}
          searchValue={serverSearch}
          servers={searchedServers}
          totalServers={pointServers.length}
          onOpenChange={setFinderOpen}
          onSearchChange={setServerSearch}
          onServerSelect={toggleServerInFinder}
          onServiceSelect={setSelectedServiceId}
        />

        <div
          className="absolute left-0 top-0 h-full w-full"
          style={{
            transform: `translate(${offset.x}px, ${offset.y}px) scale(${scale})`,
            transformOrigin: "0 0",
            transition: dragging
              ? "none"
              : "transform 420ms cubic-bezier(0.22, 1, 0.36, 1)",
          }}
        >
          <div
            className="relative overflow-hidden rounded-[32px] bg-slate-50"
            style={{ width: MAP_WIDTH, height: MAP_HEIGHT }}
          >
            <MapCanvas />
            {layoutRegions.map((region) => (
              <RegionArea
                key={region.name}
                region={region}
                serverLayerOpacity={serverLayerOpacity}
              />
            ))}

            {serverLayerOpacity > 0.02 &&
              visiblePointServers.map((server) => (
                <ServerMarker
                  key={server.serverId}
                  server={server}
                  focused={server.serverId === focusedServerId}
                  layerOpacity={serverLayerOpacity}
                  serviceInteractive={serviceLayerInteractive}
                  serviceLayerOpacity={serviceLayerOpacity}
                  serverInteractive={serverLayerInteractive}
                  onServerClick={() => focusServer(server)}
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

        <MapLegend focusedServer={focusedServer} mapDepth={mapDepth} />

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

function ServerFinderPanel({
  expandedServerId,
  focusedServerId,
  open,
  servers,
  totalServers,
  searchValue,
  onOpenChange,
  onSearchChange,
  onServerSelect,
  onServiceSelect,
}: {
  expandedServerId: number | null;
  focusedServerId: number | null;
  open: boolean;
  servers: PointServer[];
  totalServers: number;
  searchValue: string;
  onOpenChange: (open: boolean) => void;
  onSearchChange: (value: string) => void;
  onServerSelect: (server: PointServer) => void;
  onServiceSelect: (serviceId: number) => void;
}) {
  const visibleServers = servers.slice(0, 80);

  if (!open) {
    return (
      <button
        data-map-panel
        onClick={() => onOpenChange(true)}
        className="absolute left-5 top-24 z-30 flex h-12 items-center gap-2 rounded-full border border-slate-200 bg-white px-4 text-sm font-black text-slate-800 shadow-sm hover:border-[#f60] hover:text-[#f60]"
      >
        <MapPin size={18} className="text-[#f60]" />
        서버 찾기
        <span className="rounded-full bg-slate-100 px-2 py-0.5 text-xs text-slate-500">
          {totalServers}
        </span>
      </button>
    );
  }

  return (
    <aside
      data-map-panel
      className="absolute left-5 top-24 z-30 flex max-h-[calc(100%-170px)] w-[330px] flex-col rounded-2xl border border-slate-200 bg-white/95 text-slate-900 shadow-sm backdrop-blur"
    >
      <div className="border-b border-slate-200 p-4">
        <div className="flex items-center justify-between gap-3">
          <div>
            <div className="text-xs font-bold text-[#f60]">서버 찾기</div>
            <div className="mt-1 text-lg font-black">
              {servers.length} / {totalServers}
            </div>
          </div>
          <button
            onClick={() => onOpenChange(false)}
            className="flex h-10 w-10 items-center justify-center rounded-full bg-orange-50 text-[#f60] hover:bg-orange-100"
            title="서버 찾기 접기"
          >
            <ChevronLeft size={19} />
          </button>
        </div>

        <label className="mt-4 flex h-10 items-center gap-2 rounded-xl border border-slate-200 bg-slate-50 px-3 focus-within:border-[#f60] focus-within:bg-white">
          <Search size={17} className="shrink-0 text-slate-400" />
          <input
            value={searchValue}
            onChange={(event) => onSearchChange(event.target.value)}
            placeholder="서버명, 호스트명, IP, 서비스명"
            className="min-w-0 flex-1 bg-transparent text-sm font-semibold text-slate-800 outline-none placeholder:text-slate-400"
          />
        </label>
      </div>

      <div className="min-h-0 flex-1 overflow-auto p-2">
        {visibleServers.map((server) => {
          const expanded = server.serverId === expandedServerId;
          const focused = server.serverId === focusedServerId;
          const hasIncident =
            server.statusCode === "INCIDENT" ||
            server.services.some((service) =>
              ["INCIDENT", "IMPACTED"].includes(service.statusCode)
            );

          return (
            <div
              key={server.serverId}
              className={`mb-1 overflow-hidden rounded-xl border transition ${
                expanded || focused
                  ? "border-[#f60] bg-orange-50"
                  : "border-transparent hover:border-slate-200 hover:bg-slate-50"
              }`}
            >
              <button
                onClick={() => onServerSelect(server)}
                className="flex w-full items-center gap-3 px-3 py-2.5 text-left"
              >
                <span
                  className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full ${
                    hasIncident
                      ? "bg-red-500 text-white"
                      : server.statusCode === "MAINTENANCE"
                        ? "bg-yellow-400 text-slate-900"
                        : "bg-cyan-100 text-slate-800"
                  }`}
                >
                  {hasIncident ? "!" : <Server size={16} />}
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-sm font-black text-slate-800">
                    {server.serverName}
                  </span>
                  <span className="mt-0.5 block truncate text-xs font-semibold text-slate-500">
                    {server.regionName} · {server.ipAddress}
                  </span>
                </span>
                <span className="flex shrink-0 items-center gap-1">
                  <span className="rounded-full bg-slate-100 px-2 py-1 text-[11px] font-black text-slate-500">
                    {server.services.length}
                  </span>
                  {expanded ? (
                    <ChevronDown size={16} className="text-slate-400" />
                  ) : (
                    <ChevronRight size={16} className="text-slate-400" />
                  )}
                </span>
              </button>

              {expanded && (
                <div className="space-y-1 border-t border-orange-100 bg-white/78 p-2">
                  {server.services.length === 0 ? (
                    <div className="rounded-lg bg-slate-50 px-3 py-2 text-xs font-semibold text-slate-400">
                      등록된 서비스가 없습니다.
                    </div>
                  ) : (
                    server.services.map((service) => (
                      <button
                        key={service.serviceId}
                        onClick={() => onServiceSelect(service.serviceId)}
                        className="flex w-full items-start gap-2 rounded-lg px-2 py-2 text-left hover:bg-orange-50"
                      >
                        <span
                          className={`mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full ${
                            ["INCIDENT", "IMPACTED"].includes(service.statusCode)
                              ? "bg-red-500 text-white"
                              : service.statusCode === "MAINTENANCE"
                                ? "bg-yellow-400 text-slate-900"
                                : "bg-cyan-100 text-slate-800"
                          }`}
                        >
                          {["INCIDENT", "IMPACTED"].includes(service.statusCode) ? (
                            "!"
                          ) : (
                            <Database size={13} />
                          )}
                        </span>
                        <span className="min-w-0 flex-1">
                          <span className="block truncate text-xs font-black text-slate-800">
                            {service.serviceName}
                          </span>
                          <span className="mt-0.5 block truncate text-[11px] font-semibold text-slate-500">
                            {service.serviceCode} ·{" "}
                            {codeLabels.serviceType[service.serviceTypeCode]} ·{" "}
                            {codeLabels.serviceStatus[service.statusCode]}
                          </span>
                        </span>
                      </button>
                    ))
                  )}
                </div>
              )}
            </div>
          );
        })}

        {servers.length > visibleServers.length && (
          <div className="px-3 py-2 text-center text-xs font-bold text-slate-400">
            검색어를 입력하면 더 정확하게 찾을 수 있습니다.
          </div>
        )}
      </div>
    </aside>
  );
}

function RegionArea({
  region,
  serverLayerOpacity,
}: {
  region: LayoutRegion;
  serverLayerOpacity: number;
}) {
  const regionOpacity = 1 - serverLayerOpacity * 0.46;
  const labelOpacity = clamp(1 - serverLayerOpacity * 0.75, 0.18, 1);

  return (
    <div
      data-region-area
      className="absolute rounded-[28px] border-2 border-dashed border-slate-300 bg-white/42"
      style={{
        left: region.x - region.width / 2,
        top: region.y - region.height / 2,
        width: region.width,
        height: region.height,
        opacity: regionOpacity,
        transition: "opacity 360ms ease, width 360ms ease, height 360ms ease",
      }}
    >
      <div
        className="absolute left-6 top-5 whitespace-nowrap text-left text-[32px] font-black text-slate-700"
        style={{ opacity: labelOpacity, transition: "opacity 320ms ease" }}
      >
        {region.name}
        <div className="mt-1 text-lg font-bold text-slate-500">
          안정도 {region.explore}%
        </div>
        <div className="mt-4 flex flex-wrap gap-2 text-sm font-bold">
          <span className="rounded-full border border-slate-200 bg-white px-3 py-1 text-slate-600">
            서버 {region.serverCount}
          </span>
          <span className="rounded-full border border-slate-200 bg-white px-3 py-1 text-slate-600">
            서비스 {region.serviceCount}
          </span>
          {region.incidentCount > 0 && (
            <span className="rounded-full border border-red-200 bg-red-50 px-3 py-1 text-red-600">
              장애 {region.incidentCount}
            </span>
          )}
        </div>
      </div>
    </div>
  );
}

function ServerMarker({
  server,
  focused,
  layerOpacity,
  serverInteractive,
  serviceInteractive,
  serviceLayerOpacity,
  onServerClick,
  onServiceClick,
}: {
  server: PointServer;
  focused: boolean;
  layerOpacity: number;
  serverInteractive: boolean;
  serviceInteractive: boolean;
  serviceLayerOpacity: number;
  onServerClick: () => void;
  onServiceClick: (serviceId: number) => void;
}) {
  const hasIncident = server.services.some((service) =>
    ["INCIDENT", "IMPACTED"].includes(service.statusCode)
  );
  const hasMaintenance = server.services.some(
    (service) => service.statusCode === "MAINTENANCE"
  );
  const showServices = focused && serviceLayerOpacity > 0.02;
  const footprint = getServerFootprint(server.services.length, showServices);
  const visibleServices = server.services.slice(0, MAX_SERVICE_MARKERS);
  const hiddenServiceCount = Math.max(0, server.services.length - MAX_SERVICE_MARKERS);

  return (
    <div
      data-server-marker
      className="absolute transition-opacity duration-500 ease-out"
      onPointerDown={(event) => event.stopPropagation()}
      onClick={(event) => {
        event.stopPropagation();
        onServerClick();
      }}
      style={{
        left: server.mapX,
        top: server.mapY,
        transform: "translate(-50%, -50%)",
        width: footprint.width,
        height: footprint.height,
        opacity: layerOpacity,
        pointerEvents: serverInteractive ? "auto" : "none",
        zIndex: focused ? 8 : hasIncident || server.statusCode === "INCIDENT" ? 4 : 2,
      }}
    >
      {showServices && (
        <div className="absolute inset-0 rounded-[24px] border border-slate-300 bg-white/86 shadow-sm backdrop-blur-sm" />
      )}
      <button
        className={`absolute left-1/2 top-2 flex -translate-x-1/2 flex-col items-center ${
          focused ? "text-[#f60]" : "text-slate-800"
        }`}
        type="button"
      >
        <span
          className={`relative flex h-11 w-11 items-center justify-center rounded-full border-[4px] border-white shadow-md ${
            focused ? "bg-[#f60] text-white" : "bg-sky-300 text-slate-900"
          }`}
        >
          <Server size={20} />
          <span className="absolute -bottom-3 h-5 w-5 rotate-45 border-b-4 border-r-4 border-white bg-slate-950" />
          {(hasIncident || server.statusCode === "INCIDENT") && <MapExclamation />}
          {!hasIncident && hasMaintenance && (
            <span className="absolute -right-2 -top-2 flex h-6 w-6 items-center justify-center rounded-full border-2 border-white bg-yellow-400 text-xs font-black text-slate-900">
              !
            </span>
          )}
          {!hasIncident && !hasMaintenance && server.services.length > 0 && (
            <span className="absolute -right-2 -top-2 flex h-6 min-w-6 items-center justify-center rounded-full border-2 border-white bg-slate-900 px-1 text-[10px] font-black text-white">
              {server.services.length}
            </span>
          )}
        </span>
        {focused && (
          <span className="mt-4 max-w-[190px] truncate rounded-full border border-orange-200 bg-white px-3 py-1 text-xs font-black shadow-sm">
            {server.serverName}
          </span>
        )}
      </button>

      {showServices && (
        <div
          className="absolute left-1/2 grid -translate-x-1/2 gap-2"
          style={{
            top: 112,
            width: footprint.gridWidth,
            gridTemplateColumns: `repeat(${footprint.columns}, minmax(0, 1fr))`,
            opacity: serviceLayerOpacity,
            pointerEvents: serviceInteractive ? "auto" : "none",
            transition: "opacity 360ms ease",
          }}
        >
          {visibleServices.map((service) => (
            <button
              key={service.serviceId}
              data-service-marker
              onPointerDown={(event) => event.stopPropagation()}
              onClick={(event) => {
                event.stopPropagation();
                onServiceClick(service.serviceId);
              }}
              className="flex min-h-12 min-w-0 items-center gap-2 rounded-2xl border border-slate-200 bg-white py-2 pl-2 pr-3 text-left text-xs font-bold text-slate-800 shadow-sm hover:border-[#f60] hover:bg-orange-50"
              title={`${service.serviceName} (${service.serviceCode})`}
            >
              <span
                className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-full ${
                  ["INCIDENT", "IMPACTED"].includes(service.statusCode)
                    ? "bg-red-500 text-white"
                    : service.statusCode === "MAINTENANCE"
                      ? "bg-yellow-400 text-slate-900"
                      : "bg-cyan-400 text-slate-950"
                }`}
              >
                {["INCIDENT", "IMPACTED"].includes(service.statusCode) ? (
                  "!"
                ) : (
                  <Database size={13} />
                )}
              </span>
              <span className="min-w-0 flex-1">
                <span className="block truncate">{service.serviceName}</span>
                <span className="mt-0.5 block truncate text-[10px] font-semibold text-slate-500">
                  {service.serviceCode} ·{" "}
                  {codeLabels.serviceStatus[service.statusCode]}
                </span>
              </span>
            </button>
          ))}
          {hiddenServiceCount > 0 && (
            <div className="flex h-9 items-center justify-center rounded-full border border-slate-200 bg-slate-100 text-xs font-black text-slate-600">
              +{hiddenServiceCount}
            </div>
          )}
        </div>
      )}
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

function MapLegend({
  focusedServer,
  mapDepth,
}: {
  focusedServer?: PointServer;
  mapDepth: number;
}) {
  const depthLabel =
    mapDepth === 1
      ? "1뎁스 · 구역"
      : mapDepth === 2
        ? "2뎁스 · 서버"
        : "3뎁스 · 서비스";

  return (
    <div className="pointer-events-none absolute bottom-6 right-6 z-30 rounded-2xl border border-slate-200 bg-white p-4 text-slate-800 shadow-sm">
      <div className="flex items-center gap-2 text-sm font-bold">
        <Compass size={18} className="text-[#f60]" />
        {focusedServer
          ? focusedServer.serverName
          : depthLabel}
      </div>
      <div className="mt-2 text-xs text-slate-500">
        {focusedServer
          ? `${depthLabel} · 서비스 ${focusedServer.services.length}개`
          : "마우스 드래그로 이동 · 휠로 확대/축소"}
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

function getServerFootprint(serviceCount: number, showServices = false) {
  if (!showServices) {
    return {
      columns: 1,
      gridWidth: 0,
      width: 82,
      height: 82,
    };
  }

  const visibleCount = Math.max(1, Math.min(serviceCount, MAX_SERVICE_MARKERS));
  const columns = visibleCount <= 3 ? 1 : visibleCount <= 6 ? 2 : 3;
  const rows = Math.ceil(visibleCount / columns);
  const gridWidth = columns * 172 + Math.max(0, columns - 1) * 8;
  const height = 138 + rows * 48 + Math.max(0, rows - 1) * 8;

  return {
    columns,
    gridWidth,
    width: Math.max(240, gridWidth + 30),
    height,
  };
}

function isServerInBounds(server: PointServer, bounds: MapBounds) {
  const footprint = getServerFootprint(server.services.length);
  const halfWidth = footprint.width / 2;
  const halfHeight = footprint.height / 2;

  return (
    server.mapX + halfWidth >= bounds.left &&
    server.mapX - halfWidth <= bounds.right &&
    server.mapY + halfHeight >= bounds.top &&
    server.mapY - halfHeight <= bounds.bottom
  );
}

function clamp(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value));
}
