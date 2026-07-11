function isValidEmail(email) {
    return /^[^\s@]+@[^\s@]+\.com$/i.test(email);
}

document.addEventListener("DOMContentLoaded", () => {
    const form = document.getElementById("contactForm");
    const successMessage = document.getElementById("successMessage");
    const nameInput = document.getElementById("contactName");
    const emailInput = document.getElementById("contactEmail");

    function prefillLoggedInUser() {
        const user = typeof getLoggedInUser === "function" ? getLoggedInUser() : null;

        if (!user) return;

        if (user.name && nameInput) {
            nameInput.value = user.name;
            nameInput.readOnly = true;
        }

        if (user.email && emailInput) {
            emailInput.value = user.email;
            emailInput.readOnly = true;
        }
    }

    prefillLoggedInUser();

    form.addEventListener("submit", async (e) => {
        e.preventDefault();

        const name = nameInput.value.trim();
        const email = emailInput.value.trim();
        const message = document.getElementById("message").value.trim();

        if (!name || !email || !message) {
            showToast("Please fill in all fields.");
            return;
        }

        if (!isValidEmail(email)) {
            showToast("Please enter a valid email ending with .com", "error");
            return;
        }

        const contactData = {
            id: "MSG-" + Date.now(),
            name,
            email,
            message
        };

        try {
            const res = await fetch("/api/contact", {
                method: "POST",
                headers: {
                    "Content-Type": "application/json"
                },
                body: JSON.stringify(contactData)
            });

            if (!res.ok) throw new Error("Request failed");

            successMessage.style.display = "block";
            successMessage.innerText = "Message sent successfully.";

            form.reset();
            prefillLoggedInUser();

            setTimeout(() => {
                successMessage.style.display = "none";
            }, 4000);

        } catch (err) {
            console.error(err);
            showToast("Server error. Please try again.");
        }
    });
});
