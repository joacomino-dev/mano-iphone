"""Regression budget for ten native fixture rounds, not a hardware benchmark.

Budgets declared before the first completed native cycle measurement. Ignore the
first two rounds' cache warmup; require low late idle CPU and bounded late growth.
RSS (iOS host) and PSS (Android) are never compared across platforms.
"""
import json
import math
from pathlib import Path
import statistics
import sys

BUDGETS={'maxLateMemoryGrowthKiB':24*1024,'maxSlopeKiBPerCycle':1024,'maxLateIdleCpuPercent':15,'maxIdleCpuGrowthPercentagePoints':5}

def evaluate(report):
    rows=report.get('rows',[])
    result={'status':'BLOCKED','budgets':BUDGETS,'boundary':'64 synthetic media items, ten rounds, simulator only. Not physical iPhone/Android or large-library acceptance.'}
    if len(rows)!=11 or [r.get('cycle') for r in rows]!=list(range(11)):
        return dict(result,reason='Eleven ordered baseline/cycle samples are required')
    memory=[];cpu=[]
    for row in rows:
        roles={p.get('role') for p in row.get('processes',[])}
        if 'app' not in roles or not roles.intersection({'webcontent','renderer'}):
            return dict(result,reason='Owned app and attributed WebContent/renderer required')
        values=[c.get('percent') for c in row.get('cpu',[])]
        if not values or any(v is None or not math.isfinite(v) or v<0 for v in values):
            return dict(result,reason='CPU counters missing or invalid')
        if len(values)!=len(row['processes']): return dict(result,reason='Every measured process needs CPU')
        total=row.get('combinedRssKiB',row.get('combinedPssKiB'))
        if total is None or not math.isfinite(total) or total<=0: return dict(result,reason='Measured memory unavailable')
        memory.append(total);cpu.append(sum(values))
    baseline=statistics.median(memory[:3]);late=statistics.median(memory[-3:])
    x=list(range(2,11));y=memory[2:];xm=statistics.mean(x);ym=statistics.mean(y)
    slope=sum((a-xm)*(b-ym) for a,b in zip(x,y))/sum((a-xm)**2 for a in x)
    baseline_cpu=statistics.median(cpu[:3]);late_cpu=statistics.median(cpu[-3:])
    checks={'lateMemoryGrowth':late-baseline<=BUDGETS['maxLateMemoryGrowthKiB'],'memorySlope':slope<=BUDGETS['maxSlopeKiBPerCycle'],'lateIdleCpu':late_cpu<=BUDGETS['maxLateIdleCpuPercent'],'idleCpuGrowth':late_cpu-baseline_cpu<=BUDGETS['maxIdleCpuGrowthPercentagePoints']}
    return dict(result,status='PASS' if all(checks.values()) else 'FAIL',checks=checks,baselineMemoryKiB=baseline,lateMemoryKiB=late,slopeKiBPerCycle=slope,baselineIdleCpuPercent=baseline_cpu,lateIdleCpuPercent=late_cpu)

if __name__=='__main__':
    path=Path(sys.argv[1]);report=json.loads(path.read_text())
    report['performanceAcceptance']=evaluate(report)
    path.write_text(json.dumps(report,indent=2)+'\n')
    print('NATIVE_CYCLE_BUDGET_'+report['performanceAcceptance']['status'],json.dumps(report['performanceAcceptance']))
    sys.exit(0 if report['performanceAcceptance']['status']=='PASS' else 1)
