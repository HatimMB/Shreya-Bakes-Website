let adminReviews = [];

function getAdminSession() {
    try {
        return JSON.parse(localStorage.getItem("adminUser"));
    } catch (err) {
        return null;
    }
}

function escapeHTML(text) {
    return String(text || "")
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&#039;");
}


function getStars(rating) {
    const count = Math.max(0, Math.min(5, Number(rating) || 0));
    return "⭐".repeat(count) || "No rating";
}

function renderReviewsAdmin() {
    const list = document.getElementById("adminReviewsList");

    if (adminReviews.length === 0) {
        list.innerHTML = `
            <div class="empty-wishlist-card">
                <h3>No reviews yet</h3>
                <p class="muted">Customer reviews will appear here.</p>
            </div>
        `;
        return;
    }

    list.innerHTML = adminReviews.map(review => `
        <div class="admin-review-card view-only-review">
            <div class="admin-card-top">
                <div>
                    <h3>${escapeHTML(review.name || "Customer")}</h3>
                    <p class="review-stars">${getStars(review.rating)}</p>
                </div>
            </div>
            <p class="review-text">${escapeHTML(review.review)}</p>
        </div>
    `).join("");
}

async function loadReviewsAdmin() {
    try {
        const res = await fetch("/api/admin/reviews");
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || "Unable to load reviews");
        adminReviews = data.reviews || [];
        renderReviewsAdmin();
    } catch (err) {
        showToast(err.message || "Unable to load reviews", "error");
    }
}

document.addEventListener("DOMContentLoaded", () => {
    if (!getAdminSession()) {
        location.href = "admin.html";
        return;
    }

    document.getElementById("adminDashboard").classList.remove("hidden");
    loadReviewsAdmin();
});
