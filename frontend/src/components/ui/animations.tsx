'use client';

import { motion } from 'framer-motion';
import { ReactNode } from 'react';

// Container for staggered children
export const StaggerContainer = ({ children, className = '' }: { children: ReactNode; className?: string }) => {
  return (
    <motion.div
      className={className}
      initial="hidden"
      animate="show"
      variants={{
        hidden: { opacity: 0 },
        show: {
          opacity: 1,
          transition: {
            staggerChildren: 0.05,
          },
        },
      }}
    >
      {children}
    </motion.div>
  );
};

// Item that fades and slides up within a stagger container
export const FadeUpItem = ({ children, className = '' }: { children: ReactNode; className?: string }) => {
  return (
    <motion.div
      className={className}
      variants={{
        hidden: { opacity: 0, y: 15 },
        show: { 
          opacity: 1, 
          y: 0,
          transition: { type: 'spring', stiffness: 300, damping: 24 }
        },
      }}
    >
      {children}
    </motion.div>
  );
};

// Full page transition wrapper
export const PageTransition = ({ children, className = '' }: { children: ReactNode; className?: string }) => {
  return (
    <motion.div
      className={`w-full h-full ${className}`}
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -10 }}
      transition={{ duration: 0.3, ease: [0.22, 1, 0.36, 1] }}
    >
      {children}
    </motion.div>
  );
};

// Interactive card that scales slightly on hover/tap
export const HoverCard = ({ children, className = '', onClick }: { children: ReactNode; className?: string, onClick?: () => void }) => {
  return (
    <motion.div
      className={className}
      whileHover={{ scale: 1.015, y: -2 }}
      whileTap={{ scale: 0.98 }}
      transition={{ type: 'spring', stiffness: 400, damping: 25 }}
      onClick={onClick}
      style={{ cursor: onClick ? 'pointer' : 'default' }}
    >
      {children}
    </motion.div>
  );
};
