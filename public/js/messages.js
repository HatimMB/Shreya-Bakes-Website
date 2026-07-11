let messages = [];
let messageFilter = "All";

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

function formatDate(value) {
    if (!value) return "No date";
    const date = new Date(value);
    return Number.isNaN(date.getTime()) ? value : date.toLocaleString();
}

function setMessageFilter(filter) {
    messageFilter = filter;
    document.querySelectorAll(".admin-filter-bar .category-btn").forEach(btn => {
        btn.classList.toggle("active", btn.dataset.filter === filter);
    });
    renderMessages();
}

function getVisibleMessages() {
    if (messageFilter === "All") return messages;
    return messages.filter(message => message.status === messageFilter);
}

function renderMessages() {
    const list = document.getElementById("messagesList");
    const visible = getVisibleMessages();

    if (visible.length === 0) {
        list.innerHTML = `
            <div class="empty-wishlist-card">
                <h3>No ${messageFilter.toLowerCase()} messages</h3>
                <p class="muted">Contact form messages will appear here.</p>
            </div>
        `;
        return;
    }

    list.innerHTML = visible.map(message => `
        <div class="message-card">
            <div class="admin-card-top">
                <div>
                    <h3>${escapeHTML(message.name)}</h3>
                    <p>${escapeHTML(message.email)}</p>
                </div>
                <span class="status-pill ${message.status.toLowerCase()}">${escapeHTML(message.status)}</span>
            </div>
            <p>${escapeHTML(message.message)}</p>
            <p class="muted">Submitted: ${formatDate(message.timestamp)}</p>
            <div class="inline-actions">
                <select onchange="updateMessageStatus('${escapeHTML(message.id)}', this.value)">
                    ${["New", "Read", "Resolved"].map(status => `
                        <option value="${status}" ${status === message.status ? "selected" : ""}>${status}</option>
                    `).join("")}
                </select>
                <a class="btn-secondary" href="mailto:${escapeHTML(message.email)}">Email</a>
                <button type="button" class="danger-btn" onclick="deleteMessage('${escapeHTML(message.id)}')">Delete</button>
            </div>
        </div>
    `).join("");
}

async function loadMessages() {
    try {
        const res = await fetch("/api/admin/contacts");
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || "Unable to load messages");
        messages = data.messages || [];
        renderMessages();
    } catch (err) {
        showToast(err.message || "Unable to load messages", "error");
    }
}

async function updateMessageStatus(id, status) {
    try {
        const res = await fetch("/api/admin/contacts/" + encodeURIComponent(id), {
            method: "PUT",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ status })
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || "Unable to update message");

        const index = messages.findIndex(message => String(message.id) === String(id));
        if (index >= 0) messages[index] = data.message;
        renderMessages();
        showToast("Message status updated", "success");
    } catch (err) {
        showToast(err.message || "Unable to update message", "error");
    }
}

async function deleteMessage(id) {
    try {
        const res = await fetch("/api/admin/contacts/" + encodeURIComponent(id), { method: "DELETE" });
        const data = await res.json().catch(() => ({}));
        if (!res.ok) throw new Error(data.error || "Unable to delete message");
        showToast("Message deleted", "success");
        loadMessages();
    } catch (err) {
        showToast(err.message || "Unable to delete message", "error");
    }
}

document.addEventListener("DOMContentLoaded", () => {
    if (!getAdminSession()) {
        location.href = "admin.html";
        return;
    }
    document.getElementById("adminDashboard").classList.remove("hidden");
    loadMessages();
});
