import React from 'react';
import { motion } from 'motion/react';
import { ArrowLeft, Check, X, Star, Shield, Zap, BarChart3, Users, Store, Crown } from 'lucide-react';

interface BenefitsPricingPageProps {
  onBack: () => void;
  onUpgrade: () => void;
}

export const BenefitsPricingPage: React.FC<BenefitsPricingPageProps> = ({ onBack, onUpgrade }) => {
  const benefits = [
    {
      icon: Zap,
      title: "Platform Power",
      items: [
        "Lifetime, uninterrupted access",
        "No read-only restrictions",
        "Full platform functionality unlocked"
      ]
    },
    {
      icon: Users,
      title: "Community Leadership",
      items: [
        "Create a community for R349 once-off",
        "Each community gets a full 30-day trial first",
        "Lead members, roles, content, and growth"
      ]
    },
    {
      icon: BarChart3,
      title: "Advanced Insights",
      items: [
        "Track engagement and growth",
        "Monitor notices and activity",
        "Understand your community dynamics"
      ]
    },
    {
      icon: Star,
      title: "Fair, Simple Pricing",
      items: [
        "Pay once, belong for life",
        "No subscriptions and no renewals",
        "Trials only delay payment, never change pricing"
      ]
    },
    {
      icon: Store,
      title: "Business Advantage",
      items: [
        "Better visibility for businesses",
        "Enhanced listing control",
        "Stronger local ecosystem influence"
      ]
    }
  ];

  const comparison = [
    { feature: "Join Communities", free: true, licensed: true },
    { feature: "Membership Access", free: "1-year trial", licensed: "R149 once-off" },
    { feature: "Create Community", free: "30-day trial", licensed: "R349 once-off" },
    { feature: "Community Ownership", free: false, licensed: true },
    { feature: "Access Duration", free: "Trial-limited", licensed: "Pay once, lifetime" },
    { feature: "Extra Communities", free: false, licensed: "R349 each" },
    { feature: "Recurring Fees", free: "None", licensed: "None" },
  ];

  return (
    <div className="min-h-screen bg-surface pb-24">
      {/* Back Button */}
      <div className="sticky top-0 z-10 bg-surface/80 backdrop-blur-md border-b border-outline-variant/20">
        <div className="max-w-2xl mx-auto px-6 py-3 flex items-center">
          <button
            onClick={onBack}
            className="flex items-center gap-2 text-primary font-semibold active:scale-95 transition-all"
          >
            <ArrowLeft className="w-5 h-5" />
            <span>Back</span>
          </button>
        </div>
      </div>

      <div className="px-6 py-8 space-y-12 max-w-2xl mx-auto">
        {/* Hero Section */}
        <section className="text-center space-y-6">
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="space-y-4"
          >
            <h2 className="text-4xl font-black text-primary leading-tight">
              Own Your Community.<br />
              <span className="text-secondary">Stay Connected for Life.</span>
            </h2>
            <p className="text-on-surface-variant font-medium">
              Start with free trials, then pay once for lifetime access: R149 for membership or R349 to create and lead a community.
            </p>
          </motion.div>

          <div className="flex flex-col gap-3 pt-4">
            <button 
              onClick={onUpgrade}
              className="w-full py-4 bg-primary text-white rounded-2xl font-black uppercase tracking-widest shadow-lg shadow-primary/20 active:scale-95 transition-all"
            >
              Get Membership for R149
            </button>
            <button 
              onClick={onBack}
              className="w-full py-4 bg-surface-container-low text-primary rounded-2xl font-black uppercase tracking-widest active:scale-95 transition-all"
            >
              Join a Community
            </button>
          </div>
        </section>

        {/* Pricing Card */}
        <section className="relative">
          <div className="absolute -inset-1 bg-gradient-to-r from-emerald-500 to-primary rounded-[2.5rem] blur opacity-20" />
          <div className="relative bg-surface-container-lowest p-8 rounded-[2.5rem] border border-emerald-500/20 shadow-xl space-y-8">
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 rounded-2xl bg-emerald-500/10 flex items-center justify-center text-emerald-600">
                    <Crown className="w-7 h-7" />
                  </div>
                  <div>
                    <h3 className="text-lg font-bold text-primary">Membership Only</h3>
                    <p className="text-xs text-emerald-600 font-black uppercase tracking-widest">Once-Off Payment</p>
                  </div>
                </div>
                <div className="text-3xl font-black text-primary">R149</div>
              </div>

              <div className="grid gap-3">
                {[
                  "Includes lifetime platform membership after payment",
                  "1-year membership trial remains active before payment is required",
                  "Join, engage, and participate in communities",
                  "No recurring fees"
                ].map((item, i) => (
                  <div key={i} className="flex items-start gap-3">
                    <div className="mt-1 w-5 h-5 rounded-full bg-emerald-500/10 flex items-center justify-center flex-shrink-0">
                      <Check className="w-3.5 h-3.5 text-emerald-600" />
                    </div>
                    <span className="text-sm text-on-surface-variant font-medium">{item}</span>
                  </div>
                ))}
              </div>
            </div>

            <div className="space-y-4 border-t border-outline-variant/20 pt-6">
              <div className="flex items-center justify-between">
                <h4 className="text-base font-bold text-primary">Community Creation (Includes Membership)</h4>
                <p className="text-2xl font-black text-primary">R349</p>
              </div>
              <div className="grid gap-3">
                {[
                  "Create a new community with full ownership and controls",
                  "Automatically includes lifetime membership",
                  "Each community has its own 30-day trial before payment is enforced",
                  "Every additional community is R349 once-off"
                ].map((item, i) => (
                  <div key={i} className="flex items-start gap-3">
                    <div className="mt-1 w-5 h-5 rounded-full bg-emerald-500/10 flex items-center justify-center flex-shrink-0">
                      <Check className="w-3.5 h-3.5 text-emerald-600" />
                    </div>
                    <span className="text-sm text-on-surface-variant font-medium">{item}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </section>

        {/* Rules Section */}
        <section className="bg-surface-container-low p-8 rounded-[2.5rem] space-y-6">
          <div className="flex items-center gap-3">
            <Shield className="w-6 h-6 text-primary" />
            <h3 className="text-lg font-bold text-primary">Key Licensing Rules</h3>
          </div>
          <div className="space-y-4">
            <div className="p-4 bg-white/50 rounded-2xl border border-white space-y-2">
              <p className="text-sm font-bold text-on-surface">Membership (R149 once-off) gives you:</p>
              <ul className="text-xs text-on-surface-variant font-medium space-y-1 list-disc pl-4">
                <li>Lifetime platform access after payment</li>
                <li>A separate 1-year trial before payment is enforced</li>
              </ul>
            </div>
            <div className="p-4 bg-white/50 rounded-2xl border border-white space-y-2">
              <p className="text-sm font-bold text-on-surface">Community creation is R349 once-off</p>
              <p className="text-xs text-on-surface-variant font-medium">Creating a community includes membership, and each community keeps its own 30-day trial.</p>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="p-4 bg-white/50 rounded-2xl border border-white">
                <p className="text-[10px] font-black text-outline uppercase tracking-widest mb-1">Membership</p>
                <p className="text-xs font-bold text-on-surface">1-year trial, then R149 once-off for lifetime access</p>
              </div>
              <div className="p-4 bg-white/50 rounded-2xl border border-white">
                <p className="text-[10px] font-black text-outline uppercase tracking-widest mb-1">Ownership</p>
                <p className="text-xs font-bold text-on-surface">30-day trial per community, then R349 once-off each</p>
              </div>
            </div>
          </div>
        </section>

        {/* Benefits Grid */}
        <section className="space-y-8">
          <div className="text-center">
            <h3 className="text-2xl font-black text-primary">Benefits of Membership and Leadership</h3>
          </div>
          <div className="grid gap-6">
            {benefits.map((benefit, i) => (
              <div key={i} className="flex gap-6 p-6 bg-surface-container-lowest rounded-[2rem] border border-outline-variant/10 shadow-sm">
                <div className="w-12 h-12 rounded-2xl bg-primary/5 flex items-center justify-center text-primary flex-shrink-0">
                  <benefit.icon className="w-6 h-6" />
                </div>
                <div className="space-y-2">
                  <h4 className="font-bold text-primary">{benefit.title}</h4>
                  <ul className="space-y-1">
                    {benefit.items.map((item, j) => (
                      <li key={j} className="text-xs text-on-surface-variant font-medium flex items-center gap-2">
                        <div className="w-1 h-1 rounded-full bg-primary/30" />
                        {item}
                      </li>
                    ))}
                  </ul>
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* Comparison Table */}
        <section className="space-y-6">
          <div className="text-center">
            <h3 className="text-2xl font-black text-primary">Free vs Licensed</h3>
          </div>
          <div className="overflow-hidden rounded-[2rem] border border-outline-variant/10 bg-surface-container-lowest shadow-sm">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-surface-container-low">
                  <th className="p-4 text-[10px] font-black text-outline uppercase tracking-widest">Feature</th>
                  <th className="p-4 text-[10px] font-black text-outline uppercase tracking-widest text-center">Free</th>
                  <th className="p-4 text-[10px] font-black text-outline uppercase tracking-widest text-center">Licensed</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-outline-variant/10">
                {comparison.map((row, i) => (
                  <tr key={i} className="hover:bg-surface-container-low/50 transition-colors">
                    <td className="p-4 text-xs font-bold text-on-surface">{row.feature}</td>
                    <td className="p-4 text-center">
                      {typeof row.free === 'boolean' ? (
                        row.free ? <Check className="w-4 h-4 text-emerald-500 mx-auto" /> : <X className="w-4 h-4 text-error mx-auto" />
                      ) : (
                        <span className="text-[10px] font-bold text-outline uppercase">{row.free}</span>
                      )}
                    </td>
                    <td className="p-4 text-center">
                      {typeof row.licensed === 'boolean' ? (
                        row.licensed ? <Check className="w-4 h-4 text-emerald-500 mx-auto" /> : <X className="w-4 h-4 text-error mx-auto" />
                      ) : (
                        <span className="text-[10px] font-bold text-emerald-600 uppercase">{row.licensed}</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>

        {/* Final CTA */}
        <section className="text-center p-10 bg-primary rounded-[3rem] text-white space-y-6 shadow-2xl shadow-primary/30">
          <div className="space-y-2">
            <h3 className="text-2xl font-black">Pay Once. Belong for Life.</h3>
            <p className="text-sm text-white/80 font-medium">
              Keep it simple: R149 once-off for membership, or R349 once-off to create and lead a community. No subscriptions, no renewals.
            </p>
          </div>
          <button 
            onClick={onUpgrade}
            className="px-8 py-4 bg-white text-primary rounded-2xl font-black uppercase tracking-widest active:scale-95 transition-all shadow-lg"
          >
            Start with Membership - R149
          </button>
        </section>
      </div>
    </div>
  );
};
