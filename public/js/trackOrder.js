document.addEventListener("DOMContentLoaded", () => {
    const params = new URLSearchParams(window.location.search);
    let orderId = params.get("orderId") || "";

    if (!orderId) {
        try {
            const currentOrder = JSON.parse(localStorage.getItem("currentOrder"));
            orderId = currentOrder && currentOrder.orderId ? currentOrder.orderId : "";
        } catch (e) {
            orderId = "";
        }
    }

    const orderInput = document.getElementById("orderId");
    if (orderInput && orderId) {
        orderInput.value = orderId;
        trackOrder();
    }
});

function getStatusLabel(status) {
    return status === "Placed" ? "Order Placed" : (status || "Order Placed");
}

function renderStatusSteps(currentStatus) {
    const steps = ["Order Placed", "Preparing", "Baking", "Out for Delivery", "Delivered"];
    const currentIndex = Math.max(0, steps.indexOf(getStatusLabel(currentStatus)));

    return `
        <div class="status-timeline">
            ${steps.map((step, index) => `
                <div class="status-step ${index <= currentIndex ? "active" : ""}">
                    <span>${index + 1}</span>
                    <p>${step}</p>
                </div>
            `).join("")}
        </div>
    `;
}

async function trackOrder() {
    const orderId = document.getElementById("orderId").value.trim();
    const result = document.getElementById("result");

    const statusColors = {
        "Order Placed": "#666",
        "Placed": "#666",
        "Preparing": "#e67e22",
        "Baking": "#b8860b",
        "Out for Delivery": "#3366cc",
        "Delivered": "#2e7d32"
    };

    if (!orderId) {
        result.innerHTML = "Please enter a valid Order ID.";
        return;
    }

    result.innerHTML = "Searching...";

    try {
        const res = await fetch(`/api/order/${encodeURIComponent(orderId)}`);

        if (!res.ok) {
            throw new Error("Order not found");
        }

        const order = await res.json();
        const statusLabel = getStatusLabel(order.status);
        const placedDate = order.serverTime || order.createdAt;

        result.innerHTML = `
            <div class="contact-card track-card">
                <h3>Order Found</h3>
                <p><strong>Order ID:</strong> ${order.orderId}</p>
                <p style="color:${statusColors[statusLabel] || "#333"}"><strong>Status:</strong> ${statusLabel}</p>
                ${renderStatusSteps(statusLabel)}
                <p><strong>Name:</strong> ${order.name || "-"}</p>
                <p><strong>Total:</strong> AED ${order.total || "0.00"}</p>
                <p><strong>Placed:</strong> ${placedDate ? new Date(placedDate).toLocaleString() : "-"}</p>
            </div>
        `;

    } catch (err) {
        result.innerHTML = `
            <div class="contact-card" style="background-color: #f8d7da; color: #721c24;">
                <h3>Order Not Found</h3>
                <p>Please check your Order ID and try again.</p>
            </div>
        `;
    }
}
