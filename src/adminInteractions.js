export function initAdminInteractions({ root }) {
  const handleClick = (event) => {
    const opener = event.target.closest("[data-modal-open]");
    if (opener && root.contains(opener)) {
      event.preventDefault();
      const id = opener.getAttribute("data-modal-open");
      root.querySelector(`#${CSS.escape(id)}`)?.classList.add("is-open");
      return;
    }

    const incidentCreateButton = event.target.closest("#m-inc-create .modal__foot .btn--primary");
    if (incidentCreateButton && root.contains(incidentCreateButton)) {
      event.preventDefault();
      if (window.confirm("인시던트를 등록하시겠습니까?")) {
        root.querySelector("#m-inc-create")?.classList.remove("is-open");
      }
      return;
    }

    const shouldClose = event.target.closest("[data-modal-close]") || event.target.classList.contains("modal-backdrop");
    if (!shouldClose) {
      return;
    }

    root.querySelectorAll(".modal-backdrop.is-open").forEach((modal) => {
      if (event.target.classList.contains("modal-backdrop") && event.target !== modal) {
        return;
      }
      modal.classList.remove("is-open");
    });
  };

  const handleChange = (event) => {
    const master = event.target.closest("table.tbl thead .chk");
    if (!master || !root.contains(master)) {
      return;
    }

    const table = master.closest("table");
    table?.querySelectorAll("tbody .chk").forEach((checkbox) => {
      checkbox.checked = master.checked;
    });
  };

  root.addEventListener("click", handleClick);
  root.addEventListener("change", handleChange);

  return () => {
    root.removeEventListener("click", handleClick);
    root.removeEventListener("change", handleChange);
  };
}
