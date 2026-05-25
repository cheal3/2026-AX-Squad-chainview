import { useEffect, useMemo, useRef, useState, type RefObject } from "react";
import {
  AlertTriangle,
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

type MapView = {
  scale: number;
  offset: {
    x: number;
    y: number;
  };
};

const MAP_WIDTH = 12000;
const MAP_HEIGHT = 8000;
const REGION_OFFSET_X = 3800;
const REGION_OFFSET_Y = 2500;
const INITIAL_SCALE = 0.42;
const INITIAL_OFFSET = { x: -1505, y: -1010 };
const SERVER_ZOOM = 0.72;
const SERVER_FADE_START = 0.58;
const SERVICE_ZOOM = 1.2;
const SERVICE_FADE_START = 1.02;
const FOCUS_SCALE = 1.34;
const MAX_SERVICE_MARKERS = 16;
const MAP_TRANSITION = "transform 760ms cubic-bezier(0.16, 1, 0.3, 1)";

const regions: Region[] = [
  {
    name: "홈페이지",
    explore: 100,
    x: 520,
    y: 620,
    width: 660,
    height: 560,
  },
  {
    name: "고객 채널",
    explore: 90,
    x: 1540,
    y: 620,
    width: 660,
    height: 560,
  },
  {
    name: "업무 시스템",
    explore: 94,
    x: 2560,
    y: 620,
    width: 660,
    height: 560,
  },
  {
    name: "데이터 플랫폼",
    explore: 100,
    x: 3580,
    y: 620,
    width: 660,
    height: 560,
  },
  {
    name: "인프라",
    explore: 100,
    x: 520,
    y: 1880,
    width: 660,
    height: 560,
  },
  {
    name: "공통 서비스",
    explore: 71,
    x: 1540,
    y: 1880,
    width: 660,
    height: 560,
  },
  {
    name: "인증/보안",
    explore: 88,
    x: 2560,
    y: 1880,
    width: 660,
    height: 560,
  },
  {
    name: "운영 관제",
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
  const [scale, setScale] = useState(INITIAL_SCALE);
  const [offset, setOffset] = useState({ ...INITIAL_OFFSET });
  const [dragging, setDragging] = useState(false);
  const [selectedServiceId, setSelectedServiceId] = useState<number | null>(
    null
  );
  const [focusedRegionName, setFocusedRegionName] = useState<string | null>(
    null
  );
  const [focusedServerId, setFocusedServerId] = useState<number | null>(null);
  const [drillingServerId, setDrillingServerId] = useState<number | null>(null);
  const [finderOpen, setFinderOpen] = useState(true);
  const [serverSearch, setServerSearch] = useState("");
  const viewportRef = useRef<HTMLDivElement | null>(null);
  const mapLayerRef = useRef<HTMLDivElement | null>(null);
  const mapGridRef = useRef<HTMLDivElement | null>(null);
  const viewRef = useRef<MapView>({
    scale: INITIAL_SCALE,
    offset: { ...INITIAL_OFFSET },
  });
  const serverFocusTimerRef = useRef<number | null>(null);
  const dragFrameRef = useRef<number | null>(null);
  const dragMovedRef = useRef(false);
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

  useEffect(() => {
    return () => {
      if (serverFocusTimerRef.current) {
        window.clearTimeout(serverFocusTimerRef.current);
      }
      if (dragFrameRef.current) {
        window.cancelAnimationFrame(dragFrameRef.current);
      }
    };
  }, []);

  useEffect(() => {
    viewRef.current = { scale, offset };
    applyMapView(mapLayerRef.current, mapGridRef.current, scale, offset, !dragging);
  }, [dragging, offset, scale]);

  const serviceById = useMemo(
    () => new Map(services.map((service) => [service.serviceId, service])),
    [services]
  );
  const serverById = useMemo(
    () => new Map(servers.map((server) => [server.serverId, server])),
    [servers]
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
    ? serverById.get(selectedService.serverId)
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

  const pointServerById = useMemo(
    () => new Map(pointServers.map((server) => [server.serverId, server])),
    [pointServers]
  );

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

  const focusedServer = focusedServerId
    ? pointServerById.get(focusedServerId)
    : undefined;
  const activeRegionName = focusedServer?.regionName ?? focusedRegionName;
  const activeRegion = activeRegionName
    ? layoutRegions.find((region) => region.name === activeRegionName)
    : undefined;
  const activeRegionServers = useMemo(() => {
    if (!activeRegionName) {
      return [];
    }

    return pointServers.filter((server) => server.regionName === activeRegionName);
  }, [activeRegionName, pointServers]);
  const visiblePointServers = useMemo(() => {
    if (serverLayerOpacity <= 0.02) {
      return [];
    }

    return pointServers.filter(
      (server) =>
        (!activeRegionName || server.regionName === activeRegionName) &&
        isServerInBounds(server, mapBounds)
    );
  }, [activeRegionName, mapBounds, pointServers, serverLayerOpacity]);

  const screenFocus = (reserveFinder = finderOpen) => {
    const leftReserved = reserveFinder ? 370 : 0;
    return {
      x: leftReserved + (viewportSize.width - leftReserved) / 2,
      y: viewportSize.height / 2,
      width: Math.max(320, viewportSize.width - leftReserved),
      height: viewportSize.height,
    };
  };

  const commitMapView = (
    nextScale: number,
    nextOffset: { x: number; y: number },
    animated = true
  ) => {
    viewRef.current = { scale: nextScale, offset: nextOffset };
    applyMapView(
      mapLayerRef.current,
      mapGridRef.current,
      nextScale,
      nextOffset,
      animated
    );
    setScale(nextScale);
    setOffset(nextOffset);
  };

  const resetMapFocus = () => {
    if (serverFocusTimerRef.current) {
      window.clearTimeout(serverFocusTimerRef.current);
      serverFocusTimerRef.current = null;
    }

    setFocusedRegionName(null);
    setFocusedServerId(null);
    setDrillingServerId(null);
    setSelectedServiceId(null);
    commitMapView(INITIAL_SCALE, { ...INITIAL_OFFSET });
  };

  const focusRegion = (region: LayoutRegion) => {
    if (serverFocusTimerRef.current) {
      window.clearTimeout(serverFocusTimerRef.current);
      serverFocusTimerRef.current = null;
    }
    const focus = screenFocus();
    const nextScale = clamp(
      Math.max(
        SERVER_ZOOM + 0.06,
        Math.min((focus.width - 120) / region.width, (focus.height - 170) / region.height)
      ),
      SERVER_ZOOM + 0.04,
      SERVICE_ZOOM - 0.1
    );
    setFocusedRegionName(region.name);
    setFocusedServerId(null);
    setDrillingServerId(null);
    setSelectedServiceId(null);
    commitMapView(nextScale, {
      x: focus.x - region.x * nextScale,
      y: focus.y - region.y * nextScale,
    });
  };

  const focusServer = (server: PointServer, openServices = true) => {
    if (serverFocusTimerRef.current) {
      window.clearTimeout(serverFocusTimerRef.current);
      serverFocusTimerRef.current = null;
    }
    const focus = screenFocus(true);
    const focusedFootprint = getServerFootprint(server.services.length, openServices);
    const fittedScale = openServices
      ? Math.min(
          (focus.width - 140) / focusedFootprint.width,
          (focus.height - 180) / focusedFootprint.height
        )
      : SERVER_ZOOM;
    const nextScale = openServices
      ? clamp(Math.max(fittedScale, FOCUS_SCALE), SERVICE_ZOOM + 0.08, 2.25)
      : Math.max(scale, SERVER_ZOOM);
    setFocusedRegionName(server.regionName);
    setFocusedServerId(null);
    setDrillingServerId(openServices ? server.serverId : null);
    setFinderOpen(true);
    setSelectedServiceId(null);
    commitMapView(nextScale, {
      x: focus.x - server.mapX * nextScale,
      y: focus.y - server.mapY * nextScale,
    });

    if (openServices) {
      serverFocusTimerRef.current = window.setTimeout(() => {
        setFocusedServerId(server.serverId);
        setDrillingServerId(null);
        serverFocusTimerRef.current = null;
      }, 680);
    } else {
      setFocusedServerId(server.serverId);
    }
  };

  const closeServerFocus = () => {
    if (serverFocusTimerRef.current) {
      window.clearTimeout(serverFocusTimerRef.current);
      serverFocusTimerRef.current = null;
    }

    const targetRegionName = focusedServer?.regionName ?? focusedRegionName;
    const targetRegion = layoutRegions.find(
      (region) => region.name === targetRegionName
    );

    if (targetRegion) {
      focusRegion(targetRegion);
      return;
    }

    setFocusedServerId(null);
    setDrillingServerId(null);
    setSelectedServiceId(null);
  };

  const handleDepthSelect = (depth: number) => {
    if (depth === 1) {
      resetMapFocus();
      return;
    }

    if (depth === 2 && activeRegion) {
      focusRegion(activeRegion);
      return;
    }

    if (depth === 3 && focusedServer) {
      focusServer(focusedServer);
    }
  };

  const zoomAt = (nextScale: number, anchorX: number, anchorY: number) => {
    const currentView = viewRef.current;
    const mapAnchorX = (anchorX - currentView.offset.x) / currentView.scale;
    const mapAnchorY = (anchorY - currentView.offset.y) / currentView.scale;
    if (nextScale < SERVICE_FADE_START) {
      if (serverFocusTimerRef.current) {
        window.clearTimeout(serverFocusTimerRef.current);
        serverFocusTimerRef.current = null;
      }
      setFocusedServerId(null);
      setDrillingServerId(null);
      setSelectedServiceId(null);
    }
    if (nextScale < SERVER_ZOOM) {
      setFocusedRegionName(null);
    }
    commitMapView(nextScale, {
      x: anchorX - mapAnchorX * nextScale,
      y: anchorY - mapAnchorY * nextScale,
    });
  };

  const handleWheel = (event: React.WheelEvent<HTMLDivElement>) => {
    event.preventDefault();
    const currentView = viewRef.current;
    const nextScale = clamp(currentView.scale - event.deltaY * 0.001, 0.36, 2.25);
    const rect = event.currentTarget.getBoundingClientRect();
    zoomAt(nextScale, event.clientX - rect.left, event.clientY - rect.top);
  };

  const handlePointerDown = (event: React.PointerEvent<HTMLDivElement>) => {
    const target = event.target as HTMLElement;
    const regionTarget = target.closest("[data-region-area]");
    if (target.closest("[data-map-panel]")) {
      return;
    }
    if (target.closest("[data-service-marker]")) {
      return;
    }
    if (target.closest("[data-server-marker]")) {
      return;
    }
    if (focusedServer || drillingServerId) {
      closeServerFocus();
      return;
    }
    if (focusedRegionName && !regionTarget) {
      setFocusedRegionName(null);
      setSelectedServiceId(null);
      return;
    }
    setSelectedServiceId(null);
    setDragging(true);
    dragMovedRef.current = false;
    event.currentTarget.setPointerCapture(event.pointerId);
    const currentView = viewRef.current;
    dragStartRef.current = {
      pointerX: event.clientX,
      pointerY: event.clientY,
      offsetX: currentView.offset.x,
      offsetY: currentView.offset.y,
    };
  };

  const handlePointerMove = (event: React.PointerEvent<HTMLDivElement>) => {
    if (!dragging) {
      return;
    }
    const start = dragStartRef.current;
    if (
      Math.abs(event.clientX - start.pointerX) > 4 ||
      Math.abs(event.clientY - start.pointerY) > 4
    ) {
      dragMovedRef.current = true;
    }
    viewRef.current = {
      ...viewRef.current,
      offset: {
        x: start.offsetX + event.clientX - start.pointerX,
        y: start.offsetY + event.clientY - start.pointerY,
      },
    };

    if (!dragFrameRef.current) {
      dragFrameRef.current = window.requestAnimationFrame(() => {
        dragFrameRef.current = null;
        const nextView = viewRef.current;
        applyMapView(
          mapLayerRef.current,
          mapGridRef.current,
          nextView.scale,
          nextView.offset,
          false
        );
      });
    }
  };

  const handlePointerUp = (event: React.PointerEvent<HTMLDivElement>) => {
    if (event.currentTarget.hasPointerCapture(event.pointerId)) {
      event.currentTarget.releasePointerCapture(event.pointerId);
    }
    if (dragFrameRef.current) {
      window.cancelAnimationFrame(dragFrameRef.current);
      dragFrameRef.current = null;
    }
    const nextView = viewRef.current;
    applyMapView(
      mapLayerRef.current,
      mapGridRef.current,
      nextView.scale,
      nextView.offset,
      false
    );
    setScale(nextView.scale);
    setOffset(nextView.offset);
    setDragging(false);
    window.setTimeout(() => {
      dragMovedRef.current = false;
    }, 0);
  };

  const zoomBy = (delta: number) => {
    const currentView = viewRef.current;
    zoomAt(
      clamp(currentView.scale + delta, 0.36, 2.25),
      viewportSize.width / 2,
      viewportSize.height / 2
    );
  };

  return (
    <div className="h-[calc(100vh-136px)] min-h-[720px] overflow-hidden rounded-2xl border border-slate-300 bg-slate-100 shadow-sm">
      <div
        ref={viewportRef}
        data-world-map-viewport
        className={`relative h-full select-none overflow-hidden ${
          dragging ? "cursor-grabbing" : "cursor-grab"
        }`}
        onWheel={handleWheel}
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
      >
        <MapCanvas gridRef={mapGridRef} offset={offset} scale={scale} />
        <MapTopBar stats={stats} />

        <MapNavigationPanel
          activeRegion={activeRegion}
          activeRegionName={activeRegionName}
          activeRegionServers={activeRegionServers}
          currentDepth={focusedServer ? 3 : activeRegionName ? 2 : 1}
          focusedServer={focusedServer}
          open={finderOpen}
          regions={layoutRegions}
          searchValue={serverSearch}
          onOpenChange={setFinderOpen}
          onDepthSelect={handleDepthSelect}
          onRegionSelect={focusRegion}
          onSearchChange={setServerSearch}
          onServerSelect={focusServer}
          onServiceSelect={setSelectedServiceId}
        />

        <div
          ref={mapLayerRef}
          data-map-layer
          className="absolute left-0 top-0 h-full w-full"
          style={{
            transform: `translate(${offset.x}px, ${offset.y}px) scale(${scale})`,
            transformOrigin: "0 0",
            transition: dragging ? "none" : MAP_TRANSITION,
            willChange: "transform",
          }}
        >
          <div
            className="relative overflow-hidden rounded-[32px]"
            style={{
              width: MAP_WIDTH,
              height: MAP_HEIGHT,
              contain: "layout paint style",
            }}
          >
            {!focusedServer &&
              layoutRegions.map((region) => (
                <RegionArea
                  key={region.name}
                  active={activeRegionName === region.name}
                  dimmed={Boolean(activeRegionName && activeRegionName !== region.name)}
                  region={region}
                  serverLayerOpacity={serverLayerOpacity}
                  shouldIgnoreClick={() => dragMovedRef.current}
                  onRegionClick={() => focusRegion(region)}
                />
              ))}

            {serverLayerOpacity > 0.02 &&
              visiblePointServers.map((server) => (
                <ServerMarker
                  key={server.serverId}
                  dimmed={
                    Boolean(activeRegionName && server.regionName !== activeRegionName) ||
                    Boolean(focusedServerId && server.serverId !== focusedServerId) ||
                    Boolean(drillingServerId && server.serverId !== drillingServerId)
                  }
                  drilling={server.serverId === drillingServerId}
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

        <MapLegend
          focusedRegionName={focusedRegionName}
          focusedServer={focusedServer}
          mapDepth={mapDepth}
        />

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

function MapCanvas({
  gridRef,
  offset,
  scale,
}: {
  gridRef: RefObject<HTMLDivElement | null>;
  offset: { x: number; y: number };
  scale: number;
}) {
  return (
    <div
      ref={gridRef}
      className="pointer-events-none absolute inset-0"
      style={getMapGridStyle(scale, offset)}
    />
  );
}

function getMapGridStyle(scale: number, offset: { x: number; y: number }) {
  const dotSize = Math.max(12, 28 * scale);
  const gridSize = Math.max(64, 140 * scale);
  const position = `${offset.x}px ${offset.y}px`;

  return {
    backgroundColor: "#f8fafc",
    backgroundImage:
      "radial-gradient(circle, rgba(15, 23, 42, 0.16) 1.2px, transparent 1.2px), linear-gradient(rgba(15, 23, 42, 0.05) 1px, transparent 1px), linear-gradient(90deg, rgba(15, 23, 42, 0.05) 1px, transparent 1px)",
    backgroundPosition: `${position}, ${position}, ${position}`,
    backgroundSize: `${dotSize}px ${dotSize}px, ${gridSize}px ${gridSize}px, ${gridSize}px ${gridSize}px`,
    willChange: "background-position, background-size",
  };
}

function applyMapView(
  mapLayer: HTMLDivElement | null,
  mapGrid: HTMLDivElement | null,
  scale: number,
  offset: { x: number; y: number },
  animated: boolean
) {
  if (mapLayer) {
    mapLayer.style.transition = animated ? MAP_TRANSITION : "none";
    mapLayer.style.transform = `translate(${offset.x}px, ${offset.y}px) scale(${scale})`;
  }

  if (mapGrid) {
    const gridStyle = getMapGridStyle(scale, offset);
    mapGrid.style.backgroundPosition = gridStyle.backgroundPosition;
    mapGrid.style.backgroundSize = gridStyle.backgroundSize;
  }
}

function MapNavigationPanel({
  activeRegion,
  activeRegionName,
  activeRegionServers,
  currentDepth,
  focusedServer,
  open,
  regions,
  searchValue,
  onOpenChange,
  onDepthSelect,
  onRegionSelect,
  onSearchChange,
  onServerSelect,
  onServiceSelect,
}: {
  activeRegion?: LayoutRegion;
  activeRegionName?: string | null;
  activeRegionServers: PointServer[];
  currentDepth: number;
  focusedServer?: PointServer;
  open: boolean;
  regions: LayoutRegion[];
  searchValue: string;
  onOpenChange: (open: boolean) => void;
  onDepthSelect: (depth: number) => void;
  onRegionSelect: (region: LayoutRegion) => void;
  onSearchChange: (value: string) => void;
  onServerSelect: (server: PointServer) => void;
  onServiceSelect: (serviceId: number) => void;
}) {
  const keyword = searchValue.trim().toLowerCase();
  const depthLabel =
    currentDepth === 1
      ? "1뎁스 · 영역"
      : currentDepth === 2
        ? "2뎁스 · 서버"
        : "3뎁스 · 서비스";
  const filteredRegions = keyword
    ? regions.filter((region) => region.name.toLowerCase().includes(keyword))
    : regions;
  const filteredServers = keyword
    ? activeRegionServers.filter((server) =>
        [
          server.serverName,
          server.hostName,
          server.ipAddress,
          server.regionName,
        ]
          .join(" ")
          .toLowerCase()
          .includes(keyword)
      )
    : activeRegionServers;
  const serverServices = focusedServer?.services ?? [];
  const filteredServices = keyword
    ? serverServices.filter((service) =>
        [
          service.serviceName,
          service.serviceCode,
          codeLabels.serviceStatus[service.statusCode],
          codeLabels.serviceType[service.serviceTypeCode],
        ]
          .join(" ")
          .toLowerCase()
          .includes(keyword)
      )
    : serverServices;
  const visibleServers = filteredServers.slice(0, 60);
  const visibleServices = filteredServices.slice(0, 60);
  const currentCount =
    currentDepth === 1
      ? filteredRegions.length
      : currentDepth === 2
        ? filteredServers.length
        : filteredServices.length;
  const totalCount =
    currentDepth === 1
      ? regions.length
      : currentDepth === 2
        ? activeRegionServers.length
        : serverServices.length;
  const searchPlaceholder =
    currentDepth === 1
      ? "영역명 검색"
      : currentDepth === 2
        ? "서버명, 호스트명, IP 검색"
        : "서비스명, 코드, 상태 검색";

  if (!open) {
    return (
      <button
        data-map-panel
        onClick={() => onOpenChange(true)}
        className="absolute left-5 top-24 z-30 flex h-12 items-center gap-2 rounded-full border border-slate-200 bg-white px-4 text-sm font-black text-slate-800 shadow-sm hover:border-[#f60] hover:text-[#f60]"
      >
        <MapPin size={18} className="text-[#f60]" />
        네비게이션
        <span className="rounded-full bg-slate-100 px-2 py-0.5 text-xs text-slate-500">
          {totalCount}
        </span>
      </button>
    );
  }

  return (
    <aside
      data-map-panel
      className="absolute left-5 top-24 z-30 flex max-h-[calc(100%-170px)] w-[330px] flex-col rounded-2xl border border-slate-200 bg-white/95 text-slate-900 shadow-sm"
    >
      <div className="border-b border-slate-200 p-4">
        <div className="flex items-center justify-between gap-3">
          <div>
            <div className="text-xs font-bold text-[#f60]">네비게이션</div>
            <div className="mt-1 text-lg font-black">
              {currentCount} / {totalCount}
            </div>
            <div className="mt-1 text-xs font-bold text-slate-500">
              {depthLabel}
            </div>
          </div>
          <button
            onClick={() => onOpenChange(false)}
            className="flex h-10 w-10 items-center justify-center rounded-full bg-orange-50 text-[#f60] hover:bg-orange-100"
            title="네비게이션 접기"
          >
            <ChevronLeft size={19} />
          </button>
        </div>

        <div className="mt-4 grid grid-cols-3 gap-1 rounded-xl bg-slate-100 p-1">
          {[1, 2, 3].map((depth) => {
            const disabled =
              (depth === 2 && !activeRegionName) ||
              (depth === 3 && !focusedServer);

            return (
              <button
                key={depth}
                disabled={disabled}
                onClick={() => onDepthSelect(depth)}
                className={`rounded-lg px-2 py-2 text-xs font-black transition ${
                  currentDepth === depth
                    ? "bg-[#f60] text-white shadow-sm"
                    : disabled
                      ? "text-slate-300"
                      : "bg-white text-slate-600 hover:text-[#f60]"
                }`}
              >
                {depth}뎁스
              </button>
            );
          })}
        </div>

        <div className="mt-3 flex min-w-0 flex-wrap items-center gap-1 text-xs font-black">
          <button
            onClick={() => onDepthSelect(1)}
            className="rounded-full bg-slate-100 px-2.5 py-1 text-slate-600 hover:bg-orange-50 hover:text-[#f60]"
          >
            전체
          </button>
          {activeRegion && (
            <>
              <ChevronRight size={14} className="text-slate-300" />
              <button
                onClick={() => onRegionSelect(activeRegion)}
                className="max-w-[150px] truncate rounded-full bg-orange-50 px-2.5 py-1 text-[#f60] hover:bg-orange-100"
              >
                {activeRegion.name}
              </button>
            </>
          )}
          {focusedServer && (
            <>
              <ChevronRight size={14} className="text-slate-300" />
              <button
                onClick={() => onServerSelect(focusedServer)}
                className="max-w-[150px] truncate rounded-full bg-slate-900 px-2.5 py-1 text-white"
              >
                {focusedServer.serverName}
              </button>
            </>
          )}
        </div>

        <label className="mt-4 flex h-10 items-center gap-2 rounded-xl border border-slate-200 bg-slate-50 px-3 focus-within:border-[#f60] focus-within:bg-white">
          <Search size={17} className="shrink-0 text-slate-400" />
          <input
            value={searchValue}
            onChange={(event) => onSearchChange(event.target.value)}
            placeholder={searchPlaceholder}
            className="min-w-0 flex-1 bg-transparent text-sm font-semibold text-slate-800 outline-none placeholder:text-slate-400"
          />
        </label>
      </div>

      <div className="min-h-0 flex-1 overflow-auto p-2">
        {currentDepth === 1 &&
          filteredRegions.map((region) => (
            <button
              key={region.name}
              onClick={() => onRegionSelect(region)}
              className="mb-1 flex w-full items-center gap-3 rounded-xl border border-transparent px-3 py-3 text-left hover:border-slate-200 hover:bg-slate-50"
            >
              <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-orange-50 text-[#f60]">
                <MapPin size={17} />
              </span>
              <span className="min-w-0 flex-1">
                <span className="block truncate text-sm font-black text-slate-800">
                  {region.name}
                </span>
                <span className="mt-0.5 block truncate text-xs font-semibold text-slate-500">
                  서버 {region.serverCount} · 서비스 {region.serviceCount}
                </span>
              </span>
              <ChevronRight size={16} className="text-slate-400" />
            </button>
          ))}

        {currentDepth === 2 &&
          visibleServers.map((server) => (
            <NavigationServerRow
              key={server.serverId}
              server={server}
              onSelect={() => onServerSelect(server)}
            />
          ))}

        {currentDepth === 3 &&
          visibleServices.map((service) => (
            <NavigationServiceRow
              key={service.serviceId}
              service={service}
              onSelect={() => onServiceSelect(service.serviceId)}
            />
          ))}

        {currentCount === 0 && (
          <div className="rounded-xl bg-slate-50 px-3 py-4 text-center text-xs font-bold text-slate-400">
            표시할 항목이 없습니다.
          </div>
        )}

        {currentDepth === 2 && filteredServers.length > visibleServers.length && (
          <div className="px-3 py-2 text-center text-xs font-bold text-slate-400">
            검색어를 입력하면 더 정확하게 찾을 수 있습니다.
          </div>
        )}
        {currentDepth === 3 && filteredServices.length > visibleServices.length && (
          <div className="px-3 py-2 text-center text-xs font-bold text-slate-400">
            검색어를 입력하면 더 정확하게 찾을 수 있습니다.
          </div>
        )}
      </div>
    </aside>
  );
}

function NavigationServerRow({
  server,
  onSelect,
}: {
  server: PointServer;
  onSelect: () => void;
}) {
  const hasIncident =
    server.statusCode === "INCIDENT" ||
    server.services.some((service) =>
      ["INCIDENT", "IMPACTED"].includes(service.statusCode)
    );

  return (
    <button
      onClick={onSelect}
      className="mb-1 flex w-full items-center gap-3 rounded-xl border border-transparent px-3 py-2.5 text-left hover:border-slate-200 hover:bg-slate-50"
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
          {server.hostName} · {server.ipAddress}
        </span>
      </span>
      <span className="rounded-full bg-slate-100 px-2 py-1 text-[11px] font-black text-slate-500">
        {server.services.length}
      </span>
    </button>
  );
}

function NavigationServiceRow({
  service,
  onSelect,
}: {
  service: ServiceRecord;
  onSelect: () => void;
}) {
  const danger = ["INCIDENT", "IMPACTED"].includes(service.statusCode);

  return (
    <button
      onClick={onSelect}
      className="mb-1 flex w-full items-start gap-2 rounded-xl border border-transparent px-3 py-2.5 text-left hover:border-slate-200 hover:bg-slate-50"
    >
      <span
        className={`mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-full ${
          danger
            ? "bg-red-500 text-white"
            : service.statusCode === "MAINTENANCE"
              ? "bg-yellow-400 text-slate-900"
              : "bg-cyan-100 text-slate-800"
        }`}
      >
        {danger ? "!" : <Database size={14} />}
      </span>
      <span className="min-w-0 flex-1">
        <span className="block truncate text-sm font-black text-slate-800">
          {service.serviceName}
        </span>
        <span className="mt-0.5 block truncate text-xs font-semibold text-slate-500">
          {service.serviceCode} · {codeLabels.serviceStatus[service.statusCode]}
        </span>
      </span>
    </button>
  );
}

function RegionArea({
  active,
  dimmed,
  onRegionClick,
  region,
  serverLayerOpacity,
  shouldIgnoreClick,
}: {
  active: boolean;
  dimmed: boolean;
  onRegionClick: () => void;
  region: LayoutRegion;
  serverLayerOpacity: number;
  shouldIgnoreClick: () => boolean;
}) {
  const regionOpacity = dimmed
    ? 0.16
    : active
      ? 0.94
      : 1 - serverLayerOpacity * 0.46;
  const labelOpacity = dimmed
    ? 0.2
    : active
      ? 1
      : clamp(1 - serverLayerOpacity * 0.75, 0.18, 1);

  return (
    <div
      data-region-area
      onClick={() => {
        if (!shouldIgnoreClick()) {
          onRegionClick();
        }
      }}
      className={`absolute cursor-pointer rounded-[28px] border-2 bg-white/42 ${
        active ? "border-solid border-[#f60]" : "border-dashed border-slate-300"
      }`}
      style={{
        left: region.x - region.width / 2,
        top: region.y - region.height / 2,
        width: region.width,
        height: region.height,
        opacity: regionOpacity,
        pointerEvents: dimmed ? "none" : "auto",
        transition: dimmed
          ? "none"
          : "opacity 360ms ease, width 360ms ease, height 360ms ease",
        contain: "layout paint style",
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
  dimmed,
  drilling,
  server,
  focused,
  layerOpacity,
  serverInteractive,
  serviceInteractive,
  serviceLayerOpacity,
  onServerClick,
  onServiceClick,
}: {
  dimmed: boolean;
  drilling: boolean;
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
  const effectiveLayerOpacity = dimmed ? layerOpacity * 0.16 : layerOpacity;
  const highlighted = focused || drilling;
  const serverStatusLabel =
    server.statusCode === "INCIDENT"
      ? "장애"
      : server.statusCode === "MAINTENANCE"
        ? "점검"
        : codeLabels.serverStatus[server.statusCode];

  return (
    <div
      data-server-marker
      data-server-region={server.regionName}
      className={`absolute ${
        dimmed ? "" : "transition-all duration-[800ms] ease-[cubic-bezier(0.22,1,0.36,1)]"
      }`}
      onPointerDown={(event) => event.stopPropagation()}
      onClick={(event) => {
        if (dimmed) {
          return;
        }
        event.stopPropagation();
        onServerClick();
      }}
      style={{
        left: server.mapX,
        top: server.mapY,
        transform: "translate(-50%, -50%)",
        width: footprint.width,
        height: footprint.height,
        opacity: effectiveLayerOpacity,
        pointerEvents: dimmed ? "none" : serverInteractive ? "auto" : "none",
        contain: "layout paint style",
        willChange: highlighted ? "width, height, opacity" : "opacity",
        zIndex: focused ? 8 : hasIncident || server.statusCode === "INCIDENT" ? 4 : 2,
      }}
    >
      <div
        className={`absolute inset-0 rounded-[24px] border bg-white/88 ${
          highlighted
            ? "border-[#f60] border-solid"
            : "border-dashed border-slate-300"
        }`}
      />
      <button
        className={`absolute left-1/2 top-3 flex -translate-x-1/2 flex-col items-center ${
          highlighted ? "text-[#f60]" : "text-slate-800"
        }`}
        type="button"
      >
        <span
          className={`relative flex h-11 w-11 items-center justify-center rounded-full border-[4px] border-white shadow-md ${
            highlighted ? "bg-[#f60] text-white" : "bg-sky-300 text-slate-900"
          }`}
        >
          <Server size={20} />
          {(hasIncident || server.statusCode === "INCIDENT") && (
            <MapExclamation />
          )}
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
        <span
          className={`mt-4 max-w-[190px] truncate rounded-full border bg-white px-3 py-1 text-xs font-black shadow-sm ${
            highlighted ? "border-orange-200" : "border-slate-200"
          }`}
        >
          {server.serverName}
        </span>
        {!showServices && (
          <span className="mt-1 max-w-[160px] truncate text-[10px] font-bold text-slate-500">
            서비스 {server.services.length} · {serverStatusLabel}
          </span>
        )}
        {showServices && (
          <span className="mt-1 max-w-[190px] truncate text-[10px] font-bold text-slate-500">
            서비스 {server.services.length} · {serverStatusLabel}
          </span>
        )}
      </button>

      {showServices && (
        <div
          className="absolute grid gap-4"
          style={{
            left: 34,
            right: 34,
            top: 132,
            bottom: 30,
            alignContent: "start",
            gridAutoRows: "minmax(88px, 1fr)",
            gridTemplateColumns: `repeat(${footprint.columns}, minmax(0, 1fr))`,
            opacity: serviceLayerOpacity,
            pointerEvents: serviceInteractive ? "auto" : "none",
            transition: "opacity 420ms ease",
            contain: "layout paint style",
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
              className="flex min-h-[88px] min-w-0 items-start gap-3 rounded-[22px] border-2 border-dashed border-slate-300 bg-white/90 p-3 text-left text-xs font-bold text-slate-800 transition hover:border-[#f60] hover:bg-orange-50"
              title={`${service.serviceName} (${service.serviceCode})`}
            >
              <span
                className={`mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-full ${
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
                <span className="mt-2 inline-flex rounded-full bg-slate-100 px-2 py-1 text-[10px] font-black text-slate-500">
                  {codeLabels.serviceType[service.serviceTypeCode]}
                </span>
              </span>
            </button>
          ))}
          {hiddenServiceCount > 0 && (
            <div className="flex min-h-[88px] items-center justify-center rounded-[22px] border-2 border-dashed border-slate-300 bg-slate-100 text-sm font-black text-slate-600">
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
      </div>
    </div>
  );
}

function MapLegend({
  focusedRegionName,
  focusedServer,
  mapDepth,
}: {
  focusedRegionName?: string | null;
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
          : focusedRegionName
            ? focusedRegionName
          : depthLabel}
      </div>
      <div className="mt-2 text-xs text-slate-500">
        {focusedServer
          ? `${depthLabel} · 서비스 ${focusedServer.services.length}개`
          : focusedRegionName
            ? `${depthLabel} · 서버 영역`
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
      width: 188,
      height: 132,
    };
  }

  const visibleCount = Math.max(1, Math.min(serviceCount, MAX_SERVICE_MARKERS));
  const columns = visibleCount <= 4 ? 2 : visibleCount <= 8 ? 3 : 4;
  const width = visibleCount <= 8 ? 800 : 860;
  const height = 560;

  return {
    columns,
    gridWidth: width - 68,
    width,
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
