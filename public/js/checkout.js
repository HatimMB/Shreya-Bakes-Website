
function isValidEmail(email) {
    return /^[^\s@]+@[^\s@]+\.com$/i.test(email);
}

function cleanPhoneNumber(input) {
    let digits = String(input || "").replace(/\D/g, "");

    if (!digits || digits === "0" || digits === "05") {
        return "05";
    }

    if (digits.startsWith("05")) {
        return digits.slice(0, 10);
    }

    digits = digits.replace(/^0+/, "");
    if (digits.startsWith("5")) {
        digits = digits.slice(1);
    }

    return ("05" + digits).slice(0, 10);
}

function isValidPhone(phone) {
    return /^05\d{8}$/.test(phone);
}

function bindBasicFieldConstraints() {
    const phoneInput = document.getElementById("phone");

    if (phoneInput) {
        if (!phoneInput.value) phoneInput.value = "05";

        phoneInput.addEventListener("focus", () => {
            if (!phoneInput.value) phoneInput.value = "05";
        });

        phoneInput.addEventListener("input", () => {
            phoneInput.value = cleanPhoneNumber(phoneInput.value);
        });
    }
}

let cart = [];

const AED_PER_POINT_EARNED = 5;      
const POINTS_PER_AED_DISCOUNT = 5;   

function formatPoints(points) {
    return String(Math.max(0, Math.floor(Number(points) || 0)));
}

function calculateEarnedPoints(subtotal) {
    return Math.floor((Number(subtotal) || 0) / AED_PER_POINT_EARNED);
}

function calculateDiscountFromPoints(points) {
    return Math.floor(Number(points) || 0) / POINTS_PER_AED_DISCOUNT;
}

document.addEventListener("DOMContentLoaded", async () => {
    let user = getLoggedInUser();

    if (user && user.id) {
        user = await syncLoggedInUser();
    }

    await loadCart();
    renderCheckoutSummary();
    bindRedeemPoints();
    bindBasicFieldConstraints();
    bindForm();

    if (!user || !user.id) {
        showLoginRequiredModal("checkout");
        const form = document.getElementById("checkoutForm");
        if (form) form.classList.add("checkout-locked");
        return;
    }

    prefillUserDetails();
});

function getLoggedInUser() {
    try {
        return JSON.parse(localStorage.getItem("loggedInUser"));
    } catch (e) {
        return null;
    }
}


async function syncLoggedInUser() {
    const currentUser = getLoggedInUser();
    if (!currentUser || !currentUser.id) return currentUser;

    try {
        const res = await fetch("/api/users");
        const users = await res.json();
        const latestUser = users.find(u => Number(u.id) === Number(currentUser.id));

        if (latestUser) {
            localStorage.setItem("loggedInUser", JSON.stringify(latestUser));
            return latestUser;
        }
    } catch (err) {
        console.log("Could not refresh loyalty points", err);
    }

    return currentUser;
}

function prefillUserDetails() {
    const user = getLoggedInUser();

    if (!user) return;

    const name = document.getElementById("name");
    const email = document.getElementById("email");
    const phone = document.getElementById("phone");
    const address = document.getElementById("address");
    const city = document.getElementById("city");

    if (name) name.value = user.name || "";
    if (email) email.value = user.email || "";
    if (phone) phone.value = cleanPhoneNumber(user.phone || "05");
    if (address) address.value = user.address || "";
    if (city) city.value = user.city || "";
}

async function loadCart() {
    try {
        const res = await fetch("/api/cart");
        cart = await res.json();

        if (!Array.isArray(cart)) cart = [];
    } catch (err) {
        console.error("Failed to load cart", err);
        cart = [];
    }
}

function getAvailablePoints() {
    const user = getLoggedInUser();
    return user ? Math.max(0, Math.floor(Number(user.loyaltyPoints) || 0)) : 0;
}

function calculateItemSubtotal(items) {
    return items.reduce((sum, item) => {
        const price = Number(item.price) || 0;
        const qty = Number(item.quantity) || 1;

        return sum + (price * qty);
    }, 0);
}

function getRedeemDetails(subtotal) {
    const pointsInput = document.getElementById("pointsToUse");
    const availablePoints = getAvailablePoints();
    const requestedPoints = pointsInput ? Math.floor(Number(pointsInput.value) || 0) : 0;

    
    const maxPointsByOrder = Math.floor(subtotal * POINTS_PER_AED_DISCOUNT);
    const redeemPoints = Math.max(0, Math.min(requestedPoints, availablePoints, maxPointsByOrder));
    const pointsDiscount = calculateDiscountFromPoints(redeemPoints);
    const earnedPoints = calculateEarnedPoints(subtotal); 

    return {
        availablePoints,
        redeemPoints,
        pointsDiscount,
        earnedPoints
    };
}

function calculateTotals(items) {
    const subtotal = calculateItemSubtotal(items);
    const points = getRedeemDetails(subtotal);
    const discountedSubtotal = Math.max(0, subtotal - points.pointsDiscount);
    const vat = discountedSubtotal * 0.05;
    const delivery = items.length ? 15 : 0;
    const grandTotalBeforePoints = subtotal + (subtotal * 0.05) + delivery;
    const grandTotal = discountedSubtotal + vat + delivery;

    return {
        subtotal,
        discountedSubtotal,
        vat,
        delivery,
        grandTotalBeforePoints,
        grandTotal,
        ...points
    };
}

function validateRedeemPoints(showMessage = false) {
    const pointsInput = document.getElementById("pointsToUse");
    if (!pointsInput) return { valid: true, value: 0 };

    const subtotal = calculateItemSubtotal(cart);
    const availablePoints = getAvailablePoints();
    const maxPointsByOrder = Math.floor(subtotal * POINTS_PER_AED_DISCOUNT);

    let requestedPoints = Math.floor(Number(pointsInput.value) || 0);
    let valid = true;

    if (requestedPoints < 0) {
        requestedPoints = 0;
        valid = false;
        if (showMessage) showToast("Points cannot be less than 0.", "error");
    }

    if (requestedPoints > availablePoints) {
        valid = false;
        if (showMessage) {
            showToast(`You only have ${formatPoints(availablePoints)} loyalty points.`, "error");
        }
        requestedPoints = availablePoints;
    }

    if (requestedPoints > maxPointsByOrder) {
        valid = false;
        if (showMessage) {
            showToast(`You can use up to ${formatPoints(maxPointsByOrder)} points on this order.`, "error");
        }
        requestedPoints = maxPointsByOrder;
    }

    requestedPoints = Math.max(0, requestedPoints);
    pointsInput.value = requestedPoints ? requestedPoints : "";

    return {
        valid,
        value: requestedPoints
    };
}

function bindRedeemPoints() {
    const pointsInput = document.getElementById("pointsToUse");
    const applyPointsBtn = document.getElementById("applyPointsBtn");

    if (pointsInput) {
        pointsInput.addEventListener("input", () => {
            validateRedeemPoints(true);
            renderCheckoutSummary();
        });
    }

    if (applyPointsBtn) {
        applyPointsBtn.addEventListener("click", () => {
            validateRedeemPoints(true);
            renderCheckoutSummary();
        });
    }
}

function renderCheckoutSummary() {
    const container = document.getElementById("checkoutItems");
    if (!container) return;

    if (!cart.length) {
        container.innerHTML = "<p>Your cart is empty</p>";

        document.getElementById("vatTotal").innerText = "AED 0.00";
        document.getElementById("orderTotal").innerText = "AED 0.00";
        document.getElementById("pointsDiscount").innerText = "AED 0.00";
        document.getElementById("grandTotal").innerText = "AED 0.00";

        const deliveryTotal = document.getElementById("deliveryTotal");
        if (deliveryTotal) deliveryTotal.innerText = "AED 0.00";

        return;
    }

    const totals = calculateTotals(cart);

    container.innerHTML = cart.map(item => {
        const price = Number(item.price) || 0;
        const qty = Number(item.quantity) || 1;

        return `
            <div style="display:flex;justify-content:space-between;margin-bottom:6px;gap:20px;">
                <span>${item.name} × ${qty}</span>
                <span>AED ${(price * qty).toFixed(2)}</span>
            </div>
        `;
    }).join("");

    const pointsBox = document.getElementById("loyaltyRedeemBox");
    const availablePoints = document.getElementById("availablePoints");
    const pointsInput = document.getElementById("pointsToUse");
    const pointsHelper = document.getElementById("pointsHelper");

    const possibleRedeemPoints = Math.min(totals.availablePoints, Math.floor(totals.subtotal * POINTS_PER_AED_DISCOUNT));

    if (pointsBox) pointsBox.style.display = possibleRedeemPoints > 0 ? "block" : "none";
    if (availablePoints) availablePoints.innerText = formatPoints(totals.availablePoints);
    if (pointsInput) pointsInput.max = possibleRedeemPoints;
    if (pointsHelper) pointsHelper.innerText = possibleRedeemPoints > 0
        ? "Enter how many points you want to use for this order."
        : "You do not have points available to use yet.";

    const deliveryTotal = document.getElementById("deliveryTotal");
    if (deliveryTotal) deliveryTotal.innerText = "AED " + totals.delivery.toFixed(2);

    document.getElementById("vatTotal").innerText = "AED " + totals.vat.toFixed(2);
    document.getElementById("orderTotal").innerText = "AED " + totals.subtotal.toFixed(2);
    document.getElementById("pointsDiscount").innerText = "- AED " + totals.pointsDiscount.toFixed(2);
    document.getElementById("grandTotal").innerText = "AED " + totals.grandTotal.toFixed(2);
}

function bindForm() {
    const form = document.getElementById("checkoutForm");
    if (form) form.addEventListener("submit", placeOrder);
}

async function updateLoggedInUserFromCheckout(order, newPointsTotal) {
    const loggedInUser = getLoggedInUser();
    if (!loggedInUser || !loggedInUser.id) return loggedInUser;

    const updatedUser = {
        ...loggedInUser,
        name: order.name,
        phone: order.phone,
        address: order.address,
        city: order.city,
        loyaltyPoints: newPointsTotal
    };

    localStorage.setItem("loggedInUser", JSON.stringify(updatedUser));

    try {
        const res = await fetch(`/api/users/${loggedInUser.id}`, {
            method: "PUT",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
                name: order.name,
                phone: order.phone,
                address: order.address,
                city: order.city,
                loyaltyPoints: newPointsTotal
            })
        });

        if (res.ok) {
            const data = await res.json();
            if (data.user) {
                localStorage.setItem("loggedInUser", JSON.stringify(data.user));
                return data.user;
            }
        }
    } catch (err) {
        console.log("Could not update saved checkout details", err);
    }

    return updatedUser;
}

async function placeOrder(e) {
    e.preventDefault();

    const loggedInUser = getLoggedInUser();

    if (!loggedInUser || !loggedInUser.id) {
        showLoginRequiredModal("checkout");
        return;
    }

    if (!cart.length) {
        showToast("Your cart is empty");
        return;
    }

    const emailInput = document.getElementById("email");
    const phoneInput = document.getElementById("phone");
    const emailValue = emailInput ? emailInput.value.trim() : "";
    const phoneValue = phoneInput ? cleanPhoneNumber(phoneInput.value) : "";

    if (phoneInput) phoneInput.value = phoneValue;

    if (!isValidEmail(emailValue)) {
        showToast("Please enter a valid email ending with .com", "error");
        return;
    }

    if (!isValidPhone(phoneValue)) {
        showToast("Phone number must start with 05 and have 10 digits", "error");
        return;
    }

    const btn = e.target.querySelector("button");
    btn.disabled = true;
    btn.innerText = "Processing...";

    const redeemValidation = validateRedeemPoints(true);

    if (!redeemValidation.valid) {
        btn.disabled = false;
        btn.innerText = "Place Order";
        renderCheckoutSummary();
        return;
    }

    const totals = calculateTotals(cart);
    const currentPoints = getAvailablePoints();
    const newPointsTotal = Math.max(0, currentPoints - totals.redeemPoints + totals.earnedPoints);

    const order = {
        orderId: "SB" + Date.now(),

        name: document.getElementById("name").value.trim(),
        email: document.getElementById("email").value.trim(),
        phone: document.getElementById("phone").value.trim(),
        address: document.getElementById("address").value.trim(),
        city: document.getElementById("city").value.trim(),

        payment: document.getElementById("payment").value,
        notes: document.getElementById("notes").value.trim(),

        items: cart,

        subtotal: totals.subtotal.toFixed(2),
        discountedSubtotal: totals.discountedSubtotal.toFixed(2),
        vat: totals.vat.toFixed(2),
        delivery: totals.delivery.toFixed(2),
        pointsUsed: totals.redeemPoints,
        pointsDiscount: totals.pointsDiscount.toFixed(2),
        pointsEarned: totals.earnedPoints,
        totalBeforePoints: totals.grandTotalBeforePoints.toFixed(2),
        total: totals.grandTotal.toFixed(2),

        status: "Order Placed",
        createdAt: new Date().toISOString()
    };

    try {
        const res = await fetch("/api/order", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(order)
        });

        if (!res.ok) throw new Error("Order failed");

        const data = await res.json();

        await updateLoggedInUserFromCheckout(order, newPointsTotal);
        await fetch("/api/cart", { method: "DELETE" });
        localStorage.removeItem("cart");

        localStorage.setItem("currentOrder", JSON.stringify({
            ...order,
            serverOrderId: data.orderId
        }));

        const key = "orders_" + loggedInUser.email;
        const previousOrders = JSON.parse(localStorage.getItem(key)) || [];

        previousOrders.push({
            orderId: order.orderId,
            date: new Date().toLocaleDateString(),
            total: order.total,
            status: "Order Placed",
            pointsEarned: order.pointsEarned,
            pointsUsed: order.pointsUsed
        });

        localStorage.setItem(key, JSON.stringify(previousOrders));

        window.location = "confirmation.html";
    } catch (err) {
        console.error(err);
        showToast("Order failed. Try again.");
    } finally {
        btn.disabled = false;
        btn.innerText = "Place Order";
    }
}
