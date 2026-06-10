/**
 * ChainView 정적 페이지 — jQuery
 */
(function ($) {
  "use strict";

  $(function () {
    // ----- 관리자 레이아웃 -----
    var $sidebar = $("#admin-sidebar");
    var $toggle = $("#sidebar-toggle");
    if ($toggle.length && $sidebar.length) {
      $toggle.on("click", function () {
        $sidebar.toggleClass("is-collapsed");
        $("#sidebar-toggle-menu, #sidebar-toggle-close").toggleClass("is-hidden");
      });
    }

    var NAV_EXPANDED_KEY = "cv-admin-nav-expanded";

    function getNavExpandedIds() {
      try {
        var raw = localStorage.getItem(NAV_EXPANDED_KEY);
        if (raw) {
          var parsed = JSON.parse(raw);
          if (Array.isArray(parsed)) {
            return parsed;
          }
        }
      } catch (e) {}
      return null;
    }

    function setNavExpandedIds(ids) {
      try {
        localStorage.setItem(NAV_EXPANDED_KEY, JSON.stringify(ids));
      } catch (e) {}
    }

    function collectNavExpandedFromDom() {
      var open = [];
      $("[data-nav-group-items]").each(function () {
        var id = $(this).attr("data-nav-group-items");
        if (id && !$(this).hasClass("is-hidden")) {
          open.push(id);
        }
      });
      return open;
    }

    function applyNavExpandedState(ids) {
      var openSet = {};
      for (var i = 0; i < ids.length; i++) {
        openSet[ids[i]] = true;
      }
      $("[data-nav-group-toggle]").each(function () {
        var id = String($(this).data("nav-group-toggle"));
        var $panel = $('[data-nav-group-items="' + id + '"]');
        var $chev = $(this).find("[data-chevron]");
        if (openSet[id]) {
          $panel.removeClass("is-hidden");
          $chev.addClass("is-open");
        } else {
          $panel.addClass("is-hidden");
          $chev.removeClass("is-open");
        }
      });
    }

    var storedNavIds = getNavExpandedIds();
    if (storedNavIds === null) {
      setNavExpandedIds(collectNavExpandedFromDom());
    } else {
      applyNavExpandedState(storedNavIds);
    }

    $("[data-nav-group-toggle]").on("click", function () {
      var id = $(this).data("nav-group-toggle");
      var $panel = $('[data-nav-group-items="' + id + '"]');
      $panel.toggleClass("is-hidden");
      $(this).find("[data-chevron]").toggleClass("is-open");
      setNavExpandedIds(collectNavExpandedFromDom());
    });

    var $umTrigger = $("#user-menu-trigger");
    var $umPanel = $("#user-menu-panel");
    $umTrigger.on("click", function (e) {
      e.stopPropagation();
      $umPanel.toggleClass("is-hidden");
    });
    $(document).on("click", function () {
      $umPanel.addClass("is-hidden");
    });
    $umPanel.on("click", function (e) {
      e.stopPropagation();
    });

    $("#user-menu-logout").on("click", function () {
      window.location.href = "login.html";
    });

    // ----- 로그인 -----
    $("#login-form").on("submit", function (e) {
      e.preventDefault();
      var $err = $("#login-error");
      var $errMsg = $("#login-error-msg");
      var $btn = $("#login-submit");
      var u = $("#username").val();
      var p = $("#password").val();

      $err.addClass("is-hidden");
      $errMsg.empty();
      $btn.prop("disabled", true).text("로그인 중...");

      window.setTimeout(function () {
        if (u === "admin" && p === "admin") {
          window.location.href = "dashboard.html";
          return;
        }
        $err.removeClass("is-hidden");
        $errMsg.text("사번 또는 비밀번호가 올바르지 않습니다.");
        $btn.prop("disabled", false).text("로그인");
      }, 500);
    });

    // ----- 서비스 목록 -----
    var $fltBtn = $("#services-filter-toggle");
    var $fltPanel = $("#services-filter-panel");
    if ($fltBtn.length && $fltPanel.length) {
      $fltBtn.on("click", function () {
        var show = $fltPanel.hasClass("is-hidden");
        $fltPanel.toggleClass("is-hidden", !show);
        $fltBtn.toggleClass("is-filter-on", show);
      });
    }
    $("#services-filter-reset").on("click", function () {
      $fltPanel.addClass("is-hidden");
      $fltBtn.removeClass("is-filter-on");
    });

    $("[data-category-toggle]").on("click", function () {
      var cid = $(this).data("category-toggle");
      var $ch = $('[data-category-children="' + cid + '"]');
      $(this).find("[data-chev]").toggleClass("is-open");
      $ch.toggleClass("is-hidden");
    });

    var $master = $("#services-select-all");
    var $count = $("#services-selected-count");
    var $bulk = $("#services-bulk-actions");

    function syncRows() {
      var $rows = $(".js-service-row-cb");
      var n = $rows.filter(":checked").length;
      var total = $rows.length;
      if ($master.length && $master[0]) {
        $master.prop("checked", n > 0 && n === total);
        $master[0].indeterminate = n > 0 && n < total;
      }
      if (n > 0) {
        $count.removeClass("is-hidden").text(" (" + n + "개 선택)");
      } else {
        $count.addClass("is-hidden").empty();
      }
      $bulk.toggleClass("is-hidden", n === 0);
    }

    $master.on("change", function () {
      $(".js-service-row-cb").prop("checked", $master.prop("checked"));
      syncRows();
    });
    $(document).on("change", ".js-service-row-cb", syncRows);

    function resetRowMenus() {
      $("[data-row-actions-menu]").each(function () {
        var $m = $(this);
        $m.addClass("is-hidden").removeClass("cv-row-menu--floating");
        $m.css({ position: "", left: "", top: "", right: "", bottom: "" });
      });
    }

    function positionRowMenuFloating($menu, $trigger) {
      var trigger = $trigger[0];
      var menuEl = $menu[0];
      if (!trigger || !menuEl) {
        return;
      }
      $menu.removeClass("is-hidden").addClass("cv-row-menu--floating");
      $menu.css({ position: "fixed", right: "auto" });
      function place() {
        var r = trigger.getBoundingClientRect();
        var mw = menuEl.offsetWidth;
        var mh = menuEl.offsetHeight;
        var pad = 8;
        var gap = 4;
        var left = r.right - mw;
        left = Math.max(pad, Math.min(left, window.innerWidth - mw - pad));
        var top = r.bottom + gap;
        if (top + mh > window.innerHeight - pad) {
          top = r.top - mh - gap;
        }
        top = Math.max(pad, Math.min(top, window.innerHeight - mh - pad));
        $menu.css({ left: left + "px", top: top + "px" });
      }
      window.requestAnimationFrame(function () {
        window.requestAnimationFrame(place);
      });
    }

    $(document).on("click", "[data-row-actions-toggle]", function (e) {
      e.stopPropagation();
      var $btn = $(this);
      var rid = String($btn.data("row-actions-toggle"));
      var $target = $('[data-row-actions-menu="' + rid + '"]');
      var opening = $target.hasClass("is-hidden");
      resetRowMenus();
      if (opening) {
        positionRowMenuFloating($target, $btn);
      }
    });

    $(document).on("click", function () {
      resetRowMenus();
    });

    document.addEventListener(
      "scroll",
      function () {
        if (document.querySelector("[data-row-actions-menu]:not(.is-hidden)")) {
          resetRowMenus();
        }
      },
      true
    );

    $(window).on("resize", function () {
      if ($("[data-row-actions-menu]:not(.is-hidden)").length) {
        resetRowMenus();
      }
    });

    // ----- 서비스 상세 탭 -----
    function activateTab(name) {
      $("[data-detail-tab]").removeClass("is-active");
      $("[data-detail-tab='" + name + "']").addClass("is-active");
      $("[data-detail-panel]").addClass("is-hidden");
      $("[data-detail-panel='" + name + "']").removeClass("is-hidden");
    }

    $("[data-detail-tab]").on("click", function () {
      activateTab($(this).data("detail-tab"));
    });
    if ($("[data-detail-tab]").length) {
      activateTab("basic");
    }

    // ----- 고급 필터 (페이지 공통) -----
    function bindAdvFilter(toggleId, panelId, resetId) {
      var $t = $("#" + toggleId);
      var $p = $("#" + panelId);
      var $r = $("#" + resetId);
      if (!$t.length || !$p.length || !$r.length) {
        return;
      }
      $t.on("click", function () {
        var show = $p.hasClass("is-hidden");
        $p.toggleClass("is-hidden", !show);
        $t.toggleClass("is-filter-on", show);
      });
      $r.on("click", function () {
        $p.addClass("is-hidden");
        $t.removeClass("is-filter-on");
      });
    }

    bindAdvFilter("servers-filter-toggle", "servers-filter-panel", "servers-filter-reset");
    bindAdvFilter("tech-filter-toggle", "tech-filter-panel", "tech-filter-reset");
    bindAdvFilter("users-filter-toggle", "users-filter-panel", "users-filter-reset");
    bindAdvFilter("incidents-filter-toggle", "incidents-filter-panel", "incidents-filter-reset");
    bindAdvFilter("codes-filter-toggle", "codes-filter-panel", "codes-filter-reset");
    bindAdvFilter("relations-filter-toggle", "relations-filter-panel", "relations-filter-reset");

    // ----- 테이블 일괄 선택 (마스터 체크박스 ID는 페이지별) -----
    function bindTableBulk(masterId, rowSel, countId, bulkId) {
      var $master = $("#" + masterId);
      var $count = $("#" + countId);
      var $bulk = $("#" + bulkId);
      if (!$master.length) {
        return;
      }

      function rows() {
        var $r = $(rowSel);
        var $table = $master.closest("table");
        if ($table.is("[data-bulk-only-visible]")) {
          return $r.filter(function () {
            return !$(this).closest("tr").hasClass("is-hidden");
          });
        }
        return $r;
      }

      function sync() {
        var $r = rows();
        var n = $r.filter(":checked").length;
        var total = $r.length;
        if ($master[0]) {
          $master.prop("checked", n > 0 && n === total);
          $master[0].indeterminate = n > 0 && n < total;
        }
        if ($count.length) {
          if (n > 0) {
            $count.removeClass("is-hidden").text(" (" + n + "개 선택)");
          } else {
            $count.addClass("is-hidden").empty();
          }
        }
        if ($bulk.length) {
          $bulk.toggleClass("is-hidden", n === 0);
        }
      }

      $master.on("change", function () {
        rows().prop("checked", $master.prop("checked"));
        sync();
      });
      $(document).on("change", rowSel, sync);
    }

    bindTableBulk("servers-select-all", ".js-server-row-cb", "servers-selected-count", "servers-bulk-actions");
    bindTableBulk("tech-select-all", ".js-tech-row-cb", "tech-selected-count", "tech-bulk-actions");
    bindTableBulk("users-select-all", ".js-user-row-cb", "users-selected-count", "users-bulk-actions");
    bindTableBulk("incidents-select-all", ".js-incident-row-cb", "incidents-selected-count", "incidents-bulk-actions");
    bindTableBulk("codes-select-all", ".js-code-row-cb", "codes-selected-count", "codes-bulk-actions");
    bindTableBulk("relations-select-all", ".js-relation-row-cb", "relations-selected-count", "relations-bulk-actions");

    // ----- 서비스 분류 트리 확장 -----
    $("[data-tree-toggle]").on("click", function (e) {
      e.stopPropagation();
      var id = String($(this).data("tree-toggle"));
      var $ch = $('[data-tree-children="' + id + '"]');
      $(this).find("[data-tree-chev]").toggleClass("is-open");
      $ch.toggleClass("is-hidden");
    });

    var SVCCAT_CHILDREN = {
      CORE: [
        { name: "결제", code: "CORE-PAY", level: 2, count: 23, sort: 1 },
        { name: "보안", code: "CORE-SEC", level: 2, count: 18, sort: 2 },
        { name: "프론트엔드", code: "CORE-FE", level: 2, count: 45, sort: 3 },
      ],
      "CORE-PAY": [
        { name: "API", code: "CORE-PAY-API", level: 3, count: 15, sort: 1 },
        { name: "배치", code: "CORE-PAY-BATCH", level: 3, count: 8, sort: 2 },
      ],
      "CORE-SEC": [
        { name: "인증", code: "CORE-SEC-AUTH", level: 3, count: 10, sort: 1 },
        { name: "암호화", code: "CORE-SEC-ENCRYPT", level: 3, count: 8, sort: 2 },
      ],
      ADDON: [
        { name: "알림", code: "ADDON-NOTI", level: 2, count: 12, sort: 1 },
        { name: "리포트", code: "ADDON-REPORT", level: 2, count: 8, sort: 2 },
      ],
      INFRA: [
        { name: "모니터링", code: "INFRA-MON", level: 2, count: 15, sort: 1 },
        { name: "백업", code: "INFRA-BACKUP", level: 2, count: 9, sort: 2 },
      ],
    };

    var FOLDER_TREE_SVG =
      '<svg class="cv-icon cv-icon--sm" style="color:rgb(37 99 235);flex-shrink:0" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M20 10a1 1 0 0 0 1-1V6a1 1 0 0 0-1-1h-2.5a1 1 0 0 1-.8-.4l-.9-1.2A1 1 0 0 0 15 3h-2a1 1 0 0 0-1 1v5a1 1 0 0 0 1 1Z"/><path d="M20 21a1 1 0 0 0 1-1v-3a1 1 0 0 0-1-1h-2.9a1 1 0 0 1-.88-.55l-.42-.85a1 1 0 0 0-.92-.6H13a1 1 0 0 0-1 1v5a1 1 0 0 0 1 1Z"/><path d="M3 5a2 2 0 0 0 2 2h3"/><path d="M3 3v13a2 2 0 0 0 2 2h3"/></svg>';

    function svccatSublistHtml(children) {
      var h = "";
      for (var i = 0; i < children.length; i++) {
        var ch = children[i];
        h +=
          '<button type="button" class="cv-svc-child-card" data-svccat-pick data-name="' +
          String(ch.name).replace(/"/g, "&quot;") +
          '" data-code="' +
          String(ch.code).replace(/"/g, "&quot;") +
          '" data-level="' +
          ch.level +
          '" data-count="' +
          ch.count +
          '" data-sort="' +
          ch.sort +
          '"><span class="cv-svccat-pick__row">' +
          FOLDER_TREE_SVG +
          '<span class="font-medium" style="font-size:0.875rem">' +
          String(ch.name) +
          '</span><span class="cv-badge cv-badge--outline" style="font-size:0.6875rem">' +
          String(ch.code) +
          '</span></span><span class="cv-badge cv-badge--outline">' +
          ch.count +
          "개</span></button>";
      }
      return h;
    }

    function escapeHtml(s) {
      return String(s)
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;");
    }

    function showToast(message, variant) {
      variant = variant || "success";
      var $host = $("#cv-toast-host");
      if (!$host.length) {
        $host = $('<div id="cv-toast-host" class="cv-toast-host" aria-live="polite"></div>');
        $("body").append($host);
      }
      var cls = variant === "error" ? "cv-toast cv-toast--error" : "cv-toast cv-toast--success";
      var $t = $('<div class="' + cls + '"></div>').text(message);
      $host.append($t);
      window.setTimeout(function () {
        $t.fadeOut(200, function () {
          $(this).remove();
        });
      }, 2400);
    }

    function applySvccatSelection($el) {
      $("[data-svccat-pick]").removeClass("is-active");
      $("[data-svccat-tree-row]").removeClass("is-selected");
      $el.addClass("is-active");
      $el.closest("[data-svccat-tree-row]").addClass("is-selected");
      $("#svccat-detail-empty").addClass("is-hidden");
      $("#svccat-detail-body").removeClass("is-hidden");

      var name = $el.attr("data-name") || "";
      var code = String($el.attr("data-code") || "");
      var level = Number($el.attr("data-level") || 0);
      var count = Number($el.attr("data-count") || 0);
      var sort = String($el.attr("data-sort") || "");

      $("#svccat-d-name").text(name);
      $("#svccat-d-code").text(code);
      $("#svccat-d-level-num").text(String(level));
      $("#svccat-d-sort").text(sort);
      $("#svccat-d-svc-badge").text(count + "개");

      var children = SVCCAT_CHILDREN[code];
      var $subBlock = $("#svccat-children-block");
      var $subList = $("#svccat-children-list");
      $subList.empty();
      if (children && children.length) {
        $subBlock.removeClass("is-hidden");
        $subList.html(svccatSublistHtml(children));
      } else {
        $subBlock.addClass("is-hidden");
      }

      var hasChildRows = !!(children && children.length);
      var canDelete = count === 0 && !hasChildRows;
      var $del = $("#svccat-btn-delete");
      $del.prop("disabled", !canDelete);
      $del.toggleClass("is-disabled", !canDelete);

      var $warn = $("#svccat-delete-warn");
      var $warnMsg = $("#svccat-delete-warn-msg");
      if (hasChildRows) {
        $warn.removeClass("is-hidden");
        $warnMsg.text("하위 분류가 존재하는 분류는 삭제할 수 없습니다.");
      } else if (count > 0) {
        $warn.removeClass("is-hidden");
        $warnMsg.text(count + "개의 서비스가 연결되어 있어 삭제할 수 없습니다.");
      } else {
        $warn.addClass("is-hidden");
        $warnMsg.empty();
      }
    }

    // ----- 서비스 분류 선택 → 우측 패널 -----
    $(document).on("click", "[data-svccat-pick]", function () {
      applySvccatSelection($(this));
    });

    $("#svccat-btn-delete").on("click", function () {
      if ($(this).prop("disabled")) {
        return;
      }
      var nm = $("#svccat-d-name").text() || "";
      $("#svccat-delete-desc").html(
        '정말로 "<strong>' +
          escapeHtml(nm) +
          '</strong>" 분류를 삭제하시겠습니까?<br />이 작업은 되돌릴 수 없습니다.'
      );
      $("#modal-svccat-delete").removeClass("is-hidden");
    });

    $("#svccat-delete-confirm").on("click", function () {
      $("#modal-svccat-delete").addClass("is-hidden");
      showToast("분류가 삭제되었습니다.", "success");
      $("#svccat-detail-empty").removeClass("is-hidden");
      $("#svccat-detail-body").addClass("is-hidden");
      $("[data-svccat-pick]").removeClass("is-active");
      $("[data-svccat-tree-row]").removeClass("is-selected");
    });

    var SERVER_DETAIL_SERVICES_SAMPLE = [
      { name: "결제 API 서비스", code: "PAY-API-001", status: "운영중" },
      { name: "결제 배치 서비스", code: "PAY-BATCH-001", status: "운영중" },
      { name: "PG 게이트웨이", code: "PG-GW-001", status: "운영중" },
    ];

    function serverEnvBadge(env) {
      env = String(env || "");
      if (env === "Production") {
        return '<span class="cv-badge cv-badge--red">' + env + "</span>";
      }
      if (env === "Test") {
        return '<span class="cv-badge cv-badge--blue">' + env + "</span>";
      }
      if (env === "Development") {
        return '<span class="cv-badge cv-badge--gray">' + env + "</span>";
      }
      return '<span class="cv-badge cv-badge--outline">' + env + "</span>";
    }

    function serverStatusBadge(st) {
      st = String(st || "");
      if (st === "운영중") {
        return '<span class="cv-badge cv-badge--green">' + st + "</span>";
      }
      if (st === "테스트") {
        return '<span class="cv-badge cv-badge--blue">' + st + "</span>";
      }
      if (st === "개발") {
        return '<span class="cv-badge cv-badge--gray">' + st + "</span>";
      }
      return '<span class="cv-badge cv-badge--outline">' + st + "</span>";
    }

    function populateServerDetailModal($tr) {
      var name = $tr.attr("data-srv-name") || "";
      var host = $tr.attr("data-srv-host") || "";
      var ip = $tr.attr("data-srv-ip") || "";
      var env = $tr.attr("data-srv-env") || "";
      var os = $tr.attr("data-srv-os") || "";
      var osver = $tr.attr("data-srv-osver") || "";
      var st = $tr.attr("data-srv-status") || "";
      var cnt = parseInt($tr.attr("data-srv-count") || "0", 10) || 0;

      $("#server-d-name").text(name);
      $("#server-d-host").text(host);
      $("#server-d-ip").text(ip);
      $("#server-d-env").html(serverEnvBadge(env));
      $("#server-d-os").text(os + " " + osver);
      $("#server-d-status").html(serverStatusBadge(st));

      var $list = $("#server-detail-services-list");
      var $empty = $("#server-detail-services-empty");
      if (cnt > 0) {
        $empty.addClass("is-hidden");
        $list.removeClass("is-hidden").empty();
        var nShow = Math.min(cnt, SERVER_DETAIL_SERVICES_SAMPLE.length);
        for (var i = 0; i < nShow; i++) {
          var s = SERVER_DETAIL_SERVICES_SAMPLE[i];
          var row =
            '<div class="cv-server-detail-card"><div><p class="font-medium" style="margin:0;font-size:0.875rem;color:var(--gray-900)">' +
            s.name +
            '</p><p class="mono" style="margin:0.15rem 0 0;font-size:0.8125rem;color:var(--gray-600)">' +
            s.code +
            '</p></div><div class="cv-cell-inline" style="flex-shrink:0">' +
            serverStatusBadge(s.status) +
            '<a class="cv-btn cv-btn--ghost cv-btn--sm" href="service-detail.html">상세</a></div></div>';
          $list.append(row);
        }
      } else {
        $list.addClass("is-hidden").empty();
        $empty.removeClass("is-hidden");
      }
    }

    function syncCodeFormActiveLabel() {
      var on = $("#code-form-active").prop("checked");
      $("#code-form-active-label").text(on ? "Y" : "N");
    }

    function prepareCodeModal($btn) {
      var $tr = $btn.closest("tr[data-code-group]");
      var isEdit = $btn.hasClass("js-code-edit") && $tr.length > 0;
      if (isEdit) {
        $("#modal-code-title").text("공통코드 수정");
        $("#modal-code-desc").text("공통코드 정보를 수정합니다");
        $("#modal-code-submit").text("수정");
        $("#code-form-group").val($tr.attr("data-code-group") || "");
        $("#code-form-code").val(
          String($tr.attr("data-item-code") || "")
            .toUpperCase()
        );
        $("#code-form-name").val($tr.attr("data-code-name") || "");
        $("#code-form-sort").val($tr.attr("data-sort-order") || "1");
        $("#code-form-notes").val($tr.attr("data-notes") || "");
        var ia = String($tr.attr("data-is-active") || "true").toLowerCase();
        $("#code-form-active").prop("checked", ia === "true" || ia === "1");
      } else {
        $("#modal-code-title").text("공통코드 등록");
        $("#modal-code-desc").text("새로운 공통코드를 등록합니다");
        $("#modal-code-submit").text("등록");
        $("#code-form-group").val("");
        $("#code-form-code").val("");
        $("#code-form-name").val("");
        $("#code-form-sort").val("1");
        $("#code-form-notes").val("");
        $("#code-form-active").prop("checked", true);
        var $chip = $("[data-code-filter].is-active");
        var chipG = $chip.attr("data-code-filter");
        if (chipG && chipG !== "ALL") {
          $("#code-form-group").val(chipG);
        }
      }
      syncCodeFormActiveLabel();
    }

    $(document).on("change", "#code-form-active", syncCodeFormActiveLabel);

    $(document).on("input", "#code-form-code", function () {
      this.value = this.value.toUpperCase();
    });

    function prepareRelationModal($btn) {
      var $tr = $btn.closest("tr[data-relation-id]");
      var isEdit = $btn.hasClass("js-relation-edit") && $tr.length > 0;
      if (isEdit) {
        $("#modal-relation-title").text("서비스 관계 수정");
        $("#modal-relation-desc").text("서비스 관계를 수정합니다");
        $("#modal-relation-submit").text("수정");
        $("#relation-form-source").val($tr.attr("data-source-id") || "");
        $("#relation-form-target").val($tr.attr("data-target-id") || "");
        $("#relation-form-type").val($tr.attr("data-relation-type") || "");
        $("#relation-form-status").val($tr.attr("data-relation-status") || "");
        var req = String($tr.attr("data-is-required") || "false").toLowerCase();
        $("#relation-form-required").prop("checked", req === "true" || req === "1");
        $("#relation-form-desc").val($tr.attr("data-description") || "");
      } else {
        $("#modal-relation-title").text("서비스 관계 등록");
        $("#modal-relation-desc").text("새로운 서비스 관계를 등록합니다");
        $("#modal-relation-submit").text("등록");
        $("#relation-form-source").val("");
        $("#relation-form-target").val("");
        $("#relation-form-type").val("");
        $("#relation-form-status").val("정상");
        $("#relation-form-required").prop("checked", false);
        $("#relation-form-desc").val("");
      }
    }

    $(document).on("click", "#modal-relation-submit", function () {
      $("#modal-relation-add").addClass("is-hidden");
      var edit = $("#modal-relation-title").text().indexOf("수정") >= 0;
      showToast(edit ? "서비스 관계가 수정되었습니다." : "서비스 관계가 등록되었습니다.");
    });

    $(document).on("click", "[data-graph-service-pick]", function () {
      var $b = $(this);
      $("[data-graph-service-pick]").removeClass("is-active");
      $b.addClass("is-active");
      var name = $b.attr("data-svc-name") || "";
      var code = $b.attr("data-svc-code") || "";
      var st = $b.attr("data-svc-status") || "";
      var imp = $b.attr("data-svc-importance") || "";
      var id = $b.attr("data-svc-id") || "";
      $("#graph-center-name").text(name);
      $("#graph-center-code").text(code);
      $("#graph-center-status").text(st);
      $("#graph-center-importance").text(imp);
      $("#graph-card-desc").text(name + "의 서비스 의존 관계");
      $("#graph-center-detail-link").attr("href", "service-detail.html?id=" + encodeURIComponent(id));
    });

    // ----- 모달 -----
    $(document).on("click", "[data-open-modal]", function () {
      var $btn = $(this);
      var mid = String($btn.data("open-modal"));
      if (mid === "server-detail") {
        var $tr = $btn.closest("tr");
        if ($tr.length) {
          populateServerDetailModal($tr);
        }
      }
      if (mid === "code-add") {
        prepareCodeModal($btn);
      }
      if (mid === "relation-add") {
        prepareRelationModal($btn);
      }
      $("#modal-" + mid).removeClass("is-hidden");
    });
    $(document).on("click", "[data-close-modal]", function () {
      $(this).closest(".cv-modal").addClass("is-hidden");
    });
    $(document).on("click", ".cv-modal__backdrop", function () {
      $(this).closest(".cv-modal").addClass("is-hidden");
    });

    // ----- 그룹 카드 ↔ 우측 패널 -----
    $(document).on("click", "[data-group-pick]", function () {
      var gid = String($(this).data("group-pick"));
      $("[data-group-pick]").removeClass("is-active");
      $(this).addClass("is-active");
      $("[data-group-panel]").addClass("is-hidden");
      $('[data-group-panel="' + gid + '"]').removeClass("is-hidden");
    });

    function updateCodesVisibleRowCount() {
      var $c = $("#codes-visible-count");
      if (!$c.length) {
        return;
      }
      var n = $("tr[data-code-group]:not(.is-hidden)").length;
      $c.text(String(n));
    }

    // ----- 공통코드 그룹 칩 필터 -----
    $(document).on("click", "[data-code-filter]", function () {
      var g = $(this).attr("data-code-filter");
      $("[data-code-filter]").removeClass("is-active");
      $(this).addClass("is-active");
      if (!g || g === "ALL") {
        $("tr[data-code-group]").removeClass("is-hidden");
      } else {
        $("tr[data-code-group]").each(function () {
          var rowG = String($(this).data("code-group"));
          $(this).toggleClass("is-hidden", rowG !== String(g));
        });
      }
      var $master = $("#codes-select-all");
      if ($master.length) {
        $master.prop("checked", false);
        if ($master[0]) {
          $master[0].indeterminate = false;
        }
      }
      $(".js-code-row-cb").prop("checked", false);
      $("#codes-selected-count").addClass("is-hidden").empty();
      $("#codes-bulk-actions").addClass("is-hidden");
      updateCodesVisibleRowCount();
    });

    updateCodesVisibleRowCount();
  });
})(jQuery);
