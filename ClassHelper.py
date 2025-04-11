import os
from pathlib import Path
from selenium import webdriver
from selenium.webdriver.common.by import By
from selenium.webdriver.common.keys import Keys
import time
import re
from itertools import product
import msvcrt

#this is a github test

# pip install selenium

#loads from file. result saved to read.txt. read from read.txt and optimize

def filestatus(filename):
    if not filename.exists():
        print(f"{filename} doesnt exist!")
        return False
    else:
        with filename.open('r') as file:
            for line in file:
                line = line.strip()
                if line and not line.startswith("#"):
                    print(line)
                    return True
    return False

def get_course_info(content, timedict):
    driver = webdriver.Chrome()  # Ensure chromedriver is installed
    for course in content:
        subject = course[0]
        coursenum = course[1]
        print("Searching for", subject, coursenum, "classes next semester.")

        driver.get("https://www.apps.miamioh.edu/courselist/")
        time.sleep(0.3)

        driver.find_element(By.TAG_NAME, "body").click()
        for _ in range(3):  # navigate to face-to-face checkbox
            driver.switch_to.active_element.send_keys(Keys.TAB)
        driver.switch_to.active_element.send_keys(Keys.SPACE)
        for _ in range(17):
            driver.switch_to.active_element.send_keys(Keys.TAB)
        driver.switch_to.active_element.send_keys(Keys.SPACE)
        driver.switch_to.active_element.send_keys(Keys.HOME)
        driver.switch_to.active_element.send_keys(Keys.ENTER)
        for _ in range(2):
            driver.switch_to.active_element.send_keys(Keys.TAB)
        driver.switch_to.active_element.send_keys(Keys.SPACE)
        for _ in range(7):
            driver.switch_to.active_element.send_keys(Keys.TAB)
        driver.switch_to.active_element.send_keys(Keys.SPACE)
        driver.switch_to.active_element.send_keys(Keys.ESCAPE)
        for _ in range(2):
            driver.switch_to.active_element.send_keys(Keys.TAB)
        driver.switch_to.active_element.send_keys(Keys.SPACE)
        driver.switch_to.active_element.send_keys(subject + " - ")
        driver.switch_to.active_element.send_keys(Keys.TAB)
        driver.switch_to.active_element.send_keys(Keys.SPACE)
        driver.switch_to.active_element.send_keys(Keys.ESCAPE)
        for _ in range(2):
            driver.switch_to.active_element.send_keys(Keys.TAB)
        driver.switch_to.active_element.send_keys(coursenum)
        driver.switch_to.active_element.send_keys(Keys.ENTER)
        time.sleep(0.1)

        elements = driver.find_elements(By.XPATH, "//td")
        
        TIME = re.compile(r"\b(M|T|W|R|F|S|U)+\s+\d{1,2}:\d{2}(am|pm)-\d{1,2}:\d{2}(am|pm)\b")
        CRN = re.compile(r"\b\d{5}\b")

        crns = [match.group() for text in elements if (match := CRN.search(text.text.strip()))]
        schedules = [match.group() for text in elements if (match := TIME.search(text.text.strip()))]

        timedict[(subject, coursenum)] = list(zip(crns, schedules))

    driver.quit()

def time_conflicts(schedule):
    #parse preferences from preferences.txt
    script_dir = Path(__file__).parent
    #print("schedule:",schedule)
    pref = script_dir / "preferences.txt"
    preflist = []
    with pref.open('r') as file:
        for line in file:
            line = line.strip()
            if line and not line.startswith("#"):
                preflist.append(line.split()[-1])
    #print(preflist)
    selected_times = []
    #print(f"amount of schedules: {len(schedule)}")
    for time_slot in schedule:
        #print('')
        days, times = time_slot.split(' ')
        start_time, end_time = times.split('-')
        
        #print(f"starttime:{start_time},endtime:{end_time}") #this is the time youre working with
        #print("days,times,starttime,endtime",days,times,start_time,end_time)

        def to_24hr(t):
            h, m, period = int(t[:-5]), int(t[-4:-3]), t[-2:]
            h = h % 12 + (12 if period == 'pm' else 0)
            return h * 60 + m

        start = to_24hr(start_time)
        end = to_24hr(end_time)
        try:
            prefstart = to_24hr(preflist[0])
            prefend = to_24hr(preflist[1])
        except ValueError:
            prefstart = 0
            prefend = 1440

        for s_days, s_start, s_end in selected_times:
            if (start<prefstart or s_start<prefstart or end>prefend or s_end>prefend) or (any(d in s_days for d in days) and not (end <= s_start or start >= s_end)): #only return 6
                #print(f"prefstart:{prefstart},start:{start},s_start:{s_start}")
                #print(f"prefend:{prefend},end:{end},s_end:{s_end}")
                return True
                #print(f"start>=prefstart:{start>=prefstart},s_start>=prefstart:{s_start>=prefstart},end<=prefend:{end<prefend},s_end<=prefend:{s_end<=prefend}")
                #print("times:",times)

            
        #print('appended to selected times')
        selected_times.append((days, start, end))
        #print(selected_times)
        #print('')
    #print('returning false')
    return False

def generate_valid_schedules(timedict):
    all_courses = list(timedict.keys())
    all_sections = []
    for course in all_courses:
        if timedict[course] != []:
            all_sections.append(timedict[course])
    #[timedict[course] for course in all_courses]
    
    #print("all_courses:",all_courses)
    #print("allsections:",all_sections)

    valid_schedules = []
    #print(f"product(allsections):{list(product(*all_sections))}")

    for combo in product(*all_sections):
        #print("combo:",combo)
        times = [section[1] for section in combo]  # Extract just the time strings
        #print("times:",times)
        if not time_conflicts(times):
            #print("combos:",combo)
            valid_schedules.append(combo)
    
    return valid_schedules

def main1():
    timedict = {}
    #checks if you have something in preferences.txt and read.txt
    script_dir = Path(__file__).parent
    courses = script_dir / "courses.txt"
    res = script_dir / "result.txt"
    with res.open('w') as file:
        file.write("# Here are your schedules!:\n")
    choice1(timedict)
    schedules = generate_valid_schedules(timedict)
    print(f"Found {len(schedules)} valid schedule(s).")
    
    for i, s in enumerate(schedules, 1):
        #print(f"\nSchedule {i}:")
        with res.open('a') as file:
            file.write(f"Schedule {i}:"+"\n")
        for (crn, time), course in zip(s, timedict.keys()):
            line = f"  {course}: CRN {crn} | {time}"
            #print(line)
            with res.open('a') as file:
                file.write(line+"\n")
    print("Wrote to res.txt!")
    while True:
            print("Press any key to continue...")
            msvcrt.getch()  # Waits for any key press
            break
            # Your loop logic here
    
        

def choice1(timedict_ref=None):
    script_dir = Path(__file__).parent
    courses = script_dir / "courses.txt"
    read = script_dir / "read.txt"
    if timedict_ref is None: timedict_ref = {} #make empty dict
    timedict = timedict_ref
    content = []
        
    with courses.open('r') as file:
        for line in file:
            line = line.strip()
            if line and not line.startswith("#"):
                content.append(line.split())
    #print("content:",content)
    #print("timedict:",timedict)
    get_course_info(content, timedict)
    #print("changed timedict:",timedict)

if __name__ == "__main__":
    script_dir = Path(__file__).parent
    courses = script_dir / "courses.txt"
    pref = script_dir / "preferences.txt"
    if filestatus(courses):
        main1()
    else:
        pref.write_text("# Use this carefully, as if the times are too limited, "
                        +"it wont show anything.\n# Input times with this format:"
                        +" 10:00am or 4:30pm\nPreferred Start Time (when do "
                        +"you want your first class to be): \nPreferred End Time"
                        +" (what time do you want your classes to end):")
        courses.write_text("# Write your classes below (Ex: CSE 174, ENG 111, etc.):")
        print("Theres nothing in your input files! Input some classes and preferences (optional).")
        while True:
            print("Press any key to continue...")
            msvcrt.getch()  # Waits for any key press
            break
            # Your loop logic here
        
        
