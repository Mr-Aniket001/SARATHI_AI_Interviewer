
    tailwind.config = {
      darkMode: 'class',
      theme: {
        extend: {
          colors: {
            obsidian: {
              950: '#060608',
              900: '#0A0A0E',
              850: '#101017',
              800: '#14141E',
              700: '#1F1F2C',
              600: '#2A2A3B',
            },
            neon: {
              orange: '#FF6A00',
              amber: '#FF8800',
              bright: '#FF5100',
              glow: 'rgba(255, 106, 0, 0.45)',
              dim: 'rgba(255, 106, 0, 0.15)',
            }
          },
          fontFamily: {
            sans: ['Inter', 'sans-serif'],
            mono: ['JetBrains Mono', 'monospace'],
            cyber: ['Orbitron', 'sans-serif'],
          },
          boxShadow: {
            'neon-sm': '0 0 10px rgba(255, 106, 0, 0.3)',
            'neon': '0 0 20px rgba(255, 106, 0, 0.4), 0 0 40px rgba(255, 106, 0, 0.15)',
            'neon-lg': '0 0 35px rgba(255, 106, 0, 0.6), inset 0 0 15px rgba(255, 106, 0, 0.2)',
          }
        }
      }
    }

    // State management
    const appState = {
      activeTab: 'account',
      camAuthorized: true,
      micAuthorized: true,
      experienceRating: 5,
      highContrast: false,
      reducedMotion: false,
      allMuted: false
    };

    // Initialize UI on load
    window.addEventListener('DOMContentLoaded', () => {
      lucide.createIcons();
      setupMobileNavigation();
      setupSearchFilter();

      // Keyboard shortcut Ctrl+K / Cmd+K to focus search
      window.addEventListener('keydown', (e) => {
        if ((e.ctrlKey || e.metaKey) && e.key === 'k') {
          e.preventDefault();
          document.getElementById('settingsSearchInput').focus();
        }
      });
    });

    // Tab Switching Logic
    function switchTab(tabId) {
      appState.activeTab = tabId;
      
      // Update Tab Content
      document.querySelectorAll('.tab-content').forEach(tab => {
        tab.classList.add('hidden');
      });
      const activeEl = document.getElementById(`tab-${tabId}`);
      if (activeEl) {
        activeEl.classList.remove('hidden');
      }

      // Update Nav Buttons
      document.querySelectorAll('.nav-tab').forEach(btn => {
        const isSelected = btn.getAttribute('data-tab') === tabId;
        if (isSelected) {
          btn.className = "nav-tab w-full flex items-center gap-3.5 px-3.5 py-3 rounded-xl text-sm font-medium text-white bg-obsidian-800/90 border border-neon-orange/60 shadow-neon-sm transition-all group";
          const icon = btn.querySelector('i');
          if (icon) icon.className = "w-4 h-4 text-neon-orange transition-transform group-hover:scale-110";
        } else {
          btn.className = "nav-tab w-full flex items-center gap-3.5 px-3.5 py-3 rounded-xl text-sm font-medium text-neutral-400 hover:text-white hover:bg-obsidian-850 border border-transparent hover:border-obsidian-700 transition-all group";
          const icon = btn.querySelector('i');
          if (icon) icon.className = "w-4 h-4 text-neutral-400 group-hover:text-neon-orange transition-colors";
        }
      });

      // Mobile close
      closeMobileSidebar();
      lucide.createIcons();
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }

    // Avatar Upload and Reset
    function handleAvatarUpload(event) {
      const file = event.target.files[0];
      if (!file) return;

      const reader = new FileReader();
      reader.onload = function(e) {
        document.getElementById('profilePreviewImg').src = e.target.result;
        document.getElementById('navAvatarImg').src = e.target.result;
        showToast('Holographic avatar synchronized', 'success');
      };
      reader.readAsDataURL(file);
    }

    function resetAvatar() {
      const defaultImg = "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 100 100'%3E%3Crect width='100' height='100' rx='18' fill='%23141414'/%3E%3Ccircle cx='50' cy='36' r='17' fill='%23505050'/%3E%3Cpath d='M18 91c2-20 14-31 32-31s30 11 32 31' fill='%23505050'/%3E%3C/svg%3E";
      document.getElementById('profilePreviewImg').src = defaultImg;
      document.getElementById('navAvatarImg').src = defaultImg;
      showToast('Avatar placeholder restored', 'info');
    }

    // Profile Save & Discard
    function saveProfileChanges() {
      const name = document.getElementById('inputName').value.trim();
      const displayName = name ? name : "New Candidate";
      document.getElementById('displayProfileName').textContent = displayName;
      document.getElementById('navProfileName').textContent = displayName;
      showToast('Profile dossier updated and synced across all nodes', 'success');
    }

    function discardProfileChanges() {
      document.getElementById('inputName').value = "";
      document.getElementById('inputEmail').value = "";
      document.getElementById('inputOrg').value = "";
      document.getElementById('inputGradYear').value = "";
      document.getElementById('inputDegree').selectedIndex = 0;
      document.getElementById('displayProfileName').textContent = "New Candidate";
      document.getElementById('navProfileName').textContent = "Candidate Profile";
      showToast('Local profile inputs cleared', 'info');
    }

    function togglePassVisibility(inputId, btn) {
      const input = document.getElementById(inputId);
      const isPass = input.type === 'password';
      input.type = isPass ? 'text' : 'password';
      btn.innerHTML = isPass ? '<i data-lucide="eye-off" class="w-4 h-4"></i>' : '<i data-lucide="eye" class="w-4 h-4"></i>';
      lucide.createIcons();
    }

    function checkPassStrength(val) {
      const b1 = document.getElementById('strengthBar1');
      const b2 = document.getElementById('strengthBar2');
      const b3 = document.getElementById('strengthBar3');
      const b4 = document.getElementById('strengthBar4');
      const label = document.getElementById('passStrengthLabel');

      [b1, b2, b3, b4].forEach(b => {
        b.className = 'h-full w-1/4 bg-obsidian-700 transition-all';
      });

      if (!val) {
        label.textContent = 'Awaiting Input';
        label.className = 'text-neutral-500';
        return;
      }

      let score = 0;
      if (val.length >= 8) score++;
      if (/[A-Z]/.test(val)) score++;
      if (/[0-9]/.test(val)) score++;
      if (/[^A-Za-z0-9]/.test(val)) score++;

      if (score === 1) {
        b1.className = 'h-full w-1/4 bg-rose-500';
        label.textContent = 'Weak Key';
        label.className = 'text-rose-400';
      } else if (score === 2) {
        b1.className = 'h-full w-1/4 bg-amber-500';
        b2.className = 'h-full w-1/4 bg-amber-500';
        label.textContent = 'Moderate';
        label.className = 'text-amber-400';
      } else if (score === 3) {
        b1.className = 'h-full w-1/4 bg-neon-orange';
        b2.className = 'h-full w-1/4 bg-neon-orange';
        b3.className = 'h-full w-1/4 bg-neon-orange';
        label.textContent = 'High Entropy';
        label.className = 'text-neon-orange';
      } else if (score >= 4) {
        b1.className = 'h-full w-1/4 bg-emerald-400';
        b2.className = 'h-full w-1/4 bg-emerald-400';
        b3.className = 'h-full w-1/4 bg-emerald-400';
        b4.className = 'h-full w-1/4 bg-emerald-400';
        label.textContent = 'Quantum Encrypted';
        label.className = 'text-emerald-400';
      }
    }

    function handlePasswordUpdate(e) {
      e.preventDefault();
      const n = document.getElementById('newPass').value;
      const c = document.getElementById('confirmPass').value;
      if (n !== c) {
        showToast('Password confirmation does not match', 'error');
        return;
      }
      showToast('Master password successfully updated', 'success');
      document.getElementById('currentPass').value = '';
      document.getElementById('newPass').value = '';
      document.getElementById('confirmPass').value = '';
      checkPassStrength('');
    }

    function toggleSSO(provider) {
      const btn = provider === 'Google' ? document.getElementById('btnGoogleSSO') : document.getElementById('btnGithubSSO');
      const isConnected = btn.textContent.trim() === 'CONNECTED';
      if (isConnected) {
        btn.textContent = 'DISCONNECTED';
        btn.className = "px-3 py-1.5 rounded-lg border border-obsidian-700 bg-obsidian-800 text-neutral-400 hover:text-white transition-colors";
        showToast(`${provider} login provider unlinked`, 'info');
      } else {
        btn.textContent = 'CONNECTED';
        btn.className = "px-3 py-1.5 rounded-lg border border-emerald-500/50 bg-emerald-500/10 text-emerald-400 hover:border-rose-500 hover:text-rose-400 hover:bg-rose-500/10 transition-colors";
        showToast(`${provider} provider successfully linked`, 'success');
      }
    }

    function terminateSession(id) {
      const row = document.querySelector(`.session-row[data-id="${id}"]`);
      if (row) {
        row.style.opacity = '0';
        setTimeout(() => row.remove(), 250);
        showToast('Session connection terminated', 'info');
      }
    }

    function terminateAllSessions() {
      document.querySelectorAll('.session-row').forEach(row => row.remove());
      showToast('All remote sessions have been revoked', 'success');
    }

    // Modal Controls
    function openDeleteModal() { document.getElementById('deleteModal').classList.remove('hidden'); }
    function closeDeleteModal() { document.getElementById('deleteModal').classList.add('hidden'); }
    function openPlansModal() { document.getElementById('planModal').classList.remove('hidden'); }
    function closePlansModal() { document.getElementById('planModal').classList.add('hidden'); }
    function openCancelModal() { document.getElementById('cancelSubModal').classList.remove('hidden'); }
    function closeCancelModal() { document.getElementById('cancelSubModal').classList.add('hidden'); }

    function executeAccountPurge() {
      const val = document.getElementById('deleteConfirmInput').value.trim();
      if (val === 'DELETE-SARATHI') {
        closeDeleteModal();
        showToast('Purge sequence initiated. System resetting...', 'error');
        setTimeout(() => {
          location.reload();
        }, 1500);
      } else {
        showToast('Invalid confirmation phrase. Type DELETE-SARATHI', 'error');
      }
    }

    function switchPlanTier(tierName) {
      closePlansModal();
      showToast(`Subscription adjusted to ${tierName}`, 'success');
    }

    function confirmCancelSub() {
      closeCancelModal();
      showToast('Auto-renew disabled.', 'info');
    }

    function toggleSensorPerm(sensor) {
      if (sensor === 'cam') {
        appState.camAuthorized = !appState.camAuthorized;
        const badge = document.getElementById('camPermissionBadge');
        const btn = document.getElementById('camToggleBtn');
        const hud = document.getElementById('hudCamIcon');
        const side = document.getElementById('sidebarCamStatus');

        if (appState.camAuthorized) {
          badge.textContent = 'AUTHORIZED';
          badge.className = 'px-2 py-0.5 rounded text-[10px] bg-emerald-500/20 text-emerald-400 border border-emerald-500/30';
          btn.textContent = 'Revoke Access';
          hud.className = 'flex items-center gap-1 text-emerald-400';
          hud.innerHTML = '<i data-lucide="camera" class="w-3.5 h-3.5"></i> CAM:OK';
          side.className = 'text-emerald-400 font-semibold flex items-center gap-1';
          side.innerHTML = '<span class="w-1.5 h-1.5 rounded-full bg-emerald-400"></span> READY';
          showToast('Camera stream enabled', 'success');
        } else {
          badge.textContent = 'BLOCKED';
          badge.className = 'px-2 py-0.5 rounded text-[10px] bg-rose-500/20 text-rose-400 border border-rose-500/30';
          btn.textContent = 'Grant Access';
          hud.className = 'flex items-center gap-1 text-rose-400';
          hud.innerHTML = '<i data-lucide="camera-off" class="w-3.5 h-3.5"></i> CAM:MUTED';
          side.className = 'text-rose-400 font-semibold flex items-center gap-1';
          side.innerHTML = '<span class="w-1.5 h-1.5 rounded-full bg-rose-400"></span> BLOCKED';
          showToast('Camera stream hardware lock activated', 'info');
        }
      } else {
        appState.micAuthorized = !appState.micAuthorized;
        const badge = document.getElementById('micPermissionBadge');
        const btn = document.getElementById('micToggleBtn');
        const hud = document.getElementById('hudMicIcon');
        const side = document.getElementById('sidebarMicStatus');

        if (appState.micAuthorized) {
          badge.textContent = 'AUTHORIZED';
          badge.className = 'px-2 py-0.5 rounded text-[10px] bg-emerald-500/20 text-emerald-400 border border-emerald-500/30';
          btn.textContent = 'Revoke Access';
          hud.className = 'flex items-center gap-1 text-emerald-400';
          hud.innerHTML = '<i data-lucide="mic" class="w-3.5 h-3.5"></i> MIC:OK';
          side.className = 'text-emerald-400 font-semibold flex items-center gap-1';
          side.innerHTML = '<span class="w-1.5 h-1.5 rounded-full bg-emerald-400"></span> READY';
          showToast('Microphone stream enabled', 'success');
        } else {
          badge.textContent = 'BLOCKED';
          badge.className = 'px-2 py-0.5 rounded text-[10px] bg-rose-500/20 text-rose-400 border border-rose-500/30';
          btn.textContent = 'Grant Access';
          hud.className = 'flex items-center gap-1 text-rose-400';
          hud.innerHTML = '<i data-lucide="mic-off" class="w-3.5 h-3.5"></i> MIC:MUTED';
          side.className = 'text-rose-400 font-semibold flex items-center gap-1';
          side.innerHTML = '<span class="w-1.5 h-1.5 rounded-full bg-rose-400"></span> BLOCKED';
          showToast('Microphone stream hardware lock activated', 'info');
        }
      }
      lucide.createIcons();
    }

    function testCameraStream() {
      showToast('Optical sensor loopback test active: 1080p @ 60fps OK', 'success');
    }

    function testMicStream() {
      showToast('Acoustic frequency test: Latency 12ms, SNR 42dB OK', 'success');
    }

    function confirmClearCache() {
      showToast('Cleared local media and cache', 'success');
    }

    function triggerPersonalDataDownload() {
      const exportData = {
        system: "SARATHI_AI_PROFILE_DATA",
        timestamp: new Date().toISOString(),
        candidate: {
          name: document.getElementById('inputName').value || "Anonymous",
          email: document.getElementById('inputEmail').value || "Not configured",
          college: document.getElementById('inputOrg').value || "Not configured",
        },
        sessions: []
      };

      const blob = new Blob([JSON.stringify(exportData, null, 2)], { type: "application/json" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `sarathi_candidate_dossier_${Date.now()}.json`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);

      showToast('JSON telemetry archive generated and downloaded', 'success');
    }

    function downloadMockInvoice(invId, amt) {
      showToast(`Downloading receipt for #${invId}`, 'success');
    }

    function toggleAllNotifications() {
      appState.allMuted = !appState.allMuted;
      const toggles = document.querySelectorAll('.notif-toggle');
      const btn = document.getElementById('masterMuteBtn');

      toggles.forEach(t => {
        t.checked = !appState.allMuted;
      });

      if (appState.allMuted) {
        btn.textContent = 'UNMUTE ALL CHANNELS';
        showToast('All notifications muted', 'info');
      } else {
        btn.textContent = 'MUTE ALL CHANNELS';
        showToast('All notifications unmuted', 'success');
      }
    }

    function adjustTextScale(val) {
      const multiplier = val / 100;
      document.documentElement.style.setProperty('--ui-scale-multiplier', multiplier);
      document.getElementById('textScaleValue').textContent = `${val}% ${val == 100 ? '(Standard)' : ''}`;
    }

    function toggleHighContrastMode(isChecked) {
      appState.highContrast = isChecked;
      if (isChecked) {
        document.body.classList.add('high-contrast-mode');
        showToast('High-contrast neon mode activated', 'success');
      } else {
        document.body.classList.remove('high-contrast-mode');
        showToast('Standard dark obsidian mode restored', 'info');
      }
    }

    function toggleReducedMotionMode(isChecked) {
      appState.reducedMotion = isChecked;
      if (isChecked) {
        document.body.classList.add('reduced-motion');
        showToast('Transitions and animations disabled', 'info');
      } else {
        document.body.classList.remove('reduced-motion');
        showToast('Animations restored', 'success');
      }
    }

    function toggleCaptionsDemo(isChecked) {
      showToast(isChecked ? 'Speech-to-text HUD captions enabled' : 'Captions disabled', 'info');
    }

    function toggleHudVisibility(show) {
      const hud = document.getElementById('floatingHudIndicator');
      const toggle = document.getElementById('toggleFloatingHud');
      if (show) {
        hud.classList.remove('hidden');
        if (toggle) toggle.checked = true;
      } else {
        hud.classList.add('hidden');
        if (toggle) toggle.checked = false;
      }
    }

    function setExperienceRating(rating) {
      appState.experienceRating = rating;
      document.getElementById('fbRatingVal').value = rating;

      const starButtons = document.querySelectorAll('.star-btn');
      starButtons.forEach((btn, idx) => {
        const starIcon = btn.querySelector('svg') || btn.querySelector('i');
        if (starIcon) {
          if (idx < rating) {
            starIcon.setAttribute('class', 'lucide lucide-star w-6 h-6 fill-neon-orange text-neon-orange');
          } else {
            starIcon.setAttribute('class', 'lucide lucide-star w-6 h-6 fill-none text-neutral-600');
          }
        }
      });

      const labelMap = {
        1: '1.0 / Critical Disruptions',
        2: '2.0 / Sub-optimal Connection',
        3: '3.0 / Acceptable Transmission',
        4: '4.0 / High Fidelity Interface',
        5: '5.0 / Stellar Connection'
      };
      document.getElementById('starRatingLabel').textContent = labelMap[rating] || `${rating}.0`;
    }

    function updateCharCount(textarea) {
      const len = textarea.value.length;
      document.getElementById('charCounter').textContent = `${len} / 1000`;
    }

    function submitFeedbackForm(e) {
      e.preventDefault();
      const btn = document.getElementById('fbSubmitBtn');
      const originalText = btn.innerHTML;

      // Loading state
      btn.innerHTML = `<i data-lucide="loader-2" class="w-4 h-4 animate-spin"></i> TRANSMITTING...`;
      btn.disabled = true;
      lucide.createIcons();

      setTimeout(() => {
        btn.innerHTML = originalText;
        btn.disabled = false;
        showToast('Feedback transmitted to SARATHI-AI Interviewer Engineers. Thank you!', 'success');
        resetFeedbackForm();
        lucide.createIcons();
      }, 1000);
    }

    function resetFeedbackForm() {
      document.getElementById('sarathiFeedbackForm').reset();
      document.getElementById('fbName').value = document.getElementById('inputName').value;
      document.getElementById('fbEmail').value = document.getElementById('inputEmail').value;
      setExperienceRating(5);
      document.getElementById('charCounter').textContent = '0 / 1000';
    }

    // Mobile Navigation & Search
    function setupMobileNavigation() {
      const openBtn = document.getElementById('mobileMenuBtn');
      const closeBtn = document.getElementById('mobileMenuClose');
      const sidebar = document.getElementById('sidebar');
      const backdrop = document.getElementById('sidebarBackdrop');

      openBtn?.addEventListener('click', () => {
        sidebar.classList.remove('-translate-x-full');
        backdrop.classList.remove('hidden');
      });

      const closeAction = () => {
        sidebar.classList.add('-translate-x-full');
        backdrop.classList.add('hidden');
      };

      closeBtn?.addEventListener('click', closeAction);
      backdrop?.addEventListener('click', closeAction);
    }

    function closeMobileSidebar() {
      document.getElementById('sidebar')?.classList.add('-translate-x-full');
      document.getElementById('sidebarBackdrop')?.classList.add('hidden');
    }

    function setupSearchFilter() {
      const input = document.getElementById('settingsSearchInput');
      input?.addEventListener('input', (e) => {
        const query = e.target.value.toLowerCase().trim();
        if (!query) return;

        // Keyword router to tabs
        const tabKeywords = {
          'account': ['name', 'profile', 'college', 'degree', 'job', 'role', 'domain', 'avatar', 'email'],
          'security': ['password', 'login', 'google', 'github', 'session', 'purge', 'delete', 'sso', 'key'],
          'privacy': ['camera', 'mic', 'microphone', 'permission', 'record', 'cache', 'history', 'retention', 'download', 'consent'],
          'notifications': ['notification', 'email', 'reminder', 'alert', 'weekly', 'billing', 'mute'],
          'subscription': ['plan', 'credit', 'upgrade', 'invoice', 'billing', 'reward', 'cancel', 'tier', 'usage'],
          'accessibility': ['text', 'font', 'contrast', 'motion', 'captions', 'subtitles', 'hud', 'keyboard', 'display'],
          'help-feedback': ['feedback', 'help', 'support', 'bug', 'report', 'experience', 'contact']
        };

        for (const [tab, keywords] of Object.entries(tabKeywords)) {
          if (keywords.some(k => k.includes(query) || query.includes(k))) {
            switchTab(tab);
            break;
          }
        }
      });
    }

    // Toast Engine
    let toastTimeout = null;
    function showToast(message, type = 'info') {
      const toast = document.getElementById('toastNotification');
      const msgEl = document.getElementById('toastMessage');
      const icon = document.getElementById('toastIcon');

      msgEl.textContent = message;

      if (type === 'success') {
        icon.className = 'w-4 h-4 text-emerald-400';
        icon.setAttribute('data-lucide', 'check-circle-2');
      } else if (type === 'error') {
        icon.className = 'w-4 h-4 text-rose-500';
        icon.setAttribute('data-lucide', 'alert-triangle');
      } else {
        icon.className = 'w-4 h-4 text-neon-orange';
        icon.setAttribute('data-lucide', 'info');
      }
      lucide.createIcons();

      toast.classList.remove('translate-y-24', 'opacity-0');
      toast.classList.add('translate-y-0', 'opacity-100');

      clearTimeout(toastTimeout);
      toastTimeout = setTimeout(() => {
        toast.classList.add('translate-y-24', 'opacity-0');
        toast.classList.remove('translate-y-0', 'opacity-100');
      }, 3500);
    }
