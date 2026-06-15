const storageKey = "homeMedicineInventory";

const form = document.querySelector("#medicineForm");
const medicineId = document.querySelector("#medicineId");
const nameInput = document.querySelector("#nameInput");
const activeInput = document.querySelector("#activeInput");
const quantityInput = document.querySelector("#quantityInput");
const expiryInput = document.querySelector("#expiryInput");
const locationInput = document.querySelector("#locationInput");
const notesInput = document.querySelector("#notesInput");
const searchInput = document.querySelector("#searchInput");
const statusFilter = document.querySelector("#statusFilter");
const medicineList = document.querySelector("#medicineList");
const emptyState = document.querySelector("#emptyState");
const formTitle = document.querySelector("#formTitle");
const cancelEditButton = document.querySelector("#cancelEditButton");
const seedButton = document.querySelector("#seedButton");
const exportButton = document.querySelector("#exportButton");
const importInput = document.querySelector("#importInput");
const formMessage = document.querySelector("#formMessage");
const totalCount = document.querySelector("#totalCount");
const soonCount = document.querySelector("#soonCount");
const expiredCount = document.querySelector("#expiredCount");

let medicines = loadMedicines();

function loadMedicines() {
  try {
    return JSON.parse(localStorage.getItem(storageKey)) || [];
  } catch {
    return [];
  }
}

function saveMedicines() {
  localStorage.setItem(storageKey, JSON.stringify(medicines));
}

function getStatus(expiry) {
  const today = startOfDay(new Date());
  const expiryDate = startOfDay(new Date(`${expiry}T00:00:00`));
  const days = Math.ceil((expiryDate - today) / 86400000);

  if (days < 0) {
    return { key: "expired", label: "Vencido" };
  }

  if (days <= 30) {
    return { key: "soon", label: days === 0 ? "Vence hoy" : `Vence en ${days} dias` };
  }

  return { key: "ok", label: "Vigente" };
}

function startOfDay(date) {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate());
}

function formatDate(value) {
  const date = new Date(`${value}T00:00:00`);
  return new Intl.DateTimeFormat("es-CL", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric"
  }).format(date);
}

function normalize(value) {
  return value.trim().toLowerCase();
}

function render() {
  const query = normalize(searchInput.value);
  const selectedStatus = statusFilter.value;

  const filtered = medicines
    .map((medicine) => ({ ...medicine, status: getStatus(medicine.expiry) }))
    .filter((medicine) => {
      const haystack = normalize([
        medicine.name,
        medicine.active,
        medicine.location,
        medicine.notes
      ].join(" "));
      const matchesSearch = !query || haystack.includes(query);
      const matchesStatus = selectedStatus === "all" || medicine.status.key === selectedStatus;
      return matchesSearch && matchesStatus;
    })
    .sort((a, b) => a.expiry.localeCompare(b.expiry));

  medicineList.innerHTML = "";
  emptyState.hidden = filtered.length > 0;

  for (const medicine of filtered) {
    const card = document.createElement("article");
    card.className = `medicine-card ${medicine.status.key}`;
    card.innerHTML = `
      <div class="medicine-main">
        <div>
          <h3 class="medicine-title">${escapeHtml(medicine.name)}</h3>
          <p class="medicine-meta">${escapeHtml(medicine.active || "Sin principio activo registrado")}</p>
        </div>
        <span class="badge ${medicine.status.key}">${medicine.status.label}</span>
      </div>
      <p class="medicine-meta">
        Cantidad: <strong>${medicine.quantity}</strong> &middot; Vence: <strong>${formatDate(medicine.expiry)}</strong> &middot; ${escapeHtml(medicine.location)}
      </p>
      ${medicine.notes ? `<p class="medicine-notes">${escapeHtml(medicine.notes)}</p>` : ""}
      <div class="card-actions">
        <button class="text-button" type="button" data-action="edit" data-id="${medicine.id}">Editar</button>
        <button class="text-button" type="button" data-action="delete" data-id="${medicine.id}">Eliminar</button>
      </div>
    `;
    medicineList.append(card);
  }

  updateSummary();
}

function updateSummary() {
  const statuses = medicines.map((medicine) => getStatus(medicine.expiry).key);
  totalCount.textContent = medicines.length;
  soonCount.textContent = statuses.filter((status) => status === "soon").length;
  expiredCount.textContent = statuses.filter((status) => status === "expired").length;
}

function resetForm() {
  form.reset();
  medicineId.value = "";
  formTitle.textContent = "Agregar medicamento";
  cancelEditButton.hidden = true;
}

function showMessage(message) {
  formMessage.textContent = message;
  window.setTimeout(() => {
    if (formMessage.textContent === message) {
      formMessage.textContent = "";
    }
  }, 3000);
}

function editMedicine(id) {
  const medicine = medicines.find((item) => item.id === id);
  if (!medicine) return;

  medicineId.value = medicine.id;
  nameInput.value = medicine.name;
  activeInput.value = medicine.active;
  quantityInput.value = medicine.quantity;
  expiryInput.value = medicine.expiry;
  locationInput.value = medicine.location;
  notesInput.value = medicine.notes;
  formTitle.textContent = "Editar medicamento";
  cancelEditButton.hidden = false;
  nameInput.focus();
}

function deleteMedicine(id) {
  medicines = medicines.filter((medicine) => medicine.id !== id);
  saveMedicines();
  render();
}

function escapeHtml(value) {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

form.addEventListener("submit", (event) => {
  event.preventDefault();

  const data = {
    id: medicineId.value || crypto.randomUUID(),
    name: nameInput.value.trim(),
    active: activeInput.value.trim(),
    quantity: Number(quantityInput.value),
    expiry: expiryInput.value,
    location: locationInput.value.trim(),
    notes: notesInput.value.trim()
  };

  if (medicineId.value) {
    medicines = medicines.map((medicine) => medicine.id === data.id ? data : medicine);
  } else {
    medicines = [...medicines, data];
  }

  saveMedicines();
  resetForm();
  showMessage("Medicamento guardado.");
  render();
});

medicineList.addEventListener("click", (event) => {
  const button = event.target.closest("button[data-action]");
  if (!button) return;

  const { action, id } = button.dataset;
  if (action === "edit") editMedicine(id);
  if (action === "delete") deleteMedicine(id);
});

cancelEditButton.addEventListener("click", resetForm);
searchInput.addEventListener("input", render);
statusFilter.addEventListener("change", render);

seedButton.addEventListener("click", () => {
  if (medicines.length > 0) return;

  medicines = [
    {
      id: crypto.randomUUID(),
      name: "Paracetamol 500 mg",
      active: "Paracetamol",
      quantity: 12,
      expiry: "2026-08-15",
      location: "Botiquin bano",
      notes: "Dolor o fiebre"
    },
    {
      id: crypto.randomUUID(),
      name: "Loratadina 10 mg",
      active: "Loratadina",
      quantity: 6,
      expiry: "2026-06-20",
      location: "Cajon dormitorio",
      notes: "Alergias"
    }
  ];
  saveMedicines();
  render();
});

exportButton.addEventListener("click", () => {
  const payload = JSON.stringify(medicines, null, 2);
  const blob = new Blob([payload], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = "medicamentos-casa.json";
  link.click();
  URL.revokeObjectURL(url);
});

importInput.addEventListener("change", async () => {
  const [file] = importInput.files;
  if (!file) return;

  try {
    const imported = JSON.parse(await file.text());
    if (!Array.isArray(imported)) {
      throw new Error("Formato invalido");
    }

    medicines = imported
      .filter((medicine) => medicine.name && medicine.expiry && medicine.location)
      .map((medicine) => ({
        id: medicine.id || crypto.randomUUID(),
        name: String(medicine.name),
        active: String(medicine.active || ""),
        quantity: Number(medicine.quantity || 0),
        expiry: String(medicine.expiry),
        location: String(medicine.location),
        notes: String(medicine.notes || "")
      }));
    saveMedicines();
    resetForm();
    showMessage("Inventario importado.");
    render();
  } catch {
    showMessage("No se pudo importar el archivo.");
  } finally {
    importInput.value = "";
  }
});

render();
