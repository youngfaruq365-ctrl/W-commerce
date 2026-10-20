import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useSellerData } from '../context/SellerDataContext';
import { Users, Calendar, Utensils, CheckCircle } from 'lucide-react';

export const CateringQuoteBuilder = ({ store, motionVariants, onCheckout }) => {
  const { products } = useSellerData();
  const [step, setStep] = useState(1);
  const [guests, setGuests] = useState(50);

  const nextStep = () => setStep(prev => Math.min(prev + 1, 4));
  const prevStep = () => setStep(prev => Math.max(prev - 1, 1));

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col pt-24 pb-20">
      <div className="max-w-4xl mx-auto w-full px-6 flex-1 flex flex-col">
        <motion.div variants={motionVariants.cardEntrance} className="text-center mb-12">
          <h2 className="text-[var(--store-primary)] font-bold tracking-widest uppercase mb-2">Build Your Event</h2>
          <h1 className="text-4xl md:text-5xl font-serif text-gray-900">Instant Catering Quote</h1>
        </motion.div>

        {/* Stepper */}
        <div className="flex items-center justify-between mb-12 relative">
          <div className="absolute left-0 top-1/2 w-full h-1 bg-gray-200 -z-10 -translate-y-1/2"></div>
          <div className="absolute left-0 top-1/2 h-1 bg-[var(--store-primary)] -z-10 -translate-y-1/2 transition-all duration-500" style={{ width: `${((step - 1) / 3) * 100}%` }}></div>
          
          {[
            { icon: <Users />, label: "Guests" },
            { icon: <Utensils />, label: "Package" },
            { icon: <Calendar />, label: "Date" },
            { icon: <CheckCircle />, label: "Quote" }
          ].map((s, i) => (
            <div key={i} className="flex flex-col items-center gap-2">
              <div className={`w-12 h-12 rounded-full flex items-center justify-center font-bold text-white transition-colors duration-500 shadow-md ${step >= i + 1 ? 'bg-[var(--store-primary)]' : 'bg-gray-300'}`}>
                {s.icon}
              </div>
              <span className={`text-sm font-bold ${step >= i + 1 ? 'text-gray-900' : 'text-gray-400'}`}>{s.label}</span>
            </div>
          ))}
        </div>

        {/* Content */}
        <div className="bg-white rounded-[var(--store-radius)] shadow-xl p-8 md:p-12 flex-1 relative overflow-hidden">
          <AnimatePresence mode="wait">
            {step === 1 && (
              <motion.div key="s1" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} className="flex flex-col h-full justify-center text-center">
                <h3 className="text-2xl font-bold mb-8">How many guests are attending?</h3>
                <div className="flex items-center justify-center gap-8 mb-12">
                  <button onClick={() => setGuests(Math.max(10, guests - 10))} className="w-16 h-16 rounded-full border-2 text-2xl font-black text-gray-400 hover:text-[var(--store-primary)] hover:border-[var(--store-primary)] transition-colors">-</button>
                  <span className="text-7xl font-serif text-[var(--store-primary)] w-32">{guests}</span>
                  <button onClick={() => setGuests(guests + 10)} className="w-16 h-16 rounded-full border-2 text-2xl font-black text-gray-400 hover:text-[var(--store-primary)] hover:border-[var(--store-primary)] transition-colors">+</button>
                </div>
              </motion.div>
            )}

            {step === 2 && (
              <motion.div key="s2" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }}>
                <h3 className="text-2xl font-bold mb-8 text-center">Select your culinary package</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {products.slice(0,2).map(p => (
                    <div key={p.id} className="border-2 border-transparent hover:border-[var(--store-primary)] rounded-xl p-6 bg-gray-50 cursor-pointer transition-colors group">
                      <h4 className="text-xl font-bold mb-2 group-hover:text-[var(--store-primary)]">{p.title} Package</h4>
                      <p className="text-gray-500 mb-4 text-sm">{p.description}</p>
                      <div className="font-bold text-lg">₦{p.price.toFixed(2)} <span className="text-sm font-normal text-gray-500">/ guest</span></div>
                    </div>
                  ))}
                </div>
              </motion.div>
            )}

            {step === 3 && (
              <motion.div key="s3" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} className="flex flex-col h-full justify-center">
                <h3 className="text-2xl font-bold mb-8 text-center">When is the event?</h3>
                <input type="date" className="max-w-md w-full mx-auto block p-4 border-2 border-gray-200 rounded-xl text-lg font-bold outline-none focus:border-[var(--store-primary)]" />
              </motion.div>
            )}

            {step === 4 && (
              <motion.div key="s4" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} className="text-center flex flex-col h-full justify-center items-center">
                <div className="w-20 h-20 rounded-full bg-green-100 text-green-600 flex items-center justify-center mb-6">
                  <CheckCircle size={40} />
                </div>
                <h3 className="text-3xl font-serif mb-2">Estimated Quote: ${(guests * 45.00).toFixed(2)}</h3>
                <p className="text-gray-500 mb-8 max-w-sm">This is an initial estimate. Our catering manager will contact you to finalize the menu.</p>
                <button onClick={onCheckout} className="px-12 py-4 bg-[var(--store-primary)] text-white font-bold rounded-[var(--store-radius)] shadow-xl hover:opacity-90 transition-opacity">
                  Request Official Booking
                </button>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* Navigation */}
        <div className="flex justify-between mt-8">
          <button onClick={prevStep} disabled={step === 1} className={`px-8 py-3 font-bold rounded-[var(--store-radius)] ${step === 1 ? 'opacity-0 pointer-events-none' : 'text-gray-500 hover:bg-gray-200'}`}>Back</button>
          {step < 4 && (
            <button onClick={nextStep} className="px-8 py-3 bg-[var(--store-primary)] text-white font-bold rounded-[var(--store-radius)] shadow-lg">Continue</button>
          )}
        </div>
      </div>
    </div>
  );
};
