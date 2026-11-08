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

def measure(snapshot,sleep,max_attempts=3):
    attempts=[]
    for number in range(max_attempts):
        before=snapshot();sleep(2);after=snapshot();cpu,complete=counters(before,after)
        attempts.append({'attempt':number+1,'before':before,'after':after,'cpu':cpu,'complete':complete})
        if complete:break
    return {'processes':after,'cpu':cpu,'complete':complete,'measurementAttempts':attempts}
