import os

# Get the absolute path of the directory where the script is located
script_dir = os.path.dirname(os.path.abspath(__file__))

# Get the path to the test fixtures directory
fixtures_dir = os.path.join(os.path.dirname(os.path.dirname(os.path.dirname(script_dir))), "test", "fixtures", "rut")

# parameters
# up jig rut files
input_file_up_upper = os.path.join(fixtures_dir, "G8360-TEST-TOP-JIGUNIT1.rut")
input_file_up_middle = os.path.join(fixtures_dir, "G8360-TEST-TOP-JIGUNIT2.rut")
input_file_up_bottom = os.path.join(fixtures_dir, "up-bottom.rut")
# down jig rut files
input_file_down_upper = os.path.join(fixtures_dir, "G8360-TEST-BOT-JIGUNIT1.rut")
input_file_down_middle = os.path.join(fixtures_dir, "G8360-TEST-BOT-JIGUNIT2.rut")
input_file_down_bottom = os.path.join(fixtures_dir, "G8360-TEST-BOT-JIGUNIT3.rut")

import re
import matplotlib.pyplot as plt
def process_jig_unit(raw_coords, x_offset, y_offset, jig_name=""):
    """
    封装了处理单个治具单元的完整流程。
    包括：计算交点、数据清洗、闭合曲线、应用偏移。
    内置错误处理，确保函数不会崩溃。

    Args:
        raw_coords (list): 原始的G代码坐标列表。
        x_offset (float): X轴偏移量。
        y_offset (float): Y轴偏移量。
        jig_name (str): 治具的名称，用于打印日志。

    Returns:
        list: 处理完成的坐标列表。如果处理失败，则返回一个空列表。
    """
    # 1. 安全检查：这是最关键的一步，检查输入是否有效
    if not raw_coords or len(raw_coords) < 4:
        print(f"Warning [{jig_name}]: 原始坐标为空或点数不足4个，跳过处理。")
        return []  # 直接返回空列表

    processed_coords = []
    try:
        # 2. 尝试计算交点
        intersection = calculate_intersection_point(
            raw_coords[0], raw_coords[1],
            raw_coords[-2], raw_coords[-1]
        )
        print(f"Info [{jig_name}]: 交点计算成功 -> {intersection}")

        # 3. 如果交点计算成功，进行切片和重组
        processed_coords = raw_coords[2:-1]  # 去掉首两个点和尾一个点
        processed_coords.append(intersection)    # 在最后插入交点
        processed_coords.append(processed_coords[0]) # 闭合曲线

    except ValueError as e:
        # 4. 如果交点计算失败，采取备用方案：直接闭合原始图形
        print(f"Warning [{jig_name}]: 交点计算失败 ({e})。将使用原始坐标直接闭合。")
        processed_coords = raw_coords[:] # 复制一份，避免修改原始列表
        processed_coords.append(raw_coords[0])

    # 5. 应用偏移量
    final_coords = [(x - x_offset, y - y_offset) for x, y in processed_coords]
    
    return final_coords
# 定义一个函数来读取 .RUT 文件并提取offset坐标
# (OFFSET-X:0.0)
# (OFFSET-Y:122.7725)
# 读取完上述X，Y坐标后，结束当前文件读取
def read_rut_file_for_offset(file_path):
    x_offset, y_offset = 0.0, 0.0  # Initialize to default values
    try:
        with open(file_path, "r") as file:
            for line in file:
                if "(OFFSET-X:" in line:
                    x_offset = float(re.search(r"[-+]?\d*\.\d+|\d+", line).group())
                elif "(OFFSET-Y:" in line:
                    y_offset = float(re.search(r"[-+]?\d*\.\d+|\d+", line).group())
                    break
    except FileNotFoundError:
        print(f"Warning: File not found at {file_path}. Using default offset (0,0).")
    return x_offset, y_offset

# 修改 extract_coordinates 函数，处理无效文件的情况
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
        print(f"Warning: File not found at {file_path}. Returning empty coordinates.")
    except Exception as e:
        print(f"Error reading file {file_path}: {e}. Returning empty coordinates.")
    return coordinates

# 定义个函数，显示坐标，并使相邻点和首尾相连，并自定义颜色
def plot_coordinates(coordinates, x_offset, y_offset, color="blue"):
    
    # --- 新增的保护代码 ---
    # 如果传入的坐标列表是空的，就直接返回，不执行任何操作
    if not coordinates:
        print(f"Warning: No coordinates to plot for color '{color}'. Skipping.")
        return
    # --- 结束新增代码 ---

    # 提取X和Y坐标 (后面的代码保持不变)
    x_coords = [x + x_offset for x, y in coordinates]
    y_coords = [y + y_offset for x, y in coordinates]
    
    # 在图中绘制坐标点
    plt.plot(x_coords, y_coords, marker="o", color=color)
    
    # 连接相邻点
    # 因为我们已经确保了列表不为空，所以这里的 [0] 访问是安全的
    plt.plot(x_coords + [x_coords[0]], y_coords + [y_coords[0]], color=color)
    
    # 设置图形标题和坐标轴标签
    plt.title("Coordinates Plot")
    plt.xlabel("X-axis")
    plt.ylabel("Y-axis")
    
    # 显示图形
    plt.grid()
    plt.axis("equal")
    plt.show()

# read the offset coordinates for the upper, middle, and bottom jig files
# up side
x_offset_up_upper, y_offset_up_upper = read_rut_file_for_offset(input_file_up_upper)
x_offset_up_middle, y_offset_up_middle = read_rut_file_for_offset(input_file_up_middle)
x_offset_up_bottom, y_offset_up_bottom = read_rut_file_for_offset(input_file_up_bottom)
# down side
x_offset_down_upper, y_offset_down_upper = read_rut_file_for_offset(input_file_down_upper)
x_offset_down_middle, y_offset_down_middle = read_rut_file_for_offset(input_file_down_middle)
x_offset_down_bottom, y_offset_down_bottom = read_rut_file_for_offset(input_file_down_bottom)
# display
print(f"Upper Offset: X = {x_offset_down_upper}, Y = {y_offset_down_upper}")
print(f"Middle Offset: X = {x_offset_down_middle}, Y = {y_offset_down_middle}")
print(f"Bottom Offset: X = {x_offset_down_bottom}, Y = {y_offset_down_bottom}")

coordinates_up_upper = extract_coordinates(input_file_up_upper)
coordinates_up_middle = extract_coordinates(input_file_up_middle)
coordinates_up_bottom = extract_coordinates(input_file_up_bottom)
# get coordinates for each file downside
coordinates_down_upper = extract_coordinates(input_file_down_upper)
coordinates_down_middle = extract_coordinates(input_file_down_middle)
coordinates_down_bottom = extract_coordinates(input_file_down_bottom)

# test plot_coordinates function
plot_coordinates(coordinates_down_upper, 0, 0, "red")
plot_coordinates(coordinates_down_middle, 0, 0, "blue")
plot_coordinates(coordinates_down_bottom, 0, 0, "green")

coordinates_up_upper = [(-x, y) for x, y in coordinates_up_upper]
coordinates_up_middle = [(-x, y) for x, y in coordinates_up_middle]
coordinates_up_bottom = [(-x, y) for x, y in coordinates_up_bottom]

plot_coordinates(coordinates_up_upper, 0, 0, "red")
plot_coordinates(coordinates_up_middle, 0, 0, "blue")
plot_coordinates(coordinates_up_bottom, 0, 0, "green")

def calculate_intersection_point(coord1, coord2, coord3, coord4):
# 计算斜率和截距
    try:
        k1 = (coord2[1] - coord1[1]) / (coord2[0] - coord1[0])
    except ZeroDivisionError:
        k1 = float("inf") # 斜率为无穷大，表示垂直线
    
    b1 = coord1[1] - k1 * coord1[0] if k1 != float("inf") else None
    try:
        k2 = (coord4[1] - coord3[1]) / (coord4[0] - coord3[0])
    except ZeroDivisionError:
        k2 = float("inf") # 斜率为无穷大，表示垂直线
    b2 = coord3[1] - k2 * coord3[0] if k2 != float("inf") else None 

    #计算交点坐标
    if k1 == k2:
        raise ValueError("两条线平行或重合，无法计算交点")
    elif k1 == float("inf"): # 第一条线垂直
        x_intersection = coord1[0]
        y_intersection = k2 * x_intersection + b2
    elif k2 == float("inf"): # 第二条线垂直
        x_intersection = coord3[0]
        y_intersection = k1 * x_intersection + b1
    else:
        x_intersection = (b2 - b1) / (k1 - k2)
        y_intersection = k1 * x_intersection + b1

    # 检查交点是否在线段上
    def is_between(a, b, c):
        return min(a, b) <= c <= max(a, b)

    if (
        is_between(coord1[0], coord2[0], x_intersection)
        and is_between(coord1[1], coord2[1], y_intersection)
        and is_between(coord3[0], coord4[0], x_intersection)
        and is_between(coord3[1], coord4[1], y_intersection)
    ):  
        return x_intersection, y_intersection
    else:
        raise ValueError("交点不在线段上")
    

# 使用封装函数处理所有治具单元
final_coords_up_upper = process_jig_unit(coordinates_up_upper, x_offset_up_upper, y_offset_up_upper, "up_upper")
final_coords_up_middle = process_jig_unit(coordinates_up_middle, x_offset_up_middle, y_offset_up_middle, "up_middle")
final_coords_up_bottom = process_jig_unit(coordinates_up_bottom, x_offset_up_bottom, y_offset_up_bottom, "up_bottom")

final_coords_down_upper = process_jig_unit(coordinates_down_upper, x_offset_down_upper, y_offset_down_upper, "down_upper")
final_coords_down_middle = process_jig_unit(coordinates_down_middle, x_offset_down_middle, y_offset_down_middle, "down_middle")
final_coords_down_bottom = process_jig_unit(coordinates_down_bottom, x_offset_down_bottom, y_offset_down_bottom, "down_bottom")






# 每个坐标点加上偏移量 up side
coordinates_up_upper = [
(x - x_offset_up_upper, y - y_offset_up_upper) for x, y in coordinates_up_upper
]
coordinates_up_middle = [
(x - x_offset_up_middle, y - y_offset_up_middle) for x, y in coordinates_up_middle
]
coordinates_up_bottom = [
(x - x_offset_up_bottom, y - y_offset_up_bottom) for x, y in coordinates_up_bottom
]
coordinates_down_upper = [
(x - x_offset_down_upper, y - y_offset_down_upper) for x, y in coordinates_down_upper
]
coordinates_down_middle = [
(x - x_offset_down_middle, y - y_offset_down_middle) for x, y in coordinates_down_middle
]
coordinates_down_bottom = [
(x - x_offset_down_bottom, y - y_offset_down_bottom) for x, y in coordinates_down_bottom
]


class PinPoint:
    def __init__(self, no, x, y, side):
        self.no = no
        self.x = x
        self.y = y
        self.side = side
    # 定义一个函数，读取ADR文件并提取pin点
    # 00001 X -102.575 Y 92.100 A
    # 00002 X -102.575 Y -11.200 A
    # 00003 X -102.730 Y -13.160 A
    # 00004 X -102.550 Y -13.160 A
def read_adr_file(file_path):
    pin_points = []
    with open(file_path, "r") as file:
        for line in file:
            parts = line.split()
            no = int(parts[0])
            x = float(parts[2])
            y = float(parts[4])
            side = parts[5]
            pin_points.append(PinPoint(no, x, y, side))
    return pin_points

pin_list=read_adr_file(os.path.join(script_dir, "doc/G8360-TEST.ADR"))
# 根据side属性分组pin点
pin_list_1 = [pin for pin in pin_list if pin.side == "A"]
pin_list_2 = [pin for pin in pin_list if pin.side == "B"]
print(f"Pin Points number A:{pin_list_1.__len__()}")
print(f"Pin Points number B:{pin_list_2.__len__()}")

# 绘制坐标点 up side
# 将coordinates_upper, coordinates_middle, coordinates_bottom分别绘制成不同颜色的
# 并且将坐标点分别连接成线：相同颜色的点连接成线
plt.figure(figsize=(10, 10))
# Upper Side
plt.plot(*zip(*coordinates_up_upper), color="red", label="Upper Side")
# Middle Side
plt.plot(*zip(*coordinates_up_middle), color="blue", label="Middle Side")
# Bottom Side
plt.plot(*zip(*coordinates_up_bottom), color="green", label="Bottom Side")

# 使用列表解析和scatter一次性绘制所有pin点
x_coords_a = [pin.x for pin in pin_list_1]
y_coords_a = [pin.y for pin in pin_list_1]
plt.scatter(x_coords_a, y_coords_a, color="black", s=1, label="Pin List Up (A)")

# 设置标题和图例
plt.title("Coordinates Plot up Jig")
plt.xlabel("X Coordinate")
plt.ylabel("Y Coordinate")
plt.legend()
plt.grid()
plt.axis("equal")
plt.show()


# 绘制坐标点 down side
# 将coordinates_upper, coordinates_middle, coordinates_bottom分别绘制成不同颜色的
# 并且将坐标点分别连接成线：相同颜色的点连接成线
plt.figure(figsize=(10, 10))
# Upper Side
coordinates_down_upper.append(coordinates_down_upper[0]) # Connect the first an
plt.plot(*zip(*coordinates_down_upper), color="red", label="Upper Side")
# Middle Side
coordinates_down_middle.append(coordinates_down_middle[0]) # Connect the first
plt.plot(*zip(*coordinates_down_middle), color="blue", label="Middle Side")
# Bottom Side
coordinates_down_bottom.append(coordinates_down_bottom[0]) # Connect the first
plt.plot(*zip(*coordinates_down_bottom), color="green", label="Bottom Side")
# 使用列表解析和scatter一次性绘制所有pin点
x_coords_a = [pin.x for pin in pin_list_2]
y_coords_a = [pin.y for pin in pin_list_2]
plt.scatter(x_coords_a, y_coords_a, color="black", s=1, label="Pin List down (B)")
plt.title("Coordinates Plot down Jig")
plt.xlabel("X Coordinate")
plt.ylabel("Y Coordinate")
plt.legend()
plt.grid()
plt.axis("equal")
plt.show()




# 调试信息：打印坐标数据和Pin点数据
print("Debug Info:")
print(f"coordinates_up_upper: {len(coordinates_up_upper)} points, sample: {coordinates_up_upper[:5]}")
print(f"coordinates_up_middle: {len(coordinates_up_middle)} points, sample: {coordinates_up_middle[:5]}")
print(f"coordinates_up_bottom: {len(coordinates_up_bottom)} points, sample: {coordinates_up_bottom[:5]}")
print(f"Pin List A: {len(pin_list_1)} points, sample: {[{'x': pin.x, 'y': pin.y} for pin in pin_list_1[:5]]}")
# 调试信息：检查 coordinates_up_bottom 和文件路径
print("Debug Info:")
print(f"input_file_up_bottom: {input_file_up_bottom}")
print(f"coordinates_up_bottom: {coordinates_up_bottom}")
