import os
import re
import json
import sys

def process_jig_unit(raw_coords, x_offset, y_offset, jig_name=""):
    """
    (最终版) 精确处理治具单元，实现“切角”逻辑以消除“小三角”。
    """
    # 1. 安全检查：至少需要4个点才能定义两条线段
    if not raw_coords or len(raw_coords) < 4:
        # 如果点数不足，则退回简单的闭合逻辑
        if raw_coords and len(raw_coords) >= 2:
            processed = raw_coords[:]
            if processed[-1] != processed[0]:
                processed.append(processed[0])
            return [(x - x_offset, y - y_offset) for x, y in processed]
        return []

    processed_coords = []
    try:
        # 2. 尝试计算起始线段和结束线段的交点
        intersection = calculate_intersection_point(
            raw_coords[0], raw_coords[1],
            raw_coords[-2], raw_coords[-1]
        )

        # 3. 核心逻辑：重组坐标列表以实现“切角”
        # 新的路径是 [交点, P2, P3, ..., Pn-1, 交点]
        processed_coords = [intersection] + raw_coords[1:-1] + [intersection]

    except ValueError:
        # 4. 如果交点计算失败（例如，线段平行），则退回简单的闭合逻辑
        processed_coords = raw_coords[:]
        if processed_coords[-1] != processed_coords[0]:
            processed_coords.append(processed_coords[0])

    # 5. 应用偏移量，返回最终坐标
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
    # This is the data structure that App.vue expects
    final_data = {
        "up_jigs": { "datasets": [] },
        "down_jigs": { "datasets": [] },
        "pin_lists": { "side_a": [], "side_b": [] }
    }
    
    colors = ['red', 'blue', 'green', 'purple', 'orange', 'brown']
    up_color_index = 0
    down_color_index = 0

    for file_path in rut_files:
        filename = os.path.basename(file_path)
        x_offset, y_offset = read_rut_file_for_offset(file_path)
        coordinates = extract_coordinates(file_path)
        
        jig_data = {
            "label": filename,
            "borderWidth": 2,
            "showLine": True,
            "fill": False,
            "type": 'line',
            "pointRadius": 0,
        }

        if "TOP" in filename.upper():
            coordinates = [(-x, y) for x, y in coordinates]
            processed_coords = process_jig_unit(coordinates, x_offset, y_offset, filename)
            jig_data["data"] = [{'x': c[0], 'y': c[1]} for c in processed_coords]
            jig_data["borderColor"] = colors[up_color_index % len(colors)]
            final_data["up_jigs"]["datasets"].append(jig_data)
            up_color_index += 1
        elif "BOT" in filename.upper():
            processed_coords = process_jig_unit(coordinates, x_offset, y_offset, filename)
            jig_data["data"] = [{'x': c[0], 'y': c[1]} for c in processed_coords]
            jig_data["borderColor"] = colors[down_color_index % len(colors)]
            final_data["down_jigs"]["datasets"].append(jig_data)
            down_color_index += 1

    if adr_file:
        pin_list = read_adr_file(adr_file)
        # Include 'no' for highlighting functionality
        pin_list_a = [{'no': pin.no, 'x': pin.x, 'y': pin.y} for pin in pin_list if pin.side == "A"]
        pin_list_b = [{'no': pin.no, 'x': pin.x, 'y': pin.y} for pin in pin_list if pin.side == "B"]
        final_data['pin_lists'] = {'side_a': pin_list_a, 'side_b': pin_list_b}

    print(json.dumps(final_data, indent=2))

if __name__ == "__main__":
    # Ensure there are files to process
    if len(sys.argv) > 1:
        rut_files = [arg for arg in sys.argv[1:] if arg.lower().endswith('.rut')]
        adr_file_list = [arg for arg in sys.argv[1:] if arg.lower().endswith('.adr')]
        
        if rut_files and adr_file_list:
            main(rut_files, adr_file_list[0])
        else:
            # Print an empty structure if files are missing, to avoid crashing the frontend
            print(json.dumps({
                "up_jigs": { "datasets": [] },
                "down_jigs": { "datasets": [] },
                "pin_lists": { "side_a": [], "side_b": [] }
            }))
    else:
        # Handle case where no files are passed
        print(json.dumps({
            "up_jigs": { "datasets": [] },
            "down_jigs": { "datasets": [] },
            "pin_lists": { "side_a": [], "side_b": [] }
        }))
