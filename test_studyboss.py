import json
import unittest
import sqlite3
import tempfile
from pathlib import Path
from unittest.mock import patch
from calculator import calculate,conv_size,softmax
from core import chat,validate_grade,GRADES,grade_label,repetition_days,retrieve
class StudyTests(unittest.TestCase):
 def test_math(self):
  self.assertEqual(calculate('(224-9)/1+1'),216)
  self.assertEqual(conv_size(224,9,1,4),224)
  self.assertAlmostEqual(calculate('1/(1+exp(-2))'),.8807970779)
  self.assertAlmostEqual(sum(softmax([1000,1001,999])),1)
 def test_calculator_rejects_code(self):
  for expr in ["__import__('os').getcwd()",'2**10000','[1][0]','open(1)','sqrt(-1)','1/0','True']:
   with self.assertRaises((ValueError,ZeroDivisionError)): calculate(expr)
 def test_grades(self):
  for score in [True,-1,1,3,5,6,8,9,11,13,'4']:
   with self.assertRaises(ValueError): validate_grade(dict(score=score,feedback='x',solution='x'))
  for score in GRADES:
   self.assertEqual(validate_grade(dict(score=score,feedback='x',solution='x'))['score'],score)
   self.assertGreaterEqual(repetition_days(score),1)
  self.assertEqual(grade_label(0),'00')
  self.assertEqual(grade_label(2),'02')
 def test_material_sources(self):
  text,sources=retrieve([('A','algebra algebra'),('B','biologi')],'algebra',limit=1,with_sources=True)
  self.assertEqual(sources,['A'])
  self.assertIn('algebra',text)
 def test_followups(self):
  class Response:
   def __enter__(self): return self
   def __exit__(self,*args): pass
   def read(self): return json.dumps({'message':{'content':'ok'}}).encode()
  history=[dict(role='user',content='CNN?'),dict(role='assistant',content='Forklaring')]
  with patch('urllib.request.urlopen',return_value=Response()) as mocked:
   self.assertEqual(chat('Hvorfor?',history=history),'ok')
   self.assertEqual(json.loads(mocked.call_args.args[0].data)['messages'][1:3],history)
 def test_ui(self):
  from streamlit.testing.v1 import AppTest
  at=AppTest.from_file('app.py',default_timeout=30).run()
  self.assertFalse(list(at.exception))
  at.radio[0].set_value('Øv dig').run()
  self.assertFalse(list(at.exception))
  for tool in ['CNN dimensioner','Softmax','Netværksparametre']:
   next(item for item in at.selectbox if item.label=='Værktøj').set_value(tool).run()
   self.assertFalse(list(at.exception))
  at.radio[0].set_value('Din fremgang').run()
  self.assertFalse(list(at.exception))
  at.radio[0].set_value('Mine fag').run()
  self.assertFalse(list(at.exception))
 def test_legacy_history_is_preserved_without_grade_conversion(self):
  from streamlit.testing.v1 import AppTest
  with tempfile.TemporaryDirectory(dir=Path(__file__).parent) as tmp:
   root=Path(tmp); (root/'data').mkdir()
   (root/'app.py').write_text(Path(__file__).with_name('app.py').read_text(encoding='utf-8'),encoding='utf-8')
   db=sqlite3.connect(root/'data'/'studyboss.db')
   db.execute('CREATE TABLE attempts (created TEXT, course TEXT, topic TEXT, question TEXT, answer TEXT, score INTEGER, feedback TEXT, solution TEXT, due TEXT)')
   db.execute('INSERT INTO attempts VALUES (?,?,?,?,?,?,?,?,?)',('2026-01-01','Biologi','Fotosyntese','Spørgsmål','Svar',4,'Tidligere feedback','Facit','2026-01-02'))
   db.commit(); db.close()
   at=AppTest.from_file(str(root/'app.py'),default_timeout=30).run()
   self.assertFalse(list(at.exception))
   at.radio[0].set_value('Din fremgang').run()
   self.assertTrue(any('4/4 (gammel skala; ikke omregnet)' in item.label for item in at.expander))
   self.assertEqual(next(m.value for m in at.metric if m.label=='Gennemsnit · 7-trinsskala'),'—')
   db=sqlite3.connect(root/'data'/'studyboss.db')
   self.assertEqual(db.execute('SELECT score,score_scale FROM attempts').fetchone(),(4,'legacy_0_4'))
   db.close()
if __name__=='__main__': unittest.main()
