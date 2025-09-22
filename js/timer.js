// timer.js - encapsulates timer logic and state
export default function createTimer({onTick, onComplete}) {
    let seconds = 1500; // default 25 minutes
    let timerInterval = null;
    let isRunning = false;
    let mode = 'work';
    let count = 0;
    let totalFocusTime = 0;
    let remoteHook = null;

    function setSecondsForMode(m) {
        if (m === 'work') return 1500;
        if (m === 'shortBreak') return 300;
        if (m === 'longBreak') return 900;
        return 1500;
    }

    function updateTick() {
        if (onTick) onTick(seconds, {mode, isRunning, count, totalFocusTime});
    }

    function start() {
        if (!isRunning) {
            isRunning = true;
            timerInterval = setInterval(() => {
                seconds--;
                updateTick();

                if (seconds <= 0) {
                    clearInterval(timerInterval);
                    isRunning = false;

                    // completion
                    if (mode === 'work') {
                        count++;
                        totalFocusTime += 25;
                        if (typeof remoteHook === 'function') remoteHook({count, totalFocusTime, mode});
                    }

                    if (onComplete) onComplete({mode, count});
                }
            }, 1000);
        }
    }

    function pause() {
        clearInterval(timerInterval);
        isRunning = false;
    }

    function reset() {
        clearInterval(timerInterval);
        isRunning = false;
        seconds = setSecondsForMode(mode);
        updateTick();
    }

    function setMode(m) {
        mode = m;
        seconds = setSecondsForMode(m);
        updateTick();
    }

    function getState() {
        return {seconds, mode, isRunning, count, totalFocusTime};
    }

    function setRemoteHook(fn) { remoteHook = fn; }

    return {start, pause, reset, setMode, getState, onTick, onComplete, setRemoteHook};
}
