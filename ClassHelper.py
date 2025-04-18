from pathlib import Path
from selenium import webdriver
from selenium.webdriver.common.by import By
from selenium.webdriver.common.keys import Keys
import re
from itertools import product
import msvcrt
from selenium.webdriver.support.ui import WebDriverWait
from selenium.webdriver.support import expected_conditions as EC
from multiprocessing import Pool

def filestatus(filename):
    if not filename.exists(): return False
    else:
        with filename.open('r') as file:
            for line in file:
                line = line.strip()
                if line and not line.startswith("#"): return True
    return False

def process_course(course):
    subject, coursenum = course
    print("Searching for", subject, coursenum, "classes next semester.")
    driver = webdriver.Chrome()
    driver.get("https://www.apps.miamioh.edu/courselist/")
    try:
        WebDriverWait(driver, 10).until(EC.presence_of_element_located((By.ID, "termFilter")))
        driver.find_element(By.XPATH, "//label[contains(text(), 'Face-to-Face')]/preceding-sibling::input").click()
        term_dropdown = driver.find_element(By.ID, "termFilter")
        term_dropdown.click()
        term_dropdown.send_keys(Keys.HOME)
        term_dropdown.send_keys(Keys.ENTER)
        dropdown_button = WebDriverWait(driver, 10).until(EC.element_to_be_clickable((By.CSS_SELECTOR, ".ms-choice")))
        dropdown_button.click()
        option = WebDriverWait(driver, 5).until(EC.element_to_be_clickable((By.XPATH, f"//label[contains(., 'Oxford')]")))
        option.click()
        dropdown_button.click()
        dropdown_button = WebDriverWait(driver, 5).until(EC.element_to_be_clickable((By.CSS_SELECTOR, ".placeholder")))
        dropdown_button.click()
        search_input = WebDriverWait(driver, 5).until(EC.presence_of_element_located((By.CSS_SELECTOR, ".ms-search input")))
        search_input.send_keys(subject + " - ")
        driver.switch_to.active_element.send_keys(Keys.TAB)
        driver.switch_to.active_element.send_keys(Keys.SPACE)
        driver.find_element(By.XPATH, "//label[contains(text(), 'Course Number')]/following::input[1]").send_keys(coursenum)
        driver.switch_to.active_element.send_keys(Keys.ENTER)
        WebDriverWait(driver, 10).until(EC.presence_of_element_located((By.ID, "resultsTable_wrapper")))
        TIME = re.compile(r"\b(M|T|W|R|F|S|U)+\s+\d{1,2}:\d{2}(am|pm)-\d{1,2}:\d{2}(am|pm)\b")
        CRN = re.compile(r"\b\d{5}\b")
        cells = driver.find_elements(By.CSS_SELECTOR, "td")
        schedules = [match.group() for cell in cells if (match := TIME.search(cell.text.strip()))]
        crns = [match.group() for cell in cells if (match := CRN.search(cell.text.strip()))]
        return ((subject, coursenum), list(zip(crns, schedules)))
    except Exception as e:
        print(f"Error processing {subject} {coursenum}: {e}")
        return ((subject, coursenum), [])
    finally: driver.quit()

def get_course_info2(content, timedict):
    with Pool(processes=5) as pool: results = pool.map(process_course, content)
    for key, value in results: timedict[key] = value

def get_course_info3(content,timedict):
    driver = webdriver.Chrome()  # Ensure chromedriver is installed
    driver.get("https://www.apps.miamioh.edu/courselist/")
    for course in content:
        subject = course[0]
        coursenum = course[1]
        print("Searching for", subject, coursenum, "classes next semester.")
        WebDriverWait(driver, 10).until(EC.presence_of_element_located((By.ID, "termFilter")))
        #face to face
        driver.find_element(By.XPATH, "//label[contains(text(), 'Face-to-Face')]/preceding-sibling::input").click()
        #term
        term_dropdown = driver.find_element(By.ID, "termFilter")  # Replace with actual ID
        term_dropdown.click()
        term_dropdown.send_keys(Keys.HOME)
        term_dropdown.send_keys(Keys.ENTER)
        #campus
        dropdown_button = WebDriverWait(driver, 10).until(EC.element_to_be_clickable((By.CSS_SELECTOR, ".ms-choice")))
        dropdown_button.click()
        option = WebDriverWait(driver, 3).until(EC.element_to_be_clickable((By.XPATH, f"//label[contains(., 'Oxford')]")))
        option.click()
        dropdown_button.click()
        #subject
        dropdown_button = WebDriverWait(driver, 10).until(EC.element_to_be_clickable((By.CSS_SELECTOR, ".placeholder")))
        dropdown_button.click()
        search_input = WebDriverWait(driver, 3).until(EC.presence_of_element_located((By.CSS_SELECTOR, ".ms-search input")))
        WebDriverWait(driver, 3).until(EC.visibility_of(search_input))
        #ActionChains(driver).move_to_element(search_input).click().perform()
        search_input.send_keys(subject+" - ")
        driver.switch_to.active_element.send_keys(Keys.TAB)
        driver.switch_to.active_element.send_keys(Keys.SPACE)
        #coursenum
        driver.find_element(By.XPATH, "//label[contains(text(), 'Course Number')]/following::input[1]").send_keys(coursenum)
        driver.switch_to.active_element.send_keys(Keys.ENTER)
        WebDriverWait(driver, 10).until(EC.presence_of_element_located((By.ID, "resultsTable_wrapper")))
        elements = driver.find_elements(By.XPATH, "//td")
        TIME = re.compile(r"\b(M|T|W|R|F|S|U)+\s+\d{1,2}:\d{2}(am|pm)-\d{1,2}:\d{2}(am|pm)\b")
        CRN = re.compile(r"\b\d{5}\b")
        schedules = [
            match.group()
            for cell in driver.find_elements(By.CSS_SELECTOR, "td")
            if (match := TIME.search(cell.text.strip()))
        ]
        crns = [
            match.group()
            for cell in driver.find_elements(By.CSS_SELECTOR, "td")
            if (match := CRN.search(cell.text.strip()))
        ]
        timedict[(subject, coursenum)] = list(zip(crns, schedules))
        reset = driver.find_element(By.ID, "resetSearch")
        reset.click()
        WebDriverWait(driver, 10).until(EC.presence_of_element_located((By.ID, "termFilter")))
    driver.quit()

def time_conflicts(schedule):
    script_dir = Path(__file__).parent
    pref = script_dir / "preferences.txt"
    preflist = []
    with pref.open('r') as file:
        for line in file:
            line = line.strip()
            # CHANGE THIS LINE WHENEVER ADDING NEW PREFERENCES
            if line and not line.startswith("#") and not line.startswith("Optimize") and not line.startswith("Multithreading"): preflist.append(line.split()[-1])
    free_time = 0
    selected_times = []
    for time_slot in schedule:
        days, times = time_slot.split(' ')
        start_time, end_time = times.split('-')
        def to_24hr(t):
            h, m, period = int(t[:-5]), int(t[-4:-3]), t[-2:]
            h = h % 12 + (12 if period == 'pm' else 0)
            return h * 60 + m
        start,end = to_24hr(start_time),to_24hr(end_time)
        try:
            prefstart = to_24hr(preflist[0])
            prefend = to_24hr(preflist[1])
        except ValueError:
            prefstart = 0
            prefend = 1440
        for s_days, s_start, s_end in selected_times:
            if (start<prefstart or s_start<prefstart or end>prefend or s_end>prefend) or (any(d in s_days for d in days) and not (end <= s_start or start >= s_end)): 
                return True
        selected_times.append((days, start, end))
    return False

def generate_valid_schedules(timedict):
    all_courses = list(timedict.keys())
    all_sections = []
    for course in all_courses: 
        if timedict[course] != []: all_sections.append(timedict[course])
    valid_schedules = []
    for combo in product(*all_sections):
        times = [section[1] for section in combo]
        if not time_conflicts(times): valid_schedules.append(combo)
    return valid_schedules

def main1():
    timedict = {}
    script_dir = Path(__file__).parent
    pref = script_dir / "preferences.txt"
    res = script_dir / "result.txt"
    with res.open('w') as file: file.write("# Here are your schedules!:\n")
    choice1(timedict)
    schedules = generate_valid_schedules(timedict)
    with pref.open('r') as file:
        for line in file:
            line = line.strip()
            # CHANGE THIS LINE WHENEVER ADDING NEW PREFERENCES
            if line and not line.startswith("#") and not line.startswith("Preferred") and not line.startswith("Multithreading"): optimize = line.split()[-1]
    if optimize.upper() == "FALSE":
        print(f"Found {len(schedules)} valid schedule(s).")
        for i, s in enumerate(schedules, 1):
            with res.open('a') as file: file.write(f"Schedule {i}:"+"\n")
            for (crn, time), course in zip(s, timedict.keys()):
                line = f"  {course}: CRN {crn} | {time}"
                with res.open('a') as file: file.write(line+"\n")
        print("Wrote to res.txt!")
    else:
        print("Optimizing based on free time!")
        timelist = []
        for schedule in schedules: freetime(schedule,timelist)
        schedules = sorted(timelist, key=lambda x: x[0])
        print(f"Found {len(schedules)} valid schedule(s).")
        for i, s in enumerate(schedules, 1):
            with res.open('a') as file: file.write(f"Schedule {i}:\nWeekly Free Time: {s[0]} minutes ({s[0]//60} hours {s[0]%60} mins)\n")
            for (crn, time), course in zip(s[1], timedict.keys()):
                line = f"  {course}: CRN {crn} | {time}"
                with res.open('a') as file: file.write(line+"\n")
        print("Wrote to res.txt!")
    while True:
            print("Press any key to continue...")
            msvcrt.getch()
            break
    
def freetime(schedule,timelist):
    DAY_START = 7 * 60     # 7:00 AM in minutes
    DAY_END = 23 * 60      # 11:00 PM in minutes
    day_map = {'M': [], 'T': [], 'W': [], 'R': [], 'F': [], 'S': [], 'U': []}
    def to_minutes(t):
        h, m = map(int, t[:-2].split(':'))
        period = t[-2:]
        h = h % 12 + (12 if period == 'pm' else 0)
        return h * 60 + m
    for entry in schedule:
        daystr, timerange = entry[1].split()
        start, end = timerange.split('-')
        start_min = to_minutes(start)
        end_min = to_minutes(end)
        for d in daystr: day_map[d].append((start_min, end_min))
    total_free = 0
    for day, intervals in day_map.items():
        if not intervals:
            total_free += (DAY_END - DAY_START)
            continue
        intervals.sort()
        free = 0
        if intervals[0][0] > DAY_START: free += intervals[0][0] - DAY_START
        for i in range(1, len(intervals)):
            gap = intervals[i][0] - intervals[i-1][1]
            if gap > 0: free += gap
        if intervals[-1][1] < DAY_END: free += DAY_END - intervals[-1][1]
        total_free += free
    timelist.append((total_free,schedule))

def choice1(timedict_ref=None):
    script_dir = Path(__file__).parent
    courses = script_dir / "courses.txt"
    pref = script_dir / "preferences.txt"
    read = script_dir / "read.txt"
    if timedict_ref is None: timedict_ref = {} #make empty dict
    timedict = timedict_ref
    content = []
    with courses.open('r') as file:
        for line in file:
            line = line.strip()
            if line and not line.startswith("#"): content.append(line.split())
    with pref.open('r') as file:
        for line in file:
            line = line.strip()
            # CHANGE THIS LINE WHENEVER ADDING NEW PREFERENCES
            if line and not line.startswith("#") and not line.startswith("Preferred") and not line.startswith("Optimize"): multi = line.split()[-1]
    if multi.upper() == "FALSE": get_course_info3(content, timedict)
    else: get_course_info2(content, timedict)

if __name__ == "__main__":
    script_dir = Path(__file__).parent
    courses = script_dir / "courses.txt"
    pref = script_dir / "preferences.txt"
    if filestatus(courses): main1()
    else:
        # CHANGE THIS LINE WHENEVER ADDING NEW PREFERENCES
        pref.write_text("# Use this carefully, as if the times are too limited, "
                        +"it wont show anything.\n# Input times with this format:"
                        +" 10:00am or 4:30pm\nPreferred Start Time (when do "
                        +"you want your first class to be): \nPreferred End Time"
                        +" (what time do you want your classes to end): \nOptimize"
                        +" based on Weekly Free Time? (True or False): False\n"
                        +"Multithreading? (Opens multiple driver instances (faster"
                        +" but resource heavy)): False")
        courses.write_text("# Write your classes below (Ex: CSE 174, ENG 111, etc.):")
        print("Theres nothing in your input files! Input some classes and preferences (optional).")
        while True:
            print("Press any key to continue...")
            msvcrt.getch()
            break
        
        
