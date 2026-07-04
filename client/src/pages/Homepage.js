import React, { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { useRestaurantInfo } from '../hooks/useSettings';
import { fetchApi } from '../services/apiService';

/* ---------------------------------------------------------------- */
/* Premium outline icon set (stroke-based, no emoji)                  */
/* ---------------------------------------------------------------- */
const Icon = ({ name, className = 'w-6 h-6' }) => {
  const common = { fill: 'none', stroke: 'currentColor', strokeWidth: 1.5, strokeLinecap: 'round', strokeLinejoin: 'round', viewBox: '0 0 24 24', className };
  switch (name) {
    case 'plate':
      return (
        <svg {...common}><circle cx="12" cy="12" r="9" /><circle cx="12" cy="12" r="4.5" /></svg>
      );
    case 'heart':
      return (
        <svg {...common}><path d="M12 20s-7-4.35-9.5-8.8C.9 8.1 2 4.5 5.4 3.7 8 3 10.3 4.3 12 6.6 13.7 4.3 16 3 18.6 3.7 22 4.5 23.1 8.1 21.5 11.2 19 15.65 12 20 12 20z" /></svg>
      );
    case 'leaf':
      return (
        <svg {...common}><path d="M5 12c0-5 4-9 9-9 3.5 0 6 1 6 1s-1 3-4 6-5 4-8 4c-1 0-3-.5-3-2Z" /><path d="M5 19c4-6 8-9 15-11" /></svg>
      );
    case 'users':
      return (
        <svg {...common}><circle cx="9" cy="8" r="3" /><path d="M2.5 20c0-3.5 3-6 6.5-6s6.5 2.5 6.5 6" /><circle cx="17" cy="9" r="2.5" /><path d="M15.5 14c2.7.3 5 2.5 5 6" /></svg>
      );
    case 'pin':
      return (
        <svg {...common}><path d="M12 21s7-6.6 7-12a7 7 0 1 0-14 0c0 5.4 7 12 7 12Z" /><circle cx="12" cy="9" r="2.5" /></svg>
      );
    case 'phone':
      return (
        <svg {...common}><path d="M4 5c0-.6.4-1 1-1h2.7c.5 0 .9.3 1 .8l.9 3.3c.1.4 0 .8-.3 1.1L8 10.5c1 2.5 3 4.5 5.5 5.5l1.3-1.3c.3-.3.7-.4 1.1-.3l3.3.9c.5.1.8.5.8 1V19c0 .6-.4 1-1 1h-1C10.8 20 4 13.2 4 5Z" /></svg>
      );
    case 'clock':
      return (
        <svg {...common}><circle cx="12" cy="12" r="9" /><path d="M12 7v5l3.5 2" /></svg>
      );
    case 'qr':
      return (
        <svg {...common}><rect x="3" y="3" width="7" height="7" rx="1" /><rect x="14" y="3" width="7" height="7" rx="1" /><rect x="3" y="14" width="7" height="7" rx="1" /><path d="M14 14h3v3h-3zM19 14h2M14 19h2M19 19h2v2" /></svg>
      );
    case 'menu':
      return (
        <svg {...common}><path d="M4 6h16M4 12h16M4 18h10" /></svg>
      );
    case 'checkout':
      return (
        <svg {...common}><path d="M5 12l4 4L19 6" /></svg>
      );
    case 'truck':
      return (
        <svg {...common}><path d="M3 7h11v9H3z" /><path d="M14 10h4l3 3v3h-7z" /><circle cx="7.5" cy="18" r="1.5" /><circle cx="17.5" cy="18" r="1.5" /></svg>
      );
    case 'sparkle':
      return (
        <svg {...common}><path d="M12 3l1.6 5.4L19 10l-5.4 1.6L12 17l-1.6-5.4L5 10l5.4-1.6L12 3Z" /></svg>
      );
    case 'chevron':
      return (
        <svg {...common}><path d="M9 6l6 6-6 6" /></svg>
      );
    case 'music':
      return (
        <svg {...common}><path d="M9 18V5l11-2v13" /><circle cx="6" cy="18" r="3" /><circle cx="17" cy="16" r="3" /></svg>
      );
    case 'calendar':
      return (
        <svg {...common}><rect x="3" y="5" width="18" height="16" rx="2" /><path d="M3 10h18M8 3v4M16 3v4" /></svg>
      );
    case 'cake':
      return (
        <svg {...common}><path d="M4 21v-7a2 2 0 0 1 2-2h12a2 2 0 0 1 2 2v7" /><path d="M4 17h16" /><path d="M12 12V8M9 8c0-1.5 1-2 1-3s-.5-2-1-2M15 8c0-1.5-1-2-1-3s.5-2 1-2" /></svg>
      );
    default:
      return null;
  }
};

/* ---------------------------------------------------------------- */
/* Booking / enquiry form                                            */
/* ---------------------------------------------------------------- */
const BookingForm = () => {
  const [form, setForm] = useState({ name: '', phone: '', email: '', date: '', time: '', guests: '', message: '' });
  const [status, setStatus] = useState('idle'); // idle | sending | sent | error
  const set = (k) => (e) => setForm((f) => ({ ...f, [k]: e.target.value }));

  const submit = async (e) => {
    e.preventDefault();
    if (!form.name.trim() || (!form.phone.trim() && !form.email.trim())) {
      setStatus('error');
      return;
    }
    setStatus('sending');
    try {
      await fetchApi.post('/api/contact', { type: 'booking', ...form });
      setStatus('sent');
      setForm({ name: '', phone: '', email: '', date: '', time: '', guests: '', message: '' });
    } catch (err) {
      setStatus('error');
    }
  };

  const inputCls = 'px-4 py-3 rounded-lg bg-white/5 border border-white/15 text-white placeholder-white/40 focus:outline-none focus:ring-2 focus:ring-amber-400/70 focus:border-transparent transition';

  return (
    <form onSubmit={submit} className="grid md:grid-cols-2 gap-4 max-w-3xl mx-auto text-left">
      <input required placeholder="Your name *" value={form.name} onChange={set('name')} className={inputCls} />
      <input placeholder="Phone" value={form.phone} onChange={set('phone')} className={inputCls} />
      <input type="email" placeholder="Email" value={form.email} onChange={set('email')} className={inputCls} />
      <input type="number" min="1" placeholder="Guests" value={form.guests} onChange={set('guests')} className={inputCls} />
      <input type="date" value={form.date} onChange={set('date')} className={inputCls} />
      <input type="time" value={form.time} onChange={set('time')} className={inputCls} />
      <textarea placeholder="Anything we should know? (occasion, seating preference, allergies...)"
        value={form.message} onChange={set('message')} rows={3}
        className={`md:col-span-2 resize-none ${inputCls}`} />

      <div className="md:col-span-2 flex flex-wrap items-center gap-4">
        <button type="submit" disabled={status === 'sending'}
          className="bg-amber-500 hover:bg-amber-400 disabled:opacity-60 text-black font-semibold px-8 py-3 rounded-lg transition-colors">
          {status === 'sending' ? 'Sending…' : 'Request Booking'}
        </button>
        {status === 'sent' && <span className="text-emerald-400 text-sm">Thanks — we'll confirm shortly by phone.</span>}
        {status === 'error' && <span className="text-red-400 text-sm">Please fill in your name and phone/email.</span>}
      </div>
    </form>
  );
};

/* ---------------------------------------------------------------- */
/* Section shell helpers                                             */
/* ---------------------------------------------------------------- */
const Eyebrow = ({ children }) => (
  <p className="font-serif italic text-amber-400 text-lg md:text-xl mb-2">{children}</p>
);

const SectionHeading = ({ eyebrow, title, subtitle, light }) => (
  <div className="text-center mb-12">
    {eyebrow && <Eyebrow>{eyebrow}</Eyebrow>}
    <h2 className={`text-3xl md:text-4xl font-bold ${light ? 'text-white' : 'text-neutral-900'}`}>{title}</h2>
    {subtitle && <p className={`mt-3 max-w-2xl mx-auto ${light ? 'text-white/60' : 'text-neutral-500'}`}>{subtitle}</p>}
  </div>
);

/* ---------------------------------------------------------------- */
/* Popular dishes (pulled from the live menu)                         */
/* ---------------------------------------------------------------- */
const PopularDishes = () => {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let alive = true;
    fetchApi.get('/api/menu').then((data) => {
      if (!alive) return;
      const list = Array.isArray(data) ? data : data.items || [];
      setItems(list.filter((i) => i && i.name && i.price !== undefined));
    }).catch(() => setItems([])).finally(() => alive && setLoading(false));
    return () => { alive = false; };
  }, []);

  // Strip size/variant suffixes like "(Large)", "(Small)", "(Medium)" so we
  // don't show the same dish 3 times just because it has size options.
  const baseName = (name) => name.replace(/\s*\(.*?\)\s*$/, '').trim().toLowerCase();

  const shown = useMemo(() => {
    const seenNames = new Set();
    const seenCategories = new Map();
    const picked = [];
    for (const item of items) {
      const key = baseName(item.name);
      if (seenNames.has(key)) continue;
      const catCount = seenCategories.get(item.category) || 0;
      if (catCount >= 2) continue; // avoid one category dominating the 4 slots
      seenNames.add(key);
      seenCategories.set(item.category, catCount + 1);
      picked.push(item);
      if (picked.length === 4) break;
    }
    return picked;
  }, [items]);

  if (!loading && shown.length === 0) return null;

  return (
    <section className="py-20 bg-white">
      <div className="container mx-auto px-6">
        <SectionHeading eyebrow="From the kitchen" title="Popular Dishes" subtitle="A few favourites our regulars keep coming back for." />
        {loading ? (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
            {[1, 2, 3, 4].map((i) => <div key={i} className="h-48 rounded-2xl bg-neutral-100 animate-pulse" />)}
          </div>
        ) : (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
            {shown.map((item) => (
              <div key={item.id} className="rounded-2xl overflow-hidden border border-neutral-200 hover:shadow-lg transition-shadow bg-white">
                <div className="aspect-square bg-neutral-100 flex items-center justify-center overflow-hidden">
                  {item.image_url ? (
                    <img src={item.image_url} alt={item.name} className="w-full h-full object-cover" />
                  ) : (
                    <Icon name="plate" className="w-10 h-10 text-neutral-300" />
                  )}
                </div>
                <div className="p-4">
                  <h3 className="font-semibold text-neutral-900 truncate">{item.name}</h3>
                  <p className="text-sm text-neutral-500">{item.category}</p>
                  <p className="mt-1 font-bold text-primary">NPR {Number(item.price).toFixed(0)}</p>
                </div>
              </div>
            ))}
          </div>
        )}
        <div className="text-center mt-10">
          <Link to="/menu" className="inline-flex items-center gap-1.5 text-primary font-semibold hover:gap-2.5 transition-all">
            View full menu <Icon name="chevron" className="w-4 h-4" />
          </Link>
        </div>
      </div>
    </section>
  );
};

/* ---------------------------------------------------------------- */
/* Main page                                                          */
/* ---------------------------------------------------------------- */
const Homepage = () => {
  const restaurantInfo = useRestaurantInfo();

  const steps = [
    { icon: 'qr', title: 'Scan the QR code', body: 'Each table has a unique code — scan it with your phone camera, no app required.' },
    { icon: 'menu', title: 'Browse & order', body: 'Explore the full menu with prices and photos, then add items to your cart.' },
    { icon: 'checkout', title: 'Instant checkout', body: 'Submit your order and the kitchen receives it immediately.' },
  ];

  const gallery = [
    { src: '/images/Gourmet Burgers.jpg', title: 'Gourmet Burgers', desc: 'Fresh ingredients, made to order' },
    { src: '/images/Momo Platter.jpg', title: 'Momo Platter', desc: 'Authentic Nepali momos, our signature dish' },
    { src: '/images/Cozy Dining Area.jpg', title: 'Cozy Dining', desc: 'Comfortable seating for every occasion' },
    { src: '/images/Welcoming Ambiance.jpg', title: 'Warm Ambiance', desc: 'A relaxed space to enjoy good food' },
  ];

  return (
    <div className="min-h-screen bg-white">
      {/* Hero */}
      <section
        className="relative -mt-32 pt-32 pb-16 text-white bg-cover"
        style={{
          backgroundPosition: '100% center',
          backgroundImage:
            "linear-gradient(90deg, rgba(0,0,0,0.92) 0%, rgba(0,0,0,0.75) 30%, rgba(0,0,0,0.25) 60%, rgba(0,0,0,0.15) 100%)," +
            "linear-gradient(180deg, rgba(0,0,0,0.25) 0%, rgba(0,0,0,0.45) 55%, rgba(8,8,8,0.95) 100%)," +
            "url('data:image/svg+xml;utf8,<svg xmlns=%22http://www.w3.org/2000/svg%22 width=%22160%22 height=%22160%22><filter id=%22n%22><feTurbulence type=%22fractalNoise%22 baseFrequency=%220.9%22 numOctaves=%222%22 stitchTiles=%22stitch%22/><feColorMatrix type=%22saturate%22 values=%220%22/></filter><rect width=%22100%25%22 height=%22100%25%22 filter=%22url(%23n)%22 opacity=%220.05%22/></svg>')," +
            "url('/images/hero/hero-storefront-real.jpg')",
        }}
      >
        <div className="container mx-auto px-6 relative z-10 pt-16 pb-8">
          <Eyebrow>Welcome to</Eyebrow>
          <h1 className="text-5xl md:text-7xl font-extrabold tracking-tight leading-none mb-2">
            {restaurantInfo.name}
          </h1>
          <p className="font-serif italic text-2xl md:text-3xl text-amber-200 mb-6">
            {restaurantInfo.tagline || 'Quality food, served fresh'}
          </p>
          <p className="text-lg md:text-xl text-white/90 max-w-xl mb-8">
            Good food. Great taste. Unforgettable moments.
          </p>

          <div className="flex flex-wrap gap-4 mb-12">
            <Link to="/menu" className="inline-flex items-center gap-2 bg-amber-500 hover:bg-amber-400 text-black font-semibold px-6 py-3 rounded-lg transition-colors">
              <Icon name="plate" className="w-5 h-5" /> View Menu
            </Link>
            <a
              href="https://maps.app.goo.gl/Nq2Y3A7eh9q73FnS6"
              target="_blank" rel="noopener noreferrer"
              className="inline-flex items-center gap-2 border border-white/50 hover:border-white text-white font-semibold px-6 py-3 rounded-lg transition-colors"
            >
              <Icon name="pin" className="w-5 h-5" /> Find Us
            </a>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-6 max-w-2xl mb-12 text-sm">
            {[['plate', 'Delicious Food'], ['heart', 'Made with Love'], ['leaf', 'Fresh Ingredients'], ['users', 'Warm Atmosphere']].map(([icon, label]) => (
              <div key={label} className="flex flex-col items-center text-center gap-2">
                <Icon name={icon} className="w-7 h-7 text-amber-300" />
                <span className="text-white/80">{label}</span>
              </div>
            ))}
          </div>

          <div className="flex flex-wrap gap-x-8 gap-y-3 text-sm text-white/80 border-t border-white/15 pt-6">
            <span className="flex items-center gap-2"><Icon name="pin" className="w-4 h-4" /> {restaurantInfo.address}</span>
            <span className="flex items-center gap-2"><Icon name="phone" className="w-4 h-4" /> {restaurantInfo.phone}</span>
            <span className="flex items-center gap-2"><Icon name="clock" className="w-4 h-4" /> Daily: 7:30 AM - 10:30 PM</span>
          </div>
        </div>
      </section>

      {/* Quick actions: Menu + Delivery */}
      <section className="bg-neutral-950 text-white py-10 border-b border-white/10">
        <div className="container mx-auto px-6 grid sm:grid-cols-2 gap-4 max-w-xl">
          <Link to="/menu" className="group flex items-center gap-4 bg-white/5 hover:bg-white/10 border border-white/10 rounded-xl px-6 py-5 transition-colors">
            <Icon name="plate" className="w-8 h-8 text-amber-400" />
            <div>
              <div className="font-semibold">Browse Menu</div>
              <div className="text-sm text-white/50">Dine-in &amp; takeaway</div>
            </div>
          </Link>
          <Link to="/delivery-cart" className="group flex items-center gap-4 bg-white/5 hover:bg-white/10 border border-white/10 rounded-xl px-6 py-5 transition-colors">
            <Icon name="truck" className="w-8 h-8 text-amber-400" />
            <div>
              <div className="font-semibold">Order Delivery</div>
              <div className="text-sm text-white/50">Straight to your door</div>
            </div>
          </Link>
        </div>
      </section>

      {/* Popular dishes */}
      <PopularDishes />

      {/* How it works */}
      <section className="py-20 bg-neutral-50">
        <div className="container mx-auto px-6">
          <SectionHeading eyebrow="Simple by design" title={`How ${restaurantInfo.name} Works`} subtitle="A fast, friendly way to order — whether you're at a table or ordering ahead." />
          <div className="grid md:grid-cols-3 gap-8 max-w-4xl mx-auto">
            {steps.map((s, i) => (
              <div key={s.title} className="bg-white rounded-2xl p-8 text-center border border-neutral-200 shadow-sm">
                <div className="w-14 h-14 mx-auto mb-5 rounded-full bg-amber-50 flex items-center justify-center">
                  <Icon name={s.icon} className="w-7 h-7 text-amber-600" />
                </div>
                <div className="text-xs font-semibold text-amber-600 mb-1">STEP {i + 1}</div>
                <h3 className="text-lg font-bold text-neutral-900 mb-2">{s.title}</h3>
                <p className="text-neutral-500 text-sm leading-relaxed">{s.body}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Gallery */}
      <section className="py-20 bg-white">
        <div className="container mx-auto px-6">
          <SectionHeading eyebrow="A closer look" title="The Food Zone Experience" subtitle="Signature dishes, a warm dining room, and a kitchen that cares about the details." />
          <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
            {gallery.map((g) => (
              <div key={g.title} className="group relative rounded-2xl overflow-hidden aspect-square">
                <img src={g.src} alt={g.title} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" />
                <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/10 to-transparent" />
                <div className="absolute bottom-0 left-0 right-0 p-4">
                  <h4 className="font-semibold text-white">{g.title}</h4>
                  <p className="text-xs text-white/75">{g.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Live Music */}
      <section className="py-20 bg-neutral-950 text-white border-t border-white/10">
        <div className="container mx-auto px-6">
          <div className="max-w-3xl mx-auto text-center">
            <Icon name="music" className="w-10 h-10 text-amber-400 mx-auto mb-4" />
            <Eyebrow>This Friday, 5–8 PM</Eyebrow>
            <h2 className="text-3xl md:text-4xl font-bold mb-4">Live Music Night</h2>
            <p className="text-white/60 mb-8">
              Join us for an evening of live music, good food and great company — full menu and beverages available all night.
            </p>
            <div className="flex flex-wrap justify-center gap-3 mb-8 text-sm">
              {['Live Band', 'Full Menu', 'Beverages', 'Family Friendly'].map((t) => (
                <span key={t} className="border border-white/20 rounded-full px-4 py-1.5 text-white/80">{t}</span>
              ))}
            </div>
            <a href={`tel:${restaurantInfo.phone}`} className="inline-flex items-center gap-2 bg-amber-500 hover:bg-amber-400 text-black font-semibold px-6 py-3 rounded-lg transition-colors">
              <Icon name="phone" className="w-5 h-5" /> Reserve Your Table
            </a>
          </div>
        </div>
      </section>

      {/* Private Events */}
      <section className="py-20 bg-neutral-50">
        <div className="container mx-auto px-6">
          <SectionHeading eyebrow="Celebrate with us" title="Private Events & Group Dining" subtitle="Up to 50 guests — perfect for birthdays, family gatherings and corporate events." />
          <div className="grid md:grid-cols-4 gap-6 max-w-4xl mx-auto">
            {[
              ['cake', 'Birthday Parties', 'Decorations and cake arrangements on request'],
              ['users', 'Family Gatherings', 'Comfortable seating for large groups'],
              ['calendar', 'Corporate Events', 'A professional setting for meetings and team events'],
              ['sparkle', 'Celebrations', 'Anniversaries, graduations and milestones'],
            ].map(([icon, title, body]) => (
              <div key={title} className="bg-white rounded-2xl p-6 text-center border border-neutral-200 shadow-sm">
                <div className="w-12 h-12 mx-auto mb-4 rounded-full bg-amber-50 flex items-center justify-center">
                  <Icon name={icon} className="w-6 h-6 text-amber-600" />
                </div>
                <h4 className="font-semibold text-neutral-900 mb-1">{title}</h4>
                <p className="text-sm text-neutral-500">{body}</p>
              </div>
            ))}
          </div>
          <div className="text-center mt-10">
            <a href={`tel:${restaurantInfo.phone}`} className="inline-flex items-center gap-2 bg-primary hover:bg-orange-600 text-white font-semibold px-6 py-3 rounded-lg transition-colors">
              <Icon name="phone" className="w-5 h-5" /> Call to Reserve
            </a>
          </div>
        </div>
      </section>

      {/* About */}
      <section className="py-20 bg-neutral-950 text-white">
        <div className="container mx-auto px-6 grid md:grid-cols-2 gap-12 items-center">
          <div>
            <Eyebrow>Our story</Eyebrow>
            <h2 className="text-3xl md:text-4xl font-bold mb-6">About {restaurantInfo.name}</h2>
            <p className="text-white/70 leading-relaxed mb-4">
              Located at {restaurantInfo.address}, {restaurantInfo.name} has been serving Duwakot and the wider
              Bhaktapur community with a menu that spans Tibetan, Continental and Indian dishes alongside pizzas,
              burgers, momos and flavourful curries — all made fresh, every day.
            </p>
            <p className="text-white/70 leading-relaxed">
              Order at your table by scanning the QR code, or get fast food delivery anywhere in Duwakot and
              Bhaktapur — either way, the same quality you'd expect sitting in our dining room.
            </p>
          </div>
          <div className="grid grid-cols-2 gap-4">
            {[
              ['clock', 'Kitchen Hours', 'Daily 7:30 AM – 10:30 PM'],
              ['truck', 'Delivery', 'Daily 10:00 AM – 11:00 PM'],
              ['users', 'Family Friendly', 'Kids welcome, all are welcome'],
              ['sparkle', 'Fresh Daily', 'Made to order, every time'],
            ].map(([icon, title, body]) => (
              <div key={title} className="bg-white/5 border border-white/10 rounded-xl p-5">
                <Icon name={icon} className="w-6 h-6 text-amber-400 mb-3" />
                <h4 className="font-semibold mb-1">{title}</h4>
                <p className="text-sm text-white/60">{body}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Booking / Enquiry */}
      <section className="py-20 bg-neutral-950 text-white border-t border-white/10">
        <div className="container mx-auto px-6 text-center">
          <Eyebrow>Reserve a table</Eyebrow>
          <h2 className="text-3xl md:text-4xl font-bold mb-3">Book Your Table or Send an Enquiry</h2>
          <p className="text-white/60 mb-10">We'll confirm your booking by phone or email as soon as we see it.</p>
          <BookingForm />
        </div>
      </section>

      {/* Final CTA */}
      <section className="py-16 bg-primary text-white">
        <div className="container mx-auto px-6 text-center">
          <h2 className="text-3xl font-bold mb-4">Ready to Order?</h2>
          <p className="text-lg mb-8 text-white/90">
            Look for the QR code on your table, or browse our menu online. Dine-in, takeaway and delivery, all in one place.
          </p>
          <div className="flex flex-wrap justify-center gap-4">
            <Link to="/menu" className="bg-white text-primary px-8 py-3 rounded-lg font-semibold hover:bg-neutral-100 transition-colors inline-flex items-center gap-2">
              <Icon name="plate" className="w-5 h-5" /> Browse Menu
            </Link>
            <Link to="/delivery-cart" className="border border-white/60 hover:border-white px-8 py-3 rounded-lg font-semibold transition-colors inline-flex items-center gap-2">
              <Icon name="truck" className="w-5 h-5" /> Order Delivery
            </Link>
          </div>
          <div className="mt-8 text-sm text-white/80 flex flex-wrap justify-center gap-x-8 gap-y-2">
            <span className="flex items-center gap-2"><Icon name="phone" className="w-4 h-4" /> {restaurantInfo.phone}</span>
            <span className="flex items-center gap-2"><Icon name="pin" className="w-4 h-4" /> foodzone.com.np</span>
          </div>
        </div>
      </section>
    </div>
  );
};

export default Homepage;
