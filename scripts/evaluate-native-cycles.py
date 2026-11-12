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

def memory_trend(values):
    baseline=statistics.median(values[:3]);late=statistics.median(values[-3:])
    x=list(range(2,11));y=values[2:];xm=statistics.mean(x);ym=statistics.mean(y)
    slope=sum((a-xm)*(b-ym) for a,b in zip(x,y))/sum((a-xm)**2 for a in x)
    checks={'lateMemoryGrowth':late-baseline<=BUDGETS['maxLateMemoryGrowthKiB'],'memorySlope':slope<=BUDGETS['maxSlopeKiBPerCycle']}
    return {'baselineMemoryKiB':baseline,'lateMemoryKiB':late,'slopeKiBPerCycle':slope,'checks':checks}

def evaluate(report):
    rows=report.get('rows',[])
    result={'status':'BLOCKED','budgets':BUDGETS,'boundary':'Small owned fixture library, ten rounds, simulator only. Not physical iPhone/Android or large-library acceptance.'}
    if len(rows)!=11 or [r.get('cycle') for r in rows]!=list(range(11)):
        return dict(result,reason='Eleven ordered baseline/cycle samples are required')
    memory=[];cpu=[];snapshots=[]
    for row in rows:
        roles={p.get('role') for p in row.get('processes',[])}
        if 'app' not in roles or not roles.intersection({'webcontent','renderer'}):
            return dict(result,reason='Owned app and attributed WebContent/renderer required')
        if not roles.issubset({'app','webcontent','renderer'}): return dict(result,reason='Unknown process role')
        processes=row['processes'];pids=[str(p.get('pid','')) for p in processes]
        cpu_pids=[str(c.get('pid','')) for c in row.get('cpu',[])]
        if '' in pids or len(set(pids))!=len(pids) or len(set(cpu_pids))!=len(cpu_pids) or set(cpu_pids)!=set(pids):
            return dict(result,reason='Missing, duplicate or mismatched process CPU identity')
        measured=[p.get('rssKiB',p.get('pssKiB')) for p in processes]
        if any(v is None or not math.isfinite(v) or v<=0 for v in measured): return dict(result,reason='Per-process memory missing or invalid')
        values=[c.get('percent') for c in row.get('cpu',[])]
        if not values or any(v is None or not math.isfinite(v) or v<0 for v in values):
            return dict(result,reason='CPU counters missing or invalid')
        if len(values)!=len(row['processes']): return dict(result,reason='Every measured process needs CPU')
        total=row.get('combinedRssKiB',row.get('combinedPssKiB'))
        if total is None or not math.isfinite(total) or total<=0: return dict(result,reason='Measured memory unavailable')
        if abs(total-sum(measured))>1: return dict(result,reason='Aggregate memory does not match measured processes')
        snapshots.append({pid:{'role':p['role'],'memory':v} for pid,p,v in zip(pids,processes,measured)})
        memory.append(total);cpu.append(sum(values))
    combined=memory_trend(memory)
    role_trends={role:memory_trend([sum(p['memory'] for p in s.values() if p['role']==role) for s in snapshots]) for role in set(p['role'] for s in snapshots for p in s.values())}
    stable_pids=set.intersection(*(set(s) for s in snapshots))
    process_trends={pid:dict(memory_trend([s[pid]['memory'] for s in snapshots]),role=snapshots[0][pid]['role']) for pid in sorted(stable_pids)}
    baseline_cpu=statistics.median(cpu[:3]);late_cpu=statistics.median(cpu[-3:])
    checks={**combined['checks'],'rolesWithinMemoryBudget':all(all(t['checks'].values()) for t in role_trends.values()),'stableProcessesWithinMemoryBudget':all(all(t['checks'].values()) for t in process_trends.values()),'lateIdleCpu':late_cpu<=BUDGETS['maxLateIdleCpuPercent'],'idleCpuGrowth':late_cpu-baseline_cpu<=BUDGETS['maxIdleCpuGrowthPercentagePoints'],
            # Android probes for quiet before measuring; a row that never settled is a real busy loop.
            'appSettlesAfterEveryRound':all(r.get('settled',True) for r in rows)}
    return dict(result,**{k:v for k,v in combined.items() if k!='checks'},status='PASS' if all(checks.values()) else 'FAIL',checks=checks,roleTrends=role_trends,stableProcessTrends=process_trends,baselineIdleCpuPercent=baseline_cpu,lateIdleCpuPercent=late_cpu)

if __name__=='__main__':
    path=Path(sys.argv[1]);report=json.loads(path.read_text())
    report['performanceAcceptance']=evaluate(report)
    path.write_text(json.dumps(report,indent=2)+'\n')
    print('NATIVE_CYCLE_BUDGET_'+report['performanceAcceptance']['status'],json.dumps(report['performanceAcceptance']))
    sys.exit(0 if report['performanceAcceptance']['status']=='PASS' else 1)
