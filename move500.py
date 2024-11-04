import os
import shutil

# Define folder paths relative to the script location
folder_1 = os.path.join(os.path.dirname(__file__), 'assetstemp/audio')
folder_2 = os.path.join(os.path.dirname(__file__), 'assets/audio')

# Create FOLDER_2 if it doesn't exist
os.makedirs(folder_2, exist_ok=True)

# Get the list of files in FOLDER_1
files = os.listdir(folder_1)

# Limit to the first 500 files
files_to_move = files[:500]

# Move each file to FOLDER_2
for file_name in files_to_move:
    file_path = os.path.join(folder_1, file_name)
    if os.path.isfile(file_path):  # Check if it's a file
        shutil.move(file_path, folder_2)

files_left_in_folder_1 = os.listdir(folder_1)

print(f"Moved {len(files_to_move)} files from FOLDER_1 to FOLDER_2. There are {len(files_left_in_folder_1)} files left in FOLDER_1.")
