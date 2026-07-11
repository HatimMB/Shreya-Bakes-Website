document.addEventListener("DOMContentLoaded", () => {
    const user = getLoggedInUser();

    if (!user || !user.id) {
        showLoginRequiredModal("wishlist");
        renderEmptyWishlist("Please login or create an account to view your wishlist.");
        return;
    }

    renderWishlist();
});

function renderEmptyWishlist(message) {
    const container = document.getElementById("wishlistContainer");
    if (!container) return;

    container.innerHTML = `
        <div class="empty-wishlist-card">
            <h3>${message}</h3>
            <p>Save items from the menu by clicking the heart button.</p>
            <a href="menu.html" class="btn-primary">Browse Menu</a>
        </div>
    `;
}

function renderWishlist() {
    const container = document.getElementById("wishlistContainer");
    const wishlist = getUserWishlist();

    if (!container) return;

    if (!wishlist.length) {
        renderEmptyWishlist("Your wishlist is empty.");
        return;
    }

    container.innerHTML = wishlist.map(item => `
        <div class="product-card">
            <button
                type="button"
                class="wishlist-heart active"
                data-product-id="${item.id}"
                onclick="removeFromWishlist(${item.id})"
                aria-label="Remove ${item.name} from wishlist">
                ♥
            </button>

            <img src="${item.image}" alt="${item.name}">

            <div class="product-content">
                <h3>${item.name}</h3>
                <p class="product-description">${item.description || "Freshly baked with premium ingredients."}</p>
                <div class="price">AED ${item.price}</div>

                <button class="btn-primary" onclick="addWishlistItemToCart(${item.id})">
                    Add to Cart
                </button>
            </div>
        </div>
    `).join("");
}

function removeFromWishlist(productId) {
    const wishlist = getUserWishlist().filter(item => Number(item.id) !== Number(productId));
    saveUserWishlist(wishlist);
    showToast("Removed from wishlist");
    renderWishlist();
}

async function addWishlistItemToCart(productId) {
    const item = getUserWishlist().find(product => Number(product.id) === Number(productId));

    if (!item) {
        showToast("Item not found");
        return;
    }

    try {
        const res = await fetch("/api/cart", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
                productId: item.id,
                name: item.name,
                price: item.price,
                quantity: 1
            })
        });

        const data = await res.json();

        if (data.success) {
            showToast("Added to cart");
        } else {
            showToast("Failed to add item");
        }
    } catch (err) {
        console.error(err);
        showToast("Server error");
    }
}
