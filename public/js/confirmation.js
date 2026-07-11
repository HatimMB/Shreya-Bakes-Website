




document.addEventListener("DOMContentLoaded", () => {

    const order = JSON.parse(localStorage.getItem("currentOrder"));

    const idText = document.getElementById("orderIdText");
    const details = document.getElementById("orderDetails");

    if (!order) {
        idText.innerText = "No order found";
        details.innerHTML = `
            <p>Please place an order first.</p>
        `;
        return;
    }

    idText.innerHTML = `Order ID: <strong>${order.orderId}</strong>`;

    const trackButton = document.getElementById("trackOrderBtn");
    if (trackButton && order.orderId) {
        trackButton.href = "trackOrder.html?orderId=" + encodeURIComponent(order.orderId);
    }

    details.innerHTML = `
        <p><strong>Name:</strong> ${order.name}</p>
        <p><strong>Total Paid:</strong> AED ${order.total}</p>
        <p><strong>Status:</strong> ${order.status}</p>

        <br>

        <p><strong>Items:</strong></p>

        ${order.items.map(i => `
            <p>${i.name} × ${i.quantity}</p>
        `).join("")}
    `;
});