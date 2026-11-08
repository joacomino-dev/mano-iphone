import copy
import importlib.util
from pathlib import Path
import unittest

spec=importlib.util.spec_from_file_location('budget',Path(__file__).parents[1]/'evaluate-native-cycles.py')
budget=importlib.util.module_from_spec(spec);spec.loader.exec_module(budget)

class NativeBudgetTests(unittest.TestCase):
    def report(self):
        return {'rows':[{'cycle':i,'processes':[{'pid':1,'role':'app','rssKiB':80000+i*15},{'pid':2,'role':'webcontent','rssKiB':100000+i*15}],'combinedRssKiB':180000+i*30,'cpu':[{'pid':1,'percent':1},{'pid':2,'percent':2}]} for i in range(11)]}
    def test_stable(self): self.assertEqual(budget.evaluate(self.report())['status'],'PASS')
    def test_missing(self):
        r=self.report();r['rows'].pop();self.assertEqual(budget.evaluate(r)['status'],'BLOCKED')
    def test_unknown_renderer(self):
        r=self.report();r['rows'][4]['processes'][1]['role']='renderer-candidate';self.assertEqual(budget.evaluate(r)['status'],'BLOCKED')
    def test_missing_cpu(self):
        r=self.report();r['rows'][7]['cpu'][1]['percent']=None;self.assertEqual(budget.evaluate(r)['status'],'BLOCKED')
    def test_sustained_memory(self):
        r=self.report()
        for row in r['rows']:
            row['combinedRssKiB']+=row['cycle']*3000
            row['processes'][0]['rssKiB']+=row['cycle']*3000
        self.assertEqual(budget.evaluate(r)['status'],'FAIL')
    def test_idle_cpu(self):
        r=self.report()
        for row in r['rows'][5:]: row['cpu'][1]['percent']=25
        self.assertEqual(budget.evaluate(r)['status'],'FAIL')
    def test_negative_counter(self):
        r=self.report();r['rows'][1]['cpu'][0]['percent']=-2;self.assertEqual(budget.evaluate(r)['status'],'BLOCKED')
    def test_app_growth_cannot_hide_under_webcontent_cleanup(self):
        r=self.report()
        for row in r['rows']:
            row['processes'][0]['rssKiB']+=row['cycle']*3000
            row['processes'][1]['rssKiB']-=row['cycle']*3000
        self.assertEqual(budget.evaluate(r)['status'],'FAIL')
    def test_one_webview_growth_cannot_hide_under_another_cleanup(self):
        r=self.report()
        for row in r['rows']:
            row['processes'][1]['rssKiB']-=row['cycle']*3000+40000
            row['processes'].append({'pid':3,'role':'webcontent','rssKiB':40000+row['cycle']*3000})
            row['cpu'].append({'pid':3,'percent':1})
        self.assertEqual(budget.evaluate(r)['status'],'FAIL')
    def test_wrong_process_cpu_attribution(self):
        r=self.report();r['rows'][4]['cpu'][1]['pid']=999
        self.assertEqual(budget.evaluate(r)['status'],'BLOCKED')
    def test_inconsistent_memory_total(self):
        r=self.report();r['rows'][2]['combinedRssKiB']+=100
        self.assertEqual(budget.evaluate(r)['status'],'BLOCKED')

if __name__=='__main__': unittest.main()
