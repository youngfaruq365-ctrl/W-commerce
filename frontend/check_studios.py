import os
import glob

def check_files():
    dir_path = "src/components/seller/Dashboard"
    files = glob.glob(os.path.join(dir_path, "*Studio.jsx"))
    
    broken_files = []
    
    for file in files:
        with open(file, "r", encoding="utf-8") as f:
            content = f.read()
            
            # Look for the broken pattern where the details step ends right after the image
            if 'onError={(e) => { e.target.style.display=\'none\'; }} />\n        </div>\n      )}' in content:
                broken_files.append(file)
                
    if broken_files:
        print("BROKEN FILES FOUND:")
        for f in broken_files:
            print("- " + f)
    else:
        print("ALL FILES CLEAN!")

if __name__ == "__main__":
    check_files()
