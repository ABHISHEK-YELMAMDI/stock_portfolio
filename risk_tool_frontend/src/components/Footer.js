import React from 'react';
import { motion } from 'framer-motion';

const Footer = () => (
  <motion.footer
    initial={{ opacity: 0 }}
    animate={{ opacity: 1 }}
    transition={{ duration: 0.5 }}
    className="footer"
  >
    <p>&copy; 2025 RiskWise. All rights reserved.</p>
    <div className="footer-links">
      <a href="/about">About</a>
      <a href="/contact">Contact</a>
      <a href="https://github.com/your-repo" target="_blank" rel="noopener noreferrer">GitHub</a>
    </div>
  </motion.footer>
);

export default Footer;