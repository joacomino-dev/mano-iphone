import importlib.util
from pathlib import Path
import unittest
spec=importlib.util.spec_from_file_location('cpu',Path(__file__).parents[1]/'apple-fixtures/native_cpu_samples.py')
cpu=importlib.util.module_from_spec(spec);spec.loader.exec_module(cpu)

def snapshot(second,extra=False):
    rows=[{'pid':1,'role':'app','monotonic':second,'cpuSeconds':second*.01},{'pid':2,'role':'webcontent','monotonic':second,'cpuSeconds':second*.02}]
    if extra:rows.append({'pid':3,'role':'webcontent','monotonic':second,'cpuSeconds':second*.03})
    return rows

class NativeCpuSamples(unittest.TestCase):
    def test_actual_counter_difference(self):
        result,complete=cpu.counters(snapshot(1),snapshot(3));self.assertTrue(complete)
        for actual,expected in zip(result,[1,2]):self.assertAlmostEqual(actual['percent'],expected,places=7)
    def test_new_process_is_unknown_not_zero(self):
        result,complete=cpu.counters(snapshot(1),snapshot(3,True));self.assertFalse(complete);self.assertIsNone(result[-1]['percent'])
    def test_new_process_requires_measured_second_window(self):
        source=iter([snapshot(1),snapshot(3,True),snapshot(4,True),snapshot(6,True)])
        result=cpu.measure(lambda:next(source),lambda seconds:None)
        self.assertTrue(result['complete']);self.assertEqual(len(result['measurementAttempts']),2);self.assertIsNone(result['measurementAttempts'][0]['cpu'][-1]['percent']);self.assertAlmostEqual(result['cpu'][-1]['percent'],3)
    def test_continuous_churn_remains_blocked_and_bounded(self):
        source=iter([snapshot(1),snapshot(3,True)]*3);result=cpu.measure(lambda:next(source),lambda seconds:None)
        self.assertFalse(result['complete']);self.assertEqual(len(result['measurementAttempts']),3)
    def test_backwards_counter_not_accepted(self):
        before=snapshot(1);after=snapshot(3);after[0]['cpuSeconds']=0
        self.assertFalse(cpu.counters(before,after)[1])
    def test_zero_time_not_accepted(self):self.assertFalse(cpu.counters(snapshot(1),snapshot(1))[1])
    def test_missing_role_not_accepted(self):self.assertFalse(cpu.counters(snapshot(1)[:1],snapshot(3)[:1])[1])

    # Settle before measuring (run 43687846772: round 6 was measured with the app at 82 % CPU).
    def test_settle_waits_for_a_quiet_app(self):
        busy=lambda second:[{'pid':1,'role':'app','monotonic':second,'cpuSeconds':second*.8},{'pid':2,'role':'webcontent','monotonic':second,'cpuSeconds':0}]
        quiet=lambda second:[{'pid':1,'role':'app','monotonic':second,'cpuSeconds':100+second*.02},{'pid':2,'role':'webcontent','monotonic':second,'cpuSeconds':0}]
        source=iter([busy(0),busy(1),busy(2),busy(3),quiet(4),quiet(5)])
        result=cpu.settle(lambda:next(source),lambda seconds:None)
        self.assertTrue(result['settled']);self.assertEqual(result['settleProbes'],2)
    def test_settle_is_bounded_and_says_so(self):
        busy=lambda second:[{'pid':1,'role':'app','monotonic':second,'cpuSeconds':second*.8}]
        clock=iter(range(1000));seen=[]
        result=cpu.settle(lambda:busy(next(clock)),lambda seconds:None,max_probes=5,on_busy=lambda probe:seen.append(probe),report_after=3)
        self.assertFalse(result['settled']);self.assertEqual(result['settleProbes'],5);self.assertEqual(seen,[3])
    def test_settle_unknown_cpu_is_not_quiet(self):
        source=iter([[{'pid':1,'role':'app','monotonic':0,'cpuSeconds':0}],[{'pid':9,'role':'app','monotonic':1,'cpuSeconds':0}]]*2)
        result=cpu.settle(lambda:next(source),lambda seconds:None,max_probes=2)
        self.assertFalse(result['settled'])

if __name__=='__main__':unittest.main()
