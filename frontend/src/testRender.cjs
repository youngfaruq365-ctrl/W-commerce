const React = require('react');
const { renderToStaticMarkup } = require('react-dom/server');

const cartItems = [
  {
    id: "7eac297e-331a-462d-8173-83a600a6e0b1",
    productId: "27c384c4-c46a-4ad1-ab6d-056739f5bdc0",
    title: "RoboVac Elite Smart Vacuum",
    price: "349.99",
    quantity: 1,
    variants: null,
    image: "https://images.unsplash.com/photo-1589156725096-c3a5852c51e8",
    seller: "Euro Fashion Boutique",
    sellerId: "9842dadb-f338-4640-81dc-9c0035bc936e",
    directShippingRate: 75.00
  }
];

function CartItemsMock() {
  return React.createElement('div', null,
    Object.entries(cartItems.reduce((acc, item) => {
      if (!acc[item.seller]) acc[item.seller] = [];
      acc[item.seller].push(item);
      return acc;
    }, {})).map(([sellerName, items]) => 
      React.createElement('div', { key: sellerName }, 
        React.createElement('h4', null, sellerName),
        items.map(item => 
          React.createElement('div', { key: item.id },
            React.createElement('img', { src: item.image }),
            React.createElement('h3', null, item.title),
            React.createElement('span', null, (item.price * item.quantity).toFixed(2))
          )
        )
      )
    )
  );
}

try {
  console.log(renderToStaticMarkup(React.createElement(CartItemsMock)));
} catch(e) {
  console.error("Render failed:", e);
}
