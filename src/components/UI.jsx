import { useState, useEffect } from 'react';
import { addToastListener } from '../hooks/useToast';
import logo from '../assets/yeondang-logo.png';
import mascot from '../assets/yeondang-mascot.png';

export function Button({ variant = 'coral', children, className = '', ...props }) {
  const variants = {
    coral: 'bg-coral text-white font-bold',
    navy: 'bg-navy text-white font-bold',
    line: 'bg-white text-ink border border-line font-bold',
  };
  return <button className={`w-full min-h-11 px-4 py-3.5 rounded-[16px] text-[15.5px] flex items-center justify-center gap-2 cursor-pointer shadow-sm disabled:cursor-not-allowed disabled:shadow-none ${variants[variant]} ${className}`} {...props}>{children}</button>;
}

export function Brand({ className = '', compact = false }) {
  return <a href="#/" aria-label="연당 홈으로" className={`flex items-center gap-2 font-black tracking-tight ${className}`}><img src={logo} alt="" className={compact ? 'h-7 w-7 object-contain' : 'h-10 w-10 object-contain'} /><span>연당</span></a>;
}

export function Mascot({ className = '', alt = '', decorative = true }) {
  return <img src={mascot} alt={decorative ? '' : alt} aria-hidden={decorative || undefined} className={`object-contain ${className}`} />;
}

export function Avatar({ emoji, label, color = 'p1' }) {
  const colors = { p1: 'bg-coral', p2: 'bg-[#6d9b3e]', p3: 'bg-[#d5ad2e]', p4: 'bg-[#5b6b8c]' };
  return <div className={`w-10 h-10 ${colors[color]} rounded-[12px] flex items-center justify-center text-white font-bold text-[12px]`}>{emoji || label?.[0]}</div>;
}

export function Toast() {
  const [message, setMessage] = useState('');
  const [visible, setVisible] = useState(false);
  useEffect(() => {
    const cleanup = addToastListener((msg) => {
      setMessage(msg);
      setVisible(true);
      setTimeout(() => setVisible(false), 1600);
    });
    return cleanup;
  }, []);
  return <div role="status" aria-live="polite" aria-atomic="true" style={{ bottom: "calc(6rem + var(--safe-area-bottom))" }} className={`fixed left-1/2 z-50 -translate-x-1/2 rounded-[14px] bg-navy px-[18px] py-3 text-[13px] font-bold text-white transition-all ${visible ? 'opacity-100' : 'pointer-events-none opacity-0'}`}>{message}</div>;
}
