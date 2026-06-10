/**
 * ChainView Service Dashboard - Sample Data
 * 실제 운영 시 API로 대체됩니다.
 */

const DASHBOARD_DATA = {
  // 서비스 목록
  services: [
    {
      id: "svc-001",
      code: "PAY-API-001",
      name: "결제 API 서비스",
      category: "core",
      categoryPath: "핵심 서비스 > 결제 > 결제 API",
      type: "API",
      importance: "high",
      status: "running",
      uptime: 99.97,
      endpoint: "https://api.example.com/pay",
      instances: [
        { name: "pay-api-prod-01", host: "10.0.1.101", status: "running", cpu: 45, memory: 62 },
        { name: "pay-api-prod-02", host: "10.0.1.102", status: "running", cpu: 38, memory: 58 },
        { name: "pay-api-prod-03", host: "10.0.1.103", status: "running", cpu: 52, memory: 65 }
      ],
      dependencies: [
        { code: "AUTH-API-001", name: "인증 서비스", status: "running" },
        { code: "DB-MYSQL-001", name: "결제 DB", status: "running" },
        { code: "CACHE-REDIS-001", name: "캐시 서비스", status: "running" }
      ],
      incidents: [
        { id: "INC-2024-0042", severity: "medium", title: "API 응답 지연 발생", date: "2024-05-28", resolved: true }
      ],
      owners: [
        { name: "김철수", role: "주담당자", initials: "김철" },
        { name: "이영희", role: "부담당자", initials: "이영" }
      ]
    },
    {
      id: "svc-002",
      code: "AUTH-API-001",
      name: "인증 서비스",
      category: "core",
      categoryPath: "핵심 서비스 > 회원 > 인증",
      type: "API",
      importance: "high",
      status: "running",
      uptime: 99.99,
      endpoint: "https://auth.example.com/api",
      instances: [
        { name: "auth-prod-01", host: "10.0.2.101", status: "running", cpu: 32, memory: 48 },
        { name: "auth-prod-02", host: "10.0.2.102", status: "running", cpu: 28, memory: 45 }
      ],
      dependencies: [
        { code: "DB-MYSQL-002", name: "회원 DB", status: "running" },
        { code: "CACHE-REDIS-001", name: "캐시 서비스", status: "running" }
      ],
      incidents: [],
      owners: [
        { name: "박지민", role: "주담당자", initials: "박지" }
      ]
    },
    {
      id: "svc-003",
      code: "ORDER-API-001",
      name: "주문 서비스",
      category: "core",
      categoryPath: "핵심 서비스 > 주문 > 주문 API",
      type: "API",
      importance: "high",
      status: "warning",
      uptime: 98.5,
      endpoint: "https://api.example.com/order",
      instances: [
        { name: "order-prod-01", host: "10.0.3.101", status: "running", cpu: 78, memory: 82 },
        { name: "order-prod-02", host: "10.0.3.102", status: "warning", cpu: 92, memory: 88 }
      ],
      dependencies: [
        { code: "PAY-API-001", name: "결제 API 서비스", status: "running" },
        { code: "INVENTORY-API-001", name: "재고 서비스", status: "running" },
        { code: "DB-MYSQL-003", name: "주문 DB", status: "running" }
      ],
      incidents: [
        { id: "INC-2024-0058", severity: "high", title: "주문 처리 지연 발생", date: "2024-05-30", resolved: false }
      ],
      owners: [
        { name: "최민수", role: "주담당자", initials: "최민" },
        { name: "정수진", role: "개발자", initials: "정수" }
      ]
    },
    {
      id: "svc-004",
      code: "INVENTORY-API-001",
      name: "재고 서비스",
      category: "core",
      categoryPath: "핵심 서비스 > 주문 > 재고",
      type: "API",
      importance: "high",
      status: "critical",
      uptime: 95.2,
      endpoint: "https://api.example.com/inventory",
      instances: [
        { name: "inv-prod-01", host: "10.0.4.101", status: "critical", cpu: 98, memory: 95 },
        { name: "inv-prod-02", host: "10.0.4.102", status: "stopped", cpu: 0, memory: 0 }
      ],
      dependencies: [
        { code: "DB-MYSQL-004", name: "재고 DB", status: "warning" },
        { code: "MQ-KAFKA-001", name: "메시지 큐", status: "running" }
      ],
      incidents: [
        { id: "INC-2024-0061", severity: "critical", title: "재고 서비스 장애 발생", date: "2024-05-31", resolved: false },
        { id: "INC-2024-0055", severity: "high", title: "DB 연결 오류", date: "2024-05-29", resolved: true }
      ],
      owners: [
        { name: "한동훈", role: "주담당자", initials: "한동" }
      ]
    },
    {
      id: "svc-005",
      code: "MEMBER-WEB-001",
      name: "회원 웹 서비스",
      category: "addon",
      categoryPath: "부가 서비스 > 회원 > 마이페이지",
      type: "WEB",
      importance: "medium",
      status: "running",
      uptime: 99.8,
      endpoint: "https://my.example.com",
      instances: [
        { name: "member-web-01", host: "10.0.5.101", status: "running", cpu: 25, memory: 42 },
        { name: "member-web-02", host: "10.0.5.102", status: "running", cpu: 22, memory: 38 }
      ],
      dependencies: [
        { code: "AUTH-API-001", name: "인증 서비스", status: "running" },
        { code: "MEMBER-API-001", name: "회원 API", status: "running" }
      ],
      incidents: [],
      owners: [
        { name: "강하늘", role: "주담당자", initials: "강하" }
      ]
    },
    {
      id: "svc-006",
      code: "BATCH-SETTLE-001",
      name: "정산 배치",
      category: "addon",
      categoryPath: "부가 서비스 > 정산 > 일일정산",
      type: "BATCH",
      importance: "medium",
      status: "stopped",
      uptime: 100,
      endpoint: "-",
      instances: [
        { name: "settle-batch-01", host: "10.0.6.101", status: "stopped", cpu: 0, memory: 0 }
      ],
      dependencies: [
        { code: "PAY-API-001", name: "결제 API 서비스", status: "running" },
        { code: "DB-MYSQL-005", name: "정산 DB", status: "running" }
      ],
      incidents: [],
      owners: [
        { name: "윤서연", role: "주담당자", initials: "윤서" }
      ]
    },
    {
      id: "svc-007",
      code: "NOTI-API-001",
      name: "알림 서비스",
      category: "addon",
      categoryPath: "부가 서비스 > 알림 > 푸시",
      type: "API",
      importance: "low",
      status: "running",
      uptime: 99.5,
      endpoint: "https://noti.example.com/api",
      instances: [
        { name: "noti-prod-01", host: "10.0.7.101", status: "running", cpu: 15, memory: 28 }
      ],
      dependencies: [
        { code: "MQ-KAFKA-001", name: "메시지 큐", status: "running" }
      ],
      incidents: [],
      owners: [
        { name: "임현우", role: "주담당자", initials: "임현" }
      ]
    },
    {
      id: "svc-008",
      code: "SEARCH-API-001",
      name: "검색 서비스",
      category: "addon",
      categoryPath: "부가 서비스 > 검색 > 상품검색",
      type: "API",
      importance: "medium",
      status: "warning",
      uptime: 97.8,
      endpoint: "https://search.example.com/api",
      instances: [
        { name: "search-prod-01", host: "10.0.8.101", status: "warning", cpu: 85, memory: 78 },
        { name: "search-prod-02", host: "10.0.8.102", status: "running", cpu: 42, memory: 55 }
      ],
      dependencies: [
        { code: "ES-CLUSTER-001", name: "Elasticsearch", status: "warning" }
      ],
      incidents: [
        { id: "INC-2024-0057", severity: "medium", title: "검색 인덱싱 지연", date: "2024-05-30", resolved: false }
      ],
      owners: [
        { name: "조은빈", role: "주담당자", initials: "조은" }
      ]
    },
    {
      id: "svc-009",
      code: "DB-MYSQL-001",
      name: "결제 DB",
      category: "infra",
      categoryPath: "인프라 서비스 > 데이터베이스 > MySQL",
      type: "DATABASE",
      importance: "high",
      status: "running",
      uptime: 99.99,
      endpoint: "10.0.10.101:3306",
      instances: [
        { name: "mysql-pay-master", host: "10.0.10.101", status: "running", cpu: 55, memory: 72 },
        { name: "mysql-pay-slave", host: "10.0.10.102", status: "running", cpu: 35, memory: 68 }
      ],
      dependencies: [],
      incidents: [],
      owners: [
        { name: "DBA팀", role: "운영팀", initials: "DBA" }
      ]
    },
    {
      id: "svc-010",
      code: "CACHE-REDIS-001",
      name: "캐시 서비스",
      category: "infra",
      categoryPath: "인프라 서비스 > 캐시 > Redis",
      type: "CACHE",
      importance: "high",
      status: "running",
      uptime: 99.95,
      endpoint: "10.0.11.101:6379",
      instances: [
        { name: "redis-cluster-01", host: "10.0.11.101", status: "running", cpu: 25, memory: 85 },
        { name: "redis-cluster-02", host: "10.0.11.102", status: "running", cpu: 22, memory: 82 },
        { name: "redis-cluster-03", host: "10.0.11.103", status: "running", cpu: 28, memory: 80 }
      ],
      dependencies: [],
      incidents: [],
      owners: [
        { name: "인프라팀", role: "운영팀", initials: "INF" }
      ]
    },
    {
      id: "svc-011",
      code: "MQ-KAFKA-001",
      name: "메시지 큐",
      category: "infra",
      categoryPath: "인프라 서비스 > 메시징 > Kafka",
      type: "MESSAGE_QUEUE",
      importance: "high",
      status: "running",
      uptime: 99.9,
      endpoint: "10.0.12.101:9092",
      instances: [
        { name: "kafka-broker-01", host: "10.0.12.101", status: "running", cpu: 42, memory: 65 },
        { name: "kafka-broker-02", host: "10.0.12.102", status: "running", cpu: 38, memory: 62 },
        { name: "kafka-broker-03", host: "10.0.12.103", status: "running", cpu: 45, memory: 68 }
      ],
      dependencies: [],
      incidents: [],
      owners: [
        { name: "인프라팀", role: "운영팀", initials: "INF" }
      ]
    },
    {
      id: "svc-012",
      code: "ES-CLUSTER-001",
      name: "Elasticsearch",
      category: "infra",
      categoryPath: "인프라 서비스 > 검색엔진 > Elasticsearch",
      type: "SEARCH_ENGINE",
      importance: "medium",
      status: "warning",
      uptime: 98.2,
      endpoint: "10.0.13.101:9200",
      instances: [
        { name: "es-data-01", host: "10.0.13.101", status: "running", cpu: 75, memory: 88 },
        { name: "es-data-02", host: "10.0.13.102", status: "warning", cpu: 92, memory: 95 },
        { name: "es-master-01", host: "10.0.13.103", status: "running", cpu: 35, memory: 52 }
      ],
      dependencies: [],
      incidents: [
        { id: "INC-2024-0056", severity: "medium", title: "디스크 용량 부족 경고", date: "2024-05-29", resolved: false }
      ],
      owners: [
        { name: "인프라팀", role: "운영팀", initials: "INF" }
      ]
    }
  ],

  // 요약 통계
  getSummary: function() {
    const services = this.services;
    return {
      total: services.length,
      running: services.filter(s => s.status === "running").length,
      warning: services.filter(s => s.status === "warning").length,
      critical: services.filter(s => s.status === "critical").length,
      stopped: services.filter(s => s.status === "stopped").length
    };
  },

  // 필터링
  filterServices: function(filters) {
    let result = [...this.services];

    if (filters.category) {
      result = result.filter(s => s.category === filters.category);
    }

    if (filters.status) {
      result = result.filter(s => s.status === filters.status);
    }

    if (filters.importance) {
      result = result.filter(s => s.importance === filters.importance);
    }

    if (filters.search) {
      const keyword = filters.search.toLowerCase();
      result = result.filter(s => 
        s.name.toLowerCase().includes(keyword) || 
        s.code.toLowerCase().includes(keyword)
      );
    }

    return result;
  },

  // 서비스 조회
  getServiceById: function(id) {
    return this.services.find(s => s.id === id);
  }
};
