import tkinter as tk
from tkinter import messagebox, filedialog
from pathlib import Path
import os

# === Globals ===
optimize_var = None
multithread_var = None
starttime_var = None
endtime_var = None
status_var = None

# === Utility Functions ===

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

# === Functional Callbacks ===

def say_hello():
    messagebox.showinfo("Hello", "Hey there! This is your app.")

def open_course_file():
    filepath = filedialog.askopenfilename(filetypes=[("JSON Files", "*.json"), ("All Files", "*.*")])
    if filepath:
        messagebox.showinfo("Course Opened", f"Opened file: {os.path.basename(filepath)}")
        status_var.set(f"Loaded course: {os.path.basename(filepath)}")

def check_dependencies():
    try:
        import selenium
        #messagebox.showinfo("Check", "Selenium is installed!")
        status_var.set("Selenium is available.")
    except ImportError:
        #messagebox.showwarning("Check", "Selenium is NOT installed!")
        status_var.set("Selenium missing!")

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

# === Main App Setup ===

app = tk.Tk()
app.title("ClassHelper")
app.geometry("600x400")

starttime_var = prefcheckstr("Preferred Start Time")
endtime_var = prefcheckstr("Preferred End Time")

# Load preference variables
optimize_var = prefcheckbool("Optimize")
multithread_var = prefcheckbool("Multithreading")

# Status bar variable
status_var = tk.StringVar()
status_var.set("Ready")

# === Toolbar === at the top

toolbar = tk.Frame(app)
toolbar.pack(side=tk.TOP, fill=tk.X)

tk.Button(toolbar, text="Say Hello", command=say_hello).pack(side=tk.LEFT, padx=4, pady=4)
tk.Button(toolbar, text="Open Course", command=open_course_file).pack(side=tk.LEFT, padx=4, pady=4)
tk.Button(toolbar, text="Check Dependencies", command=check_dependencies).pack(side=tk.LEFT, padx=4, pady=4)
tk.Button(toolbar, text="Preferences", command=open_pref).pack(side=tk.LEFT, padx=4, pady=4)

# === Status Bar ===

status_bar = tk.Label(app, textvariable=status_var, bd=1, relief=tk.SUNKEN, anchor='w')
status_bar.pack(side=tk.BOTTOM, fill=tk.X)

# === Main Loop ===

app.mainloop()
