import os
import re
import shutil

# Paths
html_path = "/run/user/1000/doc/e05f278e/Особовий склад/messages.html"
source_photos_dir = "/run/user/1000/doc/e05f278e/Особовий склад/photos"
output_dir = "/run/user/1000/doc/e05f278e/Особовий склад/відсортовані_фото"

if not os.path.exists(output_dir):
    os.makedirs(output_dir)

with open(html_path, "r", encoding="utf-8") as f:
    content = f.read()

# Pattern to find message blocks that contain a photo and text
# Using a simpler approach: find all photo links and then the text that follows them
# Each message block looks like:
# <div class="message ..."> ... <a ... href="photos/photo_X.jpg"> ... <div class="text">Name ...</div>

# Let's use a regex that captures the photo link and the subsequent text block
message_pattern = re.compile(
    r'<a class="photo_wrap[^"]*" href="(photos/photo_[^"]+\.jpg)">.*?<div class="text">(.*?)</div>',
    re.DOTALL
)

matches = message_pattern.findall(content)
print(f"Found {len(matches)} matches.")

count = 0
for photo_rel_path, text_content in matches:
    # First line of text usually contains the name
    # Remove <br> and other tags
    clean_text = re.sub(r'<[^>]+>', ' ', text_content).strip()
    first_line = clean_text.split('\n')[0].strip()
    
    # Extract name (Surname Name Patronymic) - typically 2 or 3 words at the start
    # Many lines have "Name Surname Date of Birth"
    name_match = re.search(r'^([А-ЯЁІЇЄ][а-яёіїє\']+\s+[А-ЯЁІЇЄ][а-яёіїє\']+\s*[А-ЯЁІЇЄ]*[а-яёіїє\']*)', first_line)
    
    if name_match:
        name = name_match.group(1).strip()
    else:
        # Fallback to first few words if regex fails
        name = "_".join(first_line.split()[:3])
    
    # Remove characters that might be invalid in filenames
    name = re.sub(r'[\\/*?:"<>|]', "", name).strip()
    
    if not name:
        name = f"unknown_{count}"

    source_file = os.path.join(os.path.dirname(html_path), photo_rel_path)
    dest_file = os.path.join(output_dir, f"{name}.jpg")
    
    if os.path.exists(source_file):
        try:
            shutil.copy2(source_file, dest_file)
            print(f"Copied: {photo_rel_path} -> {name}.jpg")
            count += 1
        except Exception as e:
            print(f"Error copying {source_file}: {e}")
    else:
        print(f"File not found: {source_file}")

print(f"Finished. Extracted {count} photos to {output_dir}")
