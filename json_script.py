import os
import re
import json
import sys

def process_jig_unit(raw_coords, x_offset, y_offset, jig_name=""):
    if not raw_coords or len(raw_coords) < 4:
        return []

    processed_coords = []
    try:
        intersection = calculate_intersection_point(
            raw_coords[0], raw_coords[1],
            raw_coords[-2], raw_coords[-1]
        )
        processed_coords = raw_coords[2:-1]
        processed_coords.append(intersection)
        processed_coords.append(processed_coords[0])
    except ValueError:
        processed_coords = raw_coords[:]
        processed_coords.append(raw_coords[0])

    return [(x - x_offset, y - y_offset) for x, y in processed_coords]

def read_rut_file_for_offset(file_path):
    x_offset, y_offset = 0.0, 0.0
    try:
        with open(file_path, "r") as file:
            for line in file:
                if "(OFFSET-X:" in line:
                    x_offset = float(re.search(r"[-+]?\d*\.\d+|\d+", line).group())
                elif "(OFFSET-Y:" in line:
                    y_offset = float(re.search(r"[-+]?\d*\.\d+|\d+", line).group())
                    break
    except FileNotFoundError:
        pass
    return x_offset, y_offset

def extract_coordinates(file_path):
    coordinates = []
    try:
        with open(file_path, "r") as file:
            for line in file:
                if line.startswith("G01") or line.startswith("G00"):
                    match = re.search(r"X(-?\d+\.\d+)Y(-?\d+\.\d+)", line)
                    if match:
                        x, y = map(float, match.groups())
                        coordinates.append((x, y))
    except FileNotFoundError:
        pass
    return coordinates

def calculate_intersection_point(coord1, coord2, coord3, coord4):
    try:
        k1 = (coord2[1] - coord1[1]) / (coord2[0] - coord1[0])
    except ZeroDivisionError:
        k1 = float("inf")
    b1 = coord1[1] - k1 * coord1[0] if k1 != float("inf") else None

    try:
        k2 = (coord4[1] - coord3[1]) / (coord4[0] - coord3[0])
    except ZeroDivisionError:
        k2 = float("inf")
    b2 = coord3[1] - k2 * coord3[0] if k2 != float("inf") else None

    if k1 == k2:
        raise ValueError("Parallel lines")
    elif k1 == float("inf"):
        x_intersection = coord1[0]
        y_intersection = k2 * x_intersection + b2
    elif k2 == float("inf"):
        x_intersection = coord3[0]
        y_intersection = k1 * x_intersection + b1
    else:
        x_intersection = (b2 - b1) / (k1 - k2)
        y_intersection = k1 * x_intersection + b1

    def is_between(a, b, c):
        return min(a, b) <= c <= max(a, b)

    if (is_between(coord1[0], coord2[0], x_intersection) and
            is_between(coord1[1], coord2[1], y_intersection) and
            is_between(coord3[0], coord4[0], x_intersection) and
            is_between(coord3[1], coord4[1], y_intersection)):
        return x_intersection, y_intersection
    else:
        raise ValueError("Intersection not on segments")

class PinPoint:
    def __init__(self, no, x, y, side):
        self.no = no
        self.x = x
        self.y = y
        self.side = side

def read_adr_file(file_path):
    pin_points = []
    with open(file_path, "r") as file:
        for line in file:
            parts = line.split()
            if len(parts) >= 6:
                try:
                    no = int(parts[0])
                    x = float(parts[2])
                    y = float(parts[4])
                    side = parts[5]
                    pin_points.append(PinPoint(no, x, y, side))
                except (ValueError, IndexError):
                    continue
    return pin_points

def main(rut_files, adr_file):
    all_data = {'rut_data': [], 'adr_data': {}}

    for file_path in rut_files:
        x_offset, y_offset = read_rut_file_for_offset(file_path)
        coordinates = extract_coordinates(file_path)
        
        # Assuming file names can distinguish between up and down to apply transformation
        if "TOP" in os.path.basename(file_path).upper():
             coordinates = [(-x, y) for x, y in coordinates]

        processed_coords = process_jig_unit(coordinates, x_offset, y_offset)
        all_data['rut_data'].append({'filename': os.path.basename(file_path), 'coords': processed_coords})

    if adr_file:
        pin_list = read_adr_file(adr_file)
        pin_list_a = [{'x': pin.x, 'y': pin.y} for pin in pin_list if pin.side == "A"]
        pin_list_b = [{'x': pin.x, 'y': pin.y} for pin in pin_list if pin.side == "B"]
        all_data['adr_data'] = {'side_a': pin_list_a, 'side_b': pin_list_b}

    print(json.dumps(all_data))

if __name__ == "__main__":
    rut_files = sys.argv[1:-1]
    adr_file = sys.argv[-1]
    main(rut_files, adr_file)
