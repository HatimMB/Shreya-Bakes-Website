let adminOrders = [];
let adminStatuses = ["Order Placed", "Preparing", "Baking", "Out for Delivery", "Delivered"];
let orderFilter = "Active";

function getAdminSession() {
    try {
        return JSON.parse(localStorage.getItem("adminUser"));
    } catch (err) {
        return null;
    }
}

function adminLogout() {
    localStorage.removeItem("adminUser");
    location.href = "admin.html";
}

function escapeHTML(text) {
    return String(text || "")
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&#039;");
}

function getStatus(status) {
    return status === "Placed" ? "Order Placed" : (status || "Order Placed");
}

function formatDate(dateValue) {
    if (!dateValue) return "No date";
    const date = new Date(dateValue);
    return Number.isNaN(date.getTime()) ? dateValue : date.toLocaleString();
}

function orderItems(items) {
    if (!items || items.length === 0) return "<p class='muted'>No items</p>";
    return `<ul class="admin-order-items">${items.map(item => `
        <li>${escapeHTML(item.name)} <span>× ${Number(item.quantity) || 1}</span> <strong>AED ${Number(item.price || 0).toFixed(2)}</strong></li>
    `).join("")}</ul>`;
}

function getFilteredOrders() {
    if (orderFilter === "All") return adminOrders;
    if (orderFilter === "Delivered") return adminOrders.filter(order => getStatus(order.status) === "Delivered");
    return adminOrders.filter(order => getStatus(order.status) !== "Delivered");
}

function setOrderFilter(filter) {
    orderFilter = filter;
    document.querySelectorAll(".admin-filter-bar .category-btn").forEach(btn => {
        btn.classList.toggle("active", btn.dataset.filter === filter);
    });
    renderOrders();
}

function renderOrders() {
    const container = document.getElementById("adminOrdersList");
    const visibleOrders = getFilteredOrders();

    if (visibleOrders.length === 0) {
        container.innerHTML = `
            <div class="empty-wishlist-card">
                <h3>No ${orderFilter.toLowerCase()} orders</h3>
                <p class="muted">Orders will appear here when customers checkout.</p>
            </div>
        `;
        return;
    }

    container.innerHTML = visibleOrders.map(order => `
        <div class="admin-order-card">
            <div class="admin-order-top">
                <div>
                    <h3>${escapeHTML(order.orderId)}</h3>
                    <p>${formatDate(order.serverTime || order.createdAt)}</p>
                </div>
                <select onchange="updateOrderStatus('${escapeHTML(order.orderId)}', this.value)">
                    ${adminStatuses.map(status => `
                        <option value="${status}" ${status === getStatus(order.status) ? "selected" : ""}>${status}</option>
                    `).join("")}
                </select>
            </div>
            <div class="admin-order-details">
                <p><strong>Name:</strong> ${escapeHTML(order.name)}</p>
                <p><strong>Email:</strong> ${escapeHTML(order.email)}</p>
                <p><strong>Phone:</strong> ${escapeHTML(order.phone)}</p>
                <p><strong>Address:</strong> ${escapeHTML(order.address)}</p>
                <p><strong>Payment:</strong> ${escapeHTML(order.payment)}</p>
                <p><strong>Notes:</strong> ${escapeHTML(order.notes || "None")}</p>
            </div>
            <div class="admin-order-money"><strong>Total: AED ${Number(order.total || 0).toFixed(2)}</strong></div>
            <h4>Items</h4>
            ${orderItems(order.items)}
        </div>
    `).join("");
}

async function loadOrders() {
    try {
        const res = await fetch("/api/admin/orders");
        const data = await res.json();
        adminOrders = data.orders || [];
        adminStatuses = data.statuses || adminStatuses;
        renderOrders();
    } catch (err) {
        showToast("Unable to load orders", "error");
    }
}

async function updateOrderStatus(orderId, status) {
    try {
        const res = await fetch(`/api/admin/orders/${encodeURIComponent(orderId)}/status`, {
            method: "PUT",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ status })
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || "Update failed");

        const index = adminOrders.findIndex(order => order.orderId === orderId);
        if (index >= 0) adminOrders[index] = data.order;
        renderOrders();
        showToast(status === "Delivered" ? "Moved to delivered orders" : "Status updated", "success");
    } catch (err) {
        showToast(err.message || "Update failed", "error");
    }
}

document.addEventListener("DOMContentLoaded", () => {
    if (!getAdminSession()) {
        location.href = "admin.html";
        return;
    }
    document.getElementById("adminDashboard").classList.remove("hidden");
    loadOrders();
});
