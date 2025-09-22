import createTimer from './timer.js';
import { createTasks } from './tasks.js';
import createNotes from './notes.js';
import { createSpotifyEmbed } from './spotify.js';

// optional firebase imports will be loaded at runtime if config exists
import { initFirebase, listenToUser, setUserData, onAuthStateChanged, signInWithEmail, createUserWithEmail, signOut } from './firebase.js';

document.addEventListener('DOMContentLoaded', async () => {
    // Elements
    const timerDisplay = document.getElementById('timer');
    const startBtn = document.getElementById('start-btn');
    const pauseBtn = document.getElementById('pause-btn');
    const resetBtn = document.getElementById('reset-btn');
    const workModeBtn = document.getElementById('work-mode');
    const shortBreakModeBtn = document.getElementById('short-break-mode');
    const longBreakModeBtn = document.getElementById('long-break-mode');
    const pomodoroCount = document.getElementById('count');

    const taskInput = document.getElementById('task-input');
    const addTaskBtn = document.getElementById('add-task-btn');
    const taskList = document.getElementById('task-list');
    const notesArea = document.getElementById('notes-area');

    const tasksCompletedElement = document.getElementById('tasks-completed');
    const focusTimeElement = document.getElementById('focus-time');
    const pomodorosCompletedElement = document.getElementById('pomodoros-completed');

    const tasks = createTasks();
    const notes = createNotes();

    // Try to load firebase config (user should copy firebase-config.example.js -> firebase-config.js)
    let firebaseConfig = null;
    try {
        // dynamic import attempt
        // eslint-disable-next-line no-eval
        const cfg = await import('./firebase-config.js');
        firebaseConfig = cfg.default || cfg;
    } catch (err) {
        // no config present — that's fine; app will work with localStorage only
    }

    let currentUserId = null;
    let unsubscribeUser = null;
    if (firebaseConfig) {
        initFirebase(firebaseConfig).then(({ auth, firestore } = {}) => {
            // If onAuthStateChanged is available, use it to track the signed-in user
            if (typeof onAuthStateChanged === 'function') {
                onAuthStateChanged(user => {
                    if (user) {
                        currentUserId = user.uid;
                        document.getElementById('auth-status').textContent = `Signed in: ${user.email || user.uid}`;
                        document.getElementById('auth-logout').style.display = '';
                        // detach previous listener
                        if (unsubscribeUser) { unsubscribeUser(); unsubscribeUser = null; }
                        // start listening to this user's doc
                        unsubscribeUser = listenToUser(currentUserId, remote => {
                            if (!remote) return;
                            if (remote.notes && typeof notes.setApplyRemote === 'function') {
                                localStorage.setItem('pomodoroNotesList', JSON.stringify(remote.notes));
                                notes.load();
                            }
                            if (remote.tasks && typeof tasks.setApplyRemote === 'function') {
                                localStorage.setItem('pomodoroTasks', JSON.stringify(remote.tasks));
                                localStorage.setItem('pomodoroTasksCompleted', remote.tasksCompleted || 0);
                                tasks.load();
                            }
                            if (remote.timer) {
                                localStorage.setItem('pomodoroTimerState', JSON.stringify(remote.timer));
                            }
                        });
                    } else {
                        // signed out
                        currentUserId = null;
                        document.getElementById('auth-status').textContent = 'Not signed in';
                        document.getElementById('auth-logout').style.display = 'none';
                        if (unsubscribeUser) { unsubscribeUser(); unsubscribeUser = null; }
                    }
                });
            } else {
                // fallback: try to use auth.currentUser or listen to anon doc
                const user = (auth && auth.currentUser) || null;
                currentUserId = user ? user.uid : 'anon';
                unsubscribeUser = listenToUser(currentUserId, remote => {
                    if (!remote) return;
                    if (remote.notes && typeof notes.setApplyRemote === 'function') {
                        localStorage.setItem('pomodoroNotesList', JSON.stringify(remote.notes));
                        notes.load();
                    }
                    if (remote.tasks && typeof tasks.setApplyRemote === 'function') {
                        localStorage.setItem('pomodoroTasks', JSON.stringify(remote.tasks));
                        localStorage.setItem('pomodoroTasksCompleted', remote.tasksCompleted || 0);
                        tasks.load();
                    }
                    if (remote.timer) {
                        localStorage.setItem('pomodoroTimerState', JSON.stringify(remote.timer));
                    }
                });
            }
        }).catch(err => console.warn('firebase init failed', err));
    }

    // Notes UI elements
    const notesListEl = document.getElementById('notes-list');
    const newNoteBtn = document.getElementById('new-note-btn');
    const noteTitleInput = document.getElementById('note-title');

    function formatTime(seconds) {
        const mins = Math.floor(seconds / 60);
        const secs = seconds % 60;
        return `${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
    }

    const timer = createTimer({
        onTick(seconds, state) {
            timerDisplay.textContent = formatTime(seconds);
            if (seconds < 60) timerDisplay.style.color = '#e74c3c';
            else timerDisplay.style.color = '#2c3e50';
        },
        onComplete({mode, count}) {
            // play sound
            const audio = new Audio('https://assets.mixkit.co/sfx/preview/mixkit-alarm-digital-clock-beep-989.mp3');
            audio.play().catch(() => {});

            if (mode === 'work') {
                pomodoroCount.textContent = count;
                pomodorosCompletedElement.textContent = count;
                // decide next mode
                if (count % 4 === 0) {
                    setLongBreakMode();
                } else {
                    setShortBreakMode();
                }
            } else {
                setWorkMode();
            }

            // Auto-start next period
            timer.start();
        }
    });

    function renderTasks() {
        taskList.innerHTML = '';
        tasks.getTasks().forEach(task => {
            const li = document.createElement('li');
            li.className = 'task-item' + (task.completed ? ' task-completed' : '');
            li.innerHTML = `
                <input type="checkbox" class="task-checkbox" ${task.completed ? 'checked' : ''} data-id="${task.id}">
                <span class="task-text">${task.text}</span>
                <span class="task-delete" data-id="${task.id}"><i class="fas fa-trash"></i></span>
            `;
            taskList.appendChild(li);
        });
        tasksCompletedElement.textContent = tasks.getTasksCompleted();
    }

    function addTask() {
        const text = taskInput.value.trim();
        if (!text) return;
        tasks.addTask(text);
        taskInput.value = '';
        renderTasks();
    }

    taskList.addEventListener('click', (e) => {
        if (e.target.classList.contains('task-checkbox')) {
            const id = parseInt(e.target.getAttribute('data-id'), 10);
            tasks.toggleTask(id);
            renderTasks();
        }

        if (e.target.classList.contains('task-delete') || (e.target.parentElement && e.target.parentElement.classList.contains('task-delete'))) {
            const el = e.target.classList.contains('task-delete') ? e.target : e.target.parentElement;
            const id = parseInt(el.getAttribute('data-id'), 10);
            tasks.deleteTask(id);
            renderTasks();
        }
    });

    addTaskBtn.addEventListener('click', addTask);
    taskInput.addEventListener('keypress', (e) => { if (e.key === 'Enter') addTask(); });

    // Initialize notes editor: use EasyMDE if it's loaded, otherwise fallback to textarea
    let easyMDEInstance = null;

    function initEasyMDE() {
        try {
            if (window.EasyMDE && !easyMDEInstance) {
                easyMDEInstance = new EasyMDE({
                    element: notesArea,
                    spellChecker: false,
                    autosave: { enabled: true, uniqueId: 'focuspomodoro-notes' },
                    placeholder: 'Jot down your ideas, reflections, or plans here...'
                });
                return true;
            }
        } catch (err) {
            console.warn('EasyMDE init failed:', err);
        }
        return false;
    }

    // Try initializing now; if the script loads later, the window load handler will attempt again
        const ok = initEasyMDE();
        if (ok) setupEditorSync();
        window.addEventListener('load', () => {
            const ok = initEasyMDE();
            if (ok) setupEditorSync();
        });

    // ----- Notes handling -----
    function renderNotesList() {
        const all = notes.getNotes();
        notesListEl.innerHTML = '';
        all.forEach(n => {
            const li = document.createElement('li');
            li.dataset.id = n.id;
            li.className = (notes.getActiveNote() && notes.getActiveNote().id === n.id) ? 'active' : '';
            li.innerHTML = `
                <div class="note-item-main">
                    <strong>${escapeHtml(n.title || 'Untitled')}</strong>
                    <small>${new Date(n.updatedAt).toLocaleString()}</small>
                </div>
                <button class="note-delete-btn" data-id="${n.id}" title="Delete note"><i class="fas fa-trash"></i></button>
            `;
            notesListEl.appendChild(li);
        });
    }

    function escapeHtml(str) {
        return String(str).replace(/[&<>"']/g, s => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":"&#39;"})[s]);
    }

    function loadActiveNoteToEditor() {
        const active = notes.getActiveNote();
        if (!active) {
            noteTitleInput.value = '';
            if (easyMDEInstance) easyMDEInstance.value('');
            else notesArea.value = '';
            return;
        }
        noteTitleInput.value = active.title;
        if (easyMDEInstance) easyMDEInstance.value(active.body);
        else notesArea.value = active.body;
    }

    // note selection from sidebar
    notesListEl.addEventListener('click', (e) => {
        const li = e.target.closest('li');
        if (!li) return;
        const id = parseInt(li.dataset.id, 10);
        notes.setActive(id);
        renderNotesList();
        loadActiveNoteToEditor();
    });

    // create new note
    newNoteBtn.addEventListener('click', () => {
        notes.createNote();
        renderNotesList();
        loadActiveNoteToEditor();
    });

    // Delete modal elements
    const confirmModal = document.getElementById('confirm-modal');
    const cancelDeleteBtn = document.getElementById('cancel-delete-btn');
    const confirmDeleteBtn = document.getElementById('confirm-delete-btn');
    let pendingDeleteId = null;

    // Delegate delete button clicks in notes list
    notesListEl.addEventListener('click', (e) => {
        const btn = e.target.closest('.note-delete-btn');
        if (!btn) return;
        e.stopPropagation();
        const id = parseInt(btn.getAttribute('data-id'), 10);
        pendingDeleteId = id;
        // show modal
        confirmModal.classList.remove('hidden');
    });

    cancelDeleteBtn.addEventListener('click', () => {
        pendingDeleteId = null;
        confirmModal.classList.add('hidden');
    });

    confirmDeleteBtn.addEventListener('click', () => {
        if (pendingDeleteId != null) {
            notes.deleteNote(pendingDeleteId);
            pendingDeleteId = null;
            confirmModal.classList.add('hidden');
            renderNotesList();
            loadActiveNoteToEditor();
        }
    });

    // title edits
    noteTitleInput.addEventListener('input', () => {
        const active = notes.getActiveNote();
        if (!active) return;
        notes.updateNote(active.id, { title: noteTitleInput.value });
        renderNotesList();
    });

    // editor changes -> update active note
    function setupEditorSync() {
        if (easyMDEInstance) {
            easyMDEInstance.codemirror.on('change', () => {
                const active = notes.getActiveNote();
                if (!active) return;
                const body = easyMDEInstance.value();
                notes.updateNote(active.id, { body });
                renderNotesList();
            });
        } else {
            notesArea.addEventListener('input', () => {
                const active = notes.getActiveNote();
                if (!active) return;
                notes.updateNote(active.id, { body: notesArea.value });
                renderNotesList();
            });
        }
    }

    // ensure notes list re-renders when notes change
    notes.onChange(() => {
        renderNotesList();
    });

    // initial notes load
    notes.load();
    renderNotesList();
    loadActiveNoteToEditor();
    setupEditorSync();

    function setWorkMode() {
        timer.setMode('work');
        workModeBtn.classList.add('active');
        shortBreakModeBtn.classList.remove('active');
        longBreakModeBtn.classList.remove('active');
    }

    function setShortBreakMode() {
        timer.setMode('shortBreak');
        workModeBtn.classList.remove('active');
        shortBreakModeBtn.classList.add('active');
        longBreakModeBtn.classList.remove('active');
    }

    function setLongBreakMode() {
        timer.setMode('longBreak');
        workModeBtn.classList.remove('active');
        shortBreakModeBtn.classList.remove('active');
        longBreakModeBtn.classList.add('active');
    }

    startBtn.addEventListener('click', () => timer.start());
    pauseBtn.addEventListener('click', () => timer.pause());
    resetBtn.addEventListener('click', () => timer.reset());

    workModeBtn.addEventListener('click', setWorkMode);
    shortBreakModeBtn.addEventListener('click', setShortBreakMode);
    longBreakModeBtn.addEventListener('click', setLongBreakMode);

    // Spotify embed handling: update on change and while typing (debounced)
    const spotifyInput = document.getElementById('spotify-url');
    if (spotifyInput) {
        spotifyInput.addEventListener('change', () => createSpotifyEmbed());
        let debounceTimer = null;
        spotifyInput.addEventListener('input', () => {
            clearTimeout(debounceTimer);
            debounceTimer = setTimeout(() => createSpotifyEmbed(), 600);
        });
    }

    // Preset playlist buttons (avoid inline onclicks)
    const presetBtn = document.getElementById('preset-autumn-lofi');
    if (presetBtn && spotifyInput) {
        presetBtn.addEventListener('click', () => {
            const url = presetBtn.getAttribute('data-playlist');
            spotifyInput.value = url;
            // call embed creator
            createSpotifyEmbed();
        });
    }

    // Auth UI handlers (login/signup/logout)
    const loginBtn = document.getElementById('auth-login');
    const signupBtn = document.getElementById('auth-signup');
    const logoutBtn = document.getElementById('auth-logout');

    if (loginBtn) {
        loginBtn.addEventListener('click', async () => {
            const email = document.getElementById('auth-email').value;
            const password = document.getElementById('auth-password').value;
            try {
                await signInWithEmail(email, password);
            } catch (err) {
                document.getElementById('auth-status').textContent = 'Login error: ' + (err.message || err);
            }
        });
    }

    if (signupBtn) {
        signupBtn.addEventListener('click', async () => {
            const email = document.getElementById('auth-email').value;
            const password = document.getElementById('auth-password').value;
            try {
                await createUserWithEmail(email, password);
            } catch (err) {
                document.getElementById('auth-status').textContent = 'Signup error: ' + (err.message || err);
            }
        });
    }

    if (logoutBtn) {
        logoutBtn.addEventListener('click', async () => {
            try {
                await signOut();
            } catch (err) {
                document.getElementById('auth-status').textContent = 'Logout error: ' + (err.message || err);
            }
        });
    }

    // initialize UI
    renderTasks();
    // initial tick to show display
    const state = timer.getState();
    timerDisplay.textContent = '25:00';
    // When significant local data changes, write back to Firestore if available
    function pushLocalStateToFirestore() {
        if (!firebaseConfig || !currentUserId) return;
        const payload = {
            notes: notes.getNotes(),
            tasks: tasks.getTasks(),
            tasksCompleted: tasks.getTasksCompleted(),
            timer: timer.getState()
        };
        setUserData(currentUserId, payload).catch(err => console.warn('failed to push user data', err));
    }

    // wire local save hooks to push to Firestore
    if (typeof notes.setApplyRemote === 'function') {
        notes.setApplyRemote(() => pushLocalStateToFirestore());
    }
    if (typeof tasks.setApplyRemote === 'function') {
        tasks.setApplyRemote(() => pushLocalStateToFirestore());
    }
    if (typeof timer.setRemoteHook === 'function') {
        timer.setRemoteHook(() => pushLocalStateToFirestore());
    }
});
