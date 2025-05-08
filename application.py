import tkinter as tk
from pathlib import Path
import subprocess
import sys
import threading
import re
import ttkbootstrap as ttk
import ttkthemes
from ttkthemes import ThemedTk
from ttkbootstrap.constants import *

# === Globals ===
optimize_var = None
multithread_var = None
starttime_var = None
endtime_var = None
status_var = None

# === Utility Functions ===

def draw_rounded_rect(canvas, x1, y1, x2, y2, r=10, fill="", outline="black",**kwargs):
    # Arcs
    canvas.create_arc(x1, y1, x1+2*r, y1+2*r, start=90, extent=90, style="pieslice", fill=fill, outline=outline,**kwargs)  # Top-left
    canvas.create_arc(x2-2*r, y1, x2, y1+2*r, start=0, extent=90, style="pieslice", fill=fill, outline=outline,**kwargs)  # Top-right
    canvas.create_arc(x2-2*r, y2-2*r, x2, y2, start=270, extent=90, style="pieslice", fill=fill, outline=outline,**kwargs)  # Bottom-right
    canvas.create_arc(x1, y2-2*r, x1+2*r, y2, start=180, extent=90, style="pieslice", fill=fill, outline=outline,**kwargs)  # Bottom-left

    # Fill Rectangles (optional for visual effect)
    canvas.create_rectangle(x1+r, y1, x2-r, y2, fill=fill, outline=fill,**kwargs)
    canvas.create_rectangle(x1, y1+r, x2, y2-r, fill=fill, outline=fill,**kwargs)

    # Lines between arcs (the outline)
    canvas.create_line(x1+r, y1, x2-r, y1, fill=outline,**kwargs)  # Top
    canvas.create_line(x2, y1+r, x2, y2-r, fill=outline,**kwargs)  # Right
    canvas.create_line(x2-r, y2, x1+r, y2, fill=outline,**kwargs)  # Bottom
    canvas.create_line(x1, y2-r, x1, y1+r, fill=outline,**kwargs)  # Left

def clear_canvas(canvas):
    canvas.delete("class_rect","class_text")

def prefcheckbool(linestart):
    script_dir = Path(__file__).parent
    pref = script_dir / "preferences.txt"
    value = "False"
    if pref.exists():
        with pref.open('r') as file:
            for line in file:
                line = line.strip()
                if line.startswith(linestart):
                    value = line.split()[-1]
                    break
    return tk.BooleanVar(value=value.upper() == "TRUE")

def prefcheckstr(linestart):
    script_dir = Path(__file__).parent
    pref = script_dir / "preferences.txt"
    value = "False"
    if pref.exists():
        with pref.open('r') as file:
            for line in file:
                line = line.strip()
                if line.startswith(linestart):
                    if line.split()[-1].endswith(":"):
                        value = ""
                    else:
                        value = line.split()[-1]
                    break
    #print(value)
    if value != "":
        return tk.StringVar(value=value)
    else:
        return tk.StringVar()

def set_placeholder(entry, placeholder):
    entry.insert(0, placeholder)
    entry.config(fg='grey')

    def on_focus_in(event):
        if entry.get() == placeholder:
            entry.delete(0, tk.END)
            entry.config(fg='black')

    def on_focus_out(event):
        if not entry.get():
            entry.insert(0, placeholder)
            entry.config(fg='grey')

    entry.bind("<FocusIn>", on_focus_in)
    entry.bind("<FocusOut>", on_focus_out)

def draw_class(day_idx, start_hour, end_hour, title,color):
    x1 = left_margin + day_idx * cell_width
    y1 = top_margin + (start_hour-6) * cell_height
    y2 = top_margin + (end_hour-6) * cell_height
    draw_rounded_rect(canvas,x1+5, y1, (x1 + cell_width)-5, y2, fill=color,outline="black",r=5,tags="class_rect")
    #canvas.create_rectangle(x1+5, y1, (x1 + cell_width)-5, y2, fill=color, outline="black", tags="class_rect")
    canvas.create_text(x1 + cell_width/2, (y1 + y2)/2, text=title, font=("Arial", 8), width=cell_width-10,tags="class_text")

def drawsched(s,c):
    clear_canvas(c)
    colors = [
    "light blue",
    "lavender",
    "peach puff",
    "mint cream",
    "honeydew",
    "lemon chiffon",
    "powder blue",
    "light yellow",
    "light goldenrod",
    "ivory",
    "azure",
    "misty rose",
    "light cyan",
    "blanched almond",
    "pale green",
    "light pink",
    "cornsilk",
    "seashell",
    "old lace",
    "floral white",
    "alice blue",
    "beige",
    "linen",
    "antique white",
    "papaya whip",
    "navajo white",
    "moccasin",
    "light salmon",
    "thistle",
    "wheat",
    "gainsboro",
    "light steel blue",
    "sky blue",
    "aquamarine",
    "light green",
    "pale turquoise",
    "khaki",
    "burlywood1",
    "bisque",
    "rosy brown1",
    "turquoise1",
    "pale goldenrod",
    "light sky blue",
    "medium aquamarine",
    "plum1",
    "salmon1",
    "orchid1",
    "gold1"
]
    color = 0
    #print(s)
    pattern = re.compile(r"^\('([A-Z]{3})', '(\d{3}[A-Z]?)'\): CRN (\d{5}) \| (\[.*?\])$")
    a = []
    for item in s.split("\n"):
        if item.startswith("("):
            a.append(item)
    def to_minutes(t):
        h, m = map(int, t[:-2].split(':'))
        period = t[-2:]
        h = h % 12 + (12 if period == 'pm' else 0)
        return h + (m / 60)
    for i in a:
        match = pattern.match(i)
        if match:
            dept, course, crn, times = match.groups()
            times_list = eval(times)  # ['MWF 1:15pm-2:10pm', ...]

            for t in times_list:
                days_match = re.match(r"^([A-Z]+) (.+)$", t)
                if days_match:
                    days, time_range = days_match.groups()
                    start_str, end_str = time_range.split("-")
                    
                    def to_minutes(t):
                        h, m = map(int, t[:-2].split(":"))
                        period = t[-2:]
                        h = h % 12 + (12 if period == 'pm' else 0)
                        return h + (m / 60)

                    start = to_minutes(start_str)
                    end = to_minutes(end_str)

                    for j in days:
                        match j:
                            case "M":
                                day = 0
                            case "T":
                                day = 1
                            case "W":
                                day = 2
                            case "R":
                                day = 3
                            case "F":
                                day = 4
                            case _:
                                continue  # skip invalid

                        #print(day, start, end, (dept, course), colors[color])
                        draw_class(day, start, end, (dept, course), colors[color])


                #draw_class(day_idx=1, start_hour=9, end_hour=11, title="Math 101")
        if color<len(colors)-1:
            color+=1
        else:
            color = 0

# === Functional Callbacks ===
def open_res():
    res = tk.Toplevel()
    res.title("Result")
    res.geometry("600x600")

    filepath = Path(__file__).parent / "result.txt"

    # Load contents
    try:
        with filepath.open("r") as f:
            content = f.read()
    except FileNotFoundError:
        content = ""

    # Calculate height based on line count (minimum 10, maximum 30 for sanity)
    line_count = content.count('\n') + 1
    widget_height = min(max(line_count, 6), 10)

    # Use a Frame to hold the Text widget and scrollbar
    text_frame = tk.Frame(res)
    text_frame.pack(fill="both", expand=True, padx=10, pady=10)

    scrollbar = tk.Scrollbar(text_frame)
    scrollbar.pack(side="right", fill="y")

    text_widget = tk.Text(text_frame, wrap=tk.WORD, yscrollcommand=scrollbar.set, height=widget_height)
    text_widget.insert("1.0", content)
    text_widget.pack(side="left", fill="both", expand=True)

    scrollbar.config(command=text_widget.yview)

def open_courses_editor():
    editor = tk.Toplevel()
    editor.title("Edit Courses")
    editor.geometry("500x200")

    filepath = Path(__file__).parent / "courses.txt"

    # Load contents
    try:
        with filepath.open("r") as f:
            content = f.read()
    except FileNotFoundError:
        content = ""

    # Calculate height based on line count (minimum 10, maximum 30 for sanity)
    line_count = content.count('\n') + 1
    widget_height = min(max(line_count, 6), 10)

    # Use a Frame to hold the Text widget and scrollbar
    text_frame = tk.Frame(editor)
    text_frame.pack(fill="both", expand=True, padx=10, pady=10)

    scrollbar = tk.Scrollbar(text_frame)
    scrollbar.pack(side="right", fill="y")

    text_widget = tk.Text(text_frame, wrap=tk.WORD, yscrollcommand=scrollbar.set, height=widget_height)
    text_widget.insert("1.0", content)
    text_widget.pack(side="left", fill="both", expand=True)

    scrollbar.config(command=text_widget.yview)

    # Frame for the Save button aligned right
    button_frame = tk.Frame(editor)
    button_frame.pack(fill="x", padx=10, pady=5)

    save_button = tk.Button(button_frame, text="Save", command=lambda: save_changes(text_widget, filepath))
    save_button.pack(side="right")

def save_changes(text_widget, filepath):
    new_content = text_widget.get("1.0", tk.END).strip()
    with filepath.open("w") as f:
        f.write(new_content)
    status_var.set("courses.txt updated.")

def check_dependencies():
    try:
        import selenium
        import ttkbootstrap
        import ttkthemes
        #messagebox.showinfo("Check", "Selenium is installed!")
        status_var.set("Selenium and ttkbootstrap and ttkthemes is available.")
    except ImportError:
        #messagebox.showwarning("Check", "Selenium is NOT installed!")
        status_var.set("Selenium or ttkbootstrap or ttkthemes missing!")

def save_preferences():
    #user_input = entry.get()
    script_dir = Path(__file__).parent
    pref = script_dir / "preferences.txt"
    pref.write_text("# Use this carefully, as if the times are too limited, "
                        +"it wont show anything.\n# Input times with this format:"
                        +" 10:00am or 4:30pm\nPreferred Start Time (when do "
                        +f"you want your first class to be): {starttime_var.get()}\nPreferred End Time"
                        +f" (what time do you want your classes to end): {endtime_var.get()}\nOptimize"
                        +f" based on Weekly Free Time? (True or False): {optimize_var.get()}\n"
                        +"Multithreading? (Opens multiple driver instances (faster"
                        +f" but resource heavy)): {multithread_var.get()}")
    #messagebox.showinfo("Preferences", "Preferences saved.")
    status_var.set("Preferences saved.")

def open_pref():
    prefapp = tk.Toplevel()
    prefapp.title("Preferences")
    prefapp.geometry("600x250")

    prefs_frame = tk.LabelFrame(prefapp, text="Preferences", padx=10, pady=10)
    prefs_frame.pack(padx=10, pady=10, fill="x")
    
    slabel = tk.Label(prefs_frame, text="Preferred Start Time (when do you want your first class to be): ")
    slabel.pack(anchor="w")
    starttime = tk.Entry(prefs_frame,textvariable = starttime_var)
    starttime.pack(anchor="w")
    #print(prefcheckstr("Preferred Start Time").get())
    if prefcheckstr("Preferred Start Time").get() == "": set_placeholder(starttime, "e.g. 10:00am")
    
    elabel = tk.Label(prefs_frame, text="Preferred Start Time (when do you want your first class to be): ")
    elabel.pack(anchor="w")
    endtime = tk.Entry(prefs_frame,textvariable = endtime_var)
    endtime.pack(anchor="w")
    if prefcheckstr("Preferred End Time").get() == "": set_placeholder(endtime, "e.g. 4:30pm")
    
    free_time = tk.Checkbutton(
        prefs_frame,
        text="Optimize based on weekly free time?",
        variable=optimize_var
    )
    free_time.pack(anchor="w")

    multithread = tk.Checkbutton(
        prefs_frame,
        text="Multithreading? (Opens multiple driver instances)(faster but resource heavy)",
        variable=multithread_var
    )
    multithread.pack(anchor="w")

    btn_save_prefs = tk.Button(prefs_frame, text="Save Preferences", command=save_preferences)
    btn_save_prefs.pack(anchor="e", pady=5)
    
    #print(starttime_var)
    #print(endtime_var)

def run_schedule():
    script_dir = Path(__file__).parent
    script_path = script_dir / "ClassHelper.py"
    
    # Clear previous output
    log_text.delete("1.0", tk.END)
    status_var.set("Running Classhelper.py...")

    def stream_output():
        process = subprocess.Popen(
            [sys.executable, script_path],
            stdout=subprocess.PIPE,
            stderr=subprocess.STDOUT,
            text=True,
            creationflags=subprocess.CREATE_NO_WINDOW  # Windows only
        )

        for line in process.stdout:
            if not line.startswith("Press"):
                log_text.insert(tk.END, line)
                log_text.see(tk.END)  # Auto-scroll
            if line.startswith("Wrote"):
                status_var.set("Script finished.")
                load_schedules()
                update_schedule_display()
                break
        process.stdout.close()
        #process.wait()
        

    threading.Thread(target=stream_output, daemon=True).start()

app = ThemedTk(theme="adapta")
app.title("ClassHelper")
app.geometry("900x600")

starttime_var = prefcheckstr("Preferred Start Time")
endtime_var = prefcheckstr("Preferred End Time")

# Load preference variables
optimize_var = prefcheckbool("Optimize")
multithread_var = prefcheckbool("Multithreading")

# Status bar variable
status_var = tk.StringVar()
status_var.set("Ready")

# Configure grid layout
app.grid_rowconfigure(1, weight=1,minsize=400)  # Top left frame
app.grid_rowconfigure(2, weight=1)  # Bottom left (log)
app.grid_columnconfigure(0, weight=1)  # Left column
app.grid_columnconfigure(1, weight=1,minsize=550)  # Right column

# === Toolbar ===
toolbar = tk.Frame(app)
toolbar.grid(row=0, column=0, columnspan=2, sticky="ew")
ttk.Button(toolbar, text="Check Dependencies", command=check_dependencies, bootstyle="success-outline").pack(side=tk.LEFT, padx=4, pady=4)
ttk.Button(toolbar, text="Courses", command=open_courses_editor, bootstyle="success-outline").pack(side=tk.LEFT, padx=4, pady=4)
ttk.Button(toolbar, text="Preferences", command=open_pref, bootstyle="success-outline").pack(side=tk.LEFT, padx=4, pady=4)
ttk.Button(toolbar, text="Run Schedules!", command=run_schedule, bootstyle="success-outline").pack(side=tk.RIGHT, padx=4, pady=4)
#tk.Button(toolbar, text="Results", command=open_res).pack(side=tk.RIGHT, padx=4, pady=4)

# === Global Vars ===
schedules = []
items_per_page = 1
current_page = [0]

# === Top Left Frame ===
top_left = ttk.LabelFrame(app, text="Schedules")
top_left.grid(row=1, column=0, sticky="nsew", padx=5, pady=5)

app.grid_rowconfigure(1, weight=1)
app.grid_columnconfigure(0, weight=1)
top_left.grid_rowconfigure(0, weight=1)
top_left.grid_columnconfigure(0, weight=1)

# === Canvas + Scrollable Frame ===
canvas = ttk.Canvas(top_left)
scrollbar = ttk.Scrollbar(top_left, orient="vertical", command=canvas.yview)
scrollable_frame = ttk.Frame(canvas)

scrollable_frame.bind(
    "<Configure>",
    lambda e: canvas.configure(scrollregion=canvas.bbox("all"))
)

canvas.create_window((0, 0), window=scrollable_frame, anchor="nw")
canvas.configure(yscrollcommand=scrollbar.set)

canvas.grid(row=0, column=0, columnspan=2, sticky="nsew")
scrollbar.grid(row=0, column=2, sticky="ns")

# === Load schedules once ===
def load_schedules():
    global schedules
    schedules = []

    filepath = Path(__file__).parent / "result.txt"
    if filepath.exists():
        with filepath.open("r") as f:
            lines = f.readlines()

        current_schedule = []
        for line in lines:
            if line.startswith("Schedule"):
                if current_schedule:
                    schedules.append("\n".join(current_schedule))
                    current_schedule = []
            if not line.startswith("#"):
                current_schedule.append(line.strip())

        if current_schedule:
            schedules.append("\n".join(current_schedule))

# === Update Display ===
def update_schedule_display():
    for widget in scrollable_frame.winfo_children():
        widget.destroy()

    start = current_page[0] * items_per_page
    end = start + items_per_page
    shown_schedules = schedules[start:end]

    for sched in shown_schedules:
        lines = sched.split("\n")
        ttk.Label(scrollable_frame, text=lines[0], font=("Arial", 10, "bold")).pack(anchor="w", padx=10, pady=(8, 2))
        for line in lines[1:]:
            if line.startswith("("):
                try:
                    parts = line.split(": CRN ")
                    course = parts[0].strip(" ()").replace("', '", " ")
                    crn, times = parts[1].split(" | ")
                    times = eval(times.strip())

                    ttk.Label(scrollable_frame, text=f"{course} (CRN {crn})", font=("Arial", 8)).pack(anchor="w", padx=10)
                    for t in times:
                        ttk.Label(scrollable_frame, text=f"  {t}", font=("Arial", 8)).pack(anchor="w", padx=10)
                except Exception as e:
                    ttk.Label(scrollable_frame, text=f"[Format Error] {line}", fg="red").pack(anchor="w", padx=10)
            else:
                ttk.Label(scrollable_frame, text=line, anchor="w", justify="left").pack(anchor="w", padx=10)
        ttk.Button(scrollable_frame, text="Visualize", command=lambda s=sched: drawsched(s,canvas), bootstyle="success-outline").pack(anchor="e", padx=10, pady=5)

    prev_button["state"] = tk.NORMAL if current_page[0] > 0 else tk.DISABLED
    next_button["state"] = tk.NORMAL if end < len(schedules) else tk.DISABLED

# === Navigation Buttons ===
def next_page():
    if (current_page[0] + 1) * items_per_page < len(schedules):
        current_page[0] += 1
        update_schedule_display()

def prev_page():
    if current_page[0] > 0:
        current_page[0] -= 1
        update_schedule_display()

prev_button = ttk.Button(top_left, text="Previous", command=prev_page, bootstyle="success-outline")
prev_button.grid(row=1, column=0, sticky="w", padx=5, pady=5)

next_button = ttk.Button(top_left, text="Next", command=next_page, bootstyle="success-outline")
next_button.grid(row=1, column=1, sticky="e", padx=5, pady=5)

# === Initial Load and Display ===
load_schedules()
update_schedule_display()

# === Log Output Frame (Bottom Left) ===
log_frame = ttk.LabelFrame(app, text="Log Output")
log_frame.grid(row=2, column=0, sticky="nsew", padx=5, pady=5)

log_frame.grid_rowconfigure(0, weight=1)
log_frame.grid_columnconfigure(0, weight=1)

log_text = ttk.Text(log_frame, wrap="word")
log_text.grid(row=0, column=0, sticky="nsew")

log_scroll = ttk.Scrollbar(log_frame, command=log_text.yview)
log_scroll.grid(row=0, column=1, sticky="ns")
log_text.config(yscrollcommand=log_scroll.set)

# === Right Frame (for other stuff) ===
right_frame = ttk.Frame(app)
right_frame.grid(row=1, column=1, rowspan=2, sticky="nsew", padx=5, pady=5)

canvas = ttk.Canvas(right_frame, bg="white")
canvas.pack(fill="both", expand=True,padx=5,pady=30)

days = ["M", "T", "W", "R", "F"]
hours = list(range(6, 22))

cell_width = 95
cell_height = 29
left_margin = 40
top_margin = 25

# Draw column headers (days)
for i, day in enumerate(days):
    x = left_margin + i * cell_width
    canvas.create_text(x + cell_width/2, top_margin/2, text=day, font=("Arial", 10, "bold"))

# Draw row headers (hours)
for j, hour in enumerate(hours):
    y = top_margin + j * cell_height - (cell_height/2)
    if hour<12:
        a = "am"
    else:
        a = "pm"
    b = hour%12 if hour != 12 else 12
    canvas.create_text(left_margin/2, y + cell_height/2, text=f"{b}{a}", font=("Arial", 8))

# Draw grid
for i in range(len(days)):
    for j in range(len(hours)-1):
        x1 = left_margin + i * cell_width
        y1 = top_margin + j * cell_height
        x2 = x1 + cell_width
        y2 = y1 + cell_height
        canvas.create_rectangle(x1, y1, x2, y2, outline="lightgray")

#draw_class(day_idx=1, start_hour=9, end_hour=11, title="Math 101")

status_var = ttk.StringVar(value="Ready")
status_bar = ttk.Label(app, textvariable=status_var, relief=tk.SUNKEN, anchor='w')
status_bar.grid(row=4, column=0, columnspan=2, sticky="ew")

app.mainloop()
