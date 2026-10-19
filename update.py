"""Fast-forward updater. Never resets local work or deletes study data."""
import shutil
import sqlite3
import subprocess
from datetime import datetime
from pathlib import Path
ROOT=Path(__file__).resolve().parent

def run(*args):
    return subprocess.run(args,cwd=ROOT,check=True,text=True,capture_output=True).stdout.strip()

def main():
    if not (ROOT/'.git').exists(): raise RuntimeError('Denne mappe er ikke klonet fra GitHub. Se README.')
    if run('git','status','--porcelain','--untracked-files=no'):
        raise RuntimeError('Der er lokale kodeændringer. Opdateringen stopper uden at overskrive dem.')
    db=ROOT/'data'/'studyboss.db'
    if db.exists():
        target=ROOT/'backups'/('studyboss-'+datetime.now().strftime('%Y%m%d-%H%M%S-%f')+'.db')
        target.parent.mkdir(exist_ok=True)
        with sqlite3.connect(db) as source, sqlite3.connect(target) as dest: source.backup(dest)
        print('Svarhistorik sikkerhedskopieret.')
    print(run('git','pull','--ff-only'))
    subprocess.run([str(ROOT/'.venv'/'Scripts'/'python.exe'),'-m','pip','install','-r',str(ROOT/'requirements.txt')],check=True,cwd=ROOT)
    # create refreshes configuration; Ollama reuses already-downloaded weights.
    subprocess.run(['ollama','create','studyboss','-f','Modelfile'],check=True,cwd=ROOT)
    print('Opdateret! Start StudyBoss med Start.bat.')
if __name__=='__main__':
    try: main()
    except Exception as exc:
        print('Opdatering stoppet:',exc)
        raise SystemExit(1)
