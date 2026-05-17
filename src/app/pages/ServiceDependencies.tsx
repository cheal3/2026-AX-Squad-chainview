import { useMemo, useState } from "react";
import { ArrowRight, Link2, Plus, Trash2 } from "lucide-react";
import { usePortalData } from "../PortalDataStore";
import {
  codeLabels,
  type RelationTypeCode,
  type ServiceRelationRecord,
} from "../mockData";

export function ServiceDependencies() {
  const { services, relations, addRelation, removeRelation } = usePortalData();
  const [currentServiceId, setCurrentServiceId] = useState(
    services[0]?.serviceId ?? 0
  );
  const [targetServiceId, setTargetServiceId] = useState(
    services.find((service) => service.serviceId !== currentServiceId)
      ?.serviceId ?? currentServiceId
  );
  const [relationTypeCode, setRelationTypeCode] =
    useState<RelationTypeCode>("REST");
  const [mandatoryYn, setMandatoryYn] = useState<"Y" | "N">("Y");
  const [description, setDescription] = useState("");
  const [message, setMessage] = useState("");

  const outgoingRelations = useMemo(
    () =>
      relations.filter(
        (relation) => relation.sourceServiceId === currentServiceId
      ),
    [currentServiceId, relations]
  );

  const incomingRelations = useMemo(
    () =>
      relations.filter(
        (relation) => relation.targetServiceId === currentServiceId
      ),
    [currentServiceId, relations]
  );

  const targetOptions = services.filter(
    (service) => service.serviceId !== currentServiceId
  );

  const handleCurrentServiceChange = (nextServiceId: number) => {
    setCurrentServiceId(nextServiceId);
    const nextTarget = services.find(
      (service) => service.serviceId !== nextServiceId
    );
    setTargetServiceId(nextTarget?.serviceId ?? nextServiceId);
    setMessage("");
  };

  const handleAddRelation = () => {
    if (!currentServiceId || !targetServiceId) {
      setMessage("현재 서비스와 대상 서비스를 선택하세요.");
      return;
    }

    const result = addRelation({
      sourceServiceId: currentServiceId,
      targetServiceId,
      relationTypeCode,
      mandatoryYn,
      relationStatusCode: "ACTIVE",
      description: description.trim() || "-",
    });

    setMessage(result.message);
    if (result.ok) {
      setDescription("");
    }
  };

  return (
    <div className="space-y-6">
      <section className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
        <div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
          <div>
            <h3 className="text-lg font-semibold text-gray-900">
              서비스 간 종속 관계
            </h3>
            <p className="text-sm text-gray-500 mt-1">
              현재 서비스를 기준으로 이 서비스가 호출하거나 의존하는 대상
              서비스를 추가합니다.
            </p>
          </div>
          <div className="flex items-center gap-2 text-sm text-gray-500">
            <Link2 size={16} />
            source_service_id {"->"} target_service_id
          </div>
        </div>
      </section>

      <section className="grid grid-cols-1 xl:grid-cols-[360px_1fr] gap-6">
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <h4 className="font-semibold text-gray-900 mb-4">현재 서비스 선택</h4>
          <div className="space-y-3">
            {services.map((service) => {
              const active = service.serviceId === currentServiceId;
              return (
                <button
                  key={service.serviceId}
                  onClick={() => handleCurrentServiceChange(service.serviceId)}
                  className={`w-full text-left px-4 py-3 rounded-lg border transition-colors ${
                    active
                      ? "border-blue-500 bg-blue-50"
                      : "border-gray-200 hover:bg-gray-50"
                  }`}
                >
                  <div className="flex items-center justify-between gap-3">
                    <span className="font-semibold text-gray-900">
                      {service.serviceName}
                    </span>
                    <span className="text-xs text-gray-500">
                      #{service.serviceId}
                    </span>
                  </div>
                  <div className="text-sm text-gray-500 mt-1">
                    {service.serviceCode} · {service.categoryPath.join(" / ")}
                  </div>
                </button>
              );
            })}
          </div>
        </div>

        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <h4 className="font-semibold text-gray-900 mb-4">종속 관계 추가</h4>
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                현재 서비스
              </label>
              <input
                value={
                  services.find((service) => service.serviceId === currentServiceId)
                    ?.serviceName ?? ""
                }
                readOnly
                className="w-full px-4 py-2 border border-gray-300 rounded-lg bg-gray-50 text-gray-700"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                대상 서비스
              </label>
              <select
                value={targetServiceId}
                onChange={(event) =>
                  setTargetServiceId(Number(event.target.value))
                }
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                {targetOptions.map((service) => (
                  <option key={service.serviceId} value={service.serviceId}>
                    {service.serviceName}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                관계 유형
              </label>
              <select
                value={relationTypeCode}
                onChange={(event) =>
                  setRelationTypeCode(event.target.value as RelationTypeCode)
                }
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                {Object.entries(codeLabels.relationType).map(([code, label]) => (
                  <option key={code} value={code}>
                    {label}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                필수 여부
              </label>
              <select
                value={mandatoryYn}
                onChange={(event) =>
                  setMandatoryYn(event.target.value as "Y" | "N")
                }
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="Y">필수</option>
                <option value="N">선택</option>
              </select>
            </div>

            <div className="md:col-span-2 xl:col-span-4">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                설명
              </label>
              <textarea
                rows={3}
                value={description}
                onChange={(event) => setDescription(event.target.value)}
                placeholder="예: 현재 서비스가 대상 서비스의 REST API를 호출"
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
          </div>

          <div className="flex flex-col gap-3 md:flex-row md:items-center mt-4">
            <button
              onClick={handleAddRelation}
              className="flex items-center justify-center gap-2 px-5 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
            >
              <Plus size={18} />
              종속 관계 추가
            </button>
            {message && <span className="text-sm text-gray-600">{message}</span>}
          </div>
        </div>
      </section>

      <section className="grid grid-cols-1 xl:grid-cols-2 gap-6">
        <RelationTable
          title="이 서비스가 의존하는 대상"
          emptyText="아직 현재 서비스 기준으로 추가된 대상 서비스가 없습니다."
          services={services}
          relations={outgoingRelations}
          relationSide="target"
          onRemove={removeRelation}
        />
        <RelationTable
          title="이 서비스를 의존하는 출발 서비스"
          emptyText="현재 서비스를 대상으로 호출하는 서비스가 없습니다."
          services={services}
          relations={incomingRelations}
          relationSide="source"
          onRemove={removeRelation}
        />
      </section>
    </div>
  );
}

function RelationTable({
  title,
  emptyText,
  services,
  relations,
  relationSide,
  onRemove,
}: {
  title: string;
  emptyText: string;
  services: ReturnType<typeof usePortalData>["services"];
  relations: ServiceRelationRecord[];
  relationSide: "source" | "target";
  onRemove: (relationId: number) => void;
}) {
  return (
    <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
      <div className="px-6 py-4 border-b border-gray-200 flex items-center gap-2">
        <h4 className="font-semibold text-gray-900">{title}</h4>
        <span className="px-2 py-0.5 text-xs font-medium bg-gray-100 text-gray-700 rounded-full">
          {relations.length}
        </span>
      </div>

      {relations.length === 0 ? (
        <div className="p-6 text-sm text-gray-500">{emptyText}</div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full min-w-[640px]">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  관계
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  유형
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  필수
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  설명
                </th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                  작업
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {relations.map((relation) => {
                const source = services.find(
                  (service) => service.serviceId === relation.sourceServiceId
                );
                const target = services.find(
                  (service) => service.serviceId === relation.targetServiceId
                );
                const focusService =
                  relationSide === "target" ? target : source;

                return (
                  <tr key={relation.relationId} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center gap-2 text-sm text-gray-900">
                        {source?.serviceName}
                        <ArrowRight size={16} className="text-gray-400" />
                        <span className="font-semibold">
                          {target?.serviceName}
                        </span>
                      </div>
                      <div className="text-xs text-gray-500 mt-1">
                        선택 기준: {focusService?.serviceCode}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-700">
                      {codeLabels.relationType[relation.relationTypeCode]}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className="px-3 py-1 text-xs font-medium rounded-full border bg-green-100 text-green-800 border-green-200">
                        {relation.mandatoryYn === "Y" ? "필수" : "선택"}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-600">
                      {relation.description}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right">
                      <button
                        onClick={() => onRemove(relation.relationId)}
                        className="inline-flex items-center gap-2 px-3 py-2 text-sm text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                      >
                        <Trash2 size={16} />
                        삭제
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
