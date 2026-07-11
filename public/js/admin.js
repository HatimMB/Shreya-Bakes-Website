let adminOrders = [];
let adminProducts = [];
let adminCustomers = [];
let adminMessages = [];

function getAdminSession() {
    try {
        return JSON.parse(localStorage.getItem("adminUser"));
    } catch (err) {
        return null;
    }
}

function setAdminSession(admin) {
    localStorage.setItem("adminUser", JSON.stringify(admin));
}

function clearAdminSession() {
    localStorage.removeItem("adminUser");
}

function adminLogout() {
    clearAdminSession();
    location.reload();
}

function showDashboard() {
    adminLoginSection.classList.add("hidden");
    adminDashboard.classList.remove("hidden");
    loadDashboard();
}

function showLogin() {
    adminLoginSection.classList.remove("hidden");
    adminDashboard.classList.add("hidden");
}

function formatMoney(value) {
    return "AED " + Number(value || 0).toFixed(2);
}

function formatDate(value) {
    if (!value) return "No date";
    const date = new Date(value);
    return Number.isNaN(date.getTime()) ? value : date.toLocaleString();
}

function escapeHTML(text) {
    return String(text || "")
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&#039;");
}

function renderPreviewList(id, items, emptyText) {
    const box = document.getElementById(id);
    if (!box) return;
    box.innerHTML = items.length ? items.join("") : `<p class="muted">${emptyText}</p>`;
}

async function loadDashboard() {
    try {
        const [summaryRes, orderRes, productRes, customerRes, messageRes] = await Promise.all([
            fetch("/api/admin/summary"),
            fetch("/api/admin/orders"),
            fetch("/api/admin/products"),
            fetch("/api/admin/users"),
            fetch("/api/admin/contacts")
        ]);

        const summaryData = await summaryRes.json();
        const orderData = await orderRes.json();
        const productData = await productRes.json();
        const customerData = await customerRes.json();
        const messageData = await messageRes.json();

        const summary = summaryData.summary || {};
        adminOrders = orderData.orders || [];
        adminProducts = productData.products || [];
        adminCustomers = customerData.customers || [];
        adminMessages = messageData.messages || [];

        adminTotalOrders.innerText = summary.totalOrders || 0;
        adminActiveOrders.innerText = summary.activeOrders || 0;
        adminTotalProducts.innerText = summary.totalProducts || 0;
        adminTotalCustomers.innerText = summary.totalCustomers || 0;
        adminTotalReviews.innerText = summary.totalReviews || 0;
        adminNewMessages.innerText = summary.newMessages || 0;

        renderPreviewList("ordersPreview", adminOrders.slice(0, 4).map(order => `
            <div class="preview-row">
                <span>${escapeHTML(order.orderId)}</span>
                <strong>${escapeHTML(order.status)}</strong>
            </div>
        `), "No orders yet");

        renderPreviewList("inventoryPreview", adminProducts.slice(0, 4).map(product => `
            <div class="preview-row">
                <span>${escapeHTML(product.name)}</span>
                <strong>${formatMoney(product.price)}</strong>
            </div>
        `), "No products yet");

        renderPreviewList("customersPreview", adminCustomers.slice(0, 4).map(customer => `
            <div class="preview-row">
                <span>${escapeHTML(customer.name || customer.email)}</span>
                <strong>${customer.orderCount || 0} orders</strong>
            </div>
        `), "No customers yet");

        renderPreviewList("messagesPreview", adminMessages.slice(0, 4).map(message => `
            <div class="preview-row">
                <span>${escapeHTML(message.name)}</span>
                <strong>${escapeHTML(message.status)}</strong>
            </div>
        `), "No contact messages yet");
    } catch (err) {
        showToast("Unable to load dashboard", "error");
    }
}

async function adminLogin(e) {
    e.preventDefault();
    adminLoginMsg.innerText = "";

    try {
        const res = await fetch("/api/admin/login", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ email: adminEmail.value.trim(), password: adminPassword.value })
        });

        const data = await res.json();
        if (!res.ok) throw new Error(data.error || "Invalid admin login");

        setAdminSession(data.admin);
        showToast("Login successful", "success");
        showDashboard();
    } catch (err) {
        adminLoginMsg.innerText = err.message;
    }
}

document.addEventListener("DOMContentLoaded", () => {
    adminLoginForm.addEventListener("submit", adminLogin);
    if (getAdminSession()) showDashboard();
    else showLogin();
});
