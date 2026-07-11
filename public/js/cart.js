let cart = [];

document.addEventListener("DOMContentLoaded", loadCart);

async function loadCart() {
    try {
        const res = await fetch("/api/cart");
        cart = await res.json();

        renderCart();
    } catch (err) {
        console.error("Cart load failed", err);
    }
}

function renderCart() {

    const tbody = document.getElementById("cartItems");
    const emptyUI = document.getElementById("emptyCartUI");

    if (!tbody) return;

    let output = "";
    let subtotal = 0;

    if (!Array.isArray(cart) || cart.length === 0) {

        tbody.innerHTML = `
            <tr>
                <td colspan="5" class="empty-cart">
                    Your cart is empty
                </td>
            </tr>
        `;

        updateTotals(0, 0, 0);

        if (emptyUI) emptyUI.style.display = "block";

        return;
    }

    if (emptyUI) emptyUI.style.display = "none";

    cart.forEach(item => {

        const price = Number(item.price) || 0;
        const qty = Number(item.quantity) || 1;

        const total = price * qty;
        subtotal += total;

        output += `
        <tr>
            <td>${item.name}</td>

            <td>AED ${price.toFixed(2)}</td>

            <td>
                <button onclick="changeQty(${item.productId}, -1)">-</button>
                ${qty}
                <button onclick="changeQty(${item.productId}, 1)">+</button>
            </td>

            <td>AED ${total.toFixed(2)}</td>

            <td>
                <button class="remove-btn" onclick="removeItem(${item.productId})">
                    Remove
                </button>
            </td>
        </tr>
        `;
    });

    tbody.innerHTML = output;

    const vat = subtotal * 0.05;
    const delivery = cart.length ? 15 : 0;
    const grandTotal = subtotal + vat + delivery;

    updateTotals(subtotal, vat, grandTotal);
}

function updateTotals(subtotal, vat, grandTotal) {

    document.getElementById("subtotal").innerText =
        "AED " + subtotal.toFixed(2);

    document.getElementById("vat").innerText =
        "AED " + vat.toFixed(2);

    document.getElementById("grandTotal").innerText =
        "AED " + grandTotal.toFixed(2);
}

async function changeQty(productId, change) {

    try {
        await fetch("/api/cart", {
            method: "PUT",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
                productId,
                quantityChange: change
            })
        });

        loadCart();
    } catch (err) {
        console.error(err);
    }
}

async function removeItem(productId) {

    try {
        await fetch(`/api/cart/${productId}`, {
            method: "DELETE"
        });

        loadCart();
    } catch (err) {
        console.error(err);
    }
}