let customers = [];

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

function formatMoney(value) {
    return "AED " + Number(value || 0).toFixed(2);
}

function formatDate(value) {
    if (!value) return "No orders yet";
    const date = new Date(value);
    return Number.isNaN(date.getTime()) ? value : date.toLocaleDateString();
}

function valueOrEmpty(value, fallback = "Not added") {
    return value ? escapeHTML(value) : fallback;
}

function renderCustomers() {
    const list = document.getElementById("customersList");
    const search = String(document.getElementById("customerSearch").value || "").toLowerCase();
    const filtered = customers.filter(customer => {
        const haystack = `${customer.name || ""} ${customer.email || ""} ${customer.phone || ""} ${customer.city || ""}`.toLowerCase();
        return haystack.includes(search);
    });

    if (filtered.length === 0) {
        list.innerHTML = `
            <div class="empty-wishlist-card">
                <h3>No customers found</h3>
                <p class="muted">Try searching with another name, email, phone number, or city.</p>
            </div>
        `;
        return;
    }

    list.innerHTML = filtered.map(customer => {
        const name = customer.name || "Customer";
        const initials = (name || customer.email || "C").charAt(0).toUpperCase();
        return `
            <div class="customer-card">
                <div class="customer-card-header">
                    <div class="customer-avatar">${escapeHTML(initials)}</div>
                    <div>
                        <h3>${escapeHTML(name)}</h3>
                        <p>${valueOrEmpty(customer.email, "No email")}</p>
                    </div>
                </div>

                <div class="customer-detail-grid">
                    <div>
                        <span>Phone</span>
                        <strong>${valueOrEmpty(customer.phone)}</strong>
                    </div>
                    <div>
                        <span>City</span>
                        <strong>${valueOrEmpty(customer.city)}</strong>
                    </div>
                    <div>
                        <span>Orders</span>
                        <strong>${Number(customer.orderCount || 0)}</strong>
                    </div>
                    <div>
                        <span>Total Spend</span>
                        <strong>${formatMoney(customer.totalSpent)}</strong>
                    </div>
                    <div>
                        <span>Loyalty Points</span>
                        <strong>${Number(customer.loyaltyPoints || 0)}</strong>
                    </div>
                </div>

            </div>
        `;
    }).join("");
}

async function loadCustomers() {
    try {
        const res = await fetch("/api/admin/users");
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || "Unable to load customers");
        customers = data.customers || [];
        renderCustomers();
    } catch (err) {
        showToast(err.message || "Unable to load customers", "error");
    }
}

document.addEventListener("DOMContentLoaded", () => {
    if (!getAdminSession()) {
        location.href = "admin.html";
        return;
    }
    document.getElementById("adminDashboard").classList.remove("hidden");
    loadCustomers();
});
