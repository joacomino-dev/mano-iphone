"""Real process counter windows. New PIDs require a fresh measured window."""
import math

def counters(before,after):
    previous={p['pid']:p for p in before};cpu=[]
    for current in after:
        old=previous.get(current['pid']);percent=None
        if old and old['role']==current['role']:
            elapsed=current['monotonic']-old['monotonic'];used=current['cpuSeconds']-old['cpuSeconds']
            if elapsed>0 and used>=0 and math.isfinite(elapsed) and math.isfinite(used):percent=100*used/elapsed
        cpu.append({'pid':current['pid'],'percent':percent})
    complete=all(any(p['role']==role for p in after) for role in ['app','webcontent']) and all(c['percent'] is not None for c in cpu)
    return cpu,complete

def app_percent(before,after):
    """The app process's CPU over one window; None when it cannot be known."""
    previous={p['pid']:p for p in before if p['role']=='app'}
    for current in after:
        old=previous.get(current['pid']) if current['role']=='app' else None
        if old:
            elapsed=current['monotonic']-old['monotonic'];used=current['cpuSeconds']-old['cpuSeconds']
            if elapsed>0 and used>=0 and math.isfinite(elapsed) and math.isfinite(used):return 100*used/elapsed
    return None

def settle(snapshot,sleep,max_probes=25,threshold=10.0,on_busy=None,report_after=8):
    """Wait until the app is quiet (under `threshold` % CPU over a 1 s window) before measuring,
    as the Android collector does (same 10 %). Run 43687846772 measured round 6 with the app at
    82 % CPU and its memory still holding that work. Bounded: an app that never quiets is
    recorded as unsettled and fails the budget (appSettlesAfterEveryRound); `on_busy` is told
    once, after `report_after` probes, so its stacks can be kept. Budgets are unchanged."""
    for probe in range(max_probes):
        before=snapshot();sleep(1);after=snapshot();percent=app_percent(before,after)
        if percent is not None and percent<threshold:return {'settleProbes':probe,'settled':True}
        if on_busy and probe+1==report_after:on_busy(probe+1)
    return {'settleProbes':max_probes,'settled':False}

def measure(snapshot,sleep,max_attempts=3):
    attempts=[]
    for number in range(max_attempts):
        before=snapshot();sleep(2);after=snapshot();cpu,complete=counters(before,after)
        attempts.append({'attempt':number+1,'before':before,'after':after,'cpu':cpu,'complete':complete})
        if complete:break
    return {'processes':after,'cpu':cpu,'complete':complete,'measurementAttempts':attempts}
