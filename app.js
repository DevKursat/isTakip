import { initFirebase } from "./firebase.js";

let motionApi = null;
(async () => {
  try {
    motionApi = await import("https://cdn.jsdelivr.net/npm/motion@12.10.5/+esm");
  } catch {
    motionApi = null;
  }
})();

const motionEasing = "cubic-bezier(0.22, 1, 0.36, 1)";
const motionEasingSoft = "cubic-bezier(0.16, 1, 0.3, 1)";
const prefersReducedMotion = () => window.matchMedia("(prefers-reduced-motion: reduce)").matches;
const fallbackErrorMessage = "İşlem sırasında hata oluştu, tekrar deneyin.";

let db;
let collection;
let addDoc;
let onSnapshot;
let query;
let orderBy;
let serverTimestamp;
let doc;
let updateDoc;
let deleteDoc;
let where;
let limit;
let getDocs;
let setDoc;
let getDoc;

const el = {
  authPanel: document.getElementById("authPanel"),
  authForm: document.getElementById("authForm"),
  authTitle: document.getElementById("authTitle"),
  authSubmit: document.getElementById("authSubmit"),
  modeToggle: document.getElementById("modeToggle"),
  businessName: document.getElementById("businessName"),
  password: document.getElementById("password"),
  authMessage: document.getElementById("authMessage"),
  dashboard: document.getElementById("dashboard"),
  businessTitle: document.getElementById("businessTitle"),
  logoutBtn: document.getElementById("logoutBtn"),
  debtForm: document.getElementById("debtForm"),
  debtName: document.getElementById("debtName"),
  debtAmount: document.getElementById("debtAmount"),
  debtNote: document.getElementById("debtNote"),
  debtMessage: document.getElementById("debtMessage"),
  searchInput: document.getElementById("searchInput"),
  statusFilter: document.getElementById("statusFilter"),
  debtList: document.getElementById("debtList"),
  emptyState: document.getElementById("emptyState"),
  openTotal: document.getElementById("openTotal"),
  paidTotal: document.getElementById("paidTotal"),
  recordCount: document.getElementById("recordCount")
};

const state = {
  mode: "register",
  debts: [],
  businessSlug: "",
  unsubscribeDebts: null
};

const currency = new Intl.NumberFormat("tr-TR", {
  style: "currency",
  currency: "TRY",
  maximumFractionDigits: 2
});

function playAnimation(target, keyframes, options = {}) {
  if (prefersReducedMotion()) return;
  const nodes = Array.from(document.querySelectorAll(target));
  if (!nodes.length) return;

  const mergedOptions = {
    duration: 0.35,
    easing: motionEasing,
    ...options
  };

  if (motionApi?.animate) {
    const motionOptions = { ...mergedOptions };
    if (motionOptions.stagger) {
      motionOptions.delay = motionApi.stagger(motionOptions.stagger);
      delete motionOptions.stagger;
    }
    motionApi.animate(target, keyframes, motionOptions);
    return;
  }

  const delayStep = mergedOptions.stagger || 0;
  nodes.forEach((node, index) => {
    node.animate(keyframes, {
      duration: mergedOptions.duration * 1000,
      fill: "both",
      easing: mergedOptions.easing,
      delay: ((mergedOptions.delay || 0) + delayStep * index) * 1000
    });
  });
}

function animateHero() {
  playAnimation(".hero h1", { opacity: [0, 1], transform: ["translateY(18px)", "translateY(0px)"] }, { duration: 0.5 });
  playAnimation(".hero p", { opacity: [0, 1], transform: ["translateY(16px)", "translateY(0px)"] }, { duration: 0.45, delay: 0.08, easing: motionEasingSoft });
}

function animateAuthPanel() {
  playAnimation("#authPanel", { opacity: [0, 1], transform: ["translateY(16px) scale(0.98)", "translateY(0px) scale(1)"] }, { duration: 0.45 });
  playAnimation("#authForm label, #authForm button", { opacity: [0, 1], transform: ["translateY(10px)", "translateY(0px)"] }, { duration: 0.32, stagger: 0.05, delay: 0.06, easing: motionEasingSoft });
}

function animateDashboardIntro() {
  playAnimation("#dashboard .card:not(.stat-card)", { opacity: [0, 1], transform: ["translateY(16px) scale(0.985)", "translateY(0px) scale(1)"] }, { duration: 0.4, stagger: 0.08 });
  playAnimation(".stat-card", { opacity: [0, 1], transform: ["translateY(14px) scale(0.98)", "translateY(0px) scale(1)"] }, { duration: 0.36, stagger: 0.05, delay: 0.08, easing: motionEasingSoft });
}

function slugify(value) {
  return value
    .trim()
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "")
    .slice(0, 40);
}

function businessEmail(slug) {
  return `${slug}@istakip-k.firebaseapp.com`;
}

function showMessage(target, text, isError = false) {
  target.textContent = text;
  target.classList.toggle("error", isError);
}

function setAuthMode(mode) {
  state.mode = mode;
  const register = mode === "register";
  el.authTitle.textContent = register ? "İşletme Oluştur" : "İşletmeye Giriş";
  el.authSubmit.textContent = register ? "İşletme Oluştur" : "Giriş Yap";
  el.modeToggle.textContent = register ? "Giriş yap" : "Yeni işletme oluştur";
  showMessage(el.authMessage, "");
  animateAuthPanel();
}

function setAuthLoading(isLoading) {
  el.authSubmit.disabled = isLoading;
  el.modeToggle.disabled = isLoading;
}

function togglePanels(isAuthenticated) {
  el.authPanel.classList.toggle("hidden", isAuthenticated);
  el.dashboard.classList.toggle("hidden", !isAuthenticated);
}

// Removed mapAuthError

function mapFirestoreError(code) {
  if (code === "permission-denied") {
    return "Firestore erişimi reddedildi. Güvenlik kurallarını kontrol edin.";
  }
  return null;
}

function mapFirebaseError(code) {
  return mapFirestoreError(code) || fallbackErrorMessage;
}

// Removed unused resolveBusinessSlugForUser

async function createBusiness(name, password) {
  const slug = slugify(name);
  if (!slug) {
    throw new Error("İşletme adı en az 2 karakter içermeli ve sadece harf/sayı kullanılmalıdır.");
  }

  const ref = doc(db, "businesses", slug);
  const existing = await getDoc(ref);
  if (existing.exists()) {
    throw new Error("Bu işletme adı kullanımda.");
  }

  await setDoc(ref, {
    name: name.trim(),
    slug,
    password: password,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp()
  });

  localStorage.setItem("businessSlug", slug);
  await handleSession();
}

async function loginBusiness(name, password) {
  const slug = slugify(name);
  if (!slug) {
    throw new Error("İşletme adı en az 2 karakter içermeli ve sadece harf/sayı kullanılmalıdır.");
  }

  const ref = doc(db, "businesses", slug);
  const snap = await getDoc(ref);
  
  if (!snap.exists()) {
    throw new Error("İşletme adı veya şifre hatalı.");
  }
  
  const data = snap.data();
  if (data.password !== password) {
    throw new Error("İşletme adı veya şifre hatalı.");
  }

  localStorage.setItem("businessSlug", slug);
  await handleSession();
}

function resetDebtState() {
  state.debts = [];
  renderDebts();
}

function totalize() {
  const totals = state.debts.reduce(
    (acc, item) => {
      const amount = Number(item.amount || 0);
      acc.count += 1;
      if (item.status === "paid") {
        acc.paid += amount;
      } else {
        acc.open += amount;
      }
      return acc;
    },
    { open: 0, paid: 0, count: 0 }
  );

  el.openTotal.textContent = currency.format(totals.open);
  el.paidTotal.textContent = currency.format(totals.paid);
  el.recordCount.textContent = String(totals.count);
}

function filteredDebts() {
  const search = el.searchInput.value.trim().toLowerCase();
  const status = el.statusFilter.value;

  return state.debts.filter((item) => {
    const statusOk = status === "all" ? true : item.status === status;
    const haystack = `${item.name} ${item.note || ""}`.toLowerCase();
    const searchOk = search ? haystack.includes(search) : true;
    return statusOk && searchOk;
  });
}

function renderDebts() {
  totalize();
  const rows = filteredDebts();
  el.debtList.innerHTML = "";

  if (!rows.length) {
    el.emptyState.classList.remove("hidden");
    return;
  }

  el.emptyState.classList.add("hidden");

  rows.forEach((item) => {
    const li = document.createElement("li");
    li.className = "debt-item";

    const head = document.createElement("div");
    head.className = "debt-item-header";

    const title = document.createElement("h4");
    title.textContent = item.name;

    const amount = document.createElement("span");
    amount.className = "amount";
    amount.textContent = currency.format(Number(item.amount || 0));

    head.append(title, amount);

    const status = document.createElement("span");
    status.className = `badge ${item.status}`;
    status.textContent = item.status === "paid" ? "Kapalı" : "Açık";

    const note = document.createElement("p");
    note.textContent = item.note ? `Not: ${item.note}` : "Not: -";

    const actions = document.createElement("div");
    actions.className = "item-actions";

    const toggleBtn = document.createElement("button");
    toggleBtn.className = "secondary";
    toggleBtn.type = "button";
    toggleBtn.textContent = item.status === "paid" ? "Yeniden Aç" : "Ödendi / Kapat";
    toggleBtn.addEventListener("click", () => toggleDebtStatus(item));

    const deleteBtn = document.createElement("button");
    deleteBtn.type = "button";
    deleteBtn.className = "danger";
    deleteBtn.textContent = "Sil";
    deleteBtn.addEventListener("click", () => removeDebt(item.id));

    actions.append(toggleBtn, deleteBtn);
    li.append(head, status, note, actions);
    el.debtList.appendChild(li);
  });

  playAnimation(
    ".debt-item",
    {
      opacity: [0, 1],
      transform: ["translateY(16px) scale(0.985)", "translateY(0px) scale(1)"],
      filter: ["blur(4px)", "blur(0px)"]
    },
    { duration: 0.32, stagger: 0.05, easing: motionEasingSoft }
  );
}

async function toggleDebtStatus(item) {
  const next = item.status === "paid" ? "open" : "paid";
  await updateDoc(doc(db, "businesses", state.businessSlug, "debts", item.id), {
    status: next,
    updatedAt: serverTimestamp(),
    paidAt: next === "paid" ? serverTimestamp() : null
  });
}

async function removeDebt(id) {
  const ok = confirm("Bu kaydı silmek istediğinizden emin misiniz?");
  if (!ok) return;
  await deleteDoc(doc(db, "businesses", state.businessSlug, "debts", id));
}

function subscribeDebts() {
  if (state.unsubscribeDebts) state.unsubscribeDebts();

  const q = query(collection(db, "businesses", state.businessSlug, "debts"), orderBy("createdAt", "desc"));
  state.unsubscribeDebts = onSnapshot(q, (snapshot) => {
    state.debts = snapshot.docs.map((entry) => ({ id: entry.id, ...entry.data() }));
    renderDebts();
  });
}

el.modeToggle.addEventListener("click", () => {
  setAuthMode(state.mode === "register" ? "login" : "register");
});

el.authForm.addEventListener("submit", async (event) => {
  event.preventDefault();
  if (!db) {
    showMessage(el.authMessage, "Firebase bağlantısı kurulamadı. Lütfen ağ erişimini kontrol edin.", true);
    return;
  }
  const name = el.businessName.value;
  const password = el.password.value;

  if (password.length < 6) {
    showMessage(el.authMessage, "Şifre en az 6 karakter olmalı.", true);
    return;
  }

  setAuthLoading(true);
  showMessage(el.authMessage, "İşlem yapılıyor...");

  try {
    if (state.mode === "register") {
      await createBusiness(name, password);
      showMessage(el.authMessage, "İşletme oluşturuldu. Giriş yapılıyor...");
    } else {
      await loginBusiness(name, password);
      showMessage(el.authMessage, "Giriş başarılı.");
    }
    el.authForm.reset();
  } catch (error) {
    const mapped = error.code ? mapFirebaseError(error.code) : null;
    showMessage(el.authMessage, mapped || error.message || fallbackErrorMessage, true);
  } finally {
    setAuthLoading(false);
  }
});

el.logoutBtn.addEventListener("click", async () => {
  localStorage.removeItem("businessSlug");
  await handleSession();
});

el.debtForm.addEventListener("submit", async (event) => {
  event.preventDefault();
  if (!db || !state.businessSlug) return;

  const name = el.debtName.value.trim();
  const amount = Number(el.debtAmount.value);
  const note = el.debtNote.value.trim();

  if (!name || Number.isNaN(amount) || amount <= 0) {
    showMessage(el.debtMessage, "Lütfen geçerli ad ve tutar girin.", true);
    return;
  }

  try {
    await addDoc(collection(db, "businesses", state.businessSlug, "debts"), {
      name,
      amount,
      note,
      status: "open",
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
      paidAt: null
    });

    el.debtForm.reset();
    showMessage(el.debtMessage, "Borç kaydı eklendi.");
  } catch (error) {
    console.error("Borç ekleme hatası:", error);
    showMessage(el.debtMessage, "Kayıt eklenemedi, tekrar deneyin.", true);
  }
});

el.searchInput.addEventListener("input", renderDebts);
el.statusFilter.addEventListener("change", renderDebts);

async function handleSession() {
  const slug = localStorage.getItem("businessSlug");
  
  if (!slug) {
    togglePanels(false);
    if (state.unsubscribeDebts) state.unsubscribeDebts();
    resetDebtState();
    state.businessSlug = "";
    return;
  }

  try {
    const businessSnap = await getDoc(doc(db, "businesses", slug));
    
    if (!businessSnap.exists()) {
      showMessage(el.authMessage, "İşletme kaydı bulunamadı.", true);
      localStorage.removeItem("businessSlug");
      handleSession();
      return;
    }

    state.businessSlug = slug;
    const business = businessSnap.data();
    el.businessTitle.textContent = business?.name || slug;

    togglePanels(true);
    subscribeDebts();
    animateDashboardIntro();
  } catch (error) {
    console.error("Oturum yükleme hatası:", error);
    showMessage(el.authMessage, "Oturum yüklenemedi, tekrar giriş yapın.", true);
    localStorage.removeItem("businessSlug");
    handleSession();
  }
}

async function bootstrap() {
  const firebase = await initFirebase();
  if (!firebase.ok) {
    setAuthLoading(true);
    showMessage(el.authMessage, "Firebase yüklenemedi. İnternet bağlantınızı kontrol edin.", true);
    return;
  }

  db = firebase.db;

  ({
    collection,
    addDoc,
    onSnapshot,
    query,
    orderBy,
    serverTimestamp,
    doc,
    updateDoc,
    deleteDoc,
    where,
    limit,
    getDocs,
    setDoc,
    getDoc
  } = firebase.firebaseDb);

  await handleSession();
}

animateHero();
animateAuthPanel();
bootstrap();
