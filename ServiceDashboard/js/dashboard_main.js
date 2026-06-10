/**
 * ChainView Service Dashboard - Main JavaScript
 */

$(function() {
  "use strict";

  // ========================================
  // 상태 관리
  // ========================================
  const state = {
    viewMode: "grid", // grid | list
    filters: {
      category: "",
      status: "",
      importance: "",
      search: ""
    },
    autoRefresh: true,
    refreshInterval: null,
    sidebarCollapsed: false
  };

  // ========================================
  // 초기화
  // ========================================
  function init() {
    initSidebar();
    renderSummary();
    renderServices();
    bindEvents();
    startAutoRefresh();
    updateLastUpdated();
  }

  // ========================================
  // 사이드바 초기화 및 관리
  // ========================================
  function initSidebar() {
    // localStorage에서 사이드바 상태 복원
    const savedState = localStorage.getItem("cv-monitor-sidebar-collapsed");
    if (savedState === "true") {
      state.sidebarCollapsed = true;
      $(".dashboard-layout").addClass("is-collapsed");
    }

    // 네비게이션 그룹 상태 복원
    const savedNavState = localStorage.getItem("cv-monitor-nav-expanded");
    if (savedNavState) {
      try {
        const expandedGroups = JSON.parse(savedNavState);
        $("[data-nav-toggle]").each(function() {
          const groupId = $(this).data("nav-toggle");
          const $items = $(`[data-nav-items="${groupId}"]`);
          
          if (expandedGroups.includes(groupId)) {
            $(this).addClass("is-open");
            $items.removeClass("is-hidden");
          } else {
            $(this).removeClass("is-open");
            $items.addClass("is-hidden");
          }
        });
      } catch (e) {
        console.error("Failed to restore nav state:", e);
      }
    }
  }

  function toggleSidebar() {
    state.sidebarCollapsed = !state.sidebarCollapsed;
    $(".dashboard-layout").toggleClass("is-collapsed", state.sidebarCollapsed);
    localStorage.setItem("cv-monitor-sidebar-collapsed", state.sidebarCollapsed);
  }

  function toggleNavGroup($toggle) {
    const groupId = $toggle.data("nav-toggle");
    const $items = $(`[data-nav-items="${groupId}"]`);
    const isOpen = $toggle.hasClass("is-open");

    if (isOpen) {
      $toggle.removeClass("is-open");
      $items.addClass("is-hidden");
    } else {
      $toggle.addClass("is-open");
      $items.removeClass("is-hidden");
    }

    // 상태 저장
    const expandedGroups = [];
    $("[data-nav-toggle].is-open").each(function() {
      expandedGroups.push($(this).data("nav-toggle"));
    });
    localStorage.setItem("cv-monitor-nav-expanded", JSON.stringify(expandedGroups));
  }

  // ========================================
  // 요약 카드 렌더링
  // ========================================
  function renderSummary() {
    const summary = DASHBOARD_DATA.getSummary();
    
    $("#total-services").text(summary.total);
    $("#running-services").text(summary.running);
    $("#warning-services").text(summary.warning);
    $("#critical-services").text(summary.critical);
    $("#stopped-services").text(summary.stopped);
  }

  // ========================================
  // 서비스 카드 렌더링
  // ========================================
  function renderServices() {
    const services = DASHBOARD_DATA.filterServices(state.filters);
    const $grid = $("#service-grid");
    
    // 뷰 모드 클래스 적용
    $grid.removeClass("service-grid--list");
    if (state.viewMode === "list") {
      $grid.addClass("service-grid--list");
    }

    // 빈 상태 처리
    if (services.length === 0) {
      $grid.html(`
        <div class="empty-state">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
            <circle cx="12" cy="12" r="10"/>
            <path d="M8 15h8M9 9h.01M15 9h.01"/>
          </svg>
          <div class="empty-state__title">서비스를 찾을 수 없습니다</div>
          <div class="empty-state__desc">필터 조건을 변경해 보세요.</div>
        </div>
      `);
      return;
    }

    // 서비스 카드 생성
    const cardsHtml = services.map(service => createServiceCard(service)).join("");
    $grid.html(cardsHtml);
  }

  function createServiceCard(service) {
    const statusLabels = {
      running: "운영중",
      warning: "주의",
      critical: "장애",
      stopped: "중지"
    };

    const importanceLabels = {
      high: "높음",
      medium: "중간",
      low: "낮음"
    };

    const instanceCount = service.instances.length;
    const runningInstances = service.instances.filter(i => i.status === "running").length;

    return `
      <div class="service-card" data-service-id="${service.id}">
        <div class="service-card__header">
          <div>
            <div class="service-card__title">${escapeHtml(service.name)}</div>
            <div class="service-card__code">${escapeHtml(service.code)}</div>
          </div>
          <div class="service-card__status">
            <span class="status-dot status-dot--${service.status}"></span>
            <span class="status-text status-text--${service.status}">${statusLabels[service.status]}</span>
          </div>
        </div>
        <div class="service-card__meta">
          <div class="service-card__meta-item">
            <span class="service-card__meta-label">유형</span>
            <span class="service-card__meta-value">${escapeHtml(service.type)}</span>
          </div>
          <div class="service-card__meta-item">
            <span class="service-card__meta-label">업타임</span>
            <span class="service-card__meta-value">${service.uptime}%</span>
          </div>
          <div class="service-card__meta-item">
            <span class="service-card__meta-label">의존성</span>
            <span class="service-card__meta-value">${service.dependencies.length}개</span>
          </div>
        </div>
        <div class="service-card__footer">
          <div class="service-card__tags">
            <span class="tag tag--category">${getCategoryLabel(service.category)}</span>
            <span class="tag tag--importance-${service.importance}">${importanceLabels[service.importance]}</span>
          </div>
          <div class="service-card__instances">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <rect x="2" y="2" width="20" height="8" rx="2" ry="2"/>
              <rect x="2" y="14" width="20" height="8" rx="2" ry="2"/>
              <line x1="6" y1="6" x2="6.01" y2="6"/>
              <line x1="6" y1="18" x2="6.01" y2="18"/>
            </svg>
            <span>${runningInstances}/${instanceCount}</span>
          </div>
        </div>
      </div>
    `;
  }

  function getCategoryLabel(category) {
    const labels = {
      core: "핵심",
      addon: "부가",
      infra: "인프라"
    };
    return labels[category] || category;
  }

  // ========================================
  // 서비스 상세 모달
  // ========================================
  function openServiceDetail(serviceId) {
    const service = DASHBOARD_DATA.getServiceById(serviceId);
    if (!service) return;

    const $modal = $("#modal-service-detail");
    
    // 기본 정보
    $("#modal-service-name").text(service.name);
    $("#detail-code").text(service.code);
    $("#detail-category").text(service.categoryPath);
    $("#detail-type").text(service.type);
    $("#detail-importance").text(getImportanceLabel(service.importance));
    $("#detail-endpoint").text(service.endpoint);

    // 상태
    const statusLabels = { running: "운영중", warning: "주의", critical: "장애", stopped: "중지" };
    $("#detail-status").html(`
      <span class="status-badge status-badge--${service.status}">${statusLabels[service.status]}</span>
      <span class="detail-uptime">업타임: ${service.uptime}%</span>
    `);

    // 인스턴스
    const instancesHtml = service.instances.map(inst => `
      <div class="instance-item">
        <span class="instance-item__name">${escapeHtml(inst.name)}</span>
        <div class="instance-item__info">
          <span>${inst.host}</span>
          <span>CPU: ${inst.cpu}%</span>
          <span>MEM: ${inst.memory}%</span>
          <div class="instance-item__status">
            <span class="status-dot status-dot--${inst.status}"></span>
          </div>
        </div>
      </div>
    `).join("");
    $("#detail-instances").html(instancesHtml || '<div class="incident-item--empty">인스턴스 없음</div>');

    // 의존 서비스
    const depsHtml = service.dependencies.map(dep => `
      <div class="dependency-item">
        <span class="status-dot status-dot--${dep.status}"></span>
        <span>${escapeHtml(dep.name)}</span>
        <span class="dependency-item__arrow">→</span>
        <span class="service-card__code">${escapeHtml(dep.code)}</span>
      </div>
    `).join("");
    $("#detail-dependencies").html(depsHtml || '<div class="incident-item--empty">의존 서비스 없음</div>');

    // 인시던트
    const incidentsHtml = service.incidents.map(inc => `
      <div class="incident-item">
        <span class="incident-item__severity incident-item__severity--${inc.severity}">${inc.severity.toUpperCase()}</span>
        <span class="incident-item__title">${escapeHtml(inc.title)}</span>
        <span class="incident-item__date">${inc.date}</span>
      </div>
    `).join("");
    $("#detail-incidents").html(incidentsHtml || '<div class="incident-item--empty">최근 인시던트 없음</div>');

    // 담당자
    const ownersHtml = service.owners.map(owner => `
      <div class="owner-item">
        <span class="owner-item__avatar">${owner.initials}</span>
        <div class="owner-item__info">
          <span class="owner-item__name">${escapeHtml(owner.name)}</span>
          <span class="owner-item__role">${escapeHtml(owner.role)}</span>
        </div>
      </div>
    `).join("");
    $("#detail-owners").html(ownersHtml || '<div class="incident-item--empty">담당자 미지정</div>');

    // ChainView 링크
    $("#link-chainview").attr("href", `../ChainView/pages/service-detail.html?code=${service.code}`);

    // 모달 열기
    $modal.addClass("is-open");
  }

  function getImportanceLabel(importance) {
    const labels = { high: "높음", medium: "중간", low: "낮음" };
    return labels[importance] || importance;
  }

  // ========================================
  // 자동 새로고침
  // ========================================
  function startAutoRefresh() {
    if (state.refreshInterval) {
      clearInterval(state.refreshInterval);
    }
    
    if (state.autoRefresh) {
      state.refreshInterval = setInterval(function() {
        refreshData();
      }, 30000); // 30초
    }
  }

  function stopAutoRefresh() {
    if (state.refreshInterval) {
      clearInterval(state.refreshInterval);
      state.refreshInterval = null;
    }
  }

  function refreshData() {
    // 실제 구현에서는 API 호출
    renderSummary();
    renderServices();
    updateLastUpdated();
  }

  function updateLastUpdated() {
    const now = new Date();
    const timeStr = now.toLocaleTimeString("ko-KR", { 
      hour: "2-digit", 
      minute: "2-digit", 
      second: "2-digit" 
    });
    $("#last-updated").text(`최근 갱신: ${timeStr}`);
  }

  // ========================================
  // 이벤트 바인딩
  // ========================================
  function bindEvents() {
    // 사이드바 토글
    $("#sidebar-toggle").on("click", function() {
      toggleSidebar();
    });

    // 네비게이션 그룹 토글
    $("[data-nav-toggle]").on("click", function() {
      toggleNavGroup($(this));
    });

    // 새로고침 버튼
    $("#btn-refresh").on("click", function() {
      refreshData();
    });

    // 자동 새로고침 토글
    $("#auto-refresh").on("change", function() {
      state.autoRefresh = $(this).is(":checked");
      if (state.autoRefresh) {
        startAutoRefresh();
      } else {
        stopAutoRefresh();
      }
    });

    // 분류 필터
    $("#filter-category").on("change", function() {
      state.filters.category = $(this).val();
      renderServices();
    });

    // 상태 필터 (칩)
    $("#filter-status").on("click", ".chip", function() {
      $("#filter-status .chip").removeClass("chip--active");
      $(this).addClass("chip--active");
      state.filters.status = $(this).data("status");
      renderServices();
    });

    // 중요도 필터
    $("#filter-importance").on("change", function() {
      state.filters.importance = $(this).val();
      renderServices();
    });

    // 검색
    let searchTimeout;
    $("#filter-search").on("input", function() {
      clearTimeout(searchTimeout);
      const keyword = $(this).val();
      searchTimeout = setTimeout(function() {
        state.filters.search = keyword;
        renderServices();
      }, 300);
    });

    // 보기 모드 토글
    $(".view-toggle").on("click", ".view-btn", function() {
      $(".view-btn").removeClass("view-btn--active");
      $(this).addClass("view-btn--active");
      state.viewMode = $(this).data("view");
      renderServices();
    });

    // 서비스 카드 클릭
    $("#service-grid").on("click", ".service-card", function() {
      const serviceId = $(this).data("service-id");
      openServiceDetail(serviceId);
    });

    // 모달 닫기
    $("[data-modal-close]").on("click", function() {
      $(this).closest(".modal").removeClass("is-open");
    });

    $(".modal__backdrop").on("click", function() {
      $(this).closest(".modal").removeClass("is-open");
    });

    // ESC 키로 모달 닫기
    $(document).on("keydown", function(e) {
      if (e.key === "Escape") {
        $(".modal.is-open").removeClass("is-open");
      }
    });
  }

  // ========================================
  // 유틸리티
  // ========================================
  function escapeHtml(text) {
    const div = document.createElement("div");
    div.textContent = text;
    return div.innerHTML;
  }

  // ========================================
  // 시작
  // ========================================
  init();
});
