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
        result,complete=cpu.counters(snapshot(1),snapshot(3));self.assertTrue(complete);self.assertEqual([c['percent'] for c in result],[1,2])
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

if __name__=='__main__':unittest.main()
