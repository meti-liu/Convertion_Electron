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
    try:
        print(f"Attempting to open ADR file: {file_path}", file=sys.stderr)
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
        print(f"Successfully read ADR file with {len(pin_points)} pins", file=sys.stderr)
        return pin_points
    except FileNotFoundError:
        print(f"ERROR: ADR file not found: {file_path}", file=sys.stderr)
        print(f"Current working directory: {os.getcwd()}", file=sys.stderr)
        print(f"File exists check: {os.path.exists(file_path)}", file=sys.stderr)
        print(f"Directory contents: {os.listdir(os.path.dirname(file_path)) if os.path.dirname(file_path) else os.listdir('.')}", file=sys.stderr)
        raise
    except Exception as e:
        print(f"ERROR reading ADR file: {str(e)}", file=sys.stderr)
        raise

def main(rut_files, adr_file):
    try:
        print(f"Starting json_script.py with RUT files: {rut_files}", file=sys.stderr)
        print(f"ADR file: {adr_file}", file=sys.stderr)
        print(f"Current working directory: {os.getcwd()}", file=sys.stderr)
        
        all_data = {'rut_data': [], 'adr_data': {}}

        # 处理RUT文件
        for file_path in rut_files:
            try:
                print(f"Processing RUT file: {file_path}", file=sys.stderr)
                x_offset, y_offset = read_rut_file_for_offset(file_path)
                coordinates = extract_coordinates(file_path)
                
                # Assuming file names can distinguish between up and down to apply transformation
                if "TOP" in os.path.basename(file_path).upper():
                    coordinates = [(-x, y) for x, y in coordinates]

                processed_coords = process_jig_unit(coordinates, x_offset, y_offset)
                all_data['rut_data'].append({'filename': os.path.basename(file_path), 'coords': processed_coords})
                print(f"Successfully processed RUT file: {file_path}", file=sys.stderr)
            except Exception as e:
                print(f"Error processing RUT file {file_path}: {str(e)}", file=sys.stderr)
                # 继续处理其他RUT文件

        # 处理ADR文件
        if adr_file:
            try:
                print(f"Processing ADR file: {adr_file}", file=sys.stderr)
                # 检查文件是否存在
                if not os.path.exists(adr_file):
                    print(f"ADR file does not exist: {adr_file}", file=sys.stderr)
                    # 尝试在当前目录查找同名文件
                    base_name = os.path.basename(adr_file)
                    if os.path.exists(base_name):
                        print(f"Found ADR file in current directory: {base_name}", file=sys.stderr)
                        adr_file = base_name
                
                pin_list = read_adr_file(adr_file)
                pin_list_a = [{'no': pin.no, 'x': pin.x, 'y': pin.y} for pin in pin_list if pin.side == "A"]
                pin_list_b = [{'no': pin.no, 'x': pin.x, 'y': pin.y} for pin in pin_list if pin.side == "B"]
                all_data['adr_data'] = {'side_a': pin_list_a, 'side_b': pin_list_b}
                print(f"Successfully processed ADR file with {len(pin_list)} pins", file=sys.stderr)
            except Exception as e:
                print(f"Error processing ADR file: {str(e)}", file=sys.stderr)
                # 创建空的ADR数据结构
                all_data['adr_data'] = {'side_a': [], 'side_b': []}

        # 输出JSON结果
        print(json.dumps(all_data))
        print(f"Successfully generated JSON output", file=sys.stderr)
    except Exception as e:
        print(f"FATAL ERROR in main function: {str(e)}", file=sys.stderr)
        # 返回最小的有效JSON以避免解析错误
        print(json.dumps({'rut_data': [], 'adr_data': {'side_a': [], 'side_b': []}}))
        sys.exit(1)

if __name__ == "__main__":
    rut_files = sys.argv[1:-1]
    adr_file = sys.argv[-1]
    main(rut_files, adr_file)
