let selectedRating = 0;
let reviews = [];

document.addEventListener("DOMContentLoaded", () => {
    loadReviews();
    bindForm();
    setupStars();
});

function loadReviews() {
    fetch("/api/reviews")
        .then(res => res.json())
        .then(data => {
            reviews = Array.isArray(data) ? data : [];
            displayReviews();
            updateStats();
        })
        .catch(err => {
            console.error("Failed to load reviews", err);
        });
}

function setupStars() {
    const stars = document.querySelectorAll("#starInput span");

    stars.forEach(star => {
        star.addEventListener("mouseover", () => {
            highlight(star.dataset.value);
        });

        star.addEventListener("click", () => {
            selectedRating = parseInt(star.dataset.value);
            highlight(selectedRating);
        });
    });

    document.getElementById("starInput")
        .addEventListener("mouseleave", () => {
            highlight(selectedRating);
        });
}

function highlight(rating) {
    const stars = document.querySelectorAll("#starInput span");

    stars.forEach(star => {
        star.classList.toggle("active", star.dataset.value <= rating);
    });
}

function bindForm() {
    const form = document.getElementById("reviewForm");

    form.addEventListener("submit", async (e) => {
        e.preventDefault();

        const name = document.getElementById("reviewName").value.trim();
        const comment = document.getElementById("reviewComment").value.trim();

        if (!name || !comment || selectedRating === 0) {
            showToast("Please fill all fields and select a rating.");
            return;
        }

        const payload = {
            name,
            rating: selectedRating,
            review: comment
        };
  
        try {
            const res = await fetch("/api/reviews", {
                method: "POST",
                headers: {
                    "Content-Type": "application/json"
                },
                body: JSON.stringify(payload)
            });

            if (!res.ok) throw new Error("Failed");

            const data = await res.json();

            reviews.unshift(data.review);

            displayReviews();
            updateStats();

            document.getElementById("reviewMessage").innerText =
                "✓ Thank you! Your review has been submitted.";

            setTimeout(() => {
                document.getElementById("reviewMessage").innerText = "";
            }, 9000);

            form.reset();
            selectedRating = 0;
            highlight(0);

        } catch (err) {
            showToast("Could not submit review. Please try again.");
            console.error(err);
        }
    });
}

function displayReviews() {
    const container = document.getElementById("reviewsContainer");

    container.innerHTML = reviews
        .slice()
        .map(r => `
            <div class="product-card">
                <div class="product-content">
                    <h3>${r.name}</h3>

                    <div class="stars">
                        ${"⭐".repeat(Number(r.rating) || 0)}
                    </div>

                    <p>${r.review}</p>

                </div>
            </div>
        `)
        .join("");
}

function updateStats() {
    const validReviews = reviews.filter(r => Number(r.rating) > 0);
    const total = validReviews.length;

    const avg = total
        ? validReviews.reduce((sum, r) => sum + Number(r.rating), 0) / total
        : 0;

    const satisfaction = avg
        ? Math.round((avg / 5) * 100)
        : 0;

    document.getElementById("avgRating").innerText = avg.toFixed(1);
    document.getElementById("totalReviews").innerText = total;
    document.getElementById("satisfactionRate").innerText = satisfaction + "%";
}
