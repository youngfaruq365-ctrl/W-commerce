import React from 'react';
import { motion } from 'framer-motion';
import { MapPin, Clock, Bike } from 'lucide-react';

export const DeliveryTracker = ({ store, motionVariants }) => {
  return (
    <div className="py-20 px-6 max-w-3xl mx-auto">
      <motion.div 
        variants={motionVariants.cardEntrance}
        className="bg-white p-8 rounded-[var(--store-radius)] shadow-2xl relative overflow-hidden"
      >
        <div className="absolute top-0 left-0 w-full h-2 bg-gray-100">
          <motion.div 
            initial={{ width: 0 }}
            animate={{ width: '40%' }}
            transition={{ duration: 2, ease: "easeOut" }}
            className="h-full"
            style={{ backgroundColor: 'var(--store-primary)' }}
          ></motion.div>
        </div>
        
        <h3 className="font-black text-2xl mb-8 flex items-center gap-3">
          <Bike />
          LIVE TRACKING
        </h3>
        
        <div className="flex flex-col gap-6 relative">
          <div className="absolute left-6 top-6 bottom-6 w-0.5 bg-gray-200 z-0"></div>
          
          <div className="flex items-center gap-6 relative z-10">
            <div className="w-12 h-12 rounded-full flex items-center justify-center font-bold text-white shadow-md" style={{ backgroundColor: 'var(--store-primary)' }}>1</div>
            <div>
              <div className="font-bold text-lg">Order Confirmed</div>
              <div className="text-gray-500 text-sm">12:45 PM</div>
            </div>
          </div>
          
          <div className="flex items-center gap-6 relative z-10">
            <div className="w-12 h-12 rounded-full flex items-center justify-center font-bold bg-white border-2 text-[var(--store-primary)]" style={{ borderColor: 'var(--store-primary)' }}>2</div>
            <div>
              <div className="font-bold text-lg">Preparing Food</div>
              <div className="text-gray-500 text-sm flex items-center gap-2"><Clock size={14}/> Kitchen is busy</div>
            </div>
          </div>
          
          <div className="flex items-center gap-6 relative z-10 opacity-40">
            <div className="w-12 h-12 rounded-full flex items-center justify-center font-bold bg-gray-100 text-gray-400">3</div>
            <div>
              <div className="font-bold text-lg">Out for Delivery</div>
              <div className="text-gray-500 text-sm">Waiting for rider</div>
            </div>
          </div>
        </div>
      </motion.div>
    </div>
  );
};
