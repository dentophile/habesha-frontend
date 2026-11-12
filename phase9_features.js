/**
 * HABESHA DATE — PHASE 9 ENGINE
 * Viral Telegram Loops, 8 PM Buna Hour, Bilingual Toggle (EN/AM),
 * WebAudio Ethio-Jazz Anthems, Hot-Take Polls, Express Onboarding & Pre-Fetching
 */
(function () {
    "use strict";

    const API_BASE = (window.API_BASE_URL || "https://habesha-backend-s52y.onrender.com").replace(/\/$/, "");
    const tg = (window.Telegram && window.Telegram.WebApp) ? window.Telegram.WebApp : null;

    const STATE = {
        lang: localStorage.getItem("hd_lang") || "en",
        anthem: localStorage.getItem("hd_anthem") || "tizita",
        bunaHour: { is_live: false, minutes_left: 0, eat_time: "" },
        completionPct: 60,
        rewardClaimed: false,
        wingmanBadge: false,
        polls: [],
        audioCtx: null,
        isPlayingAnthem: false
    };

    const I18N = {
        en: {
            discover: "Discover",
            matches: "Matches",
            stories: "Stories",
            profile: "Profile",
            lounge: "✨ Lounge",
            filter: "⚙️ Filter",
            bunaLive: "☕ Buna Hour is LIVE! 2x Match Weight for",
            bunaSoon: "☕ Daily 8:00 PM EAT Buna Hour (2x Matches)",
            shareStory: "📸 Story Card",
            groupQuiz: "🎲 Group Quiz",
            wingman: "🤝 Wingman 72h VIP",
            hotTakes: "🔥 Tidar Hot-Takes",
            recycle: "♻️ Second-Chance Stack",
            anthem: "🎷 Ethio-Anthem",
            express: "⚡ 20s Express Setup",
            completePrompt: "Complete profile for +1 Free Golden Rose 🌹"
        },
        am: {
            discover: "ያግኙ",
            matches: "ምርጫዎች",
            stories: "ታሪኮች",
            profile: "ፕሮፋይል",
            lounge: "✨ ክበብ",
            filter: "⚙️ ማጣሪያ",
            bunaLive: "☕ የቡና ሰዓት ጀምሯል! ለ20 ደቂቃ 2x እድል",
            bunaSoon: "☕ በየቀኑ ምሽት 2:00 ሰዓት የቡና ሰዓት",
            shareStory: "📸 ታሪክ ያጋሩ",
            groupQuiz: "🎲 የቡድን ጥያቄ",
            wingman: "🤝 የጓደኛ 72 ሰዓት VIP",
            hotTakes: "🔥 የትዳር ውይይት",
            recycle: "♻️ ዳግም እድል ይስጡ",
            anthem: "🎷 የሙዚቃ ቃና",
            express: "⚡ ፈጣን ምዝገባ",
            completePrompt: "ፕሮፋይልዎን 100% ይሙሉ — 1 ወርቃማ ጽጌረዳ በነፃ 🌹"
        }
    };

    function getUserId() {
        if (window.cleanTelegramId) return window.cleanTelegramId;
        if (tg && tg.initDataUnsafe && tg.initDataUnsafe.user) return tg.initDataUnsafe.user.id;
        return Number(localStorage.getItem("hd_uid")) || 723718730;
    }

    function t(key) {
        return (I18N[STATE.lang] && I18N[STATE.lang][key]) || I18N.en[key] || key;
    }

    function injectPhase9Styles() {
        if (document.getElementById("phase9-styles")) return;
        const style = document.createElement("style");
        style.id = "phase9-styles";
        style.textContent = `
            @import url('https://fonts.googleapis.com/css2?family=Noto+Sans+Ethiopic:wght@400;600;700&display=swap');
            body.hd-lang-am {
                font-family: 'Noto Sans Ethiopic', system-ui, -apple-system, sans-serif !important;
            }
            .p9-lang-btn {
                background: rgba(255,255,255,0.12);
                border: 1px solid rgba(251,191,36,0.45);
                color: #fef3c7;
                border-radius: 999px;
                padding: 4px 10px;
                font-size: 11px;
                font-weight: 700;
                cursor: pointer;
                display: inline-flex;
                align-items: center;
                gap: 4px;
                transition: transform 0.15s ease;
            }
            .p9-lang-btn:active { transform: scale(0.95); }
            .p9-buna-banner {
                margin: 4px 12px 6px;
                padding: 6px 12px;
                border-radius: 12px;
                background: linear-gradient(90deg, rgba(120,53,15,0.9), rgba(180,83,9,0.88));
                border: 1px solid rgba(251,191,36,0.45);
                color: #fef3c7;
                font-size: 11.5px;
                display: flex;
                align-items: center;
                justify-content: space-between;
                gap: 8px;
                box-shadow: 0 4px 14px rgba(0,0,0,0.25);
            }
            .p9-grid {
                display: grid;
                grid-template-columns: repeat(2, 1fr);
                gap: 8px;
                margin-top: 10px;
            }
            .p9-card-btn {
                background: rgba(30,41,59,0.9);
                border: 1px solid rgba(255,255,255,0.12);
                border-radius: 12px;
                padding: 10px;
                color: #f8fafc;
                font-size: 12px;
                font-weight: 600;
                text-align: left;
                cursor: pointer;
                display: flex;
                flex-direction: column;
                gap: 3px;
            }
            .p9-card-btn small {
                color: #94a3b8;
                font-size: 10px;
                font-weight: 400;
            }
            .p9-modal-backdrop {
                position: fixed;
                inset: 0;
                background: rgba(2,6,23,0.82);
                backdrop-filter: blur(8px);
                z-index: 99999;
                display: flex;
                align-items: center;
                justify-content: center;
                padding: 16px;
            }
            .p9-modal-box {
                width: 100%;
                max-width: 410px;
                max-height: 86vh;
                overflow-y: auto;
                background: #0f172a;
                border: 1px solid rgba(251,191,36,0.35);
                border-radius: 20px;
                padding: 18px;
                color: #f8fafc;
                box-shadow: 0 20px 50px rgba(0,0,0,0.6);
            }
            .p9-pill-progress {
                height: 6px;
                background: rgba(255,255,255,0.12);
                border-radius: 999px;
                overflow: hidden;
                margin-top: 4px;
            }
            .p9-pill-fill {
                height: 100%;
                background: linear-gradient(90deg, #f59e0b, #ec4899);
                transition: width 0.3s ease;
            }
        `;
        document.head.appendChild(style);
    }

    // 1. Bilingual Toggle (EN / AM)
    function applyLanguage() {
        document.body.classList.toggle("hd-lang-am", STATE.lang === "am");
        const langBtn = document.getElementById("p9-lang-toggle");
        if (langBtn) {
            langBtn.innerHTML = STATE.lang === "am" ? "🇺🇸 EN" : "🇪🇹 አማርኛ";
        }
        const loungeBtn = document.getElementById("p7-lounge-trigger");
        if (loungeBtn) loungeBtn.innerHTML = t("lounge");

        // Update bottom nav labels if present
        const navMap = [
            { sel: '[onclick*="discover"]', key: "discover" },
            { sel: '[onclick*="matches"]', key: "matches" },
            { sel: '[onclick*="stories"]', key: "stories" },
            { sel: '[onclick*="profile"]', key: "profile" }
        ];
        navMap.forEach(item => {
            const el = document.querySelector(item.sel);
            if (el) {
                const span = el.querySelector("span:last-child");
                if (span) span.textContent = t(item.key);
            }
        });

        renderBunaBanner();
    }

    function toggleLanguage() {
        STATE.lang = STATE.lang === "en" ? "am" : "en";
        localStorage.setItem("hd_lang", STATE.lang);
        applyLanguage();
        fetch(`${API_BASE}/api/phase9/preferences`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
                telegram_id: getUserId(),
                anthem_vibe: STATE.anthem,
                lang_pref: STATE.lang
            })
        }).catch(() => {});
    }

    // 2. WebAudio Synthesized Ethiopian Pentatonic Anthems (0 Data Cost)
    const ANTHEM_SCALES = {
        tizita: { name: "🎷 Classic Tizita (Nostalgic)", notes: [261.63, 293.66, 329.63, 392.00, 440.00, 392.00, 329.63, 261.63] },
        bati: { name: "🎸 Bati Groove (Warm & Romantic)", notes: [293.66, 369.99, 392.00, 440.00, 554.37, 440.00, 392.00, 293.66] },
        ethiojazz: { name: "🎺 Mulatu-Style Ethio-Jazz", notes: [220.00, 261.63, 293.66, 311.13, 392.00, 440.00, 311.13, 220.00] },
        addischill: { name: "☕ Modern Addis Acoustic", notes: [329.63, 392.00, 440.00, 493.88, 587.33, 493.88, 440.00, 329.63] }
    };

    function playAnthemPreview(vibeKey) {
        const scale = ANTHEM_SCALES[vibeKey] || ANTHEM_SCALES.tizita;
        try {
            const AudioContext = window.AudioContext || window.webkitAudioContext;
            if (!STATE.audioCtx) STATE.audioCtx = new AudioContext();
            const ctx = STATE.audioCtx;
            if (ctx.state === "suspended") ctx.resume();

            scale.notes.forEach((freq, idx) => {
                const osc = ctx.createOscillator();
                const gain = ctx.createGain();
                osc.type = "triangle";
                osc.frequency.setValueAtTime(freq, ctx.currentTime + idx * 0.22);
                gain.gain.setValueAtTime(0.001, ctx.currentTime + idx * 0.22);
                gain.gain.exponentialRampToValueAtTime(0.18, ctx.currentTime + idx * 0.22 + 0.04);
                gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + idx * 0.22 + 0.20);
                osc.connect(gain);
                gain.connect(ctx.destination);
                osc.start(ctx.currentTime + idx * 0.22);
                osc.stop(ctx.currentTime + idx * 0.22 + 0.21);
            });
        } catch (e) {}
    }

    // 3. 1-Tap Telegram Story Vibe Card Generator (Canvas -> DataURL / Native Story)
    function shareVibeCardToStory() {
        const botUsername = "ethiopia_date_bot";
        const refLink = `https://t.me/${botUsername}?start=wingman_${getUserId()}`;

        if (tg && typeof tg.shareToStory === "function") {
            try {
                tg.shareToStory("https://images.unsplash.com/photo-1511920170033-f8396924c348?w=1080&q=80", {
                    text: `☕ My Habesha Date Vibe: ${(ANTHEM_SCALES[STATE.anthem] || ANTHEM_SCALES.tizita).name} ✨ Find your match on @${botUsername}`,
                    widget_link: {
                        url: refLink,
                        name: "Habesha Date 🇪🇹"
                    }
                });
                return;
            } catch (e) {}
        }

        // Universal fallback: Telegram share URL
        const shareText = encodeURIComponent("☕ Join me on Habesha Date! Link with my Wingman Pass for 72h Free VIP 🇪🇹✨");
        const shareUrl = `https://t.me/share/url?url=${encodeURIComponent(refLink)}&text=${shareText}`;
        if (tg && tg.openTelegramLink) tg.openTelegramLink(shareUrl);
        else window.open(shareUrl, "_blank");
    }

    // 4. Group Inline "Who's My Match?" Quiz Trigger
    function triggerGroupInlineQuiz() {
        if (tg && typeof tg.switchInlineQuery === "function") {
            try {
                tg.switchInlineQuery("buna_quiz", ["groups", "supergroups", "users"]);
                return;
            } catch (e) {}
        }
        const botUsername = "ethiopia_date_bot";
        const refLink = `https://t.me/${botUsername}?start=quiz_${getUserId()}`;
        const text = encodeURIComponent("☕ Quick Habesha Poll: First date at a traditional Jebena Buna spot or modern pastry café? Vote & see your match!");
        const url = `https://t.me/share/url?url=${encodeURIComponent(refLink)}&text=${text}`;
        if (tg && tg.openTelegramLink) tg.openTelegramLink(url);
        else window.open(url, "_blank");
    }

    // 5. Wingman Dual-VIP Pass Modal
    function openWingmanModal() {
        const uid = getUserId();
        const link = `https://t.me/ethiopia_date_bot?start=wingman_${uid}`;
        showP9Modal(`
            <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:10px;">
                <h3 style="margin:0;font-size:16px;">🤝 Wingman Double-VIP Pass</h3>
                <button onclick="document.getElementById('p9-modal-root').remove()" style="background:none;border:none;color:#94a3b8;font-size:18px;">✕</button>
            </div>
            <p style="font-size:12.5px;color:#cbd5e1;line-height:1.5;">
                Invite one trusted friend as your <b>Wingman</b>. Both of you immediately unlock:
                <br>• <b>72 Hours of Full VIP</b>
                <br>• <b>"Verified by a Friend"</b> trust badge on your card
            </p>
            <div style="background:#1e293b;padding:10px;border-radius:10px;font-size:11px;word-break:break-all;margin:10px 0;color:#fbbf24;">
                ${link}
            </div>
            <div style="display:flex;gap:8px;">
                <button id="p9-copy-wingman" style="flex:1;padding:10px;border-radius:10px;border:none;background:#f59e0b;color:#0f172a;font-weight:700;cursor:pointer;">
                    📋 Copy Link
                </button>
                <button id="p9-share-wingman" style="flex:1;padding:10px;border-radius:10px;border:none;background:#ec4899;color:#fff;font-weight:700;cursor:pointer;">
                    🚀 Send on Telegram
                </button>
            </div>
            <hr style="border-color:rgba(255,255,255,0.08);margin:14px 0;">
            <label style="font-size:11px;color:#94a3b8;">Have a friend's Telegram ID? Link directly:</label>
            <div style="display:flex;gap:6px;margin-top:6px;">
                <input id="p9-wingman-input" type="number" placeholder="Friend's Telegram ID" style="flex:1;padding:8px 10px;border-radius:8px;border:1px solid #334155;background:#020617;color:#fff;font-size:12px;">
                <button id="p9-wingman-submit" style="padding:8px 12px;border-radius:8px;border:none;background:#10b981;color:#022c22;font-weight:700;font-size:12px;cursor:pointer;">
                    Activate 72h VIP
                </button>
            </div>
        `);

        document.getElementById("p9-copy-wingman").onclick = () => {
            navigator.clipboard.writeText(link);
            alert("✅ Wingman invite link copied!");
        };
        document.getElementById("p9-share-wingman").onclick = () => shareVibeCardToStory();
        document.getElementById("p9-wingman-submit").onclick = async () => {
            const friendId = Number(document.getElementById("p9-wingman-input").value);
            if (!friendId) return alert("Enter your friend's numeric ID");
            const res = await fetch(`${API_BASE}/api/phase9/wingman-link`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ inviter_id: uid, friend_id: friendId })
            }).then(r => r.json()).catch(() => ({ ok: false }));
            alert(res.message || "Wingman Pass processed!");
            if (res.ok) document.getElementById("p9-modal-root")?.remove();
        };
    }

    // 6. Community "Tidar & Culture" Hot-Take Feed Modal
    async function openHotTakesModal() {
        const uid = getUserId();
        showP9Modal(`<div style="text-align:center;padding:20px;">Loading Tidar & Culture Hot-Takes... ☕</div>`);
        const data = await fetch(`${API_BASE}/api/phase9/hot-takes/${uid}`).then(r => r.json()).catch(() => ({ polls: [] }));
        const polls = data.polls || [];

        const htmlPolls = polls.map(p => {
            const q = STATE.lang === "am" ? p.question_am : p.question_en;
            const optA = STATE.lang === "am" ? p.option_a_am : p.option_a_en;
            const optB = STATE.lang === "am" ? p.option_b_am : p.option_b_en;
            return `
                <div style="background:#1e293b;border-radius:14px;padding:12px;margin-bottom:10px;border:1px solid rgba(255,255,255,0.08);">
                    <div style="font-size:13px;font-weight:700;margin-bottom:8px;color:#fef3c7;">${q}</div>
                    <div style="display:flex;flex-direction:column;gap:6px;">
                        <button class="p9-vote-btn" data-poll="${p.id}" data-choice="A" style="padding:9px 10px;border-radius:10px;border:1px solid ${p.my_choice === 'A' ? '#f59e0b' : '#334155'};background:${p.my_choice === 'A' ? 'rgba(245,158,11,0.2)' : '#0f172a'};color:#fff;text-align:left;font-size:12px;cursor:pointer;display:flex;justify-content:space-between;">
                            <span>${optA}</span>
                            <b>${p.pct_a}%</b>
                        </button>
                        <button class="p9-vote-btn" data-poll="${p.id}" data-choice="B" style="padding:9px 10px;border-radius:10px;border:1px solid ${p.my_choice === 'B' ? '#f59e0b' : '#334155'};background:${p.my_choice === 'B' ? 'rgba(245,158,11,0.2)' : '#0f172a'};color:#fff;text-align:left;font-size:12px;cursor:pointer;display:flex;justify-content:space-between;">
                            <span>${optB}</span>
                            <b>${p.pct_b}%</b>
                        </button>
                    </div>
                    <div style="font-size:10.5px;color:#94a3b8;margin-top:6px;">
                        ${p.total_votes} votes • Vote to see members who agree with you!
                    </div>
                </div>
            `;
        }).join("");

        showP9Modal(`
            <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:10px;">
                <h3 style="margin:0;font-size:16px;">🔥 ${t("hotTakes")}</h3>
                <button onclick="document.getElementById('p9-modal-root').remove()" style="background:none;border:none;color:#94a3b8;font-size:18px;">✕</button>
            </div>
            <div id="p9-hot-takes-list">${htmlPolls || "<p>No active polls right now.</p>"}</div>
            <div id="p9-hot-take-matches" style="margin-top:8px;"></div>
        `);

        document.querySelectorAll(".p9-vote-btn").forEach(btn => {
            btn.onclick = async () => {
                const poll_id = Number(btn.getAttribute("data-poll"));
                const choice = btn.getAttribute("data-choice");
                const res = await fetch(`${API_BASE}/api/phase9/hot-takes/vote`, {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({ telegram_id: uid, poll_id, choice })
                }).then(r => r.json()).catch(() => ({}));
                if (res.same_opinion_matches && res.same_opinion_matches.length) {
                    const mBox = document.getElementById("p9-hot-take-matches");
                    if (mBox) {
                        mBox.innerHTML = `
                            <div style="padding:10px;background:rgba(16,185,129,0.14);border:1px solid #10b981;border-radius:12px;font-size:12px;">
                                ✨ <b>Agreed with your take:</b> ${res.same_opinion_matches.map(m => `${m.name} (${m.age})`).join(", ")}
                            </div>
                        `;
                    }
                } else {
                    openHotTakesModal();
                }
            };
        });
    }

    // 7. Second-Chance Recycle Stack
    async function recycleStackNow() {
        const uid = getUserId();
        const res = await fetch(`${API_BASE}/api/phase9/recycle-stack/${uid}`).then(r => r.json()).catch(() => ({ ok: false }));
        alert(res.message || "♻️ Discover stack refreshed!");
        if (typeof window.loadPotentialMatches === "function") {
            window.loadPotentialMatches();
        } else {
            window.location.reload();
        }
    }

    // 8. Acoustic Anthem Picker Modal
    function openAnthemPickerModal() {
        const uid = getUserId();
        const rows = Object.entries(ANTHEM_SCALES).map(([key, item]) => `
            <div style="display:flex;align-items:center;justify-content:space-between;background:#1e293b;padding:10px 12px;border-radius:12px;margin-bottom:8px;border:1px solid ${STATE.anthem === key ? '#f59e0b' : 'transparent'};">
                <span style="font-size:12.5px;font-weight:600;">${item.name}</span>
                <div style="display:flex;gap:6px;">
                    <button class="p9-preview-anthem" data-key="${key}" style="padding:5px 10px;border-radius:8px;border:1px solid #475569;background:#0f172a;color:#fef3c7;font-size:11px;cursor:pointer;">▶ Preview</button>
                    <button class="p9-save-anthem" data-key="${key}" style="padding:5px 10px;border-radius:8px;border:none;background:#f59e0b;color:#0f172a;font-weight:700;font-size:11px;cursor:pointer;">Select</button>
                </div>
            </div>
        `).join("");

        showP9Modal(`
            <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:10px;">
                <h3 style="margin:0;font-size:16px;">🎷 Acoustic Profile Anthem</h3>
                <button onclick="document.getElementById('p9-modal-root').remove()" style="background:none;border:none;color:#94a3b8;font-size:18px;">✕</button>
            </div>
            <p style="font-size:12px;color:#94a3b8;margin-top:0;">Pick a 0-data synthesized Ethiopian instrumental vibe for your card:</p>
            ${rows}
        `);

        document.querySelectorAll(".p9-preview-anthem").forEach(b => {
            b.onclick = () => playAnthemPreview(b.getAttribute("data-key"));
        });
        document.querySelectorAll(".p9-save-anthem").forEach(b => {
            b.onclick = async () => {
                const key = b.getAttribute("data-key");
                STATE.anthem = key;
                localStorage.setItem("hd_anthem", key);
                playAnthemPreview(key);
                await fetch(`${API_BASE}/api/phase9/preferences`, {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({ telegram_id: uid, anthem_vibe: key, lang_pref: STATE.lang })
                }).catch(() => {});
                alert(`🎷 Profile Anthem set to ${ANTHEM_SCALES[key].name}!`);
                document.getElementById("p9-modal-root")?.remove();
            };
        });
    }

    // 9. 60-Second Express Onboarding & Completion Reward Modal
    function openExpressOnboardingModal() {
        const uid = getUserId();
        showP9Modal(`
            <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:10px;">
                <h3 style="margin:0;font-size:16px;">⚡ 20-Second Express Setup</h3>
                <button onclick="document.getElementById('p9-modal-root').remove()" style="background:none;border:none;color:#94a3b8;font-size:18px;">✕</button>
            </div>
            <div style="margin-bottom:12px;">
                <div style="display:flex;justify-content:space-between;font-size:11px;color:#fbbf24;">
                    <span>${t("completePrompt")}</span>
                    <b>${STATE.completionPct}%</b>
                </div>
                <div class="p9-pill-progress"><div class="p9-pill-fill" style="width:${STATE.completionPct}%"></div></div>
            </div>
            <div style="display:flex;flex-direction:column;gap:8px;">
                <input id="p9-exp-name" placeholder="Your First Name" style="padding:10px;border-radius:10px;border:1px solid #334155;background:#020617;color:#fff;">
                <div style="display:flex;gap:8px;">
                    <select id="p9-exp-gender" style="flex:1;padding:10px;border-radius:10px;border:1px solid #334155;background:#020617;color:#fff;">
                        <option value="Male">Male</option>
                        <option value="Female">Female</option>
                    </select>
                    <input id="p9-exp-age" type="number" value="25" min="18" max="70" style="width:90px;padding:10px;border-radius:10px;border:1px solid #334155;background:#020617;color:#fff;">
                </div>
                <select id="p9-exp-intent" style="padding:10px;border-radius:10px;border:1px solid #334155;background:#020617;color:#fff;">
                    <option value="Serious Marriage (Tidar)">💍 Serious Marriage (Tidar)</option>
                    <option value="Dating & Connection">❤️ Dating & Connection</option>
                    <option value="Friendship & Social Circle">🤝 Friendship & Circle</option>
                </select>
                <button id="p9-exp-save" style="padding:11px;border-radius:10px;border:none;background:linear-gradient(90deg,#f59e0b,#ec4899);color:#fff;font-weight:700;cursor:pointer;margin-top:4px;">
                    ⚡ Save & Claim +1 Free Golden Rose 🌹
                </button>
            </div>
        `);

        document.getElementById("p9-exp-save").onclick = async () => {
            const name = document.getElementById("p9-exp-name").value.trim() || "Habesha Member";
            const gender = document.getElementById("p9-exp-gender").value;
            const age = Number(document.getElementById("p9-exp-age").value) || 25;
            const intention = document.getElementById("p9-exp-intent").value;
            await fetch(`${API_BASE}/api/phase9/express-onboarding`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ telegram_id: uid, name, gender, age, intention })
            }).catch(() => {});
            const reward = await fetch(`${API_BASE}/api/phase9/claim-completion-reward/${uid}`, { method: "POST" }).then(r => r.json()).catch(() => ({}));
            alert(reward.message || "✅ Express Profile saved!");
            document.getElementById("p9-modal-root")?.remove();
        };
    }

    function showP9Modal(innerHtml) {
        document.getElementById("p9-modal-root")?.remove();
        const modal = document.createElement("div");
        modal.id = "p9-modal-root";
        modal.className = "p9-modal-backdrop";
        modal.innerHTML = `<div class="p9-modal-box">${innerHtml}</div>`;
        modal.addEventListener("click", (e) => {
            if (e.target === modal) modal.remove();
        });
        document.body.appendChild(modal);
    }

    // 10. Render Buna Hour Banner & Header Language Button
    function renderBunaBanner() {
        let banner = document.getElementById("p9-buna-banner");
        const discoverPage = document.getElementById("discover-page") || document.querySelector(".discover-container") || document.body;
        if (!banner && discoverPage) {
            banner = document.createElement("div");
            banner.id = "p9-buna-banner";
            banner.className = "p9-buna-banner";
            discoverPage.insertBefore(banner, discoverPage.firstChild);
        }
        if (banner) {
            const label = STATE.bunaHour.is_live
                ? `${t("bunaLive")} ${STATE.bunaHour.minutes_left}m!`
                : `${t("bunaSoon")}`;
            banner.innerHTML = `
                <span style="cursor:pointer;" onclick="window.HabeshaPhase9.openHotTakesModal()">${label}</span>
                <div style="display:flex;gap:6px;align-items:center;">
                    <button class="p9-lang-btn" onclick="window.HabeshaPhase9.playAnthemPreview(window.HabeshaPhase9.state.anthem)" title="Play Anthem">🎷</button>
                    <button id="p9-lang-toggle" class="p9-lang-btn" onclick="window.HabeshaPhase9.toggleLanguage()">
                        ${STATE.lang === "am" ? "🇺🇸 EN" : "🇪🇹 አማርኛ"}
                    </button>
                </div>
            `;
        }
    }

    // 11. Inject Phase 9 Hub Cards inside ✨ Lounge (whenever Lounge opens)
    function hookIntoLoungeModal() {
        const observer = new MutationObserver(() => {
            const loungeBox = document.getElementById("p7-lounge-modal") || document.querySelector("[id*='lounge']");
            if (loungeBox && !loungeBox.querySelector("#p9-lounge-section")) {
                const targetContainer = loungeBox.querySelector("div") || loungeBox;
                const sec = document.createElement("div");
                sec.id = "p9-lounge-section";
                sec.style.marginTop = "12px";
                sec.style.paddingTop = "12px";
                sec.style.borderTop = "1px solid rgba(255,255,255,0.12)";
                sec.innerHTML = `
                    <div style="font-size:11px;font-weight:700;color:#fbbf24;text-transform:uppercase;letter-spacing:0.06em;margin-bottom:6px;">
                        🚀 Phase 9 • Viral, Culture & Liquidity
                    </div>
                    <div class="p9-grid">
                        <button class="p9-card-btn" onclick="window.HabeshaPhase9.shareVibeCardToStory()">
                            <span>${t("shareStory")}</span>
                            <small>Post Vibe to Telegram Story</small>
                        </button>
                        <button class="p9-card-btn" onclick="window.HabeshaPhase9.triggerGroupInlineQuiz()">
                            <span>${t("groupQuiz")}</span>
                            <small>Drop Buna Poll in Groups</small>
                        </button>
                        <button class="p9-card-btn" onclick="window.HabeshaPhase9.openWingmanModal()">
                            <span>${t("wingman")}</span>
                            <small>Link friend = Both get 72h VIP</small>
                        </button>
                        <button class="p9-card-btn" onclick="window.HabeshaPhase9.openHotTakesModal()">
                            <span>${t("hotTakes")}</span>
                            <small>Vote & match on shared views</small>
                        </button>
                        <button class="p9-card-btn" onclick="window.HabeshaPhase9.openAnthemPickerModal()">
                            <span>${t("anthem")}</span>
                            <small>Tizita, Bati & Ethio-Jazz</small>
                        </button>
                        <button class="p9-card-btn" onclick="window.HabeshaPhase9.recycleStackNow()">
                            <span>${t("recycle")}</span>
                            <small>Restore passed cards instantly</small>
                        </button>
                        <button class="p9-card-btn" style="grid-column:span 2;" onclick="window.HabeshaPhase9.openExpressOnboardingModal()">
                            <span>${t("express")} (${STATE.completionPct}%)</span>
                            <small>${t("completePrompt")}</small>
                        </button>
                    </div>
                `;
                targetContainer.appendChild(sec);
            }
        });
        observer.observe(document.body, { childList: true, subtree: true });
    }

    // 12. Background Image Pre-Fetcher (0ms Swipe Lag on Mobile Data)
    function setupImagePrefetcher() {
        setInterval(() => {
            const list = window.potentialMatches || window.discoveryProfiles || [];
            const idx = Number(window.currentMatchIndex || 0);
            for (let i = idx + 1; i <= idx + 3; i++) {
                const p = list[i];
                if (p && p.photo_url && !p._prefetched) {
                    const img = new Image();
                    img.src = p.photo_url;
                    p._prefetched = true;
                }
            }
        }, 2500);
    }

    async function initPhase9() {
        injectPhase9Styles();
        renderBunaBanner();
        applyLanguage();
        hookIntoLoungeModal();
        setupImagePrefetcher();

        try {
            const uid = getUserId();
            const res = await fetch(`${API_BASE}/api/phase9/status/${uid}`).then(r => r.json());
            if (res && res.status === "ok") {
                STATE.bunaHour = res.buna_hour || STATE.bunaHour;
                STATE.completionPct = res.completion_pct || 60;
                STATE.rewardClaimed = res.completion_reward_claimed || false;
                if (res.anthem_vibe) STATE.anthem = res.anthem_vibe;
                renderBunaBanner();
            }
        } catch (e) {}
    }

    window.HabeshaPhase9 = {
        state: STATE,
        toggleLanguage,
        playAnthemPreview,
        shareVibeCardToStory,
        triggerGroupInlineQuiz,
        openWingmanModal,
        openHotTakesModal,
        recycleStackNow,
        openAnthemPickerModal,
        openExpressOnboardingModal
    };

    if (document.readyState === "loading") {
        document.addEventListener("DOMContentLoaded", initPhase9);
    } else {
        initPhase9();
    }
})();
