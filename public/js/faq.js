let faqData = [];
let filteredData = [];

document.addEventListener("DOMContentLoaded", async () => {

    const res = await fetch("/api/faq");
    faqData = await res.json();

    filteredData = faqData;

    renderFAQ();

    document.getElementById("faqSearch").addEventListener("input", (e) => {
        const value = e.target.value.toLowerCase();

        filteredData = faqData.filter(item =>
            item.question.toLowerCase().includes(value) ||
            item.answer.toLowerCase().includes(value)
        );

        renderFAQ();
    });
});

function renderFAQ() {

    const container = document.getElementById("faqContainer");

    container.innerHTML = filteredData.map((faq) => {

        return `
        <div class="faq-item">
            <div class="faq-question">
                ${faq.question}
                <span class="icon">+</span>
            </div>

            <div class="faq-answer">
                <p>${faq.answer}</p>
            </div>
        </div>
        `;
    }).join("");

    bindFAQEvents();
}

function bindFAQEvents() {

    const items = document.querySelectorAll(".faq-item");

    items.forEach(item => {

        const question = item.querySelector(".faq-question");

        question.addEventListener("click", () => {

            items.forEach(i => {
                if (i !== item) i.classList.remove("active");
            });

            item.classList.toggle("active");
        });
    });
}