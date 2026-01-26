import os
from rio_cogeo.cogeo import cog_translate
from rio_cogeo.profiles import cog_profiles

# 1. ORCHESTRATED PATH RESOLUTION
BASE_DIR = os.path.dirname(os.path.abspath(__file__))

# Looking for your specific folder structure
possible_inputs = [
    os.path.join(BASE_DIR, "backend", "data", "rasters"),
    R"D:\Attachment_DSS\backend\data\rasters"
]

input_dir = None
for path in possible_inputs:
    if os.path.exists(path):
        input_dir = path
        break

if not input_dir:
    print("❌ ERROR: Could not find the 'rasters' folder.")
    exit()

output_dir = os.path.join(os.path.dirname(input_dir), "optimized_rasters")

if not os.path.exists(output_dir):
    os.makedirs(output_dir)

# 2. OPTIMIZATION SETTINGS
# 'deflate' is the best compression for these types of potential maps
dst_profile = cog_profiles.get("deflate")

def optimize():
    print(f"📂 Scanning: {input_dir}")
    files = [f for f in os.listdir(input_dir) if f.lower().endswith(".tif")]
    
    if not files:
        print("Empty folder: No .tif files found.")
        return

    for filename in files:
        input_path = os.path.join(input_dir, filename)
        output_path = os.path.join(output_dir, filename)
        
        # Manual Overwrite Handling
        if os.path.exists(output_path):
            os.remove(output_path)
        
        print(f"\n🚀 Optimizing: {filename}")
        try:
            # Removed 'overwrite' argument to comply with new rio-cogeo API
            cog_translate(
                input_path,
                output_path,
                dst_profile,
                quiet=False
            )
            print(f"✅ Created COG: {output_path}")
        except Exception as e:
            print(f"❌ Failed to convert {filename}: {e}")

if __name__ == "__main__":
    optimize()



