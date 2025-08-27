import os

# Get the absolute path of the directory where the script is located
script_dir = os.path.dirname(os.path.abspath(__file__))

# parameters
# up jig rut files
input_file_up_upper = os.path.join(script_dir, "doc/G8360-TEST-TOP-JIGUNIT1.rut")
input_file_up_middle = os.path.join(script_dir, "doc/G8360-TEST-TOP-JIGUNIT2.rut")
input_file_up_bottom = os.path.join(script_dir, "doc/up-bottom.rut")
# down jig rut files
input_file_down_upper = os.path.join(script_dir, "doc/G8360-TEST-BOT-JIGUNIT1.rut")
input_file_down_middle = os.path.join(script_dir, "doc/G8360-TEST-BOT-JIGUNIT2.rut")
input_file_down_bottom = os.path.join(script_dir, "doc/G8360-TEST-BOT-JIGUNIT3.rut")

import re
import matplotlib.pyplot as plt

# ==============================================================================
# 1. CLASS AND FUNCTION DEFINITIONS
# ==============================================================================

class PinPoint:
    """Represents a single pin point with its coordinates and side."""
    def __init__(self, no, x, y, side):
        self.no = no
        self.x = x
        self.y = y
        self.side = side

def read_rut_file_for_offset(file_path):
    """
    Reads a .RUT file to extract the X and Y offset values.
    Stops reading after finding the Y offset.
    """
    x_offset, y_offset = 0.0, 0.0
    try:
        with open(file_path, "r") as file:
            for line in file:
                if "(OFFSET-X:" in line:
                    x_offset = float(re.search(r"[-+]?\d*\.\d+|\d+", line).group())
                elif "(OFFSET-Y:" in line:
                    y_offset = float(re.search(r"[-+]?\d*\.\d+|\d+", line).group())
                    break  # Assume offsets are together, so we can stop.
    except FileNotFoundError:
        print(f"Warning: File not found at {file_path}. Using default offset (0,0).")
    return x_offset, y_offset

def extract_coordinates(file_path):
    """
    Extracts G-code (G00, G01) coordinates from a file.
    """
    coordinates = []
    try:
        with open(file_path, "r") as file:
            for line in file:
                if line.startswith(("G01", "G00")):
                    match = re.search(r"X(-?\d+\.\d+)Y(-?\d+\.\d+)", line)
                    if match:
                        x, y = map(float, match.groups())
                        coordinates.append((x, y))
    except FileNotFoundError:
        print(f"Warning: File not found at {file_path}. Returning empty list.")
    except Exception as e:
        print(f"Error reading file {file_path}: {e}. Returning empty list.")
    return coordinates

def calculate_intersection_point(coord1, coord2, coord3, coord4):
    """
    Calculates the intersection point of two lines defined by four points.
    The 'is_between' check is removed to ensure that the intersection of the
    lines is found, not just the segments. This is crucial for the "corner-cutting" logic.
    """
    try:
        k1 = (coord2[1] - coord1[1]) / (coord2[0] - coord1[0])
    except ZeroDivisionError:
        k1 = float('inf')  # Vertical line

    b1 = coord1[1] - k1 * coord1[0] if k1 != float('inf') else None

    try:
        k2 = (coord4[1] - coord3[1]) / (coord4[0] - coord3[0])
    except ZeroDivisionError:
        k2 = float('inf')  # Vertical line

    b2 = coord3[1] - k2 * coord3[0] if k2 != float('inf') else None

    if k1 == k2:
        raise ValueError("Lines are parallel and do not intersect.")

    if k1 == float('inf'):
        x_intersection = coord1[0]
        y_intersection = k2 * x_intersection + b2
    elif k2 == float('inf'):
        x_intersection = coord3[0]
        y_intersection = k1 * x_intersection + b1
    else:
        x_intersection = (b2 - b1) / (k1 - k2)
        y_intersection = k1 * x_intersection + b1

    return x_intersection, y_intersection

def process_jig_unit(raw_coords, x_offset, y_offset, jig_name=""):
    """
    Processes a single jig unit by applying the "corner-cutting" logic to eliminate
    "small triangles" and then applies the necessary offsets.
    """
    if not raw_coords or len(raw_coords) < 4:
        # If not enough points for intersection, just close the shape if possible.
        if raw_coords and len(raw_coords) >= 2:
            processed = raw_coords[:]
            if processed[-1] != processed[0]:
                processed.append(processed[0])
            return [(x - x_offset, y - y_offset) for x, y in processed]
        return []

    try:
        # Calculate the intersection of the first and last segments.
        intersection = calculate_intersection_point(
            raw_coords[0], raw_coords[1], raw_coords[-2], raw_coords[-1]
        )
        print(f"Info [{jig_name}]: Intersection calculated at {intersection}")
        # Replace the first and last points with the intersection point.
        processed_coords = [intersection] + raw_coords[1:-1] + [intersection]
    except ValueError as e:
        # If intersection fails, fall back to simply closing the original shape.
        print(f"Warning [{jig_name}]: Intersection failed: {e}. Closing shape directly.")
        processed_coords = raw_coords[:]
        if processed_coords and processed_coords[-1] != processed_coords[0]:
            processed_coords.append(processed_coords[0])

    # Apply the final offset to all points.
    final_coords = [(x - x_offset, y - y_offset) for x, y in processed_coords]
    return final_coords

def read_adr_file(file_path):
    """Reads an .ADR file and extracts pin points."""
    pin_points = []
    try:
        with open(file_path, "r") as file:
            for line in file:
                parts = line.split()
                if len(parts) >= 6:
                    no = int(parts[0])
                    x = float(parts[2])
                    y = float(parts[4])
                    side = parts[5]
                    pin_points.append(PinPoint(no, x, y, side))
    except FileNotFoundError:
        print(f"Warning: ADR file not found at {file_path}. Returning empty list.")
    except (ValueError, IndexError) as e:
        print(f"Error parsing line in {file_path}: {line.strip()} -> {e}")
    return pin_points


# ==============================================================================
# 2. MAIN SCRIPT EXECUTION
# ==============================================================================

# --- Step 1: Read Offsets ---
print("--- Reading Offsets ---")
# Up side
x_offset_up_upper, y_offset_up_upper = read_rut_file_for_offset(input_file_up_upper)
x_offset_up_middle, y_offset_up_middle = read_rut_file_for_offset(input_file_up_middle)
x_offset_up_bottom, y_offset_up_bottom = read_rut_file_for_offset(input_file_up_bottom)
# Down side
x_offset_down_upper, y_offset_down_upper = read_rut_file_for_offset(input_file_down_upper)
x_offset_down_middle, y_offset_down_middle = read_rut_file_for_offset(input_file_down_middle)
x_offset_down_bottom, y_offset_down_bottom = read_rut_file_for_offset(input_file_down_bottom)

# --- Step 2: Extract Raw Coordinates ---
print("\n--- Extracting Raw Coordinates ---")
raw_coords_up_upper = extract_coordinates(input_file_up_upper)
raw_coords_up_middle = extract_coordinates(input_file_up_middle)
raw_coords_up_bottom = extract_coordinates(input_file_up_bottom)
raw_coords_down_upper = extract_coordinates(input_file_down_upper)
raw_coords_down_middle = extract_coordinates(input_file_down_middle)
raw_coords_down_bottom = extract_coordinates(input_file_down_bottom)

# --- Step 3: Invert X-axis for all "up" side coordinates ---
# This is a specific requirement for this project's data.
raw_coords_up_upper = [(-x, y) for x, y in raw_coords_up_upper]
raw_coords_up_middle = [(-x, y) for x, y in raw_coords_up_middle]
raw_coords_up_bottom = [(-x, y) for x, y in raw_coords_up_bottom]

# --- Step 4: Process all jig units to apply corner-cutting and offsets ---
print("\n--- Processing Jig Units (Corner-Cutting and Offsetting) ---")
final_coords_up_upper = process_jig_unit(raw_coords_up_upper, x_offset_up_upper, y_offset_up_upper, "up_upper")
final_coords_up_middle = process_jig_unit(raw_coords_up_middle, x_offset_up_middle, y_offset_up_middle, "up_middle")
final_coords_up_bottom = process_jig_unit(raw_coords_up_bottom, x_offset_up_bottom, y_offset_up_bottom, "up_bottom")

final_coords_down_upper = process_jig_unit(raw_coords_down_upper, x_offset_down_upper, y_offset_down_upper, "down_upper")
final_coords_down_middle = process_jig_unit(raw_coords_down_middle, x_offset_down_middle, y_offset_down_middle, "down_middle")
final_coords_down_bottom = process_jig_unit(raw_coords_down_bottom, x_offset_down_bottom, y_offset_down_bottom, "down_bottom")

# --- Step 5: Read Pin Points ---
print("\n--- Reading Pin Points ---")
pin_list = read_adr_file(os.path.join(script_dir, "doc/G8360-TEST.ADR"))
pin_list_a = [pin for pin in pin_list if pin.side == "A"]
pin_list_b = [pin for pin in pin_list if pin.side == "B"]
print(f"Found {len(pin_list_a)} pins for Side A and {len(pin_list_b)} pins for Side B.")

# --- Step 6: Plot "Up" Side Figure ---
print("\n--- Generating 'Up' Side Plot ---")
plt.figure(figsize=(12, 12))
plt.title("Coordinates Plot - Up Jig (Side A)")

# Plotting the processed jig outlines
if final_coords_up_upper: plt.plot(*zip(*final_coords_up_upper), color="red", label="Upper")
if final_coords_up_middle: plt.plot(*zip(*final_coords_up_middle), color="blue", label="Middle")
if final_coords_up_bottom: plt.plot(*zip(*final_coords_up_bottom), color="green", label="Bottom")

# Plotting the pin points
if pin_list_a:
    x_coords_a = [pin.x for pin in pin_list_a]
    y_coords_a = [pin.y for pin in pin_list_a]
    plt.scatter(x_coords_a, y_coords_a, color="black", s=5, label="Pins (Side A)")

plt.xlabel("X Coordinate")
plt.ylabel("Y Coordinate")
plt.legend()
plt.grid(True)
plt.axis("equal")
plt.show()

# --- Step 7: Plot "Down" Side Figure ---
print("\n--- Generating 'Down' Side Plot ---")
plt.figure(figsize=(12, 12))
plt.title("Coordinates Plot - Down Jig (Side B)")

# Plotting the processed jig outlines
if final_coords_down_upper: plt.plot(*zip(*final_coords_down_upper), color="red", label="Upper")
if final_coords_down_middle: plt.plot(*zip(*final_coords_down_middle), color="blue", label="Middle")
if final_coords_down_bottom: plt.plot(*zip(*final_coords_down_bottom), color="green", label="Bottom")

# Plotting the pin points
if pin_list_b:
    x_coords_b = [pin.x for pin in pin_list_b]
    y_coords_b = [pin.y for pin in pin_list_b]
    plt.scatter(x_coords_b, y_coords_b, color="black", s=5, label="Pins (Side B)")

plt.xlabel("X Coordinate")
plt.ylabel("Y Coordinate")
plt.legend()
plt.grid(True)
plt.axis("equal")
plt.show()

# --- Step 8: Final Debug Info ---
print("\n--- Final Processed Data Samples ---")
print(f"final_coords_up_upper: {len(final_coords_up_upper)} points, sample: {final_coords_up_upper[:3]}...")
print(f"final_coords_down_middle: {len(final_coords_down_middle)} points, sample: {final_coords_down_middle[:3]}...")
