function isValidEmail(email) {
    return /^[^\s@]+@[^\s@]+\.com$/i.test(String(email || "").trim());
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

function showFieldError(id, message) {
    const error = document.getElementById(id);
    if (!error) return;
    error.innerText = message;
}

function clearEditErrors() {
    showFieldError("editEmailError", "");
    showFieldError("editPhoneError", "");
}

function setSelectValueCaseInsensitive(selectId, value) {
    const select = document.getElementById(selectId);
    if (!select) return;

    const match = Array.from(select.options).find(option => option.value.toLowerCase() === String(value || "").toLowerCase());
    select.value = match ? match.value : "";
}

let user = null;

try {
    user = JSON.parse(localStorage.getItem("loggedInUser"));
} catch (e) {
    user = null;
}

if (!user || !user.email) {
    window.location.href = "login.html";
}

function setText(id, value) {
    const el = document.getElementById(id);
    if (el) el.innerText = value || "-";
}

function formatPoints(points) {
    return Math.max(0, Math.floor(Number(points) || 0));
}

function getStatusLabel(status) {
    return status === "Placed" ? "Order Placed" : (status || "Order Placed");
}

function formatOrderDate(order) {
    const dateValue = order.serverTime || order.createdAt || order.date;
    if (!dateValue) return "-";

    const date = new Date(dateValue);
    if (Number.isNaN(date.getTime())) return dateValue;

    return date.toLocaleDateString();
}

async function fetchUserOrders(email) {
    try {
        const res = await fetch(`/api/orders/user/${encodeURIComponent(email)}`);
        if (!res.ok) throw new Error("Could not load server orders");
        return await res.json();
    } catch (err) {
        console.log("Could not refresh orders from server", err);
        return JSON.parse(localStorage.getItem("orders_" + email)) || [];
    }
}

async function renderAccount(currentUser) {
    if (!currentUser) return;

    setText("name", currentUser.name);
    setText("email", currentUser.email);
    setText("phone", currentUser.phone);
    setText("address", currentUser.address);
    setText("city", currentUser.city);
    setText("points", formatPoints(currentUser.loyaltyPoints) + " Points");

    const orders = await fetchUserOrders(currentUser.email);
    const ordersList = document.getElementById("orders");

    if (ordersList) {
        ordersList.innerHTML = "";

        if (!orders.length) {
            ordersList.innerHTML = "<li>No orders yet</li>";
        } else {
            orders.slice().reverse().forEach(order => {
                ordersList.innerHTML += `
                    <li>
                        <strong>${order.orderId}</strong><br>
                        AED ${order.total || "0.00"} - ${formatOrderDate(order)} - <strong>${getStatusLabel(order.status)}</strong><br>
                        <a href="trackOrder.html?orderId=${encodeURIComponent(order.orderId)}">Track this order</a>
                    </li>
                `;
            });
        }
    }
}

async function syncLoggedInUser() {
    if (!user || !user.id) return user;

    try {
        const res = await fetch("/api/users");
        const users = await res.json();
        const latestUser = users.find(u => Number(u.id) === Number(user.id));

        if (latestUser) {
            user = latestUser;
            localStorage.setItem("loggedInUser", JSON.stringify(latestUser));
        }
    } catch (err) {
        console.log("Could not refresh account details", err);
    }

    return user;
}

function migrateLocalStorageEmailKeys(oldEmail, newEmail) {
    if (!oldEmail || !newEmail || oldEmail.toLowerCase() === newEmail.toLowerCase()) return;

    ["orders_", "wishlist_"].forEach(prefix => {
        const oldKey = prefix + oldEmail;
        const newKey = prefix + newEmail;
        const oldValue = localStorage.getItem(oldKey);
        if (!oldValue) return;

        if (!localStorage.getItem(newKey)) {
            localStorage.setItem(newKey, oldValue);
        }
        localStorage.removeItem(oldKey);
    });

    try {
        const currentOrder = JSON.parse(localStorage.getItem("currentOrder"));
        if (currentOrder && String(currentOrder.email || "").toLowerCase() === oldEmail.toLowerCase()) {
            currentOrder.email = newEmail;
            localStorage.setItem("currentOrder", JSON.stringify(currentOrder));
        }
    } catch (e) {}
}

renderAccount(user);
syncLoggedInUser().then(renderAccount);

window.logout = function () {
    localStorage.removeItem("loggedInUser");
    localStorage.removeItem("user");
    window.location.href = "login.html";
};

window.editProfile = function () {
    const currentUser = JSON.parse(localStorage.getItem("loggedInUser"));
    clearEditErrors();

    document.getElementById("editName").value = currentUser.name || "";
    document.getElementById("editEmail").value = currentUser.email || "";
    document.getElementById("editPhone").value = cleanPhoneNumber(currentUser.phone || "05");
    document.getElementById("editAddress").value = currentUser.address || "";
    setSelectValueCaseInsensitive("editCity", currentUser.city || "");

    const modal = document.getElementById("editModal");
    modal.classList.remove("hidden");
    modal.classList.add("show");
};

window.closeModal = function () {
    const modal = document.getElementById("editModal");
    modal.classList.add("hidden");
    modal.classList.remove("show");
};

window.saveProfile = async function () {
    const currentUser = JSON.parse(localStorage.getItem("loggedInUser"));
    clearEditErrors();

    const emailValue = document.getElementById("editEmail").value.trim();
    const phoneValue = cleanPhoneNumber(document.getElementById("editPhone").value.trim());
    document.getElementById("editPhone").value = phoneValue;

    if (!isValidEmail(emailValue)) {
        showFieldError("editEmailError", "Email is invalid");
        return;
    }

    if (!isValidPhone(phoneValue)) {
        showFieldError("editPhoneError", "Phone number must start with 05 and have 10 digits");
        return;
    }

    const updatedUser = {
        name: document.getElementById("editName").value.trim(),
        email: emailValue,
        phone: phoneValue,
        address: document.getElementById("editAddress").value.trim(),
        city: document.getElementById("editCity").value.trim(),
        loyaltyPoints: formatPoints(currentUser.loyaltyPoints)
    };

    const res = await fetch(`/api/users/${currentUser.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(updatedUser)
    });

    const data = await res.json();

    if (!res.ok) {
        showToast(data.error || "Update failed", "error");
        return;
    }

    migrateLocalStorageEmailKeys(currentUser.email, data.user.email);
    localStorage.setItem("loggedInUser", JSON.stringify(data.user));
    user = data.user;
    closeModal();
    showToast("Profile updated", "success");
    renderAccount(data.user);
};


document.addEventListener("DOMContentLoaded", () => {
    const editPhone = document.getElementById("editPhone");
    const editEmail = document.getElementById("editEmail");

    if (editPhone) {
        editPhone.addEventListener("focus", () => {
            if (!editPhone.value) editPhone.value = "05";
        });

        editPhone.addEventListener("input", () => {
            editPhone.value = cleanPhoneNumber(editPhone.value);
            showFieldError("editPhoneError", "");
        });
    }

    if (editEmail) {
        editEmail.addEventListener("input", () => showFieldError("editEmailError", ""));
    }
});
