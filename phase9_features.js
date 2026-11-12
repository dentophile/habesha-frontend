/**
 * HABESHA DATE — PHASE 9 ENGINE (FIXED)
 * Viral Telegram Loops, 8 PM Buna Hour, Bilingual Toggle (EN/AM),
 * WebAudio Ethio-Jazz Anthems, Hot-Take Polls, Express Onboarding & Pre-Fetching
 */
(function () {
    "use strict";

    const API_BASE = (
        typeof BACKEND_URL !== "undefined"
            ? BACKEND_URL
            : typeof API_URL !== "undefined"
            ? API_URL
            : "https://habesha-backend-xhc5.onrender.com"
    ).replace(/\/$/, "");

    const tg = (window.Telegram && window.Telegram.WebApp) ? window.Telegram.WebApp : null;

    const STATE = {
        lang: localStorage.getItem("habesha_lang") || localStorage.getItem("hd_lang") || "en",
        anthem: localStorage.getItem("hd_anthem") || "tizita",
        bunaHour: { is_live: false, minutes_left: 0, eat_time: "" },
        completionPct: 60,
        rewardClaimed: false,
        wingmanBadge: false,
        polls: [],
        audioCtx: null
    };

    const I18N = {
        en: {
            bunaLive: "☕ Buna Hour LIVE! 2x Match Weight for",
            bunaSoon: "☕ 8:00 PM Buna Hour • Tap for Tidar Hot-Takes",
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
            bunaLive: "☕ የቡና ሰዓት ጀምሯል! ለ20 ደቂቃ 2x እድል",
            bunaSoon: "☕ ምሽት 2:00 የቡና ሰዓት • የትዳር ውይይት ይክፈቱ",
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
        if (typeof cleanTelegramId !== "undefined" && cleanTelegramId && cleanTelegramId !== "guest") {
            return Number(cleanTelegramId) || 723718730;
        }
        if (tg && tg.initDataUnsafe && tg.initDataUnsafe.user) return tg.initDataUnsafe.user.id;
        return Number(localStorage.getItem("habesha_user_id")) || 723718730;
    }

    function t(key) {
        const curLang = typeof currentLang !== "undefined" ? currentLang : STATE.lang;
        return (I18N[curLang] && I18N[curLang][key]) || I18N.en[key] || key;
    }

    function injectPhase9Styles() {
        if (document.getElementById("phase9-styles")) return;
        const style = document.createElement("style");
        style.id = "phase9-styles";
        style.textContent = `
            .p9-grid {
                display: grid;
                grid-template-columns: repeat(2, 1fr);
                gap: 8px;
                margin-top: 8px;
            }
            .p9-card-btn {
                background: #FFF7ED;
                border: 1px solid #FED7AA;
                border-radius: 16px;
                padding: 10px 12px;
                color: #231610;
                font-size: 12px;
                font-weight: 800;
                text-align: left;
                cursor: pointer;
                display: flex;
                flex-direction: column;
                gap: 2px;
                transition: transform 0.12s ease;
            }
            .p9-card-btn:active { transform: scale(0.96); }
            .p9-card-btn small {
                color: #9A3412;
                font-size: 10px;
                font-weight: 600;
            }
            .p9-modal-backdrop {
                position: fixed;
                inset: 0;
                background: rgba(15, 23, 42, 0.76);
                backdrop-filter: blur(8px);
                z-index: 239;
                display: flex;
                align-items: center;
                justify-content: center;
                padding: 16px;
            }
            .p9-modal-box {
                width: 100%;
                max-width: 390px;
                max-height: 85vh;
                overflow-y: auto;
                background: #ffffff;
                border: 1px solid #FED7AA;
                border-radius: 28px;
                padding: 20px;
                color: #231610;
                box-shadow: 0 20px 50px rgba(0,0,0,0.35);
            }
            .p9-pill-progress {
                height: 7px;
                background: #F1F5F9;
                border-radius: 999px;
                overflow: hidden;
                margin-top: 5px;
            }
            .p9-pill-fill {
                height: 100%;
                background: linear-gradient(90deg, #FF7A1A, #FF477E);
                transition: width 0.3s ease;
            }
        `;
        document.head.appendChild(style);
    }

    // Cleanup any accidentally injected content inside #top-lounge-btn
    function cleanHeaderLoungeButton() {
        const topLoungeBtn = document.getElementById("top-lounge-btn");
        if (topLoungeBtn) {
            const stray = topLoungeBtn.querySelector("#p9-lounge-section");
            if (stray) stray.remove();
            topLoungeBtn.innerHTML = `<span>✨ Lounge</span>`;
        }
        const oldBanner = document.getElementById("p9-buna-banner");
        if (oldBanner) oldBanner.remove();
    }

    // WebAudio Synthesized Ethiopian Pentatonic Anthems (0 Data Cost)
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

    function shareVibeCardToStory() {
        document.getElementById("p8-lounge-modal")?.classList.add("hidden");
        const botUsername = "ethiopia_date_bot";
        const refLink = `https://t.me/${botUsername}?start=ref_${getUserId()}`;

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

        const shareText = encodeURIComponent("☕ Join me on Habesha Date! Link with my Wingman Pass for 72h Free VIP 🇪🇹✨");
        const shareUrl = `https://t.me/share/url?url=${encodeURIComponent(refLink)}&text=${shareText}`;
        if (tg && tg.openTelegramLink) tg.openTelegramLink(shareUrl);
        else window.open(shareUrl, "_blank");
    }

    function triggerGroupInlineQuiz() {
        document.getElementById("p8-lounge-modal")?.classList.add("hidden");
        const botUsername = "ethiopia_date_bot";
        const refLink = `https://t.me/${botUsername}?start=ref_${getUserId()}`;
        const text = encodeURIComponent("☕ Quick Habesha Poll: First date at a traditional Jebena Buna spot or modern pastry café? Vote & see your match!");
        const url = `https://t.me/share/url?url=${encodeURIComponent(refLink)}&text=${text}`;
        if (tg && tg.openTelegramLink) tg.openTelegramLink(url);
        else window.open(url, "_blank");
    }

    function openWingmanModal() {
        document.getElementById("p8-lounge-modal")?.classList.add("hidden");
        const uid = getUserId();
        const link = `https://t.me/ethiopia_date_bot?start=ref_${uid}`;
        showP9Modal(`
            <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:10px;">
                <h3 style="margin:0;font-size:17px;font-weight:800;">🤝 Wingman Double-VIP Pass</h3>
                <button onclick="document.getElementById('p9-modal-root').remove()" style="background:#F1F5F9;border:none;border-radius:999px;width:30px;height:30px;font-weight:800;cursor:pointer;">✕</button>
            </div>
            <p style="font-size:12.5px;color:#475569;line-height:1.5;margin-top:0;">
                Invite one trusted friend as your <b>Wingman</b>. Both of you immediately unlock:
                <br>• <b>72 Hours of Full Habesha VIP</b>
                <br>• <b>"Verified by a Friend"</b> trust badge on your card
            </p>
            <div style="background:#FFF7ED;border:1px solid #FED7AA;padding:10px;border-radius:12px;font-size:11px;word-break:break-all;margin:10px 0;color:#9A3412;font-weight:700;">
                ${link}
            </div>
            <div style="display:flex;gap:8px;">
                <button id="p9-copy-wingman" style="flex:1;padding:11px;border-radius:14px;border:none;background:#FF7A1A;color:#fff;font-weight:800;font-size:12px;cursor:pointer;">
                    📋 Copy Link
                </button>
                <button id="p9-share-wingman" style="flex:1;padding:11px;border-radius:14px;border:none;background:#FF477E;color:#fff;font-weight:800;font-size:12px;cursor:pointer;">
                    🚀 Send on Telegram
                </button>
            </div>
            <hr style="border-color:#F1F5F9;margin:14px 0;">
            <label style="font-size:11px;color:#64748B;font-weight:700;">Have your friend's Telegram ID? Link directly:</label>
            <div style="display:flex;gap:6px;margin-top:6px;">
                <input id="p9-wingman-input" type="number" placeholder="Friend's Telegram ID" style="flex:1;padding:10px;border-radius:12px;border:1px solid #CBD5E1;font-size:12px;">
                <button id="p9-wingman-submit" style="padding:10px 14px;border-radius:12px;border:none;background:#10B981;color:#fff;font-weight:800;font-size:12px;cursor:pointer;">
                    Activate 72h VIP
                </button>
            </div>
        `);

        document.getElementById("p9-copy-wingman").onclick = () => {
            navigator.clipboard.writeText(link);
            if (typeof showAlert === "function") showAlert("✅ Wingman invite link copied!");
        };
        document.getElementById("p9-share-wingman").onclick = () => shareVibeCardToStory();
        document.getElementById("p9-wingman-submit").onclick = async () => {
            const friendId = Number(document.getElementById("p9-wingman-input").value);
            if (!friendId) return alert("Enter your friend's numeric Telegram ID");
            const res = await fetch(`${API_BASE}/api/phase9/wingman-link`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ inviter_id: uid, friend_id: friendId })
            }).then(r => r.json()).catch(() => ({ ok: false }));
            if (typeof showAlert === "function") showAlert(res.message || "🤝 Wingman Pass processed!");
            if (res.ok) document.getElementById("p9-modal-root")?.remove();
        };
    }

    async function openHotTakesModal() {
        document.getElementById("p8-lounge-modal")?.classList.add("hidden");
        const uid = getUserId();
        showP9Modal(`<div style="text-align:center;padding:24px;font-weight:700;">Loading Tidar & Culture Hot-Takes... ☕</div>`);
        const data = await fetch(`${API_BASE}/api/phase9/hot-takes/${uid}`).then(r => r.json()).catch(() => ({ polls: [] }));
        const polls = data.polls || [];
        const curLang = typeof currentLang !== "undefined" ? currentLang : STATE.lang;

        const htmlPolls = polls.map(p => {
            const q = curLang === "am" ? p.question_am : p.question_en;
            const optA = curLang === "am" ? p.option_a_am : p.option_a_en;
            const optB = curLang === "am" ? p.option_b_am : p.option_b_en;
            return `
                <div style="background:#FFF7ED;border-radius:16px;padding:12px;margin-bottom:10px;border:1px solid #FED7AA;">
                    <div style="font-size:13px;font-weight:800;margin-bottom:8px;color:#231610;">${q}</div>
                    <div style="display:flex;flex-direction:column;gap:6px;">
                        <button class="p9-vote-btn" data-poll="${p.id}" data-choice="A" style="padding:10px;border-radius:12px;border:2px solid ${p.my_choice === 'A' ? '#FF7A1A' : '#E2E8F0'};background:#fff;color:#231610;text-align:left;font-size:12px;font-weight:700;cursor:pointer;display:flex;justify-content:space-between;">
                            <span>${optA}</span>
                            <b style="color:#FF7A1A;">${p.pct_a}%</b>
                        </button>
                        <button class="p9-vote-btn" data-poll="${p.id}" data-choice="B" style="padding:10px;border-radius:12px;border:2px solid ${p.my_choice === 'B' ? '#FF7A1A' : '#E2E8F0'};background:#fff;color:#231610;text-align:left;font-size:12px;font-weight:700;cursor:pointer;display:flex;justify-content:space-between;">
                            <span>${optB}</span>
                            <b style="color:#FF477E;">${p.pct_b}%</b>
                        </button>
                    </div>
                    <div style="font-size:10.5px;color:#64748B;margin-top:6px;font-weight:600;">
                        ${p.total_votes} votes • Vote to see members who agree with you!
                    </div>
                </div>
            `;
        }).join("");

        showP9Modal(`
            <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:12px;">
                <h3 style="margin:0;font-size:17px;font-weight:800;">🔥 ${t("hotTakes")}</h3>
                <button onclick="document.getElementById('p9-modal-root').remove()" style="background:#F1F5F9;border:none;border-radius:999px;width:30px;height:30px;font-weight:800;cursor:pointer;">✕</button>
            </div>
            <div id="p9-hot-takes-list">${htmlPolls || "<p style='font-size:12px;color:#64748B;'>No active polls right now.</p>"}</div>
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
                            <div style="padding:10px;background:#ECFDF5;border:1px solid #10B981;border-radius:12px;font-size:12px;color:#065F46;">
                                ✨ <b>Agreed with your take:</b> ${res.same_opinion_matches.map(m => `${m.name} (${m.age || 24})`).join(", ")}
                            </div>
                        `;
                    }
                } else {
                    openHotTakesModal();
                }
            };
        });
    }

    async function recycleStackNow() {
        document.getElementById("p8-lounge-modal")?.classList.add("hidden");
        const uid = getUserId();
        try {
            await fetch(`${API_BASE}/api/phase9/recycle-stack/${uid}`).catch(() => {});
            const freshRes = await fetch(`${API_BASE}/api/get-potential-matches/${uid}?mode=all`).then(r => r.json()).catch(() => ({}));
            const list = freshRes.matches || [];
            if (list.length > 0) {
                window.allProfiles = list;
                window.profiles = list;
                window.currentCardIndex = 0;
                window.currentPhotoSlideIndex = 0;
                if (typeof window.renderCards === "function") window.renderCards();
                return;
            }
            if (typeof window.loadDiscoverProfiles === "function") {
                await window.loadDiscoverProfiles();
            }
        } catch (e) {
            if (typeof window.loadDiscoverProfiles === "function") {
                await window.loadDiscoverProfiles();
            }
        }
    }

    function bindShowAllProfilesOverride() {
        document.addEventListener("click", async (e) => {
            const btn = e.target.closest("button");
            if (!btn) return;
            const txt = (btn.textContent || "").trim().toLowerCase();
            if (txt.includes("show all profiles") || txt.includes("recycle passed profiles")) {
                e.preventDefault();
                e.stopPropagation();
                const orig = btn.innerHTML;
                btn.innerHTML = "♻️ Restoring Profiles...";
                btn.disabled = true;
                await recycleStackNow();
                btn.innerHTML = orig;
                btn.disabled = false;
            }
        }, true);
    }

    function openAnthemPickerModal() {
        document.getElementById("p8-lounge-modal")?.classList.add("hidden");
        const uid = getUserId();
        const rows = Object.entries(ANTHEM_SCALES).map(([key, item]) => `
            <div style="display:flex;align-items:center;justify-content:space-between;background:#FFF7ED;padding:10px 12px;border-radius:14px;margin-bottom:8px;border:2px solid ${STATE.anthem === key ? '#FF7A1A' : '#FED7AA'};">
                <span style="font-size:12px;font-weight:800;">${item.name}</span>
                <div style="display:flex;gap:6px;">
                    <button class="p9-preview-anthem" data-key="${key}" style="padding:6px 10px;border-radius:10px;border:1px solid #CBD5E1;background:#fff;color:#231610;font-size:11px;font-weight:700;cursor:pointer;">▶ Listen</button>
                    <button class="p9-save-anthem" data-key="${key}" style="padding:6px 10px;border-radius:10px;border:none;background:#FF7A1A;color:#fff;font-weight:800;font-size:11px;cursor:pointer;">Select</button>
                </div>
            </div>
        `).join("");

        showP9Modal(`
            <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:10px;">
                <h3 style="margin:0;font-size:17px;font-weight:800;">🎷 Acoustic Profile Anthem</h3>
                <button onclick="document.getElementById('p9-modal-root').remove()" style="background:#F1F5F9;border:none;border-radius:999px;width:30px;height:30px;font-weight:800;cursor:pointer;">✕</button>
            </div>
            <p style="font-size:12px;color:#64748B;margin-top:0;">Pick a 0-data synthesized Ethiopian instrumental vibe for your profile:</p>
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
                document.getElementById("p9-modal-root")?.remove();
                if (typeof showAlert === "function") showAlert(`🎷 Profile Anthem set to ${ANTHEM_SCALES[key].name}!`);
            };
        });
    }

    function openExpressOnboardingModal() {
        document.getElementById("p8-lounge-modal")?.classList.add("hidden");
        const uid = getUserId();
        showP9Modal(`
            <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:10px;">
                <h3 style="margin:0;font-size:17px;font-weight:800;">⚡ Profile Completion Reward</h3>
                <button onclick="document.getElementById('p9-modal-root').remove()" style="background:#F1F5F9;border:none;border-radius:999px;width:30px;height:30px;font-weight:800;cursor:pointer;">✕</button>
            </div>
            <div style="margin-bottom:14px;">
                <div style="display:flex;justify-content:space-between;font-size:11.5px;color:#FF7A1A;font-weight:800;">
                    <span>${t("completePrompt")}</span>
                    <b>${STATE.completionPct}%</b>
                </div>
                <div class="p9-pill-progress"><div class="p9-pill-fill" style="width:${STATE.completionPct}%"></div></div>
            </div>
            <button id="p9-exp-claim" style="width:100%;padding:12px;border-radius:14px;border:none;background:linear-gradient(90deg,#FF7A1A,#FF477E);color:#fff;font-weight:800;font-size:13px;cursor:pointer;">
                🌹 Claim +1 Free Golden Rose Reward
            </button>
        `);

        document.getElementById("p9-exp-claim").onclick = async () => {
            const reward = await fetch(`${API_BASE}/api/phase9/claim-completion-reward/${uid}`, { method: "POST" }).then(r => r.json()).catch(() => ({}));
            document.getElementById("p9-modal-root")?.remove();
            if (typeof showAlert === "function") showAlert(reward.message || "🌹 Completion reward checked!");
            if (typeof refreshProfileStats === "function") refreshProfileStats();
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

    // Android APK Bi-Directional Touch-Scroll Unlocker (Fixes downward drag lock!)
    function unlockAndroidApkWebViewScroll(loungeModal, innerCard) {
        if (!loungeModal || !innerCard) return;

        // 1. Disable Android native pull-to-refresh & outer container scrolling so ONLY innerCard scrolls
        document.documentElement.style.overscrollBehaviorY = "none";
        document.body.style.overscrollBehaviorY = "none";

        loungeModal.style.overflow = "hidden";
        loungeModal.style.touchAction = "none";
        loungeModal.style.alignItems = "center";
        loungeModal.style.padding = "12px";

        // 2. Make innerCard the single, dedicated block scroll container
        innerCard.classList.remove("overflow-hidden", "max-h-[85dvh]", "no-scrollbar");
        innerCard.style.display = "block";
        innerCard.style.height = "82vh";
        innerCard.style.maxHeight = "82vh";
        innerCard.style.overflowY = "scroll";
        innerCard.style.overflowX = "hidden";
        innerCard.style.webkitOverflowScrolling = "touch";
        innerCard.style.touchAction = "pan-y";
        innerCard.style.overscrollBehaviorY = "contain";
        innerCard.style.paddingBottom = "64px";

        // 3. Inject 1-Tap ▲ Up / ▼ Down helper buttons in the sticky Lounge header for instant Android navigation
        const headerRow = innerCard.querySelector(".sticky");
        if (headerRow && !headerRow.querySelector("#p9-apk-scroll-btns")) {
            const closeBtn = headerRow.querySelector("button");
            const navWrap = document.createElement("div");
            navWrap.id = "p9-apk-scroll-btns";
            navWrap.style.cssText = "display:flex;align-items:center;gap:6px;";
            navWrap.innerHTML = `
                <button type="button" id="p9-scroll-up-btn" style="width:30px;height:30px;border-radius:999px;border:1px solid #FED7AA;background:#FFF7ED;color:#FF7A1A;font-weight:800;font-size:12px;">▲</button>
                <button type="button" id="p9-scroll-down-btn" style="width:30px;height:30px;border-radius:999px;border:1px solid #FED7AA;background:#FFF7ED;color:#FF7A1A;font-weight:800;font-size:12px;">▼</button>
            `;
            if (closeBtn) {
                headerRow.insertBefore(navWrap, closeBtn);
                navWrap.appendChild(closeBtn);
            } else {
                headerRow.appendChild(navWrap);
            }
            const upBtn = navWrap.querySelector("#p9-scroll-up-btn");
            const downBtn = navWrap.querySelector("#p9-scroll-down-btn");
            if (upBtn) upBtn.onclick = () => innerCard.scrollBy({ top: -240, behavior: "smooth" });
            if (downBtn) downBtn.onclick = () => innerCard.scrollBy({ top: 240, behavior: "smooth" });
        }

        // 4. Explicit Bi-Directional Touch-Drag Engine (Guarantees both upward & downward scrolling on Android APK!)
        if (!innerCard.dataset.apkScrollBound) {
            innerCard.dataset.apkScrollBound = "1";
            let startY = 0;
            let startScrollTop = 0;

            innerCard.addEventListener("touchstart", (e) => {
                e.stopPropagation();
                if (e.touches && e.touches.length === 1) {
                    startY = e.touches[0].clientY;
                    startScrollTop = innerCard.scrollTop;
                }
            }, { passive: true });

            innerCard.addEventListener("touchmove", (e) => {
                e.stopPropagation();
                if (!e.touches || e.touches.length !== 1) return;
                const currentY = e.touches[0].clientY;
                const deltaY = startY - currentY; // >0 finger moves up (scroll down), <0 finger moves down (scroll up)

                // If user drags finger downward (deltaY < 0), prevent Android WebView pull-to-refresh from locking it!
                if (e.cancelable) {
                    e.preventDefault();
                }
                innerCard.scrollTop = startScrollTop + deltaY;
            }, { passive: false });
        }
    }

    async function bustAndroidApkServiceWorkerCacheOnce() {
        try {
            const APK_SW_VERSION = "v18_bidirectional_scroll_fix";
            if (localStorage.getItem("hd_apk_sw_ver") === APK_SW_VERSION) return;
            localStorage.setItem("hd_apk_sw_ver", APK_SW_VERSION);

            if ("caches" in window) {
                const keys = await caches.keys();
                await Promise.all(keys.map((k) => caches.delete(k)));
            }
            if ("serviceWorker" in navigator) {
                const regs = await navigator.serviceWorker.getRegistrations();
                for (const reg of regs) {
                    await reg.update().catch(() => {});
                }
            }
        } catch (e) {}
    }

    // Strictly inject ONLY inside the popup `#p8-lounge-modal` (never inside `#top-lounge-btn`!)
    function injectIntoLoungeModalStrict() {
        const loungeModal = document.getElementById("p8-lounge-modal");
        if (!loungeModal) return;
        const innerCard = loungeModal.firstElementChild;
        if (!innerCard) return;

        // Unlock Android APK WebView scrolling
        unlockAndroidApkWebViewScroll(loungeModal, innerCard);

        if (innerCard.querySelector("#p9-lounge-section")) return;

        const sec = document.createElement("div");
        sec.id = "p9-lounge-section";
        sec.style.marginTop = "12px";
        sec.style.paddingTop = "12px";
        sec.style.borderTop = "1px solid #FED7AA";
        sec.innerHTML = `
            <div style="font-size:10px;font-weight:800;color:#FF7A1A;text-transform:uppercase;letter-spacing:0.06em;margin-bottom:6px;text-align:left;">
                🚀 Phase 9 • Viral, Anthems & Hot-Takes
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
        innerCard.appendChild(sec);
    }

    async function initPhase9() {
        bustAndroidApkServiceWorkerCacheOnce();
        injectPhase9Styles();
        cleanHeaderLoungeButton();
        bindShowAllProfilesOverride();
        setTimeout(injectIntoLoungeModalStrict, 600);

        // Also re-apply Android scroll unlock whenever ✨ Lounge is tapped
        document.addEventListener("click", (e) => {
            if (e.target.closest("#top-lounge-btn")) {
                setTimeout(injectIntoLoungeModalStrict, 50);
            }
        }, true);

        try {
            const uid = getUserId();
            const res = await fetch(`${API_BASE}/api/phase9/status/${uid}`).then(r => r.json());
            if (res && res.status === "ok") {
                STATE.bunaHour = res.buna_hour || STATE.bunaHour;
                STATE.completionPct = res.completion_pct || 60;
                STATE.rewardClaimed = res.completion_reward_claimed || false;
                if (res.anthem_vibe) STATE.anthem = res.anthem_vibe;
            }
        } catch (e) {}
    }

    window.HabeshaPhase9 = {
        state: STATE,
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
