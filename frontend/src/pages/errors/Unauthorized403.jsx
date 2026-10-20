import React from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { ShieldAlert, ArrowLeft, Home, LogIn } from 'lucide-react';

const Unauthorized403 = () => {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen flex items-center justify-center bg-[var(--bg-primary)] p-4 pt-20">
      <motion.div
        initial={{ opacity: 0, scale: 0.96 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.3 }}
        className="max-w-lg w-full bg-[var(--bg-secondary)] rounded-2xl shadow-2xl border-2 border-[var(--border-color)] overflow-hidden text-center p-8 sm:p-12"
      >
        <div className="w-20 h-20 mx-auto rounded-3xl bg-red-500/10 text-red-500 flex items-center justify-center text-3xl font-black mb-6 border border-red-500/20">
          <ShieldAlert size={40} />
        </div>

        <h1 className="text-2xl sm:text-3xl font-black text-[var(--text-main)] mb-2 tracking-tight">
          Access Restricted (403)
        </h1>

        <p className="text-sm text-[var(--text-muted)] mb-8">
          You don't have permission to view this page. You may need to sign in with an authorized account or upgrade your tier.
        </p>

        <div className="flex flex-col sm:flex-row gap-3 justify-center">
          <button
            onClick={() => navigate(-1)}
            className="flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl border border-[var(--border-color)] bg-[var(--bg-primary)] hover:bg-[var(--bg-primary)]/80 text-[var(--text-main)] font-bold text-sm transition-all"
          >
            <ArrowLeft size={16} /> Go Back
          </button>
          <button
            onClick={() => navigate('/login')}
            className="flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 active:scale-95 text-white font-bold text-sm shadow-md transition-all"
          >
            <LogIn size={16} /> Sign In
          </button>
          <button
            onClick={() => navigate('/')}
            className="flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl border border-[var(--border-color)] bg-[var(--bg-primary)] hover:bg-[var(--bg-primary)]/80 text-[var(--text-main)] font-bold text-sm transition-all"
          >
            <Home size={16} /> Home
          </button>
        </div>
      </motion.div>
    </div>
  );
};

export default Unauthorized403;
