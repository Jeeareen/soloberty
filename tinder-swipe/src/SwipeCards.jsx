import React, { useState } from "react";
import { motion, useMotionValue, useTransform, AnimatePresence } from "framer-motion";

// Sample Data
const INITIAL_CARDS = [
  { id: 1, name: "Alice", age: 24, image: "https://images.unsplash.com/photo-1524504388940-b1c1722653e1?w=800&q=80", bio: "Coffee addict & hiker." },
  { id: 2, name: "Bob", age: 27, image: "https://images.unsplash.com/photo-1539571696357-5a69c17a67c6?w=800&q=80", bio: "Software engineer, avid reader." },
  { id: 3, name: "Charlie", age: 26, image: "https://images.unsplash.com/photo-1517841905240-472988babdf9?w=800&q=80", bio: "Let's grab a drink!" }
];

export default function SwipeCards() {
  const [cards, setCards] = useState(INITIAL_CARDS);

  // Removes the card from the array, triggering the AnimatePresence exit animation
  const removeCard = (id, direction) => {
    console.log(`Swiped ${direction} on card ${id}`);
    setCards((prev) => prev.filter((card) => card.id !== id));
  };

  return (
    <div className="flex items-center justify-center w-full h-screen bg-gray-100 overflow-hidden">
      <div className="relative w-80 h-[28rem]">
        <AnimatePresence>
          {cards.map((card, index) => {
            // The last item in the array renders on top visually
            const isTop = index === cards.length - 1;
            return (
              <Card
                key={card.id}
                card={card}
                isTop={isTop}
                removeCard={removeCard}
              />
            );
          })}
        </AnimatePresence>
        
        {/* Empty State */}
        {cards.length === 0 && (
          <div className="absolute inset-0 flex flex-col items-center justify-center text-gray-400">
            <span className="text-4xl mb-2">🎉</span>
            <p>No more profiles!</p>
          </div>
        )}
      </div>
    </div>
  );
}

const Card = ({ card, isTop, removeCard }) => {
  // Motion values to track the drag's X position
  const x = useMotionValue(0);
  
  // Transform the X position into rotation (e.g., drag right = tilt right)
  const rotateRaw = useTransform(x, [-200, 200], [-18, 18]);
  // Only rotate the top card
  const rotate = isTop ? rotateRaw : 0;
  
  // Transform X into opacity for the "LIKE" and "NOPE" stamps
  const likeOpacity = useTransform(x, [20, 100], [0, 1]);
  const nopeOpacity = useTransform(x, [-20, -100], [0, 1]);

  const handleDragEnd = (event, info) => {
    const swipeThreshold = 100; // Pixels you need to drag to trigger a swipe
    
    if (info.offset.x > swipeThreshold) {
      removeCard(card.id, "right");
    } else if (info.offset.x < -swipeThreshold) {
      removeCard(card.id, "left");
    }
  };

  return (
    <motion.div
      className="absolute inset-0 bg-white rounded-2xl shadow-xl overflow-hidden cursor-grab active:cursor-grabbing"
      // Connect motion values to styles
      style={{ x, rotate, originX: 0.5, originY: 1 }}
      // Only the top card should be draggable
      drag={isTop ? "x" : false}
      // Snap back to center if let go early
      dragConstraints={{ left: 0, right: 0 }}
      dragElastic={0.7}
      onDragEnd={handleDragEnd}
      // Stack effect animations
      initial={{ scale: 0.95, opacity: 0 }}
      animate={{ scale: isTop ? 1 : 0.95, opacity: 1 }}
      // Exit animation dynamically checks which way it was swiped
      exit={{ x: x.get() > 0 ? 300 : -300, opacity: 0, transition: { duration: 0.2 } }}
      transition={{ type: "spring", stiffness: 300, damping: 20 }}
    >
      {/* Profile Image */}
      <img 
        src={card.image} 
        alt={card.name} 
        className="w-full h-3/4 object-cover pointer-events-none" 
      />
      
      {/* Profile Info */}
      <div className="p-4 h-1/4 bg-white flex flex-col justify-center">
        <h2 className="text-2xl font-bold">{card.name}, {card.age}</h2>
        <p className="text-gray-500 truncate">{card.bio}</p>
      </div>

      {/* LIKE Stamp */}
      <motion.div 
        style={{ opacity: likeOpacity }}
        className="absolute top-10 left-10 border-4 border-green-500 text-green-500 text-4xl font-bold py-1 px-4 rounded-md uppercase transform -rotate-12 pointer-events-none"
      >
        Like
      </motion.div>

      {/* NOPE Stamp */}
      <motion.div 
        style={{ opacity: nopeOpacity }}
        className="absolute top-10 right-10 border-4 border-red-500 text-red-500 text-4xl font-bold py-1 px-4 rounded-md uppercase transform rotate-12 pointer-events-none"
      >
        Nope
      </motion.div>
    </motion.div>
  );
};