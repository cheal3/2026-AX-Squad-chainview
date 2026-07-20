import { useEffect, useMemo, useRef, useState } from "react";
import { AppShell } from "../../components/AppShell.jsx";
import { ModalBackdrop } from "../../components/ModalBackdrop.jsx";
import { chainViewApi } from "../../dashboardModule/chainViewApi";
import { infraNodesSnapshot, infraRelationsSnapshot } from "../../dashboardModule/infraSnapshot";

const infraNodeTypeLabels = {
  RACK: "랙/위치",
  PHYSICAL_HOST: "물리 호스트",
  HYPERVISOR: "하이퍼바이저",
  NETWORK_DEVICE: "네트워크 장비",
  STORAGE: "스토리지",
  DB_CLUSTER: "DB 클러스터",
};

const infraStatusLabels = {
  NORMAL: "정상",
  INCIDENT: "장애",
  MAINTENANCE: "점검중",
  INACTIVE: "비활성",
};

const initialInfraNodes = infraNodesSnapshot;

const infraRelationTypeLabels = {
  CONTAINS: "포함",
  NETWORK_LINK: "네트워크 연결",
  STORAGE: "스토리지 연결",
  NETWORK: "네트워크 연결",
  HOSTING: "호스팅/가상화",
  STORAGE_PATH: "스토리지 경로",
  DB_REPLICATION: "DB 복제",
  DEPENDENCY: "인프라 의존",
};

const infraRelationStatusLabels = {
  ACTIVE: "활성",
  INACTIVE: "비활성",
  MAINTENANCE: "점검중",
};

const initialInfraRelations = infraRelationsSnapshot;

const shouldUseRemoteInfraApi = () => !import.meta.env.DEV && typeof window !== "undefined";

const normalizeInfraNode = (node) => ({
  infraNodeId: Number(node.infraNodeId ?? node.id),
  nodeCode: node.nodeCode ?? "",
  nodeName: node.nodeName ?? "",
  nodeTypeCode: node.nodeTypeCode ?? "PHYSICAL_HOST",
  nodeTypeName: node.nodeTypeName,
  statusCode: node.statusCode ?? "NORMAL",
  statusName: node.statusName,
  locationLabel: node.locationLabel ?? "",
  vendorModel: node.vendorModel ?? "",
  serverCount: Number(node.serverCount ?? 0),
  updatedAt: node.updatedAt,
});

const normalizeInfraRelation = (edge) => ({
  infraRelationId: Number(edge.infraEdgeId ?? edge.infraRelationId ?? edge.id),
  sourceInfraNodeId: Number(edge.fromNodeId ?? edge.sourceInfraNodeId),
  targetInfraNodeId: Number(edge.toNodeId ?? edge.targetInfraNodeId),
  relationTypeCode: edge.relationTypeCode ?? "NETWORK_LINK",
  relationTypeName: edge.relationTypeName,
  mandatoryYn: edge.mandatoryYn ?? "Y",
  relationStatusCode: edge.statusCode ?? edge.relationStatusCode ?? "ACTIVE",
  relationStatusName: edge.statusName ?? edge.relationStatusName,
  description: edge.remarks ?? edge.description ?? "",
});

async function fetchInfraNodesFromApi() {
  const nodes = await chainViewApi.infraNodes.list();
  return nodes.map(normalizeInfraNode).filter((node) => node.infraNodeId);
}

async function fetchInfraRelationsFromApi(nodes) {
  const edgeLists = await Promise.all(
    nodes.map((node) =>
      chainViewApi.infraNodes.edges(Number(node.infraNodeId)).catch(() => [])
    )
  );
  const edgeById = new Map();
  edgeLists.flat().forEach((edge) => {
    const relation = normalizeInfraRelation(edge);
    if (!relation.infraRelationId || !relation.sourceInfraNodeId || !relation.targetInfraNodeId) return;
    edgeById.set(relation.infraRelationId, relation);
  });
  return [...edgeById.values()].sort((left, right) => left.infraRelationId - right.infraRelationId);
}

function remoteErrorMessage(error, fallback) {
  if (error instanceof Error && error.message) {
    return error.message;
  }
  return fallback;
}

function notifyInfraMutationFailure(error, fallback) {
  window.alert(remoteErrorMessage(error, fallback));
}

function buildInfraNodePayload(form) {
  return {
    nodeCode: String(form.nodeCode ?? "").trim(),
    nodeName: String(form.nodeName ?? "").trim(),
    nodeTypeCode: form.nodeTypeCode,
    statusCode: form.statusCode,
    locationLabel: String(form.locationLabel ?? "").trim(),
    vendorModel: String(form.vendorModel ?? "").trim(),
    serverCount: Number(form.serverCount) || 0,
  };
}

function buildInfraRelationPayload(form) {
  return {
    fromNodeId: Number(form.sourceInfraNodeId),
    toNodeId: Number(form.targetInfraNodeId),
    relationTypeCode: form.relationTypeCode,
    mandatoryYn: form.mandatoryYn,
    statusCode: form.relationStatusCode,
    remarks: String(form.description ?? "").trim(),
  };
}

export function InfraRelationsPage() {
  const [nodes, setNodes] = useState(initialInfraNodes);
  const [relations, setRelations] = useState(initialInfraRelations);
  const [keyword, setKeyword] = useState("");
  const [typeFilter, setTypeFilter] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [modal, setModal] = useState(null);
  const [graphOpen, setGraphOpen] = useState(false);
  const [graphFocusNodeId, setGraphFocusNodeId] = useState(initialInfraNodes[0]?.infraNodeId ?? "");
  const [dataSourceLabel, setDataSourceLabel] = useState("스냅샷 기준");
  const nodeById = useMemo(
    () => new Map(nodes.map((node) => [node.infraNodeId, node])),
    [nodes]
  );
  useEffect(() => {
    if (!shouldUseRemoteInfraApi()) return;
    let cancelled = false;
    (async () => {
      try {
        const nextNodes = await fetchInfraNodesFromApi();
        const nextRelations = await fetchInfraRelationsFromApi(nextNodes);
        if (cancelled) return;
        setNodes(nextNodes);
        setRelations(nextRelations);
        setGraphFocusNodeId((current) => nextNodes.some((node) => Number(node.infraNodeId) === Number(current)) ? current : nextNodes[0]?.infraNodeId ?? "");
        setDataSourceLabel("운영 API 기준");
      } catch (error) {
        console.warn("인프라 관계 API 조회 실패, 스냅샷 데이터를 사용합니다.", error);
        if (!cancelled) setDataSourceLabel("스냅샷 기준");
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);
  const filteredRelations = relations.filter((relation) => {
    const sourceNode = nodeById.get(Number(relation.sourceInfraNodeId));
    const targetNode = nodeById.get(Number(relation.targetInfraNodeId));
    const haystack = `${relation.infraRelationId} ${sourceNode?.nodeCode} ${sourceNode?.nodeName} ${targetNode?.nodeCode} ${targetNode?.nodeName} ${relation.description}`.toLowerCase();
    if (keyword.trim() && !haystack.includes(keyword.trim().toLowerCase())) return false;
    if (typeFilter && relation.relationTypeCode !== typeFilter) return false;
    if (statusFilter && relation.relationStatusCode !== statusFilter) return false;
    return true;
  });
  const nodeLabel = (nodeId) => {
    const node = nodeById.get(Number(nodeId));
    return node ? `${node.nodeCode} ${node.nodeName}` : "노드 미지정";
  };
  const openCreateModal = () => {
    setModal({
      mode: "create",
      form: {
        sourceInfraNodeId: nodes[0]?.infraNodeId ?? "",
        targetInfraNodeId: nodes[1]?.infraNodeId ?? "",
        relationTypeCode: "NETWORK_LINK",
        mandatoryYn: "Y",
        relationStatusCode: "ACTIVE",
        description: "",
      },
    });
  };
  const openEditModal = (relation) => setModal({ mode: "edit", form: { ...relation } });
  const updateModalField = (fieldName, value) => {
    setModal((current) => current ? { ...current, form: { ...current.form, [fieldName]: value } } : current);
  };
  const saveModal = async () => {
    const form = modal?.form;
    if (!form?.sourceInfraNodeId || !form?.targetInfraNodeId) {
      window.alert("source/target 인프라 노드를 선택해주세요.");
      return;
    }
    if (Number(form.sourceInfraNodeId) === Number(form.targetInfraNodeId)) {
      window.alert("source와 target 인프라 노드는 달라야 합니다.");
      return;
    }
    const nextRelation = {
      ...form,
      sourceInfraNodeId: Number(form.sourceInfraNodeId),
      targetInfraNodeId: Number(form.targetInfraNodeId),
    };
    if (modal.mode === "edit") {
      setRelations((current) => current.map((relation) => relation.infraRelationId === form.infraRelationId ? nextRelation : relation));
      setModal(null);
      if (shouldUseRemoteInfraApi()) {
        try {
          await chainViewApi.infraNodes.deleteEdge(Number(form.infraRelationId));
          const createdRelation = normalizeInfraRelation(await chainViewApi.infraNodes.createEdge(buildInfraRelationPayload(nextRelation)));
          setRelations((current) => current.map((relation) => relation.infraRelationId === form.infraRelationId ? { ...nextRelation, ...createdRelation } : relation));
        } catch (error) {
          setRelations(relations);
          notifyInfraMutationFailure(error, "인프라 관계 수정 API 호출에 실패했습니다.");
        }
      }
    } else {
      const nextId = Math.max(...relations.map((relation) => relation.infraRelationId), 0) + 1;
      const optimisticRelation = { ...nextRelation, infraRelationId: nextId };
      setRelations((current) => [optimisticRelation, ...current]);
      setModal(null);
      if (shouldUseRemoteInfraApi()) {
        try {
          const createdRelation = normalizeInfraRelation(await chainViewApi.infraNodes.createEdge(buildInfraRelationPayload(nextRelation)));
          setRelations((current) => current.map((relation) => relation.infraRelationId === nextId ? { ...optimisticRelation, ...createdRelation } : relation));
        } catch (error) {
          setRelations(relations);
          notifyInfraMutationFailure(error, "인프라 관계 등록 API 호출에 실패했습니다.");
        }
      }
    }
  };
  const deleteRelation = async (relation) => {
    if (!window.confirm(`${nodeLabel(relation.sourceInfraNodeId)} → ${nodeLabel(relation.targetInfraNodeId)} 관계를 삭제할까요?`)) return;
    setRelations((current) => current.filter((item) => item.infraRelationId !== relation.infraRelationId));
    if (shouldUseRemoteInfraApi()) {
      try {
        await chainViewApi.infraNodes.deleteEdge(Number(relation.infraRelationId));
      } catch (error) {
        setRelations(relations);
        notifyInfraMutationFailure(error, "인프라 관계 삭제 API 호출에 실패했습니다.");
      }
    }
  };

  return (
    <AppShell activeMenu="infra-relations">
      <main className="main infra-page">
        <div className="page-header-stack">
          <div className="crumb crumb--standardized"><span>인프라</span><span className="sep">/</span><span>인프라 관계조회</span></div>
          <div className="page-head page-head--standardized">
            <div>
              <h1 className="page-head__title"><span className="page-head__icon" aria-hidden="true">🔌</span><span>인프라 관계조회</span></h1>
            </div>
            <div className="page-head__right">
              <button className="btn" onClick={() => setGraphOpen(true)} type="button">🗺️ 관계도 보기</button>
              <button className="btn">📥 CSV 내보내기</button>
              <button className="btn btn--primary" onClick={openCreateModal} type="button">＋ 관계 등록</button>
            </div>
          </div>
        </div>

        <div className="toolbar">
          <div className="search">🔍<input type="text" value={keyword} onChange={(event) => setKeyword(event.target.value)} placeholder="노드 코드, 이름, 설명 검색..." /></div>
          <select value={typeFilter} onChange={(event) => setTypeFilter(event.target.value)}>
            <option value="">관계 유형 전체</option>
            {Object.entries(infraRelationTypeLabels).map(([code, label]) => <option key={code} value={code}>{label}</option>)}
          </select>
          <select value={statusFilter} onChange={(event) => setStatusFilter(event.target.value)}>
            <option value="">상태 전체</option>
            {Object.entries(infraRelationStatusLabels).map(([code, label]) => <option key={code} value={code}>{label}</option>)}
          </select>
          <div className="right"><button className="btn btn--ghost btn--sm" onClick={() => { setKeyword(""); setTypeFilter(""); setStatusFilter(""); }} type="button">초기화</button></div>
        </div>

        <div className="card">
          <table className="tbl infra-table">
            <thead>
              <tr>
                <th>relationId</th><th>source 인프라</th><th>target 인프라</th><th>관계 유형</th><th>필수</th><th>상태</th><th>설명</th><th className="col-actions">관리</th>
              </tr>
            </thead>
            <tbody>
              {filteredRelations.map((relation) => (
                <tr key={relation.infraRelationId}>
                  <td><code>{relation.infraRelationId}</code></td>
                  <td>{formatInfraNodeCell(nodeById.get(Number(relation.sourceInfraNodeId)))}</td>
                  <td>{formatInfraNodeCell(nodeById.get(Number(relation.targetInfraNodeId)))}</td>
                  <td>{infraRelationTypeLabels[relation.relationTypeCode] || relation.relationTypeCode}</td>
                  <td><span className={`pill ${relation.mandatoryYn === "Y" ? "pill--crit" : "pill--gray"}`}>{relation.mandatoryYn === "Y" ? "필수" : "선택"}</span></td>
                  <td><InfraRelationStatusBadge code={relation.relationStatusCode} /></td>
                  <td>{relation.description || "-"}</td>
                  <td className="col-actions">
                    <div className="row-actions">
                      <button className="ibtn" onClick={() => openEditModal(relation)} title="수정" type="button">✏️</button>
                      <button className="ibtn ibtn--danger" onClick={() => deleteRelation(relation)} title="삭제" type="button">🗑</button>
                    </div>
                  </td>
                </tr>
              ))}
              {!filteredRelations.length ? <tr><td colSpan={8}><div className="empty">조회된 인프라 관계가 없습니다.</div></td></tr> : null}
            </tbody>
          </table>
          <div className="pager">
            <div className="pager__info">전체 {filteredRelations.length}건 · {dataSourceLabel}</div>
          </div>
        </div>

        {modal ? (
          <ModalBackdrop onClose={() => setModal(null)}>
            <div className="modal" onClick={(event) => event.stopPropagation()}>
              <div className="modal__head">
                <h3>{modal.mode === "edit" ? "✏️ 인프라 관계 수정" : "＋ 인프라 관계 등록"}</h3>
                <button className="close" onClick={() => setModal(null)} type="button">×</button>
              </div>
              <div className="modal__body">
                <div className="form-section">
                  <h4 className="form-section__title">연결 인프라</h4>
                  <div className="form-grid">
                    <div className="form-row"><label>source 인프라<span className="req">*</span></label><select value={modal.form.sourceInfraNodeId} onChange={(event) => updateModalField("sourceInfraNodeId", event.target.value)}>{nodes.map((node) => <option key={node.infraNodeId} value={node.infraNodeId}>{node.nodeCode} {node.nodeName}</option>)}</select><span className="help">영향을 주는 쪽</span></div>
                    <div className="form-row"><label>target 인프라<span className="req">*</span></label><select value={modal.form.targetInfraNodeId} onChange={(event) => updateModalField("targetInfraNodeId", event.target.value)}>{nodes.map((node) => <option key={node.infraNodeId} value={node.infraNodeId}>{node.nodeCode} {node.nodeName}</option>)}</select><span className="help">영향을 받는 쪽</span></div>
                    <div className="form-row"><label>관계 유형<span className="req">*</span></label><select value={modal.form.relationTypeCode} onChange={(event) => updateModalField("relationTypeCode", event.target.value)}>{Object.entries(infraRelationTypeLabels).map(([code, label]) => <option key={code} value={code}>{label} ({code})</option>)}</select></div>
                    <div className="form-row"><label>상태</label><select value={modal.form.relationStatusCode} onChange={(event) => updateModalField("relationStatusCode", event.target.value)}>{Object.entries(infraRelationStatusLabels).map(([code, label]) => <option key={code} value={code}>{label} ({code})</option>)}</select></div>
                    <div className="form-row"><label>필수 여부</label><select value={modal.form.mandatoryYn} onChange={(event) => updateModalField("mandatoryYn", event.target.value)}><option value="Y">Y (필수)</option><option value="N">N (선택)</option></select></div>
                  </div>
                  <div className="form-row"><label>설명</label><textarea value={modal.form.description} onChange={(event) => updateModalField("description", event.target.value)} placeholder="장애 발생 시 어떤 인프라 영향이 있는지 작성" /></div>
                </div>
              </div>
              <div className="modal__foot"><button className="btn" onClick={() => setModal(null)} type="button">취소</button><button className="btn btn--primary" onClick={saveModal} type="button">저장</button></div>
            </div>
          </ModalBackdrop>
        ) : null}
        {graphOpen ? (
          <InfraRelationGraphModal
            focusNodeId={Number(graphFocusNodeId)}
            nodeById={nodeById}
            nodes={nodes}
            onClose={() => setGraphOpen(false)}
            onFocusChange={(nodeId) => setGraphFocusNodeId(Number(nodeId))}
            relations={relations}
          />
        ) : null}
      </main>
    </AppShell>
  );
}

function InfraRelationGraphModal({
  focusNodeId,
  nodeById,
  nodes,
  onClose,
  onFocusChange,
  relations,
}) {
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const [zoom, setZoom] = useState(1);
  const [dragStart, setDragStart] = useState(null);
  const canvasRef = useRef(null);
  const focusNode = nodeById.get(Number(focusNodeId)) ?? nodes[0];
  const connectedRelations = relations.filter(
    (relation) =>
      Number(relation.sourceInfraNodeId) === Number(focusNode?.infraNodeId) ||
      Number(relation.targetInfraNodeId) === Number(focusNode?.infraNodeId)
  );
  const incomingRelations = connectedRelations.filter(
    (relation) => Number(relation.targetInfraNodeId) === Number(focusNode?.infraNodeId)
  );
  const outgoingRelations = connectedRelations.filter(
    (relation) => Number(relation.sourceInfraNodeId) === Number(focusNode?.infraNodeId)
  );
  const nodeWidth = 220;
  const nodeHeight = 86;
  const anchorPadding = 18;
  const positions = new Map();
  const center = { x: 410, y: 220 };
  positions.set(`node-${focusNode?.infraNodeId}`, center);
  incomingRelations.forEach((relation, index) => {
    positions.set(`node-${relation.sourceInfraNodeId}`, {
      x: 70,
      y: 110 + index * 136,
    });
  });
  outgoingRelations.forEach((relation, index) => {
    positions.set(`node-${relation.targetInfraNodeId}`, {
      x: 750,
      y: 110 + index * 136,
    });
  });
  const graphNodes = [...positions.entries()].map(([key, position]) => {
    const nodeId = Number(key.replace("node-", ""));
    return { node: nodeById.get(nodeId), position };
  }).filter((item) => item.node);
  useEffect(() => {
    setPan({ x: 0, y: 0 });
    setZoom(1);
    setDragStart(null);
  }, [focusNodeId]);
  const getFocusAnchorY = (relation) => {
    const list = Number(relation.targetInfraNodeId) === Number(focusNode?.infraNodeId)
      ? incomingRelations
      : outgoingRelations;
    const index = Math.max(0, list.findIndex((item) => item.infraRelationId === relation.infraRelationId));
    const count = Math.max(list.length, 1);
    if (count === 1) {
      return center.y + nodeHeight / 2;
    }
    const usableHeight = nodeHeight - anchorPadding * 2;
    return center.y + anchorPadding + (usableHeight * index) / (count - 1);
  };
  const getAnchorPoint = (nodeId, side, relation) => {
    const position = positions.get(`node-${nodeId}`);
    if (!position) return null;
    const isFocus = Number(nodeId) === Number(focusNode?.infraNodeId);
    return {
      x: side === "right" ? position.x + nodeWidth : position.x,
      y: isFocus && relation ? getFocusAnchorY(relation) : position.y + nodeHeight / 2,
    };
  };
  const edgePath = (sourceId, targetId) => {
    const relation = connectedRelations.find(
      (item) =>
        Number(item.sourceInfraNodeId) === Number(sourceId) &&
        Number(item.targetInfraNodeId) === Number(targetId)
    );
    const source = positions.get(`node-${sourceId}`);
    const target = positions.get(`node-${targetId}`);
    if (!source || !target) return "";
    const sourceCenterX = source.x + nodeWidth / 2;
    const targetCenterX = target.x + nodeWidth / 2;
    const sourceIsLeft = sourceCenterX < targetCenterX;
    const start = getAnchorPoint(sourceId, sourceIsLeft ? "right" : "left", relation);
    const end = getAnchorPoint(targetId, sourceIsLeft ? "left" : "right", relation);
    if (!start || !end) return "";
    const distance = Math.abs(end.x - start.x);
    const curve = Math.min(160, Math.max(34, distance * 0.36));
    const controlOneX = sourceIsLeft ? start.x + curve : start.x - curve;
    const controlTwoX = sourceIsLeft ? end.x - curve : end.x + curve;
    return `M ${start.x} ${start.y} C ${controlOneX} ${start.y}, ${controlTwoX} ${end.y}, ${end.x} ${end.y}`;
  };
  const startCanvasDrag = (event) => {
    if (event.target.closest(".infra-graph-node")) return;
    setDragStart({
      mouseX: event.clientX,
      mouseY: event.clientY,
      panX: pan.x,
      panY: pan.y,
    });
  };
  const moveCanvasDrag = (event) => {
    if (!dragStart) return;
    setPan({
      x: dragStart.panX + event.clientX - dragStart.mouseX,
      y: dragStart.panY + event.clientY - dragStart.mouseY,
    });
  };
  const stopCanvasDrag = () => setDragStart(null);
  const setZoomAroundPoint = (nextZoom, originX = 520, originY = 260) => {
    const clampedZoom = Math.min(1.8, Math.max(0.45, nextZoom));
    setPan((currentPan) => {
      const worldX = (originX - currentPan.x) / zoom;
      const worldY = (originY - currentPan.y) / zoom;
      return {
        x: originX - worldX * clampedZoom,
        y: originY - worldY * clampedZoom,
      };
    });
    setZoom(clampedZoom);
  };
  const handleCanvasWheel = (event) => {
    event.preventDefault();
    const rect = canvasRef.current?.getBoundingClientRect();
    const originX = rect ? event.clientX - rect.left : 520;
    const originY = rect ? event.clientY - rect.top : 260;
    const direction = event.deltaY > 0 ? -1 : 1;
    setZoomAroundPoint(zoom + direction * 0.12, originX, originY);
  };
  const resetViewport = () => {
    setPan({ x: 0, y: 0 });
    setZoom(1);
  };

  return (
    <ModalBackdrop onClose={onClose}>
      <div className="modal modal--xl infra-graph-modal" onClick={(event) => event.stopPropagation()}>
        <div className="modal__head">
          <h3>🗺️ 인프라 관계도</h3>
          <button className="close" onClick={onClose} type="button">×</button>
        </div>
        <div className="modal__body">
          <div className="infra-graph-toolbar">
            <label>
              기준 인프라
              <select value={focusNode?.infraNodeId ?? ""} onChange={(event) => onFocusChange(event.target.value)}>
                {nodes.map((node) => (
                  <option key={node.infraNodeId} value={node.infraNodeId}>{node.nodeCode} {node.nodeName}</option>
                ))}
              </select>
            </label>
            <span>{incomingRelations.length}개 수신 · {outgoingRelations.length}개 송신</span>
          </div>
          <div
            className={`infra-graph-canvas ${dragStart ? "is-dragging" : ""}`}
            ref={canvasRef}
            onMouseDown={startCanvasDrag}
            onMouseLeave={stopCanvasDrag}
            onMouseMove={moveCanvasDrag}
            onMouseUp={stopCanvasDrag}
            onWheel={handleCanvasWheel}
          >
            <div className="infra-graph-zoom-controls" onMouseDown={(event) => event.stopPropagation()}>
              <button onClick={() => setZoomAroundPoint(zoom + 0.14)} type="button">＋</button>
              <button onClick={() => setZoomAroundPoint(zoom - 0.14)} type="button">−</button>
              <button onClick={resetViewport} type="button">초기화</button>
            </div>
            <div
              className="infra-graph-stage"
              style={{ transform: `translate(${pan.x}px, ${pan.y}px) scale(${zoom})` }}
            >
              <svg viewBox="0 0 1040 520" aria-hidden="true">
                {connectedRelations.map((relation) => (
                  <path
                    className="infra-graph-edge"
                    d={edgePath(relation.sourceInfraNodeId, relation.targetInfraNodeId)}
                    key={relation.infraRelationId}
                  />
                ))}
              </svg>
              {graphNodes.map(({ node, position }) => (
                <button
                  className={`infra-graph-node ${Number(node.infraNodeId) === Number(focusNode?.infraNodeId) ? "is-focus" : ""}`}
                  key={node.infraNodeId}
                  onClick={() => onFocusChange(node.infraNodeId)}
                  style={{ left: position.x, top: position.y }}
                  type="button"
                >
                  <b>{node.nodeName}</b>
                  <code>{node.nodeCode}</code>
                  <span>{infraNodeTypeLabels[node.nodeTypeCode] || node.nodeTypeCode}</span>
                </button>
              ))}
            </div>
            {!graphNodes.length ? (
              <div className="infra-graph-empty">선택한 인프라에 연결된 관계가 없습니다.</div>
            ) : null}
          </div>
        </div>
        <div className="modal__foot">
          <button className="btn btn--primary" onClick={onClose} type="button">확인</button>
        </div>
      </div>
    </ModalBackdrop>
  );
}

export function InfraTopologyPage() {
  const [nodes, setNodes] = useState(initialInfraNodes);
  const [keyword, setKeyword] = useState("");
  const [typeFilter, setTypeFilter] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [modal, setModal] = useState(null);
  const [dataSourceLabel, setDataSourceLabel] = useState("스냅샷 기준");
  useEffect(() => {
    if (!shouldUseRemoteInfraApi()) return;
    let cancelled = false;
    (async () => {
      try {
        const nextNodes = await fetchInfraNodesFromApi();
        if (cancelled) return;
        setNodes(nextNodes);
        setDataSourceLabel("운영 API 기준");
      } catch (error) {
        console.warn("인프라 노드 API 조회 실패, 스냅샷 데이터를 사용합니다.", error);
        if (!cancelled) setDataSourceLabel("스냅샷 기준");
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);
  const filteredNodes = nodes.filter((node) => {
    const haystack = `${node.nodeCode} ${node.nodeName} ${node.locationLabel} ${node.vendorModel}`.toLowerCase();
    if (keyword.trim() && !haystack.includes(keyword.trim().toLowerCase())) return false;
    if (typeFilter && node.nodeTypeCode !== typeFilter) return false;
    if (statusFilter && node.statusCode !== statusFilter) return false;
    return true;
  });
  const openCreateModal = () => {
    setModal({
      mode: "create",
      form: {
        nodeCode: "",
        nodeName: "",
        nodeTypeCode: "PHYSICAL_HOST",
        statusCode: "NORMAL",
        locationLabel: "",
        vendorModel: "",
        serverCount: 0,
      },
    });
  };
  const openEditModal = (node) => {
    setModal({ mode: "edit", form: { ...node } });
  };
  const updateModalField = (field, value) => {
    setModal((current) => current ? { ...current, form: { ...current.form, [field]: value } } : current);
  };
  const saveModal = async () => {
    const form = modal?.form;
    if (!form?.nodeCode?.trim() || !form?.nodeName?.trim()) {
      window.alert("노드 코드와 노드 이름은 필수입니다.");
      return;
    }
    const payload = buildInfraNodePayload(form);
    if (modal.mode === "edit") {
      const optimisticNode = { ...form, ...payload };
      setNodes((current) => current.map((node) => node.infraNodeId === form.infraNodeId ? optimisticNode : node));
      setModal(null);
      if (shouldUseRemoteInfraApi()) {
        try {
          const updatedNode = normalizeInfraNode(await chainViewApi.infraNodes.update(Number(form.infraNodeId), payload));
          setNodes((current) => current.map((node) => node.infraNodeId === form.infraNodeId ? { ...optimisticNode, ...updatedNode } : node));
        } catch (error) {
          setNodes(nodes);
          notifyInfraMutationFailure(error, "인프라 노드 수정 API 호출에 실패했습니다.");
        }
      }
    } else {
      const nextId = Math.max(...nodes.map((node) => node.infraNodeId), 0) + 1;
      const optimisticNode = { ...payload, infraNodeId: nextId };
      setNodes((current) => [optimisticNode, ...current]);
      setModal(null);
      if (shouldUseRemoteInfraApi()) {
        try {
          const createdNode = normalizeInfraNode(await chainViewApi.infraNodes.create(payload));
          setNodes((current) => current.map((node) => node.infraNodeId === nextId ? { ...optimisticNode, ...createdNode } : node));
        } catch (error) {
          setNodes(nodes);
          notifyInfraMutationFailure(error, "인프라 노드 등록 API 호출에 실패했습니다.");
        }
      }
    }
  };
  const deleteNode = async (node) => {
    if (!window.confirm(`${node.nodeName} 노드를 삭제할까요?`)) return;
    setNodes((current) => current.filter((item) => item.infraNodeId !== node.infraNodeId));
    if (shouldUseRemoteInfraApi()) {
      try {
        await chainViewApi.infraNodes.delete(Number(node.infraNodeId));
      } catch (error) {
        setNodes(nodes);
        notifyInfraMutationFailure(error, "인프라 노드 삭제 API 호출에 실패했습니다.");
      }
    }
  };

  return (
    <AppShell activeMenu="infra-topology">
      <main className="main infra-page">
        <div className="page-header-stack">
          <div className="crumb crumb--standardized"><span>인프라</span><span className="sep">/</span><span>인프라 토폴로지</span></div>
          <div className="page-head page-head--standardized">
            <div>
              <h1 className="page-head__title"><span className="page-head__icon" aria-hidden="true">🧱</span><span>인프라 토폴로지</span></h1>
            </div>
            <div className="page-head__right">
              <button className="btn btn--primary" onClick={openCreateModal} type="button">＋ 노드 등록</button>
            </div>
          </div>
        </div>

        <div className="toolbar">
          <div className="search">🔍<input type="text" value={keyword} onChange={(event) => setKeyword(event.target.value)} placeholder="노드 코드, 이름, 위치 검색..." /></div>
          <select value={typeFilter} onChange={(event) => setTypeFilter(event.target.value)}>
            <option value="">노드 유형 전체</option>
            {Object.entries(infraNodeTypeLabels).map(([code, label]) => <option key={code} value={code}>{label}</option>)}
          </select>
          <select value={statusFilter} onChange={(event) => setStatusFilter(event.target.value)}>
            <option value="">상태 전체</option>
            {Object.entries(infraStatusLabels).map(([code, label]) => <option key={code} value={code}>{label}</option>)}
          </select>
          <div className="right"><button className="btn btn--ghost btn--sm" onClick={() => { setKeyword(""); setTypeFilter(""); setStatusFilter(""); }} type="button">초기화</button></div>
        </div>

        <div className="card">
          <table className="tbl infra-table">
            <thead>
              <tr>
                <th>노드 코드</th><th>노드 이름</th><th>유형</th><th>상태</th><th>위치</th><th>벤더/모델</th><th>연결 서버</th><th className="col-actions">관리</th>
              </tr>
            </thead>
            <tbody>
              {filteredNodes.map((node) => (
                <tr key={node.infraNodeId}>
                  <td><code>{node.nodeCode}</code></td>
                  <td><b>{node.nodeName}</b></td>
                  <td>{infraNodeTypeLabels[node.nodeTypeCode] || node.nodeTypeCode}</td>
                  <td><InfraStatusBadge code={node.statusCode} /></td>
                  <td>{node.locationLabel || "-"}</td>
                  <td>{node.vendorModel || "-"}</td>
                  <td>{node.serverCount}대</td>
                  <td className="col-actions">
                    <div className="row-actions">
                      <button className="ibtn" onClick={() => openEditModal(node)} title="수정" type="button">✏️</button>
                      <button className="ibtn ibtn--danger" onClick={() => deleteNode(node)} title="삭제" type="button">🗑</button>
                    </div>
                  </td>
                </tr>
              ))}
              {!filteredNodes.length ? <tr><td colSpan={8}><div className="empty">조회된 인프라 노드가 없습니다.</div></td></tr> : null}
            </tbody>
          </table>
          <div className="pager">
            <div className="pager__info">전체 {filteredNodes.length}건 · {dataSourceLabel}</div>
          </div>
        </div>

        {modal ? (
          <ModalBackdrop onClose={() => setModal(null)}>
            <div className="modal" onClick={(event) => event.stopPropagation()}>
              <div className="modal__head">
                <h3>{modal.mode === "edit" ? "✏️ 인프라 노드 수정" : "＋ 인프라 노드 등록"}</h3>
                <button className="close" onClick={() => setModal(null)} type="button">×</button>
              </div>
              <div className="modal__body">
                <div className="form-section">
                  <h4 className="form-section__title">노드 정보</h4>
                  <div className="form-grid">
                    <div className="form-row"><label>노드 코드<span className="req">*</span></label><input type="text" value={modal.form.nodeCode} onChange={(event) => updateModalField("nodeCode", event.target.value.toUpperCase())} disabled={modal.mode === "edit"} /></div>
                    <div className="form-row"><label>노드 이름<span className="req">*</span></label><input type="text" value={modal.form.nodeName} onChange={(event) => updateModalField("nodeName", event.target.value)} /></div>
                    <div className="form-row"><label>노드 유형</label><select value={modal.form.nodeTypeCode} onChange={(event) => updateModalField("nodeTypeCode", event.target.value)}>{Object.entries(infraNodeTypeLabels).map(([code, label]) => <option key={code} value={code}>{label}</option>)}</select></div>
                    <div className="form-row"><label>상태</label><select value={modal.form.statusCode} onChange={(event) => updateModalField("statusCode", event.target.value)}>{Object.entries(infraStatusLabels).map(([code, label]) => <option key={code} value={code}>{label}</option>)}</select></div>
                    <div className="form-row"><label>위치</label><input type="text" value={modal.form.locationLabel} onChange={(event) => updateModalField("locationLabel", event.target.value)} /></div>
                    <div className="form-row"><label>벤더/모델</label><input type="text" value={modal.form.vendorModel} onChange={(event) => updateModalField("vendorModel", event.target.value)} /></div>
                    <div className="form-row"><label>연결 서버 수</label><input type="number" min="0" value={modal.form.serverCount} onChange={(event) => updateModalField("serverCount", event.target.value)} /></div>
                  </div>
                </div>
              </div>
              <div className="modal__foot"><button className="btn" onClick={() => setModal(null)} type="button">취소</button><button className="btn btn--primary" onClick={saveModal} type="button">저장</button></div>
            </div>
          </ModalBackdrop>
        ) : null}
      </main>
    </AppShell>
  );
}

function InfraStatusBadge({ code }) {
  const tone = code === "NORMAL" ? "pill--ok" : code === "INCIDENT" ? "pill--crit" : code === "MAINTENANCE" ? "pill--warn" : "pill--idle";
  return <span className={`pill ${tone}`}>{infraStatusLabels[code] || code}</span>;
}

function InfraRelationStatusBadge({ code }) {
  const tone = code === "ACTIVE" ? "pill--ok" : code === "MAINTENANCE" ? "pill--warn" : "pill--idle";
  return <span className={`pill ${tone}`}>{infraRelationStatusLabels[code] || code}</span>;
}

function formatInfraNodeCell(node) {
  if (!node) {
    return "-";
  }
  return <><code>{node.nodeCode}</code> {node.nodeName}</>;
}
