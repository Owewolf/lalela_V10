import React, { useState } from 'react';
import { 
  Plus, 
  ArrowRight, 
  Play, 
  Users, 
  Globe, 
  Heart, 
  MessageSquare, 
  TrendingUp, 
  Shield, 
  MapPin,
  CheckCircle2,
  Mail,
  Phone,
  Ear,
  HandHeart,
  Zap,
  ChevronRight,
  X,
  Eye,
  EyeOff
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { LandingPageMap } from './landing/LandingPageMap';
import { 
  signInWithPopup, 
  GoogleAuthProvider,
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  sendPasswordResetEmail,
  signOut as firebaseSignOut,
  sendEmailVerification
} from 'firebase/auth';
import { auth, db } from '../firebase';
import { useFirebase } from '../context/FirebaseContext';
import { doc, getDoc, setDoc, serverTimestamp } from 'firebase/firestore';
import { APP_LOGO_PATH } from '../constants';
import { cn } from '../lib/utils';

interface LandingPageProps {
  onJoin: () => void;
  onStart: () => void;
  onViewBenefits: () => void;
}

export const LandingPage: React.FC<LandingPageProps> = ({ onJoin, onStart, onViewBenefits }) => {
  const [joinMode, setJoinMode] = useState<'start' | 'login'>('start');
  
  const [email, setEmail] = useState('');
  const [mobileNumber, setMobileNumber] = useState('');
  const [countryCode, setCountryCode] = useState('+27');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [name, setName] = useState('');
  const [lastName, setLastName] = useState('');
  const [agreedToTerms, setAgreedToTerms] = useState(false);
  const [marketingConsent, setMarketingConsent] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showForgotPassword, setShowForgotPassword] = useState(false);
  const [forgotEmail, setForgotEmail] = useState('');
  const [forgotSent, setForgotSent] = useState(false);
  const [forgotError, setForgotError] = useState<string | null>(null);
  const [forgotSubmitting, setForgotSubmitting] = useState(false);

  const { setupRecaptcha, signInWithPhone, verifySmsCode, confirmationResult, clearPhoneAuth } = useFirebase();
  const [otpCode, setOtpCode] = useState('');
  const [isOtpSent, setIsOtpSent] = useState(false);
  
  const isPhoneMode = mobileNumber.length > 0;

  const getFormattedPhoneNumber = () => {
    let cleanNumber = mobileNumber.replace(/\D/g, '');
    if (cleanNumber.startsWith('0')) {
      cleanNumber = cleanNumber.substring(1);
    }
    if (mobileNumber.startsWith('+')) {
      return mobileNumber;
    }
    return `${countryCode}${cleanNumber}`;
  };

  // Clean up reCAPTCHA on unmount
  React.useEffect(() => {
    setupRecaptcha('recaptcha-container');
    return () => { clearPhoneAuth(); };
  }, [setupRecaptcha, clearPhoneAuth]);

  const scrollToJoin = (mode: 'start' | 'login') => {
    setJoinMode(mode);
    const element = document.getElementById('join');
    element?.scrollIntoView({ behavior: 'smooth' });
  };

  const handleGoogleLogin = async () => {
    setIsSubmitting(true);
    setError(null);
    try {
      const provider = new GoogleAuthProvider();
      const result = await signInWithPopup(auth, provider);
      const email = result.user.email;

      if (email) {
        const blacklistDoc = await getDoc(doc(db, 'blacklisted_emails', email));
        if (blacklistDoc.exists()) {
          await firebaseSignOut(auth);
          setError("This account has been permanently deleted and cannot be reused.");
          return;
        }
      }
    } catch (err: any) {
      console.error("Login Error:", err);
      setError(err.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handlePhoneSuccess = async (user: any) => {
    try {
      const userDocRef = doc(db, 'users', user.uid);
      const docSnap = await getDoc(userDocRef);
      
      const inviteJoinCode = localStorage.getItem('pending_join_code');
      const resolvedPhone = user.phoneNumber || mobileNumber;
      const resolvedName = `${name} ${lastName}`.trim() || user.displayName || 'Phone User';
      const resolvedFirstName = name.trim() || resolvedName.split(' ')[0] || 'Phone';
      const resolvedLastName = lastName.trim() || '';
      
      if (!docSnap.exists() && joinMode === 'start') {
        const profileData = {
          id: user.uid,
          name: resolvedName,
          first_name: resolvedFirstName,
          last_name: resolvedLastName,
          email: '',
          mobile_number: resolvedPhone,
          phone: resolvedPhone,
          agreed_to_terms: agreedToTerms,
          marketing_consent: marketingConsent,
          email_verified: false,
          license_status: 'UNLICENSED',
          status: 'ACTIVE',
          role: 'user',
          created_at: serverTimestamp(),
          updated_at: serverTimestamp(),
          is_admin: false,
          is_active: true
        };
        await setDoc(userDocRef, profileData);
      }

      if (joinMode === 'start') {
        localStorage.setItem('pending_onboarding_name', resolvedName);
        localStorage.setItem('pending_onboarding_phone', resolvedPhone);
        localStorage.removeItem('pending_onboarding_email');
        // Backward-compat fallback for older onboarding reads.
        localStorage.setItem('pending_onboarding_contact', resolvedPhone);
        localStorage.setItem('pending_onboarding_mode', inviteJoinCode ? 'join' : 'start');
      }
    } catch (err: any) {
      console.error("Phone auth profile creation error:", err);
      setError(err.message);
    }
  };

  const handleVerifyOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setError(null);

    try {
      const user = await verifySmsCode(otpCode);
      if (user) {
        await handlePhoneSuccess(user.user);
        onStart();
      } else {
        throw new Error("Failed to authenticate.");
      }
    } catch (err: any) {
      console.error("OTP verification error:", err);
      setError(err.message || 'Invalid code');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleForgotPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setForgotSubmitting(true);
    setForgotError(null);
    try {
      await sendPasswordResetEmail(auth, forgotEmail);
      setForgotSent(true);
    } catch (err: any) {
      console.error('Password reset error:', err);
      if (err.code === 'auth/user-not-found') {
        setForgotError('No account found with this email address.');
      } else if (err.code === 'auth/invalid-email') {
        setForgotError('Please enter a valid email address.');
      } else if (err.code === 'auth/too-many-requests') {
        setForgotError('Too many requests. Please try again later.');
      } else {
        setForgotError(err.message);
      }
    } finally {
      setForgotSubmitting(false);
    }
  };

  const handleAuthSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setError(null);
    try {
      if (isPhoneMode) {
        if (joinMode === 'start' && !agreedToTerms) {
          throw new Error("You must agree to the Terms & Conditions.");
        }
        const formattedPhone = getFormattedPhoneNumber();
        await signInWithPhone(formattedPhone);
        setIsOtpSent(true);
      } else {
        // Email Mode
        const blacklistDoc = await getDoc(doc(db, 'blacklisted_emails', email));
        if (blacklistDoc.exists()) {
          setError("This account has been permanently deleted and cannot be reused.");
          setIsSubmitting(false);
          return;
        }

        if (joinMode === 'login') {
          await signInWithEmailAndPassword(auth, email, password);
        } else {
          if (password !== confirmPassword) {
            throw new Error("Passwords do not match.");
          }
          if (!agreedToTerms) {
            throw new Error("You must agree to the Terms & Conditions.");
          }
          if (password.length < 6) {
            throw new Error("Password must be at least 6 characters.");
          }

          const userCredential = await createUserWithEmailAndPassword(auth, email, password);
          const inviteJoinCode = localStorage.getItem('pending_join_code');

          // Create the user document immediately
          await setDoc(doc(db, 'users', userCredential.user.uid), {
            id: userCredential.user.uid,
            name: `${name} ${lastName}`.trim(),
            first_name: name,
            last_name: lastName,
            email: email,
            mobile_number: '',
            phone: '',
            agreed_to_terms: agreedToTerms,
            marketing_consent: marketingConsent,
            email_verified: false,
            license_status: 'UNLICENSED',
            status: 'ACTIVE',
            role: 'user',
            created_at: serverTimestamp(),
            updated_at: serverTimestamp(),
            is_admin: false,
            is_active: true
          });

          // Send email verification
          try {
             await sendEmailVerification(userCredential.user);
          } catch (vErr) {
             console.error("Failed to send verification email:", vErr);
          }

          localStorage.setItem('pending_onboarding_name', `${name} ${lastName}`.trim());
          localStorage.setItem('pending_onboarding_email', email);
          localStorage.removeItem('pending_onboarding_phone');
          localStorage.setItem('pending_onboarding_contact', email);
          localStorage.setItem('pending_onboarding_mode', inviteJoinCode ? 'join' : 'start');
        }
      }
    } catch (err: any) {
      console.error("Auth Error:", err);
      if (err.code === 'auth/invalid-email') {
        setError("Please enter a valid email address.");
      } else if (err.code === 'auth/invalid-phone-number') {
        setError("Please enter a valid phone number.");
      } else if (err.code === 'auth/invalid-credential' || err.code === 'auth/wrong-password') {
        setError("Incorrect credentials. Please try again.");
      } else if (err.code === 'auth/user-not-found') {
        setError("No account found with this email. Please sign up first.");
      } else if (err.code === 'auth/too-many-requests') {
        setError("Too many failed attempts. Please try again later.");
      } else if (err.code === 'auth/operation-not-allowed') {
        setError("This sign-in method is not enabled.");
      } else {
        setError(err.message);
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-surface selection:bg-primary/10">
      {/* Navigation */}
      <nav className="fixed top-0 left-0 right-0 z-50 bg-white/80 backdrop-blur-md border-b border-outline-variant/10">
        <div className="max-w-7xl mx-auto px-6 h-20 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-10 h-10 bg-primary rounded-xl flex items-center justify-center shadow-lg shadow-primary/20 overflow-hidden">
              <img 
                src={APP_LOGO_PATH}
                alt="Lalela Logo" 
                className="w-full h-full object-cover"
              />
            </div>
            <span className="text-2xl font-headline font-black text-primary tracking-tight">lalela</span>
          </div>
          
          <div className="hidden md:flex items-center gap-8 text-sm font-bold text-outline">
            <a href="#about" className="hover:text-primary transition-colors">About</a>
            <button onClick={onViewBenefits} className="hover:text-primary transition-colors">Benefits & Pricing</button>
            <a href="#join" className="hover:text-primary transition-colors">Join</a>
            <a href="#communities" className="hover:text-primary transition-colors">Communities</a>
            <a href="#blog" className="hover:text-primary transition-colors">Blog</a>
            <div className="flex items-center gap-3">
              <button 
                onClick={() => scrollToJoin('login')}
                className="px-6 py-2.5 text-primary rounded-full font-black uppercase tracking-widest hover:bg-surface-container-low transition-all"
              >
                Login
              </button>
              <button 
                onClick={() => scrollToJoin('start')}
                className="px-6 py-2.5 bg-primary text-white rounded-full font-black uppercase tracking-widest shadow-lg shadow-primary/20 active:scale-95 transition-all"
              >
                Create Account
              </button>
            </div>
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <section className="relative pt-32 pb-20 overflow-hidden">
        <div className="absolute inset-0 z-0">
          <img 
            src="https://picsum.photos/seed/market/1920/1080?blur=2" 
            alt="Market Scene" 
            className="w-full h-full object-cover opacity-20"
            referrerPolicy="no-referrer"
          />
          <div className="absolute inset-0 bg-gradient-to-b from-surface via-surface/80 to-surface" />
        </div>

        <div className="max-w-7xl mx-auto px-6 relative z-10">
          <div className="max-w-3xl">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6 }}
            >
              <h1 className="text-6xl md:text-8xl font-headline font-black text-primary leading-[0.9] mb-8">
                no more talk talk — <br />
                <span className="text-secondary">it’s listen, listen, do.</span>
              </h1>
              <p className="text-xl md:text-2xl text-on-surface-variant font-medium leading-relaxed mb-12 max-w-xl">
                join your community. trade safely. <br />
                give back with every deal.
              </p>

              <div className="flex flex-wrap gap-4">
                <button 
                  onClick={() => scrollToJoin('start')}
                  className="px-10 py-5 bg-secondary text-white rounded-2xl font-black text-lg uppercase tracking-widest shadow-xl shadow-secondary/20 hover:scale-[1.02] active:scale-95 transition-all flex items-center gap-3"
                >
                  get started
                </button>
                <button 
                  onClick={() => scrollToJoin('login')}
                  className="px-10 py-5 bg-primary text-white rounded-2xl font-black text-lg uppercase tracking-widest shadow-xl shadow-primary/20 hover:scale-[1.02] active:scale-95 transition-all"
                >
                  login
                </button>
                <button className="px-10 py-5 bg-white text-primary rounded-2xl font-black text-lg uppercase tracking-widest shadow-lg border border-outline-variant/10 hover:bg-surface-container-low transition-all flex items-center gap-3">
                  <Play className="w-6 h-6 fill-primary" />
                  watch intro video
                </button>
              </div>
            </motion.div>
          </div>
        </div>
      </section>

      {/* How Lalela Works */}
      <section className="py-24 bg-surface-container-lowest">
        <div className="max-w-7xl mx-auto px-6">
          <div className="text-center mb-20">
            <h2 className="text-4xl md:text-6xl font-headline font-black text-primary mb-4 tracking-tight">how lalela works</h2>
            <div className="w-24 h-1.5 bg-secondary mx-auto rounded-full" />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-12">
            {[
              {
                icon: Ear,
                title: "listen",
                desc: "join or build a local group share needs",
                color: "text-secondary",
                bg: "bg-secondary/10",
                buttons: ["Create Community", "View Communities"]
              },
              {
                icon: MessageSquare,
                title: "connect",
                desc: "chat, list items post notices",
                color: "text-primary",
                bg: "bg-primary/10",
                buttons: ["Explore Market", "View Causes"]
              },
              {
                icon: HandHeart,
                title: "do",
                desc: "trade, support charity, stay safe",
                color: "text-error",
                bg: "bg-error/10",
                buttons: ["Explore Now"]
              }
            ].map((item, idx) => (
              <motion.div
                key={idx}
                whileHover={{ y: -10 }}
                className="bg-white p-12 rounded-[3rem] shadow-sm border border-outline-variant/5 text-center space-y-8"
              >
                <div className={cn("w-24 h-24 rounded-[2rem] mx-auto flex items-center justify-center shadow-inner", item.bg)}>
                  <item.icon className={cn("w-12 h-12", item.color)} />
                </div>
                <div className="space-y-4">
                  <h3 className={cn("text-3xl font-headline font-black uppercase tracking-tighter", item.color)}>{item.title}</h3>
                  <p className="text-on-surface-variant font-bold text-lg leading-tight max-w-[200px] mx-auto">
                    {item.desc}
                  </p>
                </div>
                <div className="flex flex-col gap-3">
                  {item.buttons.map((btn, bIdx) => (
                    <button 
                      key={bIdx}
                      onClick={() => scrollToJoin('start')}
                      className={cn(
                        "w-full py-3 rounded-xl font-black uppercase tracking-widest text-xs transition-all",
                        bIdx === 0 ? "bg-primary text-white shadow-lg shadow-primary/10" : "bg-surface-container-low text-outline hover:bg-surface-container-high"
                      )}
                    >
                      {btn}
                    </button>
                  ))}
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Live Community Activity */}
      <section className="py-24 overflow-hidden">
        <div className="max-w-7xl mx-auto px-6">
          <div className="flex flex-col md:flex-row items-center gap-20">
            <div className="flex-1 space-y-8">
              <h2 className="text-5xl md:text-7xl font-headline font-black text-primary leading-none">live community activity</h2>
              
              <div className="bg-white p-8 rounded-[3rem] shadow-xl border border-outline-variant/10 space-y-6">
                <div className="flex items-center gap-4 text-primary">
                  <TrendingUp className="w-8 h-8" />
                  <span className="text-2xl font-bold">R15,240 raised for local causes</span>
                </div>
                <div className="h-px bg-outline-variant/20" />
                <div className="flex items-center justify-between">
                  <div className="space-y-1">
                    <p className="text-sm font-black uppercase tracking-widest text-outline">Listings this week</p>
                    <p className="text-4xl font-headline font-black text-primary">312</p>
                  </div>
                  <div className="space-y-1 text-right">
                    <p className="text-sm font-black uppercase tracking-widest text-outline">New Communities</p>
                    <p className="text-4xl font-headline font-black text-secondary">8</p>
                  </div>
                </div>
              </div>

              <div className="bg-secondary/5 p-8 rounded-[3rem] border border-secondary/10 flex items-center justify-between">
                <div>
                  <h4 className="text-2xl font-headline font-black text-secondary">CAT tracker</h4>
                  <p className="text-sm font-bold text-secondary/70">community added tax</p>
                </div>
                <div className="w-20 h-20 rounded-full border-8 border-secondary flex items-center justify-center font-black text-secondary">
                  R10.7k
                </div>
              </div>
            </div>

            <div className="flex-1 relative">
              <LandingPageMap />
            </div>
          </div>
        </div>
      </section>

      {/* Feature Highlights */}
      <section className="py-24 bg-primary text-white">
        <div className="max-w-7xl mx-auto px-6">
          <div className="text-center mb-20">
            <h2 className="text-5xl md:text-7xl font-headline font-black mb-4">What You can do on Lalela</h2>
            <p className="text-xl opacity-70 font-medium">Feature highlights</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            {[
              {
                title: "Listings",
                desc: "trade items, services, and help with built-in charity",
                icon: Zap,
                bg: "bg-white/10"
              },
              {
                title: "notices",
                desc: "urgent, general, and community wide notices",
                icon: MessageSquare,
                bg: "bg-secondary/20"
              },
              {
                title: "Chat",
                desc: "talk like WhatsApp coral — bit built for change",
                icon: Users,
                bg: "bg-white/5"
              },
              {
                title: "CAT",
                desc: "community added tax makes every sale do good",
                icon: Heart,
                bg: "bg-error/20"
              }
            ].map((feature, idx) => (
              <div key={idx} className={cn("p-12 rounded-[3rem] border border-white/10 flex items-start gap-8 group hover:bg-white/20 transition-all", feature.bg)}>
                <div className="w-20 h-20 bg-white/10 rounded-2xl flex items-center justify-center shrink-0 group-hover:scale-110 transition-transform">
                  <feature.icon className="w-10 h-10" />
                </div>
                <div>
                  <h3 className="text-4xl font-headline font-black mb-4">{feature.title}</h3>
                  <p className="text-xl opacity-80 font-medium leading-relaxed">{feature.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Media Hub */}
      <section className="py-24">
        <div className="max-w-7xl mx-auto px-6">
          <div className="flex items-center justify-between mb-16">
            <div>
              <h2 className="text-5xl md:text-7xl font-headline font-black text-primary">media hub</h2>
              <p className="text-xl text-on-surface-variant font-medium mt-2">Share updates, promote your business, and highlight what matters.</p>
            </div>
            <button className="hidden md:flex items-center gap-2 px-8 py-4 bg-surface-container-low rounded-full font-black uppercase tracking-widest text-primary hover:bg-surface-container-high transition-all">
              view all
              <ChevronRight className="w-5 h-5" />
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {[
              {
                title: "Radio Show Replay",
                desc: "Listen to our latest community broadcast.",
                tag: "Broadcast",
                color: "bg-primary"
              },
              {
                title: "How CAT Works",
                desc: "Learn how your trades impact local causes.",
                tag: "Education",
                color: "bg-secondary"
              },
              {
                title: "What is Lalela Really About?",
                desc: "The vision behind the platform.",
                tag: "Vision",
                color: "bg-error"
              }
            ].map((card, idx) => (
              <div key={idx} className="bg-surface-container-lowest rounded-[3rem] overflow-hidden border border-outline-variant/10 shadow-sm group">
                <div className={cn("h-48 relative flex items-center justify-center", card.color)}>
                  <Play className="w-16 h-16 text-white/40 group-hover:scale-110 transition-transform" />
                </div>
                <div className="p-10 space-y-4">
                  <span className="text-[10px] font-black uppercase tracking-widest text-outline">{card.tag}</span>
                  <h4 className="text-2xl font-headline font-black text-primary leading-tight">{card.title}</h4>
                  <p className="text-on-surface-variant font-medium">{card.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Final CTA & Join Form */}
      <section id="join" className="py-24 bg-surface-container-low relative overflow-hidden">
        <div id="recaptcha-container"></div>
        <div className="absolute top-0 left-0 w-full h-full opacity-5 pointer-events-none">
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[1000px] h-[1000px] bg-primary rounded-full blur-[120px]" />
        </div>

        <div className="max-w-7xl mx-auto px-6 relative z-10">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-20 items-center">
            <div className="space-y-10">
              <h2 className="text-6xl md:text-8xl font-headline font-black text-primary leading-[0.9]">
                Start your community today
              </h2>
              <p className="text-2xl text-on-surface-variant font-medium leading-relaxed">
                Join Lalela and take control of how your community connects, trades, and grows.
              </p>
              
              <div className="space-y-6">
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 rounded-2xl bg-primary/10 flex items-center justify-center text-primary">
                    <CheckCircle2 className="w-6 h-6" />
                  </div>
                  <p className="text-lg font-bold text-primary">30 days free for admins</p>
                </div>
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 rounded-2xl bg-secondary/10 flex items-center justify-center text-secondary">
                    <Users className="w-6 h-6" />
                  </div>
                  <p className="text-lg font-bold text-primary">Unlimited member invites</p>
                </div>
              </div>
            </div>

            <div className="bg-white p-5 sm:p-8 lg:p-12 rounded-[2.5rem] sm:rounded-[3rem] lg:rounded-[4rem] shadow-2xl border border-outline-variant/10 space-y-6 sm:space-y-8 lg:space-y-10">
              <div className="flex p-2 bg-surface-container-low rounded-3xl">
                <button 
                  onClick={() => { setJoinMode('start'); setIsOtpSent(false); }}
                  className={cn(
                    "flex-1 py-3 sm:py-4 rounded-2xl font-black uppercase tracking-widest transition-all text-xs sm:text-sm",
                    joinMode === 'start' ? "bg-white text-primary shadow-lg" : "text-outline hover:text-primary"
                  )}
                >
                  Start
                </button>
                <button 
                  onClick={() => { setJoinMode('login'); setIsOtpSent(false); }}
                  className={cn(
                    "flex-1 py-3 sm:py-4 rounded-2xl font-black uppercase tracking-widest transition-all text-xs sm:text-sm",
                    joinMode === 'login' ? "bg-white text-primary shadow-lg" : "text-outline hover:text-primary"
                  )}
                >
                  Login
                </button>
              </div>

              <div className="text-center space-y-1.5 sm:space-y-2">
                <h3 className="text-2xl sm:text-3xl font-headline font-black text-primary leading-tight">
                  {joinMode === 'start' ? 'Create Your Account' : 'Welcome Back'}
                </h3>
                <p className="text-sm sm:text-base text-on-surface-variant font-medium">
                  {joinMode === 'start'
                    ? 'Start or join a community — set up in minutes'
                    : 'Sign in to access your communities'}
                </p>
              </div>

              {isOtpSent ? (
                <form onSubmit={handleVerifyOtp} className="space-y-6">
                  <div className="space-y-2 text-center">
                    <h3 className="text-xl font-headline font-black text-primary">Verify Your Number</h3>
                    <p className="text-sm font-medium text-on-surface-variant">We've sent a code to {getFormattedPhoneNumber()}</p>
                  </div>
                  
                  <div className="space-y-2">
                    <label className="text-[10px] font-black uppercase tracking-widest text-outline ml-2">6-Digit Code</label>
                    <input 
                      type="text" 
                      value={otpCode}
                      onChange={(e) => setOtpCode(e.target.value.replace(/\D/g, ''))}
                      maxLength={6}
                      placeholder="000000"
                      required
                      className="w-full px-6 py-4 bg-surface-container-low border-none rounded-2xl focus:ring-2 focus:ring-primary/20 transition-all font-bold text-center tracking-widest text-2xl"
                    />
                  </div>

                  <button 
                    type="submit"
                    disabled={isSubmitting || otpCode.length !== 6}
                    className="w-full py-5 bg-secondary text-white rounded-2xl font-black text-lg uppercase tracking-widest shadow-xl shadow-secondary/20 hover:scale-[1.02] active:scale-95 transition-all disabled:opacity-50"
                  >
                    {isSubmitting ? 'Verifying...' : 'Verify Code'}
                  </button>

                  {error && (
                    <p className="text-xs text-error font-medium bg-error/5 p-4 rounded-2xl border border-error/10 text-center">
                      {error}
                    </p>
                  )}

                  <button
                    type="button"
                    onClick={() => setIsOtpSent(false)}
                    className="w-full text-sm font-bold text-outline hover:text-primary transition-colors text-center"
                  >
                    Use a different number
                  </button>
                </form>
              ) : (
                <form onSubmit={handleAuthSubmit} className="space-y-4 sm:space-y-6">
                  {joinMode === 'start' && (
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <label className="text-[10px] font-black uppercase tracking-widest text-outline ml-2">First Name *</label>
                        <input 
                          type="text" 
                          value={name}
                          onChange={(e) => setName(e.target.value)}
                          placeholder="e.g. Sipho"
                          required
                          className="w-full px-4 sm:px-6 py-3 sm:py-4 bg-surface-container-low border-none rounded-2xl focus:ring-2 focus:ring-primary/20 transition-all font-bold"
                        />
                      </div>
                      <div className="space-y-2">
                        <label className="text-[10px] font-black uppercase tracking-widest text-outline ml-2">Last Name *</label>
                        <input 
                          type="text" 
                          value={lastName}
                          onChange={(e) => setLastName(e.target.value)}
                          placeholder="e.g. Ndlovu"
                          required
                          className="w-full px-4 sm:px-6 py-3 sm:py-4 bg-surface-container-low border-none rounded-2xl focus:ring-2 focus:ring-primary/20 transition-all font-bold"
                        />
                      </div>
                    </div>
                  )}

                  <div className="space-y-2 relative">
                    <label className="text-[10px] font-black uppercase tracking-widest text-outline ml-2">Email Address {joinMode === 'start' ? '*' : ''}</label>
                    <input
                      type="email"
                      value={email}
                      onChange={(e) => {
                        setEmail(e.target.value);
                        if (e.target.value) setMobileNumber('');
                      }}
                      placeholder="your@email.com"
                      required={!isPhoneMode}
                      disabled={mobileNumber.length > 0}
                      className="w-full px-4 sm:px-6 py-3 sm:py-4 bg-surface-container-low border-none rounded-2xl focus:ring-2 focus:ring-primary/20 font-bold outline-none transition-all disabled:opacity-40 disabled:cursor-not-allowed"
                    />
                  </div>

                  <div className="relative flex items-center">
                    <div className="flex-1 border-t border-outline/20"></div>
                    <span className="mx-3 text-[10px] font-black uppercase tracking-widest text-outline/50">or</span>
                    <div className="flex-1 border-t border-outline/20"></div>
                  </div>

                  <div className="space-y-2 relative">
                    <label className="text-[10px] font-black uppercase tracking-widest text-outline ml-2">Phone Number {joinMode === 'start' ? '*' : ''}</label>
                    <div className="flex gap-1.5 sm:gap-2">
                      <select
                        value={countryCode}
                        onChange={(e) => setCountryCode(e.target.value)}
                        disabled={email.length > 0}
                        className="min-w-[88px] sm:min-w-[120px] px-2.5 sm:px-4 py-3 sm:py-4 bg-surface-container-low border-none rounded-2xl focus:ring-2 focus:ring-primary/20 font-bold text-sm sm:text-base outline-none cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed"
                      >
                        <option value="+27">+27</option>
                        <option value="+1">+1</option>
                        <option value="+44">+44</option>
                        <option value="+91">+91</option>
                        <option value="+254">+254</option>
                        <option value="+234">+234</option>
                        <option value="+49">+49</option>
                        <option value="+33">+33</option>
                        <option value="+61">+61</option>
                      </select>
                      <input
                        type="tel"
                        value={mobileNumber}
                        onChange={(e) => {
                          setMobileNumber(e.target.value);
                          if (e.target.value) setEmail('');
                        }}
                        placeholder="082 123 4567"
                        disabled={email.length > 0}
                        className="flex-1 min-w-0 px-4 sm:px-6 py-3 sm:py-4 bg-surface-container-low border-none rounded-2xl focus:ring-2 focus:ring-primary/20 font-bold outline-none transition-all disabled:opacity-40 disabled:cursor-not-allowed"
                      />
                    </div>
                  </div>

                  {!isPhoneMode && (
                    <div className="space-y-2 relative">
                      <label className="text-[10px] font-black uppercase tracking-widest text-outline ml-2">Password {joinMode === 'start' ? '*' : ''}</label>
                      <div className="relative">
                        <input 
                          type={showPassword ? "text" : "password"}
                          value={password}
                          onChange={(e) => setPassword(e.target.value)}
                          placeholder="Enter your password"
                          required={!isPhoneMode}
                          className="w-full px-4 sm:px-6 py-3 sm:py-4 bg-surface-container-low border-none rounded-2xl focus:ring-2 focus:ring-primary/20 transition-all font-bold pr-12"
                        />
                        <button
                          type="button"
                          onClick={() => setShowPassword(!showPassword)}
                          className="absolute right-4 top-1/2 -translate-y-1/2 text-outline hover:text-primary transition-colors"
                        >
                          {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                        </button>
                      </div>
                      {joinMode === 'login' && (
                        <button
                          type="button"
                          onClick={() => { setShowForgotPassword(true); setForgotEmail(email); setForgotSent(false); setForgotError(null); }}
                          className="text-xs font-bold text-primary hover:text-secondary transition-colors ml-2 mt-2 block"
                        >
                          Forgot password?
                        </button>
                      )}
                    </div>
                  )}

                  {joinMode === 'start' && !isPhoneMode && (
                    <div className="space-y-2 relative">
                      <label className="text-[10px] font-black uppercase tracking-widest text-outline ml-2">Confirm Password *</label>
                      <div className="relative">
                        <input 
                          type={showConfirmPassword ? "text" : "password"}
                          value={confirmPassword}
                          onChange={(e) => setConfirmPassword(e.target.value)}
                          placeholder="Re-enter your password"
                          required={!isPhoneMode}
                          className="w-full px-4 sm:px-6 py-3 sm:py-4 bg-surface-container-low border-none rounded-2xl focus:ring-2 focus:ring-primary/20 transition-all font-bold pr-12"
                        />
                        <button
                          type="button"
                          onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                          className="absolute right-4 top-1/2 -translate-y-1/2 text-outline hover:text-primary transition-colors"
                        >
                          {showConfirmPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                        </button>
                      </div>
                    </div>
                  )}

                  {joinMode === 'start' && (
                    <div className="space-y-4 pt-2">
                      <label className="flex items-start gap-3 cursor-pointer group">
                        <div className="relative flex items-center justify-center mt-0.5">
                          <input 
                            type="checkbox" 
                            checked={agreedToTerms}
                            onChange={(e) => setAgreedToTerms(e.target.checked)}
                            required
                            className="w-5 h-5 appearance-none rounded-lg border-2 border-outline-variant/30 checked:border-primary checked:bg-primary transition-all cursor-pointer peer"
                          />
                          <CheckCircle2 className="w-3.5 h-3.5 text-white absolute opacity-0 peer-checked:opacity-100 pointer-events-none transition-opacity" />
                        </div>
                        <span className="text-xs font-medium text-on-surface-variant leading-relaxed">
                          I agree to the <a href="#" className="font-bold text-primary hover:underline">Terms & Conditions</a> and <a href="#" className="font-bold text-primary hover:underline">Privacy Policy</a> *
                        </span>
                      </label>
                      <label className="flex items-start gap-3 cursor-pointer group">
                        <div className="relative flex items-center justify-center mt-0.5">
                          <input 
                            type="checkbox" 
                            checked={marketingConsent}
                            onChange={(e) => setMarketingConsent(e.target.checked)}
                            className="w-5 h-5 appearance-none rounded-lg border-2 border-outline-variant/30 checked:border-primary checked:bg-primary transition-all cursor-pointer peer"
                          />
                          <CheckCircle2 className="w-3.5 h-3.5 text-white absolute opacity-0 peer-checked:opacity-100 pointer-events-none transition-opacity" />
                        </div>
                        <span className="text-xs font-medium text-on-surface-variant leading-relaxed">
                          I'd like to receive community updates and promotional emails
                        </span>
                      </label>
                    </div>
                  )}
                  
                  <button 
                    type="submit"
                    disabled={isSubmitting}
                    className="w-full py-4 sm:py-5 bg-secondary text-white rounded-2xl font-black text-base sm:text-lg uppercase tracking-widest shadow-xl shadow-secondary/20 hover:scale-[1.02] active:scale-95 transition-all disabled:opacity-50"
                  >
                    {isSubmitting ? (joinMode === 'login' ? 'Signing In...' : 'Creating Account...') : joinMode === 'start' ? 'Create Account' : 'Sign In'}
                  </button>

                  {error && (
                    <p className="text-xs text-error font-medium bg-error/5 p-4 rounded-2xl border border-error/10 text-center">
                      {error}
                    </p>
                  )}

                  <div className="relative py-4">
                    <div className="absolute inset-0 flex items-center"><div className="w-full border-t border-outline-variant/20" /></div>
                    <div className="relative flex justify-center text-xs uppercase font-black tracking-widest text-outline"><span className="bg-white px-4">or</span></div>
                  </div>

                  <button 
                    type="button"
                    onClick={handleGoogleLogin}
                    disabled={isSubmitting}
                    className="w-full py-4 sm:py-5 bg-surface-container-low text-primary rounded-2xl font-black text-base sm:text-lg uppercase tracking-widest border border-outline-variant/10 hover:bg-surface-container-high transition-all flex items-center justify-center gap-3 disabled:opacity-50"
                  >
                    <img src="https://www.google.com/favicon.ico" className="w-6 h-6" alt="Google" />
                    Continue with Google
                  </button>
                </form>
              )}
            </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-primary text-white py-20">
        <div className="max-w-7xl mx-auto px-6">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-12 mb-20">
            <div className="col-span-2 md:col-span-1 space-y-6">
              <div className="flex items-center gap-2">
                <div className="w-10 h-10 rounded-xl overflow-hidden">
                  <img 
                    src={APP_LOGO_PATH}
                    alt="Lalela Logo" 
                    className="w-full h-full object-cover"
                  />
                </div>
                <span className="text-3xl font-headline font-black tracking-tight">lalela</span>
              </div>
              <p className="text-sm opacity-60 font-medium leading-relaxed">
                Build your own community — access your stage in some days.
              </p>
            </div>
            
            <div className="space-y-6">
              <h5 className="text-[10px] font-black uppercase tracking-widest opacity-40">Company</h5>
              <ul className="space-y-4 font-bold text-sm">
                <li><a href="#" className="hover:text-secondary transition-colors">About</a></li>
                <li><button onClick={onViewBenefits} className="hover:text-secondary transition-colors">Benefits & Pricing</button></li>
                <li><a href="#" className="hover:text-secondary transition-colors">Work</a></li>
                <li><a href="#" className="hover:text-secondary transition-colors">Blog</a></li>
                <li><a href="#" className="hover:text-secondary transition-colors">Media</a></li>
              </ul>
            </div>

            <div className="space-y-6">
              <h5 className="text-[10px] font-black uppercase tracking-widest opacity-40">Social</h5>
              <ul className="space-y-4 font-bold text-sm">
                <li><a href="#" className="hover:text-secondary transition-colors">Instagram</a></li>
                <li><a href="#" className="hover:text-secondary transition-colors">TikTok</a></li>
                <li><a href="#" className="hover:text-secondary transition-colors">Twitter</a></li>
              </ul>
            </div>

            <div className="space-y-6">
              <h5 className="text-[10px] font-black uppercase tracking-widest opacity-40">Legal</h5>
              <ul className="space-y-4 font-bold text-sm">
                <li><a href="#" className="hover:text-secondary transition-colors">Privacy</a></li>
                <li><a href="#" className="hover:text-secondary transition-colors">Terms</a></li>
              </ul>
            </div>
          </div>
          
          <div className="pt-12 border-t border-white/10 flex flex-col md:flex-row justify-between items-center gap-6">
            <p className="text-xs opacity-40 font-bold">© 2026 Lalela. All rights reserved.</p>
            <div className="flex gap-8 text-xs font-bold opacity-40">
              <a href="#">Support</a>
              <a href="#">Contact</a>
            </div>
          </div>
        </div>
      </footer>

      {/* Forgot Password Overlay */}
      <AnimatePresence>
        {showForgotPassword && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[100] bg-black/50 backdrop-blur-sm flex items-center justify-center px-6"
            onClick={() => setShowForgotPassword(false)}
          >
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="bg-white p-10 rounded-3xl shadow-2xl border border-outline-variant/10 max-w-md w-full space-y-6"
              onClick={(e) => e.stopPropagation()}
            >
              {forgotSent ? (
                <div className="space-y-6 text-center">
                  <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center mx-auto">
                    <Mail className="w-8 h-8 text-primary" />
                  </div>
                  <div className="space-y-2">
                    <h3 className="text-2xl font-headline font-black text-primary">Check Your Email</h3>
                    <p className="text-on-surface-variant font-medium">
                      We sent a password reset link to <span className="font-bold text-primary">{forgotEmail}</span>
                    </p>
                    <p className="text-sm text-outline">
                      Click the link in the email to set a new password. Check your spam folder if you don't see it.
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => setShowForgotPassword(false)}
                    className="w-full py-4 bg-primary text-white rounded-2xl font-black uppercase tracking-widest hover:scale-[1.02] active:scale-95 transition-all"
                  >
                    Back to Login
                  </button>
                </div>
              ) : (
                <form onSubmit={handleForgotPassword} className="space-y-6">
                  <div className="text-center space-y-3">
                    <img
                      src={APP_LOGO_PATH}
                      alt="Lalela logo"
                      className="w-14 h-14 rounded-2xl object-cover mx-auto shadow-lg shadow-primary/20"
                      referrerPolicy="no-referrer"
                    />
                    <h2 className="text-2xl font-headline font-black text-primary">Reset Password</h2>
                    <p className="text-sm text-on-surface-variant font-medium">
                      Enter your email and we'll send you a link to reset your password.
                    </p>
                  </div>
                  <div className="space-y-2">
                    <label className="text-[10px] font-black uppercase tracking-widest text-outline ml-2">Email Address</label>
                    <input
                      type="email"
                      value={forgotEmail}
                      onChange={(e) => setForgotEmail(e.target.value)}
                      placeholder="your@email.com"
                      required
                      className="w-full px-6 py-4 bg-surface-container-low border-none rounded-2xl focus:ring-2 focus:ring-primary/20 transition-all font-bold"
                    />
                  </div>
                  {forgotError && (
                    <p className="text-xs text-error font-medium bg-error/5 p-4 rounded-2xl border border-error/10 text-center">
                      {forgotError}
                    </p>
                  )}
                  <button
                    type="submit"
                    disabled={forgotSubmitting || !forgotEmail}
                    className="w-full py-5 bg-secondary text-white rounded-2xl font-black text-lg uppercase tracking-widest shadow-xl shadow-secondary/20 hover:scale-[1.02] active:scale-95 transition-all disabled:opacity-50"
                  >
                    {forgotSubmitting ? 'Sending...' : 'Send Reset Link'}
                  </button>
                  <button
                    type="button"
                    onClick={() => setShowForgotPassword(false)}
                    className="w-full text-sm font-bold text-outline hover:text-primary transition-colors text-center"
                  >
                    Back to Login
                  </button>
                </form>
              )}
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};
