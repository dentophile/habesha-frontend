/**
 * Habesha Date (ሀበሻ ቀጠሮ ❤️) — Phase 6+ Next-Horizon Engine
 * Place this file as `phase6_features.js` in the same folder as `index.html` on GitHub Pages.
 *
 * Powers all 8 Next-Horizon Features:
 * 1. 🔒 Modest / Private Photo Blur Until Mutual Match
 * 2. 🗣️ Ethiopian Languages Spoken & Addis Sub-City / Campus Multi-Pills
 * 3. 📞 Masked 3-Minute "Buna Voice Call" (Peer-to-Peer WebRTC Audio)
 * 4. ⏰ "Live Buna Hour" 3-Minute Blind Speed-Matching Mixer
 * 5. 🎲 Interactive 2-Player Chat Games (Habesha Rapid-Fire & 2 Truths + 1 Lie)
 * 6. 👀 "Who Viewed My Profile & Voice Bio" Visitors Vault
 * 7. ⚡ Zero-Lag WebSockets Realtime Engine (<50ms Chat, Calls, Mixer & Games)
 * 8. 🔄 Android APK Auto-Update Build Version Cache Buster
 */

(function () {
    "use strict";

    // --- STATE VARIABLES ---
    let realtimeSocket = null;
    let wsHeartbeatTimer = null;
    let wsReconnectTimer = null;

    // WebRTC Masked 3-Minute Buna Voice Call State
    let peerConnection = null;
    let localAudioStream = null;
    let callPartnerId = null;
    let incomingOfferPayload = null;
    let callSecondsLeft = 180;
    let callCountdownTimer = null;
    let callSignalPollTimer = null;
    let isMicMuted = false;

    const RTC_CONFIG = {
        iceServers: [
            { urls: "stun:stun.l.google.com:19302" },
            { urls: "stun:stun1.l.google.com:19302" }
        ]
    };

    // Live Buna Hour 3-Minute Speed-Mixer State
    let mixerPollTimer = null;
    let mixerOpen = false;
    let currentMixerPartner = null;

    // =========================================================================
    // FEATURE 8: ANDROID APK AUTO-UPDATE BUILD VERSION CHECK & LIVE BUNA BADGE
    // =========================================================================
    async function checkAppBuildVersionAndBunaHour() {
        try {
            const res = await fetch(`${BACKEND_URL}/api/app-version`, { cache: "no-store" });
            if (!res.ok) return;
            const data = await res.json();
            const serverVer = String(data.version || "").trim();

            const footerEl = document.getElementById("app-build-version-footer");
            if (footerEl && serverVer) {
                footerEl.innerText = `Habesha Date • Build ${serverVer}`;
            }

            // Highlight the Live Buna Mixer pill during evening Buna Hour (8:00–9:30 PM EAT)
            const mixerBtn = document.getElementById("btn-top-mixer");
            if (mixerBtn && data.is_live_buna_hour) {
                mixerBtn.classList.add("ring-2", "ring-emerald-400", "animate-pulse");
            }

            if (serverVer) {
                const cachedVer = safeStorageGet("habesha_cached_build_ver", "");
                if (cachedVer && cachedVer !== serverVer && !window.location.search.includes(`_bv=${serverVer}`)) {
                    safeStorageSet("habesha_cached_build_ver", serverVer);
                    const url = new URL(window.location.href);
                    url.searchParams.set("_bv", serverVer);
                    window.location.replace(url.toString());
                    return;
                }
                safeStorageSet("habesha_cached_build_ver", serverVer);
            }
        } catch (err) {
            // Non-blocking check
        }
    }

    // =========================================================================
    // FEATURE 7: ZERO-LAG WEBSOCKET REALTIME ENGINE (<50ms Instant Delivery)
    // =========================================================================
    function connectRealtimeWebSocket() {
        if (!cleanTelegramId || cleanTelegramId === "guest" || cleanTelegramId === "undefined") {
            return;
        }
        if (realtimeSocket && (realtimeSocket.readyState === WebSocket.OPEN || realtimeSocket.readyState === WebSocket.CONNECTING)) {
            return;
        }

        const wsBase = BACKEND_URL.replace(/^http/, "ws");
        const wsUrl = `${wsBase}/ws/realtime/${encodeURIComponent(cleanTelegramId)}`;

        try {
            realtimeSocket = new WebSocket(wsUrl);

            realtimeSocket.onopen = () => {
                if (wsHeartbeatTimer) clearInterval(wsHeartbeatTimer);
                wsHeartbeatTimer = setInterval(() => {
                    if (realtimeSocket && realtimeSocket.readyState === WebSocket.OPEN) {
                        realtimeSocket.send("ping");
                    }
                }, 24000);
            };

            realtimeSocket.onmessage = (event) => {
                try {
                    const pkt = JSON.parse(event.data);
                    handleRealtimePacket(pkt);
                } catch (e) {}
            };

            realtimeSocket.onclose = () => {
                if (wsHeartbeatTimer) clearInterval(wsHeartbeatTimer);
                if (wsReconnectTimer) clearTimeout(wsReconnectTimer);
                wsReconnectTimer = setTimeout(connectRealtimeWebSocket, 4500);
            };
        } catch (err) {}
    }

    function handleRealtimePacket(pkt) {
        if (!pkt || !pkt.type) return;

        switch (pkt.type) {
            case "new_message":
            case "message_edited":
            case "message_deleted":
            case "message_reacted":
            case "messages_read":
            case "game_updated":
                if (activeChatId && (String(pkt.sender_id || "") === String(activeChatId) || pkt.type !== "new_message")) {
                    const partnerName = document.getElementById("chat-header-name")?.innerText || "Match";
                    loadChatHistory(activeChatId, partnerName, true);
                }
                pollUnreadBadges();
                break;

            case "typing":
                if (activeChatId && String(pkt.sender_id) === String(activeChatId)) {
                    const statusEl = document.getElementById("chat-header-status");
                    if (statusEl) {
                        statusEl.innerHTML = `<span class="text-botOrange font-bold animate-pulse">💬 typing...</span>`;
                    }
                }
                break;

            case "new_match":
                triggerHaptic("success");
                pollUnreadBadges();
                break;

            case "profile_viewed":
                if (window.myProfileData) {
                    window.myProfileData.views_count = (parseInt(window.myProfileData.views_count || 0, 10) + 1);
                    const vb = document.getElementById("my-views-count-badge");
                    if (vb) vb.innerText = `👀 ${window.myProfileData.views_count} Views`;
                    const mp = document.getElementById("matches-views-count-pill");
                    if (mp) mp.innerText = `👀 ${window.myProfileData.views_count}`;
                }
                break;

            case "webrtc_signal":
                handleIncomingWebRTCSignal(pkt);
                break;

            case "mixer_paired":
            case "mixer_message":
            case "mixer_matched":
                if (mixerOpen) pollBunaMixerState();
                break;

            case "mixer_ended":
                if (mixerOpen) {
                    showAlert("☕ Your speed-date partner left the lounge. Tap Mixer again to meet someone new!");
                    closeBunaMixerUIOnly();
                }
                break;
        }
    }

    // =========================================================================
    // FEATURE 1 & 2: MODEST PHOTO BLUR & ETHIOPIAN LANGUAGE MULTI-PILLS
    // =========================================================================
    window.toggleSpokenLangPill = function (btnEl) {
        if (!btnEl) return;
        triggerHaptic("selection");
        const isSelected = btnEl.getAttribute("data-selected") === "true";
        if (isSelected) {
            btnEl.setAttribute("data-selected", "false");
            btnEl.className = "px-2.5 py-1 rounded-full text-[11px] font-bold bg-white text-gray-600 border border-gray-200 transition";
        } else {
            btnEl.setAttribute("data-selected", "true");
            btnEl.className = "px-2.5 py-1 rounded-full text-[11px] font-extrabold bg-gradient-to-r from-botOrange to-habeshaCoral text-white border border-transparent shadow-sm transition";
        }
        syncHiddenSpokenLanguages();
    };

    function syncHiddenSpokenLanguages() {
        const container = document.getElementById("reg-languages-pills");
        const hiddenInput = document.getElementById("reg-languages-spoken");
        if (!container || !hiddenInput) return;
        const chosen = [];
        container.querySelectorAll("button[data-lang]").forEach((b) => {
            if (b.getAttribute("data-selected") === "true") {
                chosen.push(b.getAttribute("data-lang"));
            }
        });
        hiddenInput.value = chosen.join(", ");
    }

    window.setSpokenLangPillsFromCSV = function (csvStr) {
        const container = document.getElementById("reg-languages-pills");
        const hiddenInput = document.getElementById("reg-languages-spoken");
        if (!container || !hiddenInput) return;
        const activeSet = new Set(
            String(csvStr || "")
                .split(",")
                .map((s) => s.trim().toLowerCase())
                .filter(Boolean)
        );
        container.querySelectorAll("button[data-lang]").forEach((b) => {
            const lang = (b.getAttribute("data-lang") || "").toLowerCase();
            if (activeSet.has(lang)) {
                b.setAttribute("data-selected", "true");
                b.className = "px-2.5 py-1 rounded-full text-[11px] font-extrabold bg-gradient-to-r from-botOrange to-habeshaCoral text-white border border-transparent shadow-sm transition";
            } else {
                b.setAttribute("data-selected", "false");
                b.className = "px-2.5 py-1 rounded-full text-[11px] font-bold bg-white text-gray-600 border border-gray-200 transition";
            }
        });
        syncHiddenSpokenLanguages();
    };

    window.toggleMyModestBlur = async function () {
        if (isGuestMode) return openGuestSignupModal();
        const curState = Boolean(window.myProfileData && window.myProfileData.blur_photos_until_match);
        const nextState = !curState;
        triggerHaptic("medium");
        try {
            const res = await fetch(`${BACKEND_URL}/api/toggle-blur-photos`, {
                method: "POST",
                headers: getAuthHeaders(true),
                body: JSON.stringify({
                    telegram_id: cleanTelegramId,
                    blur_photos_until_match: nextState
                })
            });
            if (!res.ok) throw new Error("Could not update Modest Mode.");
            if (window.myProfileData) window.myProfileData.blur_photos_until_match = nextState;

            const lbl = document.getElementById("modest-blur-btn-label");
            if (lbl) lbl.innerText = nextState ? "🔒 Modest Photo Blur: ON" : "Modest Photo Blur: OFF";

            showAlert(
                nextState
                    ? "🔒 Modest Mode ON! Your photos are now frosted on Discover and automatically unblur only for people you mutually match with."
                    : "✨ Modest Mode OFF! Your clear photos are visible on Discover again."
            );
        } catch (err) {
            showAlert(err.message || "Could not toggle Modest Mode.");
        }
    };

    // =========================================================================
    // FEATURE 6: "WHO VIEWED MY PROFILE & VOICE BIO" VAULT
    // =========================================================================
    window.recordProfileView = function (viewedId, viewType = "profile") {
        if (!cleanTelegramId || isGuestMode || cleanTelegramId === "guest" || !viewedId) return;
        if (String(cleanTelegramId) === String(viewedId)) return;
        fetch(`${BACKEND_URL}/api/record-view`, {
            method: "POST",
            headers: getAuthHeaders(true),
            body: JSON.stringify({
                viewer_id: String(cleanTelegramId),
                viewed_id: String(viewedId),
                view_type: viewType
            })
        }).catch(() => {});
    };

    window.openProfileViewsModal = async function () {
        if (isGuestMode) return openGuestSignupModal();
        triggerHaptic("light");
        const modal = document.getElementById("profile-views-modal");
        const listEl = document.getElementById("views-vault-list");
        const upsellEl = document.getElementById("views-vault-upsell");
        if (!modal || !listEl) return;

        modal.classList.remove("hidden");
        listEl.innerHTML = `<div class="flex justify-center py-8"><i class="ph ph-spinner animate-spin text-2xl text-premium"></i></div>`;

        try {
            const res = await fetch(`${BACKEND_URL}/api/profile-views/${encodeURIComponent(cleanTelegramId)}`);
            const data = await res.json();
            const visitors = data.visitors || [];
            const unlocked = Boolean(data.unlocked);

            if (upsellEl) {
                upsellEl.classList.toggle("hidden", unlocked || visitors.length === 0);
            }

            if (visitors.length === 0) {
                listEl.innerHTML = `
                    <div class="text-center py-6 px-3">
                        <div class="w-12 h-12 mx-auto mb-2 rounded-2xl bg-purple-50 text-premium flex items-center justify-center">
                            <i class="ph-duotone ph-eye text-2xl"></i>
                        </div>
                        <p class="text-xs font-extrabold text-buna">No Profile Views Yet Today</p>
                        <p class="text-[11px] text-gray-500 mt-1">Post a 24h Story or vote on ☕ Buna Poll to appear at the top of Discover!</p>
                    </div>
                `;
                return;
            }

            listEl.innerHTML = visitors.map((v) => {
                const ageGen = formatAgeGender(v.age, v.gender);
                if (unlocked && v.telegram_id) {
                    const safeName = (v.name || "Match").replace(/'/g, "\\'");
                    return `
                        <div onclick="jumpFromViewsVault('${v.telegram_id}')" class="p-3 bg-purple-50/50 border border-purple-100 rounded-2xl flex items-center justify-between gap-3 cursor-pointer active:scale-[0.98] transition">
                            <div class="flex items-center gap-3 min-w-0">
                                <div class="w-12 h-12 rounded-2xl bg-cover bg-center border-2 border-premium shrink-0 relative" style="background-image:url('${v.photo_url || DEFAULT_AVATAR}')">
                                    ${v.is_online ? `<span class="absolute -bottom-0.5 -right-0.5 w-3 h-3 bg-emerald-500 border-2 border-white rounded-full"></span>` : ""}
                                </div>
                                <div class="min-w-0 text-left">
                                    <p class="text-xs font-extrabold text-buna truncate">${safeName}, ${ageGen}</p>
                                    <p class="text-[10px] text-premium font-bold">${v.badge_label} • 📍 ${v.location || "Ethiopia"}</p>
                                </div>
                            </div>
                            <span class="px-2.5 py-1 bg-white border border-purple-200 rounded-full text-[10px] font-extrabold text-premium shrink-0">View Card</span>
                        </div>
                    `;
                } else {
                    return `
                        <div onclick="unlockViewsWithRose()" class="p-3 bg-gray-50 border border-gray-200/80 rounded-2xl flex items-center justify-between gap-3 cursor-pointer">
                            <div class="flex items-center gap-3 min-w-0">
                                <div class="w-12 h-12 rounded-2xl overflow-hidden border border-purple-200 shrink-0">
                                    <div class="w-full h-full bg-cover bg-center blur-premium" style="background-image:url('${v.photo_url || DEFAULT_AVATAR}')"></div>
                                </div>
                                <div class="min-w-0 text-left">
                                    <p class="text-xs font-extrabold text-buna">Someone (${ageGen})</p>
                                    <p class="text-[10px] text-premium font-bold">${v.badge_label} • 📍 ${v.location || "Ethiopia"}</p>
                                </div>
                            </div>
                            <span class="px-2.5 py-1 bg-amber-50 border border-amber-200 rounded-full text-[10px] font-extrabold text-amber-800 shrink-0">🔒 Reveal</span>
                        </div>
                    `;
                }
            }).join("");
        } catch (err) {
            listEl.innerHTML = `<p class="text-xs text-red-500 text-center py-4">Could not load visitors right now.</p>`;
        }
    };

    window.closeProfileViewsModal = function () {
        document.getElementById("profile-views-modal")?.classList.add("hidden");
    };

    window.jumpFromViewsVault = async function (targetId) {
        closeProfileViewsModal();
        pendingCrushId = targetId;
        switchTab("swipe");
        await loadDiscoverProfiles();
    };

    window.unlockViewsWithRose = async function () {
        triggerHaptic("medium");
        try {
            const res = await fetch(`${BACKEND_URL}/api/unlock-profile-views`, {
                method: "POST",
                headers: getAuthHeaders(true),
                body: JSON.stringify({ telegram_id: cleanTelegramId })
            });
            const data = await res.json();
            if (!res.ok) {
                closeProfileViewsModal();
                openPremiumModal("stars");
                showAlert(data.detail || "🌹 You need 1 Golden Rose or Habesha VIP to reveal your Profile Visitors!");
                return;
            }
            if (window.myProfileData && data.golden_roses !== undefined) {
                window.myProfileData.golden_roses = data.golden_roses;
                updateSwipesRemainingUI();
            }
            triggerHaptic("success");
            await window.openProfileViewsModal();
        } catch (err) {
            showAlert("Could not unlock visitors vault right now.");
        }
    };

    // =========================================================================
    // FEATURE 5: INTERACTIVE 2-PLAYER CHAT GAMES (RAPID-FIRE & 2 TRUTHS + 1 LIE)
    // =========================================================================
    window.openChatGameModal = function () {
        if (!activeChatId) return;
        triggerHaptic("light");
        document.getElementById("chat-game-modal")?.classList.remove("hidden");
    };

    window.closeChatGameModal = function () {
        document.getElementById("chat-game-modal")?.classList.add("hidden");
    };

    window.switchGameModalTab = function (tab) {
        const isRapid = tab === "rapid";
        document.getElementById("game-panel-rapid")?.classList.toggle("hidden", !isRapid);
        document.getElementById("game-panel-truths")?.classList.toggle("hidden", isRapid);
        const b1 = document.getElementById("tab-game-rapid");
        const b2 = document.getElementById("tab-game-truths");
        if (b1) b1.className = isRapid ? "w-1/2 py-2 rounded-xl bg-white text-buna shadow-sm transition" : "w-1/2 py-2 rounded-xl text-gray-500 transition";
        if (b2) b2.className = !isRapid ? "w-1/2 py-2 rounded-xl bg-white text-buna shadow-sm transition" : "w-1/2 py-2 rounded-xl text-gray-500 transition";
    };

    window.launchRapidFireGame = async function () {
        if (!activeChatId) return;
        triggerHaptic("medium");
        closeChatGameModal();
        try {
            await fetch(`${BACKEND_URL}/api/chat-game/start`, {
                method: "POST",
                headers: getAuthHeaders(true),
                body: JSON.stringify({
                    sender_id: cleanTelegramId,
                    receiver_id: activeChatId,
                    game_type: "rapid_fire"
                })
            });
            loadChatHistory(activeChatId, document.getElementById("chat-header-name")?.innerText || "Match", true);
        } catch (e) {
            showAlert("Could not start game card.");
        }
    };

    window.launchTwoTruthsGame = async function () {
        if (!activeChatId) return;
        const s0 = document.getElementById("truth-stmt-0")?.value.trim() || "";
        const s1 = document.getElementById("truth-stmt-1")?.value.trim() || "";
        const s2 = document.getElementById("truth-stmt-2")?.value.trim() || "";
        if (!s0 || !s1 || !s2) {
            return showAlert("Please fill in all 3 statements first!");
        }
        const checkedRadio = document.querySelector("input[name='truth-lie-idx']:checked");
        const lieIdx = checkedRadio ? parseInt(checkedRadio.value, 10) : 2;

        triggerHaptic("medium");
        closeChatGameModal();
        try {
            await fetch(`${BACKEND_URL}/api/chat-game/start`, {
                method: "POST",
                headers: getAuthHeaders(true),
                body: JSON.stringify({
                    sender_id: cleanTelegramId,
                    receiver_id: activeChatId,
                    game_type: "two_truths",
                    statements: [s0, s1, s2],
                    lie_index: lieIdx
                })
            });
            loadChatHistory(activeChatId, document.getElementById("chat-header-name")?.innerText || "Match", true);
        } catch (e) {
            showAlert("Could not send 2 Truths & 1 Lie card.");
        }
    };

    window.answerChatGameCard = async function (event, gameId, choiceVal) {
        if (event) event.stopPropagation();
        triggerHaptic("medium");
        try {
            const res = await fetch(`${BACKEND_URL}/api/chat-game/answer`, {
                method: "POST",
                headers: getAuthHeaders(true),
                body: JSON.stringify({
                    game_id: gameId,
                    telegram_id: cleanTelegramId,
                    choice: choiceVal
                })
            });
            const data = await res.json();
            if (data.status === "waiting_partner") {
                showAlert(data.message || "Waiting for your match to guess!");
                return;
            }
            if (activeChatId) {
                loadChatHistory(activeChatId, document.getElementById("chat-header-name")?.innerText || "Match", true);
            }
        } catch (e) {
            showAlert("Could not record game vote.");
        }
    };

    window.renderInteractiveGameBubble = function (msg) {
        try {
            const rawJson = (msg.content || "").replace("[HABESHA_GAME]", "");
            const g = JSON.parse(rawJson);
            const myAns = (g.answers || {})[cleanTelegramId];
            const isTwoTruths = g.game_type === "two_truths";
            const options = g.options || [];

            const buttonsHtml = options.map((opt, idx) => {
                const val = isTwoTruths ? String(idx) : opt;
                const safeVal = String(val).replace(/'/g, "\\'").replace(/"/g, "&quot;");
                const pickedByMe = myAns === val;
                return `
                    <button type="button" onclick="answerChatGameCard(event, '${g.game_id}', '${safeVal}')" class="w-full text-left px-3 py-2 rounded-xl text-xs font-extrabold border transition active:scale-95 ${
                        pickedByMe
                            ? "bg-amber-400 text-buna border-amber-500 shadow-sm"
                            : "bg-white/95 text-buna border-orange-200 hover:bg-orange-50"
                    }">
                        ${isTwoTruths ? `${idx + 1}. ` : "• "}${opt} ${pickedByMe ? "✓" : ""}
                    </button>
                `;
            }).join("");

            const footerHtml = g.completed
                ? `<div class="mt-2 p-2 rounded-xl bg-emerald-500 text-white text-[11px] font-extrabold text-center shadow-sm">${g.summary}</div>`
                : `<p class="mt-1.5 text-[10px] font-bold opacity-85 text-center">${
                      myAns ? "⏳ Waiting for partner's tap to reveal!" : "👆 Tap your pick secretly!"
                  }</p>`;

            return `
                <div class="w-56 sm:w-64 py-1 text-left" onclick="event.stopPropagation()">
                    <div class="text-[10px] font-extrabold uppercase tracking-wider opacity-90 mb-1 flex items-center gap-1">
                        <span>🎲 2-Player Icebreaker</span>
                    </div>
                    <p class="font-extrabold text-xs mb-2 leading-snug">${g.question || "Quick Vibe Check!"}</p>
                    <div class="space-y-1.5">${buttonsHtml}</div>
                    ${footerHtml}
                </div>
            `;
        } catch (err) {
            return `<span>🎲 Interactive Game Card</span>`;
        }
    };

    // =========================================================================
    // FEATURE 4: "LIVE BUNA HOUR" 3-MINUTE BLIND SPEED-MATCHING MIXER
    // =========================================================================
    window.openBunaMixerModal = async function () {
        if (isGuestMode) return openGuestSignupModal();
        triggerHaptic("medium");
        mixerOpen = true;
        document.getElementById("buna-mixer-modal")?.classList.remove("hidden");
        document.getElementById("mixer-waiting-box")?.classList.remove("hidden");
        const pairedBox = document.getElementById("mixer-paired-box");
        if (pairedBox) {
            pairedBox.classList.add("hidden");
            pairedBox.classList.remove("flex");
        }

        await pollBunaMixerState("join");
        if (mixerPollTimer) clearInterval(mixerPollTimer);
        mixerPollTimer = setInterval(() => pollBunaMixerState("join"), 2500);
    };

    function closeBunaMixerUIOnly() {
        mixerOpen = false;
        currentMixerPartner = null;
        if (mixerPollTimer) {
            clearInterval(mixerPollTimer);
            mixerPollTimer = null;
        }
        document.getElementById("buna-mixer-modal")?.classList.add("hidden");
    }

    window.leaveBunaMixer = async function () {
        closeBunaMixerUIOnly();
        if (!cleanTelegramId || isGuestMode) return;
        fetch(`${BACKEND_URL}/api/buna-mixer/action`, {
            method: "POST",
            headers: getAuthHeaders(true),
            body: JSON.stringify({ telegram_id: cleanTelegramId, action: "leave" })
        }).catch(() => {});
    };

    async function pollBunaMixerState(actionType = "join") {
        if (!mixerOpen || !cleanTelegramId) return;
        try {
            const res = await fetch(`${BACKEND_URL}/api/buna-mixer/action`, {
                method: "POST",
                headers: getAuthHeaders(true),
                body: JSON.stringify({ telegram_id: cleanTelegramId, action: actionType })
            });
            const data = await res.json();
            if (!res.ok) return;

            if (data.status === "waiting") {
                document.getElementById("mixer-waiting-box")?.classList.remove("hidden");
                const pBox = document.getElementById("mixer-paired-box");
                if (pBox) {
                    pBox.classList.add("hidden");
                    pBox.classList.remove("flex");
                }
                const wStat = document.getElementById("mixer-waiting-status");
                if (wStat) {
                    wStat.innerText = `Searching live singles (${data.waiting_count || 1} in lounge)... Photos stay frosted for the first 2m 30s!`;
                }
                return;
            }

            if (data.status === "paired" && data.partner) {
                currentMixerPartner = data.partner;
                document.getElementById("mixer-waiting-box")?.classList.add("hidden");
                const pBox = document.getElementById("mixer-paired-box");
                if (pBox) {
                    pBox.classList.remove("hidden");
                    pBox.classList.add("flex");
                }

                const photoEl = document.getElementById("mixer-partner-photo");
                if (photoEl) {
                    photoEl.style.backgroundImage = `url('${data.partner.photo_url || DEFAULT_AVATAR}')`;
                    photoEl.classList.toggle("blur-modest", !data.unblurred);
                }

                const titleEl = document.getElementById("mixer-partner-title");
                if (titleEl) {
                    const ageG = formatAgeGender(data.partner.age, data.partner.gender);
                    titleEl.innerText = data.unblurred
                        ? `${data.partner.name}, ${ageG} • ${data.partner.location}`
                        : `Mystery Habesha (${ageG}) • ${data.partner.location}`;
                }

                const hintEl = document.getElementById("mixer-unblur-hint");
                if (hintEl) {
                    hintEl.innerText = data.unblurred
                        ? "✨ Photos Unblurred!"
                        : "🔒 Photo unblurs in final 30s!";
                }

                const sec = Math.max(0, parseInt(data.seconds_left || 0, 10));
                const mm = String(Math.floor(sec / 60)).padStart(2, "0");
                const ss = String(sec % 60).padStart(2, "0");
                const cdEl = document.getElementById("mixer-countdown");
                if (cdEl) cdEl.innerText = `${mm}:${ss}`;

                const msgBox = document.getElementById("mixer-messages-box");
                if (msgBox) {
                    msgBox.innerHTML = (data.messages || []).map((m) => {
                        if (m.sender_id === "system") {
                            return `<div class="text-[11px] bg-amber-50 border border-amber-200 text-amber-900 font-bold p-2 rounded-xl text-center">${m.text}</div>`;
                        }
                        const mine = String(m.sender_id) === String(cleanTelegramId);
                        return `
                            <div class="flex ${mine ? "justify-end" : "justify-start"}">
                                <div class="px-3 py-1.5 rounded-2xl text-xs max-w-[82%] ${
                                    mine ? "bg-botOrange text-white" : "bg-white border border-gray-200 text-buna"
                                }">${m.text}</div>
                            </div>
                        `;
                    }).join("");
                    msgBox.scrollTop = msgBox.scrollHeight;
                }

                const keepBtn = document.getElementById("btn-mixer-keep");
                if (keepBtn) {
                    if (data.mutual_match) {
                        closeBunaMixerUIOnly();
                        showMatchCelebration(data.partner);
                        return;
                    }
                    if (data.i_kept) {
                        keepBtn.innerHTML = `<span>⏳ Waiting for Partner to Tap Keep...</span>`;
                    } else if (data.partner_kept) {
                        keepBtn.innerHTML = `<span>💖 Partner Kept You! Tap to Match Now!</span>`;
                    } else {
                        keepBtn.innerHTML = `<i class="ph-fill ph-heart text-sm"></i> <span>❤️ Keep Chatting & Unblur Match!</span>`;
                    }
                }
            }
        } catch (err) {}
    }

    window.sendBunaMixerMessage = async function () {
        const input = document.getElementById("mixer-chat-input");
        const txt = input?.value.trim() || "";
        if (!txt) return;
        input.value = "";
        await fetch(`${BACKEND_URL}/api/buna-mixer/action`, {
            method: "POST",
            headers: getAuthHeaders(true),
            body: JSON.stringify({ telegram_id: cleanTelegramId, action: "message", message: txt })
        });
        pollBunaMixerState("join");
    };

    window.voteKeepMixerPartner = async function () {
        triggerHaptic("success");
        await fetch(`${BACKEND_URL}/api/buna-mixer/action`, {
            method: "POST",
            headers: getAuthHeaders(true),
            body: JSON.stringify({ telegram_id: cleanTelegramId, action: "keep_chatting" })
        });
        pollBunaMixerState("join");
    };

    // =========================================================================
    // FEATURE 3: MASKED 3-MINUTE "BUNA VOICE CALL" (WEBRTC AUDIO)
    // =========================================================================
    async function sendWebRTCSignalToServer(receiverId, signalType, dataObj = {}) {
        try {
            await fetch(`${BACKEND_URL}/api/webrtc/signal`, {
                method: "POST",
                headers: getAuthHeaders(true),
                body: JSON.stringify({
                    sender_id: cleanTelegramId,
                    receiver_id: receiverId,
                    signal_type: signalType,
                    data: dataObj
                })
            });
        } catch (err) {}
    }

    function openCallOverlayUI(partnerName, partnerPhoto, isIncoming) {
        const modal = document.getElementById("webrtc-call-modal");
        const avatarEl = document.getElementById("call-partner-avatar");
        const nameEl = document.getElementById("call-partner-name");
        const statusEl = document.getElementById("call-status-label");
        const incActions = document.getElementById("call-incoming-actions");
        const actActions = document.getElementById("call-active-actions");
        const timerPill = document.getElementById("call-timer-pill");

        if (avatarEl) avatarEl.style.backgroundImage = `url('${partnerPhoto || DEFAULT_AVATAR}')`;
        if (nameEl) nameEl.innerText = partnerName || "Your Match";
        if (statusEl) statusEl.innerText = isIncoming ? "📞 Incoming 3-Min Buna Voice Call..." : "Calling privately (Number hidden)...";
        if (timerPill) timerPill.classList.add("hidden");

        if (isIncoming) {
            incActions?.classList.remove("hidden");
            incActions?.classList.add("flex");
            actActions?.classList.add("hidden");
            actActions?.classList.remove("flex");
        } else {
            incActions?.classList.add("hidden");
            incActions?.classList.remove("flex");
            actActions?.classList.remove("hidden");
            actActions?.classList.add("flex");
        }
        modal?.classList.remove("hidden");
    }

    function startThreeMinuteCallCountdown() {
        callSecondsLeft = 180;
        const timerPill = document.getElementById("call-timer-pill");
        const statusEl = document.getElementById("call-status-label");
        if (statusEl) statusEl.innerText = "🔒 Connected • Safe Masked Audio";
        if (timerPill) {
            timerPill.classList.remove("hidden");
            timerPill.innerText = "03:00";
        }
        if (callCountdownTimer) clearInterval(callCountdownTimer);
        callCountdownTimer = setInterval(() => {
            callSecondsLeft--;
            if (callSecondsLeft <= 0) {
                endMaskedVoiceCall(true);
                showAlert("☕ Your 3-Minute Buna Voice Call wrapped up! Keep chatting or start another call anytime.");
                return;
            }
            const m = String(Math.floor(callSecondsLeft / 60)).padStart(2, "0");
            const s = String(callSecondsLeft % 60).padStart(2, "0");
            if (timerPill) timerPill.innerText = `${m}:${s}`;
        }, 1000);
    }

    function createPeerConnection(partnerId) {
        const pc = new RTCPeerConnection(RTC_CONFIG);
        pc.onicecandidate = (e) => {
            if (e.candidate) {
                sendWebRTCSignalToServer(partnerId, "ice", { candidate: e.candidate });
            }
        };
        pc.ontrack = (e) => {
            const remoteAudio = document.getElementById("webrtc-remote-audio");
            if (remoteAudio && e.streams && e.streams[0]) {
                remoteAudio.srcObject = e.streams[0];
                remoteAudio.play().catch(() => {});
            }
        };
        pc.onconnectionstatechange = () => {
            if (pc.connectionState === "connected") {
                startThreeMinuteCallCountdown();
            } else if (pc.connectionState === "disconnected" || pc.connectionState === "failed") {
                endMaskedVoiceCall(false);
            }
        };
        return pc;
    }

    window.startMaskedVoiceCall = async function () {
        if (!activeChatId) return;
        if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
            return showAlert("Microphone calls require microphone permission in Telegram / browser.");
        }
        triggerHaptic("medium");
        callPartnerId = activeChatId;
        const pName = document.getElementById("chat-header-name")?.innerText || "Match";
        const bgStyle = document.getElementById("chat-header-photo")?.style.backgroundImage || "";
        const pPhoto = bgStyle.replace(/^url\(["']?/, "").replace(/["']?\)$/, "") || DEFAULT_AVATAR;

        try {
            localAudioStream = await navigator.mediaDevices.getUserMedia({ audio: true, video: false });
            openCallOverlayUI(pName, pPhoto, false);

            peerConnection = createPeerConnection(callPartnerId);
            localAudioStream.getTracks().forEach((track) => peerConnection.addTrack(track, localAudioStream));

            const offer = await peerConnection.createOffer();
            await peerConnection.setLocalDescription(offer);

            await sendWebRTCSignalToServer(callPartnerId, "ring", {
                sdp: offer,
                caller_name: window.myProfileData?.name || "Your Match",
                caller_photo: window.myProfileData?.photo_url || DEFAULT_AVATAR
            });
        } catch (err) {
            endMaskedVoiceCall(false);
            showAlert("🎙️ Please allow Microphone access to start a Masked Buna Voice Call.");
        }
    };

    window.acceptIncomingVoiceCall = async function () {
        if (!incomingOfferPayload || !callPartnerId) return;
        triggerHaptic("success");
        try {
            localAudioStream = await navigator.mediaDevices.getUserMedia({ audio: true, video: false });
            document.getElementById("call-incoming-actions")?.classList.add("hidden");
            const act = document.getElementById("call-active-actions");
            act?.classList.remove("hidden");
            act?.classList.add("flex");

            peerConnection = createPeerConnection(callPartnerId);
            localAudioStream.getTracks().forEach((track) => peerConnection.addTrack(track, localAudioStream));

            await peerConnection.setRemoteDescription(new RTCSessionDescription(incomingOfferPayload.sdp));
            const answer = await peerConnection.createAnswer();
            await peerConnection.setLocalDescription(answer);

            await sendWebRTCSignalToServer(callPartnerId, "answer", { sdp: answer });
            incomingOfferPayload = null;
        } catch (err) {
            endMaskedVoiceCall(true);
            showAlert("Could not access microphone to answer call.");
        }
    };

    window.toggleCallMute = function () {
        if (!localAudioStream) return;
        isMicMuted = !isMicMuted;
        localAudioStream.getAudioTracks().forEach((t) => {
            t.enabled = !isMicMuted;
        });
        const icon = document.getElementById("icon-call-mute");
        if (icon) {
            icon.className = isMicMuted ? "ph-fill ph-microphone-slash text-xl text-red-400" : "ph-fill ph-microphone text-xl";
        }
    };

    window.endMaskedVoiceCall = function (notifyPartner = true) {
        if (notifyPartner && callPartnerId) {
            sendWebRTCSignalToServer(callPartnerId, "hangup", {});
        }
        if (callCountdownTimer) {
            clearInterval(callCountdownTimer);
            callCountdownTimer = null;
        }
        if (peerConnection) {
            try { peerConnection.close(); } catch (e) {}
            peerConnection = null;
        }
        if (localAudioStream) {
            localAudioStream.getTracks().forEach((t) => t.stop());
            localAudioStream = null;
        }
        callPartnerId = null;
        incomingOfferPayload = null;
        isMicMuted = false;
        document.getElementById("webrtc-call-modal")?.classList.add("hidden");
    };

    async function handleIncomingWebRTCSignal(pkt) {
        const sigType = pkt.signal_type;
        const sender = String(pkt.sender_id || "");
        const sigData = pkt.data || {};

        if (sigType === "ring") {
            triggerHaptic("warning");
            callPartnerId = sender;
            incomingOfferPayload = sigData;
            openCallOverlayUI(sigData.caller_name || "Your Match", sigData.caller_photo || DEFAULT_AVATAR, true);
        } else if (sigType === "answer" && peerConnection && sigData.sdp) {
            await peerConnection.setRemoteDescription(new RTCSessionDescription(sigData.sdp));
        } else if (sigType === "ice" && peerConnection && sigData.candidate) {
            try {
                await peerConnection.addIceCandidate(new RTCIceCandidate(sigData.candidate));
            } catch (e) {}
        } else if (sigType === "hangup") {
            endMaskedVoiceCall(false);
        }
    }

    async function pollFallbackWebRTCSignals() {
        if (!cleanTelegramId || isGuestMode || cleanTelegramId === "guest") return;
        if (realtimeSocket && realtimeSocket.readyState === WebSocket.OPEN) return;
        try {
            const res = await fetch(`${BACKEND_URL}/api/webrtc/poll/${encodeURIComponent(cleanTelegramId)}`);
            if (!res.ok) return;
            const data = await res.json();
            (data.signals || []).forEach((s) => handleIncomingWebRTCSignal(s));
        } catch (e) {}
    }

    // --- BOOTSTRAP PHASE 6+ MODULE ---
    checkAppBuildVersionAndBunaHour();
    setTimeout(connectRealtimeWebSocket, 1200);
    if (callSignalPollTimer) clearInterval(callSignalPollTimer);
    callSignalPollTimer = setInterval(pollFallbackWebRTCSignals, 5000);
})();
