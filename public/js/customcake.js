let order = {
    base: "",
    frosting: "",
    topping: "",
    text: "",
    total: 0
};

document.addEventListener("DOMContentLoaded", () => {
    updateCartCount();
});

function updatePrice() {
    document.getElementById("price").innerText = order.total;
}

function nextSlide(current, next) {
    document.getElementById(current).classList.remove("active");
    document.getElementById(next).classList.add("active");
}

function selectBase(name, price) {
    order.base = name;
    order.total += price;
    updatePrice();
    nextSlide("slide1", "slide2");
}

function selectFrosting(name, price) {
    order.frosting = name;
    order.total += price;
    updatePrice();
    nextSlide("slide2", "slide3");
}

function selectTopping(name, price) {
    order.topping = name;
    order.total += price;
    updatePrice();
    nextSlide("slide3", "slide4");
}

function finishText() {
    const text = document.getElementById("cakeText").value.trim();

    if (text !== "") {
        order.text = text;
        order.total += 10;
    } else {
        order.text = "No custom text";
    }

    updatePrice();

    document.getElementById("sumBase").innerText = order.base;
    document.getElementById("sumFrosting").innerText = order.frosting;
    document.getElementById("sumTopping").innerText = order.topping;
    document.getElementById("sumText").innerText = order.text;
    document.getElementById("sumPrice").innerText = order.total;

    nextSlide("slide4", "slide5");
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

async function addCustomCakeToCart() {
    if (!order.base || !order.frosting || !order.topping || order.total <= 0) {
        showToast("Please finish your cake first");
        return;
    }

    try {
        const res = await fetch("/api/cart", {
            method: "POST",
            headers: {
                "Content-Type": "application/json"
            },
            body: JSON.stringify({
                productId: Date.now(),
                name: `${order.base} Custom Cake`,
                price: order.total,
                quantity: 1
            })
        });

        const data = await res.json();

        if (data.success) {
            updateCartCount();
            showToast("Added to cart");
        } else {
            showToast("Failed to add cake");
        }
    } catch (err) {
        console.error(err);
        showToast("Server error");
    }
}
