
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

function showFormMessage(element, message, colour = "red") {
    if (!element) return;
    element.style.color = colour;
    element.innerText = message;
}

function showFieldError(id, message) {
    const error = document.getElementById(id);
    if (!error) return;
    error.innerText = message;
}

function clearSignupErrors() {
    showFieldError("signupEmailError", "");
    showFieldError("signupPhoneError", "");
}

function switchTab(tab) {
    const loginForm = document.getElementById("loginForm");
    const signupForm = document.getElementById("signupForm");
    const tabs = document.querySelectorAll(".tab");
    const authInfoTitle = document.getElementById("authInfoTitle");
    const authInfoText = document.getElementById("authInfoText");

    tabs.forEach(btn => btn.classList.remove("active"));

    if (tab === "login") {
        loginForm.classList.remove("hidden");
        signupForm.classList.add("hidden");
        tabs[0].classList.add("active");
        authInfoTitle.innerText = "Welcome Back";
        authInfoText.innerText = "Log in to access your saved details, rewards, wishlist, and order history.";
    } else {
        signupForm.classList.remove("hidden");
        loginForm.classList.add("hidden");
        tabs[1].classList.add("active");
        authInfoTitle.innerText = "WELCOME";
        authInfoText.innerText = "Create your account to save delivery details, earn loyalty points, and keep your favourite treats.";
    }
}

document.addEventListener("DOMContentLoaded", () => {
    const loginForm = document.getElementById("loginForm");
    const signupForm = document.getElementById("signupForm");
    const loginMsg = document.getElementById("loginMsg");
    const signupMsg = document.getElementById("signupMsg");
    const signupEmail = document.getElementById("signupEmail");
    const signupPhone = document.getElementById("signupPhone");

    if (signupPhone) {
        if (!signupPhone.value) signupPhone.value = "05";

        signupPhone.addEventListener("focus", () => {
            if (!signupPhone.value) signupPhone.value = "05";
        });

        signupPhone.addEventListener("input", () => {
            signupPhone.value = cleanPhoneNumber(signupPhone.value);
            showFieldError("signupPhoneError", "");
        });
    }

    if (signupEmail) {
        signupEmail.addEventListener("input", () => {
            showFieldError("signupEmailError", "");
        });
    }

    loginForm.addEventListener("submit", async (e) => {
        e.preventDefault();

        const email = document.getElementById("loginEmail").value.trim();
        const password = document.getElementById("loginPassword").value.trim();

        if (!isValidEmail(email)) {
            showFormMessage(loginMsg, "Please enter a valid email ending with .com");
            return;
        }

        try {
            const res = await fetch("/api/login", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ email, password })
            });

            const data = await res.json();

            if (!res.ok || !data.user) {
                loginMsg.style.color = "red";
                loginMsg.innerText = data.error || "Invalid email or password";
                return;
            }

            localStorage.setItem("loggedInUser", JSON.stringify(data.user));
            localStorage.removeItem("user");

            loginMsg.style.color = "green";
            loginMsg.innerText = "Login successful 🎉";

            setTimeout(() => {
                window.location.href = "home.html";
            }, 700);

        } catch (err) {
            loginMsg.style.color = "red";
            loginMsg.innerText = "Server error. Please try again.";
        }
    });

    signupForm.addEventListener("submit", async (e) => {
        e.preventDefault();
        clearSignupErrors();
        if (signupMsg) signupMsg.innerText = "";

        const name = document.getElementById("signupName").value.trim();
        const email = document.getElementById("signupEmail").value.trim();
        const password = document.getElementById("signupPassword").value.trim();
        const phone = cleanPhoneNumber(document.getElementById("signupPhone").value.trim());
        const address = document.getElementById("signupAddress").value.trim();
        const city = document.getElementById("signupCity").value.trim();

        document.getElementById("signupPhone").value = phone;

        if (!isValidEmail(email)) {
            showFieldError("signupEmailError", "Email is invalid");
            return;
        }

        if (!isValidPhone(phone)) {
            showFieldError("signupPhoneError", "Phone number must start with 05 and have 10 digits");
            return;
        }

        try {
            const res = await fetch("/api/signup", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ name, email, password, phone, address, city })
            });

            const data = await res.json();

            if (!res.ok || !data.user) {
                signupMsg.style.color = "red";
                signupMsg.innerText = data.error || "Signup failed";
                return;
            }

            localStorage.setItem("loggedInUser", JSON.stringify(data.user));
            localStorage.removeItem("user");

            signupMsg.style.color = "green";
            signupMsg.innerText = "Account created 🎉";

            setTimeout(() => {
                window.location.href = "home.html";
            }, 700);

        } catch (err) {
            signupMsg.style.color = "red";
            signupMsg.innerText = "Server error. Please try again.";
        }
    });
});


document.addEventListener("DOMContentLoaded", () => {
    const params = new URLSearchParams(window.location.search);
    if (params.get("tab") === "signup") {
        switchTab("signup");
    }
});
