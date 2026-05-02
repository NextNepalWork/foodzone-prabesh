import React, { useState, useEffect, useMemo, useRef } from 'react';
import io from 'socket.io-client';
import audioManager from '../utils/audioNotifications';
import { fetchApi, getSocketUrl } from '../services/apiService';
import { getApiUrl } from '../config/api';
import { useRestaurantInfo } from '../hooks/useSettings';
import { useDateTimeFormatter } from '../hooks/useDateTimeFormatter';
import { formatCurrency } from '../utils/currency';
import settingsService from '../services/settingsService';

import PaymentMethodModal from '../components/PaymentMethodModal';

// Premium feature components
import OrdersManagement from '../components/premium/OrdersManagement';
import MenuManagement from '../components/premium/MenuManagement';
import InventoryManagement from '../components/premium/InventoryManagement';
import ReportsManagement from '../components/premium/ReportsManagement';
import StaffManagement from '../components/admin/StaffManagement';
import Daybook from '../components/Daybook';
import AdminSettings from '../components/AdminSettings';
import TableCallsManager from '../components/TableCallsManager';

/* ============================================================
   PremiumStyles — design tokens, glass classes, keyframes
   ============================================================ */
const PremiumStyles = () => (
  <style>{`
    :root {
      --shadow-xs: 0 1px 2px 0 rgba(15, 23, 42, 0.04);
      --shadow-sm: 0 1px 2px 0 rgba(15, 23, 42, 0.05), 0 1px 3px 0 rgba(15, 23, 42, 0.08);
      --shadow-md: 0 4px 6px -1px rgba(15, 23, 42, 0.06), 0 2px 4px -2px rgba(15, 23, 42, 0.04);
      --shadow-lg: 0 10px 20px -8px rgba(15, 23, 42, 0.12), 0 6px 12px -6px rgba(15, 23, 42, 0.08);
      --shadow-xl: 0 24px 48px -12px rgba(15, 23, 42, 0.18), 0 12px 24px -12px rgba(15, 23, 42, 0.10);
      --shadow-2xl: 0 48px 96px -24px rgba(15, 23, 42, 0.28), 0 20px 36px -12px rgba(15, 23, 42, 0.12);
      --shadow-card: 0 1px 0 0 rgba(255,255,255,0.8) inset, 0 1px 2px 0 rgba(15,23,42,0.05), 0 10px 24px -12px rgba(15,23,42,0.10);
      --shadow-card-hover: 0 1px 0 0 rgba(255,255,255,0.9) inset, 0 2px 4px 0 rgba(15,23,42,0.06), 0 24px 48px -16px rgba(15,23,42,0.18);
      --glow-indigo: 0 8px 28px -8px rgba(99,102,241,0.55), 0 4px 10px -3px rgba(99,102,241,0.35);
      --glow-emerald: 0 8px 28px -8px rgba(16,185,129,0.50), 0 4px 10px -3px rgba(16,185,129,0.32);
      --glow-rose: 0 8px 28px -8px rgba(244,63,94,0.50), 0 4px 10px -3px rgba(244,63,94,0.32);
      --glow-amber: 0 8px 28px -8px rgba(245,158,11,0.50), 0 4px 10px -3px rgba(245,158,11,0.32);
      --glow-violet: 0 8px 28px -8px rgba(139,92,246,0.50), 0 4px 10px -3px rgba(139,92,246,0.32);
      --ease-out: cubic-bezier(0.16, 1, 0.3, 1);
      --ease-in-out: cubic-bezier(0.65, 0, 0.35, 1);
    }

    /* Ambient mesh background */
    .fz-mesh {
      background-color: #f7f8fb;
      background-image:
        radial-gradient(at 8% 4%, rgba(99,102,241,0.10) 0px, transparent 48%),
        radial-gradient(at 92% 6%, rgba(236,72,153,0.06) 0px, transparent 48%),
        radial-gradient(at 96% 94%, rgba(139,92,246,0.09) 0px, transparent 48%),
        radial-gradient(at 4% 96%, rgba(14,165,233,0.07) 0px, transparent 48%);
    }
    .fz-noise::before {
      content: "";
      position: fixed;
      inset: 0;
      pointer-events: none;
      opacity: 0.25;
      mix-blend-mode: overlay;
      background-image: url("data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='140' height='140'><filter id='n'><feTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='2' stitchTiles='stitch'/></filter><rect width='100%' height='100%' filter='url(%23n)' opacity='0.5'/></svg>");
    }

    /* Glass surfaces */
    .glass-card {
      background: linear-gradient(135deg, rgba(255,255,255,0.88) 0%, rgba(255,255,255,0.72) 100%);
      backdrop-filter: blur(20px) saturate(180%);
      -webkit-backdrop-filter: blur(20px) saturate(180%);
      border: 1px solid rgba(255,255,255,0.7);
      box-shadow: var(--shadow-card);
      border-radius: 18px;
      transition: box-shadow 260ms var(--ease-out), transform 260ms var(--ease-out), border-color 260ms var(--ease-out);
    }
    .glass-card:hover {
      box-shadow: var(--shadow-card-hover);
      border-color: rgba(255,255,255,0.9);
    }
    .glass-card-flat {
      background: linear-gradient(135deg, rgba(255,255,255,0.92) 0%, rgba(255,255,255,0.80) 100%);
      backdrop-filter: blur(20px) saturate(180%);
      -webkit-backdrop-filter: blur(20px) saturate(180%);
      border: 1px solid rgba(226,232,240,0.8);
      box-shadow: var(--shadow-card);
      border-radius: 18px;
    }
    .glass-header {
      background: linear-gradient(180deg, rgba(255,255,255,0.85) 0%, rgba(255,255,255,0.65) 100%);
      backdrop-filter: blur(24px) saturate(180%);
      -webkit-backdrop-filter: blur(24px) saturate(180%);
      border-bottom: 1px solid rgba(226,232,240,0.6);
      box-shadow: 0 1px 0 0 rgba(255,255,255,0.9) inset, 0 4px 24px -8px rgba(15,23,42,0.08);
    }
    .glass-dark {
      background: linear-gradient(180deg, rgba(15,23,42,0.97) 0%, rgba(2,6,23,0.99) 100%);
      backdrop-filter: blur(24px) saturate(180%);
      -webkit-backdrop-filter: blur(24px) saturate(180%);
      border-right: 1px solid rgba(255,255,255,0.06);
      box-shadow: 8px 0 32px -12px rgba(0,0,0,0.35), 1px 0 0 0 rgba(255,255,255,0.04) inset;
    }
    .glass-overlay {
      background: rgba(15,23,42,0.55);
      backdrop-filter: blur(10px) saturate(140%);
      -webkit-backdrop-filter: blur(10px) saturate(140%);
    }
    .glass-modal {
      background: linear-gradient(135deg, rgba(255,255,255,0.96) 0%, rgba(248,250,252,0.92) 100%);
      backdrop-filter: blur(28px) saturate(180%);
      -webkit-backdrop-filter: blur(28px) saturate(180%);
      border: 1px solid rgba(255,255,255,0.8);
      box-shadow: var(--shadow-2xl), 0 1px 0 0 rgba(255,255,255,0.9) inset;
      border-radius: 20px;
    }

    /* Gradient band that appears on hover across top edge of cards */
    .gradient-band {
      position: relative;
      overflow: hidden;
    }
    .gradient-band::before {
      content: "";
      position: absolute;
      top: 0; left: 0; right: 0;
      height: 2px;
      background: linear-gradient(90deg, transparent, rgba(99,102,241,0.9), rgba(139,92,246,0.9), transparent);
      opacity: 0;
      transition: opacity 300ms var(--ease-out);
    }
    .gradient-band:hover::before { opacity: 1; }

    /* Glowing status dot */
    .dot-glow {
      position: relative;
      display: inline-flex;
      width: 8px;
      height: 8px;
      border-radius: 9999px;
    }
    .dot-glow::before {
      content: "";
      position: absolute;
      inset: 0;
      border-radius: inherit;
      background: currentColor;
      box-shadow: 0 0 0 2px rgba(255,255,255,0.15), 0 0 10px 1px currentColor;
      animation: fz-pulse 2.2s ease-in-out infinite;
    }
    .dot-glow::after {
      content: "";
      position: absolute;
      inset: -4px;
      border-radius: inherit;
      border: 2px solid currentColor;
      opacity: 0.25;
      animation: fz-pulse 2.2s ease-in-out infinite reverse;
    }

    /* Buttons */
    .btn-primary {
      background: linear-gradient(180deg, #4f46e5 0%, #4338ca 100%);
      color: white;
      box-shadow: 0 1px 0 0 rgba(255,255,255,0.2) inset, 0 4px 10px -2px rgba(79,70,229,0.35), 0 2px 4px 0 rgba(79,70,229,0.2);
      transition: all 200ms var(--ease-out);
    }
    .btn-primary:hover {
      background: linear-gradient(180deg, #6366f1 0%, #4f46e5 100%);
      box-shadow: 0 1px 0 0 rgba(255,255,255,0.25) inset, 0 8px 20px -2px rgba(79,70,229,0.55), 0 4px 10px 0 rgba(79,70,229,0.32);
      transform: translateY(-1px);
    }
    .btn-primary:active { transform: translateY(0); }
    .btn-primary:disabled { opacity: 0.6; cursor: not-allowed; transform: none; }

    .btn-dark {
      background: linear-gradient(180deg, #0f172a 0%, #020617 100%);
      color: white;
      box-shadow: 0 1px 0 0 rgba(255,255,255,0.12) inset, 0 4px 10px -2px rgba(2,6,23,0.4), 0 2px 4px 0 rgba(2,6,23,0.2);
      transition: all 200ms var(--ease-out);
    }
    .btn-dark:hover {
      box-shadow: 0 1px 0 0 rgba(255,255,255,0.18) inset, 0 8px 20px -2px rgba(2,6,23,0.5), 0 4px 10px 0 rgba(2,6,23,0.3);
      transform: translateY(-1px);
    }
    .btn-dark:active { transform: translateY(0); }

    .btn-rose {
      background: linear-gradient(180deg, #e11d48 0%, #be123c 100%);
      color: white;
      box-shadow: 0 1px 0 0 rgba(255,255,255,0.2) inset, 0 4px 10px -2px rgba(225,29,72,0.35);
      transition: all 200ms var(--ease-out);
    }
    .btn-rose:hover {
      box-shadow: 0 1px 0 0 rgba(255,255,255,0.25) inset, 0 8px 20px -2px rgba(225,29,72,0.55);
      transform: translateY(-1px);
    }

    .btn-ghost {
      background: rgba(255,255,255,0.7);
      color: #334155;
      border: 1px solid rgba(226,232,240,0.9);
      box-shadow: 0 1px 2px 0 rgba(15,23,42,0.04);
      transition: all 200ms var(--ease-out);
    }
    .btn-ghost:hover {
      background: rgba(255,255,255,0.95);
      border-color: rgba(203,213,225,1);
      box-shadow: 0 4px 10px -2px rgba(15,23,42,0.08);
      color: #0f172a;
    }

    /* Nav active state (dark sidebar) */
    .nav-item {
      position: relative;
      transition: all 200ms var(--ease-out);
    }
    .nav-item-active {
      background: linear-gradient(135deg, rgba(99,102,241,0.18) 0%, rgba(139,92,246,0.14) 100%);
      color: white;
      box-shadow: 0 1px 0 0 rgba(255,255,255,0.08) inset, 0 4px 12px -4px rgba(99,102,241,0.4);
    }
    .nav-item-active::before {
      content: "";
      position: absolute;
      left: -10px;
      top: 20%;
      bottom: 20%;
      width: 3px;
      border-radius: 2px;
      background: linear-gradient(180deg, #6366f1, #8b5cf6);
      box-shadow: 0 0 10px rgba(99,102,241,0.6);
    }

    /* KPI hero gradient cards */
    .hero-metric {
      position: relative;
      overflow: hidden;
      border-radius: 18px;
      color: white;
      padding: 20px;
      box-shadow: var(--shadow-lg);
      transition: transform 300ms var(--ease-out), box-shadow 300ms var(--ease-out);
    }
    .hero-metric::after {
      content: "";
      position: absolute;
      inset: 0;
      background-image:
        radial-gradient(circle at 100% 0%, rgba(255,255,255,0.18), transparent 55%),
        radial-gradient(circle at 0% 100%, rgba(255,255,255,0.10), transparent 55%);
      pointer-events: none;
    }
    .hero-metric-indigo { background: linear-gradient(135deg, #6366f1 0%, #7c3aed 100%); box-shadow: var(--glow-indigo), var(--shadow-lg); }
    .hero-metric-emerald { background: linear-gradient(135deg, #10b981 0%, #0d9488 100%); box-shadow: var(--glow-emerald), var(--shadow-lg); }
    .hero-metric-rose { background: linear-gradient(135deg, #f43f5e 0%, #db2777 100%); box-shadow: var(--glow-rose), var(--shadow-lg); }
    .hero-metric-amber { background: linear-gradient(135deg, #f59e0b 0%, #ea580c 100%); box-shadow: var(--glow-amber), var(--shadow-lg); }
    .hero-metric:hover { transform: translateY(-2px); }

    /* Table tile premium */
    .table-tile {
      position: relative;
      overflow: hidden;
      border-radius: 16px;
      border: 1px solid rgba(226,232,240,0.9);
      transition: all 260ms var(--ease-out);
      box-shadow: var(--shadow-xs);
    }
    .table-tile:hover {
      transform: translateY(-2px);
      box-shadow: var(--shadow-lg);
    }
    .table-tile-empty {
      background: linear-gradient(135deg, rgba(236,253,245,0.95) 0%, rgba(209,250,229,0.85) 100%);
      border-color: rgba(167,243,208,0.8);
    }
    .table-tile-empty:hover { border-color: rgba(52,211,153,0.8); box-shadow: 0 16px 32px -12px rgba(16,185,129,0.35); }
    .table-tile-occupied {
      background: linear-gradient(135deg, rgba(255,241,242,0.95) 0%, rgba(254,226,226,0.85) 100%);
      border-color: rgba(254,202,202,0.9);
    }
    .table-tile-occupied:hover { border-color: rgba(251,113,133,0.8); box-shadow: 0 16px 32px -12px rgba(244,63,94,0.35); }

    /* Keyframes */
    @keyframes fz-pulse {
      0%, 100% { opacity: 1; transform: scale(1); }
      50% { opacity: 0.65; transform: scale(1.15); }
    }
    @keyframes fz-fade-in {
      from { opacity: 0; transform: translateY(6px); }
      to { opacity: 1; transform: translateY(0); }
    }
    @keyframes fz-scale-in {
      from { opacity: 0; transform: scale(0.94) translateY(8px); }
      to { opacity: 1; transform: scale(1) translateY(0); }
    }
    @keyframes fz-slide-right {
      from { opacity: 0; transform: translateX(24px); }
      to { opacity: 1; transform: translateX(0); }
    }
    @keyframes fz-shimmer {
      0% { background-position: -400px 0; }
      100% { background-position: 400px 0; }
    }
    @keyframes fz-spin {
      to { transform: rotate(360deg); }
    }
    @keyframes fz-drift {
      0%, 100% { transform: translate(0, 0); }
      50% { transform: translate(10px, -8px); }
    }

    .fz-fade-in { animation: fz-fade-in 300ms var(--ease-out); }
    .fz-scale-in { animation: fz-scale-in 240ms var(--ease-out); }
    .fz-slide-right { animation: fz-slide-right 260ms var(--ease-out); }
    .shimmer {
      background: linear-gradient(90deg, #eef2f7 0px, #e2e8f0 40px, #eef2f7 80px);
      background-size: 400px 100%;
      animation: fz-shimmer 1.4s infinite linear;
      border-radius: 6px;
    }

    /* Ring gradient (avatars, small badges) */
    .ring-gradient {
      background: linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%);
      box-shadow: 0 6px 16px -4px rgba(99,102,241,0.45);
    }
    .ring-gradient-emerald { background: linear-gradient(135deg, #10b981 0%, #0d9488 100%); box-shadow: 0 6px 16px -4px rgba(16,185,129,0.45); }
    .ring-gradient-rose { background: linear-gradient(135deg, #f43f5e 0%, #be185d 100%); box-shadow: 0 6px 16px -4px rgba(244,63,94,0.45); }

    /* Scrollbar */
    .fz-scroll::-webkit-scrollbar { width: 10px; height: 10px; }
    .fz-scroll::-webkit-scrollbar-track { background: transparent; }
    .fz-scroll::-webkit-scrollbar-thumb { background: rgba(148,163,184,0.35); border-radius: 8px; border: 2px solid transparent; background-clip: padding-box; }
    .fz-scroll::-webkit-scrollbar-thumb:hover { background: rgba(100,116,139,0.55); background-clip: padding-box; }

    /* Tabular numerics */
    .tabular-nums { font-variant-numeric: tabular-nums; }
  `}</style>
);

/* ============================================================
   Icon library (inline SVGs)
   ============================================================ */
const Icon = {
  Dashboard: (p) => (
    <svg viewBox="0 0 24 24" fill="none" strokeWidth="1.8" stroke="currentColor" {...p}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M3 12l9-9 9 9M5 10v10a1 1 0 001 1h3m10-11v10a1 1 0 01-1 1h-3m-6 0h6m-6 0v-6h6v6" />
    </svg>
  ),
  Orders: (p) => (
    <svg viewBox="0 0 24 24" fill="none" strokeWidth="1.8" stroke="currentColor" {...p}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" />
    </svg>
  ),
  Menu: (p) => (
    <svg viewBox="0 0 24 24" fill="none" strokeWidth="1.8" stroke="currentColor" {...p}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M4 4h16v4H4zM4 12h16v4H4zM4 20h10" />
    </svg>
  ),
  Tables: (p) => (
    <svg viewBox="0 0 24 24" fill="none" strokeWidth="1.8" stroke="currentColor" {...p}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M3 10h18M5 10v8m14-8v8M7 6h10a2 2 0 012 2v2H5V8a2 2 0 012-2z" />
    </svg>
  ),
  Customers: (p) => (
    <svg viewBox="0 0 24 24" fill="none" strokeWidth="1.8" stroke="currentColor" {...p}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M17 20h5v-2a4 4 0 00-3-3.87M9 20H4v-2a4 4 0 013-3.87m6 5.87a4 4 0 10-6 0M13 7a3 3 0 11-6 0 3 3 0 016 0zm8 1a3 3 0 11-6 0 3 3 0 016 0z" />
    </svg>
  ),
  Daybook: (p) => (
    <svg viewBox="0 0 24 24" fill="none" strokeWidth="1.8" stroke="currentColor" {...p}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M9 12h6m-6 4h4M7 4h10a2 2 0 012 2v14a2 2 0 01-2 2H7a2 2 0 01-2-2V6a2 2 0 012-2z" />
    </svg>
  ),
  Analytics: (p) => (
    <svg viewBox="0 0 24 24" fill="none" strokeWidth="1.8" stroke="currentColor" {...p}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M3 3v18h18M7 15l4-4 4 4 5-6" />
    </svg>
  ),
  Staff: (p) => (
    <svg viewBox="0 0 24 24" fill="none" strokeWidth="1.8" stroke="currentColor" {...p}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M16 11a4 4 0 10-8 0 4 4 0 008 0zm-8 6a4 4 0 00-4 4h16a4 4 0 00-4-4m-8 0h8" />
    </svg>
  ),
  Settings: (p) => (
    <svg viewBox="0 0 24 24" fill="none" strokeWidth="1.8" stroke="currentColor" {...p}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M10.3 3.2a2 2 0 013.4 0l.5.8a2 2 0 001.9 1l.9-.1a2 2 0 012 3.3l-.5.7a2 2 0 000 2.2l.5.7a2 2 0 01-2 3.3l-.9-.1a2 2 0 00-1.9 1l-.5.8a2 2 0 01-3.4 0l-.5-.8a2 2 0 00-1.9-1l-.9.1a2 2 0 01-2-3.3l.5-.7a2 2 0 000-2.2l-.5-.7a2 2 0 012-3.3l.9.1a2 2 0 001.9-1l.5-.8z" />
      <circle cx="12" cy="12" r="3" />
    </svg>
  ),
  Logout: (p) => (
    <svg viewBox="0 0 24 24" fill="none" strokeWidth="1.8" stroke="currentColor" {...p}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
    </svg>
  ),
  Refresh: (p) => (
    <svg viewBox="0 0 24 24" fill="none" strokeWidth="1.8" stroke="currentColor" {...p}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M4 4v5h5M20 20v-5h-5M4 9a8 8 0 0114-3M20 15a8 8 0 01-14 3" />
    </svg>
  ),
  Bell: (p) => (
    <svg viewBox="0 0 24 24" fill="none" strokeWidth="1.8" stroke="currentColor" {...p}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M15 17h5l-1.4-1.4A2 2 0 0118 14V11a6 6 0 10-12 0v3a2 2 0 01-.6 1.6L4 17h5m6 0a3 3 0 11-6 0" />
    </svg>
  ),
  Search: (p) => (
    <svg viewBox="0 0 24 24" fill="none" strokeWidth="1.8" stroke="currentColor" {...p}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-4.3-4.3M17 10a7 7 0 11-14 0 7 7 0 0114 0z" />
    </svg>
  ),
  ArrowUp: (p) => (
    <svg viewBox="0 0 24 24" fill="none" strokeWidth="2" stroke="currentColor" {...p}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M7 17l10-10M7 7h10v10" />
    </svg>
  ),
  ArrowDown: (p) => (
    <svg viewBox="0 0 24 24" fill="none" strokeWidth="2" stroke="currentColor" {...p}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M17 7L7 17m10 0H7V7" />
    </svg>
  ),
  Eye: (p) => (
    <svg viewBox="0 0 24 24" fill="none" strokeWidth="1.8" stroke="currentColor" {...p}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M2 12s4-7 10-7 10 7 10 7-4 7-10 7S2 12 2 12z" />
      <circle cx="12" cy="12" r="3" />
    </svg>
  ),
  EyeOff: (p) => (
    <svg viewBox="0 0 24 24" fill="none" strokeWidth="1.8" stroke="currentColor" {...p}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M3 3l18 18M10.6 10.6a2 2 0 002.8 2.8M9.9 5.2A10 10 0 0112 5c6 0 10 7 10 7a17 17 0 01-3.3 4.2M6.1 6.1A17 17 0 002 12s4 7 10 7a10 10 0 004.9-1.3" />
    </svg>
  ),
  ChevronLeft: (p) => (
    <svg viewBox="0 0 24 24" fill="none" strokeWidth="2" stroke="currentColor" {...p}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M15 18l-6-6 6-6" />
    </svg>
  ),
  ChevronRight: (p) => (
    <svg viewBox="0 0 24 24" fill="none" strokeWidth="2" stroke="currentColor" {...p}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M9 18l6-6-6-6" />
    </svg>
  ),
  Plus: (p) => (
    <svg viewBox="0 0 24 24" fill="none" strokeWidth="2" stroke="currentColor" {...p}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M12 5v14m-7-7h14" />
    </svg>
  ),
  X: (p) => (
    <svg viewBox="0 0 24 24" fill="none" strokeWidth="2" stroke="currentColor" {...p}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M6 6l12 12M6 18L18 6" />
    </svg>
  ),
  Check: (p) => (
    <svg viewBox="0 0 24 24" fill="none" strokeWidth="2.2" stroke="currentColor" {...p}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
    </svg>
  ),
  Sparkles: (p) => (
    <svg viewBox="0 0 24 24" fill="none" strokeWidth="1.8" stroke="currentColor" {...p}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M5 3v4M3 5h4M6 17v4M4 19h4M13 3l2.5 6.5L22 12l-6.5 2.5L13 21l-2.5-6.5L4 12l6.5-2.5L13 3z" />
    </svg>
  ),
  Download: (p) => (
    <svg viewBox="0 0 24 24" fill="none" strokeWidth="1.8" stroke="currentColor" {...p}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M12 3v12m0 0l-4-4m4 4l4-4M4 17v2a2 2 0 002 2h12a2 2 0 002-2v-2" />
    </svg>
  ),
  Mail: (p) => (
    <svg viewBox="0 0 24 24" fill="none" strokeWidth="1.8" stroke="currentColor" {...p}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M3 8l9 6 9-6M5 5h14a2 2 0 012 2v10a2 2 0 01-2 2H5a2 2 0 01-2-2V7a2 2 0 012-2z" />
    </svg>
  ),
  Truck: (p) => (
    <svg viewBox="0 0 24 24" fill="none" strokeWidth="1.8" stroke="currentColor" {...p}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M3 7h11v10H3zM14 10h4l3 3v4h-7m-4 0a2 2 0 11-4 0 2 2 0 014 0zm10 0a2 2 0 11-4 0 2 2 0 014 0z" />
    </svg>
  ),
  Utensils: (p) => (
    <svg viewBox="0 0 24 24" fill="none" strokeWidth="1.8" stroke="currentColor" {...p}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M4 3v8a3 3 0 006 0V3M7 11v10M15 3c-1.5 0-3 1-3 4v4h3v10m0-10c1.5 0 3-1 3-4V3" />
    </svg>
  ),
  Wallet: (p) => (
    <svg viewBox="0 0 24 24" fill="none" strokeWidth="1.8" stroke="currentColor" {...p}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M3 7h18v12a1 1 0 01-1 1H4a1 1 0 01-1-1V7zM3 7l2-3h14l2 3M17 13h2" />
    </svg>
  ),
  Trend: (p) => (
    <svg viewBox="0 0 24 24" fill="none" strokeWidth="1.8" stroke="currentColor" {...p}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M3 17l6-6 4 4 8-8M21 7h-5M21 7v5" />
    </svg>
  ),
  Clock: (p) => (
    <svg viewBox="0 0 24 24" fill="none" strokeWidth="1.8" stroke="currentColor" {...p}>
      <circle cx="12" cy="12" r="9" />
      <path strokeLinecap="round" strokeLinejoin="round" d="M12 7v5l3 2" />
    </svg>
  ),
  Inventory: (p) => (
    <svg viewBox="0 0 24 24" fill="none" strokeWidth="1.8" stroke="currentColor" {...p}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M20 7L12 3 4 7m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
    </svg>
  ),
  Receipt: (p) => (
    <svg viewBox="0 0 24 24" fill="none" strokeWidth="1.8" stroke="currentColor" {...p}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M9 12h6m-6 4h6m2 5l-8-4-8 4V7a2 2 0 012-2h12a2 2 0 012 2v14z" />
    </svg>
  ),
  QrCode: (p) => (
    <svg viewBox="0 0 24 24" fill="none" strokeWidth="1.8" stroke="currentColor" {...p}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M3 7V5a2 2 0 012-2h2m0 0h2m-2 0v2M7 3h2m6 0h2m0 0h2a2 2 0 012 2v2m0 0v2m0-2h-2m2 0h-2m0 0V5m0 2v2m0 0h2m-2 0h-2m2 0v2a2 2 0 01-2 2h-2m0 0h-2m2 0v-2m0 2v-2m0 2H9m2 0v2m0-2h2m-2 0v-2m0 2v2a2 2 0 002 2h2m0 0v2m0-2h2" />
    </svg>
  ),
};

/* ============================================================
   Shared UI atoms
   ============================================================ */
const Spinner = ({ size = 'md' }) => {
  const s = size === 'sm' ? 'h-4 w-4 border-2' : size === 'lg' ? 'h-10 w-10 border-[3px]' : 'h-6 w-6 border-2';
  return <div className={`${s} rounded-full border-slate-200 border-t-indigo-600`} style={{ animation: 'fz-spin 0.8s linear infinite' }} />;
};

const GlowDot = ({ tone = 'emerald', size = 8 }) => {
  const color = {
    emerald: '#10b981',
    amber: '#f59e0b',
    sky: '#0ea5e9',
    rose: '#f43f5e',
    violet: '#8b5cf6',
    slate: '#94a3b8',
    green: '#10b981',
    yellow: '#f59e0b',
    blue: '#0ea5e9',
    red: '#f43f5e',
    indigo: '#6366f1',
  }[tone] || '#94a3b8';
  return <span className="dot-glow" style={{ color, width: size, height: size }} />;
};

const Badge = ({ children, tone = 'slate', size = 'sm' }) => {
  const map = {
    green: 'bg-emerald-50/80 text-emerald-700 ring-emerald-500/20',
    emerald: 'bg-emerald-50/80 text-emerald-700 ring-emerald-500/20',
    yellow: 'bg-amber-50/80 text-amber-700 ring-amber-500/20',
    amber: 'bg-amber-50/80 text-amber-700 ring-amber-500/20',
    blue: 'bg-sky-50/80 text-sky-700 ring-sky-500/20',
    red: 'bg-rose-50/80 text-rose-700 ring-rose-500/20',
    rose: 'bg-rose-50/80 text-rose-700 ring-rose-500/20',
    violet: 'bg-violet-50/80 text-violet-700 ring-violet-500/20',
    slate: 'bg-slate-100/80 text-slate-700 ring-slate-500/15',
    indigo: 'bg-indigo-50/80 text-indigo-700 ring-indigo-500/20',
  };
  const sizeClass = size === 'xs' ? 'px-1.5 py-0.5 text-[10px]' : 'px-2 py-0.5 text-xs';
  return (
    <span className={`inline-flex items-center gap-1 ${sizeClass} font-medium rounded-md ring-1 ring-inset backdrop-blur-sm ${map[tone] || map.slate}`}>
      {children}
    </span>
  );
};

// Dynamic currency formatting using settings
const formatNPR = (amount) => formatCurrency(amount);

const statusTone = (status) => {
  switch (status) {
    case 'completed': return 'green';
    case 'pending': return 'yellow';
    case 'preparing': return 'blue';
    case 'ready': return 'violet';
    case 'cancelled': return 'red';
    case 'occupied': return 'red';
    case 'empty': return 'green';
    case 'ordering': return 'blue';
    case 'dining': return 'yellow';
    case 'payment_pending': return 'violet';
    default: return 'slate';
  }
};

/* ============================================================
   Main page
   ============================================================ */
const AdminPremium = () => {
  const restaurantInfo = useRestaurantInfo();
  const [orders, setOrders] = useState([]);
  const [customers, setCustomers] = useState([]);
  const [dbSummary, setDbSummary] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [isAuthenticated, setIsAuthenticated] = useState(() => {
    const isAdmin = localStorage.getItem('adminAuthenticated') === 'true';
    const hasAdminToken = localStorage.getItem('adminToken');
    const hasStaffToken = localStorage.getItem('staffToken');
    if (hasStaffToken && !hasAdminToken) {
      localStorage.removeItem('adminAuthenticated');
      return false;
    }
    return isAdmin && hasAdminToken;
  });
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [activeTab, setActiveTab] = useState('dashboard');
  const [refreshTrigger, setRefreshTrigger] = useState(0);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [clearTableConfirm, setClearTableConfirm] = useState(null);
  const [deleteOrderConfirm, setDeleteOrderConfirm] = useState(null);
  const [socket, setSocket] = useState(null);
  const [socketConnected, setSocketConnected] = useState(false);
  const [toasts, setToasts] = useState([]);
  const [showPaymentMethodModal, setShowPaymentMethodModal] = useState(false);
  const [pendingOrderCompletion, setPendingOrderCompletion] = useState(null);

  const pushToast = (message, tone = 'success') => {
    const id = Date.now() + Math.random();
    setToasts((t) => [...t, { id, message, tone }]);
    setTimeout(() => setToasts((t) => t.filter((x) => x.id !== id)), 4200);
  };

  useEffect(() => {
    const staffToken = localStorage.getItem('staffToken');
    const adminToken = localStorage.getItem('adminToken');
    if (staffToken && !adminToken) {
      alert('Access Denied: You do not have permission to access the admin panel.');
      localStorage.removeItem('adminAuthenticated');
      setIsAuthenticated(false);
      window.location.href = '/reception';
      return;
    }

    // Track the socket at the useEffect scope so the cleanup actually closes it.
    // Returning a cleanup from a nested async function is a no-op — useEffect
    // only honors the value returned synchronously from its callback.
    let cancelled = false;
    let localSocket = null;

    if (isAuthenticated) {
      const verifyAndFetch = async () => {
        try {
          const token = localStorage.getItem('adminToken');
          if (!token) { setIsAuthenticated(false); return; }

          await Promise.allSettled([fetchOrders(), fetchCustomers(), fetchDatabaseSummary()]);
          if (cancelled) return;
          audioManager.requestPermissions();

          if (cancelled) return;
          const newSocket = io(getSocketUrl(), {
            transports: ['websocket', 'polling'],
            reconnection: true,
            reconnectionAttempts: Infinity,
            reconnectionDelay: 1000,
            reconnectionDelayMax: 5000,
            timeout: 20000,
          });
          localSocket = newSocket;
          console.log('✅ Socket created:', newSocket.id);
          setSocket(newSocket);
          newSocket.on('connect', () => {
            console.log('✅ Socket connected:', newSocket.id);
            setSocketConnected(true);
          });
          newSocket.on('disconnect', () => {
            console.log('❌ Socket disconnected');
            setSocketConnected(false);
          });

          newSocket.on('newOrder', (order) => {
            setOrders((prev) => [...prev, order]);
            if (order.order_type === 'delivery') audioManager.playDeliveryOrderSound();
            else audioManager.playTableOrderSound();
            pushToast(`New ${order.order_type || 'dine-in'} order received`, 'info');
          });
          newSocket.on('orderStatusUpdated', ({ orderId, status }) => {
            setOrders((prev) => prev.map((o) => (o.id === orderId ? { ...o, status } : o)));
          });
          newSocket.on('tableCleared', ({ tableId }) => {
            setOrders((prev) => prev.filter((o) => o.table_id !== tableId));
          });
        } catch (e) {
          console.error('Auth verification failed:', e);
          setIsAuthenticated(false);
        }
      };
      verifyAndFetch();
    }

    return () => {
      cancelled = true;
      if (localSocket) {
        try { localSocket.removeAllListeners(); } catch (_) {}
        try { localSocket.close(); } catch (_) {}
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isAuthenticated]);

  async function fetchOrders() {
    try {
      setLoading(true);
      setError(null);
      let retries = 3;
      let data = null;
      while (retries > 0) {
        try {
          data = await fetchApi.get('/api/orders');
          break;
        } catch (err) {
          const timeouts = settingsService.getTimeoutSettings();
          retries--;
          if (retries === 0) throw err;
          await new Promise((r) => setTimeout(r, timeouts.apiRetryDelayMs));
        }
      }
      let arr;
      if (Array.isArray(data)) arr = data;
      else if (data && Array.isArray(data.orders)) arr = data.orders;
      else arr = [];

      const priority = { pending: 1, preparing: 2, ready: 3, completed: 4, cancelled: 5 };
      const sorted = arr.sort((a, b) => {
        const d = (priority[a.status] || 99) - (priority[b.status] || 99);
        if (d !== 0) return d;
        return new Date(b.created_at) - new Date(a.created_at);
      });
      setOrders(sorted);
    } catch (err) {
      setError(`Failed to load orders: ${err.message}`);
      setOrders([]);
    } finally {
      setLoading(false);
    }
  }

  async function fetchCustomers() {
    try {
      const data = await fetchApi.get('/api/customers');
      setCustomers(Array.isArray(data) ? data : []);
    } catch (err) {
      setCustomers([]);
    }
  }

  async function fetchDatabaseSummary() {
    try {
      const data = await fetchApi.get('/api/database/summary');
      setDbSummary(data && typeof data === 'object' ? data : null);
    } catch (err) {
      setDbSummary(null);
    }
  }

  const handleLogin = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    const lastAttempt = localStorage.getItem('lastLoginAttempt');
    const now = Date.now();
    if (lastAttempt && now - parseInt(lastAttempt, 10) < 2000) {
      setError('Please wait before trying again.');
      setLoading(false);
      return;
    }
    localStorage.setItem('lastLoginAttempt', now.toString());

    let retries = 3;
    let delay = 1000;
    while (retries > 0) {
      try {
        const isAdmin = username === 'admin';
        const endpoint = isAdmin ? '/api/admin/auth' : '/api/staff/auth';
        const response = await fetch(`${getApiUrl()}${endpoint}`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ username, password }),
        });
        if (response.status === 429) {
          retries--;
          if (retries === 0) {
            setError('Server is busy. Please wait 30 seconds and try again.');
            setLoading(false);
            return;
          }
          // eslint-disable-next-line no-unused-vars
          const timeouts = settingsService.getTimeoutSettings();
          const wait = delay;
          await new Promise((r) => setTimeout(r, wait));
          delay *= 2;
          continue;
        }
        const data = await response.json();
        if (response.ok && data.success) {
          localStorage.setItem('adminToken', data.token);
          localStorage.setItem('adminAuthenticated', 'true');
          if (data.user && data.user.role && data.user.role !== 'admin') {
            const role = data.user.role.toLowerCase();
            if (role === 'chef' || role === 'waiter') { window.location.href = '/staff'; return; }
            if (role === 'cashier') { window.location.href = '/reception'; return; }
          }
          setIsAuthenticated(true);
          const timeouts = settingsService.getTimeoutSettings();
          setTimeout(() => { fetchOrders(); fetchCustomers(); fetchDatabaseSummary(); }, timeouts.apiRetryDelayMs / 10);
        } else {
          setError(data.message || `Login failed: ${response.status} ${response.statusText}`);
        }
        break;
      } catch (err) {
        retries--;
        if (retries === 0) {
          setError('Network error. Please check your connection.');
          setLoading(false);
          return;
        }
        // eslint-disable-next-line no-unused-vars
        const timeouts = settingsService.getTimeoutSettings();
        const wait = delay;
        await new Promise((r) => setTimeout(r, wait));
        delay *= 2;
      }
    }
    setLoading(false);
  };

  const handleLogout = () => {
    localStorage.removeItem('adminAuthenticated');
    localStorage.removeItem('adminToken');
    localStorage.removeItem('adminUser');
    setIsAuthenticated(false);
    setPassword('');
    setError(null);
  };

  const handleClearTable = async (tableId) => {
    setClearTableConfirm(tableId);
  };

  const confirmClearTable = async () => {
    const tableId = clearTableConfirm;
    if (!tableId) return;

    try {
      const token = localStorage.getItem('adminToken');
      if (!token) { alert('Session expired. Please login again.'); window.location.reload(); return; }
      
      const tableOrders = orders.filter((o) => o.table_id === tableId && ['pending', 'preparing', 'ready'].includes(o.status));
      if (tableOrders.length === 0) { alert(`No active orders for Table ${tableId}.`); return; }
      for (const o of tableOrders) {
        await fetchApi.put(`/api/orders/${o.id}/status`, { status: 'completed', payment_status: 'paid' });
      }
      fetchOrders();
      pushToast(`Table ${tableId} cleared · ${tableOrders.length} orders completed`);
    } catch (err) {
      if (String(err.message).includes('Authentication failed')) { alert('Session expired.'); window.location.reload(); }
      else alert(`Failed to clear table: ${err.message}`);
    } finally {
      setClearTableConfirm(null);
    }
  };

  const handleCompleteOrder = async (orderId) => {
    console.log('🔔 handleCompleteOrder called with orderId:', orderId);
    try {
      const token = localStorage.getItem('adminToken');
      if (!token) { alert('Session expired.'); window.location.reload(); return; }
      
      // Find the order to get its details
      const order = orders.find(o => o.id === orderId);
      console.log('📦 Found order:', order);
      if (!order) {
        alert('Order not found');
        return;
      }
      
      // Show payment method modal
      console.log('💳 Setting payment modal state...');
      setPendingOrderCompletion({ orderId, amount: order.total || order.total_amount || 0 });
      setShowPaymentMethodModal(true);
      console.log('✅ Payment modal should now be visible');
    } catch (err) {
      console.error('❌ Error in handleCompleteOrder:', err);
      if (String(err.message).includes('Authentication failed')) { alert('Session expired.'); window.location.reload(); }
      else alert(`Failed to complete order: ${err.message}`);
    }
  };

  // Order flow: preparing → ready → PAY → CLEAR.
  // Each step below is idempotent on the server:
  //   - /api/orders/:id/status writes daybook with ON CONFLICT DO NOTHING
  //   - /api/payments row is guarded by UPDATE-if-exists logic server-side (and a
  //     failure here still leaves the order paid because the status PUT wrote daybook)
  //   - /api/clear-table is safe to retry
  // The handler closes the modal only after the authoritative status+payment write;
  // a later table-clear failure surfaces as a toast so the cashier can retry from the UI.
  const handlePaymentMethodConfirm = async (paymentMethod) => {
    if (!pendingOrderCompletion) return;

    const { orderId, amount } = pendingOrderCompletion;

    try {
      const token = localStorage.getItem('adminToken');
      if (!token) { alert('Session expired.'); window.location.reload(); return; }

      const order = orders.find(o => o.id === orderId);
      const isDineIn = order && order.table_id && order.order_type === 'dine-in';

      // Step 1 (authoritative): mark order completed + paid with the chosen method.
      // Passing payment_method ensures the server's daybook INSERT fires in this call.
      await fetchApi.put(`/api/orders/${orderId}/status`, {
        status: 'completed',
        payment_status: 'paid',
        payment_method: paymentMethod,
      });

      // Step 2: record the payments-table row (best-effort; daybook already set in step 1).
      // The /api/payments endpoint will skip daybook insertion if order is already paid.
      try {
        await fetchApi.post('/api/payments', {
          order_id: orderId,
          amount: parseFloat(amount),
          payment_method: paymentMethod,
          payment_status: 'paid',
          transaction_id: `ADMIN-${Date.now()}`,
          notes: `Payment recorded by admin via ${paymentMethod}`,
          skip_daybook: true, // Flag to prevent duplicate daybook entry
        });
      } catch (payErr) {
        console.warn('⚠️ payments insert failed (order already marked paid):', payErr?.message);
      }

      // Close the modal once the order is paid
      setShowPaymentMethodModal(false);
      setPendingOrderCompletion(null);

      // Step 3 (dine-in only): clear the table directly without showing confirmation modal
      // The order is already marked as completed and paid above
      if (isDineIn) {
        pushToast(`Order completed, payment recorded, and Table ${order.table_id} cleared`);
      } else {
        pushToast('Order completed and payment recorded');
      }

      fetchOrders();
    } catch (err) {
      if (String(err.message).includes('Authentication failed')) {
        alert('Session expired.'); window.location.reload();
      } else {
        alert(`Failed to complete order: ${err.message}`);
      }
    }
  };

  const handleDeleteOrder = async (orderId, orderNumber) => {
    setDeleteOrderConfirm({ orderId, orderNumber });
  };

  const confirmDeleteOrder = async () => {
    const { orderId, orderNumber } = deleteOrderConfirm;
    if (!orderId) return;

    try {
      const result = await fetchApi.delete(`/api/order/${orderId}`);
      if (result && result.success) {
        fetchOrders();
        pushToast(`Order ${orderNumber} deleted`);
      } else throw new Error(result?.message || 'Unknown error');
    } catch (err) {
      if (String(err.message).includes('Authentication failed')) { alert('Session expired.'); window.location.reload(); }
      else alert(`Failed to delete order: ${err.message}`);
    } finally {
      setDeleteOrderConfirm(null);
    }
  };

  const handleRefresh = async () => {
    try {
      await Promise.all([fetchOrders(), fetchCustomers(), fetchDatabaseSummary()]);
      setRefreshTrigger(prev => prev + 1); // Trigger refresh for OrdersManagement
      pushToast('Data refreshed', 'success');
    } catch (e) {
      pushToast('Refresh failed', 'error');
    }
  };

  const renderContent = () => {
    switch (activeTab) {
      case 'dashboard':
        return <DashboardOverview orders={orders} customers={customers} dbSummary={dbSummary} loading={loading} onGoto={setActiveTab} />;
      case 'orders':
        return <OrdersManagement onClearTable={handleClearTable} onCompleteOrder={handleCompleteOrder} onDeleteOrder={handleDeleteOrder} refreshTrigger={refreshTrigger} />;
      case 'menu':
        return <MenuManagement refreshTrigger={refreshTrigger} />;
      case 'inventory':
        return <InventoryManagement pushToast={pushToast} />;
      case 'tables':
        return <TablesManagement orders={orders} setOrders={setOrders} socket={socket} pushToast={pushToast} refreshTrigger={refreshTrigger} restaurantInfo={restaurantInfo} />;
      case 'calls':
        return <TableCallsManager />;
      case 'customers':
        return <CustomersManagement customers={customers} orders={orders} />;
      case 'reports':
        return <ReportsManagement pushToast={pushToast} />;
      case 'daybook':
        return <Daybook />;
      case 'staff':
        return <StaffManagement />;
      case 'settings':
        return <AdminSettings />;
      default:
        return <DashboardOverview orders={orders} customers={customers} dbSummary={dbSummary} loading={loading} onGoto={setActiveTab} />;
    }
  };

  /* ------------- Login screen ------------- */
  if (!isAuthenticated) {
    return (
      <div className="min-h-screen relative overflow-hidden bg-[#05070e] flex items-center justify-center p-4">
        <PremiumStyles />
        {/* ambient mesh */}
        <div className="pointer-events-none absolute -top-40 -left-40 w-[640px] h-[640px] rounded-full bg-indigo-500/25 blur-[140px]" style={{ animation: 'fz-drift 14s ease-in-out infinite' }} />
        <div className="pointer-events-none absolute -bottom-40 -right-40 w-[640px] h-[640px] rounded-full bg-violet-500/25 blur-[140px]" style={{ animation: 'fz-drift 18s ease-in-out infinite reverse' }} />
        <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_50%_120%,rgba(99,102,241,0.18),transparent_60%)]" />
        <div className="pointer-events-none absolute inset-0 opacity-[0.03]" style={{ backgroundImage: `url("data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='200' height='200'><filter id='n'><feTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='2'/></filter><rect width='100%' height='100%' filter='url(%23n)'/></svg>")` }} />

        <div className="w-full max-w-md relative fz-scale-in">
          <div className="rounded-3xl p-8" style={{
            background: 'linear-gradient(135deg, rgba(255,255,255,0.06) 0%, rgba(255,255,255,0.02) 100%)',
            backdropFilter: 'blur(24px) saturate(180%)',
            WebkitBackdropFilter: 'blur(24px) saturate(180%)',
            border: '1px solid rgba(255,255,255,0.08)',
            boxShadow: '0 1px 0 0 rgba(255,255,255,0.05) inset, 0 48px 96px -20px rgba(0,0,0,0.55)'
          }}>
            <div className="flex items-center gap-3 mb-8">
              <div className="w-11 h-11 rounded-xl ring-gradient flex items-center justify-center">
                <Icon.Sparkles className="w-5 h-5 text-white" />
              </div>
              <div>
                <h1 className="text-lg font-semibold text-white tracking-tight">{restaurantInfo.name}</h1>
                <p className="text-xs text-slate-400">Restaurant operations console</p>
              </div>
            </div>

            <div className="mb-6">
              <h2 className="text-2xl font-semibold text-white tracking-tight">Sign in to your workspace</h2>
              <p className="text-sm text-slate-400 mt-1">Secure access to orders, tables and analytics.</p>
            </div>

            <form onSubmit={handleLogin} className="space-y-4">
              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1.5">Username</label>
                <input
                  type="text"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-lg bg-white/[0.04] ring-1 ring-white/10 text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-indigo-400/60 transition"
                  placeholder="admin"
                  required
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1.5">Password</label>
                <div className="relative">
                  <input
                    type={showPassword ? 'text' : 'password'}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="w-full px-3.5 py-2.5 rounded-lg bg-white/[0.04] ring-1 ring-white/10 text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-indigo-400/60 transition pr-10"
                    placeholder="••••••••"
                    required
                  />
                  <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white transition">
                    {showPassword ? <Icon.EyeOff className="w-4 h-4" /> : <Icon.Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              {error && (
                <div className="rounded-lg bg-rose-500/10 ring-1 ring-rose-500/30 px-3 py-2 text-sm text-rose-200">{error}</div>
              )}

              <button
                type="submit"
                disabled={loading}
                className="btn-primary w-full mt-2 inline-flex items-center justify-center gap-2 py-2.5 rounded-lg font-medium"
              >
                {loading ? <><Spinner size="sm" /> Signing in…</> : <>Continue <Icon.ChevronRight className="w-4 h-4" /></>}
              </button>
            </form>

            <div className="mt-6 pt-6 border-t border-white/5 flex items-center justify-between text-xs text-slate-500">
              <span>Protected by token auth</span>
              <span className="inline-flex items-center gap-1.5 text-emerald-400"><GlowDot tone="emerald" /> All systems operational</span>
            </div>
          </div>
          <p className="text-center text-xs text-slate-500 mt-6">© {new Date().getFullYear()} {restaurantInfo.name} · Admin Console</p>
        </div>
      </div>
    );
  }

  /* ------------- Main dashboard ------------- */
  return (
    <div className="min-h-screen fz-mesh fz-noise text-slate-900 antialiased flex relative">
      <PremiumStyles />

      <PremiumSidebar
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        collapsed={sidebarCollapsed}
        setCollapsed={setSidebarCollapsed}
        onLogout={handleLogout}
        orders={orders}
        restaurantInfo={restaurantInfo}
      />

      <div className={`flex-1 flex flex-col transition-[margin] duration-300 ease-out ${sidebarCollapsed ? 'ml-[64px]' : 'ml-[220px]'}`}>
        <PremiumHeader
          activeTab={activeTab}
          orders={orders}
          customers={customers}
          onRefresh={handleRefresh}
          socketConnected={socketConnected}
          loading={loading}
          socket={socket}
          restaurantInfo={restaurantInfo}
        />

        <main className="flex-1 overflow-auto fz-scroll">
          <div className="max-w-[1440px] mx-auto px-5 py-4">
            <div key={activeTab} className="fz-fade-in">
              {renderContent()}
            </div>
          </div>
        </main>
      </div>

      {/* Toasts */}
      <div className="fixed top-5 right-5 z-50 space-y-2">
        {toasts.map((t) => (
          <div
            key={t.id}
            className={`min-w-[280px] px-4 py-3 rounded-xl flex items-center gap-2.5 fz-slide-right glass-card-flat ${
              t.tone === 'error' ? 'text-rose-800' :
              t.tone === 'info' ? 'text-sky-800' :
              'text-emerald-800'
            }`}
            style={{
              boxShadow: t.tone === 'error' ? 'var(--glow-rose), var(--shadow-lg)' :
                         t.tone === 'info' ? '0 8px 28px -8px rgba(14,165,233,0.35), var(--shadow-lg)' :
                         'var(--glow-emerald), var(--shadow-lg)'
            }}
          >
            <span className={`w-7 h-7 rounded-full flex items-center justify-center text-white ${
              t.tone === 'error' ? 'bg-gradient-to-br from-rose-500 to-rose-600' :
              t.tone === 'info' ? 'bg-gradient-to-br from-sky-500 to-sky-600' :
              'bg-gradient-to-br from-emerald-500 to-emerald-600'
            }`}>
              {t.tone === 'error' ? <Icon.X className="w-3.5 h-3.5" /> : <Icon.Check className="w-3.5 h-3.5" />}
            </span>
            <span className="text-sm font-medium">{t.message}</span>
          </div>
        ))}
      </div>

      {/* Clear Table Confirmation Modal */}
      {clearTableConfirm && (
        <Modal
          title={`Clear Table ${clearTableConfirm}`}
          onClose={() => setClearTableConfirm(null)}
          narrow
        >
          <p className="text-sm text-gray-600 mb-6">
            This will mark all active orders for Table {clearTableConfirm} as completed and make the table available for new customers.
          </p>
          <div className="flex space-x-3">
            <button
              onClick={() => setClearTableConfirm(null)}
              className="flex-1 bg-gray-200 text-gray-700 py-2 px-4 rounded-lg font-medium hover:bg-gray-300 transition-colors"
            >
              Cancel
            </button>
            <button
              onClick={confirmClearTable}
              className="flex-1 bg-red-600 text-white py-2 px-4 rounded-lg font-medium hover:bg-red-700 transition-colors"
            >
              Clear Table
            </button>
          </div>
        </Modal>
      )}

      {/* Delete Order Confirmation Modal */}
      {deleteOrderConfirm && (
        <Modal
          title={`Delete Order ${deleteOrderConfirm.orderNumber}`}
          onClose={() => setDeleteOrderConfirm(null)}
          narrow
        >
          <p className="text-sm text-gray-600 mb-6">
            Are you sure you want to delete order {deleteOrderConfirm.orderNumber}? This action cannot be undone.
          </p>
          <div className="flex space-x-3">
            <button
              onClick={() => setDeleteOrderConfirm(null)}
              className="flex-1 bg-gray-200 text-gray-700 py-2 px-4 rounded-lg font-medium hover:bg-gray-300 transition-colors"
            >
              Cancel
            </button>
            <button
              onClick={confirmDeleteOrder}
              className="flex-1 bg-red-600 text-white py-2 px-4 rounded-lg font-medium hover:bg-red-700 transition-colors"
            >
              Delete Order
            </button>
          </div>
        </Modal>
      )}

      {/* Payment Method Modal */}
      {showPaymentMethodModal && pendingOrderCompletion && (
        <PaymentMethodModal
          isOpen={showPaymentMethodModal}
          onClose={() => {
            setShowPaymentMethodModal(false);
            setPendingOrderCompletion(null);
          }}
          onConfirm={handlePaymentMethodConfirm}
          orderAmount={pendingOrderCompletion.amount}
          orderId={pendingOrderCompletion.orderId}
        />
      )}
    </div>
  );
};

/* ============================================================
   Sidebar — dark glass with ambient glows
   ============================================================ */
const PremiumSidebar = ({ activeTab, setActiveTab, collapsed, setCollapsed, onLogout, orders, restaurantInfo }) => {
  const activeOrders = orders?.filter((o) => o.status !== 'completed' && o.status !== 'cancelled').length || 0;
  const occupiedTables = (orders || [])
    .filter((o) => o.order_type === 'dine-in' && o.table_id && ['pending', 'preparing', 'ready'].includes(o.status))
    .reduce((acc, o) => (acc.includes(o.table_id) ? acc : [...acc, o.table_id]), []).length;

  const items = [
    { id: 'dashboard', label: 'Dashboard', Icon: Icon.Dashboard },
    { id: 'orders', label: 'Orders', Icon: Icon.Orders, badge: activeOrders || null },
    { id: 'menu', label: 'Menu', Icon: Icon.Menu },
    { id: 'inventory', label: 'Inventory', Icon: Icon.Inventory },
    { id: 'tables', label: 'Tables', Icon: Icon.Tables, badge: occupiedTables || null },
    { id: 'customers', label: 'Customers', Icon: Icon.Customers },
    { id: 'reports', label: 'Reports', Icon: Icon.Analytics },
    { id: 'daybook', label: 'Daybook', Icon: Icon.Daybook },
    { id: 'staff', label: 'Staff', Icon: Icon.Staff },
    { id: 'settings', label: 'Settings', Icon: Icon.Settings },
  ];

  return (
    <aside className={`glass-dark fixed left-0 top-0 h-full transition-[width] duration-300 z-30 ${collapsed ? 'w-[64px]' : 'w-[220px]'}`}>
      {/* ambient glow accents */}
      <div className="pointer-events-none absolute -top-20 left-1/2 -translate-x-1/2 w-56 h-56 rounded-full bg-indigo-500/20 blur-[60px]" />
      <div className="pointer-events-none absolute bottom-0 -right-10 w-48 h-48 rounded-full bg-pink-500/10 blur-[60px]" />

      <div className="flex flex-col h-full relative">
        {/* Brand */}
        <div className="h-[68px] px-4 flex items-center border-b border-white/5">
          <div className={`flex items-center gap-2.5 ${collapsed ? 'justify-center w-full' : ''}`}>
            <div className="w-10 h-10 rounded-xl ring-gradient flex items-center justify-center relative">
              <Icon.Sparkles className="w-4 h-4 text-white" />
              <span className="absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 rounded-full bg-emerald-400 ring-2 ring-slate-950" />
            </div>
            {!collapsed && (
              <div className="flex-1 min-w-0">
                <div className="text-sm font-semibold text-white tracking-tight leading-none">{restaurantInfo.name}</div>
                <div className="text-[11px] text-slate-400 mt-1">Admin Console · v2.0</div>
              </div>
            )}
          </div>
        </div>

        {/* Nav */}
        <nav className="flex-1 overflow-y-auto px-3 py-4 fz-scroll">
          {!collapsed && <div className="px-2.5 pb-2 text-[10px] font-semibold uppercase tracking-[0.12em] text-slate-500">Workspace</div>}
          <div className="space-y-1">
            {items.map(({ id, label, Icon: IconC, badge }) => {
              const active = activeTab === id;
              return (
                <button
                  key={id}
                  onClick={() => setActiveTab(id)}
                  className={`nav-item group w-full flex items-center gap-3 px-2.5 h-10 rounded-xl text-sm ${
                    active
                      ? 'nav-item-active'
                      : 'text-slate-300 hover:bg-white/5 hover:text-white'
                  } ${collapsed ? 'justify-center' : ''}`}
                  title={collapsed ? label : undefined}
                >
                  <IconC className={`w-[18px] h-[18px] flex-shrink-0 transition-colors ${active ? 'text-white' : 'text-slate-400 group-hover:text-white'}`} />
                  {!collapsed && (
                    <>
                      <span className="flex-1 text-left font-medium">{label}</span>
                      {badge && (
                        <span className={`min-w-[22px] h-5 px-1.5 text-[11px] font-semibold rounded-md flex items-center justify-center ${
                          active
                            ? 'bg-white/20 text-white ring-1 ring-white/15'
                            : 'bg-indigo-500/20 text-indigo-300 ring-1 ring-indigo-400/20'
                        }`}>
                          {badge}
                        </span>
                      )}
                    </>
                  )}
                </button>
              );
            })}
          </div>
        </nav>

        {/* Footer */}
        <div className="border-t border-white/5 p-3 space-y-1.5">
          {!collapsed && (
            <div className="px-2.5 py-2.5 rounded-xl bg-white/[0.04] ring-1 ring-white/10 flex items-center gap-2.5">
              <div className="relative">
                <div className="w-9 h-9 rounded-full ring-gradient flex items-center justify-center text-white text-xs font-semibold">AD</div>
                <span className="absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 rounded-full bg-emerald-400 ring-2 ring-slate-950" />
              </div>
              <div className="min-w-0 flex-1">
                <div className="text-xs font-semibold text-white truncate">Admin</div>
                <div className="text-[11px] text-slate-400 truncate">admin@foodzone.app</div>
              </div>
            </div>
          )}
          <button
            onClick={onLogout}
            className={`nav-item w-full flex items-center gap-3 px-2.5 h-10 rounded-xl text-sm text-slate-300 hover:bg-rose-500/10 hover:text-rose-300 ${collapsed ? 'justify-center' : ''}`}
            title={collapsed ? 'Sign out' : undefined}
          >
            <Icon.Logout className="w-[18px] h-[18px]" />
            {!collapsed && <span className="font-medium">Sign out</span>}
          </button>
          <button
            onClick={() => setCollapsed(!collapsed)}
            className={`nav-item w-full flex items-center gap-3 px-2.5 h-9 rounded-xl text-sm text-slate-500 hover:bg-white/5 hover:text-slate-300 ${collapsed ? 'justify-center' : ''}`}
            title={collapsed ? 'Expand' : 'Collapse'}
          >
            {collapsed ? <Icon.ChevronRight className="w-[18px] h-[18px]" /> : <><Icon.ChevronLeft className="w-[18px] h-[18px]" /><span className="font-medium">Collapse</span></>}
          </button>
        </div>
      </div>
    </aside>
  );
};

/* ============================================================
   Header — frosted glass
   ============================================================ */
const PremiumHeader = ({ activeTab, orders, customers, onRefresh, socketConnected, loading, socket, restaurantInfo }) => {
  const { formatTimeWithWeekday, formatTime } = useDateTimeFormatter();
  const [now, setNow] = useState(new Date());
  const [incomingCalls, setIncomingCalls] = useState([]); // queue of pending incoming calls
  const [showIncomingList, setShowIncomingList] = useState(false);
  const [activeCall, setActiveCall] = useState(null); // {callId, tableId, reason}
  const [callDuration, setCallDuration] = useState(0);
  const [callLog, setCallLog] = useState([]);
  const [showCallLog, setShowCallLog] = useState(false);
  const callTimerRef = useRef(null);
  const ringtoneRef = useRef(null);
  const audioContextRef = useRef(null);
  const audioUnlockedRef = useRef(false);
  const peerConnectionRef = useRef(null);
  const remoteAudioRef = useRef(null);
  const localStreamRef = useRef(null);
  const activeCallIdRef = useRef(null);
  const pendingIceCandidatesRef = useRef([]);
  const incomingCallsRef = useRef([]);
  const activeCallRef = useRef(null);
  // keep refs in sync for use inside stable handlers
  useEffect(() => { incomingCallsRef.current = incomingCalls; }, [incomingCalls]);
  useEffect(() => { activeCallRef.current = activeCall; }, [activeCall]);

  useEffect(() => {
    const timeouts = settingsService.getTimeoutSettings();
    const t = setInterval(() => setNow(new Date()), timeouts.timeDisplayIntervalMs);
    return () => clearInterval(t);
  }, []);

  // Close call log when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (showCallLog && !event.target.closest('.call-log-container')) {
        setShowCallLog(false);
      }
      if (showIncomingList && !event.target.closest('.incoming-list-container')) {
        setShowIncomingList(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [showCallLog, showIncomingList]);

  // Unlock audio on any user interaction (fixes: ringtone not ringing initially)
  useEffect(() => {
    const unlock = () => {
      try {
        if (!audioContextRef.current) {
          audioContextRef.current = new (window.AudioContext || window.webkitAudioContext)();
        }
        const ctx = audioContextRef.current;
        if (ctx.state === 'suspended') {
          ctx.resume().then(() => {
            audioUnlockedRef.current = true;
            console.log('🔓 Audio context unlocked');
            // If a call is already ringing, start ringtone now
            if (incomingCallsRef.current.length > 0 && !activeCallRef.current) {
              playRingtone();
            }
          }).catch(e => console.log('resume failed:', e));
        } else {
          audioUnlockedRef.current = true;
        }
      } catch (e) {
        console.error('Audio unlock error:', e);
      }
    };

    const events = ['click', 'keydown', 'touchstart', 'mousedown'];
    events.forEach(evt => document.addEventListener(evt, unlock));
    // Try eagerly once
    unlock();

    return () => {
      events.forEach(evt => document.removeEventListener(evt, unlock));
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Merge server-authoritative history with any local optimistic entries
  const mergeHistory = (serverHistory) => {
    const formatted = serverHistory.map(h => ({
      id: `${h.callId}-${h.endedAt || h.initiatedAt}`,
      callId: h.callId,
      tableId: h.tableId,
      status: h.status,
      duration: h.duration || 0,
      reason: h.reason || 'Order',
      timestamp: new Date(h.endedAt || h.initiatedAt),
      formattedTime: formatTime(h.endedAt || h.initiatedAt)
    }));
    setCallLog(formatted);
  };

  // Play ringtone - reliable looping pattern (two quick beeps every 2s)
  const playRingtone = () => {
    try {
      if (!audioContextRef.current) {
        audioContextRef.current = new (window.AudioContext || window.webkitAudioContext)();
      }
      const ctx = audioContextRef.current;

      if (ctx.state === 'suspended') {
        // Try to resume; if browser blocks, we'll retry when user interacts (see unlock effect)
        ctx.resume().then(() => {
          if (incomingCallsRef.current.length > 0 && !activeCallRef.current) {
            playRingtone();
          }
        }).catch(() => {});
        return;
      }

      const now = ctx.currentTime;
      const scheduleBeep = (offset, freq, dur) => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = 'sine';
        osc.frequency.value = freq;
        gain.gain.setValueAtTime(0, now + offset);
        gain.gain.linearRampToValueAtTime(0.5, now + offset + 0.02);
        gain.gain.setValueAtTime(0.5, now + offset + dur - 0.05);
        gain.gain.linearRampToValueAtTime(0, now + offset + dur);
        osc.connect(gain).connect(ctx.destination);
        osc.start(now + offset);
        osc.stop(now + offset + dur + 0.05);
      };

      // Classic "ring-ring" pattern
      scheduleBeep(0, 800, 0.35);
      scheduleBeep(0.5, 800, 0.35);

      // Loop while any call is still pending and none is active
      ringtoneRef.current = setTimeout(() => {
        if (incomingCallsRef.current.length > 0 && !activeCallRef.current) {
          playRingtone();
        }
      }, 2000);
    } catch (error) {
      console.error('❌ PremiumHeader: Error playing ringtone:', error);
    }
  };

  const stopRingtone = () => {
    if (ringtoneRef.current) {
      clearTimeout(ringtoneRef.current);
      ringtoneRef.current = null;
    }
  };

  // Setup voice call listeners
  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => {
    if (!socket) {
      console.log('❌ No socket available in PremiumHeader');
      return;
    }

    console.log('🔌 Setting up voice call listeners in header');

    const handleIncomingCall = (data) => {
      console.log('📞 PremiumHeader: Incoming voice call from Table', data.tableId, 'callId=', data.callId);
      setIncomingCalls(prev => {
        if (prev.some(c => c.callId === data.callId)) return prev; // dedup
        return [...prev, data];
      });
    };

    const handlePendingCallsSync = (pendingList) => {
      console.log('📞 PremiumHeader: Syncing pending calls:', pendingList.length);
      setIncomingCalls(pendingList);
    };

    const handleIncomingCallCancelled = ({ callId }) => {
      console.log('🚫 PremiumHeader: Incoming call cancelled callId=', callId);
      setIncomingCalls(prev => prev.filter(c => c.callId !== callId));
    };

    const handleCallHistory = (history) => {
      mergeHistory(history);
    };

    const handleCallEnded = (data) => {
      const endedCallId = data && data.callId;
      console.log('📞 PremiumHeader: Call ended, callId=', endedCallId);
      stopRingtone();

      // If the active call is the one that ended
      if (!endedCallId || activeCallIdRef.current === endedCallId) {
        if (peerConnectionRef.current) {
          peerConnectionRef.current.close();
          peerConnectionRef.current = null;
        }
        if (localStreamRef.current) {
          localStreamRef.current.getTracks().forEach(t => t.stop());
          localStreamRef.current = null;
        }
        if (remoteAudioRef.current) {
          remoteAudioRef.current.srcObject = null;
        }
        activeCallIdRef.current = null;
        pendingIceCandidatesRef.current = [];
        setActiveCall(null);
        setCallDuration(0);
      }

      // Remove from incoming list in case it was still ringing
      if (endedCallId) {
        setIncomingCalls(prev => prev.filter(c => c.callId !== endedCallId));
      }
    };

    // Handle offer from caller - always listening, filter via ref
    const handleOffer = async (data) => {
      console.log('📤 PremiumHeader: Incoming offer event. data.callId=', data.callId, 'activeCallId=', activeCallIdRef.current);
      if (!activeCallIdRef.current) {
        console.warn('⚠️ PremiumHeader: Offer received but no active call, ignoring');
        return;
      }
      if (data.callId !== activeCallIdRef.current) {
        console.warn('⚠️ PremiumHeader: Offer callId mismatch, ignoring');
        return;
      }
      const pc = peerConnectionRef.current;
      if (!pc) {
        console.error('❌ PremiumHeader: No peer connection ready for offer');
        return;
      }
      try {
        console.log('📤 PremiumHeader: Setting remote description from offer');
        await pc.setRemoteDescription(new RTCSessionDescription(data.offer));

        // Flush any queued ICE candidates
        for (const cand of pendingIceCandidatesRef.current) {
          try { await pc.addIceCandidate(new RTCIceCandidate(cand)); } catch (e) { console.error('flush ice:', e); }
        }
        pendingIceCandidatesRef.current = [];

        const answer = await pc.createAnswer();
        await pc.setLocalDescription(answer);
        console.log('📥 PremiumHeader: Sending answer, callId=', activeCallIdRef.current);
        socket.emit('answer', {
          answer,
          callId: activeCallIdRef.current
        });
      } catch (err) {
        console.error('❌ PremiumHeader: Error handling offer:', err);
      }
    };

    const handleIceCandidate = async (data) => {
      if (!activeCallIdRef.current || data.callId !== activeCallIdRef.current) return;
      if (!data.candidate) return;
      const pc = peerConnectionRef.current;
      if (!pc || !pc.remoteDescription) {
        console.log('🧊 PremiumHeader: Queueing ICE candidate (remote desc not set)');
        pendingIceCandidatesRef.current.push(data.candidate);
        return;
      }
      console.log('🧊 PremiumHeader: Adding remote ICE candidate');
      try {
        await pc.addIceCandidate(new RTCIceCandidate(data.candidate));
      } catch (err) {
        console.error('❌ PremiumHeader: Error adding ICE candidate:', err);
      }
    };

    const handleCallUnavailable = ({ callId, reason }) => {
      console.warn('⚠️ Admin: call unavailable', callId, reason);
      setIncomingCalls(prev => prev.filter(c => c.callId !== callId));
      if (activeCallIdRef.current === callId) {
        activeCallIdRef.current = null;
        setActiveCall(null);
      }
    };

    socket.on('incomingVoiceCall', handleIncomingCall);
    socket.on('incomingVoiceCallCancelled', handleIncomingCallCancelled);
    socket.on('pendingCallsSync', handlePendingCallsSync);
    socket.on('callHistoryUpdate', handleCallHistory);
    socket.on('callEnded', handleCallEnded);
    socket.on('callUnavailable', handleCallUnavailable);
    socket.on('offer', handleOffer);
    socket.on('iceCandidate', handleIceCandidate);

    // Ask for current history on connect
    socket.emit('requestCallHistory');

    return () => {
      console.log('🧹 Cleaning up voice call listeners');
      stopRingtone();
      socket.off('incomingVoiceCall', handleIncomingCall);
      socket.off('incomingVoiceCallCancelled', handleIncomingCallCancelled);
      socket.off('pendingCallsSync', handlePendingCallsSync);
      socket.off('callHistoryUpdate', handleCallHistory);
      socket.off('callEnded', handleCallEnded);
      socket.off('callUnavailable', handleCallUnavailable);
      socket.off('offer', handleOffer);
      socket.off('iceCandidate', handleIceCandidate);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [socket]);

  // Trigger ringtone when there's at least one pending call and none active
  useEffect(() => {
    if (incomingCalls.length > 0 && !activeCall) {
      console.log('🔔 PremiumHeader: Pending calls, starting ringtone');
      // Start immediately; if audio context is still locked, unlock effect will retry
      playRingtone();
    } else {
      stopRingtone();
    }
    return () => stopRingtone();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [incomingCalls.length, activeCall]);

  // Timer for call duration
  useEffect(() => {
    if (activeCall) {
      callTimerRef.current = setInterval(() => {
        setCallDuration(prev => prev + 1);
      }, 1000);
    } else {
      if (callTimerRef.current) {
        clearInterval(callTimerRef.current);
      }
      setCallDuration(0);
    }

    return () => {
      if (callTimerRef.current) {
        clearInterval(callTimerRef.current);
      }
    };
  }, [activeCall]);

  const acceptCall = async (callIdToAccept) => {
    if (activeCallRef.current) {
      console.warn('⚠️ Admin: Already on a call, cannot accept another');
      return;
    }
    const call = incomingCallsRef.current.find(c => c.callId === callIdToAccept)
      || incomingCallsRef.current[0];
    if (!call) {
      console.warn('⚠️ Admin: No call to accept');
      return;
    }
    console.log('🎤 PremiumHeader: Accepting call from Table', call.tableId, 'callId=', call.callId);
    stopRingtone();
    setShowIncomingList(false);
    activeCallIdRef.current = call.callId;
    pendingIceCandidatesRef.current = [];
    setActiveCall(call);
    // Remove from pending queue
    setIncomingCalls(prev => prev.filter(c => c.callId !== call.callId));

    try {
      // 1) Get admin microphone access FIRST so admin can speak back
      console.log('🎤 PremiumHeader: Requesting admin microphone...');
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true
        },
        video: false
      });
      localStreamRef.current = stream;
      console.log('✅ PremiumHeader: Admin microphone granted');

      // 2) Create peer connection
      const peerConnection = new RTCPeerConnection({
        iceServers: [
          { urls: ['stun:stun.l.google.com:19302', 'stun:stun1.l.google.com:19302'] }
        ]
      });
      peerConnectionRef.current = peerConnection;
      console.log('📡 PremiumHeader: Peer connection created');

      // Add admin's local audio tracks so caller can hear admin
      stream.getTracks().forEach(track => {
        peerConnection.addTrack(track, stream);
        console.log('📤 PremiumHeader: Added admin track:', track.kind);
      });

      peerConnection.ontrack = (event) => {
        console.log('📥 PremiumHeader: Received remote track:', event.track.kind);
        if (remoteAudioRef.current && event.streams[0]) {
          remoteAudioRef.current.srcObject = event.streams[0];
          remoteAudioRef.current.play?.().catch(e => console.log('audio play:', e));
          console.log('🔊 PremiumHeader: Remote audio stream set');
        }
      };

      peerConnection.onicecandidate = (event) => {
        if (event.candidate && activeCallIdRef.current) {
          console.log('🧊 PremiumHeader: Sending ICE candidate');
          socket.emit('iceCandidate', {
            candidate: event.candidate,
            callId: activeCallIdRef.current
          });
        }
      };

      peerConnection.oniceconnectionstatechange = () => {
        console.log('🧊 PremiumHeader: ICE state:', peerConnection.iceConnectionState);
      };

      peerConnection.onconnectionstatechange = () => {
        console.log('📡 PremiumHeader: PC state:', peerConnection.connectionState);
      };

      // 3) Emit acceptVoiceCall (listeners registered at mount handle offer/ice)
      console.log('📤 PremiumHeader: Emitting acceptVoiceCall');
      socket.emit('acceptVoiceCall', {
        callId: call.callId,
        tableId: call.tableId
      });
      console.log('✅ PremiumHeader: Accept message sent');
    } catch (error) {
      console.error('❌ PremiumHeader: Error accepting call:', error);
      activeCallIdRef.current = null;
      setActiveCall(null);
      if (localStreamRef.current) {
        localStreamRef.current.getTracks().forEach(t => t.stop());
        localStreamRef.current = null;
      }
    }
  };

  const rejectCall = (callIdToReject) => {
    const call = incomingCallsRef.current.find(c => c.callId === callIdToReject)
      || incomingCallsRef.current[0];
    if (!call) return;
    console.log('❌ PremiumHeader: Rejecting call from Table', call.tableId);

    socket.emit('rejectVoiceCall', {
      callId: call.callId,
      tableId: call.tableId
    });
    setIncomingCalls(prev => prev.filter(c => c.callId !== call.callId));
    console.log('✅ PremiumHeader: Reject message sent');
  };

  const endCall = () => {
    const current = activeCallRef.current;
    console.log('📞 PremiumHeader: Ending call', current && current.callId);

    if (peerConnectionRef.current) {
      peerConnectionRef.current.close();
      peerConnectionRef.current = null;
    }

    if (localStreamRef.current) {
      localStreamRef.current.getTracks().forEach(t => t.stop());
      localStreamRef.current = null;
    }

    if (remoteAudioRef.current) {
      remoteAudioRef.current.srcObject = null;
    }

    const callIdToEnd = activeCallIdRef.current;
    activeCallIdRef.current = null;
    pendingIceCandidatesRef.current = [];

    socket.emit('endVoiceCall', { callId: callIdToEnd });
    setActiveCall(null);
    setCallDuration(0);
  };

  const formatDuration = (seconds) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const titles = {
    dashboard: ['Dashboard', 'Real-time overview of your restaurant.'],
    orders: ['Orders', 'Manage active orders across dine-in and delivery.'],
    menu: ['Menu', 'Items, categories and pricing.'],
    tables: ['Tables', 'Floor plan and live table status.'],
    customers: ['Customers', 'Customer records and lifetime value.'],
    daybook: ['Daybook', 'Daily financial records.'],
    analytics: ['Analytics', 'Revenue trends and performance insights.'],
    staff: ['Staff', 'Team members and permissions.'],
    settings: ['Settings', 'Workspace preferences.'],
  };
  // eslint-disable-next-line no-unused-vars
  const [title, subtitle] = titles[activeTab] || [restaurantInfo.name, ''];

  return (
    <>
      {/* Hidden audio element for receiving remote audio */}
      <audio ref={remoteAudioRef} autoPlay />
      
      <header className="glass-header sticky top-0 z-20">
      <div className="max-w-[1440px] mx-auto px-6 h-[52px] flex items-center justify-between gap-4">
        <div className="min-w-0 flex items-center gap-3">
          <h1 className="text-[14px] font-semibold text-slate-900 tracking-tight truncate capitalize">{activeTab}</h1>
          <span className="text-[11px] text-slate-400">·</span>
          <span className="text-[11px] text-slate-500">{formatTimeWithWeekday(now)}</span>
        </div>

        <div className="flex items-center gap-2">
          {/* Incoming Calls Queue (first call inline, rest in dropdown) */}
          {incomingCalls.length > 0 && !activeCall && (
            <div className="relative incoming-list-container flex items-center gap-1">
              <div className="inline-flex items-center gap-2 h-7 px-3 rounded-md ring-1 bg-red-50/70 ring-red-200/80 text-red-700 text-[11px] font-medium animate-pulse">
                <span className="text-lg">📞</span>
                <span>Table {incomingCalls[0].tableId}</span>
                <button
                  onClick={() => acceptCall(incomingCalls[0].callId)}
                  className="ml-2 px-2 py-0.5 bg-green-600 text-white rounded text-[10px] hover:bg-green-700 transition"
                >
                  Accept
                </button>
                <button
                  onClick={() => rejectCall(incomingCalls[0].callId)}
                  className="px-2 py-0.5 bg-red-600 text-white rounded text-[10px] hover:bg-red-700 transition"
                >
                  Reject
                </button>
              </div>
              {incomingCalls.length > 1 && (
                <>
                  <button
                    onClick={() => setShowIncomingList(v => !v)}
                    className="h-7 px-2 rounded-md ring-1 bg-red-50/70 ring-red-200/80 text-red-700 text-[11px] font-semibold hover:bg-red-100 transition"
                    title={`${incomingCalls.length - 1} more incoming`}
                  >
                    +{incomingCalls.length - 1}
                  </button>
                  {showIncomingList && (
                    <div className="absolute top-full right-0 mt-2 w-80 bg-white rounded-xl shadow-2xl border border-slate-200 overflow-hidden z-50">
                      <div className="p-3 border-b border-slate-200 bg-red-50">
                        <h3 className="text-sm font-semibold text-red-900">
                          Incoming Calls ({incomingCalls.length})
                        </h3>
                      </div>
                      <div className="max-h-72 overflow-y-auto">
                        {incomingCalls.map((c) => (
                          <div key={c.callId} className="p-3 border-b border-slate-100 flex items-center justify-between gap-2">
                            <div className="flex flex-col">
                              <span className="font-medium text-slate-900 text-sm">Table {c.tableId}</span>
                              <span className="text-xs text-slate-500">
                                {c.reason || 'Order'}{c.initiatedAt ? ` · ${formatTime(c.initiatedAt)}` : ''}
                              </span>
                            </div>
                            <div className="flex gap-1">
                              <button
                                onClick={() => acceptCall(c.callId)}
                                className="px-2 py-1 bg-green-600 text-white rounded text-xs hover:bg-green-700 transition"
                              >
                                Accept
                              </button>
                              <button
                                onClick={() => rejectCall(c.callId)}
                                className="px-2 py-1 bg-red-600 text-white rounded text-xs hover:bg-red-700 transition"
                              >
                                Reject
                              </button>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </>
              )}
            </div>
          )}

          {/* Active Call Display */}
          {activeCall && (
            <div className="inline-flex items-center gap-2 h-7 px-3 rounded-md ring-1 bg-green-50/70 ring-green-200/80 text-green-700 text-[11px] font-medium">
              <span className="text-lg">🎤</span>
              <span>Table {activeCall.tableId}</span>
              <span className="font-bold">{formatDuration(callDuration)}</span>
              <button
                onClick={endCall}
                className="ml-2 px-2 py-0.5 bg-red-600 text-white rounded text-[10px] hover:bg-red-700 transition"
              >
                End
              </button>
            </div>
          )}

          {/* Live indicator */}
          <div className={`inline-flex items-center gap-1.5 h-7 px-2.5 rounded-md ring-1 text-[11px] font-medium backdrop-blur ${
            socketConnected
              ? 'bg-emerald-50/70 ring-emerald-200/80 text-emerald-700'
              : 'bg-slate-50/70 ring-slate-200/80 text-slate-600'
          }`}>
            <GlowDot tone={socketConnected ? 'emerald' : 'slate'} />
            {socketConnected ? 'Live' : 'Offline'}
          </div>

          {/* Call Log */}
          <div className="relative call-log-container">
            <button
              onClick={() => setShowCallLog(!showCallLog)}
              className="inline-flex items-center gap-1.5 h-7 px-2.5 rounded-md ring-1 bg-slate-50/70 ring-slate-200/80 text-slate-600 text-[11px] font-medium backdrop-blur hover:bg-slate-100/70 transition"
            >
              <span className="text-sm">📞</span>
              {callLog.length > 0 && (
                <span className="bg-blue-500 text-white text-[9px] px-1 rounded-full min-w-[16px] h-4 flex items-center justify-center">
                  {callLog.length}
                </span>
              )}
            </button>

            {/* Call Log Dropdown */}
            {showCallLog && (
              <div className="absolute top-full right-0 mt-2 w-80 bg-white rounded-xl shadow-2xl border border-slate-200 overflow-hidden z-50 animate-in fade-in slide-in-from-top-2">
                <div className="p-3 border-b border-slate-200 bg-slate-50">
                  <div className="flex items-center justify-between">
                    <h3 className="text-sm font-semibold text-slate-900">Call Log</h3>
                    <button
                      onClick={() => setCallLog([])}
                      className="text-xs text-slate-500 hover:text-slate-700 transition"
                    >
                      Clear All
                    </button>
                  </div>
                </div>
                
                <div className="max-h-64 overflow-y-auto">
                  {callLog.length === 0 ? (
                    <div className="p-4 text-center text-slate-500 text-sm">
                      No calls yet
                    </div>
                  ) : (
                    callLog.map((call) => (
                      <div key={call.id} className="p-3 border-b border-slate-100 hover:bg-slate-50 transition">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <span className={`w-2 h-2 rounded-full ${
                              call.status === 'answered' ? 'bg-green-500' :
                              call.status === 'rejected' ? 'bg-red-500' :
                              call.status === 'ended' ? 'bg-blue-500' :
                              call.status === 'missed' ? 'bg-orange-500' :
                              'bg-gray-500'
                            }`}></span>
                            <span className="font-medium text-slate-900">Table {call.tableId}</span>
                            <span className="text-xs text-slate-500 bg-slate-100 px-2 py-0.5 rounded">
                              {call.reason}
                            </span>
                          </div>
                          <div className="text-right">
                            <div className="text-xs text-slate-600">{call.formattedTime}</div>
                            {call.duration > 0 && (
                              <div className="text-xs text-slate-500">
                                {Math.floor(call.duration / 60)}:{(call.duration % 60).toString().padStart(2, '0')}
                              </div>
                            )}
                          </div>
                        </div>
                        <div className="mt-1">
                          <span className={`text-xs px-2 py-0.5 rounded-full ${
                            call.status === 'answered' ? 'bg-green-100 text-green-700' :
                            call.status === 'rejected' ? 'bg-red-100 text-red-700' :
                            call.status === 'ended' ? 'bg-blue-100 text-blue-700' :
                            call.status === 'missed' ? 'bg-orange-100 text-orange-700' :
                            'bg-gray-100 text-gray-700'
                          }`}>
                            {call.status.charAt(0).toUpperCase() + call.status.slice(1)}
                          </span>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>
            )}
          </div>

          {/* Refresh */}
          <button
            onClick={onRefresh}
            disabled={loading}
            className="btn-primary inline-flex items-center gap-1.5 h-7 px-3 rounded-md text-[12px] font-medium"
          >
            <Icon.Refresh className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
            Refresh
          </button>
        </div>
      </div>
    </header>
    </>
  );
};

/* ============================================================
   Dashboard Overview
   ============================================================ */
const DashboardOverview = ({ orders, customers, dbSummary, loading, onGoto }) => {
  // eslint-disable-next-line no-unused-vars
  const { formatTime, isToday } = useDateTimeFormatter();
  const activeOrders = orders.filter((o) => o.status !== 'completed' && o.status !== 'cancelled');
  const dineInOrders = activeOrders.filter((o) => o.order_type === 'dine-in');
  const deliveryOrders = activeOrders.filter((o) => o.order_type === 'delivery');

  const todayKey = new Date().toDateString();
  const todayOrders = orders.filter((o) => new Date(o.created_at).toDateString() === todayKey);
  const todayRevenue = todayOrders.reduce((sum, o) => {
    if (o.status !== 'completed') return sum;
    const t = o.total_amount || (o.items?.reduce((s, i) => s + (i.price * i.quantity), 0) || 0);
    return sum + t;
  }, 0);
  const avgOrderValue = todayOrders.length > 0 ? Math.round(todayRevenue / todayOrders.length) : 0;

  const sparkline = useMemo(() => {
    const hours = Array.from({ length: 12 }, () => 0);
    const nowH = new Date().getHours();
    orders.forEach((o) => {
      const d = new Date(o.created_at);
      if (d.toDateString() !== todayKey) return;
      const diff = nowH - d.getHours();
      if (diff >= 0 && diff < 12) hours[11 - diff] += 1;
    });
    return hours;
  }, [orders, todayKey]);

  const stats = [
    { title: 'Active orders', value: activeOrders.length, change: '+12%', positive: true, Icon: Icon.Orders, tone: 'indigo' },
    { title: "Today's revenue", value: formatNPR(todayRevenue), change: '+8%', positive: true, Icon: Icon.Wallet, tone: 'emerald' },
    { title: 'Customers', value: customers.length, change: '+5%', positive: true, Icon: Icon.Customers, tone: 'violet' },
    { title: 'Avg. order value', value: formatNPR(avgOrderValue), change: '+3%', positive: true, Icon: Icon.Trend, tone: 'amber' },
  ];

  const toneClass = (tone) => ({
    indigo: 'bg-gradient-to-br from-indigo-500 to-violet-600 text-white',
    emerald: 'bg-gradient-to-br from-emerald-500 to-teal-600 text-white',
    violet: 'bg-gradient-to-br from-violet-500 to-purple-600 text-white',
    amber: 'bg-gradient-to-br from-amber-500 to-orange-600 text-white',
  }[tone]);

  const toneGlow = (tone) => ({
    indigo: 'var(--glow-indigo)',
    emerald: 'var(--glow-emerald)',
    violet: 'var(--glow-violet)',
    amber: 'var(--glow-amber)',
  }[tone]);

  return (
    <div className="h-[calc(100vh-52px-32px)] overflow-hidden">
      {/* Single page grid layout */}
      <div className="grid grid-cols-12 gap-3 h-full">
        
        {/* Left column - KPIs + Chart */}
        <div className="col-span-12 lg:col-span-8 flex flex-col gap-3">
          {/* KPI cards - compact row */}
          <div className="grid grid-cols-4 gap-2">
            {stats.map((s, i) => (
              <div key={i} className="glass-card gradient-band p-2.5">
                <div className="flex items-center justify-between mb-1.5">
                  <p className="text-[9px] text-slate-500 font-semibold uppercase tracking-wider">{s.title}</p>
                  <div className={`w-7 h-7 rounded-lg flex items-center justify-center ${toneClass(s.tone)}`} style={{ boxShadow: toneGlow(s.tone) }}>
                    <s.Icon className="w-3.5 h-3.5" />
                  </div>
                </div>
                <p className="text-[18px] leading-none font-semibold text-slate-900 tracking-tight tabular-nums">
                  {loading ? <span className="inline-block w-16 h-5 rounded-md shimmer" /> : s.value}
                </p>
              </div>
            ))}
          </div>

          {/* Chart */}
          <div className="glass-card p-4 flex-1 min-h-0">
            <div className="flex items-center justify-between mb-3">
              <div>
                <h3 className="text-[11px] font-semibold text-slate-900 tracking-tight">Order volume · last 12 hours</h3>
              </div>
              <div className="inline-flex items-center gap-1.5 px-2 h-6 rounded-md bg-indigo-50/80 text-indigo-700 text-[10px] font-semibold ring-1 ring-indigo-500/20">
                <GlowDot tone="indigo" size={5} /> Live
              </div>
            </div>
            <div className="h-[calc(100%-40px)]">
              <MiniBarChart data={sparkline} />
            </div>
          </div>
        </div>

        {/* Right column - Live orders */}
        <div className="col-span-12 lg:col-span-4 flex flex-col gap-3">
          <div className="flex-1 min-h-0">
            <LiveOrdersPanel title="Dine-in" Icon={Icon.Utensils} tone="violet" orders={dineInOrders} emptyText="No active dine-in orders." onGoto={() => onGoto('orders')} compact />
          </div>
          <div className="flex-1 min-h-0">
            <LiveOrdersPanel title="Delivery" Icon={Icon.Truck} tone="amber" orders={deliveryOrders} emptyText="No active delivery orders." onGoto={() => onGoto('orders')} compact />
          </div>
        </div>

        {/* Bottom row - Quick actions */}
        <div className="col-span-12 glass-card p-3">
          <div className="grid grid-cols-4 gap-2">
            <QuickAction Icon={Icon.Plus} label="Add menu item" onClick={() => onGoto('menu')} tone="indigo" compact />
            <QuickAction Icon={Icon.Analytics} label="View reports" onClick={() => onGoto('analytics')} tone="emerald" compact />
            <QuickAction Icon={Icon.Staff} label="Manage staff" onClick={() => onGoto('staff')} tone="violet" compact />
            <QuickAction Icon={Icon.Settings} label="Settings" onClick={() => onGoto('settings')} tone="amber" compact />
          </div>
        </div>
      </div>
    </div>
  );
};

const MiniBarChart = ({ data }) => {
  const max = Math.max(1, ...data);
  return (
    <div className="flex items-end gap-1.5 h-full pb-5">
      {data.map((v, i) => (
        <div key={i} className="flex-1 flex flex-col items-center gap-1.5 group h-full">
          <div className="w-full relative flex-1 flex items-end min-h-0">
            <div
              className="w-full rounded-md bg-gradient-to-t from-indigo-600 via-indigo-500 to-violet-400 transition-all duration-700 ease-out group-hover:from-indigo-700 group-hover:to-violet-500"
              style={{
                height: v > 0 ? `${(v / max) * 100}%` : '2px',
                minHeight: v > 0 ? '8px' : '2px',
                boxShadow: '0 4px 12px -4px rgba(99,102,241,0.45), inset 0 1px 0 0 rgba(255,255,255,0.25)'
              }}
            />
            <div className="absolute -top-10 left-1/2 -translate-x-1/2 bg-slate-900 text-white text-[11px] px-2 py-1 rounded-md opacity-0 group-hover:opacity-100 transition pointer-events-none whitespace-nowrap shadow-xl z-10">
              <div className="font-semibold">{v} order{v !== 1 ? 's' : ''}</div>
              <div className="text-[9px] text-slate-400">-{data.length - i}h</div>
            </div>
          </div>
          <span className="text-[10px] text-slate-400 tabular-nums absolute bottom-0">-{data.length - i}h</span>
        </div>
      ))}
    </div>
  );
};

const LiveOrdersPanel = ({ title, Icon: IconC, tone, orders, emptyText, onGoto, compact }) => {
  const { formatTime } = useDateTimeFormatter();
  const toneMap = {
    violet: { box: 'bg-gradient-to-br from-violet-500 to-purple-600 text-white', glow: 'var(--glow-violet)' },
    amber: { box: 'bg-gradient-to-br from-amber-500 to-orange-600 text-white', glow: 'var(--glow-amber)' },
  };
  return (
    <div className="glass-card overflow-hidden h-full flex flex-col">
      <div className={`${compact ? 'px-3 py-2.5' : 'px-6 py-5'} flex items-center justify-between border-b border-slate-200/60 flex-shrink-0`}>
        <div className="flex items-center gap-2">
          <div className={`${compact ? 'w-7 h-7' : 'w-10 h-10'} rounded-xl flex items-center justify-center ${toneMap[tone].box}`} style={{ boxShadow: toneMap[tone].glow }}>
            <IconC className={compact ? 'w-3.5 h-3.5' : 'w-5 h-5'} />
          </div>
          <div>
            <h3 className={`${compact ? 'text-[11px]' : 'text-sm'} font-semibold text-slate-900 tracking-tight`}>{title}</h3>
            <p className={`${compact ? 'text-[10px]' : 'text-xs'} text-slate-500 mt-0.5`}>{orders.length} active</p>
          </div>
        </div>
        <button onClick={onGoto} className={`${compact ? 'text-[10px]' : 'text-xs'} font-medium text-slate-600 hover:text-indigo-600 inline-flex items-center gap-1 transition`}>
          View <Icon.ChevronRight className="w-3 h-3" />
        </button>
      </div>
      <div className="flex-1 overflow-y-auto fz-scroll min-h-0">
        {orders.length === 0 ? (
          <div className={`${compact ? 'py-8' : 'py-14'} text-center`}>
            <div className={`${compact ? 'w-10 h-10' : 'w-14 h-14'} mx-auto rounded-2xl flex items-center justify-center ${toneMap[tone].box} opacity-60`}>
              <IconC className={compact ? 'w-5 h-5' : 'w-7 h-7'} />
            </div>
            <p className={`${compact ? 'mt-2 text-[11px]' : 'mt-4 text-sm'} text-slate-500`}>{emptyText}</p>
          </div>
        ) : (
          <ul className="divide-y divide-slate-100/80">
            {orders.slice(0, compact ? 4 : 6).map((o) => {
              const total = o.total_amount || (o.items?.reduce((s, i) => s + (i.price * i.quantity), 0) || 0);
              return (
                <li key={o.id} className={`${compact ? 'px-3 py-2' : 'px-6 py-3.5'} flex items-center justify-between hover:bg-slate-50/70 transition`}>
                  <div className="min-w-0">
                    <div className={`${compact ? 'text-[11px]' : 'text-sm'} font-medium text-slate-900 truncate`}>
                      {title === 'Dine-in' ? `Table ${o.table_id}` : (o.customer_name || 'Guest')}
                    </div>
                    <div className={`${compact ? 'text-[10px]' : 'text-xs'} text-slate-500 flex items-center gap-1.5 mt-0.5`}>
                      <Icon.Clock className="w-3 h-3" />
                      {formatTime(o.created_at)}
                      <span className="text-slate-300">•</span>
                      {o.items?.length || 0} items
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className={`font-mono ${compact ? 'text-[11px]' : 'text-sm'} font-semibold text-slate-900 tabular-nums`}>{formatNPR(total)}</span>
                    <Badge tone={statusTone(o.status)} size={compact ? 'xs' : 'sm'}>{o.status}</Badge>
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </div>
    </div>
  );
};

const QuickAction = ({ Icon: IconC, label, desc, onClick, tone = 'indigo', compact }) => {
  const toneMap = {
    indigo: 'bg-gradient-to-br from-indigo-500 to-violet-600',
    emerald: 'bg-gradient-to-br from-emerald-500 to-teal-600',
    violet: 'bg-gradient-to-br from-violet-500 to-purple-600',
    amber: 'bg-gradient-to-br from-amber-500 to-orange-600',
  };
  const glowMap = {
    indigo: 'var(--glow-indigo)',
    emerald: 'var(--glow-emerald)',
    violet: 'var(--glow-violet)',
    amber: 'var(--glow-amber)',
  };
  return (
    <button
      onClick={onClick}
      className={`group text-left ${compact ? 'p-2.5' : 'p-4'} rounded-2xl ring-1 ring-slate-200/80 bg-white/60 hover:bg-white hover:ring-slate-300 transition-all duration-300`}
      style={{ boxShadow: 'var(--shadow-xs)' }}
    >
      <div
        className={`${compact ? 'w-7 h-7' : 'w-10 h-10'} rounded-xl ${toneMap[tone]} text-white flex items-center justify-center transition-transform group-hover:scale-105`}
        style={{ boxShadow: glowMap[tone] }}
      >
        <IconC className={compact ? 'w-3.5 h-3.5' : 'w-4 h-4'} />
      </div>
      <div className={`${compact ? 'mt-1.5 text-[11px]' : 'mt-3 text-sm'} font-semibold text-slate-900`}>{label}</div>
      {!compact && desc && <div className="text-xs text-slate-500 mt-0.5">{desc}</div>}
    </button>
  );
};

/* ============================================================
   Tables Management
   ============================================================ */
const TablesManagement = ({ orders, setOrders, socket, pushToast, refreshTrigger, restaurantInfo }) => {
  const [tables, setTables] = useState([]);
  const [selectedTable, setSelectedTable] = useState(null);
  const [showClearModal, setShowClearModal] = useState(false);
  const [showMigrateModal, setShowMigrateModal] = useState(false);
  const [targetTableId, setTargetTableId] = useState('');
  const [loading, setLoading] = useState(true);
  const [activeSubTab, setActiveSubTab] = useState('floor'); // 'floor', 'payments', 'qr-settings'
  const [pendingReceipts, setPendingReceipts] = useState([]); // Track pending payment receipts by table
  const tableCount = restaurantInfo?.tableCount || 25; // Get from settings, default to 25

  // Fetch pending payment receipts
  const fetchPendingReceipts = async () => {
    try {
      const response = await fetch('/api/payment-qr/receipts?status=pending', {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('adminToken')}`
        }
      });
      const data = await response.json();
      if (data.success) {
        setPendingReceipts(data.receipts || []);
      }
    } catch (error) {
      console.error('Failed to fetch pending receipts:', error);
    }
  };

  useEffect(() => {
    fetchTableStatuses();
    fetchPendingReceipts();

    // Named handlers so we can remove the exact same references on cleanup.
    const onTableCleared        = () => { console.log('🔔 Table cleared event received'); fetchTableStatuses(); };
    const onTableStatusUpdated  = (data) => { console.log('🔔 Table status updated event received:', data); fetchTableStatuses(); };
    const onNewOrder            = () => fetchTableStatuses();
    const onOrderStatusUpdated  = () => fetchTableStatuses();
    const onReceiptSubmitted    = () => { console.log('🔔 Payment receipt submitted'); fetchPendingReceipts(); };
    const onPaymentVerified     = (data) => { console.log('🔔 Payment verified event received:', data); fetchPendingReceipts(); fetchTableStatuses(); };

    if (socket) {
      socket.on('tableCleared',             onTableCleared);
      socket.on('tableStatusUpdated',       onTableStatusUpdated);
      socket.on('newOrder',                 onNewOrder);
      socket.on('orderStatusUpdated',       onOrderStatusUpdated);
      socket.on('paymentReceiptSubmitted',  onReceiptSubmitted);
      socket.on('paymentVerified',          onPaymentVerified);
    }

    // Poll as a safety net whether or not the socket is connected.
    const timeouts = settingsService.getTimeoutSettings();
    const id = setInterval(() => {
      fetchTableStatuses();
      fetchPendingReceipts();
    }, timeouts.tableStatusIntervalMs);

    return () => {
      clearInterval(id);
      if (socket) {
        socket.off('tableCleared',            onTableCleared);
        socket.off('tableStatusUpdated',      onTableStatusUpdated);
        socket.off('newOrder',                onNewOrder);
        socket.off('orderStatusUpdated',      onOrderStatusUpdated);
        socket.off('paymentReceiptSubmitted', onReceiptSubmitted);
        socket.off('paymentVerified',         onPaymentVerified);
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [socket]);

  // Watch for refresh trigger from global refresh button
  useEffect(() => {
    if (refreshTrigger > 0) {
      fetchTableStatuses();
      fetchPendingReceipts();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [refreshTrigger]);

  const fetchTableStatuses = async () => {
    try {
      setLoading(true);
      const response = await fetchApi.get('/api/tables/status');
      if (response && Array.isArray(response)) setTables(response);
      else generateTableDataFromOrders();
    } catch (err) {
      generateTableDataFromOrders();
    } finally {
      setLoading(false);
    }
  };

  const generateTableDataFromOrders = () => {
    const data = [];
    for (let i = 1; i <= tableCount; i++) {
      const tableOrders = orders.filter((o) => (o.table_id === i || o.table_id === i.toString()) && ['pending', 'preparing', 'ready'].includes(o.status));
      const isOccupied = tableOrders.length > 0;
      const total = tableOrders.reduce((s, o) => s + (o.total_amount || (o.items?.reduce((x, it) => x + it.price * it.quantity, 0) || 0)), 0);
      data.push({
        table_id: i,
        status: isOccupied ? 'occupied' : 'empty',
        customer_name: tableOrders[0]?.customer_name || null,
        customer_phone: tableOrders[0]?.phone || tableOrders[0]?.customer_phone || null,
        total_amount: total,
        order_count: tableOrders.length,
        session_start: tableOrders[0]?.created_at || null,
        hours_occupied: tableOrders[0] ? (Date.now() - new Date(tableOrders[0].created_at)) / 3600000 : 0,
      });
    }
    setTables(data);
  };

  const clearTable = async (tableId) => {
    try {
      const response = await fetchApi.post(`/api/clear-table/${tableId}`, {});
      if (response && response.success) {
        if (socket) socket.emit('tableCleared', { tableId });
        setOrders((prev) => prev.filter((o) => o.table_id !== tableId));
        
        // Close modals immediately
        setShowClearModal(false);
        setSelectedTable(null);
        
        // Refresh table statuses
        await fetchTableStatuses();
        
        pushToast && pushToast(`Table ${tableId} cleared · ${response.movedToHistory || 0} orders archived`);
      } else {
        pushToast && pushToast('Failed to clear table', 'error');
      }
    } catch (err) {
      pushToast && pushToast(`Error clearing table: ${err.message}`, 'error');
    } finally {
      // Ensure modals are closed and table is deselected
      setShowClearModal(false);
      setSelectedTable(null);
      // Force a final refresh
      await fetchTableStatuses();
    }
  };

  const migrateTable = async () => {
    if (!targetTableId || !selectedTable) return;
    
    const targetId = parseInt(targetTableId);
    if (targetId === selectedTable.table_id) {
      pushToast && pushToast('Cannot migrate to the same table', 'error');
      return;
    }

    if (targetId < 1 || targetId > tableCount) {
      pushToast && pushToast(`Invalid table number (1-${tableCount})`, 'error');
      return;
    }

    try {
      const response = await fetchApi.post(`/api/migrate-table`, {
        fromTableId: selectedTable.table_id,
        toTableId: targetId
      });
      
      if (response && response.success) {
        if (socket) socket.emit('tableMigrated', { fromTableId: selectedTable.table_id, toTableId: targetId });
        await fetchTableStatuses();
        pushToast && pushToast(`Table ${selectedTable.table_id} migrated to Table ${targetId} · ${response.ordersUpdated || 0} orders moved`);
      } else {
        pushToast && pushToast(response.message || 'Failed to migrate table', 'error');
      }
    } catch (err) {
      pushToast && pushToast(`Error migrating table: ${err.message}`, 'error');
    } finally {
      setShowMigrateModal(false);
      setSelectedTable(null);
      setTargetTableId('');
    }
  };

  const occupied = (tables || []).filter((t) => ['occupied', 'ordering', 'dining'].includes(t.status));
  // eslint-disable-next-line no-unused-vars
  const available = (tables || []).filter((t) => t.status === 'empty');
  const totalRevenue = occupied.reduce((s, t) => s + (t.total_amount || 0), 0);
  // eslint-disable-next-line no-unused-vars
  const utilization = tables.length ? Math.round((occupied.length / tables.length) * 100) : 0;

  return (
    <div className="h-[calc(100vh-52px-32px)] flex flex-col overflow-hidden">
      {/* Header with Stats and Sub-Tab Navigation */}
      <div className="px-4 pt-3 pb-2 space-y-3">
        {/* Stats Row */}
        <div className="flex items-center justify-between gap-2">
          {/* Live Indicator - Left */}
          <div className="glass-card px-3 py-1.5 flex items-center gap-2">
            <div className="w-2 h-2 rounded-full bg-red-500 animate-pulse shadow-lg" style={{ boxShadow: '0 0 10px rgba(239, 68, 68, 0.8)' }}></div>
            <span className="text-sm font-bold text-slate-900 tracking-tight animate-pulse">Live</span>
          </div>

          {/* Stats - Right */}
          <div className="flex items-center gap-2">
            <div className="glass-card px-3 py-1.5 bg-gradient-to-br from-rose-50 to-pink-50 border-rose-200 flex items-center gap-2">
              <div className="w-6 h-6 rounded-lg bg-gradient-to-br from-rose-500 to-pink-600 flex items-center justify-center text-white shadow-md">
                <Icon.Tables className="w-3.5 h-3.5" />
              </div>
              <span className="text-xl font-bold text-rose-900 tracking-tight tabular-nums">{occupied.length}</span>
            </div>
            <div className="glass-card px-3 py-1.5 bg-gradient-to-br from-indigo-50 to-violet-50 border-indigo-200 flex items-center gap-2">
              <div className="w-6 h-6 rounded-lg bg-gradient-to-br from-indigo-500 to-violet-600 flex items-center justify-center text-white shadow-md">
                <Icon.Wallet className="w-3.5 h-3.5" />
              </div>
              <span className="text-base font-bold text-indigo-900 tracking-tight tabular-nums">{formatNPR(totalRevenue)}</span>
            </div>
          </div>
        </div>

        {/* Sub-Tab Navigation */}
        <div className="flex space-x-1 bg-gray-100 rounded-lg p-1">
          {[
            { id: 'floor', label: 'Floor Plan', icon: '🏢' },
            { id: 'payments', label: 'Payment Receipts', icon: '💳' }
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveSubTab(tab.id)}
              className={`flex-1 flex items-center justify-center space-x-2 py-2 px-3 rounded-md text-sm font-medium transition-colors ${
                activeSubTab === tab.id
                  ? 'bg-white text-blue-600 shadow-sm'
                  : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              <span>{tab.icon}</span>
              <span>{tab.label}</span>
            </button>
          ))}
        </div>
      </div>

      {/* Content based on active sub-tab */}
      {activeSubTab === 'floor' && (
        <>
          {/* Tables Grid - Full Space, No Header */}
          <div className="glass-card flex-1 flex flex-col min-h-0 overflow-hidden">
            {loading ? (
              <div className="flex items-center justify-center flex-1">
                <Spinner size="lg" />
              </div>
            ) : (
              <div className="flex-1 p-3 overflow-hidden">
            <div className="h-full grid grid-cols-6 md:grid-cols-8 lg:grid-cols-10 xl:grid-cols-12 2xl:grid-cols-14 gap-1.5 content-start">
              {(tables || []).map((t) => {
                const occ = t.status !== 'empty' && t.status !== 'available';
                const hasPendingReceipt = pendingReceipts.some(r => r.table_id === t.table_id);
                return (
                  <button
                    key={t.table_id}
                    onClick={() => setSelectedTable(t)}
                    className={`table-tile ${occ ? 'table-tile-occupied' : 'table-tile-empty'} ${hasPendingReceipt ? 'ring-2 ring-yellow-400 ring-offset-1' : ''} aspect-square text-left p-1.5 relative`}
                  >
                    {/* Payment Receipt Indicator */}
                    {hasPendingReceipt && (
                      <div className="absolute -top-1 -right-1 z-10">
                        <div className="relative">
                          <div className="w-5 h-5 bg-yellow-400 rounded-full flex items-center justify-center shadow-lg animate-pulse">
                            <span className="text-[10px]">💳</span>
                          </div>
                          <div className="absolute inset-0 w-5 h-5 bg-yellow-400 rounded-full animate-ping opacity-75"></div>
                        </div>
                      </div>
                    )}
                    
                    <div className="flex items-start justify-between">
                      <span className={`text-[7px] font-semibold uppercase tracking-wider ${occ ? 'text-rose-600' : 'text-emerald-700'}`}>T</span>
                      <GlowDot tone={occ ? 'rose' : 'emerald'} />
                    </div>
                    <div className={`text-lg font-bold tracking-tight mt-0.5 tabular-nums ${occ ? 'text-rose-900' : 'text-emerald-900'}`}>
                      {String(t.table_id).padStart(2, '0')}
                    </div>
                    {occ && (
                      <div className="absolute left-1.5 right-1.5 bottom-1">
                        {t.total_amount > 0 && (
                          <div className="text-[8px] font-mono font-semibold text-rose-700 tabular-nums">{formatNPR(t.total_amount)}</div>
                        )}
                        {t.order_count > 0 && (
                          <div className="text-[7px] text-rose-600/75">{t.order_count}</div>
                        )}
                      </div>
                    )}
                  </button>
                );
              })}
            </div>
          </div>
        )}
      </div>

      {/* Details modal */}
      {selectedTable && !showClearModal && !showMigrateModal && (
        <Modal onClose={() => setSelectedTable(null)} title={`Table ${selectedTable.table_id}`} subtitle={selectedTable.customer_name ? `${selectedTable.customer_name}${selectedTable.customer_phone ? ` · ${selectedTable.customer_phone}` : ''}` : selectedTable.status === 'occupied' ? 'Unknown Customer' : 'Empty'}>
          {/* Pending Payment Receipt Alert */}
          {pendingReceipts.filter(r => r.table_id === selectedTable.table_id).map((receipt) => (
            <div key={receipt.id} className="mb-4 p-4 bg-yellow-50 border-2 border-yellow-400 rounded-lg">
              <div className="flex items-start gap-3">
                <div className="flex-shrink-0">
                  <div className="w-10 h-10 bg-yellow-400 rounded-full flex items-center justify-center">
                    <span className="text-lg">💳</span>
                  </div>
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <h4 className="text-sm font-bold text-yellow-900">Payment Receipt Pending Verification</h4>
                    <Badge tone="yellow" size="xs">Pending</Badge>
                  </div>
                  <p className="text-xs text-yellow-800 mb-2">
                    Customer submitted payment receipt for {formatNPR(receipt.total_amount)} via {receipt.payment_method}
                  </p>
                  <div className="flex gap-2">
                    <button
                      onClick={() => {
                        setSelectedTable(null);
                        setActiveSubTab('payments');
                      }}
                      className="px-3 py-1.5 bg-yellow-600 hover:bg-yellow-700 text-white text-xs font-semibold rounded-lg transition"
                    >
                      Review Receipt →
                    </button>
                  </div>
                </div>
              </div>
            </div>
          ))}
          
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
            <MiniStat label="Status" value={<span className="capitalize">{selectedTable.status.replace('_', ' ')}</span>} tone={statusTone(selectedTable.status)} compact />
            <MiniStat label="Total" value={formatNPR(selectedTable.total_amount)} tone="indigo" compact />
            <MiniStat label="Orders" value={selectedTable.order_count || selectedTable.orders?.length || 0} tone="slate" compact />
            <MiniStat label="Time" value={selectedTable.hours_occupied ? `${selectedTable.hours_occupied.toFixed(1)}h` : 'N/A'} tone="slate" compact />
          </div>
          <div>
            <h3 className="text-sm font-semibold text-slate-900 mb-3">Orders</h3>
            {selectedTable.orders?.length > 0 ? (
              <div className="space-y-3">
                {selectedTable.orders.map((o, i) => (
                  <div key={o.id || i} className="rounded-xl ring-1 ring-slate-200/80 bg-white/70 p-4">
                    <div className="flex items-center justify-between mb-2">
                      <div>
                        <div className="text-sm font-semibold text-slate-900">Order #{o.order_number || o.id}</div>
                        <div className="text-xs text-slate-500 capitalize">Status: {o.status}</div>
                      </div>
                      <div className="text-sm font-mono font-semibold text-slate-900 tabular-nums">{formatNPR(o.total)}</div>
                    </div>
                    {o.items?.length > 0 && (
                      <div className="mt-3 pt-3 border-t border-slate-100 space-y-1.5">
                        {o.items.map((it, idx) => (
                          <div key={idx} className="flex items-center justify-between text-xs">
                            <span className="text-slate-700">{it.name} <span className="text-slate-400">× {it.quantity}</span></span>
                            <span className="font-mono text-slate-900 tabular-nums">{formatNPR(it.subtotal || it.price * it.quantity)}</span>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-sm text-slate-500 text-center py-6">No active orders.</p>
            )}
          </div>
          <div className="mt-6 flex gap-2">
            <button onClick={() => setSelectedTable(null)} className="btn-ghost flex-1 h-10 rounded-lg text-sm font-medium">Close</button>
            {selectedTable.status !== 'empty' && selectedTable.status !== 'available' && (
              <>
                <button onClick={() => setShowMigrateModal(true)} className="btn-primary flex-1 h-10 rounded-lg text-sm font-medium">Migrate</button>
                <button onClick={() => setShowClearModal(true)} className="btn-rose flex-1 h-10 rounded-lg text-sm font-medium">Clear</button>
              </>
            )}
          </div>
        </Modal>
      )}

      {/* Migrate Table Modal */}
      {showMigrateModal && selectedTable && (
        <Modal onClose={() => { setShowMigrateModal(false); setTargetTableId(''); }} title={`Migrate Table ${selectedTable.table_id}`} narrow>
          <p className="text-sm text-slate-600 mb-4">Move all orders from Table {selectedTable.table_id} to another table.</p>
          <div className="mb-6">
            <label className="block text-sm font-medium text-slate-700 mb-2">Target Table Number</label>
            <input
              type="number"
              min="1"
              max={tableCount}
              value={targetTableId}
              onChange={(e) => setTargetTableId(e.target.value)}
              placeholder={`Enter table number (1-${tableCount})`}
              className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              autoFocus
            />
            <p className="text-xs text-slate-500 mt-2">
              {selectedTable.order_count || 0} order(s) will be moved to the target table
            </p>
          </div>
          <div className="flex gap-2">
            <button onClick={() => { setShowMigrateModal(false); setTargetTableId(''); }} className="btn-ghost flex-1 h-10 rounded-lg text-sm font-medium">Cancel</button>
            <button onClick={migrateTable} disabled={!targetTableId} className="btn-primary flex-1 h-10 rounded-lg text-sm font-medium disabled:opacity-50 disabled:cursor-not-allowed">Migrate</button>
          </div>
        </Modal>
      )}

      {showClearModal && selectedTable && (
        <Modal onClose={() => setShowClearModal(false)} title={`Clear Table ${selectedTable.table_id}?`} narrow>
          <p className="text-sm text-slate-600">This will mark all active orders as completed and make the table available for new customers.</p>
          <div className="mt-6 flex gap-2">
            <button onClick={() => setShowClearModal(false)} className="btn-ghost flex-1 h-10 rounded-lg text-sm font-medium">Cancel</button>
            <button onClick={() => clearTable(selectedTable.table_id)} className="btn-rose flex-1 h-10 rounded-lg text-sm font-medium">Yes, clear</button>
          </div>
        </Modal>
      )}
        </>
      )}

      {/* Payment History Sub-tab */}
      {activeSubTab === 'payments' && (
        <PaymentHistory socket={socket} pushToast={pushToast} />
      )}
    </div>
  );
};

/* ============================================================
   Payment History Management
   ============================================================ */
const PaymentHistory = ({ socket, pushToast }) => {
  const [receipts, setReceipts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedReceipt, setSelectedReceipt] = useState(null);
  const [filter, setFilter] = useState('all');
  const [verifyNotes, setVerifyNotes] = useState('');
  const [isVerifying, setIsVerifying] = useState(false);

  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => {
    fetchReceipts();

    if (socket) {
      socket.on('paymentReceiptSubmitted', () => {
        fetchReceipts();
        pushToast && pushToast('New payment receipt submitted', 'info');
      });
      socket.on('paymentVerified', () => {
        fetchReceipts();
        pushToast && pushToast('Payment verified', 'success');
      });

      return () => {
        socket.off('paymentReceiptSubmitted');
        socket.off('paymentVerified');
      };
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [socket, pushToast]);

  const fetchReceipts = async () => {
    try {
      setLoading(true);
      const response = await fetch('/api/payment-qr/receipts', {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('adminToken')}`
        }
      });
      const data = await response.json();
      if (data.success) {
        setReceipts(data.receipts || []);
      }
    } catch (error) {
      console.error('Failed to fetch receipts:', error);
      pushToast && pushToast('Failed to load payment receipts', 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyReceipt = async (receiptId, status) => {
    if (!window.confirm(`Are you sure you want to ${status} this payment?`)) return;

    setIsVerifying(true);
    try {
      const response = await fetch(`/api/payment-qr/receipts/${receiptId}/verify`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('adminToken')}`
        },
        body: JSON.stringify({ status, notes: verifyNotes })
      });

      const data = await response.json();
      if (data.success) {
        pushToast && pushToast(`Payment ${status} successfully!`);
        setSelectedReceipt(null);
        setVerifyNotes('');
        fetchReceipts();
      } else {
        pushToast && pushToast(data.error || 'Failed to verify payment', 'error');
      }
    } catch (error) {
      pushToast && pushToast('Error verifying payment: ' + error.message, 'error');
    } finally {
      setIsVerifying(false);
    }
  };

  const filteredReceipts = receipts.filter(r => filter === 'all' || r.status === filter);
  const counts = {
    all: receipts.length,
    pending: receipts.filter(r => r.status === 'pending').length,
    verified: receipts.filter(r => r.status === 'verified').length,
    rejected: receipts.filter(r => r.status === 'rejected').length,
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'pending': return 'yellow';
      case 'verified': return 'green';
      case 'rejected': return 'red';
      default: return 'slate';
    }
  };

  return (
    <div className="flex-1 flex flex-col overflow-hidden">
      {/* Filter Tabs */}
      <div className="px-4 py-3 border-b border-gray-200">
        <div className="flex gap-2">
          {[
            { key: 'all', label: 'All' },
            { key: 'pending', label: 'Pending' },
            { key: 'verified', label: 'Verified' },
            { key: 'rejected', label: 'Rejected' },
          ].map(({ key, label }) => (
            <button
              key={key}
              onClick={() => setFilter(key)}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                filter === key
                  ? 'bg-blue-600 text-white'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              {label} ({counts[key]})
            </button>
          ))}
        </div>
      </div>

      {/* Receipts Grid */}
      <div className="flex-1 overflow-y-auto p-4">
        {loading ? (
          <div className="flex items-center justify-center h-full">
            <Spinner size="lg" />
          </div>
        ) : filteredReceipts.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-center">
            <Icon.Receipt className="w-16 h-16 text-gray-400 mb-4" />
            <p className="text-gray-600">No {filter !== 'all' ? filter : ''} receipts found</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {filteredReceipts.map((receipt) => (
              <div
                key={receipt.id}
                className="glass-card hover:shadow-lg transition-shadow cursor-pointer"
                onClick={() => setSelectedReceipt(receipt)}
              >
                {/* Receipt Header */}
                <div className="p-3 border-b border-gray-200 bg-gray-50/50">
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-sm font-semibold text-gray-900">
                      Table {receipt.table_id}
                    </span>
                    <Badge tone={getStatusColor(receipt.status)} size="xs">
                      {receipt.status}
                    </Badge>
                  </div>
                  <div className="text-xs text-gray-600">
                    {new Date(receipt.created_at).toLocaleString()}
                  </div>
                </div>

                {/* Receipt Image */}
                <div className="p-3">
                  <img
                    src={receipt.receipt_image_url}
                    alt="Payment Receipt"
                    className="w-full h-32 object-contain bg-gray-50 rounded border border-gray-200"
                  />
                </div>

                {/* Receipt Details */}
                <div className="px-3 pb-3 space-y-1 text-xs">
                  <div className="flex justify-between">
                    <span className="text-gray-600">Amount:</span>
                    <span className="font-semibold text-gray-900">{formatNPR(receipt.total_amount)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">Method:</span>
                    <span className="font-medium text-gray-900 capitalize">{receipt.payment_method}</span>
                  </div>
                  {receipt.customer_name && (
                    <div className="flex justify-between">
                      <span className="text-gray-600">Customer:</span>
                      <span className="text-gray-900 truncate ml-2">{receipt.customer_name}</span>
                    </div>
                  )}
                </div>

                {/* Quick Actions */}
                {receipt.status === 'pending' && (
                  <div className="px-3 pb-3 flex gap-2">
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        handleVerifyReceipt(receipt.id, 'verified');
                      }}
                      disabled={isVerifying}
                      className="flex-1 bg-green-600 text-white py-1.5 px-2 rounded text-xs font-medium hover:bg-green-700 disabled:opacity-50"
                    >
                      ✓
                    </button>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        handleVerifyReceipt(receipt.id, 'rejected');
                      }}
                      disabled={isVerifying}
                      className="flex-1 bg-red-600 text-white py-1.5 px-2 rounded text-xs font-medium hover:bg-red-700 disabled:opacity-50"
                    >
                      ✕
                    </button>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Receipt Detail Modal */}
      {selectedReceipt && (
        <Modal
          onClose={() => {
            setSelectedReceipt(null);
            setVerifyNotes('');
          }}
          title={`Receipt - Table ${selectedReceipt.table_id}`}
        >
          <div className="space-y-4">
            <img
              src={selectedReceipt.receipt_image_url}
              alt="Payment Receipt"
              className="w-full max-h-96 object-contain bg-gray-50 rounded border border-gray-200"
            />

            <div className="grid grid-cols-2 gap-3">
              <div>
                <div className="text-xs text-gray-600">Amount</div>
                <div className="text-sm font-semibold">{formatNPR(selectedReceipt.total_amount)}</div>
              </div>
              <div>
                <div className="text-xs text-gray-600">Method</div>
                <div className="text-sm font-semibold capitalize">{selectedReceipt.payment_method}</div>
              </div>
              <div>
                <div className="text-xs text-gray-600">Status</div>
                <div className="text-sm">
                  <Badge tone={getStatusColor(selectedReceipt.status)}>
                    {selectedReceipt.status}
                  </Badge>
                </div>
              </div>
              <div>
                <div className="text-xs text-gray-600">Submitted</div>
                <div className="text-sm">{new Date(selectedReceipt.created_at).toLocaleString()}</div>
              </div>
              {selectedReceipt.customer_name && (
                <div>
                  <div className="text-xs text-gray-600">Customer</div>
                  <div className="text-sm">{selectedReceipt.customer_name}</div>
                </div>
              )}
              {selectedReceipt.customer_phone && (
                <div>
                  <div className="text-xs text-gray-600">Phone</div>
                  <div className="text-sm">{selectedReceipt.customer_phone}</div>
                </div>
              )}
            </div>

            {selectedReceipt.status === 'pending' && (
              <div className="space-y-3 pt-4 border-t border-gray-200">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Notes (Optional)
                  </label>
                  <textarea
                    value={verifyNotes}
                    onChange={(e) => setVerifyNotes(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm"
                    rows="2"
                    placeholder="Add any notes..."
                  />
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={() => handleVerifyReceipt(selectedReceipt.id, 'verified')}
                    disabled={isVerifying}
                    className="flex-1 bg-green-600 text-white py-2 px-4 rounded-lg font-medium hover:bg-green-700 disabled:opacity-50"
                  >
                    ✓ Verify Payment
                  </button>
                  <button
                    onClick={() => handleVerifyReceipt(selectedReceipt.id, 'rejected')}
                    disabled={isVerifying}
                    className="flex-1 bg-red-600 text-white py-2 px-4 rounded-lg font-medium hover:bg-red-700 disabled:opacity-50"
                  >
                    ✕ Reject Payment
                  </button>
                </div>
              </div>
            )}

            {selectedReceipt.status !== 'pending' && selectedReceipt.verified_at && (
              <div className="pt-4 border-t border-gray-200 text-sm text-gray-600">
                {selectedReceipt.status === 'verified' ? 'Verified' : 'Rejected'}
                {selectedReceipt.verified_at && ` on ${new Date(selectedReceipt.verified_at).toLocaleString()}`}
                {selectedReceipt.notes && (
                  <div className="mt-2 text-xs">
                    <span className="font-medium">Notes:</span> {selectedReceipt.notes}
                  </div>
                )}
              </div>
            )}
          </div>
        </Modal>
      )}
    </div>
  );
};

/* ============================================================
   QR Settings Management
   ============================================================ */
// eslint-disable-next-line no-unused-vars
const QRSettings = ({ pushToast }) => {
  const [qrCodes, setQrCodes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showUploadModal, setShowUploadModal] = useState(false);
  const [uploadForm, setUploadForm] = useState({ paymentMethod: '', label: '', file: null });
  const [uploading, setUploading] = useState(false);
  const [deleteConfirm, setDeleteConfirm] = useState(null);

  const paymentMethods = ['phonepe', 'gpay', 'paytm', 'esewa', 'khalti', 'fonepay'];

  useEffect(() => {
    fetchQRCodes();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const fetchQRCodes = async () => {
    try {
      setLoading(true);
      const response = await fetch('/api/payment-qr/qr-codes');
      const data = await response.json();
      if (data.success) {
        setQrCodes(data.qrCodes);
      }
    } catch (error) {
      console.error('Failed to fetch QR codes:', error);
      pushToast('Failed to load QR codes', 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleUpload = async () => {
    if (!uploadForm.paymentMethod || !uploadForm.label || !uploadForm.file) {
      pushToast('Please fill all fields and select an image', 'error');
      return;
    }

    setUploading(true);
    try {
      const formData = new FormData();
      formData.append('qrImage', uploadForm.file);
      formData.append('paymentMethod', uploadForm.paymentMethod);
      formData.append('label', uploadForm.label);

      const response = await fetch('/api/payment-qr/qr-codes', {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${localStorage.getItem('adminToken')}` },
        body: formData
      });

      const data = await response.json();
      if (data.success) {
        await fetchQRCodes();
        setShowUploadModal(false);
        setUploadForm({ paymentMethod: '', label: '', file: null });
        pushToast('QR code uploaded successfully', 'success');
      } else {
        throw new Error(data.error);
      }
    } catch (error) {
      console.error('Failed to upload QR code:', error);
      pushToast('Failed to upload QR code', 'error');
    } finally {
      setUploading(false);
    }
  };

  const handleDelete = async (qrId) => {
    setDeleteConfirm(qrId);
  };

  const confirmDelete = async () => {
    if (!deleteConfirm) return;

    try {
      const response = await fetch(`/api/payment-qr/qr-codes/${deleteConfirm}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${localStorage.getItem('adminToken')}` }
      });

      const data = await response.json();
      if (data.success) {
        await fetchQRCodes();
        pushToast('QR code deleted successfully', 'success');
      }
    } catch (error) {
      console.error('Failed to delete QR code:', error);
      pushToast('Failed to delete QR code', 'error');
    } finally {
      setDeleteConfirm(null);
    }
  };

  if (loading) {
    return (
      <div className="glass-card flex-1 flex items-center justify-center">
        <Spinner size="lg" />
      </div>
    );
  }

  return (
    <div className="glass-card flex-1 flex flex-col min-h-0 overflow-hidden">
      <div className="p-4 border-b border-gray-200">
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-semibold text-gray-900">Payment QR Codes</h3>
          <button
            onClick={() => setShowUploadModal(true)}
            className="bg-blue-600 text-white px-4 py-2 rounded-lg font-medium hover:bg-blue-700 transition-colors"
          >
            + Add QR Code
          </button>
        </div>
        <p className="text-sm text-gray-600 mt-1">
          Manage QR codes for different payment methods. These will be shown to customers during checkout.
        </p>
      </div>

      <div className="flex-1 overflow-y-auto p-4">
        {qrCodes.length === 0 ? (
          <div className="text-center py-12">
            <div className="text-gray-400 mb-4">
              <Icon.QrCode className="w-16 h-16 mx-auto" />
            </div>
            <h3 className="text-lg font-medium text-gray-900 mb-2">No QR Codes</h3>
            <p className="text-gray-600 mb-4">Upload QR codes for different payment methods to enable digital payments.</p>
            <button
              onClick={() => setShowUploadModal(true)}
              className="bg-blue-600 text-white px-4 py-2 rounded-lg font-medium hover:bg-blue-700 transition-colors"
            >
              Add Your First QR Code
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {qrCodes.map((qr) => (
              <div key={qr.id} className="bg-white border border-gray-200 rounded-lg p-4 hover:shadow-md transition-shadow">
                <div className="text-center mb-3">
                  <img src={qr.qr_image_url} alt={qr.label} className="w-32 h-32 mx-auto object-contain border border-gray-200 rounded" />
                </div>
                
                <div className="space-y-2 text-sm">
                  <div><span className="text-gray-600">Method:</span><span className="ml-2 font-medium capitalize">{qr.payment_method}</span></div>
                  <div><span className="text-gray-600">Label:</span><span className="ml-2 font-medium">{qr.label}</span></div>
                </div>

                <div className="mt-4 pt-3 border-t border-gray-100">
                  <button
                    onClick={() => handleDelete(qr.id)}
                    className="w-full bg-red-50 text-red-600 py-2 px-3 rounded-lg text-sm font-medium hover:bg-red-100 transition-colors"
                  >
                    Delete QR Code
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {showUploadModal && (
        <Modal
          title="Add Payment QR Code"
          onClose={() => {
            setShowUploadModal(false);
            setUploadForm({ paymentMethod: '', label: '', file: null });
          }}
          narrow
        >
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Payment Method</label>
              <select
                value={uploadForm.paymentMethod}
                onChange={(e) => setUploadForm(prev => ({ ...prev, paymentMethod: e.target.value }))}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              >
                <option value="">Select payment method</option>
                {paymentMethods.map((method) => (
                  <option key={method} value={method}>{method.charAt(0).toUpperCase() + method.slice(1)}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Label</label>
              <input
                type="text"
                value={uploadForm.label}
                onChange={(e) => setUploadForm(prev => ({ ...prev, label: e.target.value }))}
                placeholder="e.g., Main Account, Business Account"
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">QR Code Image</label>
              <input
                type="file"
                accept="image/*"
                onChange={(e) => setUploadForm(prev => ({ ...prev, file: e.target.files[0] }))}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              />
            </div>

            <div className="flex space-x-3 pt-4">
              <button
                onClick={() => {
                  setShowUploadModal(false);
                  setUploadForm({ paymentMethod: '', label: '', file: null });
                }}
                className="flex-1 bg-gray-200 text-gray-700 py-2 px-4 rounded-lg font-medium hover:bg-gray-300 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleUpload}
                disabled={uploading || !uploadForm.paymentMethod || !uploadForm.label || !uploadForm.file}
                className={`flex-1 py-2 px-4 rounded-lg font-medium transition-colors ${
                  uploading || !uploadForm.paymentMethod || !uploadForm.label || !uploadForm.file
                    ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
                    : 'bg-blue-600 text-white hover:bg-blue-700'
                }`}
              >
                {uploading ? 'Uploading...' : 'Upload QR Code'}
              </button>
            </div>
          </div>
        </Modal>
      )}

      {/* Delete Confirmation Modal */}
      {deleteConfirm && (
        <Modal
          title="Delete QR Code"
          onClose={() => setDeleteConfirm(null)}
          narrow
        >
          <p className="text-sm text-gray-600 mb-6">
            Are you sure you want to delete this QR code? This action cannot be undone.
          </p>
          <div className="flex space-x-3">
            <button
              onClick={() => setDeleteConfirm(null)}
              className="flex-1 bg-gray-200 text-gray-700 py-2 px-4 rounded-lg font-medium hover:bg-gray-300 transition-colors"
            >
              Cancel
            </button>
            <button
              onClick={confirmDelete}
              className="flex-1 bg-red-600 text-white py-2 px-4 rounded-lg font-medium hover:bg-red-700 transition-colors"
            >
              Delete QR Code
            </button>
          </div>
        </Modal>
      )}
    </div>
  );
};

const MiniStat = ({ label, value, Icon: IconC, tone = 'slate', sub, compact }) => {
  const tones = {
    slate: { bg: 'bg-gradient-to-br from-slate-400 to-slate-500', glow: '0 4px 12px -4px rgba(100,116,139,0.35)' },
    indigo: { bg: 'bg-gradient-to-br from-indigo-500 to-violet-600', glow: 'var(--glow-indigo)' },
    rose: { bg: 'bg-gradient-to-br from-rose-500 to-pink-600', glow: 'var(--glow-rose)' },
    emerald: { bg: 'bg-gradient-to-br from-emerald-500 to-teal-600', glow: 'var(--glow-emerald)' },
    green: { bg: 'bg-gradient-to-br from-emerald-500 to-teal-600', glow: 'var(--glow-emerald)' },
    yellow: { bg: 'bg-gradient-to-br from-amber-500 to-orange-600', glow: 'var(--glow-amber)' },
    blue: { bg: 'bg-gradient-to-br from-sky-500 to-blue-600', glow: '0 8px 20px -4px rgba(14,165,233,0.45)' },
    red: { bg: 'bg-gradient-to-br from-rose-500 to-pink-600', glow: 'var(--glow-rose)' },
    violet: { bg: 'bg-gradient-to-br from-violet-500 to-purple-600', glow: 'var(--glow-violet)' },
  };
  const t = tones[tone] || tones.slate;
  return (
    <div className={`glass-card ${compact ? 'p-4' : 'p-5'}`}>
      <div className="flex items-center justify-between">
        <div className="min-w-0">
          <p className="text-[11px] text-slate-500 font-semibold uppercase tracking-wider">{label}</p>
          <p className={`font-semibold text-slate-900 tracking-tight tabular-nums ${compact ? 'text-lg mt-1.5' : 'text-2xl mt-2'}`}>{value}</p>
          {sub && <p className="text-[11px] text-slate-400 mt-0.5">{sub}</p>}
        </div>
        {IconC && (
          <div className={`${compact ? 'w-9 h-9' : 'w-10 h-10'} rounded-xl flex items-center justify-center text-white ${t.bg}`} style={{ boxShadow: t.glow }}>
            <IconC className="w-4 h-4" />
          </div>
        )}
      </div>
    </div>
  );
};

const Modal = ({ title, subtitle, children, onClose, narrow }) => (
  <div className="fixed inset-0 z-50 flex items-center justify-center p-4 glass-overlay fz-fade-in" onClick={onClose}>
    <div
      className={`glass-modal w-full ${narrow ? 'max-w-md' : 'max-w-2xl'} max-h-[90vh] overflow-y-auto fz-scale-in fz-scroll`}
      onClick={(e) => e.stopPropagation()}
    >
      <div className="px-6 py-5 border-b border-slate-200/60 flex items-start justify-between">
        <div>
          <h2 className="text-base font-semibold text-slate-900 tracking-tight">{title}</h2>
          {subtitle && <p className="text-xs text-slate-500 mt-0.5">{subtitle}</p>}
        </div>
        <button onClick={onClose} className="w-8 h-8 rounded-lg text-slate-400 hover:bg-slate-100 hover:text-slate-900 flex items-center justify-center transition">
          <Icon.X className="w-4 h-4" />
        </button>
      </div>
      <div className="p-6">{children}</div>
    </div>
  </div>
);

/* ============================================================
   Customers Management
   ============================================================ */
const CustomersManagement = ({ customers, orders }) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCustomer, setSelectedCustomer] = useState(null);
  const [sortBy, setSortBy] = useState('recent');

  const getStats = (c) => {
    const co = orders.filter((o) => 
      (c.name && o.customer_name === c.name) || 
      (c.phone && o.customer_phone === c.phone)
    );
    const totalSpent = co.reduce((s, o) => s + (o.total_amount || (o.items?.reduce((x, i) => x + i.price * i.quantity, 0) || 0)), 0);
    const lastOrderDate = co.length ? Math.max(...co.map((o) => new Date(o.created_at).getTime())) : null;
    return { totalOrders: co.length, totalSpent, lastOrderDate, orders: co };
  };

  const filtered = customers
    .filter((c) =>
      c.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      c.phone?.includes(searchTerm) ||
      c.email?.toLowerCase().includes(searchTerm.toLowerCase())
    )
    .sort((a, b) => {
      const A = getStats(a), B = getStats(b);
      switch (sortBy) {
        case 'name': return a.name.localeCompare(b.name);
        case 'orders': return B.totalOrders - A.totalOrders;
        case 'spent': return B.totalSpent - A.totalSpent;
        default: return (B.lastOrderDate || 0) - (A.lastOrderDate || 0);
      }
    });

  const totalRevenue = customers.reduce((s, c) => s + getStats(c).totalSpent, 0);
  const avg = totalRevenue / Math.max(orders.length, 1);
  const activeToday = customers.filter((c) => {
    const s = getStats(c);
    return s.lastOrderDate && new Date(s.lastOrderDate).toDateString() === new Date().toDateString();
  }).length;

  return (
    <div className="h-[calc(100vh-52px)] flex flex-col overflow-hidden">
      {/* Compact Horizontal Stats Bar */}
      <div className="glass-card-flat px-4 py-2 mb-3 flex items-center justify-between">
        <div className="flex items-center gap-6">
          <div className="flex items-center gap-2">
            <Icon.Customers className="w-4 h-4 text-indigo-500" />
            <span className="text-xs text-slate-500">Total customers</span>
            <span className="text-sm font-bold text-slate-900">{customers.length}</span>
          </div>
          <div className="w-px h-4 bg-slate-200"></div>
          <div className="flex items-center gap-2">
            <Icon.Wallet className="w-4 h-4 text-emerald-500" />
            <span className="text-xs text-slate-500">Lifetime revenue</span>
            <span className="text-sm font-bold text-slate-900">{formatNPR(totalRevenue)}</span>
          </div>
          <div className="w-px h-4 bg-slate-200"></div>
          <div className="flex items-center gap-2">
            <Icon.Trend className="w-4 h-4 text-violet-500" />
            <span className="text-xs text-slate-500">Avg order value</span>
            <span className="text-sm font-bold text-slate-900">{formatNPR(Math.round(avg))}</span>
          </div>
          <div className="w-px h-4 bg-slate-200"></div>
          <div className="flex items-center gap-2">
            <Icon.Sparkles className="w-4 h-4 text-yellow-500" />
            <span className="text-xs text-slate-500">Active today</span>
            <span className="text-sm font-bold text-slate-900">{activeToday}</span>
          </div>
        </div>
        <div className="text-xs text-slate-400">
          {filtered.length} result{filtered.length !== 1 ? 's' : ''}
        </div>
      </div>

      {/* Customer Directory with Fixed Height */}
      <div className="glass-card flex-1 flex flex-col overflow-hidden">
        {/* Filter Bar */}
        <div className="px-4 py-3 border-b border-slate-200/60 flex items-center justify-between gap-3 flex-shrink-0">
          <div className="relative flex-1 max-w-md">
            <Icon.Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              placeholder="Search by name, phone, email"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="h-8 pl-9 pr-3 rounded-lg bg-white/70 ring-1 ring-slate-200 focus:ring-2 focus:ring-indigo-400 focus:bg-white text-sm outline-none w-full transition"
            />
          </div>
          <select
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value)}
            className="h-8 px-3 rounded-lg bg-white/70 ring-1 ring-slate-200 text-xs outline-none focus:ring-2 focus:ring-indigo-400 transition"
          >
            <option value="recent">Recent activity</option>
            <option value="name">Name (A–Z)</option>
            <option value="orders">Most orders</option>
            <option value="spent">Highest spent</option>
          </select>
        </div>

        {/* Customer Table with Internal Scrolling */}
        <div className="flex-1 overflow-y-auto fz-scroll">
          {filtered.length === 0 ? (
            <div className="py-16 text-center">
              <Icon.Customers className="w-10 h-10 mx-auto text-slate-300" />
              <p className="mt-3 text-sm text-slate-500">{searchTerm ? `No customers match "${searchTerm}"` : 'No customers yet'}</p>
            </div>
          ) : (
            <table className="w-full">
              <thead className="sticky top-0 bg-slate-50/90 backdrop-blur-sm z-10">
                <tr className="text-[11px] uppercase tracking-wider text-slate-500 border-b border-slate-200/60">
                  <th className="text-left font-semibold px-4 py-2">Customer</th>
                  <th className="text-right font-semibold px-4 py-2">Orders</th>
                  <th className="text-right font-semibold px-4 py-2">Spent</th>
                  <th className="text-right font-semibold px-4 py-2">Last activity</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100/80">
                {filtered.map((c) => {
                  const s = getStats(c);
                  return (
                    <tr key={c.id} onClick={() => setSelectedCustomer(c)} className="hover:bg-slate-50/70 cursor-pointer transition">
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2">
                          <div className="w-8 h-8 rounded-full ring-gradient text-white flex items-center justify-center text-xs font-bold">
                            {c.name?.charAt(0).toUpperCase() || '?'}
                          </div>
                          <div className="min-w-0">
                            <div className="text-sm font-medium text-slate-900 truncate">{c.name}</div>
                            <div className="text-xs text-slate-500 truncate">{c.phone}{c.email ? ` · ${c.email}` : ''}</div>
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-3 text-right text-sm font-mono text-slate-900 tabular-nums">{s.totalOrders}</td>
                      <td className="px-4 py-3 text-right text-sm font-mono font-semibold text-slate-900 tabular-nums">{formatNPR(s.totalSpent)}</td>
                      <td className="px-4 py-3 text-right text-sm text-slate-600">
                        {s.lastOrderDate ? new Date(s.lastOrderDate).toLocaleDateString() : <span className="text-slate-400">Never</span>}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </div>
      </div>

      {selectedCustomer && (
        <Modal onClose={() => setSelectedCustomer(null)} title={selectedCustomer.name} subtitle={`${selectedCustomer.phone}${selectedCustomer.email ? ` · ${selectedCustomer.email}` : ''}`}>
          {(() => {
            const s = getStats(selectedCustomer);
            return (
              <div className="space-y-6">
                <div className="grid grid-cols-3 gap-3">
                  <MiniStat label="Orders" value={s.totalOrders} tone="indigo" compact />
                  <MiniStat label="Spent" value={formatNPR(s.totalSpent)} tone="emerald" compact />
                  <MiniStat label="Avg order" value={formatNPR(s.totalOrders ? Math.round(s.totalSpent / s.totalOrders) : 0)} tone="violet" compact />
                </div>
                <div>
                  <h4 className="text-sm font-semibold text-slate-900 mb-3">Order history</h4>
                  {s.orders.length === 0 ? (
                    <p className="text-sm text-slate-500 text-center py-6">No orders yet.</p>
                  ) : (
                    <div className="space-y-2 max-h-80 overflow-y-auto fz-scroll">
                      {s.orders.sort((a, b) => new Date(b.created_at) - new Date(a.created_at)).map((o) => (
                        <div key={o.id} className="rounded-xl ring-1 ring-slate-200/80 bg-white/70 p-3 flex items-center justify-between">
                          <div className="min-w-0">
                            <div className="text-sm font-medium text-slate-900">{o.order_type === 'dine-in' ? `Table ${o.table_id}` : 'Delivery'}</div>
                            <div className="text-xs text-slate-500">{new Date(o.created_at).toLocaleString()} · {o.items?.length || 0} items</div>
                          </div>
                          <div className="flex items-center gap-2">
                            <span className="font-mono text-sm font-semibold tabular-nums">{formatNPR(o.total_amount)}</span>
                            <Badge tone={statusTone(o.status)}>{o.status}</Badge>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            );
          })()}
        </Modal>
      )}
    </div>
  );
};

/* ============================================================
   Reports View
   ============================================================ */
// eslint-disable-next-line no-unused-vars
const ReportsView = ({ orders, customers }) => {
  const [activeReport, setActiveReport] = useState('orders');
  const [dateRange, setDateRange] = useState('today');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');

  const reports = [
    { id: 'orders', label: 'Order Report', Icon: Icon.Orders },
    { id: 'customers', label: 'Customer Report', Icon: Icon.Customers },
    { id: 'profit', label: 'Profit & Loss', Icon: Icon.Wallet },
  ];

  const getFilteredOrders = () => {
    const now = new Date();
    let start;
    
    if (startDate && endDate) {
      start = new Date(startDate);
      const end = new Date(endDate);
      end.setHours(23, 59, 59, 999);
      return orders.filter((o) => {
        const od = new Date(o.created_at);
        return od >= start && od <= end;
      });
    }
    
    switch (dateRange) {
      case 'today': start = new Date(now.getFullYear(), now.getMonth(), now.getDate()); break;
      case 'week': start = new Date(now.getTime() - 7 * 86400000); break;
      case 'month': start = new Date(now.getFullYear(), now.getMonth(), 1); break;
      case 'year': start = new Date(now.getFullYear(), 0, 1); break;
      default: start = new Date(0);
    }
    return orders.filter((o) => new Date(o.created_at) >= start);
  };

  const filteredOrders = getFilteredOrders();

  const exportCSV = (data, filename) => {
    const csv = data.map((r) => r.join(',')).join('\n');
    const url = URL.createObjectURL(new Blob([csv], { type: 'text/csv' }));
    const a = document.createElement('a');
    a.href = url; a.download = `${filename}-${new Date().toISOString().split('T')[0]}.csv`;
    document.body.appendChild(a); a.click(); document.body.removeChild(a); URL.revokeObjectURL(url);
  };

  const renderOrderReport = () => {
    const totalRevenue = filteredOrders.reduce((s, o) => s + (o.total_amount || 0), 0);
    const avgOrder = filteredOrders.length ? totalRevenue / filteredOrders.length : 0;
    const byStatus = filteredOrders.reduce((acc, o) => { acc[o.status] = (acc[o.status] || 0) + 1; return acc; }, {});
    const byType = filteredOrders.reduce((acc, o) => { acc[o.order_type || 'unknown'] = (acc[o.order_type || 'unknown'] || 0) + 1; return acc; }, {});

    return (
      <div className="space-y-4">
        <div className="grid grid-cols-4 gap-3">
          <MiniStat label="Total Orders" value={filteredOrders.length} Icon={Icon.Orders} tone="indigo" />
          <MiniStat label="Total Revenue" value={formatNPR(totalRevenue)} Icon={Icon.Wallet} tone="emerald" />
          <MiniStat label="Avg Order" value={formatNPR(Math.round(avgOrder))} Icon={Icon.Trend} tone="violet" />
          <MiniStat label="Completed" value={byStatus.completed || 0} Icon={Icon.Check} tone="green" />
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div className="glass-card p-5">
            <h3 className="text-sm font-semibold text-slate-900 mb-4">By Status</h3>
            <div className="space-y-2">
              {Object.entries(byStatus).map(([status, count]) => (
                <div key={status} className="flex items-center justify-between text-sm">
                  <span className="capitalize text-slate-700">{status}</span>
                  <Badge tone={statusTone(status)} size="sm">{count}</Badge>
                </div>
              ))}
            </div>
          </div>

          <div className="glass-card p-5">
            <h3 className="text-sm font-semibold text-slate-900 mb-4">By Type</h3>
            <div className="space-y-2">
              {Object.entries(byType).map(([type, count]) => (
                <div key={type} className="flex items-center justify-between text-sm">
                  <span className="capitalize text-slate-700">{type.replace('-', ' ')}</span>
                  <Badge tone={type === 'dine-in' ? 'violet' : 'amber'} size="sm">{count}</Badge>
                </div>
              ))}
            </div>
          </div>
        </div>

        <div className="glass-card p-5">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-sm font-semibold text-slate-900">Order Details</h3>
            <button
              onClick={() => {
                const data = [
                  ['Order #', 'Date', 'Customer', 'Type', 'Status', 'Amount'],
                  ...filteredOrders.map((o) => [
                    o.order_number || o.id,
                    new Date(o.created_at).toLocaleDateString(),
                    o.customer_name || 'Guest',
                    o.order_type || 'unknown',
                    o.status,
                    o.total_amount || 0
                  ])
                ];
                exportCSV(data, 'order-report');
              }}
              className="btn-ghost inline-flex items-center gap-1.5 h-8 px-3 rounded-lg text-xs font-medium"
            >
              <Icon.Download className="w-3.5 h-3.5" /> Export CSV
            </button>
          </div>
          <div className="max-h-96 overflow-y-auto fz-scroll">
            <table className="w-full text-sm">
              <thead className="sticky top-0 bg-slate-50 text-xs text-slate-600 uppercase">
                <tr>
                  <th className="px-3 py-2 text-left">Order #</th>
                  <th className="px-3 py-2 text-left">Date</th>
                  <th className="px-3 py-2 text-left">Customer</th>
                  <th className="px-3 py-2 text-left">Type</th>
                  <th className="px-3 py-2 text-left">Status</th>
                  <th className="px-3 py-2 text-right">Amount</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredOrders.slice(0, 100).map((o) => (
                  <tr key={o.id} className="hover:bg-slate-50/50">
                    <td className="px-3 py-2 font-mono text-xs">{o.order_number || o.id}</td>
                    <td className="px-3 py-2 text-slate-600">{new Date(o.created_at).toLocaleDateString()}</td>
                    <td className="px-3 py-2">{o.customer_name || 'Guest'}</td>
                    <td className="px-3 py-2 capitalize">{o.order_type || 'unknown'}</td>
                    <td className="px-3 py-2"><Badge tone={statusTone(o.status)} size="xs">{o.status}</Badge></td>
                    <td className="px-3 py-2 text-right font-mono tabular-nums">{formatNPR(o.total_amount || 0)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    );
  };

  const renderCustomerReport = () => {
    const customerStats = customers.map((c) => {
      const customerOrders = filteredOrders.filter((o) => 
        (c.phone && o.customer_phone === c.phone) || 
        (c.name && o.customer_name === c.name)
      );
      const totalSpent = customerOrders.reduce((s, o) => s + (o.total_amount || 0), 0);
      return { ...c, orderCount: customerOrders.length, totalSpent };
    }).filter((c) => c.orderCount > 0).sort((a, b) => b.totalSpent - a.totalSpent);

    const totalCustomers = customerStats.length;
    const totalRevenue = customerStats.reduce((s, c) => s + c.totalSpent, 0);
    const avgSpent = totalCustomers ? totalRevenue / totalCustomers : 0;

    return (
      <div className="space-y-4">
        <div className="grid grid-cols-4 gap-3">
          <MiniStat label="Active Customers" value={totalCustomers} Icon={Icon.Customers} tone="indigo" />
          <MiniStat label="Total Revenue" value={formatNPR(totalRevenue)} Icon={Icon.Wallet} tone="emerald" />
          <MiniStat label="Avg Spent" value={formatNPR(Math.round(avgSpent))} Icon={Icon.Trend} tone="violet" />
          <MiniStat label="Total Orders" value={filteredOrders.length} Icon={Icon.Orders} tone="amber" />
        </div>

        <div className="glass-card p-5">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-sm font-semibold text-slate-900">Customer Details</h3>
            <button
              onClick={() => {
                const data = [
                  ['Name', 'Phone', 'Orders', 'Total Spent', 'Avg Order'],
                  ...customerStats.map((c) => [
                    c.name,
                    c.phone,
                    c.orderCount,
                    c.totalSpent,
                    Math.round(c.totalSpent / c.orderCount)
                  ])
                ];
                exportCSV(data, 'customer-report');
              }}
              className="btn-ghost inline-flex items-center gap-1.5 h-8 px-3 rounded-lg text-xs font-medium"
            >
              <Icon.Download className="w-3.5 h-3.5" /> Export CSV
            </button>
          </div>
          <div className="max-h-96 overflow-y-auto fz-scroll">
            <table className="w-full text-sm">
              <thead className="sticky top-0 bg-slate-50 text-xs text-slate-600 uppercase">
                <tr>
                  <th className="px-3 py-2 text-left">Customer</th>
                  <th className="px-3 py-2 text-left">Phone</th>
                  <th className="px-3 py-2 text-right">Orders</th>
                  <th className="px-3 py-2 text-right">Total Spent</th>
                  <th className="px-3 py-2 text-right">Avg Order</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {customerStats.slice(0, 100).map((c, i) => (
                  <tr key={i} className="hover:bg-slate-50/50">
                    <td className="px-3 py-2 font-medium">{c.name}</td>
                    <td className="px-3 py-2 text-slate-600 font-mono text-xs">{c.phone}</td>
                    <td className="px-3 py-2 text-right tabular-nums">{c.orderCount}</td>
                    <td className="px-3 py-2 text-right font-mono tabular-nums">{formatNPR(c.totalSpent)}</td>
                    <td className="px-3 py-2 text-right font-mono tabular-nums">{formatNPR(Math.round(c.totalSpent / c.orderCount))}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    );
  };

  const renderProfitLoss = () => {
    const totalRevenue = filteredOrders.reduce((s, o) => s + (o.total_amount || 0), 0);
    // Estimate costs at 40% of revenue (adjust based on your actual costs)
    const estimatedCosts = totalRevenue * 0.4;
    const grossProfit = totalRevenue - estimatedCosts;
    const profitMargin = totalRevenue ? ((grossProfit / totalRevenue) * 100).toFixed(1) : 0;

    const dailyData = [];
    const now = new Date();
    for (let i = 6; i >= 0; i--) {
      const d = new Date(now.getTime() - i * 86400000);
      const ds = new Date(d.getFullYear(), d.getMonth(), d.getDate());
      const de = new Date(ds.getTime() + 86400000);
      const dayOrders = filteredOrders.filter((o) => { const od = new Date(o.created_at); return od >= ds && od < de; });
      const rev = dayOrders.reduce((s, o) => s + (o.total_amount || 0), 0);
      const cost = rev * 0.4;
      dailyData.push({ date: d.toLocaleDateString('en-US', { weekday: 'short' }), revenue: rev, cost, profit: rev - cost });
    }

    return (
      <div className="space-y-4">
        <div className="grid grid-cols-4 gap-3">
          <MiniStat label="Total Revenue" value={formatNPR(totalRevenue)} Icon={Icon.Wallet} tone="indigo" />
          <MiniStat label="Est. Costs" value={formatNPR(Math.round(estimatedCosts))} Icon={Icon.Trend} tone="rose" />
          <MiniStat label="Gross Profit" value={formatNPR(Math.round(grossProfit))} Icon={Icon.Check} tone="emerald" />
          <MiniStat label="Profit Margin" value={`${profitMargin}%`} Icon={Icon.Analytics} tone="violet" />
        </div>

        <div className="glass-card p-5">
          <h3 className="text-sm font-semibold text-slate-900 mb-4">Daily Profit Trend (Last 7 Days)</h3>
          <div className="flex items-end gap-3 h-48">
            {dailyData.map((d, i) => {
              const maxVal = Math.max(...dailyData.map((x) => x.revenue));
              return (
                <div key={i} className="flex-1 flex flex-col items-center gap-2 group">
                  <div className="relative w-full flex-1 flex items-end">
                    <div
                      className="w-full rounded-lg bg-gradient-to-t from-emerald-600 via-emerald-500 to-teal-400 transition-all duration-700"
                      style={{
                        height: `${Math.max(6, (d.profit / maxVal) * 100)}%`,
                        boxShadow: '0 8px 20px -4px rgba(16,185,129,0.5)'
                      }}
                    />
                    <div className="absolute -top-16 left-1/2 -translate-x-1/2 bg-slate-900 text-white text-[11px] px-2.5 py-1.5 rounded-lg opacity-0 group-hover:opacity-100 transition pointer-events-none whitespace-nowrap shadow-xl z-10">
                      <div className="font-semibold text-emerald-400">Profit: {formatNPR(d.profit)}</div>
                      <div className="text-slate-400">Revenue: {formatNPR(d.revenue)}</div>
                      <div className="text-slate-400">Cost: {formatNPR(d.cost)}</div>
                    </div>
                  </div>
                  <span className="text-[11px] text-slate-500 font-medium">{d.date}</span>
                </div>
              );
            })}
          </div>
        </div>

        <div className="glass-card p-5">
          <h3 className="text-sm font-semibold text-slate-900 mb-4">Breakdown</h3>
          <div className="space-y-3">
            <div className="flex items-center justify-between p-3 bg-indigo-50 rounded-lg">
              <span className="text-sm font-medium text-slate-700">Total Revenue</span>
              <span className="text-lg font-bold text-indigo-600 tabular-nums">{formatNPR(totalRevenue)}</span>
            </div>
            <div className="flex items-center justify-between p-3 bg-rose-50 rounded-lg">
              <span className="text-sm font-medium text-slate-700">Estimated Costs (40%)</span>
              <span className="text-lg font-bold text-rose-600 tabular-nums">-{formatNPR(Math.round(estimatedCosts))}</span>
            </div>
            <div className="flex items-center justify-between p-3 bg-emerald-50 rounded-lg border-2 border-emerald-200">
              <span className="text-sm font-semibold text-slate-900">Gross Profit</span>
              <span className="text-xl font-bold text-emerald-600 tabular-nums">{formatNPR(Math.round(grossProfit))}</span>
            </div>
          </div>
          <p className="text-xs text-slate-500 mt-4 italic">* Cost estimates are based on 40% of revenue. Update this percentage based on your actual operational costs.</p>
        </div>
      </div>
    );
  };

  return (
    <div className="space-y-4">
      {/* Header with filters */}
      <div className="glass-card p-4">
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
          <div className="flex items-center gap-3">
            {reports.map((r) => (
              <button
                key={r.id}
                onClick={() => setActiveReport(r.id)}
                className={`inline-flex items-center gap-2 px-4 h-9 rounded-lg text-sm font-medium transition-all ${
                  activeReport === r.id ? 'btn-dark' : 'btn-ghost'
                }`}
              >
                <r.Icon className="w-4 h-4" />
                {r.label}
              </button>
            ))}
          </div>

          <div className="flex items-center gap-2">
            <div className="inline-flex bg-white/70 ring-1 ring-slate-200/80 rounded-lg p-0.5">
              {['today', 'week', 'month', 'year'].map((r) => (
                <button
                  key={r}
                  onClick={() => { setDateRange(r); setStartDate(''); setEndDate(''); }}
                  className={`px-3 h-7 text-xs font-medium rounded-md capitalize transition-all ${
                    dateRange === r && !startDate ? 'bg-slate-900 text-white' : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  {r === 'today' ? 'Today' : r === 'week' ? '7d' : r === 'month' ? 'Month' : 'Year'}
                </button>
              ))}
            </div>
            <input
              type="date"
              value={startDate}
              onChange={(e) => { setStartDate(e.target.value); setDateRange(''); }}
              className="h-7 px-2 text-xs border border-slate-300 rounded-lg"
            />
            <span className="text-xs text-slate-500">to</span>
            <input
              type="date"
              value={endDate}
              onChange={(e) => { setEndDate(e.target.value); setDateRange(''); }}
              className="h-7 px-2 text-xs border border-slate-300 rounded-lg"
            />
          </div>
        </div>
      </div>

      {/* Report content */}
      {activeReport === 'orders' && renderOrderReport()}
      {activeReport === 'customers' && renderCustomerReport()}
      {activeReport === 'profit' && renderProfitLoss()}
    </div>
  );
};

/* ============================================================
   Analytics
   ============================================================ */
// eslint-disable-next-line no-unused-vars
const AnalyticsView = ({ orders, restaurantInfo }) => {
  const [dateRange, setDateRange] = useState('today');

  const analytics = useMemo(() => {
    const now = new Date();
    let startDate;
    switch (dateRange) {
      case 'today': startDate = new Date(now.getFullYear(), now.getMonth(), now.getDate()); break;
      case 'week': startDate = new Date(now.getTime() - 7 * 86400000); break;
      case 'month': startDate = new Date(now.getFullYear(), now.getMonth(), 1); break;
      case 'year': startDate = new Date(now.getFullYear(), 0, 1); break;
      default: startDate = new Date(0);
    }

    const filtered = orders.filter((o) => new Date(o.created_at) >= startDate);
    const totalRevenue = filtered.reduce((s, o) => s + (o.total_amount || (o.items?.reduce((x, i) => x + i.price * i.quantity, 0) || 0)), 0);
    const totalOrders = filtered.length;
    const avg = totalOrders ? totalRevenue / totalOrders : 0;

    const ordersByStatus = filtered.reduce((acc, o) => { acc[o.status] = (acc[o.status] || 0) + 1; return acc; }, {});
    const ordersByType = filtered.reduce((acc, o) => { acc[o.order_type] = (acc[o.order_type] || 0) + 1; return acc; }, {});

    const daily = [];
    for (let i = 6; i >= 0; i--) {
      const d = new Date(now.getTime() - i * 86400000);
      const ds = new Date(d.getFullYear(), d.getMonth(), d.getDate());
      const de = new Date(ds.getTime() + 86400000);
      const dayOrders = orders.filter((o) => { const od = new Date(o.created_at); return od >= ds && od < de; });
      const rev = dayOrders.reduce((s, o) => s + (o.total_amount || (o.items?.reduce((x, it) => x + it.price * it.quantity, 0) || 0)), 0);
      daily.push({ date: d.toLocaleDateString('en-US', { weekday: 'short' }), revenue: rev, orders: dayOrders.length });
    }

    const itemCounts = {};
    filtered.forEach((o) => {
      (o.items || []).forEach((it) => {
        const n = it.name || it.item_name;
        if (n) itemCounts[n] = (itemCounts[n] || 0) + (it.quantity || 1);
      });
    });
    const popularItems = Object.entries(itemCounts).sort(([, a], [, b]) => b - a).slice(0, 5).map(([name, count]) => ({ name, count }));

    return { totalRevenue, totalOrders, avg, ordersByStatus, ordersByType, daily, popularItems };
  }, [orders, dateRange]);

  const exportCSV = () => {
    const rows = [
      ['Date', 'Revenue', 'Orders'],
      ...analytics.daily.map((d) => [d.date, d.revenue, d.orders]),
      [],
      ['Popular Items', 'Quantity'],
      ...analytics.popularItems.map((i) => [i.name, i.count]),
      [],
      ['Summary'],
      ['Total Revenue', analytics.totalRevenue],
      ['Total Orders', analytics.totalOrders],
      ['Avg Order Value', analytics.avg.toFixed(2)],
    ];
    const csv = rows.map((r) => r.join(',')).join('\n');
    const url = URL.createObjectURL(new Blob([csv], { type: 'text/csv' }));
    const a = document.createElement('a');
    a.href = url; a.download = `foodzone-analytics-${new Date().toISOString().split('T')[0]}.csv`;
    document.body.appendChild(a); a.click(); document.body.removeChild(a); URL.revokeObjectURL(url);
  };

  const maxRev = Math.max(1, ...analytics.daily.map((d) => d.revenue));
  const completionRate = analytics.totalOrders > 0 ? Math.round(((analytics.ordersByStatus.completed || 0) / analytics.totalOrders) * 100) : 0;

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3">
        <div className="inline-flex bg-white/70 ring-1 ring-slate-200/80 rounded-xl p-1 backdrop-blur shadow-sm">
          {['today', 'week', 'month', 'year'].map((r) => (
            <button
              key={r}
              onClick={() => setDateRange(r)}
              className={`px-4 h-8 text-xs font-medium rounded-lg capitalize transition-all ${
                dateRange === r ? 'btn-dark shadow-sm' : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100/60'
              }`}
            >
              {r === 'today' ? 'Today' : r === 'week' ? 'Last 7 days' : r === 'month' ? 'This month' : 'This year'}
            </button>
          ))}
        </div>
        <div className="flex items-center gap-2">
          <button onClick={exportCSV} className="btn-ghost inline-flex items-center gap-1.5 h-9 px-3 rounded-lg text-sm font-medium">
            <Icon.Download className="w-4 h-4" /> CSV
          </button>
          <button onClick={() => window.print()} className="btn-ghost inline-flex items-center gap-1.5 h-9 px-3 rounded-lg text-sm font-medium">
            <Icon.Download className="w-4 h-4" /> PDF
          </button>
          <button onClick={() => {
            const subject = `${restaurantInfo.name} Analytics - ${new Date().toLocaleDateString()}`;
            const body = `Summary%0D%0A- Revenue: ${formatNPR(analytics.totalRevenue)}%0D%0A- Orders: ${analytics.totalOrders}%0D%0A- AOV: ${formatNPR(Math.round(analytics.avg))}`;
            window.location.href = `mailto:?subject=${encodeURIComponent(subject)}&body=${body}`;
          }} className="btn-primary inline-flex items-center gap-1.5 h-9 px-3.5 rounded-lg text-sm font-medium">
            <Icon.Mail className="w-4 h-4" /> Email report
          </button>
        </div>
      </div>

      {/* Gradient KPIs */}
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4">
        <HeroMetric title="Total revenue" value={formatNPR(analytics.totalRevenue)} change="+14% MoM" Icon={Icon.Wallet} tone="indigo" />
        <HeroMetric title="Total orders" value={analytics.totalOrders} change="+6% MoM" Icon={Icon.Orders} tone="emerald" />
        <HeroMetric title="Avg order value" value={formatNPR(Math.round(analytics.avg))} change="+2% MoM" Icon={Icon.Trend} tone="rose" />
        <HeroMetric title="Completion rate" value={`${completionRate}%`} change={`${analytics.ordersByStatus.completed || 0} completed`} Icon={Icon.Check} tone="amber" />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Revenue chart */}
        <div className="lg:col-span-2 glass-card p-6">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h3 className="text-sm font-semibold text-slate-900 tracking-tight">Revenue trend</h3>
              <p className="text-xs text-slate-500 mt-0.5">Last 7 days</p>
            </div>
            <Badge tone="indigo">{formatNPR(analytics.daily.reduce((s, d) => s + d.revenue, 0))}</Badge>
          </div>
          <div className="flex items-end gap-3 h-56">
            {analytics.daily.map((d, i) => (
              <div key={i} className="flex-1 flex flex-col items-center gap-2 group">
                <div className="relative w-full flex-1 flex items-end">
                  <div
                    className="w-full rounded-lg bg-gradient-to-t from-indigo-600 via-indigo-500 to-violet-400 transition-all duration-700 ease-out group-hover:from-indigo-700 group-hover:to-violet-500"
                    style={{
                      height: `${Math.max(6, (d.revenue / maxRev) * 100)}%`,
                      boxShadow: '0 8px 20px -4px rgba(99,102,241,0.5), inset 0 1px 0 0 rgba(255,255,255,0.25)'
                    }}
                  />
                  <div className="absolute -top-14 left-1/2 -translate-x-1/2 bg-slate-900 text-white text-[11px] px-2.5 py-1.5 rounded-lg opacity-0 group-hover:opacity-100 transition pointer-events-none whitespace-nowrap shadow-xl">
                    <div className="font-semibold">{formatNPR(d.revenue)}</div>
                    <div className="text-slate-400">{d.orders} orders</div>
                  </div>
                </div>
                <span className="text-[11px] text-slate-500 font-medium">{d.date}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Popular items */}
        <div className="glass-card p-6">
          <h3 className="text-sm font-semibold text-slate-900 tracking-tight mb-1">Top items</h3>
          <p className="text-xs text-slate-500 mb-4">Most ordered in range</p>
          {analytics.popularItems.length === 0 ? (
            <p className="text-sm text-slate-500 text-center py-8">No data yet.</p>
          ) : (
            <div className="space-y-3.5">
              {analytics.popularItems.map((it, i) => {
                const max = analytics.popularItems[0].count;
                return (
                  <div key={i}>
                    <div className="flex items-center justify-between mb-1.5">
                      <span className="text-sm text-slate-700 truncate">
                        <span className="text-slate-400 mr-1 tabular-nums">{i + 1}.</span>{it.name}
                      </span>
                      <span className="text-xs font-mono text-slate-500 tabular-nums">{it.count}</span>
                    </div>
                    <div className="h-2 rounded-full bg-slate-100/80 overflow-hidden">
                      <div
                        className="h-full rounded-full bg-gradient-to-r from-indigo-500 to-violet-500 transition-all duration-700"
                        style={{
                          width: `${(it.count / max) * 100}%`,
                          boxShadow: '0 2px 6px -1px rgba(99,102,241,0.5)'
                        }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <Distribution title="Order status" data={analytics.ordersByStatus} total={analytics.totalOrders} toneFor={statusTone} />
        <Distribution title="Order type" data={analytics.ordersByType} total={analytics.totalOrders} toneFor={(k) => k === 'dine-in' ? 'violet' : 'yellow'} formatter={(k) => String(k).replace('-', ' ')} />
      </div>
    </div>
  );
};

const HeroMetric = ({ title, value, change, Icon: IconC, tone = 'indigo' }) => (
  <div className={`hero-metric hero-metric-${tone}`}>
    {/* decorative layers */}
    <div className="absolute -right-10 -top-10 w-40 h-40 rounded-full bg-white/10" />
    <div className="absolute -right-14 -bottom-14 w-40 h-40 rounded-full bg-white/5" />
    <div className="absolute inset-0 opacity-[0.08]" style={{
      backgroundImage: 'linear-gradient(to right, rgba(255,255,255,0.3) 1px, transparent 1px), linear-gradient(to bottom, rgba(255,255,255,0.3) 1px, transparent 1px)',
      backgroundSize: '24px 24px'
    }} />
    <div className="relative flex items-start justify-between">
      <div>
        <p className="text-[11px] font-semibold text-white/75 uppercase tracking-wider">{title}</p>
        <p className="text-[28px] leading-none font-semibold tracking-tight mt-2.5 tabular-nums">{value}</p>
        <p className="text-[11px] text-white/85 mt-3 flex items-center gap-1">
          <Icon.ArrowUp className="w-3 h-3" /> {change}
        </p>
      </div>
      <div className="w-10 h-10 rounded-xl bg-white/20 backdrop-blur flex items-center justify-center ring-1 ring-white/25">
        <IconC className="w-5 h-5" />
      </div>
    </div>
  </div>
);

const Distribution = ({ title, data, total, toneFor, formatter = (k) => k }) => {
  const entries = Object.entries(data);
  const toneClass = {
    green: 'bg-gradient-to-r from-emerald-500 to-teal-500',
    emerald: 'bg-gradient-to-r from-emerald-500 to-teal-500',
    yellow: 'bg-gradient-to-r from-amber-500 to-orange-500',
    amber: 'bg-gradient-to-r from-amber-500 to-orange-500',
    blue: 'bg-gradient-to-r from-sky-500 to-blue-500',
    red: 'bg-gradient-to-r from-rose-500 to-pink-500',
    rose: 'bg-gradient-to-r from-rose-500 to-pink-500',
    violet: 'bg-gradient-to-r from-violet-500 to-purple-500',
    slate: 'bg-gradient-to-r from-slate-400 to-slate-500',
    indigo: 'bg-gradient-to-r from-indigo-500 to-violet-500',
  };
  const dotColor = {
    green: '#10b981', emerald: '#10b981',
    yellow: '#f59e0b', amber: '#f59e0b',
    blue: '#0ea5e9',
    red: '#f43f5e', rose: '#f43f5e',
    violet: '#8b5cf6',
    slate: '#94a3b8',
    indigo: '#6366f1',
  };
  return (
    <div className="glass-card p-6">
      <h3 className="text-sm font-semibold text-slate-900 tracking-tight mb-4">{title}</h3>
      {entries.length === 0 ? (
        <p className="text-sm text-slate-500 text-center py-6">No data.</p>
      ) : (
        <div className="space-y-3">
          {entries.map(([k, c]) => {
            const pct = total > 0 ? Math.round((c / total) * 100) : 0;
            const t = toneFor(k);
            return (
              <div key={k}>
                <div className="flex items-center justify-between mb-1.5">
                  <div className="flex items-center gap-2">
                    <span className="dot-glow" style={{ color: dotColor[t] || '#94a3b8' }} />
                    <span className="text-sm text-slate-700 capitalize">{formatter(k)}</span>
                  </div>
                  <div className="flex items-baseline gap-2">
                    <span className="text-sm font-mono font-semibold text-slate-900 tabular-nums">{c}</span>
                    <span className="text-xs text-slate-400 tabular-nums">{pct}%</span>
                  </div>
                </div>
                <div className="h-2 rounded-full bg-slate-100/80 overflow-hidden">
                  <div
                    className={`h-full rounded-full transition-all duration-700 ${toneClass[t] || 'bg-slate-400'}`}
                    style={{ width: `${pct}%`, boxShadow: `0 2px 6px -1px ${dotColor[t] || '#94a3b8'}80` }}
                  />
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};

export default AdminPremium;
