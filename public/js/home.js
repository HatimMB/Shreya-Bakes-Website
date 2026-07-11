updateCartCount();

let featuredProducts = [];

document.addEventListener("DOMContentLoaded", () => {
    function animateCounter(id, target, decimals = 0) {
        const el = document.getElementById(id);
        if (!el) return;

        target = Number(target) || 0;
        el.innerText = decimals ? target.toFixed(decimals) : Math.floor(target);
    }

    fetch("/api/home")
        .then(res => res.json())
        .then(data => {
            const stats = data.stats || {
                orders: 0,
                cakes: 0,
                rating: 0
            };

            animateCounter("ordersCount", stats.orders);
            animateCounter("cakesCount", stats.cakes);
            animateCounter("ratingCount", stats.rating, 1);

            const container = document.getElementById("featuredProducts");

            if (!container) return;

            featuredProducts = Array.isArray(data.featured) ? data.featured : [];

            container.innerHTML = featuredProducts.map(p => {
                const liked = window.isItemInWishlist ? isItemInWishlist(p.id) : false;

                return `
                    <div class="product-card">
                        <button
                            type="button"
                            class="wishlist-heart ${liked ? "active" : ""}"
                            data-product-id="${p.id}"
                            onclick="toggleFeaturedWishlist(${p.id}, this)"
                            aria-label="Add ${p.name} to wishlist">
                            ${liked ? "♥" : "♡"}
                        </button>

                        <img src="${p.image}" alt="${p.name}">

                        <div class="product-content">
                            <span class="badge">
                                Best Seller
                            </span>

                            <h3>${p.name}</h3>

                            <p class="product-description">
                                ${p.description || "Freshly baked with premium ingredients."}
                            </p>

                            <div class="price">
                                AED ${p.price}
                            </div>

                            <div class="product-actions">
                                <button
                                    class="btn-primary"
                                    onclick="addFeaturedToCart(${p.id})">
                                    Add to Cart
                                </button>
                            </div>
                        </div>
                    </div>
                `;
            }).join("");

            if (window.refreshWishlistButtons) refreshWishlistButtons();
        })
        .catch(err => {
            console.log("Home API failed:", err);
            animateCounter("ordersCount", 0);
            animateCounter("cakesCount", 0);
            animateCounter("ratingCount", 0, 1);
        });
});

function toggleFeaturedWishlist(productId, button) {
    const product = featuredProducts.find(p => Number(p.id) === Number(productId));

    if (!product) {
        showToast("Product not found");
        return;
    }

    if (window.toggleWishlistItem) {
        toggleWishlistItem(product, button);
    } else {
        showToast("Wishlist is not ready yet");
    }
}

async function addFeaturedToCart(productId) {
    const product = featuredProducts.find(p => Number(p.id) === Number(productId));

    if (!product) {
        showToast("Product not found");
        return;
    }

    try {
        const res = await fetch("/api/cart", {
            method: "POST",
            headers: {
                "Content-Type": "application/json"
            },
            body: JSON.stringify({
                productId: product.id,
                name: product.name,
                price: product.price,
                quantity: 1
            })
        });

        if (!res.ok) {
            throw new Error("Failed");
        }

        showToast("Added to cart");
        updateCartCount();
    } catch (err) {
        console.error(err);
        showToast("Failed to add item");
    }
}

function showToast(message) {
    let toast = document.getElementById("toast");

    if (!toast) {
        toast = document.createElement("div");
        toast.id = "toast";
        toast.className = "toast";
        document.body.appendChild(toast);
    }

    toast.innerText = message;
    toast.classList.add("show");

    setTimeout(() => {
        toast.classList.remove("show");
    }, 2500);
}

async function updateCartCount() {
    try {
        const res = await fetch("/api/cart");
        const cart = await res.json();

        const total = cart.reduce((sum, item) => sum + item.quantity, 0);

        const cartBtn = document.getElementById("floatingCart");
        const badge = document.getElementById("cartCount");

        if (!cartBtn || !badge) return;

        if (total === 0) {
            cartBtn.classList.remove("show");
        } else {
            cartBtn.classList.add("show");
            badge.innerText = total;
        }
    } catch (err) {
        console.log(err);
    }
}
 
function goToAccount() {
    const user = JSON.parse(localStorage.getItem("loggedInUser"));

    if (user && user.id) {
        window.location.href = "account.html";
    } else {
        window.location.href = "login.html";
    }
}
