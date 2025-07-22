import React, { useState, useEffect, useRef, createContext, useContext } from 'react';
import { initializeApp } from 'firebase/app';
import { getAuth, onAuthStateChanged, createUserWithEmailAndPassword, signInWithEmailAndPassword, signOut } from 'firebase/auth';
import { getFirestore, doc, setDoc, getDoc, collection, addDoc, query, onSnapshot, updateDoc, serverTimestamp, orderBy, where } from 'firebase/firestore';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';
import { ArrowRight, Bot, Feather, Heart, Home, LogOut, MessageSquare, Sun, Moon, User, Settings, Award, Sparkles, Send, Smile, Meh, Frown, Angry, Laugh, BookOpen, Lightbulb } from 'lucide-react';

// --- Firebase Configuration ---
// This configuration is for your Firebase project.
const firebaseConfig = {
  apiKey: "AIzaSyDoxbgjjPOsSlgYNGlDQlBIkS3Aft46Ud0",
  authDomain: "easehaven-wellness-app.firebaseapp.com",
  projectId: "easehaven-wellness-app",
  storageBucket: "easehaven-wellness-app.firebasestorage.app",
  messagingSenderId: "526675114160",
  appId: "1:526675114160:web:9b31c080e2d3185a42e375"
};

const appId = 'easehaven-v2';


// --- Initialize Firebase ---
const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);

// --- Authentication Context ---
const AuthContext = createContext();
const useAuth = () => useContext(AuthContext);

const AuthProvider = ({ children }) => {
    const [user, setUser] = useState(null);
    const [userData, setUserData] = useState(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
            if (firebaseUser) {
                const userDocRef = doc(db, 'users', firebaseUser.uid);
                const unsubscribeDoc = onSnapshot(userDocRef, (docSnap) => {
                    if (docSnap.exists()) {
                        setUserData({ id: docSnap.id, ...docSnap.data() });
                    }
                    setUser(firebaseUser);
                    setLoading(false);
                });
                return () => unsubscribeDoc();
            } else {
                setUser(null);
                setUserData(null);
                setLoading(false);
            }
        });
        return () => unsubscribe();
    }, []);

    const value = { user, userData, loading };

    return <AuthContext.Provider value={value}>{!loading && children}</AuthContext.Provider>;
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
    const { user } = useAuth();
    const [currentPage, setCurrentPage] = useState('dashboard');
    const [theme, setTheme] = useState('light');

    useEffect(() => {
        const root = document.documentElement;
        if (theme === 'dark') {
            root.classList.add('dark');
        } else {
            root.classList.remove('dark');
        }
    }, [theme]);

    const toggleTheme = () => setTheme(prev => (prev === 'light' ? 'dark' : 'light'));

    if (!user) {
        return <AuthScreen />;
    }
    
    const renderPage = () => {
        switch (currentPage) {
            case 'dashboard': return <DashboardScreen onNavigate={setCurrentPage} />;
            case 'tracker': return <MoodTrackerScreen onLogSuccess={() => setCurrentPage('dashboard')} />;
            case 'journal': return <JournalScreen />;
            case 'profile': return <ProfileScreen />;
            default: return <DashboardScreen onNavigate={setCurrentPage} />;
        }
    };

    return (
        <div className={`min-h-screen font-sans bg-slate-50 dark:bg-slate-900 text-slate-800 dark:text-slate-200 flex`}>
            <Sidebar currentPage={currentPage} setCurrentPage={setCurrentPage} toggleTheme={toggleTheme} theme={theme} />
            <main className="flex-1 p-4 sm:p-6 lg:p-8 overflow-y-auto">
                {renderPage()}
            </main>
            <ChatAssistant />
        </div>
    );
}

// --- Screens ---

function AuthScreen() {
    const [isLogin, setIsLogin] = useState(true);
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [name, setName] = useState('');
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);

    const handleAuth = async (e) => {
        e.preventDefault();
        setLoading(true);
        setError('');
        try {
            if (isLogin) {
                await signInWithEmailAndPassword(auth, email, password);
            } else {
                const userCredential = await createUserWithEmailAndPassword(auth, email, password);
                await setDoc(doc(db, 'users', userCredential.user.uid), {
                    name,
                    email,
                    createdAt: serverTimestamp(),
                    age: '',
                    occupation: '',
                    profile_pic: `https://api.dicebear.com/7.x/initials/svg?seed=${name}`
                });
                await setDoc(doc(db, 'streaks', userCredential.user.uid), {
                    current_streak: 0,
                    longest_streak: 0,
                    last_logged_date: null
                });
            }
        } catch (err) {
            setError(err.message.replace('Firebase: ', ''));
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="flex flex-col items-center justify-center w-full min-h-screen bg-gradient-to-br from-cyan-50 to-blue-100 dark:from-slate-800 dark:to-slate-900">
            <div className="w-full max-w-md p-8 space-y-6 bg-white dark:bg-slate-800 rounded-2xl shadow-lg">
                <div className="text-center">
                    <Heart className="w-12 h-12 text-cyan-500 mx-auto mb-2" />
                    <h1 className="text-3xl font-bold text-slate-800 dark:text-white">Welcome to EaseHaven</h1>
                    <p className="text-slate-500 dark:text-slate-400">{isLogin ? 'Sign in to continue' : 'Create your account'}</p>
                </div>
                <form onSubmit={handleAuth} className="space-y-4">
                    {!isLogin && (
                        <input type="text" placeholder="Your Name" value={name} onChange={e => setName(e.target.value)} required className="w-full px-4 py-2 bg-slate-100 dark:bg-slate-700 rounded-md focus:outline-none focus:ring-2 focus:ring-cyan-500" />
                    )}
                    <input type="email" placeholder="Email" value={email} onChange={e => setEmail(e.target.value)} required className="w-full px-4 py-2 bg-slate-100 dark:bg-slate-700 rounded-md focus:outline-none focus:ring-2 focus:ring-cyan-500" />
                    <input type="password" placeholder="Password" value={password} onChange={e => setPassword(e.target.value)} required className="w-full px-4 py-2 bg-slate-100 dark:bg-slate-700 rounded-md focus:outline-none focus:ring-2 focus:ring-cyan-500" />
                    <button type="submit" disabled={loading} className="w-full bg-cyan-500 text-white font-semibold py-3 px-4 rounded-lg shadow-lg hover:bg-cyan-600 transition-all duration-300 disabled:bg-cyan-300">
                        {loading ? 'Processing...' : (isLogin ? 'Login' : 'Sign Up')}
                    </button>
                    {error && <p className="text-red-500 text-sm text-center">{error}</p>}
                </form>
                <p className="text-center text-sm text-slate-500 dark:text-slate-400">
                    {isLogin ? "Don't have an account?" : "Already have an account?"}
                    <button onClick={() => setIsLogin(!isLogin)} className="font-semibold text-cyan-500 hover:underline ml-1">
                        {isLogin ? 'Sign Up' : 'Login'}
                    </button>
                </p>
            </div>
        </div>
    );
}

function DashboardScreen({ onNavigate }) {
    const { userData } = useAuth();
    const [moodLogs, setMoodLogs] = useState([]);
    const [streaks, setStreaks] = useState({ current_streak: 0, longest_streak: 0 });
    const [thoughtOfTheDay, setThoughtOfTheDay] = useState('');
    const [thoughtLoading, setThoughtLoading] = useState(true);

    useEffect(() => {
        const getThoughtOfTheDay = async () => {
            setThoughtLoading(true);
            // FIX: Use environment variable for API key.
            const apiKey = process.env.REACT_APP_GEMINI_API_KEY;
            if (!apiKey) {
                console.error("Gemini API key not found. Please set REACT_APP_GEMINI_API_KEY in your .env.local file.");
                setThoughtOfTheDay("Every small step forward is still a step forward. Be proud of your progress.");
                setThoughtLoading(false);
                return;
            }

            const prompt = "Provide a short, uplifting, and motivational 'thought of the day' for a user of a mental wellness app. It should be one or two sentences. Do not include quotation marks or any prefixes like 'Thought of the Day:'.";
            try {
                const payload = { contents: [{ role: "user", parts: [{ text: prompt }] }] };
                const apiUrl = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${apiKey}`;
                const response = await fetch(apiUrl, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(payload)
                });

                if (!response.ok) {
                    throw new Error(`API call failed with status: ${response.status}`);
                }

                const result = await response.json();
                if (result.candidates && result.candidates[0]?.content?.parts[0]?.text) {
                    setThoughtOfTheDay(result.candidates[0].content.parts[0].text);
                } else {
                    throw new Error("Invalid response structure from API");
                }
            } catch (error) {
                console.error("Error fetching thought of the day:", error);
                setThoughtOfTheDay("Every small step forward is still a step forward. Be proud of your progress.");
            } finally {
                setThoughtLoading(false);
            }
        };
        getThoughtOfTheDay();
    }, []);

    useEffect(() => {
        if (userData) {
            const q = query(collection(db, `users/${userData.id}/mood_entries`), orderBy("timestamp", "asc"));
            const unsubscribe = onSnapshot(q, (snapshot) => {
                const logs = [];
                snapshot.forEach(doc => {
                    const data = doc.data();
                    if (data.timestamp) {
                        logs.push({ id: doc.id, ...data, timestamp: data.timestamp.toDate() });
                    }
                });
                setMoodLogs(logs);
            });
            
            const streakRef = doc(db, 'streaks', userData.id);
            const unsubStreaks = onSnapshot(streakRef, (doc) => {
                if (doc.exists()) {
                    setStreaks(doc.data());
                }
            });

            return () => {
                unsubscribe();
                unsubStreaks();
            };
        }
    }, [userData]);

    const chartData = moodLogs.slice(-7).map(log => ({
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
        <div className="animate-fade-in space-y-8">
            <h1 className="text-3xl font-bold">Welcome back, {userData?.name || 'friend'}.</h1>
            
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
                                {pieData.map((entry, index) => <Cell key={`cell-${index}`} fill={MOOD_COLORS[entry.name]} />)}
                            </Pie>
                            <Tooltip />
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
        { name: 'Happy', icon: Laugh },
        { name: 'Calm', icon: Smile },
        { name: 'Okay', icon: Meh },
        { name: 'Sad', icon: Frown },
        { name: 'Anxious', icon: Frown },
        { name: 'Angry', icon: Angry },
    ];

    const getAISuggestion = async (mood, stress, userNote) => {
        // FIX: Use environment variable for API key.
        const apiKey = process.env.REACT_APP_GEMINI_API_KEY;
        if (!apiKey) {
            console.error("Gemini API key not found.");
            setSuggestion({ title: "A Moment for You", content: "Take a brief pause. Step away from your screen, stretch, or listen to a favorite song. Sometimes a small break is all you need." });
            return;
        }

        const prompt = `A user in a mental wellness app feels "${mood}" with a stress level of ${stress}/10. Their journal note is: "${userNote}". Based on this, provide one simple, safe, non-medical, actionable suggestion for an activity to help them. The suggestion should be encouraging and empathetic. The response must be a JSON object with two keys: "title" (a short, catchy title for the activity) and "content" (a 2-3 sentence description of the activity). Example format: {"title": "Mindful Breathing", "content": "Take a few moments to focus on your breath. Inhale deeply for 4 seconds, hold for 4, and exhale for 6. This can help calm your nervous system."}`;
        
        try {
            const payload = { contents: [{ role: "user", parts: [{ text: prompt }] }] };
            const apiUrl = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${apiKey}`;
            const response = await fetch(apiUrl, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload)
            });
            if (!response.ok) throw new Error(`API error: ${response.status}`);
            
            const result = await response.json();
            if (result.candidates && result.candidates[0]?.content?.parts[0]?.text) {
                const text = result.candidates[0].content.parts[0].text;
                const cleanedText = text.replace(/```json|```/g, '').trim();
                try {
                    setSuggestion(JSON.parse(cleanedText));
                } catch {
                    throw new Error("Malformed JSON response from AI.");
                }
            } else {
                 throw new Error("Invalid response structure from API");
            }
        } catch (error) {
            console.error("Error fetching AI suggestion:", error);
            setSuggestion({ title: "A Moment for You", content: "Take a brief pause. Step away from your screen, stretch, or listen to a favorite song. Sometimes a small break is all you need." });
        }
    };

    const handleLogMood = async (e) => {
        e.preventDefault();
        if (!mood) return;
        setLoading(true);

        await addDoc(collection(db, `users/${user.uid}/mood_entries`), {
            mood,
            stress_level: parseInt(stressLevel),
            note,
            timestamp: serverTimestamp()
        });
        
        const streakRef = doc(db, 'streaks', user.uid);
        const streakSnap = await getDoc(streakRef);
        if (streakSnap.exists()) {
            const streakData = streakSnap.data();
            const today = new Date().setHours(0, 0, 0, 0);
            const lastLogged = streakData.last_logged_date?.toDate().setHours(0, 0, 0, 0);
            
            let newStreak = streakData.current_streak || 0;
            if (lastLogged !== today) {
                const yesterday = new Date();
                yesterday.setDate(yesterday.getDate() - 1);
                const yesterdayTime = yesterday.setHours(0,0,0,0);

                if (lastLogged === yesterdayTime) {
                    newStreak++;
                } else {
                    newStreak = 1;
                }
                await updateDoc(streakRef, {
                    current_streak: newStreak,
                    longest_streak: Math.max(newStreak, streakData.longest_streak || 0),
                    last_logged_date: new Date()
                });
            }
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
    const { user } = useAuth();
    const [entries, setEntries] = useState([]);
    const [newEntry, setNewEntry] = useState('');
    const [isSaving, setIsSaving] = useState(false);
    const [analyzingEntry, setAnalyzingEntry] = useState(null);
    const [analysisResult, setAnalysisResult] = useState(null);
    const [isAnalysisLoading, setIsAnalysisLoading] = useState(false);

    useEffect(() => {
        if (user) {
            const q = query(collection(db, `users/${user.uid}/journal_entries`), orderBy('timestamp', 'desc'));
            const unsubscribe = onSnapshot(q, (snapshot) => {
                const journalEntries = [];
                snapshot.forEach(doc => {
                    journalEntries.push({ id: doc.id, ...doc.data(), timestamp: doc.data().timestamp?.toDate() });
                });
                setEntries(journalEntries);
            });
            return () => unsubscribe();
        }
    }, [user]);

    const handleSaveEntry = async () => {
        if (newEntry.trim() === '') return;
        setIsSaving(true);
        await addDoc(collection(db, `users/${user.uid}/journal_entries`), {
            content: newEntry,
            timestamp: serverTimestamp(),
        });
        setNewEntry('');
        setIsSaving(false);
    };

    const handleAnalyze = async (entry) => {
        setAnalyzingEntry(entry);
        setIsAnalysisLoading(true);
        setAnalysisResult(null);
        // FIX: Use environment variable for API key.
        const apiKey = process.env.REACT_APP_GEMINI_API_KEY;
        if (!apiKey) {
            console.error("Gemini API key not found.");
            setAnalysisResult({ tone: "Could not analyze entry.", themes: [], reflection: "API key is missing. Please configure it in your .env.local file." });
            setIsAnalysisLoading(false);
            return;
        }

        const prompt = `You are a reflective assistant in a wellness app. Analyze the following journal entry from a user. Do not give medical advice or a diagnosis. Your response must be a JSON object with three keys: "tone" (a gentle summary of the emotional tone, e.g., "It sounds like you're feeling..."), "themes" (an array of 2-3 key topics mentioned, e.g., ["Work Stress", "Future Plans"]), and "reflection" (one thoughtful, open-ended question to encourage the user's self-reflection, e.g., "What is one small step you could take towards...?"). Here is the user's entry: "${entry.content}"`;
        try {
            const payload = { contents: [{ role: "user", parts: [{ text: prompt }] }] };
            const apiUrl = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${apiKey}`;
            const response = await fetch(apiUrl, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload)
            });
            if (!response.ok) throw new Error(`API error: ${response.status}`);

            const result = await response.json();
            if (result.candidates && result.candidates[0]?.content?.parts[0]?.text) {
                const text = result.candidates[0].content.parts[0].text;
                const cleanedText = text.replace(/```json|```/g, '').trim();
                try {
                    setAnalysisResult(JSON.parse(cleanedText));
                } catch {
                    throw new Error("Malformed JSON response from AI.");
                }
            } else {
                throw new Error("Invalid response structure from API");
            }
        } catch (error) {
            console.error("Error analyzing journal entry:", error);
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
                            <p className="text-xs text-slate-400 dark:text-slate-500 mb-2">{entry.timestamp?.toLocaleString()}</p>
                            <p className="whitespace-pre-wrap">{entry.content}</p>
                            <div className="text-right mt-3">
                                <button onClick={() => handleAnalyze(entry)} className="inline-flex items-center gap-2 text-sm font-medium text-cyan-600 hover:text-cyan-800 dark:text-cyan-400 dark:hover:text-cyan-200">
                                    <Sparkles size={16} />
                                    Get Insights ✨
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
    const { userData } = useAuth();
    const [name, setName] = useState(userData?.name || '');
    const [age, setAge] = useState(userData?.age || '');
    const [occupation, setOccupation] = useState(userData?.occupation || '');
    const [loading, setLoading] = useState(false);
    const [message, setMessage] = useState('');

    const handleUpdate = async (e) => {
        e.preventDefault();
        setLoading(true);
        setMessage('');
        try {
            const userRef = doc(db, 'users', userData.id);
            await updateDoc(userRef, { name, age, occupation });
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
            <h1 className="text-3xl font-bold mb-6">Your Profile</h1>
            <div className="bg-white dark:bg-slate-800 p-8 rounded-xl shadow-md">
                <div className="flex items-center space-x-4 mb-8">
                    <img src={userData?.profile_pic} alt="Profile" className="w-20 h-20 rounded-full bg-slate-200" />
                    <div>
                        <h2 className="text-2xl font-bold">{userData?.name}</h2>
                        <p className="text-slate-500 dark:text-slate-400">{userData?.email}</p>
                    </div>
                </div>
                <form onSubmit={handleUpdate} className="space-y-4">
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
                    <div className="pt-2">
                        <button type="submit" disabled={loading} className="w-full bg-cyan-500 text-white font-semibold py-2 px-4 rounded-lg shadow-lg hover:bg-cyan-600 transition-all disabled:bg-cyan-300">
                            {loading ? 'Saving...' : 'Update Profile'}
                        </button>
                    </div>
                    {message && <p className="text-green-500 text-sm text-center mt-2">{message}</p>}
                </form>
            </div>
        </div>
    );
}


// --- Components ---

function Sidebar({ currentPage, setCurrentPage, toggleTheme, theme }) {
    const navItems = [
        { id: 'dashboard', icon: Home, label: 'Dashboard' },
        { id: 'tracker', icon: Feather, label: 'Log Mood' },
        { id: 'journal', icon: BookOpen, label: 'Journal' },
        { id: 'profile', icon: User, label: 'Profile' },
    ];

    return (
        <nav className="w-20 hover:w-64 transition-all duration-300 ease-in-out bg-white dark:bg-slate-800 shadow-lg flex flex-col justify-between group">
            <div>
                <div className="flex items-center justify-center h-20 border-b dark:border-slate-700">
                    <Heart className="w-8 h-8 text-cyan-500" />
                </div>
                <ul>
                    {navItems.map(item => (
                        <li key={item.id} className="relative">
                            <button onClick={() => setCurrentPage(item.id)} className={`flex items-center w-full h-14 px-6 text-slate-600 dark:text-slate-300 hover:bg-cyan-50 dark:hover:bg-slate-700 ${currentPage === item.id ? 'bg-cyan-100 dark:bg-cyan-900 text-cyan-600 dark:text-cyan-300' : ''}`}>
                                <item.icon className="w-6 h-6" />
                                <span className="ml-6 opacity-0 group-hover:opacity-100 transition-opacity duration-300 whitespace-nowrap">{item.label}</span>
                            </button>
                        </li>
                    ))}
                </ul>
            </div>
            <div className="p-4 border-t dark:border-slate-700">
                <button onClick={toggleTheme} className="flex items-center w-full h-14 px-6 text-slate-600 dark:text-slate-300 hover:bg-cyan-50 dark:hover:bg-slate-700">
                    {theme === 'light' ? <Moon className="w-6 h-6" /> : <Sun className="w-6 h-6" />}
                    <span className="ml-6 opacity-0 group-hover:opacity-100 transition-opacity duration-300 whitespace-nowrap">Theme</span>
                </button>
                <button onClick={() => signOut(auth)} className="flex items-center w-full h-14 px-6 text-slate-600 dark:text-slate-300 hover:bg-cyan-50 dark:hover:bg-slate-700">
                    <LogOut className="w-6 h-6" />
                    <span className="ml-6 opacity-0 group-hover:opacity-100 transition-opacity duration-300 whitespace-nowrap">Logout</span>
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
                <h2 className="text-2xl font-bold mb-4 flex items-center gap-2"><Sparkles className="text-yellow-400"/> AI-Powered Insights</h2>
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
    const [messages, setMessages] = useState([{ text: "Hello! I'm your AI Helper. How can I support you today?", sender: 'bot' }]);
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
        setInput('');
        setIsLoading(true);

        try {
            // FIX: Use environment variable for API key.
            const apiKey = process.env.REACT_APP_GEMINI_API_KEY;
            if (!apiKey) {
                throw new Error("API Key not found");
            }

            const prompt = `You are a kind, empathetic, and motivational AI assistant for a mental wellness app called EaseHaven. Your goal is to provide supportive, helpful, and safe conversations. You are not a licensed therapist. Keep responses concise, positive, and encouraging. User's message: "${input}"`;
            const payload = { contents: [{ role: "user", parts: [{ text: prompt }] }] };
            const apiUrl = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${apiKey}`;
            const response = await fetch(apiUrl, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload)
            });
            if (!response.ok) throw new Error(`API error: ${response.status}`);
            
            const result = await response.json();
            if (result.candidates && result.candidates[0]?.content?.parts[0]?.text) {
                const botResponse = result.candidates[0].content.parts[0].text;
                setMessages(prev => [...prev, { text: botResponse, sender: 'bot' }]);
            } else {
                throw new Error("Invalid response structure from API");
            }
        } catch (error) {
            console.error("Chatbot API error:", error);
            setMessages(prev => [...prev, { text: "I'm having a little trouble connecting. Please try again.", sender: 'bot' }]);
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <>
            <button onClick={() => setIsOpen(!isOpen)} className="fixed bottom-6 right-6 bg-cyan-500 text-white w-16 h-16 rounded-full shadow-lg flex items-center justify-center hover:bg-cyan-600 transition-transform hover:scale-110 z-40">
                <MessageSquare className="w-8 h-8" />
            </button>
            {isOpen && (
                <div className="fixed bottom-24 right-6 w-full max-w-sm h-[60vh] bg-white dark:bg-slate-800 rounded-2xl shadow-2xl flex flex-col animate-fade-in-up z-50">
                    <div className="p-4 border-b dark:border-slate-700 flex justify-between items-center">
                        <h2 className="font-bold text-lg">AI Helper</h2>
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
                         {isLoading && <div className="flex justify-start"><p className="text-sm text-slate-400">AI is typing...</p></div>}
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
