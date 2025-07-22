import React, { useState, useEffect, useRef, useMemo } from 'react';
import { initializeApp } from 'firebase/app';
import { getAuth, signInAnonymously, onAuthStateChanged, GoogleAuthProvider, signInWithPopup } from 'firebase/auth';
import { getFirestore, collection, addDoc, query, onSnapshot, doc, setDoc, getDoc, updateDoc } from 'firebase/firestore';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { ArrowRight, Bot, Feather, Heart, Home, MessageSquare, Sun, Moon, User, LogIn, Activity, Award } from 'lucide-react';

// --- Firebase Configuration ---
// The __firebase_config and __app_id variables are provided by the environment.
const firebaseConfig = {
  apiKey: "AIzaSyDoxbgjjPOsSlgYNGlDQlBIkS3Aft46Ud0",
  authDomain: "easehaven-wellness-app.firebaseapp.com",
  projectId: "easehaven-wellness-app",
  storageBucket: "easehaven-wellness-app.firebasestorage.app",
  messagingSenderId: "526675114160",
  appId: "1:526675114160:web:9b31c080e2d3185a42e375"
};
const appId = 'easehaven-local';

// --- Initialize Firebase ---
const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);

// --- Main App Component ---
export default function App() {
    const [user, setUser] = useState(null);
    const [loading, setLoading] = useState(true);
    const [currentPage, setCurrentPage] = useState('dashboard');
    const [theme, setTheme] = useState('light');
    const [isCheckinModalOpen, setCheckinModalOpen] = useState(false);
    const [userData, setUserData] = useState(null);

    // Effect for handling authentication state
    useEffect(() => {
        const unsubscribe = onAuthStateChanged(auth, async (currentUser) => {
            if (currentUser) {
                const userDocRef = doc(db, `artifacts/${appId}/users`, currentUser.uid);
                const userDocSnap = await getDoc(userDocRef);
                if (!userDocSnap.exists()) {
                    await setDoc(userDocRef, {
                        email: currentUser.email || 'anonymous',
                        displayName: currentUser.displayName || 'Anonymous User',
                        createdAt: new Date(),
                        points: 0,
                        streak: 0,
                    });
                }
                setUser(currentUser);
            } else {
                setUser(null);
            }
            setLoading(false);
        });
        return () => unsubscribe();
    }, []);

    // Effect for fetching user data
    useEffect(() => {
        if (user) {
            const userDocRef = doc(db, `artifacts/${appId}/users`, user.uid);
            const unsubscribe = onSnapshot(userDocRef, (doc) => {
                if (doc.exists()) {
                    setUserData(doc.data());
                }
            });
            return () => unsubscribe();
        }
    }, [user]);

    // Effect for managing theme
    useEffect(() => {
        document.documentElement.classList.toggle('dark', theme === 'dark');
    }, [theme]);

    const handleLogin = async () => {
        try {
            const provider = new GoogleAuthProvider();
            await signInWithPopup(auth, provider);
        } catch (error) {
            console.error("Error during Google sign-in:", error);
        }
    };

    const handleAnonymousLogin = async () => {
        try {
            await signInAnonymously(auth);
        } catch (error) {
            console.error("Error during anonymous sign-in:", error);
        }
    };

    const toggleTheme = () => {
        setTheme(prevTheme => prevTheme === 'light' ? 'dark' : 'light');
    };

    const renderPage = () => {
        switch (currentPage) {
            case 'dashboard':
                return <Dashboard user={user} onOpenCheckin={() => setCheckinModalOpen(true)} userData={userData} />;
            case 'journal':
                return <JournalScreen user={user} />;
            case 'chatbot':
                return <ChatbotScreen user={user} />;
            case 'meditate':
                return <MeditateScreen />;
            default:
                return <Dashboard user={user} onOpenCheckin={() => setCheckinModalOpen(true)} userData={userData} />;
        }
    };
    
    if (loading) {
        return <div className="flex items-center justify-center h-screen bg-slate-50 dark:bg-slate-900 text-slate-800 dark:text-slate-200">Loading EaseHaven...</div>;
    }

    if (!user) {
        return <AuthScreen onGoogleLogin={handleLogin} onAnonymousLogin={handleAnonymousLogin} />;
    }

    return (
        <div className={`min-h-screen font-sans bg-slate-50 dark:bg-slate-900 text-slate-800 dark:text-slate-200 flex`}>
            <Sidebar currentPage={currentPage} setCurrentPage={setCurrentPage} toggleTheme={toggleTheme} theme={theme} />
            <main className="flex-1 p-4 sm:p-6 lg:p-8">
                {renderPage()}
            </main>
            {isCheckinModalOpen && <DailyCheckinModal user={user} onClose={() => setCheckinModalOpen(false)} />}
        </div>
    );
}

// --- Screens & Components ---

function AuthScreen({ onGoogleLogin, onAnonymousLogin }) {
    return (
        <div className="flex flex-col items-center justify-center w-full min-h-screen bg-gradient-to-br from-cyan-50 to-blue-100">
            <div className="text-center p-8 max-w-md mx-auto">
                <Heart className="w-16 h-16 text-cyan-500 mx-auto mb-4" />
                <h1 className="text-4xl font-bold text-slate-800">Welcome to EaseHaven</h1>
                <p className="mt-2 text-slate-600">Your personal space for mental wellness and peace.</p>
                <div className="mt-8 space-y-4">
                    <button onClick={onGoogleLogin} className="w-full flex items-center justify-center gap-2 bg-white text-slate-700 font-semibold py-3 px-4 rounded-lg shadow-md hover:bg-slate-50 transition-all duration-300">
                        <img src="https://www.gstatic.com/firebasejs/ui/2.0.0/images/auth/google.svg" alt="Google icon" className="w-6 h-6" />
                        Sign in with Google
                    </button>
                    <button onClick={onAnonymousLogin} className="w-full bg-cyan-500 text-white font-semibold py-3 px-4 rounded-lg shadow-lg hover:bg-cyan-600 transition-all duration-300 transform hover:-translate-y-0.5">
                        <User className="inline-block w-5 h-5 mr-2" />
                        Continue Anonymously
                    </button>
                </div>
                <p className="mt-6 text-xs text-slate-500">Your privacy is our priority. All data is securely encrypted.</p>
            </div>
        </div>
    );
}

function Sidebar({ currentPage, setCurrentPage, toggleTheme, theme }) {
    const navItems = [
        { id: 'dashboard', icon: Home, label: 'Dashboard' },
        { id: 'chatbot', icon: Bot, label: 'AI Helper' },
        { id: 'journal', icon: Feather, label: 'Journal' },
        { id: 'meditate', icon: Activity, label: 'Meditate' },
    ];

    return (
        <nav className="w-16 hover:w-56 transition-all duration-300 ease-in-out bg-white dark:bg-slate-800 shadow-lg flex flex-col justify-between">
            <div>
                <div className="flex items-center justify-center h-20 border-b dark:border-slate-700">
                     <Heart className="w-8 h-8 text-cyan-500" />
                </div>
                <ul>
                    {navItems.map(item => (
                        <li key={item.id} className="relative">
                            <button onClick={() => setCurrentPage(item.id)} className={`flex items-center w-full h-14 px-4 text-slate-600 dark:text-slate-300 hover:bg-cyan-50 dark:hover:bg-slate-700 group ${currentPage === item.id ? 'bg-cyan-100 dark:bg-cyan-900 text-cyan-600 dark:text-cyan-300' : ''}`}>
                                <item.icon className="w-6 h-6" />
                                <span className="ml-4 opacity-0 group-hover:opacity-100 transition-opacity duration-300">{item.label}</span>
                            </button>
                        </li>
                    ))}
                </ul>
            </div>
            <div className="p-4 border-t dark:border-slate-700">
                 <button onClick={toggleTheme} className="flex items-center w-full h-14 px-4 text-slate-600 dark:text-slate-300 hover:bg-cyan-50 dark:hover:bg-slate-700 group">
                    {theme === 'light' ? <Moon className="w-6 h-6" /> : <Sun className="w-6 h-6" />}
                    <span className="ml-4 opacity-0 group-hover:opacity-100 transition-opacity duration-300">Toggle Theme</span>
                </button>
            </div>
        </nav>
    );
}

function Dashboard({ user, onOpenCheckin, userData }) {
    const [moodLogs, setMoodLogs] = useState([]);

    useEffect(() => {
        if (user) {
            const q = query(collection(db, `artifacts/${appId}/users/${user.uid}/moodLogs`));
            const unsubscribe = onSnapshot(q, (querySnapshot) => {
                const logs = [];
                querySnapshot.forEach((doc) => {
                    const data = doc.data();
                    logs.push({ 
                        id: doc.id, 
                        ...data,
                        timestamp: data.timestamp.toDate() 
                    });
                });
                // Sort logs by timestamp client-side
                logs.sort((a, b) => a.timestamp - b.timestamp);
                setMoodLogs(logs.slice(-7)); // Only show last 7 for the chart
            });
            return () => unsubscribe();
        }
    }, [user]);

    const chartData = moodLogs.map(log => ({
        name: log.timestamp.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
        stress: log.stressLevel,
        mood: log.mood,
    }));

    const getGreeting = () => {
        const hour = new Date().getHours();
        if (hour < 12) return "Good Morning";
        if (hour < 18) return "Good Afternoon";
        return "Good Evening";
    };

    return (
        <div className="animate-fade-in">
            <h1 className="text-3xl font-bold">{getGreeting()}, {userData?.displayName || 'friend'}.</h1>
            <p className="text-slate-500 dark:text-slate-400 mt-1">Ready to check in with yourself?</p>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mt-8">
                <div className="md:col-span-1 bg-gradient-to-br from-cyan-400 to-blue-500 p-6 rounded-xl text-white flex flex-col justify-between shadow-lg">
                    <div>
                        <h2 className="text-xl font-bold">Daily Check-in</h2>
                        <p className="mt-2 opacity-90">How are you feeling today? A moment of reflection can make a world of difference.</p>
                    </div>
                    <button onClick={onOpenCheckin} className="mt-4 bg-white text-cyan-500 font-bold py-2 px-4 rounded-lg w-full text-center hover:bg-cyan-50 transition-all">
                        Check In Now
                    </button>
                </div>
                 <div className="bg-white dark:bg-slate-800 p-6 rounded-xl shadow-md flex items-center justify-between">
                    <div>
                        <p className="text-sm text-slate-500 dark:text-slate-400">Wellness Points</p>
                        <p className="text-3xl font-bold text-cyan-500">{userData?.points || 0}</p>
                    </div>
                    <Award className="w-10 h-10 text-yellow-400" />
                </div>
                <div className="bg-white dark:bg-slate-800 p-6 rounded-xl shadow-md flex items-center justify-between">
                    <div>
                        <p className="text-sm text-slate-500 dark:text-slate-400">Current Streak</p>
                        <p className="text-3xl font-bold text-cyan-500">{userData?.streak || 0} days</p>
                    </div>
                    <Activity className="w-10 h-10 text-green-500" />
                </div>
            </div>

            <div className="mt-8 bg-white dark:bg-slate-800 p-4 sm:p-6 rounded-xl shadow-md">
                <h2 className="text-xl font-bold mb-4">Your 7-Day Stress Trend</h2>
                {chartData.length > 0 ? (
                    <ResponsiveContainer width="100%" height={300}>
                        <BarChart data={chartData}>
                            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="rgba(128, 128, 128, 0.2)" />
                            <XAxis dataKey="name" tick={{ fill: 'currentColor' }} />
                            <YAxis domain={[0, 10]} tick={{ fill: 'currentColor' }} />
                            <Tooltip
                                contentStyle={{
                                    backgroundColor: 'rgba(30, 41, 59, 0.8)',
                                    borderColor: 'rgba(128, 128, 128, 0.5)',
                                    color: '#fff',
                                    borderRadius: '0.5rem'
                                }}
                            />
                            <Legend />
                            <Bar dataKey="stress" fill="#06b6d4" name="Stress Level (0-10)" />
                        </BarChart>
                    </ResponsiveContainer>
                ) : (
                    <div className="h-72 flex flex-col items-center justify-center text-slate-500 dark:text-slate-400">
                        <p>No data yet.</p>
                        <p>Complete your first daily check-in to see your trends.</p>
                    </div>
                )}
            </div>
        </div>
    );
}

function DailyCheckinModal({ user, onClose }) {
    const [stressLevel, setStressLevel] = useState(5);
    const [mood, setMood] = useState('');
    const [triggers, setTriggers] = useState('');
    const [isSubmitting, setIsSubmitting] = useState(false);

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (!mood) {
            alert("Please select a mood.");
            return;
        }
        setIsSubmitting(true);
        try {
            await addDoc(collection(db, `artifacts/${appId}/users/${user.uid}/moodLogs`), {
                stressLevel: parseInt(stressLevel),
                mood,
                triggers,
                timestamp: new Date(),
            });

            // Update user points and streak
            const userDocRef = doc(db, `artifacts/${appId}/users`, user.uid);
            const userDoc = await getDoc(userDocRef);
            if(userDoc.exists()) {
                const userData = userDoc.data();
                // Simple streak logic: check if last check-in was yesterday
                // For a real app, this logic would be more robust.
                const newPoints = (userData.points || 0) + 10;
                const newStreak = (userData.streak || 0) + 1; // Simplified for MVP
                await updateDoc(userDocRef, {
                    points: newPoints,
                    streak: newStreak
                });
            }

            onClose();
        } catch (error) {
            console.error("Error adding mood log: ", error);
        } finally {
            setIsSubmitting(false);
        }
    };
    
    const moodOptions = ["Happy", "Calm", "Okay", "Sad", "Anxious", "Stressed", "Angry"];

    return (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 animate-fade-in">
            <div className="bg-white dark:bg-slate-800 rounded-xl shadow-2xl p-8 w-full max-w-md m-4">
                <h2 className="text-2xl font-bold mb-4">Daily Check-in</h2>
                <form onSubmit={handleSubmit}>
                    <div className="mb-6">
                        <label className="block text-slate-600 dark:text-slate-300 mb-2">How stressed do you feel right now? (0-10)</label>
                        <input type="range" min="0" max="10" value={stressLevel} onChange={(e) => setStressLevel(e.target.value)} className="w-full h-2 bg-slate-200 rounded-lg appearance-none cursor-pointer dark:bg-slate-700" />
                        <div className="text-center font-bold text-cyan-500 text-2xl mt-2">{stressLevel}</div>
                    </div>
                    <div className="mb-6">
                        <label className="block text-slate-600 dark:text-slate-300 mb-2">What's your primary mood?</label>
                        <div className="flex flex-wrap gap-2">
                           {moodOptions.map(m => (
                               <button type="button" key={m} onClick={() => setMood(m)} className={`px-3 py-1 rounded-full text-sm font-medium transition-colors ${mood === m ? 'bg-cyan-500 text-white' : 'bg-slate-200 dark:bg-slate-700 hover:bg-slate-300 dark:hover:bg-slate-600'}`}>
                                   {m}
                               </button>
                           ))}
                        </div>
                    </div>
                     <div className="mb-6">
                        <label htmlFor="triggers" className="block text-slate-600 dark:text-slate-300 mb-2">Any specific triggers? (Optional)</label>
                        <input id="triggers" type="text" value={triggers} onChange={(e) => setTriggers(e.target.value)} placeholder="e.g., work, family, finances" className="w-full px-3 py-2 bg-slate-100 dark:bg-slate-700 rounded-md focus:outline-none focus:ring-2 focus:ring-cyan-500" />
                    </div>
                    <div className="flex justify-end gap-4">
                        <button type="button" onClick={onClose} className="py-2 px-4 rounded-lg text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700">Cancel</button>
                        <button type="submit" disabled={isSubmitting} className="py-2 px-4 rounded-lg bg-cyan-500 text-white font-semibold hover:bg-cyan-600 disabled:bg-cyan-300">
                            {isSubmitting ? 'Saving...' : 'Save Check-in'}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
}

function JournalScreen({ user }) {
    const [entries, setEntries] = useState([]);
    const [newEntry, setNewEntry] = useState('');
    const [isSaving, setIsSaving] = useState(false);

    useEffect(() => {
        if (user) {
            const q = query(collection(db, `artifacts/${appId}/users/${user.uid}/journalEntries`));
            const unsubscribe = onSnapshot(q, (querySnapshot) => {
                const journalEntries = [];
                querySnapshot.forEach((doc) => {
                    const data = doc.data();
                    journalEntries.push({ id: doc.id, ...data, timestamp: data.timestamp.toDate() });
                });
                journalEntries.sort((a, b) => b.timestamp - a.timestamp);
                setEntries(journalEntries);
            });
            return () => unsubscribe();
        }
    }, [user]);

    const handleSaveEntry = async () => {
        if (newEntry.trim() === '') return;
        setIsSaving(true);
        try {
            await addDoc(collection(db, `artifacts/${appId}/users/${user.uid}/journalEntries`), {
                content: newEntry,
                timestamp: new Date(),
            });
            setNewEntry('');
        } catch (error) {
            console.error("Error saving journal entry:", error);
        } finally {
            setIsSaving(false);
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
                    placeholder="What's on your mind?"
                    className="w-full h-32 p-3 bg-slate-100 dark:bg-slate-700 rounded-md focus:outline-none focus:ring-2 focus:ring-cyan-500"
                />
                <div className="text-right mt-2">
                    <button onClick={handleSaveEntry} disabled={isSaving || !newEntry.trim()} className="py-2 px-5 rounded-lg bg-cyan-500 text-white font-semibold hover:bg-cyan-600 disabled:bg-cyan-300">
                        {isSaving ? 'Saving...' : 'Save Entry'}
                    </button>
                </div>
            </div>

            <div className="mt-8 flex-1 overflow-y-auto">
                <h2 className="text-xl font-bold mb-4">Past Entries</h2>
                <div className="space-y-4">
                    {entries.length > 0 ? entries.map(entry => (
                        <div key={entry.id} className="bg-white dark:bg-slate-800 p-4 rounded-lg shadow-sm">
                            <p className="text-xs text-slate-400 dark:text-slate-500 mb-2">{entry.timestamp.toLocaleString()}</p>
                            <p className="whitespace-pre-wrap">{entry.content}</p>
                        </div>
                    )) : (
                        <p className="text-center text-slate-500 dark:text-slate-400 pt-8">Your journal is empty. Write your first entry above.</p>
                    )}
                </div>
            </div>
        </div>
    );
}

function ChatbotScreen({ user }) {
    const [messages, setMessages] = useState([{ text: "Hello! I'm your AI Helper from EaseHaven. How can I support you today?", sender: 'bot' }]);
    const [input, setInput] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const messagesEndRef = useRef(null);

    const scrollToBottom = () => {
        messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    };

    useEffect(scrollToBottom, [messages]);

    const handleSend = async () => {
        if (input.trim() === '') return;

        const userMessage = { text: input, sender: 'user' };
        setMessages(prev => [...prev, userMessage]);
        setInput('');
        setIsLoading(true);

        try {
            // This is where you call the Gemini API
            const chatHistory = messages.map(msg => ({
                role: msg.sender === 'bot' ? 'model' : 'user',
                parts: [{ text: msg.text }]
            }));
            
            // Add a system instruction to guide the model's persona
            const systemInstruction = {
                role: "system",
                parts: [{ text: "You are a caring and empathetic AI assistant for a mental wellness app called EaseHaven. Your goal is to provide supportive, helpful, and safe conversations. You are based on CBT principles but you are not a licensed therapist. Always include a disclaimer that you are not a substitute for professional help if the user discusses serious mental health issues. Keep responses concise and encouraging." }]
            };

            const payload = { contents: [systemInstruction, ...chatHistory, { role: "user", parts: [{ text: input }] }] };
            const apiKey = ""; // Leave empty, will be handled by the environment
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
            
            let botResponse = "I'm having a little trouble connecting right now. Please try again in a moment.";
            if (result.candidates && result.candidates.length > 0 && result.candidates[0].content && result.candidates[0].content.parts && result.candidates[0].content.parts.length > 0) {
                botResponse = result.candidates[0].content.parts[0].text;
            }
            
            setMessages(prev => [...prev, { text: botResponse, sender: 'bot' }]);

        } catch (error) {
            console.error("Error calling Gemini API:", error);
            setMessages(prev => [...prev, { text: "My apologies, I couldn't process that. Could you try rephrasing?", sender: 'bot' }]);
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className="h-full flex flex-col bg-white dark:bg-slate-800 rounded-xl shadow-md animate-fade-in">
            <div className="p-4 border-b dark:border-slate-700">
                <h1 className="text-xl font-bold flex items-center gap-2">
                    <Bot className="text-cyan-500" />
                    AI Helper
                </h1>
            </div>
            <div className="flex-1 p-4 overflow-y-auto">
                <div className="space-y-4">
                    {messages.map((msg, index) => (
                        <div key={index} className={`flex items-end gap-2 ${msg.sender === 'user' ? 'justify-end' : 'justify-start'}`}>
                            {msg.sender === 'bot' && <div className="w-8 h-8 rounded-full bg-cyan-500 flex items-center justify-center text-white flex-shrink-0"><Bot size={20} /></div>}
                            <div className={`max-w-xs md:max-w-md lg:max-w-lg px-4 py-2 rounded-2xl ${msg.sender === 'user' ? 'bg-blue-500 text-white rounded-br-none' : 'bg-slate-200 dark:bg-slate-700 rounded-bl-none'}`}>
                                <p>{msg.text}</p>
                            </div>
                        </div>
                    ))}
                    {isLoading && (
                        <div className="flex items-end gap-2 justify-start">
                             <div className="w-8 h-8 rounded-full bg-cyan-500 flex items-center justify-center text-white flex-shrink-0"><Bot size={20} /></div>
                             <div className="px-4 py-3 rounded-2xl bg-slate-200 dark:bg-slate-700 rounded-bl-none">
                                <div className="flex items-center gap-1">
                                    <span className="w-2 h-2 bg-slate-400 rounded-full animate-bounce"></span>
                                    <span className="w-2 h-2 bg-slate-400 rounded-full animate-bounce delay-75"></span>
                                    <span className="w-2 h-2 bg-slate-400 rounded-full animate-bounce delay-150"></span>
                                </div>
                            </div>
                        </div>
                    )}
                    <div ref={messagesEndRef} />
                </div>
            </div>
            <div className="p-4 border-t dark:border-slate-700">
                <div className="flex items-center gap-2 bg-slate-100 dark:bg-slate-700 rounded-lg p-1">
                    <input
                        type="text"
                        value={input}
                        onChange={(e) => setInput(e.target.value)}
                        onKeyPress={(e) => e.key === 'Enter' && !isLoading && handleSend()}
                        placeholder="Type your message..."
                        className="w-full bg-transparent p-2 focus:outline-none"
                        disabled={isLoading}
                    />
                    <button onClick={handleSend} disabled={isLoading || !input.trim()} className="p-2 bg-cyan-500 text-white rounded-md disabled:bg-cyan-300 disabled:cursor-not-allowed hover:bg-cyan-600 transition-colors">
                        <ArrowRight size={20} />
                    </button>
                </div>
            </div>
        </div>
    );
}

function MeditateScreen() {
    const meditations = [
        { title: '5-Minute Mindful Breathing', duration: '5 min', type: 'Breathing', description: 'Center yourself with this short, guided breathing exercise.' },
        { title: '10-Minute Body Scan', duration: '10 min', type: 'Body Scan', description: 'Release tension from head to toe by bringing awareness to your body.' },
        { title: 'Gratitude Meditation', duration: '7 min', type: 'Mindfulness', description: 'Cultivate a sense of gratitude and positivity.' },
        { title: 'Stress Relief Visualization', duration: '12 min', type: 'Visualization', description: 'Imagine a peaceful place and let your stress melt away.' },
    ];

    return (
        <div className="animate-fade-in">
            <h1 className="text-3xl font-bold">Guided Meditations</h1>
            <p className="text-slate-500 dark:text-slate-400 mt-1">Find a moment of peace and calm.</p>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mt-8">
                {meditations.map((med, index) => (
                    <div key={index} className="bg-white dark:bg-slate-800 rounded-xl shadow-md p-6 flex flex-col justify-between hover:shadow-lg hover:-translate-y-1 transition-all duration-300">
                        <div>
                            <span className="text-xs font-semibold bg-cyan-100 text-cyan-800 dark:bg-cyan-900 dark:text-cyan-200 py-1 px-2 rounded-full">{med.type}</span>
                            <h2 className="text-xl font-bold mt-3">{med.title}</h2>
                            <p className="text-slate-500 dark:text-slate-400 mt-2 text-sm">{med.description}</p>
                        </div>
                        <div className="flex items-center justify-between mt-4">
                            <p className="text-sm font-medium">{med.duration}</p>
                            <button className="bg-cyan-500 text-white font-bold py-2 px-4 rounded-lg text-sm hover:bg-cyan-600">
                                Begin
                            </button>
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
}
