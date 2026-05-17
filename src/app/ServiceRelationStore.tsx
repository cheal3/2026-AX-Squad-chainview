import {
  createContext,
  useContext,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import {
  serviceRelations as initialServiceRelations,
  type RelationStatusCode,
  type RelationTypeCode,
  type ServiceRelationRecord,
} from "./mockData";

type NewRelationInput = {
  sourceServiceId: number;
  targetServiceId: number;
  relationTypeCode: RelationTypeCode;
  mandatoryYn: "Y" | "N";
  relationStatusCode: RelationStatusCode;
  description: string;
};

type ServiceRelationContextValue = {
  relations: ServiceRelationRecord[];
  addRelation: (input: NewRelationInput) => {
    ok: boolean;
    message: string;
  };
  removeRelation: (relationId: number) => void;
};

const ServiceRelationContext =
  createContext<ServiceRelationContextValue | null>(null);

export function ServiceRelationProvider({ children }: { children: ReactNode }) {
  const [relations, setRelations] = useState<ServiceRelationRecord[]>(
    initialServiceRelations
  );

  const value = useMemo<ServiceRelationContextValue>(
    () => ({
      relations,
      addRelation: (input) => {
        const duplicate = relations.some(
          (relation) =>
            relation.sourceServiceId === input.sourceServiceId &&
            relation.targetServiceId === input.targetServiceId &&
            relation.relationTypeCode === input.relationTypeCode
        );

        if (duplicate) {
          return {
            ok: false,
            message: "동일한 출발/대상/관계 유형의 종속 관계가 이미 있습니다.",
          };
        }

        const nextId =
          Math.max(0, ...relations.map((relation) => relation.relationId)) + 1;
        const now = new Date().toISOString().slice(0, 16).replace("T", " ");

        setRelations((current) => [
          {
            relationId: nextId,
            createdAt: now,
            updatedAt: now,
            ...input,
          },
          ...current,
        ]);

        return {
          ok: true,
          message: "서비스 종속 관계가 추가되었습니다.",
        };
      },
      removeRelation: (relationId) => {
        setRelations((current) =>
          current.filter((relation) => relation.relationId !== relationId)
        );
      },
    }),
    [relations]
  );

  return (
    <ServiceRelationContext.Provider value={value}>
      {children}
    </ServiceRelationContext.Provider>
  );
}

export function useServiceRelations() {
  const value = useContext(ServiceRelationContext);

  if (!value) {
    throw new Error(
      "useServiceRelations must be used within ServiceRelationProvider"
    );
  }

  return value;
}
