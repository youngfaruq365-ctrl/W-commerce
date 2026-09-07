import React from 'react';
import { HeroFastFood } from '../components/HeroFastFood';
import { MenuGrid } from '../components/MenuGrid';
import { DeliveryTracker } from '../components/DeliveryTracker';
import { HeroCinematic } from '../components/HeroCinematic';
import { MenuElegant } from '../components/MenuElegant';
import { ReservationPro } from '../components/ReservationPro';
import { CateringQuoteBuilder } from '../components/CateringQuoteBuilder';
import { StreetFoodMobile } from '../components/StreetFoodMobile';

export const PageRegistry = {
  // Fast Food / Cloud Kitchen
  heroFastFood: HeroFastFood,
  menuGrid: MenuGrid,
  deliveryTracker: DeliveryTracker,
  
  // Fine Dining / Chef's Table
  heroCinematic: HeroCinematic,
  menuElegant: MenuElegant,
  reservationPro: ReservationPro,
  
  // Catering Studio
  cateringQuoteBuilder: CateringQuoteBuilder,
  
  // Street Food
  streetFoodMobile: StreetFoodMobile,
  
  // Defaults
  heroBistro: (props) => <div className="p-8 text-center text-red-500 font-bold border-4 border-dashed border-red-500">Unimplemented Module: heroBistro</div>,
  menuList: (props) => <div className="p-8 text-center text-red-500 font-bold border-4 border-dashed border-red-500">Unimplemented Module: menuList</div>,
  reservationWidget: (props) => <div className="p-8 text-center text-red-500 font-bold border-4 border-dashed border-red-500">Unimplemented Module: reservationWidget</div>,
  bundleBuilder: (props) => <div className="p-8 text-center text-red-500 font-bold border-4 border-dashed border-red-500">Unimplemented Module: bundleBuilder</div>,
  deliveryChecker: (props) => <div className="p-8 text-center text-red-500 font-bold border-4 border-dashed border-red-500">Unimplemented Module: deliveryChecker</div>,
  chefShowcase: (props) => <div className="p-8 text-center text-red-500 font-bold border-4 border-dashed border-red-500">Unimplemented Module: chefShowcase</div>,
  aiChatModule: (props) => <div className="p-8 text-center text-red-500 font-bold border-4 border-dashed border-red-500">Unimplemented Module: aiChatModule</div>,
};
