function changeQuantity(btn, change) {
    const quantitySpan = btn.parentNode.querySelector('.quantity-display');
    let quantity = parseInt(quantitySpan.textContent);
    const newQuantity = Math.max(0, quantity + change);
    quantitySpan.textContent = newQuantity;
}