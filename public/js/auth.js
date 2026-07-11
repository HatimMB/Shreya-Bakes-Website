function getLoggedInUser() {
    try {
        return JSON.parse(localStorage.getItem("loggedInUser"));
    } catch (e) {
        return null;
    }
}

function setLoggedInUser(user) {
    localStorage.setItem("loggedInUser", JSON.stringify(user));
}

function showToast(message, type = "info") {
    let toast = document.getElementById("toast");

    if (!toast) {
        toast = document.createElement("div");
        toast.id = "toast";
        toast.className = "toast";
        document.body.appendChild(toast);
    }

    toast.innerText = message;
    toast.classList.remove("success", "error", "info");
    toast.classList.add(type, "show");

    clearTimeout(window.toastTimer);
    window.toastTimer = setTimeout(() => {
        toast.classList.remove("show");
    }, 2500);
}

function goToAccount() {
    const user = getLoggedInUser();

    if (user && user.id) {
        window.location.href = "account.html";
    } else {
        window.location.href = "login.html";
    }
}

function goToLogin() {
    window.location.href = "login.html";
}

function goToSignup() {
    window.location.href = "login.html?tab=signup";
}

function closeLoginRequiredModal() {
    const modal = document.getElementById("loginRequiredModal");
    if (modal) modal.classList.add("hidden");
}

function showLoginRequiredModal(reason = "wishlist") {
    let modal = document.getElementById("loginRequiredModal");

    if (!modal) {
        modal = document.createElement("div");
        modal.id = "loginRequiredModal";
        modal.className = "login-required-modal hidden";
        modal.innerHTML = `
            <div class="login-required-box">
                <button type="button" class="modal-close" onclick="closeLoginRequiredModal()">×</button>
                <h2 id="loginRequiredTitle">Login Required</h2>
                <p id="loginRequiredMessage"></p>
                <button type="button" class="btn-primary" onclick="goToLogin()">Login</button>
                <p class="signup-line" onclick="goToSignup()">New to Shreya Bakes? Create an account</p>
            </div>
        `;
        document.body.appendChild(modal);
    }

    const title = document.getElementById("loginRequiredTitle");
    const message = document.getElementById("loginRequiredMessage");

    if (reason === "checkout") {
        title.innerText = "Login to checkout";
        message.innerText = "Please login or create an account before placing your order.";
    } else {
        title.innerText = "Login to use wishlist";
        message.innerText = "Please login or create an account before saving items to your wishlist.";
    }

    modal.classList.remove("hidden");
}

function requireLoginForCheckout(event) {
    const user = getLoggedInUser();

    if (user && user.id) {
        return true;
    }

    if (event) event.preventDefault();
    showLoginRequiredModal("checkout");
    return false;
}

function getWishlistKey() {
    const user = getLoggedInUser();
    return user && user.email ? "wishlist_" + user.email : null;
}

function getUserWishlist() {
    const key = getWishlistKey();
    if (!key) return [];

    try {
        return JSON.parse(localStorage.getItem(key)) || [];
    } catch (e) {
        return [];
    }
}

function saveUserWishlist(items) {
    const key = getWishlistKey();
    if (!key) return;

    localStorage.setItem(key, JSON.stringify(items));
}

function isItemInWishlist(productId) {
    const wishlist = getUserWishlist();
    return wishlist.some(item => Number(item.id) === Number(productId));
}

function toggleWishlistItem(product, button) {
    const user = getLoggedInUser();

    if (!user || !user.id) {
        showLoginRequiredModal("wishlist");
        return;
    }

    const wishlist = getUserWishlist();
    const index = wishlist.findIndex(item => Number(item.id) === Number(product.id));

    if (index >= 0) {
        wishlist.splice(index, 1);
        if (button) {
            button.classList.remove("active");
            button.innerText = "♡";
        }
        saveUserWishlist(wishlist);
        showToast("Removed from wishlist");
        return;
    }

    wishlist.push({
        id: product.id,
        name: product.name,
        price: product.price,
        image: product.image || "",
        description: product.description || ""
    });

    if (button) {
        button.classList.add("active");
        button.innerText = "♥";
    }

    saveUserWishlist(wishlist);
    showToast("Added to wishlist");
}

function refreshWishlistButtons() {
    document.querySelectorAll(".wishlist-heart").forEach(button => {
        const id = button.dataset.productId;
        const liked = isItemInWishlist(id);
        button.classList.toggle("active", liked);
        button.innerText = liked ? "♥" : "♡";
    });
}

document.addEventListener("DOMContentLoaded", refreshWishlistButtons);
