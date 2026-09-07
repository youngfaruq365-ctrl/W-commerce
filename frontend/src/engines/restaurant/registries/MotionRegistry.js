export const getMotionVariants = (level) => {
  // Level 1: $6-$8 (Essential - Lightweight)
  if (level === 1) {
    return {
      page: { initial: { opacity: 0 }, animate: { opacity: 1 }, exit: { opacity: 0 }, transition: { duration: 0.2 } },
      cardEntrance: { initial: { opacity: 0, y: 10 }, animate: { opacity: 1, y: 0 }, transition: { duration: 0.2 } },
      hover: { scale: 1.01 },
      tap: { scale: 0.98 }
    };
  }
  
  // Level 2: $9-$12 (Plus)
  if (level === 2) {
    return {
      page: { initial: { opacity: 0, y: 10 }, animate: { opacity: 1, y: 0 }, exit: { opacity: 0, y: -10 }, transition: { duration: 0.3 } },
      cardEntrance: { initial: { opacity: 0, y: 20 }, animate: { opacity: 1, y: 0 }, transition: { duration: 0.3, staggerChildren: 0.1 } },
      hover: { scale: 1.02, y: -4 },
      tap: { scale: 0.96 }
    };
  }

  // Level 3: $15 (Pro)
  if (level === 3) {
    return {
      page: { initial: { opacity: 0, scale: 0.98 }, animate: { opacity: 1, scale: 1 }, exit: { opacity: 0, scale: 0.98 }, transition: { duration: 0.4, ease: "easeOut" } },
      cardEntrance: { initial: { opacity: 0, y: 30 }, animate: { opacity: 1, y: 0 }, transition: { duration: 0.4, staggerChildren: 0.15 } },
      hover: { scale: 1.03, y: -6, boxShadow: "0px 10px 30px rgba(0,0,0,0.1)" },
      tap: { scale: 0.95 }
    };
  }

  // Level 4: $19 (Studio)
  if (level === 4) {
    return {
      page: { initial: { opacity: 0, y: 40, filter: "blur(4px)" }, animate: { opacity: 1, y: 0, filter: "blur(0px)" }, exit: { opacity: 0, y: -40, filter: "blur(4px)" }, transition: { duration: 0.5, ease: "circOut" } },
      cardEntrance: { initial: { opacity: 0, y: 40, scale: 0.95 }, animate: { opacity: 1, y: 0, scale: 1 }, transition: { duration: 0.5, staggerChildren: 0.2 } },
      hover: { scale: 1.04, y: -8, boxShadow: "0px 20px 40px rgba(0,0,0,0.15)" },
      tap: { scale: 0.94 }
    };
  }

  // Level 5: $25 (Signature - Cinematic)
  return {
    page: { 
      initial: { opacity: 0, scale: 1.05, filter: "blur(10px)" }, 
      animate: { opacity: 1, scale: 1, filter: "blur(0px)" }, 
      exit: { opacity: 0, scale: 0.95, filter: "blur(10px)" }, 
      transition: { duration: 0.8, ease: [0.16, 1, 0.3, 1] } 
    },
    cardEntrance: { 
      initial: { opacity: 0, y: 60, scale: 0.9 }, 
      animate: { opacity: 1, y: 0, scale: 1 }, 
      transition: { duration: 0.8, staggerChildren: 0.2, ease: [0.16, 1, 0.3, 1] } 
    },
    hover: { scale: 1.05, y: -10, boxShadow: "0px 30px 60px rgba(0,0,0,0.2)" },
    tap: { scale: 0.92 }
  };
};
