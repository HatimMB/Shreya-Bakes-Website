let products = [];
let currentCategory = "All";

updateCartCount();

fetch("/api/products")
.then(res => res.json())
.then(data => {
    products = data;
    renderProducts(products);
});

function renderProducts(list) {
    const container = document.getElementById("productsContainer");

    container.innerHTML = list.map(p => {
        const liked = window.isItemInWishlist ? isItemInWishlist(p.id) : false;

        return `
            <div class="product-card">
                <button
                    type="button"
                    class="wishlist-heart ${liked ? "active" : ""}"
                    data-product-id="${p.id}"
                    onclick="toggleWishlistById(${p.id}, this)"
                    aria-label="Add ${p.name} to wishlist">
                    ${liked ? "♥" : "♡"}
                </button>
 
                <img src="${p.image}" alt="${p.name}">

                <div class="product-content">
                    <h3>${p.name}</h3>
                    <p class="product-description">${p.description || ""}</p>
                    <div class="price">AED ${p.price}</div>
                    <button class="btn-primary" onclick="addToCart(${p.id})">
                        Add to Cart
                    </button>
                </div>
            </div>
        `;
    }).join("");

    if (window.refreshWishlistButtons) refreshWishlistButtons();
}

function filterProducts() {
    const value = document.getElementById("searchBox").value.toLowerCase();

    const filtered = products.filter(p =>
        p.name.toLowerCase().includes(value) &&
        (currentCategory === "All" || p.category === currentCategory)
    );

    renderProducts(filtered);
}

function setCategory(cat) {
    currentCategory = cat;
    filterProducts();
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
    }, 2000);
}

function toggleWishlistById(productId, button) {
    const product = products.find(p => Number(p.id) === Number(productId));

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

async function addToCart(productId) {
    const product = products.find(p => p.id == productId);

    if (!product) {
        showToast("Product not found");
        return;
    }

    try {
        const res = await fetch("/api/cart", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
                productId: product.id,
                name: product.name,
                price: product.price,
                quantity: 1
            })
        });

        const data = await res.json();

        if (data.success) {
            showToast("Added to cart");
            updateCartCount();
        } else {
            showToast("Failed to add item");
        }

    } catch (err) {
        console.error(err);
        showToast("Server error");
    }
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
