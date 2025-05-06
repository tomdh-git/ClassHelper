import tkinter as tk
from pathlib import Path
import ClassHelper
import subprocess
import sys
import os
import threading

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
                break
        process.stdout.close()
        #process.wait()
        

    threading.Thread(target=stream_output, daemon=True).start()

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

tk.Button(toolbar, text="Check Dependencies", command=check_dependencies).pack(side=tk.LEFT, padx=4, pady=4)
tk.Button(toolbar, text="Courses", command=open_courses_editor).pack(side=tk.LEFT, padx=4, pady=4)
tk.Button(toolbar, text="Preferences", command=open_pref).pack(side=tk.LEFT, padx=4, pady=4)
tk.Button(toolbar, text="Run Schedules!", command=run_schedule).pack(side=tk.RIGHT, padx=4, pady=4)

# === Log Viewer ===

log_frame = tk.LabelFrame(app, text="Log Output")
log_frame.pack(fill="both", expand=True, padx=10, pady=5)

log_scroll = tk.Scrollbar(log_frame)
log_scroll.pack(side="right", fill="y")

log_text = tk.Text(log_frame, height=12, wrap="word", yscrollcommand=log_scroll.set)
log_text.pack(fill="both", expand=True)
log_scroll.config(command=log_text.yview)


# === Status Bar ===

status_bar = tk.Label(app, textvariable=status_var, bd=1, relief=tk.SUNKEN, anchor='w')
status_bar.pack(side=tk.BOTTOM, fill=tk.X)

# === Main Loop ===

app.mainloop()
