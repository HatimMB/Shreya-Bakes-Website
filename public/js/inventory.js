let adminProducts = [];
let selectedImage = "";

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

async function loadProducts() {
    try {
        const res = await fetch("/api/admin/products");
        const data = await res.json();
        adminProducts = data.products || [];
        renderProducts();
    } catch (err) {
        showToast("Unable to load products", "error");
    }
}

function renderProducts() {
    const list = document.getElementById("adminProductsList");

    if (adminProducts.length === 0) {
        list.innerHTML = "<p class='muted'>No products yet</p>";
        return;
    }

    list.innerHTML = adminProducts.map(product => `
        <div class="admin-product-card">
            <img src="${escapeHTML(product.image)}" alt="${escapeHTML(product.name)}">
            <div>
                <span class="status-pill">${escapeHTML(product.category)}</span>
                <h3>${escapeHTML(product.name)}</h3>
                <strong>AED ${Number(product.price).toFixed(2)}</strong>
                <p>${escapeHTML(product.description)}</p>
                <div class="admin-product-actions">
                    <button type="button" onclick="editProduct(${Number(product.id)})">Edit</button>
                    <button type="button" class="danger-btn" onclick="deleteProduct(${Number(product.id)})">Delete</button>
                </div>
            </div>
        </div>
    `).join("");
}

function clearForm() {
    selectedImage = "";
    productForm.reset();
    productId.value = "";
    productPreview.classList.add("hidden");
    productSubmitBtn.innerHTML = "Add Product";
}

function editProduct(id) {
    const product = adminProducts.find(item => Number(item.id) === Number(id));
    if (!product) return;

    productId.value = product.id;
    productName.value = product.name;
    productCategory.value = product.category;
    productPrice.value = product.price;
    productDescription.value = product.description;
    selectedImage = "";
    productPreview.src = product.image;
    productPreview.classList.remove("hidden");
    productSubmitBtn.innerHTML = "Update Product";
    window.scrollTo(0, 0);
}

async function deleteProduct(id) {
    try {
        const res = await fetch("/api/admin/products/" + encodeURIComponent(id), { method: "DELETE" });
        if (!res.ok) throw new Error("Delete failed");
        showToast("Product deleted", "success");
        loadProducts();
    } catch (err) {
        showToast("Unable to delete product", "error");
    }
}

document.addEventListener("DOMContentLoaded", () => {
    if (!getAdminSession()) {
        location.href = "admin.html";
        return;
    }

    document.getElementById("adminDashboard").classList.remove("hidden");

    productImage.onchange = () => {
        const file = productImage.files[0];
        if (!file) return;

        const reader = new FileReader();
        reader.onload = e => {
            selectedImage = e.target.result;
            productPreview.src = selectedImage;
            productPreview.classList.remove("hidden");
        };
        reader.readAsDataURL(file);
    };

    productForm.onsubmit = async e => {
        e.preventDefault();

        const data = {
            name: productName.value.trim(),
            category: productCategory.value,
            price: Number(productPrice.value),
            description: productDescription.value.trim()
        };

        if (selectedImage) data.image = selectedImage;
        const id = productId.value;

        try {
            const res = await fetch(id ? "/api/admin/products/" + encodeURIComponent(id) : "/api/admin/products", {
                method: id ? "PUT" : "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(data)
            });
            const result = await res.json();
            if (!res.ok) throw new Error(result.error || "Save failed");

            showToast(id ? "Product updated" : "Product added", "success");
            clearForm();
            loadProducts();
        } catch (err) {
            showToast(err.message || "Unable to save product", "error");
        }
    };

    loadProducts();
});
