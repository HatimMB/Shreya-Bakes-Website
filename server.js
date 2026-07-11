const express = require("express");
const fs = require("fs");
const path = require("path");

const app = express();
const PORT = 3000;

app.use(express.json({ limit: "15mb" }));
app.use(express.urlencoded({ extended: true, limit: "15mb" }));

const publicDir = path.join(__dirname, "public");
app.use(express.static(publicDir));

app.get("/", (req, res) => {
    res.redirect("/home.html");
});

app.get("/admin", (req, res) => {
    res.sendFile(path.join(publicDir, "admin.html"));
});

app.get("/admin.html", (req, res) => {
    res.sendFile(path.join(publicDir, "admin.html"));
});

const ORDER_STEPS = ["Order Placed", "Preparing", "Baking", "Out for Delivery", "Delivered"];
const ADMIN_EMAIL = "admin@shreyabakes.com";
const ADMIN_PASSWORD = "admin123";

function normalizeStatus(status) {
    return status === "Placed" ? "Order Placed" : (status || "Order Placed");
}

function readJSON(filePath) {
    const fullPath = path.join(__dirname, filePath);
    if (!fs.existsSync(fullPath)) return [];

    try {
        const content = fs.readFileSync(fullPath, "utf-8").trim();
        return content ? JSON.parse(content) : [];
    } catch (err) {
        console.error("Invalid JSON file:", filePath, err);
        return [];
    }
}

function writeJSON(filePath, data) {
    const fullPath = path.join(__dirname, filePath);
    fs.writeFileSync(fullPath, JSON.stringify(data, null, 2));
}

function safeProduct(product) {
    return {
        id: Number(product.id),
        name: product.name || "",
        category: product.category || "",
        price: Number(product.price) || 0,
        image: product.image || "",
        description: product.description || ""
    };
}

function safeUser(user) {
    return {
        id: user.id,
        name: user.name || "",
        email: user.email || "",
        phone: user.phone || "",
        address: user.address || "",
        city: user.city || "",
        loyaltyPoints: Math.max(0, Math.floor(Number(user.loyaltyPoints) || 0))
    };
}

function safeOrder(order) {
    return {
        ...order,
        status: normalizeStatus(order.status),
        items: Array.isArray(order.items) ? order.items : []
    };
}

function ensureReviewIds(reviews) {
    let changed = false;
    reviews.forEach((review, index) => {
        if (!review.id) {
            review.id = `REV-${Date.now()}-${index}`;
            changed = true;
        }
    });
    if (changed) writeJSON("data/reviews.json", reviews);
    return reviews;
}

function ensureContactFields(messages) {
    let changed = false;
    messages.forEach((message, index) => {
        if (!message.id) {
            message.id = `MSG-${Date.now()}-${index}`;
            changed = true;
        }
        if (!message.status) {
            message.status = "New";
            changed = true;
        }
    });
    if (changed) writeJSON("data/contacts.json", messages);
    return messages;
}

function safeReview(review) {
    return {
        id: review.id,
        name: review.name || "",
        rating: Math.min(5, Math.max(1, Number(review.rating) || 1)),
        review: review.review || ""
    };
}

function safeContact(message) {
    return {
        id: message.id,
        name: message.name || "",
        email: message.email || "",
        message: message.message || "",
        status: message.status || "New",
        timestamp: message.timestamp || ""
    };
}


function isValidEmail(email) {
    return /^[^\s@]+@[^\s@]+\.com$/i.test(String(email || "").trim());
}

function isValidPhone(phone) {
    return /^05\d{8}$/.test(String(phone || "").trim());
}

function updateOrderEmail(oldEmail, newEmail) {
    if (!oldEmail || !newEmail || oldEmail.toLowerCase() === newEmail.toLowerCase()) return;

    const orders = readJSON("data/orders.json");
    let changed = false;

    orders.forEach(order => {
        if (String(order.email || "").toLowerCase() === oldEmail.toLowerCase()) {
            order.email = newEmail;
            changed = true;
        }
    });

    if (changed) writeJSON("data/orders.json", orders);
}

function calculateStatistics() {
    const orders = readJSON("data/orders.json");
    const reviews = ensureReviewIds(readJSON("data/reviews.json"));

    const completedOrders = orders.filter(order => Array.isArray(order.items) && order.items.length > 0);
    const customCakeCount = completedOrders.reduce((total, order) => {
        return total + order.items.reduce((itemTotal, item) => {
            const itemName = String(item.name || "").toLowerCase();
            const quantity = Number(item.quantity) || 1;
            return itemName.includes("custom cake") ? itemTotal + quantity : itemTotal;
        }, 0);
    }, 0);

    const validReviews = reviews.filter(review => Number(review.rating) > 0);
    const averageRating = validReviews.length
        ? validReviews.reduce((sum, review) => sum + Number(review.rating), 0) / validReviews.length
        : 0;
    const satisfaction = averageRating ? Math.round((averageRating / 5) * 100) : 0;

    return {
        orders: completedOrders.length,
        cakes: customCakeCount,
        rating: Number(averageRating.toFixed(1)),
        totalReviews: validReviews.length,
        satisfaction
    };
}

function getAdminSummary() {
    const orders = readJSON("data/orders.json").map(safeOrder);
    const products = readJSON("data/products.json").map(safeProduct);
    const users = readJSON("data/users.json").map(safeUser);
    const reviews = ensureReviewIds(readJSON("data/reviews.json")).map(safeReview);
    const messages = ensureContactFields(readJSON("data/contacts.json")).map(safeContact);
    const totalRevenue = orders.reduce((sum, order) => sum + (Number(order.total) || 0), 0);
    const activeOrders = orders.filter(order => normalizeStatus(order.status) !== "Delivered");
    const newMessages = messages.filter(message => message.status === "New");

    return {
        totalOrders: orders.length,
        activeOrders: activeOrders.length,
        deliveredOrders: orders.length - activeOrders.length,
        totalProducts: products.length,
        totalCustomers: users.length,
        totalReviews: reviews.length,
        totalMessages: messages.length,
        newMessages: newMessages.length,
        revenue: Number(totalRevenue.toFixed(2)),
        stats: calculateStatistics()
    };
}

app.get("/api/products", (req, res) => {
    res.json(readJSON("data/products.json").map(safeProduct));
});

app.get("/api/home", (req, res) => {
    const products = readJSON("data/products.json").map(safeProduct);
    res.json({ stats: calculateStatistics(), featured: products.slice(0, 4) });
});

app.get("/api/stats", (req, res) => {
    res.json(calculateStatistics());
});

app.get("/api/cart", (req, res) => {
    res.json(readJSON("data/cart.json"));
});

app.post("/api/cart", (req, res) => {
    const carts = readJSON("data/cart.json");
    let { productId, name, price, quantity } = req.body;

    productId = Number(productId);
    price = Number(price);
    quantity = Number(quantity || 1);

    if (!productId || !name || !price) {
        return res.status(400).json({ error: "Invalid cart item" });
    }

    const existing = carts.find(i => Number(i.productId) === productId);

    if (existing) {
        existing.quantity = Number(existing.quantity || 1) + quantity;
    } else {
        carts.push({ productId, name, price, quantity });
    }

    writeJSON("data/cart.json", carts);
    res.json({ success: true, cart: carts });
});

app.put("/api/cart", (req, res) => {
    const carts = readJSON("data/cart.json");
    let { productId, quantity, quantityChange } = req.body;
    productId = Number(productId);

    const item = carts.find(i => Number(i.productId) === productId);
    if (!item) return res.status(404).json({ error: "Not found" });

    if (quantityChange) {
        item.quantity = Number(item.quantity || 1) + Number(quantityChange);
    } else {
        item.quantity = Number(quantity);
    }

    if (item.quantity <= 0) {
        const updated = carts.filter(i => Number(i.productId) !== productId);
        writeJSON("data/cart.json", updated);
        return res.json({ success: true, cart: updated });
    }

    writeJSON("data/cart.json", carts);
    res.json({ success: true, cart: carts });
});

app.delete("/api/cart/:id", (req, res) => {
    const carts = readJSON("data/cart.json");
    const id = Number(req.params.id);
    const updated = carts.filter(i => Number(i.productId) !== id);

    writeJSON("data/cart.json", updated);
    res.json({ success: true, cart: updated });
});

app.delete("/api/cart", (req, res) => {
    writeJSON("data/cart.json", []);
    res.json({ success: true });
});

app.post("/api/order", (req, res) => {
    const orders = readJSON("data/orders.json");
    const order = {
        ...req.body,
        orderId: req.body.orderId || "SB" + Date.now(),
        status: normalizeStatus(req.body.status),
        serverTime: new Date().toISOString()
    };

    orders.push(order);
    writeJSON("data/orders.json", orders);
    res.json({ success: true, orderId: order.orderId, order: safeOrder(order), stats: calculateStatistics() });
});

app.get("/api/order/:id", (req, res) => {
    const orders = readJSON("data/orders.json");
    const order = orders.find(o => o.orderId === req.params.id);
    if (!order) return res.status(404).json({ error: "Order not found" });
    res.json(safeOrder(order));
});

app.get("/api/orders/user/:email", (req, res) => {
    const email = String(req.params.email || "").toLowerCase();
    const orders = readJSON("data/orders.json")
        .filter(order => String(order.email || "").toLowerCase() === email)
        .map(safeOrder);

    res.json(orders);
});

app.post("/api/contact", (req, res) => {
    const data = ensureContactFields(readJSON("data/contacts.json"));
    const { name, email, message } = req.body;

    if (!name || !email || !message) {
        return res.status(400).json({ error: "Missing fields" });
    }

    data.push({
        id: req.body.id || "MSG-" + Date.now(),
        name,
        email,
        message,
        status: "New",
        timestamp: new Date().toISOString()
    });

    writeJSON("data/contacts.json", data);
    res.json({ success: true });
});

app.get("/api/reviews", (req, res) => {
    res.json(ensureReviewIds(readJSON("data/reviews.json")).map(safeReview));
});

app.post("/api/reviews", (req, res) => {
    const reviews = ensureReviewIds(readJSON("data/reviews.json"));
    const rating = Number(req.body.rating);

    if (!req.body.name || !req.body.review || rating < 1 || rating > 5) {
        return res.status(400).json({ error: "Invalid review" });
    }

    const newReview = {
        id: "REV-" + Date.now(),
        name: req.body.name,
        rating,
        review: req.body.review
    };

    reviews.unshift(newReview);
    writeJSON("data/reviews.json", reviews);
    res.json({ success: true, review: safeReview(newReview), stats: calculateStatistics() });
});

app.get("/api/faq", (req, res) => {
    res.json(readJSON("data/faq.json"));
});

app.post("/api/faq", (req, res) => {
    const faq = readJSON("data/faq.json");
    faq.push({ ...req.body, timestamp: new Date().toISOString() });
    writeJSON("data/faq.json", faq);
    res.json({ success: true });
});

app.get("/api/users", (req, res) => {
    const users = readJSON("data/users.json").map(safeUser);
    res.json(users);
});

app.post("/api/signup", (req, res) => {
    const users = readJSON("data/users.json");
    const { name, email, password, phone, address, city } = req.body;

    if (!name || !email || !password || !phone || !city) {
        return res.status(400).json({ error: "Please fill in all signup fields" });
    }

    if (!isValidEmail(email)) {
        return res.status(400).json({ error: "Email is invalid" });
    }

    if (!isValidPhone(phone)) {
        return res.status(400).json({ error: "Phone number must start with 05 and have 10 digits" });
    }

    const exists = users.find(u => String(u.email).toLowerCase() === String(email).toLowerCase());
    if (exists) return res.status(409).json({ error: "User already exists" });

    const newUser = {
        id: Date.now(),
        name,
        email,
        password,
        phone,
        address: address || "",
        city,
        loyaltyPoints: 0
    };

    users.push(newUser);
    writeJSON("data/users.json", users);
    res.json({ success: true, user: safeUser(newUser) });
});

app.post("/api/login", (req, res) => {
    const users = readJSON("data/users.json");
    const { email, password } = req.body;
    const user = users.find(u => String(u.email).toLowerCase() === String(email).toLowerCase() && u.password === password);

    if (!user) return res.status(401).json({ error: "Invalid credentials" });
    res.json({ success: true, user: safeUser(user) });
});

app.put("/api/users/:id", (req, res) => {
    const users = readJSON("data/users.json");
    const userId = Number(req.params.id);
    const user = users.find(u => Number(u.id) === userId);

    if (!user) return res.status(404).json({ error: "User not found" });

    const nextEmail = String(req.body.email || user.email || "").trim();
    const nextPhone = String(req.body.phone || "").trim();

    if (!isValidEmail(nextEmail)) {
        return res.status(400).json({ error: "Email is invalid" });
    }

    if (!isValidPhone(nextPhone)) {
        return res.status(400).json({ error: "Phone number must start with 05 and have 10 digits" });
    }

    const emailExists = users.find(u => Number(u.id) !== userId && String(u.email || "").toLowerCase() === nextEmail.toLowerCase());
    if (emailExists) return res.status(409).json({ error: "Email already exists" });

    const oldEmail = user.email;

    user.name = req.body.name || user.name;
    user.email = nextEmail;
    user.phone = nextPhone;
    user.address = req.body.address || "";
    user.city = req.body.city || "";

    if (req.body.loyaltyPoints !== undefined) {
        user.loyaltyPoints = Math.max(0, Math.floor(Number(req.body.loyaltyPoints) || 0));
    }

    writeJSON("data/users.json", users);
    updateOrderEmail(oldEmail, user.email);
    res.json({ success: true, user: safeUser(user) });
});

app.post("/api/admin/login", (req, res) => {
    const { email, password } = req.body;
    if (String(email).toLowerCase() === ADMIN_EMAIL && password === ADMIN_PASSWORD) {
        return res.json({ success: true, admin: { email: ADMIN_EMAIL, name: "Shreya Bakes Admin" } });
    }
    res.status(401).json({ error: "Invalid admin login" });
});

app.get("/api/admin/summary", (req, res) => {
    res.json({ success: true, summary: getAdminSummary() });
});

app.get("/api/admin/orders", (req, res) => {
    const orders = readJSON("data/orders.json").map(safeOrder);
    orders.sort((a, b) => new Date(b.serverTime || b.createdAt || 0) - new Date(a.serverTime || a.createdAt || 0));
    res.json({ success: true, orders, statuses: ORDER_STEPS });
});

app.put("/api/admin/orders/:id/status", (req, res) => {
    const orders = readJSON("data/orders.json");
    const order = orders.find(o => o.orderId === req.params.id);
    const status = normalizeStatus(req.body.status);

    if (!order) return res.status(404).json({ error: "Order not found" });
    if (!ORDER_STEPS.includes(status)) return res.status(400).json({ error: "Invalid order status" });

    order.status = status;
    order.statusUpdatedAt = new Date().toISOString();
    writeJSON("data/orders.json", orders);
    res.json({ success: true, order: safeOrder(order) });
});

app.get("/api/admin/products", (req, res) => {
    const products = readJSON("data/products.json").map(safeProduct);
    res.json({ success: true, products });
});

app.post("/api/admin/products", (req, res) => {
    const products = readJSON("data/products.json");
    const { name, category, price, image, description } = req.body;

    if (!name || !category || Number(price) <= 0 || !image) {
        return res.status(400).json({ error: "Please add product name, category, price, and picture" });
    }

    const product = {
        id: Date.now(),
        name: String(name).trim(),
        category: String(category).trim(),
        price: Number(price),
        image,
        description: String(description || "").trim()
    };

    products.push(product);
    writeJSON("data/products.json", products);
    res.json({ success: true, product: safeProduct(product) });
});

app.put("/api/admin/products/:id", (req, res) => {
    const products = readJSON("data/products.json");
    const productId = Number(req.params.id);
    const product = products.find(p => Number(p.id) === productId);

    if (!product) return res.status(404).json({ error: "Product not found" });

    const { name, category, price, image, description } = req.body;
    if (!name || !category || Number(price) <= 0) {
        return res.status(400).json({ error: "Please add product name, category, and valid price" });
    }

    product.name = String(name).trim();
    product.category = String(category).trim();
    product.price = Number(price);
    product.description = String(description || "").trim();
    if (image) product.image = image;

    writeJSON("data/products.json", products);
    res.json({ success: true, product: safeProduct(product) });
});

app.delete("/api/admin/products/:id", (req, res) => {
    const products = readJSON("data/products.json");
    const productId = Number(req.params.id);
    const productExists = products.some(p => Number(p.id) === productId);

    if (!productExists) return res.status(404).json({ error: "Product not found" });

    const updated = products.filter(p => Number(p.id) !== productId);
    writeJSON("data/products.json", updated);
    res.json({ success: true });
});

app.get("/api/admin/users", (req, res) => {
    const users = readJSON("data/users.json").map(safeUser);
    const orders = readJSON("data/orders.json").map(safeOrder);

    const customers = users.map(user => {
        const userOrders = orders.filter(order => String(order.email || "").toLowerCase() === String(user.email || "").toLowerCase());
        const totalSpent = userOrders.reduce((sum, order) => sum + (Number(order.total) || 0), 0);
        const latestOrder = userOrders.slice().sort((a, b) => new Date(b.serverTime || b.createdAt || 0) - new Date(a.serverTime || a.createdAt || 0))[0];

        return {
            ...user,
            orderCount: userOrders.length,
            totalSpent: Number(totalSpent.toFixed(2)),
            lastOrderDate: latestOrder ? latestOrder.serverTime || latestOrder.createdAt || "" : "",
            lastOrderStatus: latestOrder ? normalizeStatus(latestOrder.status) : "No orders"
        };
    });

    res.json({ success: true, customers });
});

app.get("/api/admin/reviews", (req, res) => {
    const reviews = ensureReviewIds(readJSON("data/reviews.json")).map(safeReview);
    res.json({ success: true, reviews });
});

app.put("/api/admin/reviews/:id", (req, res) => {
    res.status(403).json({ error: "Reviews are view only in the admin panel" });
});

app.delete("/api/admin/reviews/:id", (req, res) => {
    res.status(403).json({ error: "Reviews are view only in the admin panel" });
});

app.get("/api/admin/contacts", (req, res) => {
    const messages = ensureContactFields(readJSON("data/contacts.json")).map(safeContact);
    messages.sort((a, b) => new Date(b.timestamp || 0) - new Date(a.timestamp || 0));
    res.json({ success: true, messages });
});

app.put("/api/admin/contacts/:id", (req, res) => {
    const messages = ensureContactFields(readJSON("data/contacts.json"));
    const message = messages.find(item => String(item.id) === String(req.params.id));
    const allowed = ["New", "Read", "Resolved"];

    if (!message) return res.status(404).json({ error: "Message not found" });
    if (!allowed.includes(req.body.status)) return res.status(400).json({ error: "Invalid status" });

    message.status = req.body.status;
    message.statusUpdatedAt = new Date().toISOString();
    writeJSON("data/contacts.json", messages);
    res.json({ success: true, message: safeContact(message) });
});

app.delete("/api/admin/contacts/:id", (req, res) => {
    const messages = ensureContactFields(readJSON("data/contacts.json"));
    const updated = messages.filter(item => String(item.id) !== String(req.params.id));

    if (updated.length === messages.length) return res.status(404).json({ error: "Message not found" });

    writeJSON("data/contacts.json", updated);
    res.json({ success: true });
});

app.listen(PORT, () => {
    console.log(`Server running on http://localhost:${PORT}`);
});
