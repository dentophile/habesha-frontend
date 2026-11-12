/**
 * HABESHA DATE — PHASE 10 ENGINE
 * Ladies-First 24h Wave Control, Auto-Blur Incoming Chat Photos,
 * Hyper-Local Campus & Neighborhood Radar, and Admin 4-Metric Growth Funnel
 */
(function () {
    "use strict";

    const getApiBase = () =>
        (typeof BACKEND_URL !== "undefined"
            ? BACKEND_URL
            : typeof API_URL !== "undefined"
            ? API_URL
            : "https://habesha-backend-xhc5.onrender.com").replace(/\/$/, "");

    const getUid = () =>
        String(
            typeof cleanTelegramId !== "undefined" && cleanTelegramId
                ? cleanTelegramId
                : typeof currentUserId !== "undefined" && currentUserId
                ? currentUserId
                : "guest"
        );

    const getHeaders = (isJson = true) => {
        if (typeof getAuthHeaders === "function") return getAuthHeaders(isJson);
        return isJson ? { "Content-Type": "application/json" } : {};
    };

    function injectPhase10Styles() {
        if (document.getElementById("p10-styles")) return;
        const st = document.createElement("style");
        st.id = "p10-styles";
        st.textContent = `
            .p10-chat-photo-shield {
                position: relative;
                display: inline-block;
                border-radius: 14px;
                overflow: hidden;
                cursor: pointer;
            }
            .p10-chat-photo-shield.is-blurred img {
                filter: blur(18px) brightness(0.82);
                transform: scale(1.06);
                transition: filter 0.25s ease, transform 0.25s ease;
            }
            .p10-chat-photo-overlay {
                position: absolute;
                inset: 0;
                display: flex;
                flex-direction: column;
                align-items: center;
                justify-content: center;
                background: rgba(15, 23, 42, 0.45);
                color: #fff;
                font-size: 11px;
                font-weight: 800;
                text-align: center;
                padding: 8px;
                gap: 4px;
            }
        `;
        document.head.appendChild(st);
    }

    // 1. Inject Ladies-First Toggle into Profile Settings
    function injectProfileLadiesFirstCard() {
        const target = document.getElementById("p7-profile-suite") || document.getElementById("btn-profile-modest-blur")?.parentElement;
        if (!target || document.getElementById("p10-ladies-first-btn")) return;

        const btn = document.createElement("button");
        btn.id = "p10-ladies-first-btn";
        btn.type = "button";
        btn.className = "w-full bg-gradient-to-r from-pink-50 to-rose-50 text-buna font-extrabold p-4 rounded-2xl flex items-center justify-between border border-pink-200 shadow-sm transition active:scale-95 text-sm";
        btn.innerHTML = `
            <div class="flex items-center gap-3">
                <span class="text-xl">👋</span>
                <div class="text-left">
                    <span id="p10-ladies-lbl" class="block">Ladies Speak First: OFF</span>
                    <span class="text-[10px] text-gray-500 font-semibold block">New matches wait for your 👋 Wave before texting</span>
                </div>
            </div>
            <span id="p10-ladies-pill" class="text-[10px] font-extrabold bg-white text-habeshaCoral px-2.5 py-0.5 rounded-full border border-pink-200">SAFE</span>
        `;
        btn.onclick = toggleLadiesSpeakFirst;
        target.insertBefore(btn, target.firstChild);
    }

    let ladiesFirstActive = localStorage.getItem("hd_ladies_first") === "1";

    function syncLadiesFirstUI() {
        const lbl = document.getElementById("p10-ladies-lbl");
        const pill = document.getElementById("p10-ladies-pill");
        if (lbl) lbl.innerText = ladiesFirstActive ? "👋 Ladies Speak First: ON" : "Ladies Speak First: OFF";
        if (pill) {
            pill.innerText = ladiesFirstActive ? "ON ✓" : "OFF";
            pill.className = ladiesFirstActive
                ? "text-[10px] font-extrabold bg-habeshaCoral text-white px-2.5 py-0.5 rounded-full"
                : "text-[10px] font-extrabold bg-white text-habeshaCoral px-2.5 py-0.5 rounded-full border border-pink-200";
        }
    }

    async function toggleLadiesSpeakFirst() {
        if (typeof isGuestMode !== "undefined" && isGuestMode) return openGuestSignupModal();
        ladiesFirstActive = !ladiesFirstActive;
        localStorage.setItem("hd_ladies_first", ladiesFirstActive ? "1" : "0");
        syncLadiesFirstUI();
        try {
            await fetch(`${getApiBase()}/api/phase10/ladies-first/toggle`, {
                method: "POST",
                headers: getHeaders(true),
                body: JSON.stringify({
                    telegram_id: getUid(),
                    ladies_speak_first: ladiesFirstActive
                })
            });
            showAlert(
                ladiesFirstActive
                    ? "👋 Ladies-First Mode ON! New matches will wait for your opening 👋 Wave before sending messages."
                    : "✨ Ladies-First Mode OFF! All mutual matches can message right away."
            );
        } catch (e) {}
    }

    // 2. Hyper-Local Addis & University Campus Radar inside ✨ Lounge
    async function injectCampusRadarIntoLounge() {
        const loungeModal = document.getElementById("p8-lounge-modal");
        if (!loungeModal) return;
        const inner = loungeModal.firstElementChild;
        if (!inner || inner.querySelector("#p10-campus-radar")) return;

        const box = document.createElement("div");
        box.id = "p10-campus-radar";
        box.className = "mt-3 p-3 rounded-2xl bg-gradient-to-r from-emerald-50 via-teal-50 to-sky-50 border border-emerald-200 text-left";
        box.innerHTML = `
            <div class="flex items-center justify-between mb-1.5">
                <span class="text-[10px] font-extrabold text-emerald-800 uppercase tracking-wider">📍 Live Campus & City Activity Radar</span>
                <span class="w-2 h-2 rounded-full bg-emerald-500 animate-ping"></span>
            </div>
            <div id="p10-radar-pills" class="flex flex-wrap gap-1.5 text-[10px] font-extrabold text-buna">
                <span class="px-2 py-0.5 rounded-full bg-white border border-emerald-200">🔥 Bole (14)</span>
                <span class="px-2 py-0.5 rounded-full bg-white border border-emerald-200">🎓 AAU (11)</span>
                <span class="px-2 py-0.5 rounded-full bg-white border border-emerald-200">CMC / Ayat (9)</span>
            </div>
        `;
        inner.appendChild(box);

        try {
            const res = await fetch(`${getApiBase()}/api/phase10/campus-radar`);
            const data = await res.json();
            const pillsEl = document.getElementById("p10-radar-pills");
            if (pillsEl && data.hotspots && data.hotspots.length) {
                pillsEl.innerHTML = data.hotspots
                    .map(h => `<span class="px-2.5 py-0.5 rounded-full bg-white border border-emerald-200 shadow-xs">🔥 ${h.name} (${h.active_count})</span>`)
                    .join("");
            }
        } catch (e) {}
    }

    // 3. Founder 4-Metric Growth & Revenue Funnel Card in Admin Center
    async function injectFounderFunnelInAdmin() {
        const overview = document.getElementById("admin-overview-section");
        if (!overview || document.getElementById("p10-founder-funnel")) return;

        const card = document.createElement("div");
        card.id = "p10-founder-funnel";
        card.className = "bg-gradient-to-br from-slate-900 to-slate-800 text-white p-4 rounded-3xl shadow-lg border border-amber-400/30 space-y-2.5";
        card.innerHTML = `
            <div class="flex items-center justify-between">
                <span class="text-[10px] font-extrabold text-amber-300 uppercase tracking-wider">📈 Founder Growth & Revenue Funnel</span>
                <button type="button" onclick="window.refreshFounderFunnel()" class="text-[10px] bg-white/10 px-2 py-0.5 rounded-full">↻</button>
            </div>
            <div class="grid grid-cols-2 gap-2 text-left">
                <div class="bg-white/10 p-2.5 rounded-2xl">
                    <p class="text-[10px] text-slate-300">New Today / Ratio</p>
                    <p id="p10-fn-signup" class="text-sm font-extrabold text-amber-300">--</p>
                </div>
                <div class="bg-white/10 p-2.5 rounded-2xl">
                    <p class="text-[10px] text-slate-300">Est. VIP Revenue</p>
                    <p id="p10-fn-rev" class="text-sm font-extrabold text-emerald-300">-- ETB</p>
                </div>
                <div class="bg-white/10 p-2.5 rounded-2xl">
                    <p class="text-[10px] text-slate-300">Right-Swipe Rate</p>
                    <p id="p10-fn-like" class="text-sm font-extrabold text-pink-300">--%</p>
                </div>
                <div class="bg-white/10 p-2.5 rounded-2xl">
                    <p class="text-[10px] text-slate-300">Active Chatters</p>
                    <p id="p10-fn-chat" class="text-sm font-extrabold text-sky-300">--</p>
                </div>
            </div>
        `;
        overview.insertBefore(card, overview.firstChild);
        window.refreshFounderFunnel();
    }

    window.refreshFounderFunnel = async function () {
        try {
            const res = await fetch(`${getApiBase()}/api/phase10/admin/funnel/${encodeURIComponent(getUid())}`);
            if (!res.ok) return;
            const d = await res.json();
            const sEl = document.getElementById("p10-fn-signup");
            const rEl = document.getElementById("p10-fn-rev");
            const lEl = document.getElementById("p10-fn-like");
            const cEl = document.getElementById("p10-fn-chat");
            if (sEl) sEl.innerText = `+${d.new_signups_today} (${d.gender_ratio})`;
            if (rEl) rEl.innerText = `${d.est_mrr_etb} ETB`;
            if (lEl) lEl.innerText = `${d.like_rate_pct}%`;
            if (cEl) cEl.innerText = `${d.active_chatters} users`;
        } catch (e) {}
    };

    // 4. Auto-Blur Incoming Chat Photos Until Tap + Ladies-First Chat Lock
    function hookChatSafetyAndBlur() {
        if (typeof window.renderChatMediaContent === "function" && !window._p10MediaHooked) {
            window._p10MediaHooked = true;
            const origMedia = window.renderChatMediaContent;
            window.renderChatMediaContent = function (msg, isMe) {
                const mType = msg.media_type || "text";
                const mUrl = msg.media_url || "";
                if (!isMe && mType === "image" && mUrl) {
                    return `
                        <div class="p10-chat-photo-shield is-blurred" onclick="event.stopPropagation(); if(this.classList.contains('is-blurred')){ this.classList.remove('is-blurred'); this.querySelector('.p10-chat-photo-overlay')?.remove(); } else { openImageLightbox('${mUrl}'); }">
                            <img src="${mUrl}" class="rounded-xl max-h-56 w-auto object-cover">
                            <div class="p10-chat-photo-overlay">
                                <span class="text-lg">📷</span>
                                <span>Tap to Reveal Photo</span>
                            </div>
                        </div>
                    `;
                }
                return origMedia.apply(this, arguments);
            };
        }

        if (typeof window.openChat === "function" && !window._p10OpenChatHooked) {
            window._p10OpenChatHooked = true;
            const origOpenChat = window.openChat;
            window.openChat = async function (matchId) {
                const out = origOpenChat.apply(this, arguments);
                try {
                    const res = await fetch(`${getApiBase()}/api/phase10/ladies-first/check/${encodeURIComponent(getUid())}/${encodeURIComponent(matchId)}`);
                    const d = await res.json();
                    const chatInput = document.getElementById("chat-input");
                    if (d.locked && chatInput) {
                        chatInput.disabled = true;
                        chatInput.placeholder = `👑 Waiting for ${d.lady_name || "her"} to 👋 Wave first...`;
                    } else if (chatInput) {
                        chatInput.disabled = false;
                        chatInput.placeholder = "Type a message...";
                    }
                } catch (e) {}
                return out;
            };
        }

        if (typeof window.loadAdminDashboardData === "function" && !window._p10AdminHooked) {
            window._p10AdminHooked = true;
            const origAdmin = window.loadAdminDashboardData;
            window.loadAdminDashboardData = function () {
                injectFounderFunnelInAdmin();
                return origAdmin.apply(this, arguments);
            };
        }

        // 5. Auto-inject "♻️ Second-Chance Refresh" button when Discover reaches "You're All Caught Up!"
        const cardContainer = document.getElementById("card-container");
        if (cardContainer && !window._p10EmptyObserver) {
            window._p10EmptyObserver = new MutationObserver(() => {
                if (cardContainer.innerText.includes("Caught Up") && !cardContainer.querySelector("#p10-empty-recycle-btn")) {
                    const showAllBtn = cardContainer.querySelector("button[onclick*='resetDiscoveryFilters']");
                    if (showAllBtn) {
                        showAllBtn.insertAdjacentHTML(
                            "afterend",
                            `<button id="p10-empty-recycle-btn" onclick="if(window.HabeshaPhase9) window.HabeshaPhase9.recycleStackNow()" class="mt-2 px-5 py-2.5 bg-amber-50 text-amber-900 border border-amber-200 rounded-2xl text-xs font-extrabold shadow-sm active:scale-95 transition">♻️ Recycle Passed Profiles</button>`
                        );
                    }
                }
            });
            window._p10EmptyObserver.observe(cardContainer, { childList: true, subtree: true });
        }
    }

    function initPhase10() {
        injectPhase10Styles();
        injectProfileLadiesFirstCard();
        syncLadiesFirstUI();
        hookChatSafetyAndBlur();
        setTimeout(injectCampusRadarIntoLounge, 900);
        setTimeout(injectFounderFunnelInAdmin, 1200);
    }

    if (document.readyState === "loading") {
        document.addEventListener("DOMContentLoaded", initPhase10);
    } else {
        initPhase10();
    }
})();
