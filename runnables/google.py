import os
import sys

print('in')

#possible query 
sSearch = ""

#change directories
os.chdir('C:\Program Files (x86)\Google\Chrome\Application')

if len(sys.argv) > 1:
	sSearch = sys.argv[1]
	os.system('chrome.exe google.com?q={}'.format(sSearch))
else:
	os.system('chrome.exe google.com')

print('inOther stuf here')

#exit python script
sys.exit()