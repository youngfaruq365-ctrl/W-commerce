import React, { createContext, useContext, useState } from 'react';

const SellerDataContext = createContext();

export const SellerDataContextProvider = ({ children }) => {
  // Simulating the seller's global business data pulled from W-Commerce backend
  const [products] = useState([
    {
      id: 'p1',
      title: 'Wagyu A5 Signature',
      description: 'Fermented black garlic, truffle emulsion',
      price: 120.00,
      image: 'https://images.unsplash.com/photo-1544025162-d76694265947?q=80&w=2069&auto=format&fit=crop',
      category: 'Main Course',
      winePairing: 'Barolo 2015'
    },
    {
      id: 'p2',
      title: 'Smoked Scallop',
      description: 'Buttermilk, dill oil, sea salt',
      price: 45.00,
      image: 'https://images.unsplash.com/photo-1626779848529-57e3f8ba83cb?q=80&w=2070&auto=format&fit=crop',
      category: 'First Course',
      winePairing: 'Chablis Premier Cru 2019'
    },
    {
      id: 'p3',
      title: 'Spicy Double Smash Burger',
      description: 'Double beef, jalapenos, secret sauce',
      price: 12.99,
      image: 'https://images.unsplash.com/photo-1568901346375-23c9450c58cd?q=80&w=1999&auto=format&fit=crop',
      category: 'Burgers',
      winePairing: null
    },
    {
      id: 'p4',
      title: 'Street Taco Combo',
      description: '3 Tacos, salsa verde, lime',
      price: 9.50,
      image: 'https://images.unsplash.com/photo-1565299585323-38d6b0865b47?q=80&w=1980&auto=format&fit=crop',
      category: 'Combos',
      winePairing: null
    }
  ]);

  const [orders, setOrders] = useState([]);
  const [customers, setCustomers] = useState([]);

  return (
    <SellerDataContext.Provider value={{ products, orders, customers, setOrders }}>
      {children}
    </SellerDataContext.Provider>
  );
};

export const useSellerData = () => useContext(SellerDataContext);
