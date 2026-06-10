/* ChainView Admin - 공통 LNB 주입 + 모달/테이블 인터랙션 */
(function(){
  // LNB HTML - 한 곳에서 관리
  const LNB_HTML = `
    <div class="lnb__brand">
      <div class="lnb__logo">CV</div>
      <div>
        <h2>ChainView</h2>
        <p>Admin Console</p>
      </div>
    </div>
    <div class="lnb__group">
      <div class="lnb__title">모니터링</div>
      <a class="lnb__item" data-key="dashboard" href="dashboard-proto.html">📊 실시간 대시보드<span class="badge">2</span></a>
      <a class="lnb__item" data-key="topology" href="dashboard-proto-topology.html">🗺️ 관계 그래프</a>
      <a class="lnb__item" data-key="incidents" href="admin-incidents.html">🚨 인시던트 관리</a>
    </div>
    <div class="lnb__group">
      <div class="lnb__title">서비스 카탈로그</div>
      <a class="lnb__item" data-key="services" href="admin-services.html">📦 서비스 관리</a>
      <a class="lnb__item" data-key="categories" href="admin-categories.html">🗂️ 서비스 분류 관리</a>
      <a class="lnb__item" data-key="techstacks" href="admin-techstacks.html">🧩 기술스택 마스터</a>
      <a class="lnb__item" data-key="relations" href="admin-relations.html">🔗 서비스 관계 관리</a>
    </div>
    <div class="lnb__group">
      <div class="lnb__title">배포 인프라</div>
      <a class="lnb__item" data-key="servers" href="admin-servers.html">🖥️ 서버 관리</a>
      <a class="lnb__item" data-key="deployments" href="admin-deployments.html">🚀 배포 정보</a>
    </div>
    <div class="lnb__group">
      <div class="lnb__title">소유권</div>
      <a class="lnb__item" data-key="users" href="admin-users.html">👥 사용자 관리</a>
      <a class="lnb__item" data-key="groups" href="admin-groups.html">📁 그룹 관리</a>
      <a class="lnb__item" data-key="owners" href="admin-owners.html">👨‍💼 서비스 담당자</a>
    </div>
    <div class="lnb__group">
      <div class="lnb__title">시스템</div>
      <a class="lnb__item" data-key="codes" href="admin-codes.html">⚙️ 공통코드 관리</a>
    </div>
  `;
  document.addEventListener('DOMContentLoaded', function(){
    const lnb = document.querySelector('.lnb');
    if (lnb && !lnb.dataset.injected) {
      lnb.innerHTML = LNB_HTML;
      lnb.dataset.injected = 'true';
    }
    // 활성 메뉴 표시
    const active = document.body.dataset.menu;
    if (active) {
      const a = document.querySelector(`.lnb__item[data-key="${active}"]`);
      if (a) a.classList.add('is-active');
    }
    // 모달 열기/닫기
    document.body.addEventListener('click', function(e){
      const opener = e.target.closest('[data-modal-open]');
      if (opener) {
        e.preventDefault();
        const id = opener.getAttribute('data-modal-open');
        document.getElementById(id)?.classList.add('is-open');
        return;
      }
      if (e.target.closest('[data-modal-close]') || e.target.classList.contains('modal-backdrop')) {
        document.querySelectorAll('.modal-backdrop.is-open').forEach(m=>{
          if (e.target.classList.contains('modal-backdrop') && e.target !== m) return;
          m.classList.remove('is-open');
        });
      }
    });
    // 전체 선택 체크박스
    document.querySelectorAll('table.tbl thead .chk').forEach(master=>{
      master.addEventListener('change', function(){
        const tbl = master.closest('table');
        tbl.querySelectorAll('tbody .chk').forEach(c=>c.checked = master.checked);
      });
    });
  });
})();
