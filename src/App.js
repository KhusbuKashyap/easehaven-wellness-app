import React, { useState, useEffect, useRef, createContext, useContext } from 'react';
import { initializeApp } from 'firebase/app';
import { getAuth, onAuthStateChanged, createUserWithEmailAndPassword, signInWithEmailAndPassword, signOut, GoogleAuthProvider, signInWithPopup, sendPasswordResetEmail, sendEmailVerification } from 'firebase/auth';
import { getFirestore, doc, setDoc, getDoc, collection, addDoc, query, onSnapshot, updateDoc, serverTimestamp, deleteDoc, runTransaction, getDocs } from 'firebase/firestore';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';
import { Bot, Feather, Home, LogOut, MessageSquare, Sun, Moon, User, Award, Sparkles, Send, Smile, Meh, Frown, Angry, Laugh, BookOpen, Lightbulb, Shield, ShieldOff, ChevronsLeft, ChevronsRight, AlertTriangle, MailCheck, Users, ThumbsUp, ThumbsDown, MessageCircle, MoreVertical, Edit, Trash2, BarChart as BarChartIcon, BrainCircuit, Leaf, HeartHandshake, Headphones, Gamepad2, Wind } from 'lucide-react';

// --- Firebase Configuration & Initialization ---
// IMPORTANT: The provided API keys are placeholders and will not work.
// In a real application, these should be replaced with your actual Firebase project configuration
// and secured properly (e.g., using environment variables).
const firebaseConfig = {
  apiKey: process.env.REACT_APP_FIREBASE_API_KEY,
  authDomain: process.env.REACT_APP_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.REACT_APP_FIREBASE_PROJECT_ID,
  storageBucket: process.env.REACT_APP_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.REACT_APP_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.REACT_APP_FIREBASE_APP_ID
};


const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);

// --- Helper Components ---
const Logo = ({ className }) => (
    <svg className={className} viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
        <path d="M12 2L2 12h3v8h14v-8h3L12 2z" className="text-cyan-500/20 dark:text-cyan-400/20" fill="currentColor"/>
        <path d="M12 5.69l-5 4.5V18h10v-7.81l-5-4.5zM12 3l9 8h-3v8H6v-8H3l9-8z" className="text-cyan-500/50 dark:text-cyan-400/50" fill="currentColor" />
        <path d="M12 11.2C10.8 10 8.8 10.8 8.8 12.6C8.8 14.4 12 18 12 18S15.2 14.4 15.2 12.6C15.2 10.8 13.2 10 12 11.2z" className="text-pink-500 dark:text-pink-400" fill="currentColor"/>
    </svg>
);

const ErrorDisplay = ({ message }) => {
    if (!message) return null;
    return (
        <div className="bg-red-100 dark:bg-red-900/30 border-l-4 border-red-500 text-red-700 dark:text-red-300 p-3 rounded-md my-2 text-sm flex items-center gap-3">
            <AlertTriangle size={20} className="flex-shrink-0" />
            <span>{message}</span>
        </div>
    );
};

const EmailVerificationNotice = ({ user, onResend }) => {
    if (!user || user.emailVerified) return null;
    return (
        <div className="bg-yellow-100 dark:bg-yellow-900/30 border-l-4 border-yellow-500 text-yellow-800 dark:text-yellow-300 p-4 rounded-lg my-4">
            <h4 className="font-bold">Verify Your Email Address</h4>
            <p className="text-sm mt-1">To ensure your account is secure, please check your inbox for a verification link. Your account is not fully active until your email is verified.</p>
            <button onClick={onResend} className="text-sm font-semibold text-yellow-900 dark:text-yellow-200 hover:underline mt-2">Resend Verification Email</button>
        </div>
    );
};

const ConfirmModal = ({ isOpen, onClose, onConfirm, title, children }) => {
    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 bg-black bg-opacity-60 flex items-center justify-center z-50 animate-fade-in">
            <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-2xl p-8 w-full max-w-md m-4">
                <h2 className="text-xl font-bold mb-4">{title}</h2>
                <div className="text-slate-600 dark:text-slate-300 mb-6">
                    {children}
                </div>
                <div className="flex justify-end gap-4">
                    <button 
                        onClick={onClose} 
                        className="py-2 px-5 rounded-lg bg-slate-200 dark:bg-slate-600 text-slate-800 dark:text-slate-200 font-semibold hover:bg-slate-300 dark:hover:bg-slate-500">
                        Cancel
                    </button>
                    <button 
                        onClick={onConfirm} 
                        className="py-2 px-5 rounded-lg bg-red-500 text-white font-semibold hover:bg-red-600">
                        Confirm Delete
                    </button>
                </div>
            </div>
        </div>
    );
};


// --- Authentication Context ---
const AuthContext = createContext();
export const useAuth = () => useContext(AuthContext);

const AuthProvider = ({ children }) => {
    const [user, setUser] = useState(null);
    const [userData, setUserData] = useState(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
            if (firebaseUser) {
                await firebaseUser.reload();
                
                if (!firebaseUser.emailVerified && !firebaseUser.providerData.some(p => p.providerId === 'google.com')) {
                    setUser(firebaseUser);
                    setUserData(null);
                    setLoading(false);
                    return;
                }

                const userDocRef = doc(db, 'users', firebaseUser.uid);
                
                try {
                    const docSnap = await getDoc(userDocRef);
                    if (!docSnap.exists()) {
                        const initialData = {
                            name: firebaseUser.displayName || 'New User',
                            email: firebaseUser.email || '',
                            createdAt: serverTimestamp(),
                            age: '',
                            occupation: '',
                            profile_pic: firebaseUser.photoURL || `https://api.dicebear.com/7.x/initials/svg?seed=${firebaseUser.displayName || 'User'}`
                        };
                        await setDoc(userDocRef, initialData);
                        const streakRef = doc(db, `users/${firebaseUser.uid}/streaks`, 'data');
                        await setDoc(streakRef, { current_streak: 0, longest_streak: 0, last_logged_date: null });
                    }
                } catch (error) {
                    console.error("Error ensuring user document exists:", error);
                    setUser(firebaseUser);
                    setUserData(null); 
                    setLoading(false);
                    return;
                }

                const docUnsubscribe = onSnapshot(userDocRef, (docSnap) => {
                    if (docSnap.exists()) {
                        setUserData({ id: docSnap.id, ...docSnap.data() });
                    }
                    setUser(firebaseUser);
                    setLoading(false);
                }, (error) => {
                    console.error("Firestore snapshot error on user document:", error);
                    setUser(firebaseUser);
                    setUserData(null);
                    setLoading(false);
                });

                return () => docUnsubscribe();

            } else {
                setUser(null);
                setUserData(null);
                setLoading(false);
            }
        });
        
        return () => unsubscribe();
    }, []);

    const value = { user, userData, loading };

    return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

// --- Main App Component ---
export default function App() {
    return (
        <AuthProvider>
            <MainApp />
        </AuthProvider>
    );
}

function MainApp() {
    const { user, loading } = useAuth();
    const [currentPage, setCurrentPage] = useState('dashboard');
    const [publicPage, setPublicPage] = useState('home'); // 'home', 'auth', 'games', 'yoga', 'music'
    const [theme, setTheme] = useState('light');
    const [isSidebarExpanded, setIsSidebarExpanded] = useState(false);

    useEffect(() => {
        try {
            const storedTheme = localStorage.getItem('easehaven-theme');
            const systemPrefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
            const initialTheme = storedTheme || (systemPrefersDark ? 'dark' : 'light');
            setTheme(initialTheme);
        } catch (error) {
            console.warn("Could not access localStorage for theme:", error);
            setTheme('light');
        }
    }, []);

    useEffect(() => {
        const root = document.documentElement;
        root.classList.toggle('dark', theme === 'dark');
        try {
            localStorage.setItem('easehaven-theme', theme);
        } catch (error) {
            console.warn("Could not save theme to localStorage:", error);
        }
    }, [theme]);

    const toggleTheme = () => setTheme(prev => (prev === 'light' ? 'dark' : 'light'));

    if (loading) {
        return (
            <div className="flex items-center justify-center min-h-screen bg-slate-50 dark:bg-slate-900">
                <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-cyan-500"></div>
            </div>
        );
    }
    
    if (!user || (!user.emailVerified && !user.providerData.some(p => p.providerId === 'google.com'))) {
        switch (publicPage) {
            case 'auth':
                return <AuthScreen onNavigateToHome={() => setPublicPage('home')} />;
            case 'games':
                return <StressGamesScreen onNavigateToHome={() => setPublicPage('home')} />;
            case 'yoga':
                return <YogaTechniquesScreen onNavigateToHome={() => setPublicPage('home')} />;
            case 'music':
                return <RelaxingMusicScreen onNavigateToHome={() => setPublicPage('home')} />;
            case 'home':
            default:
                return <PublicHomePage 
                    onNavigateToAuth={() => setPublicPage('auth')} 
                    onNavigateToPage={(page) => setPublicPage(page)}
                />;
        }
    }
    
    const renderPage = () => {
        switch (currentPage) {
            case 'dashboard': return <DashboardScreen onNavigate={setCurrentPage} />;
            case 'tracker': return <MoodTrackerScreen onLogSuccess={() => setCurrentPage('dashboard')} />;
            case 'journal': return <JournalScreen />;
            case 'analytics': return <AnalyticsScreen />;
            case 'community': return <CommunityScreen />;
            case 'profile': return <ProfileScreen />;
            case 'games': return <StressGamesScreen onNavigateToHome={() => setCurrentPage('dashboard')} backButtonLabel="Dashboard" />;
            case 'yoga': return <YogaTechniquesScreen onNavigateToHome={() => setCurrentPage('dashboard')} backButtonLabel="Dashboard" />;
            case 'music': return <RelaxingMusicScreen onNavigateToHome={() => setCurrentPage('dashboard')} backButtonLabel="Dashboard" />;
            default: return <DashboardScreen onNavigate={setCurrentPage} />;
        }
    };

    return (
        <div className={`min-h-screen font-sans bg-slate-50 dark:bg-slate-900 text-slate-800 dark:text-slate-200 flex`}>
            <Sidebar 
                currentPage={currentPage} 
                setCurrentPage={setCurrentPage} 
                toggleTheme={toggleTheme} 
                theme={theme}
                isExpanded={isSidebarExpanded}
                setIsExpanded={setIsSidebarExpanded}
            />
            <main className="flex-1 p-4 sm:p-6 lg:p-8 overflow-y-auto">
                {renderPage()}
            </main>
            <ChatAssistant />
        </div>
    );
}

// --- Screens ---

function AuthScreen({ onNavigateToHome }) {
  const [authMode, setAuthMode] = useState('login'); 
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');
  const [loading, setLoading] = useState(false);
  const [verificationSent, setVerificationSent] = useState(false);

  const handleGoogleSignIn = async () => {
      setLoading(true);
      setError('');
      setMessage('');
      const provider = new GoogleAuthProvider();
      provider.setCustomParameters({ prompt: 'select_account' });
      try {
          await signInWithPopup(auth, provider);
      } catch (err) {
          setError(err.message.replace('Firebase: ', ''));
          setLoading(false);
      }
  };

  const handleEmailAuth = async (e) => {
      e.preventDefault();
      setLoading(true);
      setError('');
      setMessage('');
      try {
          if (authMode === 'login') {
              await signInWithEmailAndPassword(auth, email, password);
          } else {
              const userCredential = await createUserWithEmailAndPassword(auth, email, password);
              await sendEmailVerification(userCredential.user);
              setVerificationSent(true);
          }
      } catch (err) {
          setError(err.message.replace('Firebase: ', ''));
      } finally {
          setLoading(false);
      }
  };

  const handleResendVerification = async () => {
    setLoading(true);
    setError('');
    setMessage('');
    try {
        if(auth.currentUser){
            await sendEmailVerification(auth.currentUser);
            setMessage('A new verification email has been sent.');
        } else {
            setError("Could not find user. Please try logging in again.");
        }
    } catch (err) {
        setError(err.message.replace('Firebase: ', ''));
    } finally {
        setLoading(false);
    }
  };

  const handlePasswordReset = async (e) => {
      e.preventDefault();
      setLoading(true);
      setError('');
      setMessage('');
      try {
          await sendPasswordResetEmail(auth, email);
          setMessage(`If an account exists for ${email}, a password reset link has been sent. Please check your inbox and spam folder.`);
      } catch (err) {
          setError(err.message.replace('Firebase: ', ''));
      } finally {
          setLoading(false);
      }
  };

  const getTitle = () => {
      if (authMode === 'login') return 'Sign in to continue';
      if (authMode === 'signup') return 'Create your account';
      return 'Reset your password';
  };

  if (verificationSent) {
    return (
        <div className="flex flex-col items-center justify-center w-full min-h-screen bg-gradient-to-br from-cyan-50 to-blue-100 dark:from-slate-800 dark:to-slate-900">
            <div className="w-full max-w-md p-8 space-y-6 bg-white dark:bg-slate-800 rounded-2xl shadow-lg text-center">
                <MailCheck className="w-16 h-16 text-green-500 mx-auto" />
                <h1 className="text-2xl font-bold text-slate-800 dark:text-white">Verify Your Email</h1>
                <p className="text-slate-500 dark:text-slate-400">
                    We've sent a verification link to <span className="font-semibold text-cyan-500">{email}</span>. Please click the link in the email to activate your account.
                </p>
                <ErrorDisplay message={error} />
                {message && <p className="text-green-600 dark:text-green-400 text-sm text-center bg-green-100 dark:bg-green-900 p-3 rounded-md">{message}</p>}
                <div className="space-y-3 pt-4">
                    <p className="text-xs text-slate-400 dark:text-slate-500">
                        Once verified, you will be logged in automatically.
                    </p>
                    <button onClick={handleResendVerification} disabled={loading} className="w-full text-sm font-medium text-cyan-500 hover:underline disabled:opacity-50">
                        {loading ? 'Sending...' : "Didn't receive the email? Resend"}
                    </button>
                    <button onClick={() => { setVerificationSent(false); setAuthMode('login'); signOut(auth); }} className="w-full text-sm font-medium text-slate-500 hover:underline">
                        Back to Login
                    </button>
                </div>
            </div>
        </div>
    );
  }

  return (
      <div className="flex flex-col items-center justify-center w-full min-h-screen bg-gradient-to-br from-cyan-50 to-blue-100 dark:from-slate-800 dark:to-slate-900">
          <button onClick={onNavigateToHome} className="absolute top-4 left-4 text-slate-600 dark:text-slate-300 hover:text-cyan-500 dark:hover:text-cyan-400 transition-colors">
              &larr; Back to Home
          </button>
          <div className="w-full max-w-md p-8 space-y-4 bg-white dark:bg-slate-800 rounded-2xl shadow-lg">
              <div className="text-center">
                  <Logo className="w-16 h-16 mx-auto mb-2" />
                  <h1 className="text-3xl font-bold text-slate-800 dark:text-white">
                      {authMode === 'reset' ? 'Forgot Password' : 'Welcome to EaseHaven'}
                  </h1>
                  <p className="text-slate-500 dark:text-slate-400">{getTitle()}</p>
              </div>
              
              <ErrorDisplay message={error} />
              {message && <p className="text-green-600 dark:text-green-400 text-sm text-center bg-green-100 dark:bg-green-900 p-3 rounded-md">{message}</p>}

              {authMode !== 'reset' && (
                  <>
                      <button onClick={handleGoogleSignIn} disabled={loading} className="w-full flex items-center justify-center gap-2 bg-white text-slate-700 font-semibold py-3 px-4 rounded-lg shadow-md hover:bg-slate-50 transition-all duration-300 dark:bg-slate-700 dark:text-slate-200 dark:hover:bg-slate-600">
                          <img src="https://www.gstatic.com/firebasejs/ui/2.0.0/images/auth/google.svg" alt="Google icon" className="w-6 h-6" />
                          Sign in with Google
                      </button>
                      <div className="relative flex py-2 items-center">
                          <div className="flex-grow border-t border-slate-200 dark:border-slate-600"></div>
                          <span className="flex-shrink mx-4 text-slate-400 text-xs uppercase">Or</span>
                          <div className="flex-grow border-t border-slate-200 dark:border-slate-600"></div>
                      </div>
                  </>
              )}

              <form onSubmit={authMode === 'reset' ? handlePasswordReset : handleEmailAuth} className="space-y-4">
                  {authMode === 'signup' && (
                      <input type="text" placeholder="Your Name" value={name} onChange={e => setName(e.target.value)} required className="w-full px-4 py-2 bg-slate-100 dark:bg-slate-700 rounded-md focus:outline-none focus:ring-2 focus:ring-cyan-500" />
                  )}
                  <input type="email" placeholder="Email" value={email} onChange={e => setEmail(e.target.value)} required className="w-full px-4 py-2 bg-slate-100 dark:bg-slate-700 rounded-md focus:outline-none focus:ring-2 focus:ring-cyan-500" />
                  {authMode !== 'reset' && (
                      <input type="password" placeholder="Password" value={password} onChange={e => setPassword(e.target.value)} required className="w-full px-4 py-2 bg-slate-100 dark:bg-slate-700 rounded-md focus:outline-none focus:ring-2 focus:ring-cyan-500" />
                  )}
                  
                  {authMode === 'login' && (
                      <div className="text-right">
                          <button type="button" onClick={() => { setAuthMode('reset'); setError(''); setMessage(''); }} className="text-sm font-medium text-cyan-500 hover:underline">
                              Forgot Password?
                          </button>
                      </div>
                  )}

                  <button type="submit" disabled={loading} className="w-full bg-cyan-500 text-white font-semibold py-3 px-4 rounded-lg shadow-lg hover:bg-cyan-600 transition-all duration-300 disabled:bg-cyan-300">
                      {loading ? 'Processing...' : (authMode === 'login' ? 'Login' : authMode === 'signup' ? 'Sign Up' : 'Send Reset Link')}
                  </button>
              </form>

              <p className="text-center text-sm text-slate-500 dark:text-slate-400">
                  {authMode === 'login' ? "Don't have an account?" : "Already have an account?"}
                  <button onClick={() => { setAuthMode(authMode === 'login' ? 'signup' : 'login'); setError(''); setMessage(''); }} className="font-semibold text-cyan-500 hover:underline ml-1">
                      {authMode === 'login' ? 'Sign Up' : 'Login'}
                  </button>
              </p>
          </div>
      </div>
  );
}

function PublicHomePage({ onNavigateToAuth, onNavigateToPage }) {
    const features = [
        { icon: <Feather className="w-8 h-8 text-cyan-500"/>, title: "Mood Tracking", description: "Log your daily mood and stress levels to understand your emotional patterns." },
        { icon: <BookOpen className="w-8 h-8 text-cyan-500"/>, title: "Private Journal", "description": "A secure, PIN-protected space for your thoughts, enhanced with AI reflections." },
        { icon: <Users className="w-8 h-8 text-cyan-500"/>, title: "Supportive Community", description: "Connect with others, share experiences, and find encouragement in our anonymous blog." },
    ];
    
    const techniques = [
        { page: 'games', icon: <Gamepad2 className="w-10 h-10 text-cyan-500"/>, title: "Mindful Games", description: "Engage in simple games designed to calm the mind and improve focus." },
        { page: 'yoga', icon: <Leaf className="w-10 h-10 text-cyan-500"/>, title: "Gentle Yoga", description: "Explore beginner-friendly yoga poses to release tension and connect with your body." },
        { page: 'music', icon: <Headphones className="w-10 h-10 text-cyan-500"/>, title: "Soothing Sounds", description: "Listen to a curated collection of music and sounds to promote relaxation and peace." },
    ];

    return (
        <div className="bg-slate-50 dark:bg-slate-900 text-slate-800 dark:text-slate-200 font-sans">
            {/* Header */}
            <header className="fixed top-0 left-0 right-0 bg-white/80 dark:bg-slate-900/80 backdrop-blur-sm z-50 shadow-sm">
                <div className="container mx-auto px-6 py-4 flex justify-between items-center">
                    <div className="flex items-center gap-2">
                        <Logo className="w-8 h-8" />
                        <span className="font-bold text-xl">EaseHaven</span>
                    </div>
                    <button onClick={onNavigateToAuth} className="bg-cyan-500 text-white font-semibold py-2 px-5 rounded-lg shadow-md hover:bg-cyan-600 transition-colors">
                        Sign In / Sign Up
                    </button>
                </div>
            </header>

            {/* Hero Section */}
            <section className="pt-32 pb-20 bg-gradient-to-b from-cyan-50 to-white dark:from-cyan-900/20 dark:to-slate-900">
                <div className="container mx-auto px-6 text-center">
                    <h1 className="text-4xl md:text-6xl font-extrabold text-slate-900 dark:text-white leading-tight">
                        Find Your Calm, <span className="text-cyan-500">One Breath at a Time.</span>
                    </h1>
                    <p className="mt-6 text-lg text-slate-600 dark:text-slate-300 max-w-2xl mx-auto">
                        EaseHaven is your personal companion for mental wellness. Track your mood, reflect in a private journal, and connect with a supportive community.
                    </p>
                    <button onClick={onNavigateToAuth} className="mt-10 bg-cyan-500 text-white font-bold py-4 px-8 rounded-full shadow-lg hover:bg-cyan-600 transition-transform hover:scale-105 transform">
                        Start Your Journey for Free
                    </button>
                </div>
            </section>

            {/* About Section */}
            <section id="about" className="py-20">
                <div className="container mx-auto px-6 flex flex-col md:flex-row items-center gap-12">
                    <div className="md:w-1/2">
                        <img src="https://placehold.co/600x400/E0F2F7/334155?text=Our+Mission" alt="Team collaborating" className="rounded-xl shadow-lg w-full"/>
                    </div>
                    <div className="md:w-1/2">
                        <h2 className="text-3xl font-bold mb-4">Our Aim and Origin</h2>
                        <p className="text-slate-600 dark:text-slate-400 mb-4">
                            EaseHaven was born from a simple idea: mental wellness tools should be accessible, private, and stigma-free. We aim to provide a safe and supportive digital environment where you can understand your feelings and actively work towards a more balanced life.
                        </p>
                        <p className="text-slate-600 dark:text-slate-400">
                            Our journey began with a small team passionate about mental health advocacy, building an app that serves as a gentle guide and a reliable friend.
                        </p>
                    </div>
                </div>
            </section>

            {/* Features Section */}
            <section id="features" className="py-20 bg-slate-100 dark:bg-slate-800">
                <div className="container mx-auto px-6 text-center">
                    <h2 className="text-3xl font-bold mb-2">A Toolkit for Your Mind</h2>
                    <p className="text-slate-600 dark:text-slate-400 mb-12 max-w-xl mx-auto">Everything you need to build a healthier relationship with your thoughts and emotions.</p>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                        {features.map(feature => (
                            <div key={feature.title} className="bg-white dark:bg-slate-900 p-8 rounded-xl shadow-md text-center">
                                <div className="inline-block p-4 bg-cyan-100 dark:bg-cyan-900/50 rounded-full mb-4">
                                    {feature.icon}
                                </div>
                                <h3 className="text-xl font-bold mb-2">{feature.title}</h3>
                                <p className="text-slate-600 dark:text-slate-400">{feature.description}</p>
                            </div>
                        ))}
                    </div>
                </div>
            </section>

            {/* Techniques Section */}
            <section id="techniques" className="py-20">
                <div className="container mx-auto px-6 text-center">
                    <h2 className="text-3xl font-bold mb-2">Discover Relaxation Techniques</h2>
                    <p className="text-slate-600 dark:text-slate-400 mb-12 max-w-xl mx-auto">Explore tools and activities designed to bring a sense of calm and well-being to your day.</p>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                        {techniques.map(tech => (
                            <div key={tech.title} className="bg-white dark:bg-slate-800 p-8 rounded-xl shadow-lg text-center flex flex-col items-center hover:shadow-cyan-500/20 transition-shadow duration-300">
                                <div className="inline-block p-5 bg-cyan-100 dark:bg-cyan-900/50 rounded-full mb-5">
                                    {tech.icon}
                                </div>
                                <h3 className="text-xl font-bold mb-3">{tech.title}</h3>
                                <p className="text-slate-600 dark:text-slate-400 flex-grow">{tech.description}</p>
                                <button onClick={() => onNavigateToPage(tech.page)} className="mt-6 bg-cyan-500 text-white font-semibold py-2 px-6 rounded-lg shadow-md hover:bg-cyan-600 transition-colors">
                                    Explore
                                </button>
                            </div>
                        ))}
                    </div>
                </div>
            </section>
            
            {/* Quotes Section */}
            <section className="py-20 bg-cyan-500 text-white">
                <div className="container mx-auto px-6 text-center">
                    <blockquote className="text-2xl md:text-3xl italic font-serif max-w-3xl mx-auto">
                        "The greatest weapon against stress is our ability to choose one thought over another."
                    </blockquote>
                    <cite className="mt-4 block font-semibold not-italic">- William James</cite>
                </div>
            </section>

            {/* Footer */}
            <footer className="bg-slate-100 dark:bg-slate-800 py-8">
                <div className="container mx-auto px-6 text-center text-slate-500 dark:text-slate-400">
                    <p>&copy; {new Date().getFullYear()} EaseHaven. All Rights Reserved.</p>
                    <p className="text-sm mt-2">A sanctuary for your mind.</p>
                </div>
            </footer>
        </div>
    );
}

// --- New Public Screens ---

function StressGamesScreen({ onNavigateToHome, backButtonLabel = "Home" }) {
    const games = [
        { title: "Breathing Exercise", description: "Follow the animated guide to practice deep, calming breaths.", icon: <Wind/> },
        { title: "Zen Garden", description: "Create a peaceful digital zen garden to focus your mind.", icon: <Leaf/> },
        { title: "Pattern Matching", description: "A simple, meditative game of matching calm patterns.", icon: <BrainCircuit/> },
    ];
    return (
        <div className="min-h-screen bg-slate-50 dark:bg-slate-900 text-slate-800 dark:text-slate-200 p-8">
            <button onClick={onNavigateToHome} className="mb-8 text-slate-600 dark:text-slate-300 hover:text-cyan-500 dark:hover:text-cyan-400 transition-colors">
                &larr; Back to {backButtonLabel}
            </button>
            <div className="max-w-4xl mx-auto text-center">
                <h1 className="text-4xl font-bold mb-4">Stress-Reducing Games</h1>
                <p className="text-lg text-slate-500 dark:text-slate-400 mb-12">Engage your mind with these simple activities designed to promote relaxation.</p>
                <div className="grid md:grid-cols-3 gap-8">
                    {games.map(game => (
                        <div key={game.title} className="bg-white dark:bg-slate-800 p-6 rounded-xl shadow-md">
                            <div className="text-cyan-500 w-12 h-12 mx-auto mb-4 flex items-center justify-center">{game.icon}</div>
                            <h3 className="font-bold text-xl mb-2">{game.title}</h3>
                            <p className="text-slate-500 dark:text-slate-400 text-sm">{game.description}</p>
                        </div>
                    ))}
                </div>
                <p className="mt-12 text-sm text-slate-400">Note: These are conceptual placeholders. Full games would be implemented here.</p>
            </div>
        </div>
    );
}

function YogaTechniquesScreen({ onNavigateToHome, backButtonLabel = "Home" }) {
    const poses = [
        { title: "Child's Pose (Balasana)", description: "A gentle resting pose that stretches the back, hips, and thighs while calming the mind." },
        { title: "Cat-Cow Pose (Marjaryasana-Bitilasana)", description: "A dynamic flow that warms the spine and relieves tension in the back and neck." },
        { title: "Corpse Pose (Savasana)", description: "The ultimate relaxation pose. It allows the body to rest and absorb the benefits of the practice." },
    ];
     return (
        <div className="min-h-screen bg-slate-50 dark:bg-slate-900 text-slate-800 dark:text-slate-200 p-8">
            <button onClick={onNavigateToHome} className="mb-8 text-slate-600 dark:text-slate-300 hover:text-cyan-500 dark:hover:text-cyan-400 transition-colors">
                &larr; Back to {backButtonLabel}
            </button>
            <div className="max-w-4xl mx-auto text-center">
                <h1 className="text-4xl font-bold mb-4">Yoga for Relaxation</h1>
                <p className="text-lg text-slate-500 dark:text-slate-400 mb-12">Practice these simple yoga poses to release physical tension and find mental clarity.</p>
                <div className="space-y-8 text-left">
                    {poses.map(pose => (
                        <div key={pose.title} className="bg-white dark:bg-slate-800 p-6 rounded-xl shadow-md">
                            <h3 className="font-bold text-xl mb-2 text-cyan-600 dark:text-cyan-400">{pose.title}</h3>
                            <p className="text-slate-600 dark:text-slate-300">{pose.description}</p>
                        </div>
                    ))}
                </div>
                 <p className="mt-12 text-sm text-slate-400">Disclaimer: Consult with a healthcare professional before beginning any new exercise regimen.</p>
            </div>
        </div>
    );
}

function RelaxingMusicScreen({ onNavigateToHome, backButtonLabel = "Home" }) {
    const musicTypes = [
        { title: "Ambient Music", description: "Flowing, atmospheric soundscapes that create a calm environment for focus or relaxation." },
        { title: "Nature Sounds", description: "Immerse yourself in the sounds of rain, forests, or oceans to connect with nature and de-stress." },
        { title: "Binaural Beats", description: "Specific audio frequencies designed to influence brainwaves and promote a state of calm or focus." },
    ];
    return (
        <div className="min-h-screen bg-slate-50 dark:bg-slate-900 text-slate-800 dark:text-slate-200 p-8">
            <button onClick={onNavigateToHome} className="mb-8 text-slate-600 dark:text-slate-300 hover:text-cyan-500 dark:hover:text-cyan-400 transition-colors">
                &larr; Back to {backButtonLabel}
            </button>
            <div className="max-w-4xl mx-auto text-center">
                <h1 className="text-4xl font-bold mb-4">Soothing Music & Sounds</h1>
                <p className="text-lg text-slate-500 dark:text-slate-400 mb-12">Use the power of sound to calm your nervous system and find your center.</p>
                 <div className="grid md:grid-cols-3 gap-8">
                    {musicTypes.map(music => (
                        <div key={music.title} className="bg-white dark:bg-slate-800 p-6 rounded-xl shadow-md">
                            <h3 className="font-bold text-xl mb-2">{music.title}</h3>
                            <p className="text-slate-500 dark:text-slate-400 text-sm">{music.description}</p>
                        </div>
                    ))}
                </div>
                <p className="mt-12 text-sm text-slate-400">Note: This page would typically feature embedded audio players.</p>
            </div>
        </div>
    );
}

async function callGeminiAPI(prompt, isJson = false) {
    // In the preview environment, the API key is handled automatically.
    const apiKey = ""; 

    const model = "gemini-2.0-flash";
    const apiUrl = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`;
    
    const payload = { contents: [{ role: "user", parts: [{ text: prompt }] }] };
    if (isJson) {
        payload.generationConfig = { responseMimeType: "application/json" };
    }

    try {
        const response = await fetch(apiUrl, {
            method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload)
        });
        if (!response.ok) throw new Error(`API call failed with status: ${response.status}`);
        const result = await response.json();
        
        if (result.candidates && result.candidates[0]?.content?.parts[0]?.text) {
            const text = result.candidates[0].content.parts[0].text;
            // Clean up potential markdown formatting from the response
            const cleanedText = text.replace(/```json|```/g, '').trim();
            return isJson ? JSON.parse(cleanedText) : cleanedText;
        } else {
            console.error("Invalid response structure from API:", result);
            throw new Error("Invalid response structure from API");
        }
    } catch (error) {
        console.error("Error calling Gemini API:", error);
        throw error;
    }
}

function DashboardScreen({ onNavigate }) {
    const { user, userData } = useAuth();
    const [streaks, setStreaks] = useState({ current_streak: 0, longest_streak: 0 });
    const [thoughtOfTheDay, setThoughtOfTheDay] = useState('');
    const [thoughtLoading, setThoughtLoading] = useState(true);
    const [verificationMessage, setVerificationMessage] = useState('');

    const activities = [
        { page: 'games', icon: <Gamepad2 className="w-10 h-10 text-cyan-500"/>, title: "Mindful Games", description: "Engage in simple games designed to calm the mind." },
        { page: 'yoga', icon: <Leaf className="w-10 h-10 text-cyan-500"/>, title: "Gentle Yoga", description: "Explore poses to release tension and connect with your body." },
        { page: 'music', icon: <Headphones className="w-10 h-10 text-cyan-500"/>, title: "Soothing Sounds", description: "Listen to curated sounds to promote relaxation." },
    ];

    useEffect(() => {
        const getThoughtOfTheDay = async () => {
            setThoughtLoading(true);
            const prompt = "Provide a short, uplifting, and motivational 'thought of the day' for a user of a mental wellness app. It should be one or two sentences. Do not include quotation marks or any prefixes like 'Thought of the Day:'.";
            try {
                const thought = await callGeminiAPI(prompt);
                setThoughtOfTheDay(thought);
            } catch (error) {
                setThoughtOfTheDay("Every small step forward is still a step forward. Be proud of your progress.");
            } finally {
                setThoughtLoading(false);
            }
        };
        getThoughtOfTheDay();
    }, []);

    useEffect(() => {
        if (userData && user) {
            const streakRef = doc(db, `users/${user.uid}/streaks`, 'data');
            const unsubStreaks = onSnapshot(streakRef, (doc) => {
                setStreaks(doc.exists() ? doc.data() : { current_streak: 0, longest_streak: 0 });
            });

            return () => {
                unsubStreaks();
            };
        }
    }, [user, userData]);

    const handleResendVerification = () => {
        if (user) {
            sendEmailVerification(user)
                .then(() => setVerificationMessage("A new verification email has been sent."))
                .catch(err => setVerificationMessage(`Error: ${err.message}`));
        }
    };

    return (
        <div className="animate-fade-in space-y-6">
            <div className="flex items-center gap-4">
                <Logo className="w-12 h-12" />
                <div>
                    <h1 className="text-3xl font-bold">EaseHaven</h1>
                    <p className="text-slate-500 dark:text-slate-400">Welcome back, {userData?.name || 'friend'}.</p>
                </div>
            </div>

            <EmailVerificationNotice user={user} onResend={handleResendVerification} />
            {verificationMessage && <p className="text-sm text-green-600">{verificationMessage}</p>}
            
            <div className="bg-white dark:bg-slate-800 p-6 rounded-xl shadow-md flex items-start gap-4">
                <Lightbulb className="w-8 h-8 text-yellow-400 flex-shrink-0 mt-1" />
                <div>
                    <h2 className="font-bold text-lg text-slate-700 dark:text-slate-200">Thought of the Day ✨</h2>
                    {thoughtLoading ? (
                        <p className="text-slate-500 dark:text-slate-400 italic mt-1">Generating a fresh thought for you...</p>
                    ) : (
                        <p className="text-slate-600 dark:text-slate-300 italic mt-1">"{thoughtOfTheDay}"</p>
                    )}
                </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="md:col-span-1 bg-gradient-to-br from-cyan-400 to-blue-500 p-6 rounded-xl text-white flex flex-col justify-between shadow-lg">
                    <div>
                        <h2 className="text-xl font-bold">How are you feeling?</h2>
                        <p className="mt-2 opacity-90">Log your mood to track your progress and get personalized insights.</p>
                    </div>
                    <button onClick={() => onNavigate('tracker')} className="mt-4 bg-white text-cyan-500 font-bold py-2 px-4 rounded-lg w-full text-center hover:bg-cyan-50 transition-all">
                        Log Today's Mood
                    </button>
                </div>
                <div className="bg-white dark:bg-slate-800 p-6 rounded-xl shadow-md flex items-center justify-between">
                    <div>
                        <p className="text-sm text-slate-500 dark:text-slate-400">Current Streak</p>
                        <p className="text-3xl font-bold text-cyan-500">{streaks.current_streak || 0} days</p>
                    </div>
                    <Award className="w-10 h-10 text-yellow-400" />
                </div>
                <div className="bg-white dark:bg-slate-800 p-6 rounded-xl shadow-md flex items-center justify-between">
                    <div>
                        <p className="text-sm text-slate-500 dark:text-slate-400">Longest Streak</p>
                        <p className="text-3xl font-bold text-cyan-500">{streaks.longest_streak || 0} days</p>
                    </div>
                    <Sparkles className="w-10 h-10 text-pink-400" />
                </div>
            </div>

            <div className="mt-6">
                <h2 className="text-2xl font-bold mb-4">Relaxation Activities</h2>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    {activities.map(activity => (
                        <button 
                            key={activity.page} 
                            onClick={() => onNavigate(activity.page)}
                            className="bg-white dark:bg-slate-800 p-6 rounded-xl shadow-md text-left hover:shadow-lg hover:-translate-y-1 transition-all duration-300 flex flex-col"
                        >
                            <div className="flex items-center gap-4 mb-3">
                                <div className="inline-block p-3 bg-cyan-100 dark:bg-cyan-900/50 rounded-full">
                                    {React.cloneElement(activity.icon, { className: "w-8 h-8 text-cyan-500" })}
                                </div>
                                <h3 className="text-xl font-bold">{activity.title}</h3>
                            </div>
                            <p className="text-slate-600 dark:text-slate-400 text-sm flex-grow">{activity.description}</p>
                        </button>
                    ))}
                </div>
            </div>
        </div>
    );
}

function AnalyticsScreen() {
    const { user } = useAuth();
    const [moodLogs, setMoodLogs] = useState([]);

    useEffect(() => {
        if (user) {
            const moodEntriesPath = `users/${user.uid}/mood_entries`;
            const q = query(collection(db, moodEntriesPath));
            const unsubscribeMoods = onSnapshot(q, (snapshot) => {
                const logs = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data(), timestamp: doc.data().timestamp?.toDate() }));
                logs.sort((a, b) => (b.timestamp || 0) - (a.timestamp || 0));
                setMoodLogs(logs);
            });

            return () => {
                unsubscribeMoods();
            };
        }
    }, [user]);

    const chartData = moodLogs.slice(0, 7).reverse().map(log => ({
        date: log.timestamp ? log.timestamp.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }) : 'N/A',
        stress: log.stress_level,
    }));
    
    const moodDistribution = moodLogs.reduce((acc, log) => {
        acc[log.mood] = (acc[log.mood] || 0) + 1;
        return acc;
    }, {});

    const pieData = Object.entries(moodDistribution).map(([name, value]) => ({ name, value }));
    const MOOD_COLORS = { 'Happy': '#34D399', 'Calm': '#60A5FA', 'Okay': '#A78BFA', 'Sad': '#F472B6', 'Anxious': '#FBBF24', 'Angry': '#F87171' };

    return (
        <div className="animate-fade-in space-y-6">
            <h1 className="text-3xl font-bold">Weekly Analytics</h1>
            <p className="text-slate-500 dark:text-slate-400">Here's a look at your mood and stress levels over the past week.</p>
            <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
                <div className="lg:col-span-3 bg-white dark:bg-slate-800 p-6 rounded-xl shadow-md">
                    <h2 className="text-xl font-bold mb-4">7-Day Stress Trend</h2>
                    <ResponsiveContainer width="100%" height={300}>
                        <BarChart data={chartData}>
                            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="rgba(128, 128, 128, 0.2)" />
                            <XAxis dataKey="date" tick={{ fill: 'currentColor', fontSize: 12 }} />
                            <YAxis domain={[0, 10]} tick={{ fill: 'currentColor' }} />
                            <Tooltip contentStyle={{ backgroundColor: 'rgba(30, 41, 59, 0.8)', borderColor: 'rgba(128, 128, 128, 0.5)', borderRadius: '0.5rem' }} />
                            <Bar dataKey="stress" fill="#06b6d4" name="Stress Level" radius={[4, 4, 0, 0]} />
                        </BarChart>
                    </ResponsiveContainer>
                </div>
                <div className="lg:col-span-2 bg-white dark:bg-slate-800 p-6 rounded-xl shadow-md">
                    <h2 className="text-xl font-bold mb-4">Mood Distribution</h2>
                    <ResponsiveContainer width="100%" height={300}>
                        <PieChart>
                            <Pie data={pieData} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={100} label>
                                {pieData.map((entry, index) => <Cell key={`cell-${index}`} fill={MOOD_COLORS[entry.name] || '#cccccc'} />)}
                            </Pie>
                            <Tooltip contentStyle={{ backgroundColor: 'rgba(30, 41, 59, 0.8)', borderColor: 'rgba(128, 128, 128, 0.5)', borderRadius: '0.5rem' }}/>
                            <Legend />
                        </PieChart>
                    </ResponsiveContainer>
                </div>
            </div>
        </div>
    );
}

function MoodTrackerScreen({ onLogSuccess }) {
    const { user } = useAuth();
    const [mood, setMood] = useState('');
    const [stressLevel, setStressLevel] = useState(5);
    const [note, setNote] = useState('');
    const [loading, setLoading] = useState(false);
    const [suggestion, setSuggestion] = useState(null);

    const moodOptions = [
        { name: 'Happy', icon: Laugh }, { name: 'Calm', icon: Smile }, { name: 'Okay', icon: Meh },
        { name: 'Sad', icon: Frown }, { name: 'Anxious', icon: Frown }, { name: 'Angry', icon: Angry },
    ];

    const getAISuggestion = async (mood, stress, userNote) => {
        const prompt = `A user in a mental wellness app feels "${mood}" with a stress level of ${stress}/10. Their journal note is: "${userNote}". Based on this, provide one simple, safe, non-medical, actionable suggestion for an activity to help them. The suggestion should be encouraging and empathetic. The response must be a JSON object with two keys: "title" (a short, catchy title for the activity) and "content" (a 2-3 sentence description of the activity).`;
        try {
            const result = await callGeminiAPI(prompt, true);
            setSuggestion(result);
        } catch (error) {
            setSuggestion({ title: "A Moment for You", content: "Take a brief pause. Step away from your screen, stretch, or listen to a favorite song. Sometimes a small break is all you need." });
        }
    };

    const handleLogMood = async (e) => {
        e.preventDefault();
        if (!mood || !user) return;
        setLoading(true);

        const moodCollectionRef = collection(db, `users/${user.uid}/mood_entries`);
        await addDoc(moodCollectionRef, {
            mood, stress_level: parseInt(stressLevel), note, timestamp: serverTimestamp()
        });
        
        const streakRef = doc(db, `users/${user.uid}/streaks`, 'data');
        const streakSnap = await getDoc(streakRef);
        
        const today = new Date();
        today.setHours(0, 0, 0, 0);

        if (streakSnap.exists()) {
            const streakData = streakSnap.data();
            const lastLoggedDate = streakData.last_logged_date?.toDate();
            if (lastLoggedDate) {
                lastLoggedDate.setHours(0, 0, 0, 0);
            }

            if (lastLoggedDate?.getTime() !== today.getTime()) {
                const yesterday = new Date();
                yesterday.setDate(yesterday.getDate() - 1);
                yesterday.setHours(0, 0, 0, 0);

                let newStreak = (lastLoggedDate?.getTime() === yesterday.getTime()) ? (streakData.current_streak || 0) + 1 : 1;
                
                await updateDoc(streakRef, {
                    current_streak: newStreak,
                    longest_streak: Math.max(newStreak, streakData.longest_streak || 0),
                    last_logged_date: new Date()
                });
            }
        } else {
             await setDoc(streakRef, { current_streak: 1, longest_streak: 1, last_logged_date: new Date() });
        }

        await getAISuggestion(mood, stressLevel, note);
        setLoading(false);
    };

    if (suggestion) {
        return (
            <div className="flex flex-col items-center justify-center h-full animate-fade-in">
                <div className="w-full max-w-lg text-center bg-white dark:bg-slate-800 p-8 rounded-2xl shadow-lg">
                    <Sparkles className="w-16 h-16 text-yellow-400 mx-auto mb-4" />
                    <h2 className="text-2xl font-bold mb-2">{suggestion.title}</h2>
                    <p className="text-slate-600 dark:text-slate-300 mb-6">{suggestion.content}</p>
                    <button onClick={onLogSuccess} className="w-full bg-cyan-500 text-white font-semibold py-3 px-4 rounded-lg shadow-lg hover:bg-cyan-600 transition-all">
                        Back to Dashboard
                    </button>
                </div>
            </div>
        );
    }

    return (
        <div className="flex items-center justify-center h-full">
            <div className="w-full max-w-2xl bg-white dark:bg-slate-800 p-8 rounded-2xl shadow-lg animate-fade-in">
                <h1 className="text-3xl font-bold text-center mb-6">How are you feeling now?</h1>
                <form onSubmit={handleLogMood} className="space-y-6">
                    <div>
                        <label className="block text-slate-600 dark:text-slate-300 mb-3 text-center font-medium">Select your mood</label>
                        <div className="flex justify-center flex-wrap gap-4">
                            {moodOptions.map(opt => (
                                <button type="button" key={opt.name} onClick={() => setMood(opt.name)} className={`flex flex-col items-center gap-2 p-4 rounded-lg w-24 h-24 transition-all duration-200 ${mood === opt.name ? 'bg-cyan-500 text-white scale-110 shadow-lg' : 'bg-slate-100 dark:bg-slate-700 hover:bg-slate-200 dark:hover:bg-slate-600'}`}>
                                    <opt.icon className="w-8 h-8" />
                                    <span className="text-sm font-semibold">{opt.name}</span>
                                </button>
                            ))}
                        </div>
                    </div>
                    <div>
                        <label className="block text-slate-600 dark:text-slate-300 mb-2 text-center font-medium">Stress Level: <span className="font-bold text-cyan-500">{stressLevel}</span></label>
                        <input type="range" min="0" max="10" value={stressLevel} onChange={e => setStressLevel(e.target.value)} className="w-full h-2 bg-slate-200 rounded-lg appearance-none cursor-pointer dark:bg-slate-700" />
                    </div>
                    <div>
                        <label className="block text-slate-600 dark:text-slate-300 mb-2 font-medium">Add a quick note (optional)</label>
                        <textarea value={note} onChange={e => setNote(e.target.value)} placeholder="What's on your mind?" className="w-full h-24 p-3 bg-slate-100 dark:bg-slate-700 rounded-md focus:outline-none focus:ring-2 focus:ring-cyan-500"></textarea>
                    </div>
                    <button type="submit" disabled={loading || !mood} className="w-full bg-cyan-500 text-white font-semibold py-3 px-4 rounded-lg shadow-lg hover:bg-cyan-600 transition-all disabled:bg-cyan-300">
                        {loading ? 'Saving...' : 'Log Mood & Get Suggestion'}
                    </button>
                </form>
            </div>
        </div>
    );
}

function JournalScreen() {
    const { user, userData } = useAuth();
    const [isLocked, setIsLocked] = useState(true);
    const [pin, setPin] = useState('');
    const [error, setError] = useState('');

    useEffect(() => {
        if (userData && userData.journalPin) {
            setIsLocked(true);
        } else {
            setIsLocked(false);
        }
    }, [userData]);
    
    const handleUnlock = () => {
        if (pin === userData.journalPin) {
            setIsLocked(false);
            setError('');
        } else {
            setError('Incorrect PIN. Please try again.');
        }
        setPin('');
    };

    if (isLocked) {
        return (
            <div className="flex items-center justify-center h-full">
                <div className="w-full max-w-sm bg-white dark:bg-slate-800 p-8 rounded-2xl shadow-lg text-center">
                    <Shield className="w-16 h-16 text-cyan-500 mx-auto mb-4"/>
                    <h1 className="text-2xl font-bold">Journal Locked</h1>
                    <p className="text-slate-500 dark:text-slate-400 mt-2 mb-4">Please enter your PIN to continue.</p>
                    <input 
                        type="password"
                        value={pin}
                        onChange={(e) => setPin(e.target.value)}
                        maxLength="4"
                        className="w-full text-center tracking-[1rem] px-4 py-2 bg-slate-100 dark:bg-slate-700 rounded-md focus:outline-none focus:ring-2 focus:ring-cyan-500"
                    />
                    {error && <p className="text-red-500 text-sm mt-2">{error}</p>}
                    <button onClick={handleUnlock} className="mt-4 w-full bg-cyan-500 text-white font-semibold py-2 px-4 rounded-lg hover:bg-cyan-600">
                        Unlock
                    </button>
                </div>
            </div>
        );
    }

    return <JournalContent />;
}

function JournalContent() {
    const { user } = useAuth();
    const [entries, setEntries] = useState([]);
    const [newEntry, setNewEntry] = useState('');
    const [isSaving, setIsSaving] = useState(false);
    const [analyzingEntry, setAnalyzingEntry] = useState(null);
    const [analysisResult, setAnalysisResult] = useState(null);
    const [isAnalysisLoading, setIsAnalysisLoading] = useState(false);

    useEffect(() => {
        if (user) {
            const q = query(collection(db, `users/${user.uid}/journal_entries`));
            const unsubscribe = onSnapshot(q, (snapshot) => {
                const journalEntries = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data(), timestamp: doc.data().timestamp?.toDate() }));
                journalEntries.sort((a, b) => (b.timestamp || 0) - (a.timestamp || 0));
                setEntries(journalEntries);
            });
            return () => unsubscribe();
        }
    }, [user]);

    const handleSaveEntry = async () => {
        if (newEntry.trim() === '' || !user) return;
        setIsSaving(true);
        await addDoc(collection(db, `users/${user.uid}/journal_entries`), {
            content: newEntry, timestamp: serverTimestamp(),
        });
        setNewEntry('');
        setIsSaving(false);
    };

    const handleAnalyze = async (entry) => {
        setAnalyzingEntry(entry);
        setIsAnalysisLoading(true);
        setAnalysisResult(null);

        const prompt = `You are a reflective assistant in a wellness app. Analyze the following journal entry. Do not give medical advice. Your response must be a JSON object with three keys: "tone", "themes" (array of 2-3 topics), and "reflection" (one open-ended question). Entry: "${entry.content}"`;
        
        try {
            const result = await callGeminiAPI(prompt, true);
            setAnalysisResult(result);
        } catch (error) {
            setAnalysisResult({ tone: "Could not analyze entry.", themes: [], reflection: "Please try again later." });
        } finally {
            setIsAnalysisLoading(false);
        }
    };

    return (
        <div className="animate-fade-in h-full flex flex-col">
            <h1 className="text-3xl font-bold">Your Private Journal</h1>
            <p className="text-slate-500 dark:text-slate-400 mt-1">A safe space for your thoughts and feelings.</p>
            
            <div className="mt-6 bg-white dark:bg-slate-800 p-4 rounded-xl shadow-md">
                <textarea 
                    value={newEntry}
                    onChange={(e) => setNewEntry(e.target.value)}
                    placeholder="Write about your day, your thoughts, your feelings..."
                    className="w-full h-32 p-3 bg-slate-100 dark:bg-slate-700 rounded-md focus:outline-none focus:ring-2 focus:ring-cyan-500"
                />
                <div className="text-right mt-2">
                    <button onClick={handleSaveEntry} disabled={isSaving || !newEntry.trim()} className="py-2 px-5 rounded-lg bg-cyan-500 text-white font-semibold hover:bg-cyan-600 disabled:bg-cyan-300">
                        {isSaving ? 'Saving...' : 'Save Entry'}
                    </button>
                </div>
            </div>

            <div className="mt-8 flex-1 overflow-y-auto pr-2">
                <h2 className="text-xl font-bold mb-4">Past Entries</h2>
                <div className="space-y-4">
                    {entries.length > 0 ? entries.map(entry => (
                        <div key={entry.id} className="bg-white dark:bg-slate-800 p-4 rounded-lg shadow-sm">
                            <p className="text-xs text-slate-400 dark:text-slate-500 mb-2">{entry.timestamp?.toLocaleString() || 'Just now'}</p>
                            <p className="whitespace-pre-wrap">{entry.content}</p>
                            <div className="text-right mt-3">
                                <button onClick={() => handleAnalyze(entry)} className="inline-flex items-center gap-2 text-sm font-medium text-cyan-600 hover:text-cyan-800 dark:text-cyan-400 dark:hover:text-cyan-200">
                                    <Sparkles size={16} />
                                    AI Reflection ✨
                                </button>
                            </div>
                        </div>
                    )) : (
                        <p className="text-center text-slate-500 dark:text-slate-400 pt-8">Your journal is empty. Write your first entry above.</p>
                    )}
                </div>
            </div>
            {analyzingEntry && (
                <AnalysisModal 
                    isOpen={!!analyzingEntry}
                    onClose={() => { setAnalyzingEntry(null); setAnalysisResult(null); }}
                    isLoading={isAnalysisLoading}
                    result={analysisResult}
                />
            )}
        </div>
    );
}

function ProfileScreen() {
    const { user, userData } = useAuth();
    const [name, setName] = useState('');
    const [age, setAge] = useState('');
    const [occupation, setOccupation] = useState('');
    const [journalPin, setJournalPin] = useState('');
    const [isJournalProtected, setIsJournalProtected] = useState(false);
    const [loading, setLoading] = useState(false);
    const [message, setMessage] = useState('');

    useEffect(() => {
        if(userData) {
            setName(userData.name || '');
            setAge(userData.age || '');
            setOccupation(userData.occupation || '');
            setIsJournalProtected(!!userData.journalPin);
        }
    }, [userData]);

    const handleUpdate = async (e) => {
        e.preventDefault();
        if(!user) return;
        if (isJournalProtected && (journalPin.length !== 4 || !/^\d{4}$/.test(journalPin))) {
            setMessage('Error: PIN must be 4 digits.');
            return;
        }
        setLoading(true);
        setMessage('');
        try {
            const userRef = doc(db, 'users', user.uid);
            const dataToUpdate = { name, age, occupation };
            if (isJournalProtected) {
                dataToUpdate.journalPin = journalPin;
            } else {
                dataToUpdate.journalPin = null; // Remove pin if protection is disabled
            }
            await updateDoc(userRef, dataToUpdate);
            setMessage('Profile updated successfully!');
        } catch (error) {
            setMessage('Error updating profile.');
            console.error(error);
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="max-w-2xl mx-auto">
            <h1 className="text-3xl font-bold mb-6">Your Profile & Settings</h1>
            <div className="bg-white dark:bg-slate-800 p-8 rounded-xl shadow-md">
                <div className="flex items-center space-x-4 mb-8">
                    <img src={userData?.profile_pic} alt="Profile" className="w-20 h-20 rounded-full bg-slate-200" onError={(e) => { e.target.onerror = null; e.target.src=`https://api.dicebear.com/7.x/initials/svg?seed=${userData?.name || 'User'}`; }} />
                    <div>
                        <h2 className="text-2xl font-bold">{userData?.name}</h2>
                        <p className="text-slate-500 dark:text-slate-400">{userData?.email}</p>
                    </div>
                </div>
                <form onSubmit={handleUpdate} className="space-y-6">
                    <div>
                        <h3 className="text-lg font-semibold border-b pb-2 mb-4">User Information</h3>
                        <div className="space-y-4">
                             <div>
                                <label className="block text-sm font-medium text-slate-600 dark:text-slate-300">Name</label>
                                <input type="text" value={name} onChange={e => setName(e.target.value)} className="mt-1 w-full px-4 py-2 bg-slate-100 dark:bg-slate-700 rounded-md focus:outline-none focus:ring-2 focus:ring-cyan-500" />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-slate-600 dark:text-slate-300">Age</label>
                                <input type="number" value={age} onChange={e => setAge(e.target.value)} className="mt-1 w-full px-4 py-2 bg-slate-100 dark:bg-slate-700 rounded-md focus:outline-none focus:ring-2 focus:ring-cyan-500" />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-slate-600 dark:text-slate-300">Occupation</label>
                                <input type="text" value={occupation} onChange={e => setOccupation(e.target.value)} className="mt-1 w-full px-4 py-2 bg-slate-100 dark:bg-slate-700 rounded-md focus:outline-none focus:ring-2 focus:ring-cyan-500" />
                            </div>
                        </div>
                    </div>
                     <div>
                        <h3 className="text-lg font-semibold border-b pb-2 mb-4">Security</h3>
                        <div className="flex items-center justify-between bg-slate-100 dark:bg-slate-700 p-3 rounded-lg">
                            <div className="flex items-center gap-2">
                               {isJournalProtected ? <Shield size={20} className="text-green-500"/> : <ShieldOff size={20} className="text-red-500"/>}
                               <div>
                                    <label htmlFor="journal-protection" className="font-medium text-slate-700 dark:text-slate-200">Journal PIN Protection</label>
                                    <p className="text-xs text-slate-500 dark:text-slate-400">Protect your journal with a 4-digit PIN.</p>
                               </div>
                            </div>
                            <label htmlFor="journal-protection-toggle" className="relative inline-flex items-center cursor-pointer">
                                <input type="checkbox" id="journal-protection-toggle" className="sr-only peer" checked={isJournalProtected} onChange={() => setIsJournalProtected(!isJournalProtected)} />
                                <div className="w-11 h-6 bg-slate-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-cyan-300 dark:peer-focus:ring-cyan-800 rounded-full peer dark:bg-slate-600 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all dark:border-slate-500 peer-checked:bg-cyan-600"></div>
                            </label>
                        </div>
                        {isJournalProtected && (
                             <div className="mt-3">
                                <label className="block text-sm font-medium text-slate-600 dark:text-slate-300">Set 4-Digit PIN</label>
                                <input type="password" value={journalPin} onChange={e => setJournalPin(e.target.value)} maxLength="4" placeholder="****" className="mt-1 w-full px-4 py-2 bg-slate-100 dark:bg-slate-700 rounded-md focus:outline-none focus:ring-2 focus:ring-cyan-500" />
                            </div>
                        )}
                    </div>
                    <div className="pt-2">
                        <button type="submit" disabled={loading} className="w-full bg-cyan-500 text-white font-semibold py-2 px-4 rounded-lg shadow-lg hover:bg-cyan-600 transition-all disabled:bg-cyan-300">
                            {loading ? 'Saving...' : 'Update Profile & Settings'}
                        </button>
                    </div>
                    {message && <p className={`${message.includes('Error') ? 'text-red-500' : 'text-green-500'} text-sm text-center mt-2`}>{message}</p>}
                </form>
            </div>
        </div>
    );
}

// --- Community Feature Components ---

function CommunityScreen() {
    const { user, userData } = useAuth();
    const [posts, setPosts] = useState([]);
    const [newPostContent, setNewPostContent] = useState('');
    const [isSubmitting, setIsSubmitting] = useState(false);

    useEffect(() => {
        const postsCollectionRef = collection(db, 'community_posts');
        const q = query(postsCollectionRef);
        
        const unsubscribe = onSnapshot(q, (snapshot) => {
            const fetchedPosts = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data(), timestamp: doc.data().timestamp?.toDate() }));
            fetchedPosts.sort((a, b) => (b.timestamp || 0) - (a.timestamp || 0));
            setPosts(fetchedPosts);
        });

        return () => unsubscribe();
    }, []);

    const handleCreatePost = async (e) => {
        e.preventDefault();
        if (newPostContent.trim() === '' || !user || !userData) return;

        setIsSubmitting(true);
        try {
            await addDoc(collection(db, 'community_posts'), {
                content: newPostContent,
                authorId: user.uid,
                authorName: userData.name,
                authorPic: userData.profile_pic,
                timestamp: serverTimestamp(),
                agrees: [],
                disagrees: [],
                commentCount: 0,
            });
            setNewPostContent('');
        } catch (error) {
            console.error("Error creating post: ", error);
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <div className="animate-fade-in max-w-4xl mx-auto">
            <h1 className="text-3xl font-bold">Community Blog</h1>
            <p className="text-slate-500 dark:text-slate-400 mt-1">Share your thoughts and connect with others.</p>

            <div className="my-8 bg-white dark:bg-slate-800 p-6 rounded-xl shadow-md">
                <h2 className="text-xl font-bold mb-4">Create a New Post</h2>
                <form onSubmit={handleCreatePost}>
                    <textarea 
                        value={newPostContent}
                        onChange={(e) => setNewPostContent(e.target.value)}
                        placeholder="What's on your mind? Share something with the community..."
                        className="w-full h-28 p-3 bg-slate-100 dark:bg-slate-700 rounded-md focus:outline-none focus:ring-2 focus:ring-cyan-500"
                        disabled={isSubmitting}
                    />
                    <div className="text-right mt-3">
                        <button type="submit" disabled={isSubmitting || !newPostContent.trim()} className="py-2 px-6 rounded-lg bg-cyan-500 text-white font-semibold hover:bg-cyan-600 disabled:bg-cyan-300 transition-colors">
                            {isSubmitting ? 'Posting...' : 'Post'}
                        </button>
                    </div>
                </form>
            </div>

            <div className="space-y-6">
                {posts.map(post => (
                    <BlogPost key={post.id} post={post} />
                ))}
            </div>
        </div>
    );
}

function BlogPost({ post }) {
    const { user } = useAuth();
    const [showComments, setShowComments] = useState(false);
    const [isEditing, setIsEditing] = useState(false);
    const [editedContent, setEditedContent] = useState(post.content);
    const [showMenu, setShowMenu] = useState(false);
    const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
    
    const isAuthor = user && user.uid === post.authorId;

    const handleReaction = async (reactionType) => {
        if (!user) return;
        const postRef = doc(db, 'community_posts', post.id);

        await runTransaction(db, async (transaction) => {
            const postDoc = await transaction.get(postRef);
            if (!postDoc.exists()) {
                throw "Document does not exist!";
            }

            let agrees = postDoc.data().agrees || [];
            let disagrees = postDoc.data().disagrees || [];
            const userId = user.uid;

            const currentReactionList = reactionType === 'agrees' ? agrees : disagrees;
            const otherReactionList = reactionType === 'agrees' ? disagrees : agrees;
            const otherReactionType = reactionType === 'agrees' ? 'disagrees' : 'agrees';

            let newCurrentReactions = [...currentReactionList];
            let newOtherReactions = [...otherReactionList];

            if (currentReactionList.includes(userId)) {
                newCurrentReactions = newCurrentReactions.filter(id => id !== userId);
            } else {
                newCurrentReactions.push(userId);
                newOtherReactions = newOtherReactions.filter(id => id !== userId);
            }
            
            const updateData = {};
            updateData[reactionType] = newCurrentReactions;
            updateData[otherReactionType] = newOtherReactions;

            transaction.update(postRef, updateData);
        });
    };
    
    const confirmDelete = async () => {
        try {
            const postRef = doc(db, 'community_posts', post.id);
            const commentsQuery = query(collection(postRef, 'comments'));
            const commentsSnapshot = await getDocs(commentsQuery);
            
            const deletePromises = [];
            commentsSnapshot.forEach((commentDoc) => {
                deletePromises.push(deleteDoc(commentDoc.ref));
            });
            await Promise.all(deletePromises);
            
            await deleteDoc(postRef);
        } catch (error) {
            console.error("Error deleting post:", error);
        }
        setIsDeleteModalOpen(false);
    };

    const handleUpdate = async () => {
        if (editedContent.trim() === '') return;
        try {
            const postRef = doc(db, 'community_posts', post.id);
            await updateDoc(postRef, { content: editedContent });
            setIsEditing(false);
        } catch (error) {
            console.error("Error updating post:", error);
        }
    };

    const hasAgreed = post.agrees?.includes(user?.uid);
    const hasDisagreed = post.disagrees?.includes(user?.uid);

    return (
        <>
            <ConfirmModal
                isOpen={isDeleteModalOpen}
                onClose={() => setIsDeleteModalOpen(false)}
                onConfirm={confirmDelete}
                title="Delete Post"
            >
                <p>Are you sure you want to delete this post and all its comments? This action cannot be undone.</p>
            </ConfirmModal>

            <div className="bg-white dark:bg-slate-800 p-6 rounded-xl shadow-md">
                <div className="flex items-start gap-4">
                    <img src={post.authorPic} alt={post.authorName} className="w-12 h-12 rounded-full bg-slate-200" onError={(e) => { e.target.onerror = null; e.target.src=`https://api.dicebear.com/7.x/initials/svg?seed=${post.authorName || 'User'}`; }} />
                    <div className="flex-1">
                        <p className="font-bold text-slate-800 dark:text-slate-100">{post.authorName}</p>
                        <p className="text-xs text-slate-400 dark:text-slate-500">{post.timestamp?.toLocaleString() || 'Just now'}</p>
                    </div>
                    {isAuthor && !isEditing && (
                        <div 
                            className="relative"
                            onBlur={(e) => {
                                if (!e.currentTarget.contains(e.relatedTarget)) {
                                    setShowMenu(false);
                                }
                            }}
                        >
                            <button onClick={() => setShowMenu(!showMenu)} className="p-1 rounded-full hover:bg-slate-100 dark:hover:bg-slate-700">
                                <MoreVertical size={20} />
                            </button>
                            {showMenu && (
                                <div className="absolute right-0 mt-2 w-32 bg-white dark:bg-slate-800 rounded-md shadow-lg border dark:border-slate-700 z-10">
                                    <button onClick={() => { setIsEditing(true); setShowMenu(false); }} className="w-full text-left px-4 py-2 text-sm text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-700 flex items-center gap-2">
                                        <Edit size={14}/> Edit
                                    </button>
                                    <button onClick={() => { setIsDeleteModalOpen(true); setShowMenu(false); }} className="w-full text-left px-4 py-2 text-sm text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 flex items-center gap-2">
                                        <Trash2 size={14}/> Delete
                                    </button>
                                </div>
                            )}
                        </div>
                    )}
                </div>
                
                {isEditing ? (
                    <div className="mt-4">
                        <textarea 
                            value={editedContent}
                            onChange={(e) => setEditedContent(e.target.value)}
                            className="w-full h-28 p-3 bg-slate-100 dark:bg-slate-700 rounded-md focus:outline-none focus:ring-2 focus:ring-cyan-500"
                        />
                        <div className="flex justify-end gap-2 mt-2">
                            <button onClick={() => setIsEditing(false)} className="py-1 px-4 rounded-md bg-slate-200 dark:bg-slate-600 hover:bg-slate-300 dark:hover:bg-slate-500 font-semibold text-sm">Cancel</button>
                            <button onClick={handleUpdate} className="py-1 px-4 rounded-md bg-cyan-500 hover:bg-cyan-600 text-white font-semibold text-sm">Save</button>
                        </div>
                    </div>
                ) : (
                    <p className="my-4 whitespace-pre-wrap text-slate-700 dark:text-slate-300">{post.content}</p>
                )}

                {!isEditing && (
                    <>
                        <div className="flex items-center gap-6 border-t dark:border-slate-700 pt-3">
                            <button onClick={() => handleReaction('agrees')} className={`flex items-center gap-2 text-sm font-medium transition-colors ${hasAgreed ? 'text-green-500' : 'text-slate-500 hover:text-green-500'}`}>
                                <ThumbsUp size={18} />
                                <span>{post.agrees?.length || 0} Agree</span>
                            </button>
                            <button onClick={() => handleReaction('disagrees')} className={`flex items-center gap-2 text-sm font-medium transition-colors ${hasDisagreed ? 'text-red-500' : 'text-slate-500 hover:text-red-500'}`}>
                                <ThumbsDown size={18} />
                                <span>{post.disagrees?.length || 0} Disagree</span>
                            </button>
                            <button onClick={() => setShowComments(!showComments)} className="flex items-center gap-2 text-sm font-medium text-slate-500 hover:text-cyan-500 transition-colors">
                                <MessageCircle size={18} />
                                <span>{post.commentCount || 0} Comments</span>
                            </button>
                        </div>
                        {showComments && <CommentSection postId={post.id} />}
                    </>
                )}
            </div>
        </>
    );
}

function Comment({ comment, postId }) {
    const { user } = useAuth();
    const [isEditing, setIsEditing] = useState(false);
    const [editedContent, setEditedContent] = useState(comment.content);
    const [showMenu, setShowMenu] = useState(false);
    const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);

    const isAuthor = user && user.uid === comment.authorId;

    const handleUpdate = async () => {
        if (editedContent.trim() === '') return;
        try {
            const commentRef = doc(db, 'community_posts', postId, 'comments', comment.id);
            await updateDoc(commentRef, { content: editedContent });
            setIsEditing(false);
        } catch (error) {
            console.error("Error updating comment:", error);
        }
    };

    const confirmDelete = async () => {
        try {
            const postRef = doc(db, 'community_posts', postId);
            const commentRef = doc(db, 'community_posts', postId, 'comments', comment.id);

            await deleteDoc(commentRef);

            await runTransaction(db, async (transaction) => {
                const postDoc = await transaction.get(postRef);
                if (postDoc.exists()) {
                    const newCommentCount = Math.max(0, (postDoc.data().commentCount || 0) - 1);
                    transaction.update(postRef, { commentCount: newCommentCount });
                }
            });
        } catch (error) {
            console.error("Error deleting comment:", error);
        }
        setIsDeleteModalOpen(false);
    };

    return (
        <>
            <ConfirmModal
                isOpen={isDeleteModalOpen}
                onClose={() => setIsDeleteModalOpen(false)}
                onConfirm={confirmDelete}
                title="Delete Comment"
            >
                <p>Are you sure you want to delete this comment? This action cannot be undone.</p>
            </ConfirmModal>

            <div className="flex items-start gap-3">
                <img src={comment.authorPic} alt={comment.authorName} className="w-8 h-8 rounded-full bg-slate-200" onError={(e) => { e.target.onerror = null; e.target.src=`https://api.dicebear.com/7.x/initials/svg?seed=${comment.authorName || 'User'}`; }}/>
                <div className="bg-slate-100 dark:bg-slate-700 p-3 rounded-lg flex-1">
                    <div className="flex justify-between items-start">
                        <div>
                            <p className="font-semibold text-sm text-slate-800 dark:text-slate-100">{comment.authorName}</p>
                            <p className="text-xs text-slate-400 dark:text-slate-500">{comment.timestamp?.toLocaleDateString() || 'Just now'}</p>
                        </div>
                        {isAuthor && !isEditing && (
                            <div 
                                className="relative"
                                onBlur={(e) => {
                                    if (!e.currentTarget.contains(e.relatedTarget)) {
                                        setShowMenu(false);
                                    }
                                }}
                            >
                                <button onClick={() => setShowMenu(!showMenu)} className="p-1 rounded-full hover:bg-slate-200 dark:hover:bg-slate-600">
                                    <MoreVertical size={16} />
                                </button>
                                {showMenu && (
                                    <div className="absolute right-0 mt-2 w-28 bg-white dark:bg-slate-800 rounded-md shadow-lg border dark:border-slate-700 z-10">
                                        <button onClick={() => { setIsEditing(true); setShowMenu(false); }} className="w-full text-left px-3 py-2 text-sm text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-700 flex items-center gap-2">
                                            <Edit size={14}/> Edit
                                        </button>
                                        <button onClick={() => { setIsDeleteModalOpen(true); setShowMenu(false); }} className="w-full text-left px-3 py-2 text-sm text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 flex items-center gap-2">
                                            <Trash2 size={14}/> Delete
                                        </button>
                                    </div>
                                )}
                            </div>
                        )}
                    </div>
                    {isEditing ? (
                        <div className="mt-2">
                            <textarea
                                value={editedContent}
                                onChange={(e) => setEditedContent(e.target.value)}
                                className="w-full p-2 text-sm bg-white dark:bg-slate-600 rounded-md focus:outline-none focus:ring-2 focus:ring-cyan-500"
                            />
                            <div className="flex justify-end gap-2 mt-2">
                                <button onClick={() => setIsEditing(false)} className="py-1 px-3 rounded-md bg-slate-200 dark:bg-slate-500 hover:bg-slate-300 dark:hover:bg-slate-400 font-semibold text-xs">Cancel</button>
                                <button onClick={handleUpdate} className="py-1 px-3 rounded-md bg-cyan-500 hover:bg-cyan-600 text-white font-semibold text-xs">Save</button>
                            </div>
                        </div>
                    ) : (
                        <p className="text-sm text-slate-600 dark:text-slate-300 mt-1">{comment.content}</p>
                    )}
                </div>
            </div>
        </>
    );
}


function CommentSection({ postId }) {
    const { user, userData } = useAuth();
    const [comments, setComments] = useState([]);
    const [newComment, setNewComment] = useState('');
    const [isSubmitting, setIsSubmitting] = useState(false);

    useEffect(() => {
        const commentsRef = collection(db, 'community_posts', postId, 'comments');
        const q = query(commentsRef);
        const unsubscribe = onSnapshot(q, (snapshot) => {
            const fetchedComments = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data(), timestamp: doc.data().timestamp?.toDate() }));
            fetchedComments.sort((a, b) => (a.timestamp || 0) - (b.timestamp || 0));
            setComments(fetchedComments);
        });
        return () => unsubscribe();
    }, [postId]);

    const handleAddComment = async (e) => {
        e.preventDefault();
        if (newComment.trim() === '' || !user || !userData) return;
        setIsSubmitting(true);

        try {
            const postRef = doc(db, 'community_posts', postId);
            const commentsRef = collection(db, 'community_posts', postId, 'comments');
            
            await addDoc(commentsRef, {
                content: newComment,
                authorId: user.uid,
                authorName: userData.name,
                authorPic: userData.profile_pic,
                timestamp: serverTimestamp(),
            });

            await runTransaction(db, async (transaction) => {
                const postDoc = await transaction.get(postRef);
                if (!postDoc.exists()) {
                    throw "Document does not exist!";
                }
                const newCommentCount = (postDoc.data().commentCount || 0) + 1;
                transaction.update(postRef, { commentCount: newCommentCount });
            });

            setNewComment('');
        } catch (error) {
            console.error("Error adding comment: ", error);
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <div className="mt-4 pt-4 border-t dark:border-slate-700">
            <div className="space-y-4 mb-4">
                {comments.map(comment => (
                     <Comment key={comment.id} comment={comment} postId={postId} />
                ))}
            </div>
            <form onSubmit={handleAddComment} className="flex items-center gap-2">
                <input 
                    type="text"
                    value={newComment}
                    onChange={(e) => setNewComment(e.target.value)}
                    placeholder="Write a comment..."
                    className="flex-1 px-3 py-2 bg-slate-100 dark:bg-slate-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-cyan-500"
                    disabled={isSubmitting}
                />
                <button type="submit" disabled={isSubmitting || !newComment.trim()} className="p-2 bg-cyan-500 text-white rounded-md disabled:bg-cyan-300 hover:bg-cyan-600">
                    <Send size={18}/>
                </button>
            </form>
        </div>
    );
}


// --- Reusable Components ---

function Sidebar({ currentPage, setCurrentPage, toggleTheme, theme, isExpanded, setIsExpanded }) {
    const navItems = [
        { id: 'dashboard', icon: Home, label: 'Dashboard' },
        { id: 'tracker', icon: Feather, label: 'Log Mood' },
        { id: 'journal', icon: BookOpen, label: 'Journal' },
        { id: 'analytics', icon: BarChartIcon, label: 'Analytics' },
        { id: 'community', icon: Users, label: 'Community' },
        { id: 'profile', icon: User, label: 'Profile' },
    ];

    return (
        <nav className={`transition-all duration-300 ease-in-out bg-white dark:bg-slate-800 shadow-lg flex flex-col justify-between relative ${isExpanded ? 'w-64' : 'w-20'}`}>
            <div>
                <div className={`flex items-center h-20 border-b dark:border-slate-700 ${isExpanded ? 'justify-start px-6' : 'justify-center'}`}>
                    <Logo className="w-8 h-8 flex-shrink-0" />
                    <span className={`ml-3 font-bold text-xl whitespace-nowrap transition-opacity duration-200 ${isExpanded ? 'opacity-100' : 'opacity-0'}`}>EaseHaven</span>
                </div>
                <ul>
                    {navItems.map(item => (
                        <li key={item.id} className="relative">
                            <button onClick={() => setCurrentPage(item.id)} className={`flex items-center w-full h-14 px-6 text-slate-600 dark:text-slate-300 hover:bg-cyan-50 dark:hover:bg-slate-700 ${currentPage === item.id ? 'bg-cyan-100 dark:bg-cyan-900 text-cyan-600 dark:text-cyan-300' : ''}`}>
                                <item.icon className="w-6 h-6 flex-shrink-0" />
                                <span className={`ml-6 whitespace-nowrap transition-opacity duration-200 ${isExpanded ? 'opacity-100' : 'opacity-0'}`}>{item.label}</span>
                            </button>
                        </li>
                    ))}
                </ul>
            </div>
            
            <div className="p-4 border-t dark:border-slate-700">
                 <button onClick={() => setIsExpanded(!isExpanded)} className="absolute -right-4 top-20 bg-white dark:bg-slate-700 text-slate-500 dark:text-slate-300 p-1 rounded-full border dark:border-slate-600 shadow-md hover:bg-slate-100 dark:hover:bg-slate-600">
                    {isExpanded ? <ChevronsLeft size={18} /> : <ChevronsRight size={18} />}
                </button>
                <button onClick={toggleTheme} className="flex items-center w-full h-14 px-6 text-slate-600 dark:text-slate-300 hover:bg-cyan-50 dark:hover:bg-slate-700 rounded-lg">
                    {theme === 'light' ? <Moon className="w-6 h-6 flex-shrink-0" /> : <Sun className="w-6 h-6 flex-shrink-0" />}
                    <span className={`ml-6 whitespace-nowrap transition-opacity duration-200 ${isExpanded ? 'opacity-100' : 'opacity-0'}`}>{theme === 'light' ? 'Dark Mode' : 'Light Mode'}</span>
                </button>
                <button onClick={() => signOut(auth)} className="flex items-center w-full h-14 px-6 text-slate-600 dark:text-slate-300 hover:bg-cyan-50 dark:hover:bg-slate-700 rounded-lg">
                    <LogOut className="w-6 h-6 flex-shrink-0" />
                    <span className={`ml-6 whitespace-nowrap transition-opacity duration-200 ${isExpanded ? 'opacity-100' : 'opacity-0'}`}>Logout</span>
                </button>
            </div>
        </nav>
    );
}

function AnalysisModal({ isOpen, onClose, isLoading, result }) {
    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 bg-black bg-opacity-60 flex items-center justify-center z-50 animate-fade-in">
            <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-2xl p-8 w-full max-w-lg m-4">
                <h2 className="text-2xl font-bold mb-4 flex items-center gap-2"><Sparkles className="text-yellow-400"/> AI Reflection</h2>
                {isLoading ? (
                    <div className="flex flex-col items-center justify-center h-48">
                        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-cyan-500"></div>
                        <p className="mt-4 text-slate-500 dark:text-slate-400">Analyzing your entry...</p>
                    </div>
                ) : result ? (
                    <div className="space-y-4">
                        <div>
                            <h3 className="font-semibold text-slate-700 dark:text-slate-200">Emotional Tone:</h3>
                            <p className="text-slate-600 dark:text-slate-300 italic">"{result.tone}"</p>
                        </div>
                        <div>
                            <h3 className="font-semibold text-slate-700 dark:text-slate-200">Key Themes:</h3>
                            <div className="flex flex-wrap gap-2 mt-1">
                                {result.themes?.map((theme, i) => (
                                    <span key={i} className="bg-cyan-100 text-cyan-800 text-xs font-medium px-2.5 py-0.5 rounded-full dark:bg-cyan-900 dark:text-cyan-300">{theme}</span>
                                ))}
                            </div>
                        </div>
                        <div>
                            <h3 className="font-semibold text-slate-700 dark:text-slate-200">A Question for Reflection:</h3>
                            <p className="text-slate-600 dark:text-slate-300 italic">"{result.reflection}"</p>
                        </div>
                    </div>
                ) : null}
                <div className="text-right mt-6">
                    <button onClick={onClose} className="py-2 px-5 rounded-lg bg-cyan-500 text-white font-semibold hover:bg-cyan-600">
                        Close
                    </button>
                </div>
                 <p className="text-xs text-slate-400 dark:text-slate-500 mt-4 text-center">Disclaimer: AI insights are for reflection and not a substitute for professional advice.</p>
            </div>
        </div>
    );
}

function ChatAssistant() {
    const [isOpen, setIsOpen] = useState(false);
    const [messages, setMessages] = useState([{ text: "Hello! I'm your EaseHaven AI Support. How can I support you today?", sender: 'bot' }]);
    const [input, setInput] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const messagesEndRef = useRef(null);

    useEffect(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, [messages]);

    const handleSend = async () => {
        if (input.trim() === '') return;
        const userMessage = { text: input, sender: 'user' };
        setMessages(prev => [...prev, userMessage]);
        const currentInput = input;
        setInput('');
        setIsLoading(true);

        const prompt = `You are a kind, empathetic, and motivational AI assistant for a mental wellness app called EaseHaven. Your goal is to provide supportive, helpful, and safe conversations. You are not a licensed therapist. Keep responses concise, positive, and encouraging. User's message: "${currentInput}"`;
        
        try {
            const botResponse = await callGeminiAPI(prompt);
            setMessages(prev => [...prev, { text: botResponse, sender: 'bot' }]);
        } catch (error) {
            setMessages(prev => [...prev, { text: "I'm having a little trouble connecting. Please try again.", sender: 'bot' }]);
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <>
            <button onClick={() => setIsOpen(!isOpen)} className="fixed bottom-6 right-6 bg-cyan-500 text-white w-16 h-16 rounded-full shadow-lg flex items-center justify-center hover:bg-cyan-600 transition-transform hover:scale-110 z-40">
                {isOpen ? <span className="text-2xl font-bold">&times;</span> : <MessageSquare className="w-8 h-8" />}
            </button>
            {isOpen && (
                <div className="fixed bottom-24 right-6 w-full max-w-sm h-[60vh] bg-white dark:bg-slate-800 rounded-2xl shadow-2xl flex flex-col animate-fade-in-up z-50">
                    <div className="p-4 border-b dark:border-slate-700 flex justify-between items-center">
                        <h2 className="font-bold text-lg">EaseHaven AI Support</h2>
                        <button onClick={() => setIsOpen(false)} className="text-slate-500 hover:text-slate-800 dark:hover:text-white text-2xl">&times;</button>
                    </div>
                    <div className="flex-1 p-4 overflow-y-auto space-y-4">
                        {messages.map((msg, index) => (
                            <div key={index} className={`flex items-end gap-2 ${msg.sender === 'user' ? 'justify-end' : 'justify-start'}`}>
                                {msg.sender === 'bot' && <div className="w-8 h-8 rounded-full bg-cyan-500 flex items-center justify-center text-white flex-shrink-0"><Bot size={20} /></div>}
                                <div className={`max-w-xs px-4 py-2 rounded-2xl ${msg.sender === 'user' ? 'bg-blue-500 text-white rounded-br-none' : 'bg-slate-200 dark:bg-slate-700 rounded-bl-none'}`}>
                                    <p className="text-sm">{msg.text}</p>
                                </div>
                            </div>
                        ))}
                         {isLoading && <div className="flex justify-start items-end gap-2"><div className="w-8 h-8 rounded-full bg-cyan-500 flex items-center justify-center text-white flex-shrink-0"><Bot size={20} /></div><div className="max-w-xs px-4 py-2 rounded-2xl bg-slate-200 dark:bg-slate-700 rounded-bl-none"><p className="text-sm text-slate-400 italic">AI is typing...</p></div></div>}
                        <div ref={messagesEndRef} />
                    </div>
                    <div className="p-4 border-t dark:border-slate-700">
                        <div className="flex items-center gap-2 bg-slate-100 dark:bg-slate-700 rounded-lg p-1">
                            <input type="text" value={input} onChange={e => setInput(e.target.value)} onKeyPress={e => e.key === 'Enter' && !isLoading && handleSend()} placeholder="Type a message..." className="w-full bg-transparent p-2 focus:outline-none" disabled={isLoading} />
                            <button onClick={handleSend} disabled={isLoading || !input.trim()} className="p-2 bg-cyan-500 text-white rounded-md disabled:bg-cyan-300 hover:bg-cyan-600">
                                <Send size={18} />
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </>
    );
}
