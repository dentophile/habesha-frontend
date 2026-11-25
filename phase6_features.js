/**
 * Habesha Date (ሀበሻ ቀጠሮ ❤️) — Phase 6+ & Elite TrustShield™ Biometric Engine
 * Save as `phase6_features.js` in the same folder as `index.html` on GitHub Pages.
 */

(function () {
    "use strict";

    window.__PHASE6_LOADED__ = true;

    let realtimeSocket = null;
    let wsHeartbeatTimer = null;
    let wsReconnectTimer = null;

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

    let mixerPollTimer = null;
    let mixerOpen = false;
    let currentMixerPartner = null;

    async function checkAppBuildVersionAndBunaHour() {
        if (typeof BACKEND_URL === "undefined") return;
        try {
            const res = await fetch(`${BACKEND_URL}/api/app-version`, { cache: "no-store" });
            if (!res.ok) return;
            const data = await res.json();
            const serverVer = String(data.version || "").trim();

            const footerEl = document.getElementById("app-build-version-footer");
            if (footerEl && serverVer) {
                footerEl.innerText = `Habesha Date • Build ${serverVer}`;
            }

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
        } catch (err) {}
    }

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

            case "stars_payment_confirmed":
                triggerHaptic("success");
                if (typeof closePremiumModal === "function") closePremiumModal();
                if (typeof closeCommentRoseModal === "function") closeCommentRoseModal();
                if (typeof refreshProfileStats === "function") refreshProfileStats();
                showAlert(
                    pkt.product === "roses_pack"
                        ? "🌹 Telegram Stars Confirmed! 3 Golden Roses + 15 Bonus Likes added!"
                        : "👑 Telegram Stars Confirmed! Habesha Premium VIP is now Active!"
                );
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

            case "photo_reveal_requested":
                triggerHaptic("light");
                if (window.myProfileData) {
                    window.myProfileData.pending_reveal_requests_count = (parseInt(window.myProfileData.pending_reveal_requests_count || 0, 10) + 1);
                    syncRevealRequestsBadgeUI();
                }
                break;

            case "photo_reveal_responded":
                if (pkt.approved) {
                    triggerHaptic("success");
                    if (typeof loadDiscoverProfiles === "function") loadDiscoverProfiles();
                    showAlert("🔓 Great news! Your Photo Reveal request was approved—their clear photo is now unlocked for you!");
                }
                break;

            case "webrtc_signal":
                handleIncomingWebRTCSignal(pkt);
                break;

            case "mixer_message":
            case "mixer_paired":
            case "mixer_matched":
                if (mixerOpen) pollBunaMixerState("join");
                break;

            case "mixer_ended":
                if (mixerOpen) {
                    closeBunaMixerUIOnly();
                    showAlert("☕ Your Buna Speed-Date ended! Tap Speed Mixer anytime to meet someone new.");
                }
                break;
        }
    }

    window.toggleSpokenLangPill = function (btnEl) {
        if (!btnEl) return;
        const active = btnEl.classList.toggle("bg-botOrange");
        btnEl.classList.toggle("text-white", active);
        btnEl.classList.toggle("border-botOrange", active);
        btnEl.classList.toggle("bg-white", !active);
        btnEl.classList.toggle("text-gray-600", !active);
        btnEl.classList.toggle("border-gray-200", !active);

        const selected = Array.from(document.querySelectorAll("#reg-languages-pills button.bg-botOrange"))
            .map((b) => b.getAttribute("data-lang"))
            .filter(Boolean);
        const hiddenInput = document.getElementById("reg-languages-spoken");
        if (hiddenInput) hiddenInput.value = selected.join(", ");
    };

    window.setSpokenLangPillsFromCSV = function (csvStr) {
        const chosen = new Set(
            String(csvStr || "")
                .split(",")
                .map((s) => s.trim().toLowerCase())
                .filter(Boolean)
        );
        document.querySelectorAll("#reg-languages-pills button").forEach((btn) => {
            const val = String(btn.getAttribute("data-lang") || "").trim().toLowerCase();
            const isSel = chosen.has(val);
            btn.classList.toggle("bg-botOrange", isSel);
            btn.classList.toggle("text-white", isSel);
            btn.classList.toggle("border-botOrange", isSel);
            btn.classList.toggle("bg-white", !isSel);
            btn.classList.toggle("text-gray-600", !isSel);
            btn.classList.toggle("border-gray-200", !isSel);
        });
        const hiddenInput = document.getElementById("reg-languages-spoken");
        if (hiddenInput) hiddenInput.value = String(csvStr || "").trim();
    };

    function ensureTieredModestModalsDOM() {
        if (!document.getElementById("p6-modest-tier-modal")) {
            const m = document.createElement("div");
            m.id = "p6-modest-tier-modal";
            m.className = "hidden fixed inset-0 z-[218] flex items-center justify-center bg-black/70 backdrop-blur-sm px-4";
            m.innerHTML = `
                <div class="bg-white rounded-[2rem] p-5 w-full max-w-sm shadow-2xl relative overflow-hidden border border-purple-200 modal-pop max-h-[88vh] touch-scroll no-scrollbar">
                    <div class="tibeb-ribbon h-1.5 w-full absolute top-0 left-0"></div>
                    <button type="button" onclick="document.getElementById('p6-modest-tier-modal').classList.add('hidden')" class="absolute top-4 right-4 w-8 h-8 bg-gray-100 rounded-full flex items-center justify-center text-gray-500">
                        <i class="ph-bold ph-x"></i>
                    </button>
                    <div class="inline-flex items-center gap-1 px-3 py-1 rounded-full bg-purple-50 border border-purple-200 text-premium text-[10px] font-extrabold uppercase mb-1.5">
                        🔒 Tiered Modest Privacy
                    </div>
                    <h3 class="text-lg font-extrabold text-buna mb-1">Choose Who Sees Your Clear Photos</h3>
                    <p class="text-[11px] text-gray-500 mb-3.5 leading-relaxed">Stay 100% in control—nobody can ever bypass your blur without your chosen rule or approval.</p>

                    <div class="space-y-2 text-left mb-3.5">
                        <label class="flex items-start gap-2.5 p-3 rounded-2xl border-2 border-gray-200 bg-gray-50/70 cursor-pointer">
                            <input type="radio" name="p6-modest-level" value="off" class="mt-0.5 w-4 h-4 accent-botOrange shrink-0">
                            <div>
                                <p class="text-xs font-extrabold text-buna">✨ Public (Blur OFF)</p>
                                <p class="text-[10px] text-gray-500">Everyone on Discover can see your clear photos immediately.</p>
                            </div>
                        </label>

                        <label class="flex items-start gap-2.5 p-3 rounded-2xl border-2 border-purple-300 bg-purple-50/60 cursor-pointer">
                            <input type="radio" name="p6-modest-level" value="trusted" class="mt-0.5 w-4 h-4 accent-premium shrink-0">
                            <div>
                                <p class="text-xs font-extrabold text-premium">🛡️ Trusted Members Only (Recommended)</p>
                                <p class="text-[10px] text-gray-600">Blurred for anonymous/unverified strangers, but <b>automatically clear for ☑️ Biometric Verified + 👑 VIP</b> members!</p>
                            </div>
                        </label>

                        <label class="flex items-start gap-2.5 p-3 rounded-2xl border-2 border-amber-200 bg-amber-50/60 cursor-pointer">
                            <input type="radio" name="p6-modest-level" value="strict" class="mt-0.5 w-4 h-4 accent-amber-600 shrink-0">
                            <div>
                                <p class="text-xs font-extrabold text-buna">🔒 Strict Blur (Match or Approval Only)</p>
                                <p class="text-[10px] text-gray-600">Blurred for everyone until mutual match—or until you personally tap <b>🔓 Approve</b> on a VIP/Rose reveal request.</p>
                            </div>
                        </label>
                    </div>

                    <label class="flex items-center justify-between p-3 rounded-2xl bg-emerald-50/70 border border-emerald-200 cursor-pointer mb-4 text-left">
                        <div class="pr-2">
                            <p class="text-xs font-extrabold text-emerald-900">🎙️ Merit Auto-Unlock (Optional)</p>
                            <p class="text-[10px] text-emerald-800">Also auto-unblur for members who have a <b>15s Voice Bio</b> &amp; <b>90%+ Compatibility Alignment</b>.</p>
                        </div>
                        <input id="p6-modest-merit-chk" type="checkbox" class="w-4 h-4 accent-emerald-600 rounded shrink-0">
                    </label>

                    <button type="button" onclick="saveModestPrivacySettings()" class="btn-shimmer w-full py-3.5 bg-gradient-to-r from-premium via-fuchsia-600 to-habeshaCoral text-white rounded-2xl font-extrabold text-xs shadow-lg active:scale-95 transition">
                        Save Privacy Preference
                    </button>
                </div>
            `;
            m.addEventListener("click", (e) => { if (e.target === m) m.classList.add("hidden"); });
            document.body.appendChild(m);
        }

        if (!document.getElementById("p6-reveal-request-modal")) {
            const rm = document.createElement("div");
            rm.id = "p6-reveal-request-modal";
            rm.className = "hidden fixed inset-0 z-[218] flex items-center justify-center bg-black/70 backdrop-blur-sm px-4";
            rm.innerHTML = `
                <div class="bg-white rounded-[2rem] p-5 w-full max-w-sm shadow-2xl relative overflow-hidden border border-purple-200 modal-pop">
                    <div class="tibeb-ribbon h-1.5 w-full absolute top-0 left-0"></div>
                    <button type="button" onclick="document.getElementById('p6-reveal-request-modal').classList.add('hidden')" class="absolute top-4 right-4 w-8 h-8 bg-gray-100 rounded-full flex items-center justify-center text-gray-500">
                        <i class="ph-bold ph-x"></i>
                    </button>
                    <div class="inline-flex items-center gap-1 px-3 py-1 rounded-full bg-purple-50 border border-purple-200 text-premium text-[10px] font-extrabold uppercase mb-1.5">
                        🔓 Respectful Photo Reveal
                    </div>
                    <h3 id="p6-req-reveal-title" class="text-lg font-extrabold text-buna mb-1">Request Photo Reveal</h3>
                    <p id="p6-req-reveal-desc" class="text-xs text-gray-600 mb-3 leading-relaxed"></p>

                    <div id="p6-trusted-fasttrack-box" class="hidden mb-3 p-3 rounded-2xl bg-sky-50 border border-blue-200 text-left space-y-2">
                        <p class="text-[11px] font-extrabold text-buna">🛡️ Instant Auto-Unblur Available!</p>
                        <p class="text-[10px] text-gray-600">This member allows <b>☑️ Biometric Verified + 👑 VIP</b> members to view clear photos automatically.</p>
                        <div class="flex gap-1.5">
                            <button type="button" onclick="document.getElementById('p6-reveal-request-modal').classList.add('hidden'); openVerifyModal();" class="flex-1 py-2 bg-verify text-white rounded-xl text-[10px] font-extrabold">☑️ Verify Face (3s)</button>
                            <button type="button" onclick="document.getElementById('p6-reveal-request-modal').classList.add('hidden'); openPremiumModal('stars');" class="flex-1 py-2 bg-premium text-white rounded-xl text-[10px] font-extrabold">👑 Get VIP</button>
                        </div>
                    </div>

                    <textarea id="p6-req-reveal-note" maxlength="120" placeholder="Add a respectful 1-line intro (e.g. Loved your Tidar goals & bio! ☕)..." class="w-full p-3 border border-gray-200 rounded-2xl bg-gray-50 text-xs h-16 resize-none mb-3 focus:bg-white focus:outline-none focus:border-premium"></textarea>

                    <div class="space-y-2">
                        <button type="button" id="p6-btn-req-vip" onclick="submitPhotoRevealRequest(false)" class="btn-shimmer w-full py-3.5 bg-gradient-to-r from-premium to-pink-600 text-white rounded-2xl font-extrabold text-xs shadow-lg active:scale-95 transition">
                            👑 Send VIP Photo Reveal Request (Free for VIP)
                        </button>
                        <button type="button" id="p6-btn-req-rose" onclick="submitPhotoRevealRequest(true)" class="w-full py-3 bg-gradient-to-r from-amber-500 to-rose-500 text-white rounded-2xl font-extrabold text-xs shadow-md active:scale-95 transition">
                            🌹 Request Reveal Using 1 Golden Rose
                        </button>
                    </div>
                </div>
            `;
            rm.addEventListener("click", (e) => { if (e.target === rm) rm.classList.add("hidden"); });
            document.body.appendChild(rm);
        }

        if (!document.getElementById("p6-incoming-reveals-modal")) {
            const im = document.createElement("div");
            im.id = "p6-incoming-reveals-modal";
            im.className = "hidden fixed inset-0 z-[218] flex items-center justify-center bg-black/70 backdrop-blur-sm px-4";
            im.innerHTML = `
                <div class="bg-white rounded-[2rem] p-5 w-full max-w-sm shadow-2xl relative overflow-hidden border border-purple-200 modal-pop max-h-[86vh] flex flex-col">
                    <div class="tibeb-ribbon h-1.5 w-full absolute top-0 left-0"></div>
                    <button type="button" onclick="document.getElementById('p6-incoming-reveals-modal').classList.add('hidden')" class="absolute top-4 right-4 w-8 h-8 bg-gray-100 rounded-full flex items-center justify-center text-gray-500">
                        <i class="ph-bold ph-x"></i>
                    </button>
                    <div class="inline-flex items-center gap-1 px-3 py-1 rounded-full bg-purple-50 border border-purple-200 text-premium text-[10px] font-extrabold uppercase mb-1.5 w-fit">
                        🔓 Photo Reveal Requests
                    </div>
                    <h3 class="text-lg font-extrabold text-buna mb-0.5">Choose Who Can See You</h3>
                    <p class="text-[11px] text-gray-500 mb-3">Approve to unblur your photos for that specific person only, or keep blurred.</p>
                    <div id="p6-incoming-reveals-list" class="flex-1 min-h-0 touch-scroll space-y-2.5 pr-0.5"></div>
                </div>
            `;
            im.addEventListener("click", (e) => { if (e.target === im) im.classList.add("hidden"); });
            document.body.appendChild(im);
        }

        // Inject Photo Reveal Requests bar right below the Views Vault bar in Matches tab
        const viewsBar = document.getElementById("matches-views-vault-bar");
        if (viewsBar && !document.getElementById("matches-reveal-requests-bar")) {
            viewsBar.insertAdjacentHTML(
                "afterend",
                `
                <div id="matches-reveal-requests-bar" onclick="openIncomingRevealRequestsModal()" class="bg-gradient-to-r from-amber-50 via-white to-purple-50 p-3.5 rounded-3xl shadow-sm border border-amber-200/80 flex items-center justify-between cursor-pointer active:scale-[0.98] transition">
                    <div class="flex items-center gap-3 min-w-0">
                        <div class="w-10 h-10 rounded-2xl bg-amber-100 text-amber-700 flex items-center justify-center shrink-0">
                            <i class="ph-fill ph-lock-key-open text-xl"></i>
                        </div>
                        <div class="min-w-0">
                            <h3 class="text-xs font-extrabold text-buna truncate">Photo Reveal Requests (Modest Mode)</h3>
                            <p class="text-[11px] text-gray-500 truncate">Approve or keep blurred in 1 tap</p>
                        </div>
                    </div>
                    <span id="matches-reveal-count-pill" class="bg-amber-500 text-white text-xs font-extrabold px-2.5 py-1 rounded-full shrink-0 shadow-sm">🔓 0</span>
                </div>
                `
            );
        }
    }

    function syncRevealRequestsBadgeUI() {
        const cnt = parseInt((window.myProfileData && window.myProfileData.pending_reveal_requests_count) || 0, 10);
        const pill = document.getElementById("matches-reveal-count-pill");
        if (pill) {
            pill.innerText = `🔓 ${cnt}`;
            pill.classList.toggle("animate-pulse", cnt > 0);
        }
    }

    window.toggleMyModestBlur = function () {
        if (isGuestMode) return openGuestSignupModal();
        ensureTieredModestModalsDOM();
        triggerHaptic("light");

        const mp = window.myProfileData || {};
        const curLevel = mp.modest_blur_level || (mp.blur_photos_until_match ? "strict" : "off");
        document.querySelectorAll("input[name='p6-modest-level']").forEach((r) => {
            r.checked = r.value === curLevel;
        });
        const meritChk = document.getElementById("p6-modest-merit-chk");
        if (meritChk) meritChk.checked = Boolean(mp.modest_merit_unlock);

        document.getElementById("p6-modest-tier-modal")?.classList.remove("hidden");
    };

    window.saveModestPrivacySettings = async function () {
        const checked = document.querySelector("input[name='p6-modest-level']:checked");
        const level = checked ? checked.value : "off";
        const merit = Boolean(document.getElementById("p6-modest-merit-chk")?.checked);
        triggerHaptic("medium");
        try {
            const res = await fetch(`${BACKEND_URL}/api/toggle-blur-photos`, {
                method: "POST",
                headers: getAuthHeaders(true),
                body: JSON.stringify({
                    telegram_id: cleanTelegramId,
                    blur_photos_until_match: level !== "off",
                    modest_blur_level: level,
                    modest_merit_unlock: merit
                })
            });
            if (!res.ok) throw new Error("Could not save privacy setting.");
            if (window.myProfileData) {
                window.myProfileData.modest_blur_level = level;
                window.myProfileData.blur_photos_until_match = level !== "off";
                window.myProfileData.modest_merit_unlock = merit;
            }
            const lbl = document.getElementById("modest-blur-btn-label");
            if (lbl) {
                lbl.innerText = level === "trusted"
                    ? "🛡️ Modest Mode: Trusted VIPs"
                    : level === "strict"
                    ? "🔒 Modest Mode: Strict"
                    : "Modest Photo Blur: OFF";
            }
            document.getElementById("p6-modest-tier-modal")?.classList.add("hidden");
            const desc = level === "trusted"
                ? "🛡️ Trusted Modest Mode ON! Blurred for strangers, automatically clear for ☑️ Verified VIPs."
                : level === "strict"
                ? "🔒 Strict Modest Mode ON! Blurred until mutual match or your personal 1-tap approval."
                : "✨ Modest Photo Blur OFF! Your clear photos are public on Discover.";
            showAlert(desc);
        } catch (err) {
            showAlert(err.message || "Could not update Modest Mode.");
        }
    };

    window.openPhotoRevealRequestModal = function (event) {
        if (event) event.stopPropagation();
        const profile = (typeof profiles !== "undefined" && profiles[currentCardIndex]) ? profiles[currentCardIndex] : null;
        if (!profile) return;
        if (isGuestMode) return openGuestSignupModal(profile.name);
        ensureTieredModestModalsDOM();
        triggerHaptic("light");

        const isTrusted = profile.modest_blur_level === "trusted";
        document.getElementById("p6-req-reveal-title").innerText = `Ask ${profile.name} to Unblur Photos`;
        document.getElementById("p6-req-reveal-desc").innerHTML = isTrusted
            ? `<b>${profile.name}</b> uses <b>Trusted Modest Mode</b>. Become ☑️ Biometric Verified + 👑 VIP to unblur automatically, OR send a respectful 1-tap reveal request below:`
            : `<b>${profile.name}</b> uses <b>Strict Modest Mode</b>. Send a respectful Photo Reveal request—they'll see your badges &amp; bio and can unblur for you in 1 tap!`;

        const fastBox = document.getElementById("p6-trusted-fasttrack-box");
        if (fastBox) fastBox.classList.toggle("hidden", !isTrusted);

        const isPrem = Boolean(window.myProfileData && window.myProfileData.is_premium);
        const roses = (window.myProfileData && window.myProfileData.golden_roses !== undefined) ? window.myProfileData.golden_roses : 1;
        const vipBtn = document.getElementById("p6-btn-req-vip");
        const roseBtn = document.getElementById("p6-btn-req-rose");
        if (vipBtn) {
            vipBtn.innerText = isPrem
                ? "👑 Send Respectful Photo Reveal Request (VIP Free)"
                : "👑 Unlock Free VIP Photo Reveal Requests";
        }
        if (roseBtn) {
            roseBtn.innerText = `🌹 Send Priority Reveal Request (1 Rose • You have ${roses})`;
        }

        const noteEl = document.getElementById("p6-req-reveal-note");
        if (noteEl) noteEl.value = "";
        document.getElementById("p6-reveal-request-modal")?.classList.remove("hidden");
    };

    window.submitPhotoRevealRequest = async function (useRose = false) {
        const profile = (typeof profiles !== "undefined" && profiles[currentCardIndex]) ? profiles[currentCardIndex] : null;
        if (!profile) return;
        const isPrem = Boolean(window.myProfileData && window.myProfileData.is_premium);
        if (!useRose && !isPrem) {
            document.getElementById("p6-reveal-request-modal")?.classList.add("hidden");
            return openPremiumModal("stars");
        }

        const note = document.getElementById("p6-req-reveal-note")?.value.trim() || "";
        triggerHaptic("medium");
        try {
            const res = await fetch(`${BACKEND_URL}/api/photo-reveal/request`, {
                method: "POST",
                headers: getAuthHeaders(true),
                body: JSON.stringify({
                    requester_id: cleanTelegramId,
                    owner_id: String(profile.telegram_id),
                    use_rose: Boolean(useRose),
                    note: note
                })
            });
            const data = await res.json();
            document.getElementById("p6-reveal-request-modal")?.classList.add("hidden");
            if (data.upgrade_required) {
                openPremiumModal("stars");
                return showAlert(data.message);
            }
            if (!res.ok) throw new Error(data.detail || "Could not send request.");

            if (window.myProfileData && data.golden_roses !== undefined) {
                window.myProfileData.golden_roses = data.golden_roses;
                if (typeof updateSwipesRemainingUI === "function") updateSwipesRemainingUI();
            }
            profile.reveal_request_status = data.status || "pending";
            if (typeof renderCards === "function") renderCards();
            triggerHaptic("success");
            showAlert(data.message || "🔓 Photo Reveal request sent!");
        } catch (err) {
            showAlert(err.message || "Could not send Photo Reveal request.");
        }
    };

    window.openIncomingRevealRequestsModal = async function () {
        if (isGuestMode) return openGuestSignupModal();
        ensureTieredModestModalsDOM();
        triggerHaptic("light");
        const modal = document.getElementById("p6-incoming-reveals-modal");
        const listEl = document.getElementById("p6-incoming-reveals-list");
        if (!modal || !listEl) return;

        modal.classList.remove("hidden");
        listEl.innerHTML = `<div class="flex justify-center py-8"><i class="ph ph-spinner animate-spin text-2xl text-premium"></i></div>`;

        try {
            const res = await fetch(`${BACKEND_URL}/api/photo-reveal/incoming/${encodeURIComponent(cleanTelegramId)}`);
            const data = await res.json();
            const reqs = data.requests || [];
            if (window.myProfileData) {
                window.myProfileData.pending_reveal_requests_count = reqs.length;
                syncRevealRequestsBadgeUI();
            }

            if (reqs.length === 0) {
                listEl.innerHTML = `
                    <div class="text-center py-6 px-3">
                        <div class="w-12 h-12 mx-auto mb-2 rounded-2xl bg-purple-50 text-premium flex items-center justify-center">
                            <i class="ph-duotone ph-lock-key-open text-2xl"></i>
                        </div>
                        <p class="text-xs font-extrabold text-buna">No Pending Photo Reveal Requests</p>
                        <p class="text-[11px] text-gray-500 mt-1">When VIP or Rose admirers request to see your blurred photos, they'll appear here for your 1-tap approval.</p>
                    </div>
                `;
                return;
            }

            listEl.innerHTML = reqs.map((r) => {
                const ageGen = formatAgeGender(r.age, r.gender);
                const badges = `${r.is_verified ? "☑️ Verified" : ""} ${r.is_premium ? "👑 VIP" : ""} ${r.method === "rose" ? "🌹 Rose" : ""}`.trim();
                return `
                    <div class="p-3 bg-purple-50/50 border border-purple-100 rounded-2xl space-y-2 text-left">
                        <div class="flex items-center gap-2.5">
                            <div onclick="document.getElementById('p6-incoming-reveals-modal').classList.add('hidden'); jumpFromViewsVault('${r.requester_id}');" class="w-12 h-12 rounded-2xl bg-cover bg-center border-2 border-premium shrink-0 cursor-pointer" style="background-image:url('${r.photo_url || DEFAULT_AVATAR}')"></div>
                            <div class="min-w-0 flex-1">
                                <p class="text-xs font-extrabold text-buna truncate">${r.name}, ${ageGen}</p>
                                <p class="text-[10px] font-bold text-premium truncate">${badges || "Habesha Member"} • 📍 ${r.location}</p>
                                ${r.note ? `<p class="text-[11px] text-gray-600 italic mt-0.5 line-clamp-2">"${r.note}"</p>` : ""}
                            </div>
                        </div>
                        <div class="grid grid-cols-2 gap-1.5">
                            <button type="button" onclick="respondPhotoRevealRequest('${r.requester_id}', true)" class="py-2 bg-emerald-600 text-white rounded-xl text-[11px] font-extrabold shadow-sm active:scale-95">🔓 Reveal My Photo</button>
                            <button type="button" onclick="respondPhotoRevealRequest('${r.requester_id}', false)" class="py-2 bg-white text-gray-600 border border-gray-200 rounded-xl text-[11px] font-extrabold active:scale-95">❌ Keep Blurred</button>
                        </div>
                    </div>
                `;
            }).join("");
        } catch (err) {
            listEl.innerHTML = `<p class="text-xs text-red-500 text-center py-4">Could not load requests right now.</p>`;
        }
    };

    window.respondPhotoRevealRequest = async function (requesterId, approve) {
        triggerHaptic(approve ? "success" : "light");
        try {
            const res = await fetch(`${BACKEND_URL}/api/photo-reveal/respond`, {
                method: "POST",
                headers: getAuthHeaders(true),
                body: JSON.stringify({
                    owner_id: cleanTelegramId,
                    requester_id: String(requesterId),
                    approve: Boolean(approve)
                })
            });
            if (res.ok) {
                showAlert(approve ? "🔓 Photo unlocked for this member!" : "🔒 Kept blurred—your privacy is protected.");
                await window.openIncomingRevealRequestsModal();
            }
        } catch (err) {
            showAlert("Could not update request.");
        }
    };

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

    window.openChatGameModal = function () {
        if (!activeChatId) return;
        triggerHaptic("light");
        document.getElementById("chat-game-modal")?.classList.remove("hidden");
    };

    window.closeChatGameModal = function () {
        document.getElementById("chat-game-modal")?.classList.add("hidden");
    };

    window.openChatDateScheduler = function () {
        document.getElementById("buna-gifts-tray")?.classList.add("hidden");
        window.openChatGameModal();
        window.switchGameModalTab("date");
    };

    window.switchGameModalTab = function (tab) {
        ["rapid", "truths", "date"].forEach((t) => {
            document.getElementById(`game-panel-${t}`)?.classList.toggle("hidden", t !== tab);
            const btn = document.getElementById(`tab-game-${t}`);
            if (btn) {
                btn.className = t === tab
                    ? "py-2 rounded-xl bg-white text-buna shadow-sm transition"
                    : "py-2 rounded-xl text-gray-500 transition";
            }
        });
    };

    window.sendInteractiveDateCard = async function () {
        if (!activeChatId) return;
        const spot = document.getElementById("date-card-spot")?.value || "☕ Tomoca Coffee (Public Café)";
        const whenText = document.getElementById("date-card-when")?.value.trim() || "This Weekend • 4:30 PM";
        const note = document.getElementById("date-card-note")?.value.trim() || "";

        triggerHaptic("medium");
        closeChatGameModal();
        try {
            const res = await fetch(`${BACKEND_URL}/api/date-invite/create`, {
                method: "POST",
                headers: getAuthHeaders(true),
                body: JSON.stringify({
                    sender_id: cleanTelegramId,
                    receiver_id: activeChatId,
                    spot: spot,
                    when_text: whenText,
                    note: note
                })
            });
            if (!res.ok) throw new Error("Failed");
            loadChatHistory(activeChatId, document.getElementById("chat-header-name")?.innerText || "Match", true);
        } catch (err) {
            showAlert("Could not send Buna Date Card right now.");
        }
    };

    window.respondInteractiveDateCard = async function (event, inviteId, decision) {
        if (event) event.stopPropagation();
        triggerHaptic("success");
        try {
            await fetch(`${BACKEND_URL}/api/date-invite/respond`, {
                method: "POST",
                headers: getAuthHeaders(true),
                body: JSON.stringify({
                    invite_id: inviteId,
                    telegram_id: cleanTelegramId,
                    decision: decision
                })
            });
            if (activeChatId) {
                loadChatHistory(activeChatId, document.getElementById("chat-header-name")?.innerText || "Match", true);
            }
        } catch (err) {
            showAlert("Could not update Date Card response.");
        }
    };

    window.renderInteractiveDateBubble = function (msg) {
        try {
            const inv = JSON.parse((msg.content || "").replace("[HABESHA_DATE]", ""));
            const isGuest = String(cleanTelegramId) === String(inv.guest_id);
            const status = inv.status || "pending";

            let statusHtml = "";
            if (status === "accepted") {
                statusHtml = `<div class="mt-2 p-2 rounded-xl bg-emerald-500 text-white text-[11px] font-extrabold text-center shadow-sm">✅ Date Accepted! Have a wonderful time! ☕✨</div>`;
            } else if (status === "reschedule") {
                statusHtml = `<div class="mt-2 p-2 rounded-xl bg-amber-100 text-amber-900 text-[11px] font-extrabold text-center">🕒 Let's pick another day/time in chat!</div>`;
            } else if (isGuest) {
                statusHtml = `
                    <div class="grid grid-cols-2 gap-1.5 mt-2">
                        <button type="button" onclick="respondInteractiveDateCard(event, '${inv.invite_id}', 'accepted')" class="py-2 px-2 rounded-xl bg-emerald-500 text-white text-[11px] font-extrabold shadow-sm active:scale-95">✅ Accept</button>
                        <button type="button" onclick="respondInteractiveDateCard(event, '${inv.invite_id}', 'reschedule')" class="py-2 px-2 rounded-xl bg-white text-buna border border-gray-200 text-[11px] font-extrabold active:scale-95">🕒 New Time</button>
                    </div>
                `;
            } else {
                statusHtml = `<p class="mt-1.5 text-[10px] font-bold opacity-85 text-center">⏳ Waiting for your match's RSVP...</p>`;
            }

            return `
                <div class="w-56 sm:w-64 py-1 text-left" onclick="event.stopPropagation()">
                    <div class="text-[10px] font-extrabold uppercase tracking-wider opacity-90 mb-1 flex items-center gap-1">
                        <span>📅 Official Safe Buna Date Invite</span>
                    </div>
                    <div class="bg-white/95 text-buna p-2.5 rounded-xl border border-orange-200 space-y-1">
                        <p class="font-extrabold text-xs">${inv.spot}</p>
                        <p class="text-[11px] font-bold text-botOrange">🕒 ${inv.when_text}</p>
                        ${inv.note ? `<p class="text-[11px] text-gray-600 italic">"${inv.note}"</p>` : ""}
                    </div>
                    ${statusHtml}
                </div>
            `;
        } catch (e) {
            return `<span>📅 Buna Date Invitation</span>`;
        }
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

    let bioStream = null;
    let isCapturingBio = false;

    window.resetBiometricScannerUI = function () {
        window.stopBiometricCamera();
        window.biometricLiveBlob = null;
        window.biometricMotionScore = 0;

        const video = document.getElementById("bio-camera-video");
        const preview = document.getElementById("verify-selfie-preview");
        const laser = document.getElementById("bio-laser-overlay");
        const badge = document.getElementById("bio-countdown-badge");
        const hint = document.getElementById("bio-status-hint");

        if (video) video.classList.add("hidden");
        if (preview) {
            preview.classList.remove("hidden");
            preview.style.backgroundImage = "";
        }
        document.getElementById("verify-pose-emoji")?.classList.remove("hidden");
        document.getElementById("verify-selfie-text")?.classList.remove("hidden");
        laser?.classList.add("hidden");
        badge?.classList.add("hidden");

        document.getElementById("btn-start-bio-cam")?.classList.remove("hidden");
        document.getElementById("btn-capture-bio-scan")?.classList.add("hidden");
        document.getElementById("btn-verify-submit")?.classList.add("hidden");
        document.getElementById("btn-fallback-cam")?.classList.add("hidden");

        if (hint) {
            hint.innerText = "Step 1: Open live front camera & align your face inside the oval.";
        }
    };

    window.stopBiometricCamera = function () {
        isCapturingBio = false;
        if (bioStream) {
            try {
                bioStream.getTracks().forEach((t) => t.stop());
            } catch (e) {}
            bioStream = null;
        }
        const video = document.getElementById("bio-camera-video");
        if (video) video.srcObject = null;
    };

    window.startBiometricCamera = async function () {
        const video = document.getElementById("bio-camera-video");
        const preview = document.getElementById("verify-selfie-preview");
        const laser = document.getElementById("bio-laser-overlay");
        const badge = document.getElementById("bio-countdown-badge");
        const hint = document.getElementById("bio-status-hint");

        if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
            document.getElementById("btn-fallback-cam")?.classList.remove("hidden");
            return showAlert("Live camera stream is restricted by this WebView. Tap the Direct Camera Selfie button below!");
        }

        try {
            triggerHaptic("light");
            bioStream = await navigator.mediaDevices.getUserMedia({
                video: { facingMode: "user", width: { ideal: 720 }, height: { ideal: 960 } },
                audio: false
            });
            if (video) {
                video.srcObject = bioStream;
                video.classList.remove("hidden");
                await video.play();
            }
            preview?.classList.add("hidden");
            laser?.classList.remove("hidden");
            if (badge) {
                badge.innerText = "LIVE 3D";
                badge.classList.remove("hidden");
            }
            document.getElementById("btn-start-bio-cam")?.classList.add("hidden");
            const capBtn = document.getElementById("btn-capture-bio-scan");
            if (capBtn) {
                capBtn.classList.remove("hidden");
                capBtn.classList.add("flex");
            }
            const poseTitle = window.currentAssignedPose?.title_en || "assigned hand gesture";
            if (hint) {
                hint.innerText = `Step 2: Hold ${poseTitle} next to your face & tap Scan Now!`;
            }
        } catch (err) {
            document.getElementById("btn-fallback-cam")?.classList.remove("hidden");
            showAlert("📸 Please allow Camera permission for instant 3-second AI verification (or use the fallback camera button below).");
        }
    };

    function sampleVideoFramePixels(videoEl) {
        const c = document.createElement("canvas");
        c.width = 96;
        c.height = 96;
        const ctx = c.getContext("2d");
        ctx.drawImage(videoEl, 0, 0, 96, 96);
        return ctx.getImageData(0, 0, 96, 96).data;
    }

    function computePixelMotionDelta(frameA, frameB) {
        if (!frameA || !frameB || frameA.length !== frameB.length) return 0;
        let diffSum = 0;
        const totalPixels = frameA.length / 4;
        for (let i = 0; i < frameA.length; i += 4) {
            diffSum +=
                Math.abs(frameA[i] - frameB[i]) +
                Math.abs(frameA[i + 1] - frameB[i + 1]) +
                Math.abs(frameA[i + 2] - frameB[i + 2]);
        }
        return diffSum / (totalPixels * 3);
    }

    window.runTwoStepBiometricCapture = async function () {
        if (isCapturingBio || !bioStream) return;
        const video = document.getElementById("bio-camera-video");
        const canvas = document.getElementById("bio-capture-canvas");
        const badge = document.getElementById("bio-countdown-badge");
        const hint = document.getElementById("bio-status-hint");
        const capBtn = document.getElementById("btn-capture-bio-scan");
        if (!video || !canvas) return;

        isCapturingBio = true;
        if (capBtn) capBtn.disabled = true;

        try {
            const frame1 = sampleVideoFramePixels(video);
            const poseEmoji = window.currentAssignedPose?.emoji || "✌️";

            for (let sec = 3; sec >= 1; sec--) {
                triggerHaptic("selection");
                if (badge) badge.innerText = `${sec}s ${poseEmoji}`;
                if (hint) hint.innerText = `Hold ${window.currentAssignedPose?.title_en || poseEmoji} steady & blink naturally (${sec})...`;
                await new Promise((r) => setTimeout(r, 650));
            }

            const frame2 = sampleVideoFramePixels(video);
            const motionScore = computePixelMotionDelta(frame1, frame2);
            window.biometricMotionScore = Number(motionScore.toFixed(2));

            if (motionScore < 1.2) {
                isCapturingBio = false;
                if (capBtn) capBtn.disabled = false;
                if (badge) badge.innerText = "RETRY";
                return showAlert("🛡️ TrustShield™ Liveness Check: No natural 3D movement detected. Please move your hand into the gesture naturally and try again!");
            }

            const w = video.videoWidth || 720;
            const h = video.videoHeight || 960;
            canvas.width = w;
            canvas.height = h;
            const ctx = canvas.getContext("2d");
            ctx.drawImage(video, 0, 0, w, h);

            const blob = await new Promise((res) => canvas.toBlob(res, "image/jpeg", 0.88));
            window.biometricLiveBlob = blob;

            const previewUrl = URL.createObjectURL(blob);
            const preview = document.getElementById("verify-selfie-preview");
            if (preview) {
                preview.style.backgroundImage = `url('${previewUrl}')`;
                preview.classList.remove("hidden");
            }
            document.getElementById("verify-pose-emoji")?.classList.add("hidden");
            document.getElementById("verify-selfie-text")?.classList.add("hidden");
            video.classList.add("hidden");
            document.getElementById("bio-laser-overlay")?.classList.add("hidden");

            window.stopBiometricCamera();
            triggerHaptic("medium");

            if (capBtn) capBtn.classList.add("hidden");
            const subBtn = document.getElementById("btn-verify-submit");
            if (subBtn) subBtn.classList.remove("hidden");
            if (hint) hint.innerText = "✅ Live 3D motion verified! Matching against your Main Profile Photo...";

            if (typeof submitVerification === "function") {
                await submitVerification();
            }
        } catch (err) {
            isCapturingBio = false;
            if (capBtn) capBtn.disabled = false;
            showAlert("Could not capture camera frame. Please try again.");
        }
    };

    if (document.readyState === "loading") {
        document.addEventListener("DOMContentLoaded", () => {
            ensureTieredModestModalsDOM();
            checkAppBuildVersionAndBunaHour();
            setTimeout(connectRealtimeWebSocket, 1200);
        });
    } else {
        ensureTieredModestModalsDOM();
        checkAppBuildVersionAndBunaHour();
        setTimeout(connectRealtimeWebSocket, 1200);
    }
    if (callSignalPollTimer) clearInterval(callSignalPollTimer);
    callSignalPollTimer = setInterval(pollFallbackWebRTCSignals, 5000);
})();
