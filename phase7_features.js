/**
 * Habesha Date (ሀበሻ ቀጠሮ ❤️) — Phase 7 & Phase 8 Unified Frontend Engine
 * Fixes the `wingmanHeader` ReferenceError, declutters Discover into a sleek "✨ Lounge" drawer,
 * and activates all 10 Phase 7 + 10 Phase 8 upgrades in one file!
 */

(function () {
    "use strict";

    window.__PHASE7_LOADED__ = true;
    window.__PHASE8_LOADED__ = true;

    const getApiBase = () =>
        typeof BACKEND_URL !== "undefined"
            ? BACKEND_URL
            : typeof API_URL !== "undefined"
            ? API_URL
            : "https://habesha-backend-xhc5.onrender.com";

    const getUid = () =>
        typeof cleanTelegramId !== "undefined" && cleanTelegramId
            ? cleanTelegramId
            : typeof currentUserId !== "undefined" && currentUserId
            ? currentUserId
            : "guest";

    const getHeaders = (isJson = true) => {
        if (typeof getAuthHeaders === "function") return getAuthHeaders(isJson);
        return isJson ? { "Content-Type": "application/json" } : {};
    };

    const P7_CACHE = {};
    let voiceLiveRecorder = null;
    let voiceLiveChunks = [];
    let isRecordingLiveness = false;
    let deferredPwaPrompt = null;
    let lastSparkShownId = "";
    let dataSaverActive = localStorage.getItem("habesha_data_saver") === "1";

    // Auto-detect slow 2G/3G Ethio Telecom data to save megabytes automatically
    try {
        const conn = navigator.connection || navigator.mozConnection || navigator.webkitConnection;
        if (conn && (conn.saveData || ["slow-2g", "2g", "3g"].includes(conn.effectiveType))) {
            dataSaverActive = true;
        }
    } catch (e) {}

    const PILLAR_LABELS = {
        relocation: "🌍 Living Plan",
        timeline: "⏳ Marriage Timeline",
        faith_practice: "🙏 Faith Practice",
        household_role: "🏡 Family Style",
        kids_plan: "👶 Kids Plan",
        finances: "💼 Financial Style"
    };

    function setupProgressiveWebApp() {
        try {
            const head = document.head;
            const addMeta = (name, content) => {
                if (!document.querySelector(`meta[name="${name}"]`)) {
                    const m = document.createElement("meta");
                    m.name = name;
                    m.content = content;
                    head.appendChild(m);
                }
            };
            addMeta("apple-mobile-web-app-capable", "yes");
            addMeta("apple-mobile-web-app-status-bar-style", "black-translucent");
            addMeta("apple-mobile-web-app-title", "Habesha Date");
            addMeta("theme-color", "#FF7A1A");

            const manifestObj = {
                name: "Habesha Date (ሀበሻ ቀጠሮ ❤️)",
                short_name: "Habesha Date",
                start_url: "./",
                display: "standalone",
                background_color: "#FCF9F6",
                theme_color: "#FF7A1A",
                icons: [
                    {
                        src: "https://cdn-icons-png.flaticon.com/512/2589/2589175.png",
                        sizes: "512x512",
                        type: "image/png"
                    }
                ]
            };
            const blob = new Blob([JSON.stringify(manifestObj)], { type: "application/manifest+json" });
            const link = document.createElement("link");
            link.rel = "manifest";
            link.href = URL.createObjectURL(blob);
            head.appendChild(link);

            if ("serviceWorker" in navigator && window.location.protocol.startsWith("http")) {
                navigator.serviceWorker.register("./sw.js").catch(() => {});
            }

            window.addEventListener("beforeinstallprompt", (e) => {
                e.preventDefault();
                deferredPwaPrompt = e;
            });
        } catch (err) {}
    }

    window.installHabeshaPWA = async function () {
        if (deferredPwaPrompt) {
            deferredPwaPrompt.prompt();
            await deferredPwaPrompt.userChoice;
            deferredPwaPrompt = null;
            return;
        }
        const isIOS = /iphone|ipad|ipod/i.test(navigator.userAgent);
        if (isIOS) {
            showAlert("📱 Install on iPhone:\n\n1. Tap Safari's Share icon (⬆️) at the bottom.\n2. Scroll down and tap 'Add to Home Screen'!");
        } else {
            showAlert("📱 Tap your browser menu (⋮) -> 'Install App' or 'Add to Home Screen' for 1-tap full-screen access!");
        }
    };

    function injectModalsAndUnifiedBar() {
        if (document.getElementById("p7-modals-root")) return;

        // Hide ALL extra upper rows on Discover so only the sleek top header + Stories Bar remain!
        const oldRow = document.getElementById("btn-top-buna")?.parentElement;
        if (oldRow) oldRow.classList.add("hidden");
        const oldModeRow = document.getElementById("mode-pill-all")?.parentElement;
        if (oldModeRow) oldModeRow.classList.add("hidden");
        const existingQuickbar = document.getElementById("p7-discover-quickbar");
        if (existingQuickbar) existingQuickbar.remove();

        const root = document.createElement("div");
        root.id = "p7-modals-root";
        root.innerHTML = `
            <!-- Mutual Online Spark Banner -->
            <div id="p7-mutual-spark-banner" class="hidden fixed top-3 left-1/2 -translate-x-1/2 z-[232] w-[92%] max-w-sm bg-gradient-to-r from-emerald-600 via-teal-600 to-emerald-500 text-white px-4 py-2.5 rounded-full shadow-2xl border border-white/30 items-center justify-between gap-2 cursor-pointer modal-pop">
                <div onclick="openSparkMatchChat()" class="flex items-center gap-2 min-w-0 flex-1">
                    <span class="w-2.5 h-2.5 rounded-full bg-lime-300 animate-ping shrink-0"></span>
                    <span id="p7-spark-text" class="text-xs font-extrabold truncate">🟢 Match is online right now!</span>
                </div>
                <button onclick="document.getElementById('p7-mutual-spark-banner').classList.add('hidden')" class="text-white/80 text-xs font-bold px-1">✕</button>
            </div>

            <!-- SLEEK "✨ HABESHA LOUNGE" UNIFIED DRAWER (Holds Modes + All Upper Row Features!) -->
            <div id="p8-lounge-modal" class="hidden fixed inset-0 z-[212] flex items-end sm:items-center justify-center bg-black/65 backdrop-blur-sm px-0 sm:px-4">
                <div class="bg-white rounded-t-[2rem] sm:rounded-[2rem] p-5 w-full max-w-sm shadow-2xl relative overflow-hidden modal-pop max-h-[88vh] touch-scroll no-scrollbar">
                    <div class="tibeb-ribbon h-1.5 w-full absolute top-0 left-0"></div>
                    <div class="flex items-center justify-between mb-3 pt-1">
                        <div>
                            <h3 class="text-lg font-extrabold text-buna">✨ Habesha Lounge & Modes</h3>
                            <p class="text-[11px] text-gray-500">Switch discovery modes, play live mixers & explore perks</p>
                        </div>
                        <button onclick="document.getElementById('p8-lounge-modal').classList.add('hidden')" class="w-8 h-8 bg-gray-100 rounded-full flex items-center justify-center text-gray-500"><i class="ph-bold ph-x"></i></button>
                    </div>

                    <!-- Discovery Mode Switcher Inside Lounge -->
                    <div class="bg-orange-50/70 border border-orange-200/80 p-2.5 rounded-2xl mb-3 text-left">
                        <p class="text-[10px] font-extrabold text-botOrange uppercase tracking-wider mb-1.5">🎯 Discovery Mode</p>
                        <div class="flex items-center gap-1.5 text-[11px] font-extrabold">
                            <button id="lounge-mode-pill-all" onclick="closeLoungeAndRun(() => switchDiscoveryMode('all'))" class="flex-1 py-1.5 rounded-xl bg-gradient-to-r from-botOrange to-habeshaCoral text-white shadow-sm transition">✨ All</button>
                            <button id="lounge-mode-pill-tidar" onclick="closeLoungeAndRun(() => switchDiscoveryMode('tidar'))" class="flex-1 py-1.5 rounded-xl bg-white text-gray-600 border border-gray-200 hover:text-buna transition">💍 Tidar</button>
                            <button id="lounge-mode-pill-dating" onclick="closeLoungeAndRun(() => switchDiscoveryMode('dating'))" class="flex-1 py-1.5 rounded-xl bg-white text-gray-600 border border-gray-200 hover:text-buna transition">❤️ Dating</button>
                            <button id="lounge-mode-pill-circle" onclick="closeLoungeAndRun(() => switchDiscoveryMode('circle'))" class="flex-1 py-1.5 rounded-xl bg-white text-gray-600 border border-gray-200 hover:text-buna transition">🤝 Circle</button>
                        </div>
                    </div>

                    <div class="grid grid-cols-2 gap-2 text-left mb-3">
                        <button onclick="closeLoungeAndRun(openDailyCuratedModal)" class="p-3 rounded-2xl bg-gradient-to-br from-rose-50 to-orange-50 border border-rose-200 flex items-center gap-2.5 active:scale-95">
                            <span class="text-2xl">💌</span>
                            <div><p class="text-xs font-extrabold text-buna">Tonight's Top 3</p><p class="text-[10px] text-habeshaCoral font-bold">8 PM Curated Picks</p></div>
                        </button>
                        <button onclick="closeLoungeAndRun(openVoiceSparksModal)" class="p-3 rounded-2xl bg-gradient-to-br from-purple-50 to-indigo-50 border border-purple-200 flex items-center gap-2.5 active:scale-95">
                            <span class="text-2xl">🎙️</span>
                            <div><p class="text-xs font-extrabold text-buna">Voice Sparks</p><p class="text-[10px] text-premium font-bold">Blind Audio Feed</p></div>
                        </button>
                        <button onclick="closeLoungeAndRun(openBunaPollModal)" class="p-3 rounded-2xl bg-amber-50/80 border border-amber-200 flex items-center gap-2.5 active:scale-95">
                            <span class="text-2xl">☕</span>
                            <div><p class="text-xs font-extrabold text-buna">Daily Buna Poll</p><p class="text-[10px] text-amber-800 font-bold">Match Same Vibe</p></div>
                        </button>
                        <button onclick="closeLoungeAndRun(openBunaMixerModal)" class="p-3 rounded-2xl bg-emerald-50/80 border border-emerald-200 flex items-center gap-2.5 active:scale-95">
                            <span class="text-2xl">⏰</span>
                            <div><p class="text-xs font-extrabold text-buna">Speed Mixer</p><p class="text-[10px] text-emerald-700 font-bold">3-Min Blind Chat</p></div>
                        </button>
                        <button onclick="closeLoungeAndRun(openSpinWheelModal)" class="p-3 rounded-2xl bg-orange-50/80 border border-orange-200 flex items-center gap-2.5 active:scale-95">
                            <span class="text-2xl">🎡</span>
                            <div><p class="text-xs font-extrabold text-buna">Daily Spin</p><p class="text-[10px] text-botOrange font-bold">Win Free Likes/Rose</p></div>
                        </button>
                        <button onclick="closeLoungeAndRun(openVoiceLivenessModal)" class="p-3 rounded-2xl bg-cyan-50/80 border border-cyan-200 flex items-center gap-2.5 active:scale-95">
                            <span class="text-2xl">💎</span>
                            <div><p class="text-xs font-extrabold text-buna">Diamond Scan</p><p class="text-[10px] text-cyan-700 font-bold">100% Voice Trust</p></div>
                        </button>
                        <button onclick="closeLoungeAndRun(() => document.getElementById('p7-passport-modal').classList.remove('hidden'))" class="p-3 rounded-2xl bg-sky-50/80 border border-sky-200 flex items-center gap-2.5 active:scale-95">
                            <span class="text-2xl">✈️</span>
                            <div><p class="text-xs font-extrabold text-buna">VIP Passport</p><p class="text-[10px] text-sky-700 font-bold">~km GPS & Teleport</p></div>
                        </button>
                        <button onclick="closeLoungeAndRun(openSafeGuardianModal)" class="p-3 rounded-2xl bg-teal-50/80 border border-teal-200 flex items-center gap-2.5 active:scale-95">
                            <span class="text-2xl">🛡️</span>
                            <div><p class="text-xs font-extrabold text-buna">Date Guardian</p><p class="text-[10px] text-teal-800 font-bold">Check-In & SOS</p></div>
                        </button>
                    </div>

                    <div class="space-y-2">
                        <button onclick="closeLoungeAndRun(openSuccessStoriesModal)" class="w-full p-3 rounded-2xl bg-gradient-to-r from-amber-50 via-rose-50 to-orange-50 border border-amber-200 flex items-center justify-between text-left active:scale-98">
                            <div class="flex items-center gap-2.5">
                                <span class="text-xl">💍</span>
                                <div>
                                    <p class="text-xs font-extrabold text-buna">Habesha Couples Wall & Partner Cafés</p>
                                    <p class="text-[10px] text-gray-600">Real couples who met here + 10% off safe Addis date spots!</p>
                                </div>
                            </div>
                            <i class="ph-bold ph-caret-right text-botOrange"></i>
                        </button>

                        <div class="flex items-center justify-between p-2.5 rounded-2xl bg-gray-50 border border-gray-200 text-xs">
                            <span class="font-extrabold text-buna flex items-center gap-1.5">⚡ 4G Data-Saver Mode (Lite)</span>
                            <button id="p8-btn-datasaver" onclick="toggleDataSaverMode()" class="px-3 py-1 rounded-full font-extrabold text-[11px] bg-gray-200 text-gray-700">OFF</button>
                        </div>
                    </div>
                </div>
            </div>

            <!-- Recommendation #9: Tonight's Top 3 Curated Picks Modal -->
            <div id="p8-curated-modal" class="hidden fixed inset-0 z-[215] flex items-center justify-center bg-black/75 backdrop-blur-md px-4">
                <div class="bg-white rounded-[2rem] p-5 w-full max-w-sm shadow-2xl relative overflow-hidden border border-rose-200 modal-pop max-h-[88vh] flex flex-col">
                    <div class="tibeb-ribbon h-1.5 w-full absolute top-0 left-0"></div>
                    <button onclick="document.getElementById('p8-curated-modal').classList.add('hidden')" class="absolute top-4 right-4 w-8 h-8 bg-gray-100 rounded-full flex items-center justify-center text-gray-500"><i class="ph-bold ph-x"></i></button>
                    <div class="inline-flex items-center gap-1 px-3 py-1 rounded-full bg-rose-50 border border-rose-200 text-habeshaCoral text-[10px] font-extrabold uppercase mb-1 w-fit">
                        💌 Daily 8:00 PM Concierge
                    </div>
                    <h3 class="text-xl font-extrabold text-buna mb-0.5">Tonight's Top 3 Picks For You</h3>
                    <p class="text-xs text-gray-500 mb-3">Hand-picked daily based on your city, faith, and relationship goal!</p>
                    <div id="p8-curated-list" class="flex-1 min-h-0 touch-scroll space-y-2.5 pr-0.5"></div>
                </div>
            </div>

            <!-- Recommendation #15: Blind Voice Sparks Audio-First Feed Modal -->
            <div id="p8-voice-sparks-modal" class="hidden fixed inset-0 z-[215] flex items-center justify-center bg-black/75 backdrop-blur-md px-4">
                <div class="bg-white rounded-[2rem] p-5 w-full max-w-sm shadow-2xl relative overflow-hidden border border-purple-200 modal-pop max-h-[88vh] flex flex-col">
                    <div class="tibeb-ribbon h-1.5 w-full absolute top-0 left-0"></div>
                    <button onclick="document.getElementById('p8-voice-sparks-modal').classList.add('hidden')" class="absolute top-4 right-4 w-8 h-8 bg-gray-100 rounded-full flex items-center justify-center text-gray-500"><i class="ph-bold ph-x"></i></button>
                    <div class="inline-flex items-center gap-1 px-3 py-1 rounded-full bg-purple-50 border border-purple-200 text-premium text-[10px] font-extrabold uppercase mb-1 w-fit">
                        🎙️ Blind Voice Sparks
                    </div>
                    <h3 class="text-xl font-extrabold text-buna mb-0.5">Fall for a Voice First</h3>
                    <p class="text-xs text-gray-500 mb-3">Listen to 15-second voice greetings—photos stay frosted until you tap Reveal & Like!</p>
                    <div id="p8-voice-sparks-list" class="flex-1 min-h-0 touch-scroll space-y-2.5 pr-0.5"></div>
                </div>
            </div>

            <!-- Recommendations #17 & #18: Couples Success Stories Wall + Partner Café Deals Modal -->
            <div id="p8-stories-wall-modal" class="hidden fixed inset-0 z-[215] flex items-center justify-center bg-black/75 backdrop-blur-md px-4">
                <div class="bg-white rounded-[2rem] p-5 w-full max-w-sm shadow-2xl relative overflow-hidden border border-amber-200 modal-pop max-h-[90vh] flex flex-col">
                    <div class="tibeb-ribbon h-1.5 w-full absolute top-0 left-0"></div>
                    <button onclick="document.getElementById('p8-stories-wall-modal').classList.add('hidden')" class="absolute top-4 right-4 w-8 h-8 bg-gray-100 rounded-full flex items-center justify-center text-gray-500"><i class="ph-bold ph-x"></i></button>
                    <h3 class="text-lg font-extrabold text-buna mb-1">💍 Couples Wall & Partner Cafés</h3>
                    <div class="grid grid-cols-2 bg-gray-100 p-1 rounded-xl mb-3 text-xs font-extrabold">
                        <button id="p8-tab-couples" onclick="switchStoriesWallTab('couples')" class="py-1.5 rounded-lg bg-white text-buna shadow-sm">❤️ Met Here</button>
                        <button id="p8-tab-cafes" onclick="switchStoriesWallTab('cafes')" class="py-1.5 rounded-lg text-gray-500">☕ Safe Date Spots</button>
                    </div>
                    <div id="p8-panel-couples" class="flex-1 min-h-0 touch-scroll space-y-2.5 pr-0.5">
                        <div id="p8-couples-list" class="space-y-2.5"></div>
                        <div class="p-3 bg-orange-50/80 border border-orange-200 rounded-2xl space-y-2 mt-3 text-left">
                            <p class="text-xs font-extrabold text-buna">💍 Met someone special on Habesha Date?</p>
                            <input id="p8-story-names" type="text" placeholder="Your First Names (e.g. Abel & Hana)" class="w-full p-2 border border-orange-200 rounded-xl bg-white text-xs font-bold">
                            <textarea id="p8-story-text" placeholder="Share how you matched & win a 2-Person Buna Voucher!" class="w-full p-2 border border-orange-200 rounded-xl bg-white text-xs h-16 resize-none"></textarea>
                            <button onclick="submitCoupleStory()" class="w-full py-2.5 bg-gradient-to-r from-botOrange to-habeshaCoral text-white rounded-xl font-extrabold text-xs shadow">Share Our Story ❤️</button>
                        </div>
                    </div>
                    <div id="p8-panel-cafes" class="hidden flex-1 min-h-0 touch-scroll space-y-2.5 pr-0.5 text-left"></div>
                </div>
            </div>

            <!-- Recommendations #10, #11, #14: Cultural, Fasting, Polite Shield & Circle Modal -->
            <div id="p8-cultural-settings-modal" class="hidden fixed inset-0 z-[215] flex items-center justify-center bg-black/70 backdrop-blur-sm px-4">
                <div class="bg-white rounded-[2rem] p-6 w-full max-w-sm shadow-2xl relative overflow-hidden border border-orange-200 modal-pop">
                    <div class="tibeb-ribbon h-1.5 w-full absolute top-0 left-0"></div>
                    <button onclick="document.getElementById('p8-cultural-settings-modal').classList.add('hidden')" class="absolute top-4 right-4 w-8 h-8 bg-gray-100 rounded-full flex items-center justify-center text-gray-500"><i class="ph-bold ph-x"></i></button>
                    <div class="inline-flex items-center gap-1 px-3 py-1 rounded-full bg-orange-50 border border-orange-200 text-botOrange text-[10px] font-extrabold uppercase mb-1.5">
                        🕯️ Cultural, Circle & Inbox Shield
                    </div>
                    <h3 class="text-xl font-extrabold text-buna mb-1">Respectful & Cultural Preferences</h3>
                    <p class="text-xs text-gray-500 mb-4">Customize your inbox filter, campus/career circle, and fasting-friendly badge!</p>

                    <div class="space-y-3 text-left mb-4">
                        <label class="flex items-center justify-between p-3 bg-pink-50/80 border border-pink-200 rounded-2xl cursor-pointer">
                            <div class="pr-2">
                                <p class="text-xs font-extrabold text-buna">👑 Polite Inbox Shield</p>
                                <p class="text-[10px] text-gray-600">Blocks plain "Hi / Selam" first messages—matches must reply to your prompt or use AI Wingman!</p>
                            </div>
                            <input id="p8-chk-polite" type="checkbox" class="w-4 h-4 accent-habeshaCoral rounded shrink-0">
                        </label>

                        <label class="flex items-center justify-between p-3 bg-amber-50/80 border border-amber-200 rounded-2xl cursor-pointer">
                            <div class="pr-2">
                                <p class="text-xs font-extrabold text-buna">🕯️ Fasting-Friendly (*Tsome* / *Ramadan*)</p>
                                <p class="text-[10px] text-gray-600">Shows a respectful Fasting-Friendly badge & suggests Yetsom coffee/walk dates</p>
                            </div>
                            <input id="p8-chk-fasting" type="checkbox" class="w-4 h-4 accent-botOrange rounded shrink-0">
                        </label>

                        <div>
                            <label class="text-[11px] font-extrabold text-gray-500 uppercase block mb-1">🎓 Verified Campus or Professional Circle</label>
                            <select id="p8-sel-circle" class="w-full p-3 border border-gray-200 rounded-xl bg-gray-50 text-xs font-bold">
                                <option value="">No Circle Badge</option>
                                <option value="🎓 AAU (Addis Ababa Univ)">🎓 AAU (Addis Ababa Univ)</option>
                                <option value="🎓 ASTU / Science & Tech">🎓 ASTU / Science & Tech</option>
                                <option value="🎓 HiLCoE / St. Mary's / Unity">🎓 HiLCoE / St. Mary's / Unity</option>
                                <option value="🎓 Hawassa / Bahir Dar / Jimma Univ">🎓 Hawassa / Bahir Dar / Jimma Univ</option>
                                <option value="💻 Tech & Software Engineers">💻 Tech & Software Engineers</option>
                                <option value="🩺 Healthcare (Doctors & Nurses)">🩺 Healthcare (Doctors & Nurses)</option>
                                <option value="🏦 Banking, Finance & Business">🏦 Banking, Finance & Business</option>
                                <option value="✈️ Aviation / Ethiopian Airlines">✈️ Aviation / Ethiopian Airlines</option>
                                <option value="🎨 Creatives, Media & Founders">🎨 Creatives, Media & Founders</option>
                                <option value="🌍 Diaspora Professionals">🌍 Diaspora Professionals</option>
                            </select>
                        </div>
                    </div>

                    <button onclick="saveCulturalAndShieldSettings()" class="btn-shimmer w-full py-3.5 bg-gradient-to-r from-botOrange to-habeshaCoral text-white rounded-2xl font-extrabold text-xs shadow-lg">
                        Save Cultural & Shield Settings
                    </button>
                </div>
            </div>

            <!-- Phase 7 Existing Modals (Diamond Voice, Safe Guardian, 6-Pillar Tidar, 5s Vibe Video, Endorse/Treat, Passport) -->
            <div id="p7-voice-liveness-modal" class="hidden fixed inset-0 z-[215] flex items-center justify-center bg-black/75 backdrop-blur-md px-4">
                <div class="bg-white rounded-[2rem] p-6 w-full max-w-sm shadow-2xl text-center relative overflow-hidden border border-cyan-200 modal-pop">
                    <div class="tibeb-ribbon h-1.5 w-full absolute top-0 left-0"></div>
                    <button onclick="document.getElementById('p7-voice-liveness-modal').classList.add('hidden')" class="absolute top-4 right-4 w-8 h-8 bg-gray-100 rounded-full flex items-center justify-center text-gray-500"><i class="ph-bold ph-x"></i></button>
                    <div class="inline-flex items-center gap-1 px-3 py-1 rounded-full bg-cyan-50 border border-cyan-200 text-cyan-700 text-[10px] font-extrabold uppercase mb-2">
                        💎 TrustShield™ Level 4 • Acoustic AI
                    </div>
                    <h3 class="text-xl font-extrabold text-buna mb-1">Diamond Voice Verification</h3>
                    <p class="text-xs text-gray-500 mb-3">Read the live phrase & 2-digit code below aloud to earn your <b>💎 Diamond Badge & 100% Trust Score</b>!</p>
                    <div class="bg-gradient-to-br from-cyan-50 to-blue-50 border border-cyan-200 rounded-2xl p-4 mb-4">
                        <p id="p7-voice-phrase-am" class="text-sm font-extrabold text-buna mb-1">ዛሬ ጀበና ቡና አብረን እንጠጣ — ቁጥር --</p>
                        <p id="p7-voice-phrase-en" class="text-xs font-bold text-verify italic">Loading live security code...</p>
                    </div>
                    <p id="p7-voice-rec-status" class="text-[11px] font-bold text-gray-500 mb-3">Tap below, speak clearly for 4 seconds, then auto-verify!</p>
                    <button id="p7-btn-voice-rec" onclick="toggleVoiceLivenessRecord()" class="btn-shimmer w-full py-4 bg-gradient-to-r from-cyan-600 via-verify to-indigo-600 text-white rounded-2xl font-extrabold text-xs shadow-lg flex items-center justify-center gap-2 active:scale-95 transition">
                        <i class="ph-fill ph-microphone text-lg"></i> <span>🎙️ Start 4-Second Live Voice Scan</span>
                    </button>
                </div>
            </div>

            <div id="p7-safe-guardian-modal" class="hidden fixed inset-0 z-[215] flex items-center justify-center bg-black/75 backdrop-blur-md px-4">
                <div class="bg-white rounded-[2rem] p-6 w-full max-w-sm shadow-2xl text-center relative overflow-hidden border border-emerald-200 modal-pop">
                    <div class="tibeb-ribbon h-1.5 w-full absolute top-0 left-0"></div>
                    <button onclick="document.getElementById('p7-safe-guardian-modal').classList.add('hidden')" class="absolute top-4 right-4 w-8 h-8 bg-gray-100 rounded-full flex items-center justify-center text-gray-500"><i class="ph-bold ph-x"></i></button>
                    <div class="inline-flex items-center gap-1 px-3 py-1 rounded-full bg-emerald-50 border border-emerald-200 text-emerald-700 text-[10px] font-extrabold uppercase mb-2">
                        🛡️ Safe Date Guardian
                    </div>
                    <h3 class="text-xl font-extrabold text-buna mb-1">First-Date Safety Timer & SOS</h3>
                    <p class="text-xs text-gray-500 mb-3">Meeting for coffee? Set a check-in timer—if you don't tap <b>I'm Safe</b>, our bot checks on you & alerts your trusted contact!</p>
                    <div id="p7-guardian-inactive-box" class="space-y-2.5 text-left mb-3">
                        <input id="p7-guardian-venue" type="text" placeholder="Café / Public Spot (e.g. Tomoca Bole)" class="w-full p-3 border border-gray-200 rounded-xl bg-gray-50 text-xs font-semibold">
                        <input id="p7-guardian-contact" type="text" placeholder="Trusted Friend's Telegram ID (Optional)" class="w-full p-3 border border-gray-200 rounded-xl bg-gray-50 text-xs font-semibold">
                        <select id="p7-guardian-mins" class="w-full p-3 border border-gray-200 rounded-xl bg-gray-50 text-xs font-bold">
                            <option value="60">⏰ Check in on me in 60 Minutes</option>
                            <option value="90" selected>⏰ Check in on me in 90 Minutes</option>
                            <option value="120">⏰ Check in on me in 2 Hours</option>
                        </select>
                        <button onclick="startSafeDateGuardian()" class="btn-shimmer w-full py-3.5 bg-gradient-to-r from-emerald-600 to-teal-500 text-white rounded-2xl font-extrabold text-xs shadow-md text-center">
                            🛡️ Activate Safe Date Guardian
                        </button>
                    </div>
                    <div id="p7-guardian-active-box" class="hidden space-y-2.5 mb-3">
                        <div class="p-3.5 rounded-2xl bg-emerald-50 border border-emerald-200 text-xs text-emerald-900 font-bold">
                            🟢 Guardian Active! Due: <span id="p7-guardian-due-lbl">--</span>
                        </div>
                        <button onclick="confirmSafeDateCheckin()" class="w-full py-3.5 bg-emerald-600 text-white rounded-2xl font-extrabold text-xs shadow-md">
                            ✅ I'm Safe! End Check-In Timer
                        </button>
                    </div>
                    <button onclick="triggerEmergencySOS()" class="w-full py-3 bg-red-600 text-white rounded-2xl font-extrabold text-xs shadow-lg flex items-center justify-center gap-1.5 active:scale-95 transition">
                        <i class="ph-fill ph-warning-octagon text-base"></i> <span>🚨 1-Tap Instant Emergency SOS</span>
                    </button>
                </div>
            </div>

            <div id="p7-tidar-modal" class="hidden fixed inset-0 z-[215] flex items-center justify-center bg-black/70 backdrop-blur-sm px-4">
                <div class="bg-white rounded-[2rem] p-6 w-full max-w-sm shadow-2xl relative overflow-hidden border border-amber-200 modal-pop max-h-[90vh] touch-scroll no-scrollbar">
                    <div class="tibeb-ribbon h-1.5 w-full absolute top-0 left-0"></div>
                    <button onclick="document.getElementById('p7-tidar-modal').classList.add('hidden')" class="absolute top-4 right-4 w-8 h-8 bg-gray-100 rounded-full flex items-center justify-center text-gray-500"><i class="ph-bold ph-x"></i></button>
                    <div class="inline-flex items-center gap-1 px-3 py-1 rounded-full bg-amber-50 border border-amber-200 text-amber-800 text-[10px] font-extrabold uppercase mb-1.5">
                        💍 6-Pillar Tidar Blueprint
                    </div>
                    <h3 class="text-xl font-extrabold text-buna mb-1">Marriage Values Alignment</h3>
                    <p class="text-xs text-gray-500 mb-3.5">Show serious matches where you stand on the 6 pillars that matter most!</p>
                    <div class="space-y-2.5 text-left text-xs mb-4">
                        <select id="p7-td-relocation" class="w-full p-2.5 border border-gray-200 rounded-xl bg-gray-50 font-bold">
                            <option value="">🌍 Living / Relocation Plan</option>
                            <option value="Build Life in Ethiopia">🇪🇹 Build Life in Ethiopia</option>
                            <option value="Live Abroad / Open to Relocate">✈️ Live Abroad / Open to Relocate</option>
                            <option value="Return to Ethiopia Eventually">🏡 Return to Ethiopia Eventually</option>
                        </select>
                        <select id="p7-td-timeline" class="w-full p-2.5 border border-gray-200 rounded-xl bg-gray-50 font-bold">
                            <option value="">⏳ Marriage Timeline</option>
                            <option value="Ready Within 1 Year">💍 Ready Within 1 Year</option>
                            <option value="1 to 2 Years">❤️ 1 to 2 Years</option>
                            <option value="Get to Know Deeply First">☕ Get to Know Deeply First</option>
                        </select>
                        <select id="p7-td-faith" class="w-full p-2.5 border border-gray-200 rounded-xl bg-gray-50 font-bold">
                            <option value="">🙏 Religious Practice</option>
                            <option value="Very Observant & Fasting">🙏 Very Observant & Fasting</option>
                            <option value="Practicing & Balanced">✨ Practicing & Balanced</option>
                            <option value="Spiritual / Cultural">🌿 Spiritual / Cultural</option>
                        </select>
                        <select id="p7-td-household" class="w-full p-2.5 border border-gray-200 rounded-xl bg-gray-50 font-bold">
                            <option value="">🏡 Family & Household Style</option>
                            <option value="Traditional Habesha Roles">👑 Traditional Habesha Roles</option>
                            <option value="Modern 50/50 Teamwork">🤝 Modern 50/50 Teamwork</option>
                            <option value="Flexible & Supportive">💛 Flexible & Supportive</option>
                        </select>
                        <select id="p7-td-kids" class="w-full p-2.5 border border-gray-200 rounded-xl bg-gray-50 font-bold">
                            <option value="">👶 Children Plan</option>
                            <option value="Want Kids Soon">👶 Want Kids Soon</option>
                            <option value="Want Kids in a Few Years">🌟 Want Kids in a Few Years</option>
                            <option value="Open / Discuss Together">💬 Open / Discuss Together</option>
                        </select>
                        <select id="p7-td-finances" class="w-full p-2.5 border border-gray-200 rounded-xl bg-gray-50 font-bold">
                            <option value="">💼 Financial Mindset</option>
                            <option value="Save & Build Family Business">📈 Save & Build Together</option>
                            <option value="Dual Career Ambition">🚀 Dual Career Ambition</option>
                            <option value="Generous & Family-Centered">🎁 Generous & Family-Centered</option>
                        </select>
                    </div>
                    <button onclick="saveMyTidarBlueprint()" class="btn-shimmer w-full py-3.5 bg-gradient-to-r from-botOrange to-habeshaCoral text-white rounded-2xl font-extrabold text-xs shadow-lg">
                        💍 Save My 6-Pillar Tidar Card
                    </button>
                </div>
            </div>

            <div id="p7-vibe-video-modal" class="hidden fixed inset-0 z-[215] flex items-center justify-center bg-black/70 backdrop-blur-sm px-4">
                <div class="bg-white rounded-[2rem] p-6 w-full max-w-sm shadow-2xl text-center relative overflow-hidden border border-pink-200 modal-pop">
                    <div class="tibeb-ribbon h-1.5 w-full absolute top-0 left-0"></div>
                    <button onclick="document.getElementById('p7-vibe-video-modal').classList.add('hidden')" class="absolute top-4 right-4 w-8 h-8 bg-gray-100 rounded-full flex items-center justify-center text-gray-500"><i class="ph-bold ph-x"></i></button>
                    <div class="inline-flex items-center gap-1 px-3 py-1 rounded-full bg-pink-50 border border-pink-200 text-habeshaCoral text-[10px] font-extrabold uppercase mb-2">
                        🎬 5-Second Vibe Loop
                    </div>
                    <h3 class="text-xl font-extrabold text-buna mb-1">Add a Live Motion Loop</h3>
                    <p class="text-xs text-gray-500 mb-4">Upload or record a short 3–5 second smiling video clip (under 8MB) that loops smoothly on your Discover card!</p>
                    <input id="p7-vibe-video-input" type="file" accept="video/mp4,video/webm,video/quicktime" capture="user" class="hidden" onchange="handleVibeVideoUpload(event)">
                    <button id="p7-btn-upload-vibe" onclick="document.getElementById('p7-vibe-video-input').click()" class="btn-shimmer w-full py-4 bg-gradient-to-r from-habeshaCoral to-botOrange text-white rounded-2xl font-extrabold text-xs shadow-lg mb-2 flex items-center justify-center gap-2">
                        <i class="ph-fill ph-video-camera text-lg"></i> <span>Choose / Record 5s Vibe Video</span>
                    </button>
                    <button onclick="removeMyVibeVideo()" class="w-full py-2.5 bg-gray-100 text-gray-600 rounded-2xl font-bold text-xs">Remove Current Video</button>
                </div>
            </div>

            <div id="p7-endorse-treat-modal" class="hidden fixed inset-0 z-[215] flex items-center justify-center bg-black/70 backdrop-blur-sm px-4">
                <div class="bg-white rounded-[2rem] p-6 w-full max-w-sm shadow-2xl relative overflow-hidden border border-amber-200 modal-pop">
                    <div class="tibeb-ribbon h-1.5 w-full absolute top-0 left-0"></div>
                    <button onclick="document.getElementById('p7-endorse-treat-modal').classList.add('hidden')" class="absolute top-4 right-4 w-8 h-8 bg-gray-100 rounded-full flex items-center justify-center text-gray-500"><i class="ph-bold ph-x"></i></button>
                    <h3 class="text-lg font-extrabold text-buna mb-1">☕ Gift Buna Treat & Endorse</h3>
                    <p class="text-xs text-gray-500 mb-3">Make your match's day with a real coffee voucher or an anonymous kindness badge!</p>
                    <div class="bg-gradient-to-br from-amber-50 to-orange-50 border border-amber-200 rounded-2xl p-3.5 mb-3.5 text-left space-y-2">
                        <p class="text-xs font-extrabold text-amber-900">☕ Gift a Real Macchiato / Buna Voucher (50 ⭐)</p>
                        <select id="p7-treat-spot" class="w-full p-2 border border-amber-200 rounded-xl bg-white text-xs font-bold">
                            <option value="☕ Tomoca Coffee Macchiato Treat">☕ Tomoca Coffee Macchiato Treat</option>
                            <option value="🥂 Kaldi's Coffee Buna Treat">🥂 Kaldi's Coffee Buna Treat</option>
                            <option value="🍰 Café Cake & Jebena Buna Treat">🍰 Café Cake & Jebena Buna Treat</option>
                        </select>
                        <input id="p7-treat-note" type="text" maxlength="80" placeholder="Sweet note (e.g. Enjoy afternoon coffee on me! ❤️)" class="w-full p-2 border border-amber-200 rounded-xl bg-white text-xs">
                        <button onclick="sendRealBunaTreatGift()" class="btn-shimmer w-full py-3 bg-gradient-to-r from-amber-500 via-botOrange to-habeshaCoral text-white rounded-xl font-extrabold text-xs shadow-md flex items-center justify-between px-3.5">
                            <span>🎁 Send Real Buna Gift Card</span>
                            <span class="bg-white/25 px-2 py-0.5 rounded-full">50 ⭐</span>
                        </button>
                    </div>
                    <p class="text-[11px] font-extrabold text-gray-500 uppercase mb-2 text-left">🏅 Award Anonymous Reputation Badge (Free)</p>
                    <div class="grid grid-cols-2 gap-1.5 text-left">
                        <button onclick="awardEndorsement('conversationalist')" class="p-2.5 rounded-xl bg-orange-50 border border-orange-200 text-[11px] font-extrabold text-buna active:scale-95">☕ Great Chat</button>
                        <button onclick="awardEndorsement('respectful')" class="p-2.5 rounded-xl bg-emerald-50 border border-emerald-200 text-[11px] font-extrabold text-emerald-900 active:scale-95">🎩 Respectful</button>
                        <button onclick="awardEndorsement('humor')" class="p-2.5 rounded-xl bg-pink-50 border border-pink-200 text-[11px] font-extrabold text-pink-800 active:scale-95">😂 Great Humor</button>
                        <button onclick="awardEndorsement('genuine')" class="p-2.5 rounded-xl bg-purple-50 border border-purple-200 text-[11px] font-extrabold text-premium active:scale-95">💍 Genuine</button>
                    </div>
                </div>
            </div>

            <div id="p7-passport-modal" class="hidden fixed inset-0 z-[215] flex items-center justify-center bg-black/70 backdrop-blur-sm px-4">
                <div class="bg-white rounded-[2rem] p-6 w-full max-w-sm shadow-2xl text-center relative overflow-hidden border border-sky-200 modal-pop">
                    <div class="tibeb-ribbon h-1.5 w-full absolute top-0 left-0"></div>
                    <button onclick="document.getElementById('p7-passport-modal').classList.add('hidden')" class="absolute top-4 right-4 w-8 h-8 bg-gray-100 rounded-full flex items-center justify-center text-gray-500"><i class="ph-bold ph-x"></i></button>
                    <div class="inline-flex items-center gap-1 px-3 py-1 rounded-full bg-sky-50 border border-sky-200 text-sky-700 text-[10px] font-extrabold uppercase mb-2">
                        📍 Privacy Distance & VIP Passport
                    </div>
                    <h3 class="text-xl font-extrabold text-buna mb-1">Nearby ~km & Travel Passport</h3>
                    <p class="text-xs text-gray-500 mb-3.5">Exact location is <b>never</b> stored—only safe ~km distance buckets! VIPs can also teleport to any city before flying.</p>
                    <button onclick="enablePrivacyFuzzedGPS()" class="w-full py-3.5 bg-emerald-50 text-emerald-800 border border-emerald-200 rounded-2xl font-extrabold text-xs mb-4 flex items-center justify-center gap-1.5 active:scale-95">
                        <i class="ph-fill ph-navigation-arrow text-base"></i> <span>📍 Enable Safe Approximate Distance (~km)</span>
                    </button>
                    <div class="bg-purple-50/70 border border-purple-200 rounded-2xl p-3.5 text-left space-y-2.5">
                        <p class="text-xs font-extrabold text-premium flex items-center justify-between">
                            <span>✈️ VIP Passport Mode (Teleport)</span>
                            <span class="bg-white px-2 py-0.5 rounded-full text-[10px] border border-purple-200">VIP</span>
                        </p>
                        <select id="p7-passport-city" class="w-full p-2.5 border border-purple-200 rounded-xl bg-white text-xs font-bold">
                            <option value="">Disable Passport (Use Home City)</option>
                            <option value="Addis Ababa">🇪🇹 Land in Addis Ababa</option>
                            <option value="Hawassa">🌊 Land in Hawassa</option>
                            <option value="Bahir Dar">🌴 Land in Bahir Dar</option>
                            <option value="Adama">☀️ Land in Adama</option>
                            <option value="Mekelle">⛰️ Land in Mekelle</option>
                            <option value="Dire Dawa">🚂 Land in Dire Dawa</option>
                            <option value="Diaspora - USA (DC / DMV)">🇺🇸 Land in Washington DC / DMV</option>
                            <option value="Diaspora - UK (London)">🇬🇧 Land in London</option>
                            <option value="Diaspora - UAE (Dubai)">🇦🇪 Land in Dubai</option>
                            <option value="Diaspora - Canada">🇨🇦 Land in Toronto</option>
                        </select>
                        <button onclick="applyVipPassportCity()" class="btn-shimmer w-full py-3 bg-gradient-to-r from-premium to-pink-600 text-white rounded-xl font-extrabold text-xs shadow-md text-center">
                            ✈️ Teleport My Card Now
                        </button>
                    </div>
                </div>
            </div>
        `;
        document.body.appendChild(root);

        // Ensure `✨ Lounge` button is present right next to `Filter` in the top header even on older index.html builds
        const filterBtn = document.getElementById("filter-modal-btn");
        if (filterBtn && filterBtn.parentElement && !document.getElementById("top-lounge-btn")) {
            filterBtn.insertAdjacentHTML(
                "beforebegin",
                `<button id="top-lounge-btn" onclick="openHabeshaLoungeModal()" class="btn-shimmer bg-gradient-to-r from-botOrange to-habeshaCoral text-white text-[10px] font-extrabold px-2.5 py-1 rounded-full shadow-sm transition active:scale-95 flex items-center gap-1 whitespace-nowrap"><span>✨ Lounge</span></button>`
            );
        }

        // Inject Profile Suite Buttons
        const boostBtn = document.getElementById("btn-profile-boost");
        const fallbackProfileBox = document.querySelector("#view-profile .max-w-sm");
        if (!document.getElementById("p7-profile-suite") && (boostBtn || fallbackProfileBox)) {
            const suite = document.createElement("div");
            suite.id = "p7-profile-suite";
            suite.className = "w-full space-y-2.5";
            suite.innerHTML = `
                <button onclick="openCulturalAndShieldModal()" class="w-full bg-gradient-to-r from-rose-50 via-orange-50 to-amber-50 text-buna font-extrabold p-4 rounded-2xl flex items-center justify-between border border-orange-200 shadow-sm transition active:scale-95 text-sm">
                    <div class="flex items-center gap-3"><span class="text-xl">👑</span> <span>Polite Shield, Circle & Fasting Mode</span></div>
                    <span class="text-[10px] font-extrabold bg-white text-habeshaCoral px-2 py-0.5 rounded-full border border-rose-200">NEW</span>
                </button>
                <button onclick="openVoiceLivenessModal()" class="w-full bg-gradient-to-r from-cyan-50 to-sky-50 text-cyan-900 font-extrabold p-4 rounded-2xl flex items-center justify-between border border-cyan-200 shadow-sm transition active:scale-95 text-sm">
                    <div class="flex items-center gap-3"><span class="text-xl">💎</span> <span id="p7-diamond-btn-lbl">Acoustic Voice Liveness (Diamond)</span></div>
                    <span class="text-[10px] font-extrabold bg-white text-cyan-700 px-2 py-0.5 rounded-full border border-cyan-200">100% Trust</span>
                </button>
                <button onclick="openTidarBlueprintModal()" class="w-full bg-amber-50/80 text-amber-900 font-extrabold p-4 rounded-2xl flex items-center justify-between border border-amber-200 shadow-sm transition active:scale-95 text-sm">
                    <div class="flex items-center gap-3"><span class="text-xl">💍</span> <span>6-Pillar Tidar Marriage Blueprint</span></div>
                    <i class="ph-bold ph-caret-right"></i>
                </button>
                <button onclick="document.getElementById('p7-vibe-video-modal').classList.remove('hidden')" class="w-full bg-pink-50/80 text-habeshaCoral font-extrabold p-4 rounded-2xl flex items-center justify-between border border-pink-200 shadow-sm transition active:scale-95 text-sm">
                    <div class="flex items-center gap-3"><i class="ph-fill ph-video-camera text-xl"></i> <span>5-Second Vibe Video Loop</span></div>
                    <span class="text-[10px] font-extrabold bg-white text-habeshaCoral px-2 py-0.5 rounded-full border border-pink-200">LIVE</span>
                </button>
                <button onclick="openSuccessStoriesModal()" class="w-full bg-emerald-50/80 text-emerald-900 font-extrabold p-4 rounded-2xl flex items-center justify-between border border-emerald-200 shadow-sm transition active:scale-95 text-sm">
                    <div class="flex items-center gap-3"><span class="text-xl">❤️</span> <span>Habesha Couples Wall & Café Deals</span></div>
                    <i class="ph-bold ph-caret-right"></i>
                </button>
                <button id="p7-pwa-install-btn" onclick="installHabeshaPWA()" class="w-full bg-orange-50/90 text-buna font-extrabold p-4 rounded-2xl flex items-center justify-between border border-orange-200 shadow-sm transition active:scale-95 text-sm">
                    <div class="flex items-center gap-3"><i class="ph-fill ph-device-mobile-speaker text-xl text-botOrange"></i> <span>Add App to iPhone / Android Home</span></div>
                    <i class="ph-bold ph-download-simple text-botOrange"></i>
                </button>
            `;
            if (boostBtn && boostBtn.parentElement) boostBtn.parentElement.insertBefore(suite, boostBtn);
            else if (fallbackProfileBox) fallbackProfileBox.appendChild(suite);
        }

        // Fixed Bug: Properly declare both `bunaTrayFlex` AND `wingmanHeader`!
        const bunaTrayFlex = document.querySelector("#buna-gifts-tray .flex.gap-2") || document.querySelector("#buna-gifts-drawer .grid");
        if (bunaTrayFlex && !document.getElementById("p7-btn-real-treat")) {
            bunaTrayFlex.insertAdjacentHTML(
                "afterbegin",
                `<button id="p7-btn-real-treat" onclick="openEndorseAndTreatModal()" class="shrink-0 bg-gradient-to-r from-amber-500 to-botOrange text-white px-3 py-1.5 rounded-full text-xs font-extrabold shadow-sm active:scale-95">🎁 Gift Real Buna / Endorse</button>`
            );
        }

        const wingmanHeader = document.querySelector("#ai-wingman-tray > div:first-child") || document.querySelector("#ai-wingman-drawer > div:first-child");
        if (wingmanHeader && !document.getElementById("p7-btn-revive")) {
            wingmanHeader.insertAdjacentHTML(
                "beforeend",
                `<button id="p7-btn-revive" onclick="requestAiChatRevival()" class="ml-auto mr-2 px-2.5 py-0.5 rounded-full bg-amber-100 text-amber-900 text-[10px] font-extrabold active:scale-95">⚡ Buna Rescue</button>`
            );
        }

        syncDataSaverButtonUI();
    }

    window.openHabeshaLoungeModal = function () {
        if (typeof triggerHaptic === "function") triggerHaptic("light");
        syncDataSaverButtonUI();
        document.getElementById("p8-lounge-modal")?.classList.remove("hidden");
    };

    window.closeLoungeAndRun = function (fn) {
        document.getElementById("p8-lounge-modal")?.classList.add("hidden");
        if (typeof fn === "function") fn();
    };

    window.toggleDataSaverMode = function () {
        dataSaverActive = !dataSaverActive;
        localStorage.setItem("habesha_data_saver", dataSaverActive ? "1" : "0");
        syncDataSaverButtonUI();
        showAlert(
            dataSaverActive
                ? "⚡ 4G Data-Saver Mode ON! Auto-playing videos are paused to save your mobile data."
                : "✨ Data-Saver Mode OFF! High-definition loops enabled."
        );
    };

    function syncDataSaverButtonUI() {
        const btn = document.getElementById("p8-btn-datasaver");
        if (!btn) return;
        btn.innerText = dataSaverActive ? "ON ⚡" : "OFF";
        btn.className = dataSaverActive
            ? "px-3 py-1 rounded-full font-extrabold text-[11px] bg-emerald-600 text-white"
            : "px-3 py-1 rounded-full font-extrabold text-[11px] bg-gray-200 text-gray-700";
    }

    // --- PHASE 8 FEATURE FUNCTIONS ---

    window.openDailyCuratedModal = async function () {
        if (typeof isGuestMode !== "undefined" && isGuestMode) return openGuestSignupModal();
        document.getElementById("p8-curated-modal")?.classList.remove("hidden");
        const list = document.getElementById("p8-curated-list");
        if (!list) return;
        list.innerHTML = `<p class="text-xs text-gray-400 text-center py-6 animate-pulse">✨ Selecting tonight's top 3 compatibility matches...</p>`;
        try {
            const res = await fetch(`${getApiBase()}/api/phase8/daily-curated/${encodeURIComponent(getUid())}`);
            const data = await res.json();
            const picks = data.picks || [];
            if (!picks.length) {
                list.innerHTML = `<p class="text-xs text-gray-500 text-center py-6">Check back at 8:00 PM EAT for fresh curated picks!</p>`;
                return;
            }
            list.innerHTML = picks.map((p) => {
                const safeName = (p.name || "Habesha").replace(/'/g, "\\'");
                const reasons = (p.curated_reasons || []).join(" • ");
                return `
                    <div class="p-3 rounded-2xl bg-gradient-to-r from-orange-50/70 to-rose-50/70 border border-orange-200 flex items-center gap-3">
                        <div onclick="jumpFromViewsVault('${p.telegram_id}'); document.getElementById('p8-curated-modal').classList.add('hidden');" class="w-16 h-20 rounded-2xl bg-cover bg-center border-2 border-botOrange shrink-0 cursor-pointer" style="background-image:url('${p.photo_url || DEFAULT_AVATAR}')"></div>
                        <div class="flex-1 min-w-0 text-left">
                            <div class="flex items-center gap-1">
                                <h4 class="text-sm font-extrabold text-buna truncate">${p.name}, ${p.age || 24}</h4>
                                <span class="px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 text-[10px] font-extrabold">${p.curated_score || 92}%</span>
                            </div>
                            <p class="text-[10px] font-bold text-habeshaCoral truncate mt-0.5">${reasons}</p>
                            <p class="text-[11px] text-gray-600 line-clamp-1 mt-0.5">${p.icebreaker || p.bio || "Say Selam over Buna!"}</p>
                            <button onclick="document.getElementById('p8-curated-modal').classList.add('hidden'); jumpFromViewsVault('${p.telegram_id}');" class="mt-1.5 px-3 py-1 bg-gradient-to-r from-botOrange to-habeshaCoral text-white rounded-full text-[10px] font-extrabold shadow-sm active:scale-95">
                                💘 View Card & Say Selam
                            </button>
                        </div>
                    </div>
                `;
            }).join("");
        } catch (e) {
            list.innerHTML = `<p class="text-xs text-red-500 text-center py-4">Could not load curated picks.</p>`;
        }
    };

    window.openVoiceSparksModal = async function () {
        document.getElementById("p8-voice-sparks-modal")?.classList.remove("hidden");
        const list = document.getElementById("p8-voice-sparks-list");
        if (!list) return;
        list.innerHTML = `<p class="text-xs text-gray-400 text-center py-6 animate-pulse">🎙️ Tuning into 15-second Voice Sparks...</p>`;
        try {
            const res = await fetch(`${getApiBase()}/api/phase8/voice-sparks/${encodeURIComponent(getUid())}`);
            const data = await res.json();
            const sparks = data.sparks || [];
            if (!sparks.length) {
                list.innerHTML = `<p class="text-xs text-gray-500 text-center py-6">No Voice Bios recorded yet—record your 15s Voice Intro in Edit Profile to be featured #1 here!</p>`;
                return;
            }
            list.innerHTML = sparks.map((s) => `
                <div class="p-3 rounded-2xl bg-purple-50/60 border border-purple-200 flex items-center justify-between gap-2.5 text-left">
                    <div class="flex items-center gap-2.5 min-w-0">
                        <div class="w-12 h-12 rounded-2xl overflow-hidden border-2 border-premium shrink-0 relative">
                            <div class="w-full h-full bg-cover bg-center blur-modest" style="background-image:url('${s.photo_url || DEFAULT_AVATAR}')"></div>
                        </div>
                        <div class="min-w-0">
                            <p class="text-xs font-extrabold text-buna truncate">${s.age || 24} • 📍 ${s.location} ${s.religion ? "• " + s.religion : ""}</p>
                            <p class="text-[10px] text-gray-600 truncate italic">"${s.icebreaker}"</p>
                        </div>
                    </div>
                    <div class="flex items-center gap-1.5 shrink-0">
                        <button onclick="playProfileVoiceBio('${s.voice_bio_url}', event)" class="px-2.5 py-1.5 bg-premium text-white rounded-xl text-[10px] font-extrabold shadow active:scale-95">▶️ Listen</button>
                        <button onclick="document.getElementById('p8-voice-sparks-modal').classList.add('hidden'); jumpFromViewsVault('${s.telegram_id}');" class="px-2.5 py-1.5 bg-white text-habeshaCoral border border-rose-200 rounded-xl text-[10px] font-extrabold active:scale-95">❤️ Reveal</button>
                    </div>
                </div>
            `).join("");
        } catch (e) {
            list.innerHTML = `<p class="text-xs text-red-500 text-center py-4">Could not load Voice Sparks.</p>`;
        }
    };

    window.openSuccessStoriesModal = async function () {
        document.getElementById("p8-stories-wall-modal")?.classList.remove("hidden");
        try {
            const res = await fetch(`${getApiBase()}/api/phase8/success-stories`);
            const data = await res.json();
            const cList = document.getElementById("p8-couples-list");
            const cafesBox = document.getElementById("p8-panel-cafes");
            if (cList) {
                cList.innerHTML = (data.stories || []).map((st) => `
                    <div class="p-3.5 rounded-2xl bg-gradient-to-br from-rose-50/80 to-amber-50/80 border border-rose-200 text-left space-y-1">
                        <div class="flex items-center justify-between">
                            <span class="text-xs font-extrabold text-buna">${st.couple_names}</span>
                            <span class="text-[10px] font-bold text-habeshaCoral bg-white px-2 py-0.5 rounded-full border border-rose-100">📍 ${st.city}</span>
                        </div>
                        <p class="text-xs text-gray-700 leading-relaxed">"${st.story_text}"</p>
                    </div>
                `).join("");
            }
            if (cafesBox) {
                cafesBox.innerHTML = (data.partner_cafes || []).map((cf) => `
                    <div class="p-3.5 rounded-2xl bg-amber-50/80 border border-amber-200 space-y-1">
                        <div class="flex items-center justify-between">
                            <span class="text-xs font-extrabold text-buna">${cf.name}</span>
                            <span class="text-[10px] font-extrabold bg-emerald-100 text-emerald-800 px-2 py-0.5 rounded-full">Verified Safe</span>
                        </div>
                        <p class="text-[11px] text-amber-900 font-semibold">${cf.perk}</p>
                        ${cf.fasting_friendly ? `<span class="inline-block text-[10px] font-bold text-emerald-700">🕯️ Fasting-Friendly (Yetsom Menu Available)</span>` : ""}
                    </div>
                `).join("");
            }
        } catch (e) {}
    };

    window.switchStoriesWallTab = function (tab) {
        const isCouples = tab === "couples";
        document.getElementById("p8-panel-couples")?.classList.toggle("hidden", !isCouples);
        document.getElementById("p8-panel-cafes")?.classList.toggle("hidden", isCouples);
        document.getElementById("p8-tab-couples").className = isCouples ? "py-1.5 rounded-lg bg-white text-buna shadow-sm" : "py-1.5 rounded-lg text-gray-500";
        document.getElementById("p8-tab-cafes").className = !isCouples ? "py-1.5 rounded-lg bg-white text-buna shadow-sm" : "py-1.5 rounded-lg text-gray-500";
    };

    window.submitCoupleStory = async function () {
        const names = document.getElementById("p8-story-names")?.value.trim() || "";
        const text = document.getElementById("p8-story-text")?.value.trim() || "";
        if (!names || text.length < 12) return showAlert("Please enter your first names and a short story!");
        const res = await fetch(`${getApiBase()}/api/phase8/success-stories`, {
            method: "POST",
            headers: getHeaders(true),
            body: JSON.stringify({
                telegram_id: getUid(),
                couple_names: names,
                city: (window.myProfileData && window.myProfileData.location) || "Addis Ababa",
                story_text: text
            })
        });
        if (res.ok) {
            document.getElementById("p8-story-names").value = "";
            document.getElementById("p8-story-text").value = "";
            showAlert("💍 Congratulations! Your story is now live on the Habesha Couples Wall!");
            window.openSuccessStoriesModal();
        }
    };

    window.openCulturalAndShieldModal = function () {
        if (typeof isGuestMode !== "undefined" && isGuestMode) return openGuestSignupModal();
        const mine = P7_CACHE[getUid()] || {};
        const chkPolite = document.getElementById("p8-chk-polite");
        const chkFast = document.getElementById("p8-chk-fasting");
        const selCircle = document.getElementById("p8-sel-circle");
        if (chkPolite) chkPolite.checked = Boolean(mine.polite_inbox_shield);
        if (chkFast) chkFast.checked = Boolean(mine.fasting_friendly);
        if (selCircle) selCircle.value = mine.community_circle || "";
        document.getElementById("p8-cultural-settings-modal")?.classList.remove("hidden");
    };

    window.saveCulturalAndShieldSettings = async function () {
        const polite = Boolean(document.getElementById("p8-chk-polite")?.checked);
        const fasting = Boolean(document.getElementById("p8-chk-fasting")?.checked);
        const circle = document.getElementById("p8-sel-circle")?.value || "";
        const res = await fetch(`${getApiBase()}/api/phase8/settings`, {
            method: "POST",
            headers: getHeaders(true),
            body: JSON.stringify({
                telegram_id: getUid(),
                polite_inbox_shield: polite,
                fasting_friendly: fasting,
                community_circle: circle
            })
        });
        if (res.ok) {
            P7_CACHE[getUid()] = Object.assign(P7_CACHE[getUid()] || {}, {
                polite_inbox_shield: polite,
                fasting_friendly: fasting,
                community_circle: circle
            });
            document.getElementById("p8-cultural-settings-modal")?.classList.add("hidden");
            showAlert("✅ Cultural, Community Circle & Polite Inbox Shield settings saved!");
        }
    };

    // --- PHASE 7 UNICORN FUNCTIONS ---

    window.openVoiceLivenessModal = async function () {
        if (typeof isGuestMode !== "undefined" && isGuestMode) return openGuestSignupModal();
        document.getElementById("p7-voice-liveness-modal")?.classList.remove("hidden");
        try {
            const res = await fetch(`${getApiBase()}/api/voice-liveness/challenge/${encodeURIComponent(getUid())}`);
            const d = await res.json();
            document.getElementById("p7-voice-phrase-am").innerText = d.phrase_am;
            document.getElementById("p7-voice-phrase-en").innerText = `"${d.phrase_en}"`;
        } catch (e) {}
    };

    window.toggleVoiceLivenessRecord = async function () {
        const btn = document.getElementById("p7-btn-voice-rec");
        const stat = document.getElementById("p7-voice-rec-status");
        if (isRecordingLiveness && voiceLiveRecorder) {
            try { voiceLiveRecorder.stop(); } catch (e) {}
            isRecordingLiveness = false;
            return;
        }
        try {
            const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
            voiceLiveChunks = [];
            const mime =
                typeof MediaRecorder !== "undefined" && MediaRecorder.isTypeSupported && MediaRecorder.isTypeSupported("audio/mp4")
                    ? "audio/mp4"
                    : "audio/webm";
            voiceLiveRecorder = new MediaRecorder(stream, { mimeType: mime });
            voiceLiveRecorder.ondataavailable = (e) => {
                if (e.data && e.data.size > 0) voiceLiveChunks.push(e.data);
            };
            voiceLiveRecorder.onstop = async () => {
                stream.getTracks().forEach((t) => t.stop());
                const blob = new Blob(voiceLiveChunks, { type: mime });
                if (btn) {
                    btn.disabled = true;
                    btn.innerText = "🤖 Gemini Audio Verifying Phrase...";
                }
                try {
                    const fd = new FormData();
                    fd.append("file", blob, mime.includes("mp4") ? "live.m4a" : "live.webm");
                    fd.append("telegram_id", getUid());
                    const r = await fetch(`${getApiBase()}/api/voice-liveness/verify`, {
                        method: "POST",
                        headers: getHeaders(false),
                        body: fd
                    });
                    const d = await r.json();
                    if (!r.ok) throw new Error(d.detail || "Voice verification failed.");
                    P7_CACHE[getUid()] = Object.assign(P7_CACHE[getUid()] || {}, { is_diamond_verified: true });
                    document.getElementById("p7-voice-liveness-modal")?.classList.add("hidden");
                    showAlert("💎 CONGRATULATIONS!\n\nAcoustic Voice Liveness Verified! Your 100% Trust Score & Diamond Badge are now LIVE!");
                    if (typeof refreshProfileStats === "function") refreshProfileStats();
                } catch (err) {
                    showAlert(err.message);
                } finally {
                    if (btn) {
                        btn.disabled = false;
                        btn.innerHTML = `<i class="ph-fill ph-microphone text-lg"></i> <span>🎙️ Start 4-Second Live Voice Scan</span>`;
                    }
                }
            };
            voiceLiveRecorder.start();
            isRecordingLiveness = true;
            if (btn) btn.innerHTML = `<span class="animate-pulse">🔴 Speaking... Tap to Submit (Auto in 4.5s)</span>`;
            if (stat) stat.innerText = "🎙️ Read the phrase & 2-digit code clearly right now!";
            setTimeout(() => {
                if (isRecordingLiveness && voiceLiveRecorder?.state === "recording") {
                    voiceLiveRecorder.stop();
                    isRecordingLiveness = false;
                }
            }, 4600);
        } catch (err) {
            showAlert("🎙️ Please allow Microphone access to complete Acoustic Voice Verification.");
        }
    };

    window.openSafeGuardianModal = async function () {
        if (typeof isGuestMode !== "undefined" && isGuestMode) return openGuestSignupModal();
        document.getElementById("p7-safe-guardian-modal")?.classList.remove("hidden");
        try {
            const res = await fetch(`${getApiBase()}/api/safe-guardian/status/${encodeURIComponent(getUid())}`);
            const d = await res.json();
            document.getElementById("p7-guardian-inactive-box")?.classList.toggle("hidden", Boolean(d.active));
            document.getElementById("p7-guardian-active-box")?.classList.toggle("hidden", !d.active);
            if (d.active && d.session) {
                document.getElementById("p7-guardian-due-lbl").innerText = new Date(d.session.check_in_due).toLocaleTimeString([], {
                    hour: "2-digit",
                    minute: "2-digit"
                });
            }
        } catch (e) {}
    };

    window.startSafeDateGuardian = async function () {
        const venue = document.getElementById("p7-guardian-venue")?.value.trim() || "Public Coffee Spot";
        const trusted = document.getElementById("p7-guardian-contact")?.value.trim() || "";
        const mins = parseInt(document.getElementById("p7-guardian-mins")?.value || "90", 10);
        const partnerName = typeof activeChatId !== "undefined" && activeChatId ? document.getElementById("chat-header-name")?.innerText || "Match" : "";
        try {
            const res = await fetch(`${getApiBase()}/api/safe-guardian/start`, {
                method: "POST",
                headers: getHeaders(true),
                body: JSON.stringify({
                    telegram_id: getUid(),
                    partner_id: (typeof activeChatId !== "undefined" && activeChatId) || "",
                    partner_name: partnerName,
                    venue: venue,
                    trusted_contact: trusted,
                    minutes: mins
                })
            });
            if (res.ok) {
                document.getElementById("p7-safe-guardian-modal")?.classList.add("hidden");
                showAlert(`🛡️ Safe Date Guardian Active!\nWe'll send you a Telegram check-in in ${mins} minutes.`);
            }
        } catch (e) {}
    };

    window.confirmSafeDateCheckin = async function () {
        await fetch(`${getApiBase()}/api/safe-guardian/checkin`, {
            method: "POST",
            headers: getHeaders(true),
            body: JSON.stringify({ telegram_id: getUid() })
        });
        document.getElementById("p7-safe-guardian-modal")?.classList.add("hidden");
        showAlert("✅ Glad you're safe! Check-in timer closed.");
    };

    window.triggerEmergencySOS = async function () {
        const res = await fetch(`${getApiBase()}/api/safe-guardian/sos`, {
            method: "POST",
            headers: getHeaders(true),
            body: JSON.stringify({ telegram_id: getUid(), note: "1-Tap SOS from app" })
        });
        if (res.ok) {
            document.getElementById("p7-safe-guardian-modal")?.classList.add("hidden");
            showAlert("🚨 SOS Alert Dispatched!\nOur Safety Team & your Trusted Contact have been alerted immediately.");
        }
    };

    window.openTidarBlueprintModal = function () {
        if (typeof isGuestMode !== "undefined" && isGuestMode) return openGuestSignupModal();
        const mine = (P7_CACHE[getUid()] && P7_CACHE[getUid()].tidar_blueprint) || {};
        if (mine.relocation) document.getElementById("p7-td-relocation").value = mine.relocation;
        if (mine.timeline) document.getElementById("p7-td-timeline").value = mine.timeline;
        if (mine.faith_practice) document.getElementById("p7-td-faith").value = mine.faith_practice;
        if (mine.household_role) document.getElementById("p7-td-household").value = mine.household_role;
        if (mine.kids_plan) document.getElementById("p7-td-kids").value = mine.kids_plan;
        if (mine.finances) document.getElementById("p7-td-finances").value = mine.finances;
        document.getElementById("p7-tidar-modal")?.classList.remove("hidden");
    };

    window.saveMyTidarBlueprint = async function () {
        const body = {
            telegram_id: getUid(),
            relocation: document.getElementById("p7-td-relocation")?.value || "",
            timeline: document.getElementById("p7-td-timeline")?.value || "",
            faith_practice: document.getElementById("p7-td-faith")?.value || "",
            household_role: document.getElementById("p7-td-household")?.value || "",
            kids_plan: document.getElementById("p7-td-kids")?.value || "",
            finances: document.getElementById("p7-td-finances")?.value || ""
        };
        const res = await fetch(`${getApiBase()}/api/tidar-blueprint/save`, {
            method: "POST",
            headers: getHeaders(true),
            body: JSON.stringify(body)
        });
        if (res.ok) {
            P7_CACHE[getUid()] = Object.assign(P7_CACHE[getUid()] || {}, { tidar_blueprint: body });
            document.getElementById("p7-tidar-modal")?.classList.add("hidden");
            showAlert("💍 Your 6-Pillar Tidar Marriage Blueprint is live on your profile!");
        }
    };

    window.handleVibeVideoUpload = async function (event) {
        const file = event.target.files[0];
        if (!file) return;
        const btn = document.getElementById("p7-btn-upload-vibe");
        if (btn) {
            btn.disabled = true;
            btn.innerText = "Uploading 5s Vibe Loop...";
        }
        try {
            const fd = new FormData();
            fd.append("file", file);
            fd.append("telegram_id", getUid());
            const res = await fetch(`${getApiBase()}/api/upload-vibe-video`, {
                method: "POST",
                headers: getHeaders(false),
                body: fd
            });
            const d = await res.json();
            if (!res.ok) throw new Error(d.detail || "Video upload failed.");
            P7_CACHE[getUid()] = Object.assign(P7_CACHE[getUid()] || {}, { vibe_video_url: d.vibe_video_url });
            document.getElementById("p7-vibe-video-modal")?.classList.add("hidden");
            showAlert("🎬 Your 5-Second Vibe Video Loop is now live on Discover!");
        } catch (err) {
            showAlert(err.message);
        } finally {
            if (btn) {
                btn.disabled = false;
                btn.innerHTML = `<i class="ph-fill ph-video-camera text-lg"></i> <span>Choose / Record 5s Vibe Video</span>`;
            }
            event.target.value = "";
        }
    };

    window.removeMyVibeVideo = async function () {
        await fetch(`${getApiBase()}/api/delete-vibe-video`, {
            method: "POST",
            headers: getHeaders(true),
            body: JSON.stringify({ telegram_id: getUid() })
        });
        if (P7_CACHE[getUid()]) P7_CACHE[getUid()].vibe_video_url = "";
        document.getElementById("p7-vibe-video-modal")?.classList.add("hidden");
        showAlert("Vibe Loop video removed.");
    };

    window.enablePrivacyFuzzedGPS = function () {
        if (!navigator.geolocation) return showAlert("Geolocation is not supported on this device.");
        navigator.geolocation.getCurrentPosition(
            async (pos) => {
                await fetch(`${getApiBase()}/api/location/update-gps`, {
                    method: "POST",
                    headers: getHeaders(true),
                    body: JSON.stringify({
                        telegram_id: getUid(),
                        lat: pos.coords.latitude,
                        lng: pos.coords.longitude
                    })
                });
                document.getElementById("p7-passport-modal")?.classList.add("hidden");
                showAlert("📍 Approximate ~km distance enabled! Exact location is never saved.");
                enrichDiscoverFeedPhase7();
            },
            () => showAlert("Please allow Location access in your browser/Telegram settings.")
        );
    };

    window.applyVipPassportCity = async function () {
        const city = document.getElementById("p7-passport-city")?.value || "";
        const res = await fetch(`${getApiBase()}/api/location/passport`, {
            method: "POST",
            headers: getHeaders(true),
            body: JSON.stringify({ telegram_id: getUid(), passport_city: city })
        });
        const d = await res.json();
        if (!res.ok) {
            document.getElementById("p7-passport-modal")?.classList.add("hidden");
            if (typeof openPremiumModal === "function") openPremiumModal("stars");
            return showAlert(d.detail || "👑 Habesha VIP required for Passport Mode!");
        }
        document.getElementById("p7-passport-modal")?.classList.add("hidden");
        showAlert(city ? `✈️ Passport Active! Your card is now matching in ${city}!` : "Passport cleared.");
        if (typeof loadDiscoverProfiles === "function") loadDiscoverProfiles();
    };

    window.openEndorseAndTreatModal = function () {
        document.getElementById("buna-gifts-tray")?.classList.add("hidden");
        document.getElementById("p7-endorse-treat-modal")?.classList.remove("hidden");
    };

    window.awardEndorsement = async function (badgeKey) {
        const chatPartner = typeof activeChatId !== "undefined" ? activeChatId : window.currentChatPartnerId;
        if (!chatPartner) return;
        const res = await fetch(`${getApiBase()}/api/endorse-dater`, {
            method: "POST",
            headers: getHeaders(true),
            body: JSON.stringify({
                from_user_id: getUid(),
                to_user_id: chatPartner,
                badge_key: badgeKey
            })
        });
        const d = await res.json();
        document.getElementById("p7-endorse-treat-modal")?.classList.add("hidden");
        if (res.ok) showAlert(`🏅 Awarded "${d.label}"!`);
    };

    window.sendRealBunaTreatGift = async function () {
        const chatPartner = typeof activeChatId !== "undefined" ? activeChatId : window.currentChatPartnerId;
        if (!chatPartner) return;
        const spot = document.getElementById("p7-treat-spot")?.value || "☕ Tomoca Coffee Macchiato Treat";
        const note = document.getElementById("p7-treat-note")?.value.trim() || "";
        const insideTg = Boolean(typeof tg !== "undefined" && tg && tg.initData && typeof tg.openInvoice === "function");

        try {
            const res = await fetch(`${getApiBase()}/api/buna-treat/invoice`, {
                method: "POST",
                headers: getHeaders(true),
                body: JSON.stringify({
                    sender_id: getUid(),
                    receiver_id: chatPartner,
                    cafe_spot: spot,
                    note: note,
                    send_to_chat: !insideTg
                })
            });
            const d = await res.json();
            if (!res.ok || !d.invoice_url) throw new Error(d.detail || "Could not create Buna Treat invoice.");
            document.getElementById("p7-endorse-treat-modal")?.classList.add("hidden");

            if (insideTg) {
                tg.openInvoice(d.invoice_url, async (status) => {
                    if (status === "paid") {
                        await fetch(`${getApiBase()}/api/buna-treat/fulfill`, {
                            method: "POST",
                            headers: getHeaders(true),
                            body: JSON.stringify({ payload_tag: d.payload_tag })
                        });
                        if (typeof loadChatHistory === "function") {
                            loadChatHistory(chatPartner, document.getElementById("chat-header-name")?.innerText || "Match", true);
                        }
                    }
                });
            } else {
                window.open(d.invoice_url, "_blank");
                showAlert("⭐ Complete the 50-Star gift in Telegram—your Real Buna Voucher will drop right into this chat!");
            }
        } catch (err) {
            showAlert(err.message);
        }
    };

    window.translateChatBubble = async function (event, btnEl, encodedText) {
        if (event) event.stopPropagation();
        const raw = decodeURIComponent(encodedText || "");
        btnEl.innerText = "🌐 Translating...";
        const targetLang = typeof currentLang !== "undefined" && currentLang === "am" ? "am" : "en";
        try {
            const res = await fetch(`${getApiBase()}/api/chat/translate`, {
                method: "POST",
                headers: getHeaders(true),
                body: JSON.stringify({ text: raw, target_lang: targetLang })
            });
            const d = await res.json();
            btnEl.outerHTML = `<div class="mt-1.5 pt-1.5 border-t border-orange-100 text-xs font-semibold text-indigo-700">🌐 ${d.translated}</div>`;
        } catch (e) {
            btnEl.innerText = "🌐 Retry Translate";
        }
    };

    window.requestAiChatRevival = async function () {
        const chatPartner = typeof activeChatId !== "undefined" ? activeChatId : window.currentChatPartnerId;
        if (!chatPartner) return;
        const list = document.getElementById("ai-wingman-list");
        if (!list) return;
        list.innerHTML = `<p class="text-xs text-amber-700 animate-pulse py-1">⚡ Crafting personalized Buna Rescue lines...</p>`;
        try {
            const res = await fetch(`${getApiBase()}/api/ai-revive-chat`, {
                method: "POST",
                headers: getHeaders(true),
                body: JSON.stringify({
                    sender_id: getUid(),
                    receiver_id: chatPartner,
                    language: typeof currentLang !== "undefined" ? currentLang : "en"
                })
            });
            const d = await res.json();
            list.innerHTML = (d.suggestions || [])
                .map((line) => {
                    const safeLine = line.replace(/'/g, "\\'").replace(/"/g, "&quot;");
                    return `<button onclick="useAiWingmanLine('${safeLine}')" class="w-full text-left text-xs bg-amber-50 hover:bg-orange-100 text-buna p-2 rounded-xl border border-amber-200 font-semibold block">${line}</button>`;
                })
                .join("");
        } catch (e) {}
    };

    async function enrichDiscoverFeedPhase7() {
        const listArr = typeof profiles !== "undefined" && Array.isArray(profiles) ? profiles : typeof potentialMatches !== "undefined" ? potentialMatches : [];
        if (!listArr.length) return;
        const ids = listArr.slice(0, 60).map((p) => String(p.telegram_id)).filter(Boolean);
        try {
            const res = await fetch(`${getApiBase()}/api/phase7/enrich`, {
                method: "POST",
                headers: getHeaders(true),
                body: JSON.stringify({ viewer_id: getUid(), target_ids: ids })
            });
            if (!res.ok) return;
            const data = await res.json();
            Object.assign(P7_CACHE, data.profiles || {});
            decorateActiveCardWithPhase7();
        } catch (e) {}
    }

    function decorateActiveCardWithPhase7() {
        const listArr = typeof profiles !== "undefined" && Array.isArray(profiles) ? profiles : typeof potentialMatches !== "undefined" ? potentialMatches : [];
        const prof = listArr[typeof currentCardIndex !== "undefined" ? currentCardIndex : 0];
        if (!prof) return;
        const snap = P7_CACHE[String(prof.telegram_id)];
        if (!snap) return;

        const cardEl = document.getElementById("active-swipe-card") || document.getElementById("card-container");
        if (!cardEl) return;

        const headerRow = cardEl.querySelector("h3");
        if (headerRow && snap.is_diamond_verified && !headerRow.innerHTML.includes("💎")) {
            headerRow.insertAdjacentHTML(
                "beforeend",
                `<span class="ml-1 inline-flex items-center gap-0.5 bg-gradient-to-r from-cyan-500 to-verify text-white text-[10px] font-extrabold px-1.5 py-0.5 rounded-full shadow-sm shrink-0">💎 Diamond</span>`
            );
        }
        if (headerRow && headerRow.parentElement) {
            if (snap.distance_label && !headerRow.parentElement.innerHTML.includes(snap.distance_label)) {
                headerRow.parentElement.insertAdjacentHTML(
                    "beforeend",
                    `<span class="text-[10px] font-extrabold text-sky-700 bg-sky-50 border border-sky-200 px-2 py-0.5 rounded-full shrink-0">${snap.distance_label}</span>`
                );
            }
            if (snap.community_circle && !headerRow.parentElement.innerHTML.includes(snap.community_circle)) {
                headerRow.parentElement.insertAdjacentHTML(
                    "beforeend",
                    `<span class="text-[10px] font-extrabold text-purple-800 bg-purple-50 border border-purple-200 px-2 py-0.5 rounded-full shrink-0">${snap.community_circle}</span>`
                );
            }
            if (snap.fasting_friendly && !headerRow.parentElement.innerHTML.includes("Fasting-Friendly")) {
                headerRow.parentElement.insertAdjacentHTML(
                    "beforeend",
                    `<span class="text-[10px] font-extrabold text-amber-800 bg-amber-50 border border-amber-200 px-2 py-0.5 rounded-full shrink-0">🕯️ Fasting-Friendly</span>`
                );
            }
        }

        // Feature #5 + #12: 5s Vibe Video Loop (Respects 4G Data-Saver Mode!)
        const photoBox = cardEl.querySelector(".bg-\\[\\#18110E\\]") || cardEl.querySelector(".bg-gray-900");
        if (photoBox && snap.vibe_video_url && !prof.blur_photos_until_match && !photoBox.querySelector("video") && !dataSaverActive) {
            const vid = document.createElement("video");
            vid.src = snap.vibe_video_url;
            vid.autoplay = true;
            vid.loop = true;
            vid.muted = true;
            vid.playsInline = true;
            vid.setAttribute("playsinline", "true");
            vid.className = "absolute inset-0 w-full h-full object-cover pointer-events-none z-[5]";
            photoBox.insertBefore(vid, photoBox.firstChild);
        }
    }

    function hookExistingFunctions() {
        // Hook Discover Card Rendering
        const renderFnName = typeof window.renderCards === "function" ? "renderCards" : typeof window.renderCurrentCard === "function" ? "renderCurrentCard" : "";
        if (renderFnName && !window._p7RenderHooked) {
            window._p7RenderHooked = true;
            const origRender = window[renderFnName];
            window[renderFnName] = function () {
                origRender.apply(this, arguments);
                const listArr = typeof profiles !== "undefined" && Array.isArray(profiles) ? profiles : typeof potentialMatches !== "undefined" ? potentialMatches : [];
                const prof = listArr[typeof currentCardIndex !== "undefined" ? currentCardIndex : 0];
                if (prof && P7_CACHE[String(prof.telegram_id)]) {
                    decorateActiveCardWithPhase7();
                } else {
                    enrichDiscoverFeedPhase7();
                }
            };
        }

        // Hook Full Profile Details Drawer
        const detailsFnName = typeof window.showProfileDetails === "function" ? "showProfileDetails" : typeof window.openProfileDetails === "function" ? "openProfileDetails" : "";
        if (detailsFnName && !window._p7DetailsHooked) {
            window._p7DetailsHooked = true;
            const origDetails = window[detailsFnName];
            window[detailsFnName] = async function () {
                origDetails.apply(this, arguments);
                const listArr = typeof profiles !== "undefined" && Array.isArray(profiles) ? profiles : typeof potentialMatches !== "undefined" ? potentialMatches : [];
                const prof = listArr[typeof currentCardIndex !== "undefined" ? currentCardIndex : 0];
                if (!prof) return;
                const tid = String(prof.telegram_id);
                if (!P7_CACHE[tid]) await enrichDiscoverFeedPhase7();
                const snap = P7_CACHE[tid] || {};
                const container = document.getElementById("profile-details-content");
                if (!container || document.getElementById("p7-details-extra")) return;

                let extraHtml = `<div id="p7-details-extra" class="space-y-3 mb-4">`;
                if (snap.community_circle || snap.fasting_friendly || snap.polite_inbox_shield) {
                    extraHtml += `<div class="flex flex-wrap gap-1.5">`;
                    if (snap.community_circle) extraHtml += `<span class="px-2.5 py-1 rounded-full bg-purple-50 border border-purple-200 text-xs font-extrabold text-premium">${snap.community_circle}</span>`;
                    if (snap.fasting_friendly) extraHtml += `<span class="px-2.5 py-1 rounded-full bg-amber-50 border border-amber-200 text-xs font-extrabold text-amber-900">🕯️ Fasting-Friendly</span>`;
                    if (snap.polite_inbox_shield) extraHtml += `<span class="px-2.5 py-1 rounded-full bg-pink-50 border border-pink-200 text-xs font-extrabold text-habeshaCoral">👑 Polite Inbox Shield Active</span>`;
                    extraHtml += `</div>`;
                }

                if (snap.endorsement_badges && snap.endorsement_badges.length > 0) {
                    extraHtml += `
                        <div class="p-3 rounded-2xl bg-amber-50/80 border border-amber-200">
                            <p class="text-[10px] font-extrabold text-amber-800 uppercase mb-1.5">🏅 Community Endorsements</p>
                            <div class="flex flex-wrap gap-1.5">
                                ${snap.endorsement_badges.map((b) => `<span class="px-2.5 py-1 rounded-full bg-white border border-amber-200 text-[11px] font-extrabold text-buna">${b.label} (${b.count})</span>`).join("")}
                            </div>
                        </div>`;
                }

                const ta = snap.tidar_alignment;
                if (ta && ta.has_blueprint) {
                    const pEntries = Object.entries(ta.pillars || {});
                    extraHtml += `
                        <div class="p-3.5 rounded-2xl bg-gradient-to-br from-orange-50 via-amber-50 to-rose-50 border border-orange-200">
                            <div class="flex items-center justify-between mb-2">
                                <span class="text-xs font-extrabold text-buna">💍 6-Pillar Tidar Blueprint</span>
                                <span class="px-2.5 py-0.5 rounded-full bg-white border border-orange-200 text-[11px] font-extrabold text-habeshaCoral">${ta.alignment_pct}% Aligned</span>
                            </div>
                            <div class="grid grid-cols-1 gap-1.5 text-xs">
                                ${pEntries.map(([k, val]) => `<div class="flex justify-between bg-white/80 px-2.5 py-1.5 rounded-xl border border-orange-100"><span class="text-gray-500 font-bold">${PILLAR_LABELS[k] || k}</span><span class="font-extrabold text-buna">${val}</span></div>`).join("")}
                            </div>
                        </div>`;
                }
                extraHtml += `</div>`;
                const h4 = container.querySelector("h4");
                if (h4) h4.insertAdjacentHTML("beforebegin", extraHtml);
                else container.insertAdjacentHTML("beforeend", extraHtml);
            };
        }

        // Hook Chat Send for Polite Inbox Shield (#10) & Smart Contact-Leak Pacing (#16)
        if (typeof window.sendMessage === "function" && !window._p8SendHooked) {
            window._p8SendHooked = true;
            const origSend = window.sendMessage;
            window.sendMessage = async function (mediaUrl = "", mediaType = "text") {
                const input = document.getElementById("chat-input");
                const rawText = input ? input.value.trim() : "";
                const receiver = typeof activeChatId !== "undefined" && activeChatId ? activeChatId : window.currentChatPartnerId;
                if (rawText && (!mediaType || mediaType === "text") && receiver) {
                    try {
                        const gRes = await fetch(`${getApiBase()}/api/phase8/chat-guard`, {
                            method: "POST",
                            headers: getHeaders(true),
                            body: JSON.stringify({
                                sender_id: getUid(),
                                receiver_id: String(receiver),
                                message: rawText
                            })
                        });
                        if (gRes.ok) {
                            const gData = await gRes.json();
                            if (gData.allowed === false) {
                                showAlert(gData.reason);
                                return;
                            }
                            if (gData.masked && gData.sanitized_message && input) {
                                input.value = gData.sanitized_message;
                                showAlert(gData.notice);
                            }
                        }
                    } catch (e) {}
                }
                return origSend.apply(this, arguments);
            };
        }

        // Recommendation #13: Add 48-Hour Match Spark Timer badges in Matches list
        if (typeof window.updateMatchListBadges === "function" && !window._p8MatchTimerHooked) {
            window._p8MatchTimerHooked = true;
            const origMatchBadges = window.updateMatchListBadges;
            window.updateMatchListBadges = function () {
                origMatchBadges.apply(this, arguments);
                document.querySelectorAll("#matches-container > div h4").forEach((h4) => {
                    if (!h4.innerHTML.includes("⏳")) {
                        h4.insertAdjacentHTML(
                            "beforeend",
                            `<span class="ml-auto text-[9px] font-extrabold bg-amber-50 text-amber-800 border border-amber-200 px-1.5 py-0.5 rounded-full shrink-0" title="Send a message to keep your match spark alive!">⏳ 48h Spark</span>`
                        );
                    }
                });
            };
        }

        // Hook Chat Bubbles for Buna Treat Vouchers & 1-Tap AI Translate
        if (typeof window.renderChatMediaContent === "function" && !window._p7ChatHooked) {
            window._p7ChatHooked = true;
            const origMedia = window.renderChatMediaContent;
            window.renderChatMediaContent = function (msg, isMe) {
                const txt = msg.content || msg.message || "";
                if (txt.startsWith("[HABESHA_TREAT]")) {
                    try {
                        const t = JSON.parse(txt.replace("[HABESHA_TREAT]", ""));
                        return `
                            <div class="w-56 sm:w-64 py-1 text-left" onclick="event.stopPropagation()">
                                <div class="p-3 rounded-2xl bg-gradient-to-br from-amber-100 via-yellow-50 to-orange-100 text-buna border-2 border-amber-400 shadow-md space-y-1">
                                    <p class="text-[10px] font-extrabold text-amber-800 uppercase">🎁 Official Buna Gift Voucher</p>
                                    <p class="text-xs font-extrabold">${t.cafe_spot}</p>
                                    ${t.note ? `<p class="text-[11px] italic text-gray-700">"${t.note}"</p>` : ""}
                                    <div class="mt-1.5 bg-white px-2.5 py-1 rounded-lg border border-amber-300 font-mono text-xs font-extrabold text-center text-botOrange tracking-wider">${t.voucher_code}</div>
                                </div>
                            </div>`;
                    } catch (e) {}
                }
                const baseHtml = origMedia.apply(this, arguments);
                const isPlainIncoming = !isMe && (!msg.media_type || msg.media_type === "text") && txt && !txt.startsWith("[HABESHA_");
                if (isPlainIncoming && txt.length >= 3) {
                    const enc = encodeURIComponent(txt);
                    return `${baseHtml}<button type="button" onclick="translateChatBubble(event, this, '${enc}')" class="mt-1 text-[10px] font-extrabold text-verify hover:underline flex items-center gap-0.5">🌐 Translate</button>`;
                }
                return baseHtml;
            };
        }
    }

    let currentSparkMatch = null;
    window.openSparkMatchChat = function () {
        document.getElementById("p7-mutual-spark-banner")?.classList.add("hidden");
        if (!currentSparkMatch) return;
        if (typeof switchTab === "function") switchTab("matches");
        setTimeout(() => {
            if (typeof openChat === "function") {
                openChat(
                    currentSparkMatch.telegram_id,
                    currentSparkMatch.name || "Match",
                    currentSparkMatch.photo_url || DEFAULT_AVATAR,
                    currentSparkMatch.icebreaker || "",
                    true
                );
            }
        }, 250);
    };

    async function checkMutualOnlineSpark() {
        const uid = getUid();
        const inChat = (typeof activeChatId !== "undefined" && activeChatId) || window.currentChatPartnerId;
        if (!uid || uid === "guest" || inChat) return;
        try {
            const res = await fetch(`${getApiBase()}/api/mutual-spark/${encodeURIComponent(uid)}`);
            if (!res.ok) return;
            const d = await res.json();
            if (d.spark && d.spark.telegram_id && d.spark.telegram_id !== lastSparkShownId) {
                lastSparkShownId = d.spark.telegram_id;
                currentSparkMatch = d.spark;
                const banner = document.getElementById("p7-mutual-spark-banner");
                const lbl = document.getElementById("p7-spark-text");
                if (lbl) lbl.innerText = `🟢 ${d.spark.name} is online right now — Tap to Chat or Buna Call!`;
                banner?.classList.remove("hidden");
                banner?.classList.add("flex");
            }
        } catch (e) {}
    }

    function bootPhase7And8() {
        setupProgressiveWebApp();
        injectModalsAndUnifiedBar();
        hookExistingFunctions();
        setTimeout(enrichDiscoverFeedPhase7, 1200);
        setTimeout(checkMutualOnlineSpark, 5000);
        setInterval(checkMutualOnlineSpark, 35000);
    }

    if (document.readyState === "loading") {
        document.addEventListener("DOMContentLoaded", bootPhase7And8);
    } else {
        bootPhase7And8();
    }
})();
