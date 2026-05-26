import {
  useEffect,
  useMemo,
  useRef,
  useState,
  type RefObject,
} from "react";
import {
  AlertTriangle,
  AppWindow,
  ChevronLeft,
  ChevronRight,
  ChevronsRight,
  CircleDot,
  MapPin,
  Minus,
  Plus,
  Search,
  Server,
  ShieldAlert,
  Sparkles,
  Star,
  X,
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

type FavoriteItem =
  | {
      key: string;
      type: "region";
      label: string;
      description: string;
      path: string[];
      region: LayoutRegion;
    }
  | {
      key: string;
      type: "server";
      label: string;
      description: string;
      path: string[];
      server: PointServer;
    }
  | {
      key: string;
      type: "service";
      label: string;
      description: string;
      path: string[];
      service: ServiceRecord;
    };

type NavigationListMode = "default" | "favorites" | "incidents" | "normal";

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
const FOCUS_MAX_SCALE = 0.96;
const SERVICE_DRILL_GRACE_MS = 700;
const WHEEL_BOUNDARY_THRESHOLD = 140;
const WHEEL_SEQUENCE_TIMEOUT = 520;
const WHEEL_ZOOM_SPEED = 0.001;
const MAX_SERVICE_MARKERS = 16;
const MAP_TRANSITION = "transform 620ms cubic-bezier(0.16, 1, 0.3, 1)";

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
  const [favoriteKeys, setFavoriteKeys] = useState<string[]>([]);
  const [navigationListMode, setNavigationListMode] =
    useState<NavigationListMode>("default");
  const [serverSearch, setServerSearch] = useState("");
  const viewportRef = useRef<HTMLDivElement | null>(null);
  const mapLayerRef = useRef<HTMLDivElement | null>(null);
  const mapGridRef = useRef<HTMLDivElement | null>(null);
  const wheelHandlerRef = useRef<((event: WheelEvent) => void) | null>(null);
  const wheelIntentRef = useRef({
    direction: 0,
    amount: 0,
    lastAt: 0,
  });
  const viewRef = useRef<MapView>({
    scale: INITIAL_SCALE,
    offset: { ...INITIAL_OFFSET },
  });
  const serverFocusTimerRef = useRef<number | null>(null);
  const regionFocusedAtRef = useRef(0);
  const wheelLockedUntilRef = useRef(0);
  const dragFrameRef = useRef<number | null>(null);
  const dragMovedRef = useRef(false);
  const pendingFocusCloseRef = useRef(false);
  const pendingRegionNameRef = useRef<string | null>(null);
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
  const favoriteKeySet = useMemo(() => new Set(favoriteKeys), [favoriteKeys]);
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
  const regionByFavoriteKey = useMemo(
    () =>
      new Map(
        layoutRegions.map((region) => [regionFavoriteKey(region.name), region])
      ),
    [layoutRegions]
  );
  const favoriteItems = useMemo<FavoriteItem[]>(
    () =>
      favoriteKeys.flatMap((key) => {
        const [type, id] = key.split(":");

        if (type === "region") {
          const region = regionByFavoriteKey.get(key);
          return region
            ? [
                {
                  key,
                  type,
                  label: region.name,
                  description: `서버 ${region.serverCount} · 서비스 ${region.serviceCount}`,
                  path: [region.name],
                  region,
                } satisfies FavoriteItem,
              ]
            : [];
        }

        if (type === "server") {
          const server = pointServerById.get(Number(id));
          return server
            ? [
                {
                  key,
                  type,
                  label: server.serverName,
                  description: `${server.regionName} · 서비스 ${server.services.length}`,
                  path: [server.regionName, server.serverName],
                  server,
                } satisfies FavoriteItem,
              ]
            : [];
        }

        if (type === "service") {
          const service = serviceById.get(Number(id));
          const server = service
            ? pointServerById.get(service.serverId)
            : undefined;
          return service
            ? [
                {
                  key,
                  type,
                  label: service.serviceName,
                  description: `${service.serviceCode} · ${server?.serverName ?? "서버 미지정"}`,
                  path: [
                    server?.regionName,
                    server?.serverName ?? "서버 미지정",
                    service.serviceName,
                  ].filter(Boolean) as string[],
                  service,
                } satisfies FavoriteItem,
              ]
            : [];
        }

        return [];
      }),
    [favoriteKeys, pointServerById, regionByFavoriteKey, serviceById]
  );

  const incidentServices = useMemo(
    () =>
      services.filter((service) =>
        ["INCIDENT", "IMPACTED"].includes(service.statusCode)
      ),
    [services]
  );
  const normalServices = useMemo(
    () => services.filter((service) => service.statusCode === "NORMAL"),
    [services]
  );

  const stats = useMemo(() => {
    return {
      incidentServices: incidentServices.length,
      normalServices: normalServices.length,
    };
  }, [incidentServices.length, normalServices.length]);

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
  const currentFavoriteTarget = useMemo<FavoriteItem | undefined>(() => {
    if (selectedService) {
      const server = pointServerById.get(selectedService.serverId);

      return {
        key: serviceFavoriteKey(selectedService.serviceId),
        type: "service",
        label: selectedService.serviceName,
        description: `${selectedService.serviceCode} · ${server?.serverName ?? "서버 미지정"}`,
        path: [
          server?.regionName,
          server?.serverName ?? "서버 미지정",
          selectedService.serviceName,
        ].filter(Boolean) as string[],
        service: selectedService,
      };
    }

    if (focusedServer) {
      return {
        key: serverFavoriteKey(focusedServer.serverId),
        type: "server",
        label: focusedServer.serverName,
        description: `${focusedServer.regionName} · 서비스 ${focusedServer.services.length}`,
        path: [focusedServer.regionName, focusedServer.serverName],
        server: focusedServer,
      };
    }

    if (activeRegion) {
      return {
        key: regionFavoriteKey(activeRegion.name),
        type: "region",
        label: activeRegion.name,
        description: `서버 ${activeRegion.serverCount} · 서비스 ${activeRegion.serviceCount}`,
        path: [activeRegion.name],
        region: activeRegion,
      };
    }

    return undefined;
  }, [activeRegion, focusedServer, pointServerById, selectedService]);
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

  const resetWheelIntent = () => {
    wheelIntentRef.current = {
      direction: 0,
      amount: 0,
      lastAt: 0,
    };
  };

  const lockWheel = (duration = 720) => {
    wheelLockedUntilRef.current = Math.max(
      wheelLockedUntilRef.current,
      performance.now() + duration
    );
    resetWheelIntent();
  };

  const isWheelBoundaryReached = (
    direction: number,
    amount: number,
    now: number,
    threshold = WHEEL_BOUNDARY_THRESHOLD
  ) => {
    const wheelIntent = wheelIntentRef.current;

    if (
      wheelIntent.direction !== direction ||
      now - wheelIntent.lastAt > WHEEL_SEQUENCE_TIMEOUT
    ) {
      wheelIntentRef.current = {
        direction,
        amount: 0,
        lastAt: now,
      };
    }

    wheelIntentRef.current.amount += Math.min(90, amount);
    wheelIntentRef.current.lastAt = now;

    if (wheelIntentRef.current.amount < threshold) {
      return false;
    }

    resetWheelIntent();
    return true;
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
    regionFocusedAtRef.current = performance.now();
    setFocusedServerId(null);
    setDrillingServerId(null);
    setSelectedServiceId(null);
    commitMapView(nextScale, {
      x: focus.x - region.x * nextScale,
      y: focus.y - region.y * nextScale,
    });
  };

  const focusServerAtAnchor = (
    server: PointServer,
    anchorX: number,
    anchorY: number,
    openServices = true,
    instant = false
  ) => {
    if (serverFocusTimerRef.current) {
      window.clearTimeout(serverFocusTimerRef.current);
      serverFocusTimerRef.current = null;
    }
    const focus = screenFocus(!instant);
    const focusedFootprint = getServerFootprint(server.services.length, openServices);
    const fittedScale = openServices
      ? Math.min(
          (focus.width - 120) / focusedFootprint.width,
          (focus.height - 130) / focusedFootprint.height
        )
      : SERVER_ZOOM;
    const currentScale = viewRef.current.scale;
    const nextScale = openServices
      ? clamp(
          fittedScale * (instant ? 0.82 : 0.94),
          instant ? 0.68 : 0.36,
          FOCUS_MAX_SCALE
        )
      : Math.max(currentScale, SERVER_ZOOM);
    const renderedWidth = focusedFootprint.width * nextScale;
    const renderedHeight = focusedFootprint.height * nextScale;
    const safeAnchorX = instant
      ? clamp(anchorX, renderedWidth / 2 + 24, viewportSize.width - renderedWidth / 2 - 24)
      : anchorX;
    const safeAnchorY = instant
      ? clamp(
          anchorY,
          renderedHeight / 2 + 122,
          viewportSize.height - renderedHeight / 2 - 32
        )
      : anchorY;
    setFocusedRegionName(server.regionName);
    setDrillingServerId(openServices && !instant ? server.serverId : null);
    setFocusedServerId(
      openServices && instant ? server.serverId : openServices ? null : server.serverId
    );
    setSelectedServiceId(null);
    if (openServices) {
      lockWheel(instant ? 760 : 980);
    }
    commitMapView(nextScale, {
      x: safeAnchorX - server.mapX * nextScale,
      y: safeAnchorY - server.mapY * nextScale,
    });

    if (openServices && !instant) {
      serverFocusTimerRef.current = window.setTimeout(() => {
        setFocusedServerId(server.serverId);
        setDrillingServerId(null);
        serverFocusTimerRef.current = null;
      }, 220);
    }
  };

  const focusServer = (server: PointServer, openServices = true) => {
    const focus = screenFocus(true);
    focusServerAtAnchor(server, focus.x, focus.y, openServices);
  };

  const focusService = (service: ServiceRecord) => {
    const server = pointServerById.get(service.serverId);

    if (!server) {
      setSelectedServiceId(service.serviceId);
      return;
    }

    const focus = screenFocus(true);
    focusServerAtAnchor(server, focus.x, focus.y, true);
  };

  const toggleFavorite = (key: string) => {
    setFavoriteKeys((current) =>
      current.includes(key)
        ? current.filter((favoriteKey) => favoriteKey !== key)
        : [...current, key]
    );
  };

  const focusFavorite = (item: FavoriteItem) => {
    if (item.type === "region") {
      focusRegion(item.region);
      return;
    }

    if (item.type === "server") {
      focusServer(item.server);
      return;
    }

    focusService(item.service);
  };

  const showNavigationList = (mode: NavigationListMode) => {
    setNavigationListMode((current) => (current === mode ? "default" : mode));
    setFinderOpen(true);
  };

  const resetToOverview = () => {
    setNavigationListMode("default");
    resetMapFocus();
  };

  const findServerAtViewportPoint = (
    anchorX: number,
    anchorY: number,
    allowNearest = false
  ) => {
    const currentView = viewRef.current;
    const mapX = (anchorX - currentView.offset.x) / currentView.scale;
    const mapY = (anchorY - currentView.offset.y) / currentView.scale;
    const candidates = activeRegionName
      ? activeRegionServers.filter((server) => isServerInBounds(server, mapBounds))
      : visiblePointServers;
    let nearest: { distance: number; server: PointServer } | undefined;

    for (const server of candidates) {
      const footprint = getServerFootprint(server.services.length);
      const dx = mapX - server.mapX;
      const dy = mapY - server.mapY;
      const hitWidth = Math.max(footprint.width / 2, 120);
      const hitHeight = Math.max(footprint.height / 2, 92);

      if (Math.abs(dx) <= hitWidth && Math.abs(dy) <= hitHeight) {
        return server;
      }

      const distance = Math.hypot(dx, dy);
      if (!nearest || distance < nearest.distance) {
        nearest = { distance, server };
      }
    }

    return nearest && (allowNearest || nearest.distance <= 420)
      ? nearest.server
      : undefined;
  };

  const findServerAtClientPoint = (clientX: number, clientY: number) => {
    const marker = document
      .elementsFromPoint(clientX, clientY)
      .map((element) => element.closest("[data-server-marker]"))
      .find(Boolean) as HTMLElement | undefined;
    const serverId = Number(marker?.dataset.serverId);

    if (!Number.isFinite(serverId)) {
      return undefined;
    }

    const server = pointServerById.get(serverId);

    if (!server || (activeRegionName && server.regionName !== activeRegionName)) {
      return undefined;
    }

    return server;
  };

  const findRegionAtClientPoint = (clientX: number, clientY: number) => {
    const regionElement = document
      .elementsFromPoint(clientX, clientY)
      .map((element) => element.closest("[data-region-area]"))
      .find(Boolean) as HTMLElement | undefined;
    const regionName = regionElement?.dataset.regionName;

    return regionName
      ? layoutRegions.find((region) => region.name === regionName)
      : undefined;
  };

  const findRegionAtViewportPoint = (
    anchorX: number,
    anchorY: number,
    allowNearest = false
  ) => {
    const currentView = viewRef.current;
    const mapX = (anchorX - currentView.offset.x) / currentView.scale;
    const mapY = (anchorY - currentView.offset.y) / currentView.scale;
    let nearest: { distance: number; region: LayoutRegion } | undefined;

    for (const region of layoutRegions) {
      const halfWidth = region.width / 2;
      const halfHeight = region.height / 2;
      const dx = mapX - region.x;
      const dy = mapY - region.y;

      if (Math.abs(dx) <= halfWidth && Math.abs(dy) <= halfHeight) {
        return region;
      }

      const distance = Math.hypot(dx, dy);
      if (!nearest || distance < nearest.distance) {
        nearest = { distance, region };
      }
    }

    return nearest && allowNearest ? nearest.region : undefined;
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

  const zoomAt = (nextScale: number, anchorX: number, anchorY: number) => {
    const currentView = viewRef.current;
    const mapAnchorX = (anchorX - currentView.offset.x) / currentView.scale;
    const mapAnchorY = (anchorY - currentView.offset.y) / currentView.scale;
    commitMapView(nextScale, {
      x: anchorX - mapAnchorX * nextScale,
      y: anchorY - mapAnchorY * nextScale,
    });
  };

  const handleWheel = (event: WheelEvent) => {
    if ((event.target as HTMLElement).closest("[data-map-panel]")) {
      return;
    }

    if (event.cancelable) {
      event.preventDefault();
    }
    const now = performance.now();
    if (now < wheelLockedUntilRef.current) {
      return;
    }
    const viewport = viewportRef.current;
    if (!viewport || event.deltaY === 0) {
      return;
    }

    const currentView = viewRef.current;
    const rect = viewport.getBoundingClientRect();
    const anchorX = event.clientX - rect.left;
    const anchorY = event.clientY - rect.top;
    const direction = event.deltaY < 0 ? 1 : -1;
    const wheelAmount = Math.abs(event.deltaY);
    const nextScale = currentView.scale - event.deltaY * WHEEL_ZOOM_SPEED;
    const zoomWithin = (minScale: number, maxScale: number) => {
      const boundedScale = clamp(nextScale, minScale, maxScale);

      if (Math.abs(boundedScale - currentView.scale) < 0.002) {
        return false;
      }

      resetWheelIntent();
      zoomAt(boundedScale, anchorX, anchorY);
      return true;
    };

    if (!activeRegionName && !focusedServer && !drillingServerId) {
      if (direction > 0) {
        if (zoomWithin(0.36, SERVER_ZOOM)) {
          return;
        }

        if (!isWheelBoundaryReached(direction, wheelAmount, now)) {
          return;
        }

        const targetRegion =
          findRegionAtClientPoint(event.clientX, event.clientY) ??
          findRegionAtViewportPoint(anchorX, anchorY) ??
          findRegionAtViewportPoint(
            viewportSize.width / 2,
            viewportSize.height / 2,
            true
          );

        if (targetRegion) {
          lockWheel(620);
          focusRegion(targetRegion);
        }
        return;
      }

      zoomWithin(0.36, SERVER_ZOOM);
      return;
    }

    if (direction > 0 && activeRegionName && !focusedServer && !drillingServerId) {
      if (zoomWithin(SERVER_ZOOM, SERVICE_ZOOM - 0.04)) {
        return;
      }

      if (now - regionFocusedAtRef.current <= SERVICE_DRILL_GRACE_MS) {
        return;
      }

      if (!isWheelBoundaryReached(direction, wheelAmount, now, 125)) {
        return;
      }

      const targetServer =
        findServerAtClientPoint(event.clientX, event.clientY) ??
        findServerAtViewportPoint(anchorX, anchorY);

      if (targetServer) {
        focusServerAtAnchor(targetServer, anchorX, anchorY, true, true);
        return;
      }
      return;
    }

    if (direction < 0 && (focusedServer || drillingServerId)) {
      const focusMinScale = Math.min(
        currentView.scale,
        SERVER_ZOOM + 0.08
      );

      if (zoomWithin(focusMinScale, FOCUS_MAX_SCALE)) {
        return;
      }

      if (!isWheelBoundaryReached(direction, wheelAmount, now, 125)) {
        return;
      }

      lockWheel(720);
      closeServerFocus();
      return;
    }

    if (direction < 0 && activeRegionName) {
      if (zoomWithin(SERVER_ZOOM, SERVICE_ZOOM - 0.04)) {
        return;
      }

      if (!isWheelBoundaryReached(direction, wheelAmount, now)) {
        return;
      }

      lockWheel(620);
      resetMapFocus();
      return;
    }

    if (direction > 0 && focusedServer) {
      zoomWithin(0.36, FOCUS_MAX_SCALE);
      return;
    }

    if (direction < 0 && !activeRegionName) {
      zoomWithin(0.36, SERVER_ZOOM);
      return;
    }
  };

  wheelHandlerRef.current = handleWheel;

  useEffect(() => {
    const viewport = viewportRef.current;
    if (!viewport) {
      return;
    }

    const onWheel = (event: WheelEvent) => {
      wheelHandlerRef.current?.(event);
    };

    viewport.addEventListener("wheel", onWheel, { passive: false });
    return () => viewport.removeEventListener("wheel", onWheel);
  }, []);

  const handlePointerDown = (event: React.PointerEvent<HTMLDivElement>) => {
    const target = event.target as HTMLElement;
    const regionTarget = target.closest("[data-region-area]") as HTMLElement | null;
    const serverTarget = target.closest("[data-server-marker]");
    pendingRegionNameRef.current = regionTarget?.dataset.regionName ?? null;
    pendingFocusCloseRef.current = false;

    if (target.closest("[data-map-panel]")) {
      pendingRegionNameRef.current = null;
      return;
    }
    if (target.closest("[data-service-marker]")) {
      pendingRegionNameRef.current = null;
      return;
    }
    if (serverTarget && !focusedServer && !drillingServerId) {
      pendingRegionNameRef.current = null;
      return;
    }
    if (focusedServer || drillingServerId) {
      pendingRegionNameRef.current = null;
      pendingFocusCloseRef.current = !serverTarget;
    } else if (focusedRegionName && !regionTarget) {
      pendingRegionNameRef.current = null;
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
    const pendingRegionName = pendingRegionNameRef.current;
    const pendingFocusClose = pendingFocusCloseRef.current;
    const wasMoved = dragMovedRef.current;
    pendingRegionNameRef.current = null;
    pendingFocusCloseRef.current = false;

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

    if (!wasMoved && pendingFocusClose) {
      closeServerFocus();
      return;
    }

    if (!wasMoved && pendingRegionName) {
      const targetRegion = layoutRegions.find(
        (region) => region.name === pendingRegionName
      );

      if (targetRegion) {
        focusRegion(targetRegion);
      }
    }
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
    <div className="h-[calc(100vh-88px)] min-h-[520px] overflow-hidden rounded-xl border border-slate-300 bg-slate-100 shadow-sm">
      <div
        ref={viewportRef}
        data-world-map-viewport
        className={`relative h-full select-none overflow-hidden ${
          dragging ? "cursor-grabbing" : "cursor-grab"
        }`}
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
      >
        <MapCanvas gridRef={mapGridRef} offset={offset} scale={scale} />
        <MapTopBar
          activeMode={navigationListMode}
          favoriteCount={favoriteItems.length}
          finderOpen={finderOpen}
          stats={stats}
          onModeSelect={showNavigationList}
        />

        <MapNavigationPanel
          activeRegion={activeRegion}
          activeRegionServers={activeRegionServers}
          currentFavoriteKey={currentFavoriteTarget?.key}
          currentDepth={focusedServer ? 3 : activeRegionName ? 2 : 1}
          favoriteItems={favoriteItems}
          favoriteKeys={favoriteKeySet}
          focusedServer={focusedServer}
          incidentServices={incidentServices}
          listMode={navigationListMode}
          normalServices={normalServices}
          open={finderOpen}
          regions={layoutRegions}
          searchValue={serverSearch}
          serverById={serverById}
          onOpenChange={setFinderOpen}
          onFavoriteSelect={focusFavorite}
          onFavoriteToggle={toggleFavorite}
          onIncidentServiceSelect={focusService}
          onNormalServiceSelect={focusService}
          onOverviewSelect={resetToOverview}
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
                  serviceInteractive={
                    server.serverId === focusedServerId
                      ? true
                      : serviceLayerInteractive
                  }
                  serviceLayerOpacity={
                    server.serverId === focusedServerId ? 1 : serviceLayerOpacity
                  }
                  serverInteractive={serverLayerInteractive}
                  onCloseFocus={closeServerFocus}
                  onServerClick={() => focusServer(server)}
                  onServiceClick={(serviceId) => setSelectedServiceId(serviceId)}
                />
              ))}
          </div>
        </div>

        <div
          data-map-panel
          className="absolute bottom-6 left-6 z-30 flex items-center gap-3"
          onPointerDown={(event) => event.stopPropagation()}
          onPointerUp={(event) => event.stopPropagation()}
        >
          <button
            onClick={(event) => {
              event.stopPropagation();
              zoomBy(-0.16);
            }}
            className="flex h-11 w-11 items-center justify-center rounded-full border border-slate-300 bg-white text-slate-800 shadow-sm hover:bg-slate-100"
          >
            <Minus size={20} />
          </button>
          <div className="rounded-full border border-slate-300 bg-white px-4 py-2 text-sm font-semibold text-slate-800 shadow-sm">
            {Math.round(scale * 100)}%
          </div>
          <button
            onClick={(event) => {
              event.stopPropagation();
              zoomBy(0.16);
            }}
            className="flex h-11 w-11 items-center justify-center rounded-full border border-slate-300 bg-white text-slate-800 shadow-sm hover:bg-slate-100"
          >
            <Plus size={20} />
          </button>
        </div>

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
  activeMode,
  favoriteCount,
  finderOpen,
  stats,
  onModeSelect,
}: {
  activeMode: NavigationListMode;
  favoriteCount: number;
  finderOpen: boolean;
  stats: {
    incidentServices: number;
    normalServices: number;
  };
  onModeSelect: (mode: NavigationListMode) => void;
}) {
  return (
    <div
      className={`pointer-events-none absolute right-6 top-4 z-30 flex flex-nowrap items-center justify-end gap-2 whitespace-nowrap ${
        finderOpen ? "left-[342px]" : "left-5"
      }`}
    >
      <div
        data-map-panel
        className="pointer-events-auto relative"
        onPointerDown={(event) => event.stopPropagation()}
      >
        <StatusPill
          icon={Star}
          label="즐겨찾기"
          value={favoriteCount}
          active={activeMode === "favorites"}
          tone="favorite"
          onClick={() => onModeSelect("favorites")}
        />
      </div>
      <div
        data-map-panel
        className="pointer-events-auto relative"
        onPointerDown={(event) => event.stopPropagation()}
      >
        <StatusPill
          icon={ShieldAlert}
          label="장애 서비스"
          value={stats.incidentServices}
          danger
          active={activeMode === "incidents"}
          onClick={() => onModeSelect("incidents")}
        />
      </div>
      <div
        data-map-panel
        className="pointer-events-auto relative"
        onPointerDown={(event) => event.stopPropagation()}
      >
        <StatusPill
          icon={Sparkles}
          label="정상 서비스"
          value={stats.normalServices}
          active={activeMode === "normal"}
          tone="normal"
          onClick={() => onModeSelect("normal")}
        />
      </div>
    </div>
  );
}

function StatusPill({
  icon: Icon,
  label,
  value,
  active = false,
  danger = false,
  tone = "default",
  onClick,
}: {
  icon: typeof ShieldAlert;
  label: string;
  value: number;
  active?: boolean;
  danger?: boolean;
  tone?: "default" | "favorite" | "normal";
  onClick?: () => void;
}) {
  const iconClass = danger
    ? "bg-red-100 text-red-500"
    : tone === "favorite"
      ? "bg-yellow-100 text-yellow-500"
      : "bg-cyan-100 text-cyan-500";
  const content = (
    <>
      <div
        className={`flex h-8 w-8 items-center justify-center rounded-full transition duration-200 group-hover:scale-110 group-hover:-rotate-6 ${iconClass}`}
      >
        <Icon
          size={18}
          fill={tone === "favorite" || tone === "normal" ? "currentColor" : "none"}
        />
      </div>
      <span className="whitespace-nowrap text-sm font-semibold text-slate-500 transition-colors duration-200 group-hover:text-slate-700">
        {label}
      </span>
      <span className="text-xl font-black transition duration-200 group-hover:translate-x-0.5">
        {value}
      </span>
    </>
  );

  if (onClick) {
    return (
      <button
        type="button"
        onClick={onClick}
        className={`group flex shrink-0 transform-gpu items-center gap-2 rounded-full border bg-white px-3 py-1.5 text-slate-900 shadow-sm transition duration-200 hover:-translate-y-0.5 hover:scale-[1.02] hover:shadow-md active:translate-y-0 active:scale-[0.99] ${
          active
            ? "border-[#f60] shadow-md"
            : "border-slate-200 hover:border-slate-200"
        }`}
      >
        {content}
      </button>
    );
  }

  return (
    <div className="flex shrink-0 items-center gap-2 rounded-full border border-slate-200 bg-white px-3 py-1.5 text-slate-900 shadow-sm">
      {content}
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
  activeRegionServers,
  currentFavoriteKey,
  currentDepth,
  favoriteItems,
  favoriteKeys,
  focusedServer,
  incidentServices,
  listMode,
  normalServices,
  open,
  regions,
  searchValue,
  serverById,
  onOpenChange,
  onFavoriteSelect,
  onOverviewSelect,
  onFavoriteToggle,
  onIncidentServiceSelect,
  onNormalServiceSelect,
  onRegionSelect,
  onSearchChange,
  onServerSelect,
  onServiceSelect,
}: {
  activeRegion?: LayoutRegion;
  activeRegionServers: PointServer[];
  currentFavoriteKey?: string;
  currentDepth: number;
  favoriteItems: FavoriteItem[];
  favoriteKeys: Set<string>;
  focusedServer?: PointServer;
  incidentServices: ServiceRecord[];
  listMode: NavigationListMode;
  normalServices: ServiceRecord[];
  open: boolean;
  regions: LayoutRegion[];
  searchValue: string;
  serverById: Map<number, ServerRecord>;
  onOpenChange: (open: boolean) => void;
  onFavoriteSelect: (item: FavoriteItem) => void;
  onOverviewSelect: () => void;
  onFavoriteToggle: (key: string) => void;
  onIncidentServiceSelect: (service: ServiceRecord) => void;
  onNormalServiceSelect: (service: ServiceRecord) => void;
  onRegionSelect: (region: LayoutRegion) => void;
  onSearchChange: (value: string) => void;
  onServerSelect: (server: PointServer) => void;
  onServiceSelect: (serviceId: number) => void;
}) {
  const keyword = searchValue.trim().toLowerCase();
  const filteredFavoriteItems = keyword
    ? favoriteItems.filter((item) =>
        [
          item.label,
          item.description,
          item.path.join(" "),
          favoriteTypeLabel(item.type),
        ]
          .join(" ")
          .toLowerCase()
          .includes(keyword)
      )
    : favoriteItems;
  const filteredIncidentServices = keyword
    ? incidentServices.filter((service) => {
        const server = serverById.get(service.serverId);

        return [service.serviceName, service.serviceCode, server?.serverName]
          .join(" ")
          .toLowerCase()
          .includes(keyword);
      })
    : incidentServices;
  const filteredNormalServices = keyword
    ? normalServices.filter((service) => {
        const server = serverById.get(service.serverId);

        return [service.serviceName, service.serviceCode, server?.serverName]
          .join(" ")
          .toLowerCase()
          .includes(keyword);
      })
    : normalServices;
  const depthLabel =
    listMode === "favorites"
      ? "즐겨찾기 목록"
      : listMode === "incidents"
        ? "장애 서비스 목록"
        : listMode === "normal"
          ? "정상 서비스 목록"
          : currentDepth === 1
            ? "영역 목록"
            : currentDepth === 2
              ? "서버 목록"
              : "서비스 목록";
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
    listMode === "favorites"
      ? filteredFavoriteItems.length
      : listMode === "incidents"
        ? filteredIncidentServices.length
        : listMode === "normal"
          ? filteredNormalServices.length
          : currentDepth === 1
            ? filteredRegions.length
            : currentDepth === 2
              ? filteredServers.length
              : filteredServices.length;
  const totalCount =
    listMode === "favorites"
      ? favoriteItems.length
      : listMode === "incidents"
        ? incidentServices.length
        : listMode === "normal"
          ? normalServices.length
          : currentDepth === 1
            ? regions.length
            : currentDepth === 2
              ? activeRegionServers.length
              : serverServices.length;
  const searchPlaceholder =
    listMode === "favorites"
      ? "즐겨찾기 검색"
      : listMode === "incidents"
        ? "장애 서비스 검색"
        : listMode === "normal"
          ? "정상 서비스 검색"
          : currentDepth === 1
            ? "영역명 검색"
            : currentDepth === 2
              ? "서버명, 호스트명, IP 검색"
              : "서비스명, 코드, 상태 검색";

  if (!open) {
    return (
      <button
        data-map-panel
        onClick={() => onOpenChange(true)}
        className="absolute left-4 top-4 z-30 flex h-11 items-center gap-2 rounded-full border border-slate-200 bg-white px-4 text-sm font-black text-slate-800 shadow-sm hover:border-[#f60] hover:text-[#f60]"
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
      className="absolute left-4 top-4 z-30 flex max-h-[calc(100%-104px)] w-[300px] flex-col rounded-2xl border border-slate-200 bg-white/95 text-slate-900 shadow-sm"
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
          <div className="flex shrink-0 items-center gap-2">
            {currentFavoriteKey && (
              <FavoriteButton
                active={favoriteKeys.has(currentFavoriteKey)}
                onToggle={() => onFavoriteToggle(currentFavoriteKey)}
              />
            )}
            <button
              onClick={() => onOpenChange(false)}
              className="flex h-10 w-10 items-center justify-center rounded-full bg-orange-50 text-[#f60] hover:bg-orange-100"
              title="네비게이션 접기"
            >
              <ChevronLeft size={19} />
            </button>
          </div>
        </div>

        {listMode === "default" && (activeRegion || focusedServer) && (
          <div className="mt-4 flex min-w-0 flex-nowrap items-center gap-1 overflow-hidden text-xs font-black">
          <button
            onClick={onOverviewSelect}
            className="shrink-0 rounded-full bg-slate-100 px-2.5 py-1 text-slate-600 hover:bg-orange-50 hover:text-[#f60]"
          >
            전체
          </button>
          {activeRegion && (
            <>
              <ChevronRight size={14} className="shrink-0 text-slate-300" />
              <button
                onClick={() => onRegionSelect(activeRegion)}
                className="max-w-[96px] shrink-0 truncate rounded-full bg-orange-50 px-2.5 py-1 text-[#f60] hover:bg-orange-100"
              >
                {activeRegion.name}
              </button>
            </>
          )}
          {focusedServer && (
            <>
              <ChevronRight size={14} className="shrink-0 text-slate-300" />
              <button
                onClick={() => onServerSelect(focusedServer)}
                className="min-w-0 flex-1 truncate rounded-full bg-slate-900 px-2.5 py-1 text-white"
              >
                {focusedServer.serverName}
              </button>
            </>
          )}
          </div>
        )}

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
        {listMode === "favorites" &&
          filteredFavoriteItems.map((item) => (
            <NavigationFavoriteRow
              key={item.key}
              item={item}
              onSelect={() => onFavoriteSelect(item)}
            />
          ))}

        {listMode === "incidents" &&
          filteredIncidentServices.map((service) => (
            <NavigationIncidentServiceRow
              key={service.serviceId}
              server={serverById.get(service.serverId)}
              service={service}
              onSelect={() => onIncidentServiceSelect(service)}
            />
          ))}

        {listMode === "normal" &&
          filteredNormalServices.map((service) => (
            <NavigationNormalServiceRow
              key={service.serviceId}
              server={serverById.get(service.serverId)}
              service={service}
              onSelect={() => onNormalServiceSelect(service)}
            />
          ))}

        {listMode === "default" &&
          currentDepth === 1 &&
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
              <ChevronRight size={16} className="shrink-0 text-slate-400" />
            </button>
          ))}

        {listMode === "default" &&
          currentDepth === 2 &&
          visibleServers.map((server) => (
            <NavigationServerRow
              key={server.serverId}
              server={server}
              onSelect={() => onServerSelect(server)}
            />
          ))}

        {listMode === "default" &&
          currentDepth === 3 &&
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

        {listMode === "default" &&
          currentDepth === 2 &&
          filteredServers.length > visibleServers.length && (
          <div className="px-3 py-2 text-center text-xs font-bold text-slate-400">
            검색어를 입력하면 더 정확하게 찾을 수 있습니다.
          </div>
        )}
        {listMode === "default" &&
          currentDepth === 3 &&
          filteredServices.length > visibleServices.length && (
          <div className="px-3 py-2 text-center text-xs font-bold text-slate-400">
            검색어를 입력하면 더 정확하게 찾을 수 있습니다.
          </div>
        )}
      </div>
    </aside>
  );
}

function FavoriteButton({
  active,
  onToggle,
}: {
  active: boolean;
  onToggle: () => void;
}) {
  return (
    <button
      type="button"
      onClick={(event) => {
        event.stopPropagation();
        onToggle();
      }}
      onPointerDown={(event) => event.stopPropagation()}
      className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-full transition ${
        active
          ? "bg-yellow-100 text-yellow-500 hover:bg-yellow-200"
          : "text-slate-300 hover:bg-slate-100 hover:text-yellow-500"
      }`}
      title={active ? "즐겨찾기 해제" : "즐겨찾기 추가"}
    >
      <Star size={16} fill={active ? "currentColor" : "none"} />
    </button>
  );
}

function NavigationFavoriteRow({
  item,
  onSelect,
}: {
  item: FavoriteItem;
  onSelect: () => void;
}) {
  return (
    <button
      onClick={onSelect}
      className="mb-1 flex w-full items-start gap-3 rounded-xl border border-transparent px-3 py-2.5 text-left hover:border-yellow-100 hover:bg-yellow-50"
    >
      <span className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-yellow-100 text-yellow-500">
        <Star size={15} fill="currentColor" />
      </span>
      <span className="min-w-0 flex-1">
        <span className="block truncate text-sm font-black text-slate-800">
          {item.label}
        </span>
        <span className="mt-1 flex flex-wrap items-center gap-1 text-[11px] font-black leading-4 text-slate-600">
          {item.path.map((segment, index) => (
            <span key={`${item.key}-${segment}-${index}`} className="contents">
              {index > 0 && (
                <ChevronRight size={12} className="shrink-0 text-slate-300" />
              )}
              <span className="max-w-full break-words rounded-full bg-slate-100 px-2 py-0.5">
                {segment}
              </span>
            </span>
          ))}
        </span>
        <span className="mt-0.5 block truncate text-xs font-semibold text-slate-500">
          {favoriteTypeLabel(item.type)} · {item.description}
        </span>
      </span>
      <ChevronRight size={16} className="mt-2 shrink-0 text-slate-400" />
    </button>
  );
}

function NavigationIncidentServiceRow({
  service,
  server,
  onSelect,
}: {
  service: ServiceRecord;
  server?: ServerRecord;
  onSelect: () => void;
}) {
  return (
    <button
      onClick={onSelect}
      className="mb-1 flex w-full items-start gap-3 rounded-xl border border-transparent px-3 py-2.5 text-left hover:border-red-100 hover:bg-red-50"
    >
      <span className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-red-500 text-xs font-black text-white">
        !
      </span>
      <span className="min-w-0 flex-1">
        <span className="block truncate text-sm font-black text-slate-800">
          {service.serviceName}
        </span>
        <span className="mt-0.5 block truncate text-xs font-semibold text-slate-500">
          {service.serviceCode} · {server?.serverName ?? "서버 미지정"}
        </span>
      </span>
      <ChevronRight size={16} className="mt-2 shrink-0 text-slate-400" />
    </button>
  );
}

function NavigationNormalServiceRow({
  service,
  server,
  onSelect,
}: {
  service: ServiceRecord;
  server?: ServerRecord;
  onSelect: () => void;
}) {
  return (
    <button
      onClick={onSelect}
      className="mb-1 flex w-full items-start gap-3 rounded-xl border border-transparent px-3 py-2.5 text-left hover:border-cyan-100 hover:bg-cyan-50"
    >
      <span className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-cyan-100 text-cyan-500">
        <Sparkles size={15} fill="currentColor" />
      </span>
      <span className="min-w-0 flex-1">
        <span className="block truncate text-sm font-black text-slate-800">
          {service.serviceName}
        </span>
        <span className="mt-0.5 block truncate text-xs font-semibold text-slate-500">
          {service.serviceCode} · {server?.serverName ?? "서버 미지정"}
        </span>
      </span>
      <ChevronRight size={16} className="mt-2 shrink-0 text-slate-400" />
    </button>
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
        {danger ? "!" : <AppWindow size={14} />}
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
  region,
  serverLayerOpacity,
}: {
  active: boolean;
  dimmed: boolean;
  region: LayoutRegion;
  serverLayerOpacity: number;
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
      data-region-name={region.name}
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
  onCloseFocus,
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
  onCloseFocus: () => void;
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
      data-server-id={server.serverId}
      data-server-region={server.regionName}
      className={`absolute ${
        dimmed ? "" : "transition-opacity duration-200 ease-out"
      }`}
      onPointerDown={(event) => {
        if (!focused) {
          event.stopPropagation();
        }
      }}
      onClick={(event) => {
        if (dimmed) {
          return;
        }
        event.stopPropagation();
        if (focused) {
          return;
        }
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
        transition: dimmed
          ? "none"
          : "width 460ms cubic-bezier(0.16, 1, 0.3, 1), height 460ms cubic-bezier(0.16, 1, 0.3, 1), opacity 200ms ease",
        willChange: "width, height, opacity",
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
      {focused && (
        <button
          data-map-panel
          type="button"
          onPointerDown={(event) => event.stopPropagation()}
          onClick={(event) => {
            event.stopPropagation();
            onCloseFocus();
          }}
          className="absolute right-4 top-4 z-20 flex h-9 w-9 items-center justify-center rounded-full border border-slate-200 bg-white text-slate-500 shadow-sm hover:border-[#f60] hover:text-[#f60]"
          title="3뎁스 닫기"
        >
          <X size={17} />
        </button>
      )}
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
                  <AppWindow size={13} />
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
      className="absolute right-0 top-0 z-40 flex h-full w-[min(340px,30vw)] min-w-[300px] max-w-[340px] flex-col border-l border-slate-200 bg-white text-slate-900 shadow-2xl"
    >
      <div className="flex shrink-0 items-start justify-between gap-3 border-b border-slate-200 px-4 py-4">
        <div className="min-w-0">
          <div className="text-xs font-semibold text-[#f60]">서비스 상세</div>
          <h3 className="mt-1 break-words text-xl font-black leading-tight">
            {service.serviceName}
          </h3>
        </div>
        <button
          onClick={onClose}
          className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-slate-100 text-slate-700 hover:bg-slate-200"
        >
          <X size={19} />
        </button>
      </div>

      <div className="min-h-0 flex-1 space-y-3 overflow-y-auto px-4 py-4">
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
        <div className="rounded-xl border border-slate-200 bg-slate-50 p-3">
          <div className="mb-2 flex items-center gap-2 text-xs font-bold text-slate-700">
            <ChevronsRight size={15} className="text-[#f60]" />
            설명
          </div>
          <p className="text-xs leading-5 text-slate-600">
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
      className={`rounded-xl border p-3 ${
        danger
          ? "border-red-200 bg-red-50"
          : service.statusCode === "MAINTENANCE"
            ? "border-yellow-200 bg-yellow-50"
            : "border-cyan-200 bg-cyan-50"
      }`}
    >
      <div className="flex items-center gap-3">
        <div
          className={`flex h-9 w-9 items-center justify-center rounded-full ${
            danger ? "bg-red-500 text-white" : "bg-cyan-400 text-slate-950"
          }`}
        >
          {danger ? <AlertTriangle size={18} /> : <CircleDot size={18} />}
        </div>
        <div>
          <div className="text-xs text-slate-500">상태</div>
          <div className="text-base font-black">
            {codeLabels.serviceStatus[service.statusCode]}
          </div>
        </div>
      </div>
    </div>
  );
}

function PanelItem({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5">
      <div className="text-xs font-semibold text-slate-400">{label}</div>
      <div className="mt-1 break-words text-sm font-bold leading-5 text-slate-800">
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

function regionFavoriteKey(regionName: string) {
  return `region:${regionName}`;
}

function serverFavoriteKey(serverId: number) {
  return `server:${serverId}`;
}

function serviceFavoriteKey(serviceId: number) {
  return `service:${serviceId}`;
}

function favoriteTypeLabel(type: FavoriteItem["type"]) {
  if (type === "region") {
    return "영역";
  }

  if (type === "server") {
    return "서버";
  }

  return "서비스";
}

function clamp(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value));
}
