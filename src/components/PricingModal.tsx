import { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Check, CreditCard, Shield, Sparkles, X, Github, Cloud, Key, Lock, ArrowRight, Loader2, ExternalLink } from 'lucide-react';
import clsx from 'clsx';
import { twMerge } from 'tailwind-merge';

function cn(...inputs: (string | undefined | null | false)[]) {
  return twMerge(clsx(inputs));
}

interface PricingModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

export default function PricingModal({ isOpen, onClose, onSuccess }: PricingModalProps) {
  const [step, setStep] = useState<'plans' | 'checkout' | 'success'>('plans');
  const [selectedPlan, setSelectedPlan] = useState<'pro' | 'enterprise'>('pro');
  const [cardNumber, setCardNumber] = useState('');
  const [expiry, setExpiry] = useState('');
  const [cvc, setCvc] = useState('');
  const [cardName, setCardName] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});

  const plans = [
    {
      id: 'free' as const,
      name: 'Starter Tier',
      price: '$0',
      period: 'forever',
      desc: 'Essential SEC standard analytical overviews.',
      features: [
        '3 forensic account audits per session',
        'Standard thinking analysis',
        'Standard PDF downloads',
        'Single slide infographics'
      ],
      cta: 'Current Plan',
      popular: false,
      disabled: true,
    },
    {
      id: 'pro' as const,
      name: 'Professional Pro',
      price: '$29',
      period: 'month',
      desc: 'High-power investigative finance tools.',
      features: [
        'Infinite forensic accounting audits',
        'Deep-thinking reasoning mode',
        'High-resolution multi-slide image carousels',
        'ZIP & advanced PDF exports',
        'Exclusive earnings-quality audits'
      ],
      cta: 'Upgrade to Pro',
      popular: true,
      disabled: false,
    },
    {
      id: 'enterprise' as const,
      name: 'Enterprise Executive',
      price: '$149',
      period: 'month',
      desc: 'Custom pipelines for institutional equity analysts.',
      features: [
        'Everything in Professional Pro',
        'Direct custom brand visual themes',
        'Automated SEC Filing triggers',
        'Durable Cloud Firestore reporting logs',
        'Team-shared collaborative dashboard access'
      ],
      cta: 'Upgrade to Enterprise',
      popular: false,
      disabled: false,
    }
  ];

  const formatCardNumber = (value: string) => {
    const v = value.replace(/\s+/g, '').replace(/[^0-9]/gi, '');
    const matches = v.match(/\d{4,16}/g);
    const match = (matches && matches[0]) || '';
    const parts = [];

    for (let i = 0, len = match.length; i < len; i += 4) {
      parts.push(match.substring(i, i + 4));
    }

    if (parts.length > 0) {
      return parts.join(' ');
    } else {
      return v;
    }
  };

  const handleCardNumberChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setCardNumber(formatCardNumber(e.target.value));
  };

  const handleExpiryChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    let value = e.target.value.replace(/[^0-9]/g, '');
    if (value.length > 2) {
      value = value.substring(0, 2) + '/' + value.substring(2, 4);
    }
    setExpiry(value.substring(0, 5));
  };

  const handleCvcChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setCvc(e.target.value.replace(/[^0-9]/g, '').substring(0, 4));
  };

  const handleSubmitPayment = (e: React.FormEvent) => {
    e.preventDefault();
    const newErrors: Record<string, string> = {};

    if (cardNumber.length < 15) newErrors.cardNumber = 'Invalid card number';
    if (!expiry.includes('/') || expiry.length < 5) newErrors.expiry = 'MM/YY required';
    if (cvc.length < 3) newErrors.cvc = 'CVC required';
    if (!cardName.trim()) newErrors.cardName = 'Name on card required';

    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      return;
    }

    setErrors({});
    setIsSubmitting(true);

    // Simulate merchant checkout flow
    setTimeout(() => {
      setIsSubmitting(false);
      setStep('success');
      onSuccess();
    }, 2000);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
      {/* Backdrop */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        onClick={onClose}
        className="fixed inset-0 bg-black/80 backdrop-blur-md"
      />

      {/* Modal Card */}
      <motion.div
        initial={{ opacity: 0, scale: 0.95, y: 15 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95, y: 15 }}
        transition={{ type: 'spring', duration: 0.5 }}
        className="relative w-full max-w-4xl bg-[#090909] border border-white/10 rounded-2xl overflow-hidden shadow-2xl z-10 flex flex-col md:flex-row max-h-[90vh] md:max-h-[85vh]"
      >
        {/* Left Side: Dynamic Workspace Information / Content Panel */}
        <div className="flex-1 p-6 md:p-10 overflow-y-auto border-b md:border-b-0 md:border-r border-white/10 select-none">
          <button 
            onClick={onClose}
            className="absolute top-4 right-4 text-white/40 hover:text-white transition-colors p-1"
          >
            <X className="w-5 h-5" />
          </button>

          <AnimatePresence mode="wait">
            {step === 'plans' && (
              <motion.div
                key="plans"
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: 10 }}
                className="space-y-6"
              >
                <div>
                  <div className="inline-flex items-center space-x-2 text-white bg-white/5 border border-white/10 px-3 py-1 rounded-full text-[10px] uppercase tracking-widest font-mono mb-4">
                    <Sparkles className="w-3.5 h-3.5 text-yellow-400" />
                    <span>Investigative Upgrades Available</span>
                  </div>
                  <h3 className="text-2xl sm:text-3xl font-light text-white tracking-tight">Access Institutional Precision</h3>
                  <p className="text-xs text-white/50 mt-1 select-text">
                    Support cloud persistence, high-resolution visual exports, and advanced forensic auditing variables.
                  </p>
                </div>

                <div className="grid grid-cols-1 gap-4 mt-6">
                  {plans.map((p) => (
                    <div
                      key={p.id}
                      className={cn(
                        "p-5 rounded-xl border transition-all duration-300 relative flex flex-col md:flex-row md:items-center justify-between gap-4",
                        p.disabled 
                          ? "border-white/5 bg-transparent opacity-50" 
                          : selectedPlan === p.id 
                            ? "border-white bg-white/[0.02]" 
                            : "border-white/10 bg-white/[0.01] hover:border-white/20 cursor-pointer"
                      )}
                      onClick={() => !p.disabled && setSelectedPlan(p.id as any)}
                    >
                      {p.popular && (
                        <span className="absolute -top-2.5 left-6 bg-white text-black font-mono text-[8px] font-bold uppercase tracking-widest px-2 py-0.5 rounded-sm">
                          Recommended
                        </span>
                      )}

                      <div className="space-y-1">
                        <div className="flex items-center space-x-2">
                          <h4 className="text-sm font-medium font-mono text-white uppercase tracking-wider">{p.name}</h4>
                        </div>
                        <p className="text-xs text-white/40 max-w-sm">{p.desc}</p>
                        <ul className="grid grid-cols-1 sm:grid-cols-2 gap-x-4 gap-y-1 mt-2 text-[11px] text-white/60">
                          {p.features.slice(0, 4).map((f, i) => (
                            <li key={i} className="flex items-center space-x-1.5 truncate">
                              <Check className="w-3 h-3 text-white/40 shrink-0" />
                              <span>{f}</span>
                            </li>
                          ))}
                        </ul>
                      </div>

                      <div className="flex flex-col items-start md:items-end shrink-0 pt-3 md:pt-0 border-t md:border-t-0 border-white/5">
                        <div className="flex items-baseline space-x-1">
                          <span className="text-2xl font-light text-white">{p.price}</span>
                          <span className="text-[10px] text-white/40">/{p.period}</span>
                        </div>
                        <button
                          disabled={p.disabled}
                          onClick={(e) => {
                            e.stopPropagation();
                            if (!p.disabled) {
                              setSelectedPlan(p.id as any);
                              setStep('checkout');
                            }
                          }}
                          className={cn(
                            "mt-2 text-[10px] font-mono tracking-widest uppercase px-4 py-1.5 transition-all duration-300 pointer-events-none md:pointer-events-auto border rounded-sm",
                            p.disabled 
                              ? "bg-transparent text-white/20 border-white/5" 
                              : selectedPlan === p.id 
                                ? "bg-white text-black border-white hover:bg-white/90" 
                                : "bg-transparent text-white/60 border-white/15 hover:border-white/30"
                          )}
                        >
                          {p.cta}
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </motion.div>
            )}

            {step === 'checkout' && (
              <motion.div
                key="checkout"
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: 10 }}
                className="space-y-6"
              >
                <div>
                  <button
                    onClick={() => setStep('plans')}
                    className="text-[10px] font-mono tracking-wider text-white/40 hover:text-white uppercase mb-2 block"
                  >
                    &larr; Back to Plans
                  </button>
                  <h3 className="text-xl font-light text-white tracking-tight">Complete Secure Checkout</h3>
                  <p className="text-xs text-white/40 mt-1">
                    Upgrade to <span className="font-mono text-white/80 uppercase">{selectedPlan}</span> for unlimited institutional workflows.
                  </p>
                </div>

                {/* Credit Card Visualization */}
                <div className="relative h-44 w-full max-w-sm rounded-xl overflow-hidden bg-gradient-to-br from-[#121212] to-[#040404] border border-white/10 p-6 flex flex-col justify-between shadow-2xl mx-auto md:mx-0">
                  <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top_right,rgba(255,255,255,0.05),transparent)]" />
                  <div className="absolute -bottom-8 -right-8 w-24 h-24 bg-white/[0.01] rounded-full blur-2xl" />
                  
                  <div className="flex justify-between items-start relative z-10">
                    <span className="text-[10px] font-mono tracking-widest text-white/30 uppercase">ASET COOP CARD</span>
                    <CreditCard className="w-6 h-6 text-white/30" />
                  </div>

                  <div className="my-auto relative z-10 py-1">
                    <p className="font-mono text-lg text-white/80 tracking-[0.25em] min-h-[28px]">
                      {cardNumber || '•••• •••• •••• ••••'}
                    </p>
                  </div>

                  <div className="flex justify-between items-end relative z-10">
                    <div className="space-y-0.5">
                      <span className="text-[7px] font-mono text-white/30 uppercase tracking-widest block">CARDHOLDER</span>
                      <p className="font-mono text-xs text-white/60 uppercase truncate max-w-[200px] min-h-[16px]">
                        {cardName || 'YOUR FULL NAME'}
                      </p>
                    </div>
                    <div className="flex gap-4">
                      <div className="space-y-0.5">
                        <span className="text-[7px] font-mono text-white/30 uppercase tracking-widest block">EXPIRES</span>
                        <p className="font-mono text-xs text-white/60 min-h-[16px]">{expiry || 'MM/YY'}</p>
                      </div>
                      <div className="space-y-0.5">
                        <span className="text-[7px] font-mono text-white/30 uppercase tracking-widest block">CVC</span>
                        <p className="font-mono text-xs text-white/60 min-h-[16px]">{cvc || '•••'}</p>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Card input details */}
                <form onSubmit={handleSubmitPayment} className="space-y-4">
                  <div className="space-y-1">
                    <label className="text-[9px] font-mono text-white/40 uppercase tracking-wider block">Cardholder Name</label>
                    <input
                      type="text"
                      required
                      placeholder="Jane Doe"
                      value={cardName}
                      onChange={(e) => setCardName(e.target.value)}
                      className={cn(
                        "w-full bg-white/[0.02] border border-white/10 rounded-lg px-4 py-2.5 text-sm text-white focus:outline-none focus:border-white transition-colors",
                        errors.cardName && "border-red-500/50 focus:border-red-500"
                      )}
                    />
                    {errors.cardName && <span className="text-[10px] text-red-400 font-mono block">{errors.cardName}</span>}
                  </div>

                  <div className="space-y-1">
                    <label className="text-[9px] font-mono text-white/40 uppercase tracking-wider block">Card Number</label>
                    <input
                      type="text"
                      required
                      placeholder="4000 1234 5678 9010"
                      value={cardNumber}
                      onChange={handleCardNumberChange}
                      className={cn(
                        "w-full bg-white/[0.02] border border-white/10 rounded-lg px-4 py-2.5 text-sm text-white focus:outline-none focus:border-white transition-colors font-mono",
                        errors.cardNumber && "border-red-500/50 focus:border-red-500"
                      )}
                    />
                    {errors.cardNumber && <span className="text-[10px] text-red-400 font-mono block">{errors.cardNumber}</span>}
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-1">
                      <label className="text-[9px] font-mono text-white/40 uppercase tracking-wider block">Expiry Date</label>
                      <input
                        type="text"
                        required
                        placeholder="MM/YY"
                        value={expiry}
                        onChange={handleExpiryChange}
                        className={cn(
                          "w-full bg-white/[0.02] border border-white/10 rounded-lg px-4 py-2.5 text-sm text-white focus:outline-none focus:border-white transition-colors font-mono",
                          errors.expiry && "border-red-500/50 focus:border-red-500"
                        )}
                      />
                      {errors.expiry && <span className="text-[10px] text-red-400 font-mono block">{errors.expiry}</span>}
                    </div>

                    <div className="space-y-1">
                      <label className="text-[9px] font-mono text-white/40 uppercase tracking-wider block">Security CVC</label>
                      <input
                        type="password"
                        required
                        placeholder="123"
                        value={cvc}
                        onChange={handleCvcChange}
                        className={cn(
                          "w-full bg-white/[0.02] border border-white/10 rounded-lg px-4 py-2.5 text-sm text-white focus:outline-none focus:border-white transition-colors font-mono",
                          errors.cvc && "border-red-500/50 focus:border-red-500"
                        )}
                      />
                      {errors.cvc && <span className="text-[10px] text-red-400 font-mono block">{errors.cvc}</span>}
                    </div>
                  </div>

                  <div className="flex items-center space-x-2 text-[10px] text-white/30 font-mono py-1 select-none">
                    <Shield className="w-3.5 h-3.5" />
                    <span>Secure 256-Bit Encrypted Accrual Connection via simulated Stripe API.</span>
                  </div>

                  <button
                    type="submit"
                    disabled={isSubmitting}
                    className="w-full bg-white text-black hover:bg-white/90 font-mono uppercase tracking-widest text-xs py-3.5 rounded-lg font-bold transition-all duration-300 flex items-center justify-center space-x-2 h-12 cursor-pointer mt-4"
                  >
                    {isSubmitting ? (
                      <>
                        <Loader2 className="w-4 h-4 animate-spin" />
                        <span>Processing Auth Network...</span>
                      </>
                    ) : (
                      <>
                        <Lock className="w-4 h-4" />
                        <span>Authorize Payment {selectedPlan === 'pro' ? '$29' : '$149'}.00</span>
                      </>
                    )}
                  </button>
                </form>
              </motion.div>
            )}

            {step === 'success' && (
              <motion.div
                key="success"
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                className="text-center py-10 space-y-6"
              >
                <div className="w-16 h-16 bg-white/10 rounded-full flex items-center justify-center mx-auto border border-white/20">
                  <Check className="w-8 h-8 text-white animate-pulse" />
                </div>
                <div className="space-y-2">
                  <h3 className="text-2xl font-light text-white tracking-tight">Access Granted Successfully</h3>
                  <p className="text-xs text-white/50 max-w-sm mx-auto">
                    Your institutional profile is updated to <span className="font-mono text-white tracking-widest uppercase font-bold">{selectedPlan}</span>. Enjoy unlimited forensic audits.
                  </p>
                </div>

                <div className="p-4 bg-white/[0.02] border border-white/5 rounded-xl text-left text-xs font-mono text-white/60 space-y-1 mx-auto max-w-md select-text">
                  <div className="flex justify-between border-b border-white/5 pb-2 mb-2">
                    <span className="text-white/40">TRANSACTION ID</span>
                    <span className="text-white/80">TX-{Math.random().toString(36).substring(2, 10).toUpperCase()}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-white/40">UPGRADE PLAN</span>
                    <span className="uppercase text-white">{selectedPlan} Plan</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-white/40">CREDITS ALLOCATED</span>
                    <span className="text-emerald-400 font-bold">UNLIMITED PRO</span>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={onClose}
                  className="bg-white text-black hover:bg-white/90 font-mono uppercase tracking-widest text-xs px-8 py-3 rounded-lg font-bold transition-all duration-300 inline-block cursor-pointer"
                >
                  Enter Workspace
                </button>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* Right Side: GitHub Integration instructions (Deploy & Earn via Git) */}
        <div className="w-full md:w-[320px] bg-white/[0.02] p-8 flex flex-col justify-between select-text min-h-[300px] md:min-h-auto">
          <div className="space-y-6">
            <div className="flex items-center space-x-2">
              <Github className="w-5 h-5 text-white/60" />
              <h4 className="text-xs font-mono uppercase tracking-widest text-white/80 font-bold">Git Hub Push Setup</h4>
            </div>

            <p className="text-[11px] text-white/40 leading-relaxed">
              Export this ASET web service to GitHub to create premium custom clones and run active public paywalls.
            </p>

            <div className="space-y-4 pt-2">
              <div className="flex gap-2.5">
                <div className="w-5 h-5 bg-white/5 border border-white/10 rounded-sm text-[10px] font-mono flex items-center justify-center shrink-0 mt-0.5 text-white/60">
                  1
                </div>
                <div>
                  <h5 className="text-[11px] font-semibold text-white/90">Click &quot;Export to GitHub&quot;</h5>
                  <p className="text-[10px] text-white/40 leading-relaxed">In the top right settings menu of the AI Studio workspace, export this repository.</p>
                </div>
              </div>

              <div className="flex gap-2.5">
                <div className="w-5 h-5 bg-white/5 border border-white/10 rounded-sm text-[10px] font-mono flex items-center justify-center shrink-0 mt-0.5 text-white/60">
                  2
                </div>
                <div>
                  <h5 className="text-[11px] font-semibold text-white/90">Add Stripe Billing Webhooks</h5>
                  <p className="text-[10px] text-white/40 leading-relaxed">Uncomment production billing in <code className="font-mono bg-white/5 px-1 py-0.5 text-[9px] text-white">server.ts</code> and bind your webhook secret keys.</p>
                </div>
              </div>

              <div className="flex gap-2.5">
                <div className="w-5 h-5 bg-white/5 border border-white/10 rounded-sm text-[10px] font-mono flex items-center justify-center shrink-0 mt-0.5 text-white/60">
                  3
                </div>
                <div>
                  <h5 className="text-[11px] font-semibold text-white/90">Deploy Instantly</h5>
                  <p className="text-[10px] text-white/40 leading-relaxed">Hook your repository up to Render, Vercel, or Fly.io. It builds automatically with dynamic server-side scripts.</p>
                </div>
              </div>
            </div>
          </div>

          <div className="pt-6 border-t border-white/5 mt-8">
            <a
              href="https://github.com"
              target="_blank"
              rel="noreferrer"
              className="flex items-center justify-center gap-2 text-[10px] font-mono tracking-widest uppercase text-white hover:text-white/80 transition-colors py-2 border border-white/10 rounded-md hover:bg-white/[0.02]"
            >
              <span>Explore GitHub Repos</span>
              <ExternalLink className="w-3 h-3" />
            </a>
          </div>
        </div>
      </motion.div>
    </div>
  );
}
