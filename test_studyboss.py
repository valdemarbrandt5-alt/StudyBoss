import json
import unittest
from unittest.mock import patch
from calculator import calculate,conv_size,softmax
from core import chat,validate_grade
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
  for score in [True,-1,5,'4']:
   with self.assertRaises(ValueError): validate_grade(dict(score=score,feedback='x',solution='x'))
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
   at.selectbox[0].set_value(tool).run()
   self.assertFalse(list(at.exception))
  at.radio[0].set_value('Din fremgang').run()
  self.assertFalse(list(at.exception))
if __name__=='__main__': unittest.main()
