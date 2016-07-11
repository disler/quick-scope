import os
import sys

#possible query 
sSearch = ""

#change directories
os.chdir('C:\Program Files (x86)\Google\Chrome\Application')

#search weather in google
os.system('chrome.exe google.com?q={}'.format("weather"))

#exit python script
sys.exit()
